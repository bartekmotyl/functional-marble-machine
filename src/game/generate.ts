import { runProgram, type RunResult } from '../lang/interpreter'
import { parseProgram, type Expr, type Program } from '../lang/parser'
import { type Color, type Marble, type Output, type Pattern, type Size } from '../lang/marble'

export interface Features {
  colors: Color[]
  sizes?: Size[]
  patterns?: Pattern[]
  numbers?: [number, number]
}

export interface TestCase {
  input: Marble[]
  expected: Output
}

/** Small deterministic random generator so every player sees the same puzzle. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function pick<T>(r: () => number, xs: readonly T[]): T {
  return xs[Math.floor(r() * xs.length)]
}

export function randomMarbles(r: () => number, f: Features, count: [number, number]): Marble[] {
  const n = count[0] + Math.floor(r() * (count[1] - count[0] + 1))
  return Array.from({ length: n }, () => ({
    color: pick(r, f.colors),
    size: pick(r, f.sizes ?? ['medium']),
    pattern: pick(r, f.patterns ?? ['plain']),
    number: f.numbers ? f.numbers[0] + Math.floor(r() * (f.numbers[1] - f.numbers[0] + 1)) : 0,
  }))
}

/**
 * A test case is "interesting" when every step actually does something:
 * filters keep some marbles and drop others, maps change something, conditional
 * maps leave at least one marble alone.
 */
export function isInteresting(res: RunResult): boolean {
  if (Array.isArray(res.output) && res.output.length === 0) return false
  for (const s of res.stages) {
    if (s.kind === 'filter' && (!s.kept.includes(true) || !s.kept.includes(false))) return false
    if (s.kind === 'map') {
      const differs = s.output.some((m, i) => JSON.stringify(m) !== JSON.stringify(s.input[i]))
      if (!differs) return false
    }
    if (s.kind === 'reduce' && s.input.length < 2) return false
  }
  return true
}

function hasConditionalMap(source: string): boolean {
  return source.split('\n').some((l) => /^\s*map\b.*\bif\b/.test(l))
}

/** Give every question in the program an id, so its yes/no answers get recorded. */
function labelQuestions(program: Program): void {
  let n = 0
  const walk = (e: Expr) => {
    if (e.k === 'cmp' || e.k === 'logic' || e.k === 'not') e.id = `q${n++}`
    if (e.k === 'bin' || e.k === 'cmp' || e.k === 'logic') {
      walk(e.l)
      walk(e.r)
    }
    if (e.k === 'not') walk(e.e)
  }
  for (const st of program.steps) {
    if (st.kind === 'filter') walk(st.cond)
    if (st.kind === 'map' && st.cond) walk(st.cond)
  }
}

/**
 * What a test case shows the player. "Branch" signatures describe how a marble went through
 * the rule (which questions said yes/no) - the most important thing for finding the rule.
 * "Variety" signatures reward different colors, numbers and results.
 */
function signatures(input: Marble[], res: RunResult): Map<string, number> {
  const sig = new Map<string, number>()
  const add = (k: string, w: number) => sig.set(k, w)
  res.stages.forEach((st, si) => {
    st.input.forEach((_, i) => {
      const answers = [...st.values[i].entries()]
        .filter(([, v]) => typeof v === 'boolean')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => (v ? 'Y' : 'N'))
        .join('')
      if (answers) add(`b${si}:${answers}`, 5)
      if (st.kind === 'reduce' && (st.label === 'max' || st.label === 'min'))
        add(`b${si}:new-best:${(i === 0 ? st.start : st.accs[i - 1]) !== st.accs[i]}`, 2)
    })
  })
  for (const m of input) {
    add(`a:color=${m.color}`, 1)
    add(`a:size=${m.size}`, 1)
    add(`a:pattern=${m.pattern}`, 1)
    add(`a:number=${m.number}`, 1)
  }
  add(`o:${typeof res.output === 'number' ? res.output : res.output.length}`, 1)
  add(`len:${input.length}`, 1)
  return sig
}

/** Pick tests one by one, each time the one that shows the most new things. */
function pickDiverse<T extends { sig: Map<string, number> }>(pool: T[], n: number, covered = new Set<string>()): T[] {
  const left = [...pool]
  const out: T[] = []
  while (out.length < n && left.length) {
    let best = 0
    let bestScore = -1
    left.forEach((c, i) => {
      let score = 0
      c.sig.forEach((w, k) => {
        if (!covered.has(k)) score += w
      })
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    })
    const [c] = left.splice(best, 1)
    c.sig.forEach((_, k) => covered.add(k))
    out.push(c)
  }
  return out
}

export function generateTests(
  solution: string,
  features: Features,
  count: [number, number],
  visibleCount: number,
  hiddenCount: number,
  seed: number,
): { visible: TestCase[]; hidden: TestCase[] } {
  const r = rng(seed)
  const program = parseProgram(solution)
  labelQuestions(program)
  const conditional = hasConditionalMap(solution)
  const pool: (TestCase & { sig: Map<string, number> })[] = []
  const seen = new Set<string>()
  const want = Math.max(60, (visibleCount + hiddenCount) * 4)
  for (let attempt = 0; pool.length < want && attempt < 4000; attempt++) {
    const input = randomMarbles(r, features, count)
    const key = JSON.stringify(input)
    if (seen.has(key)) continue
    seen.add(key)
    const res = runProgram(program, input)
    const relaxed = attempt > 3000
    if (!relaxed) {
      if (!isInteresting(res)) continue
      if (conditional && !res.stages.some((s) => s.kind === 'map' && s.changed.includes(false) && s.changed.includes(true)))
        continue
    }
    pool.push({ input, expected: res.output, sig: signatures(input, res) })
  }
  const covered = new Set<string>()
  const strip = ({ input, expected }: TestCase) => ({ input, expected })
  const visible = pickDiverse(pool, visibleCount, covered)
  const rest = pool.filter((c) => !visible.includes(c))
  const hidden = pickDiverse(rest, hiddenCount, covered)
  return { visible: visible.map(strip), hidden: hidden.map(strip) }
}

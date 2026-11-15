import { run, type RunResult } from '../lang/interpreter'
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

export function generateTests(
  solution: string,
  features: Features,
  count: [number, number],
  howMany: number,
  seed: number,
): TestCase[] {
  const r = rng(seed)
  const tests: TestCase[] = []
  const seen = new Set<string>()
  const conditional = hasConditionalMap(solution)
  for (let attempt = 0; tests.length < howMany && attempt < 2000; attempt++) {
    const input = randomMarbles(r, features, count)
    const key = JSON.stringify(input)
    if (seen.has(key)) continue
    const res = run(solution, input)
    const relaxed = attempt > 1500
    if (!relaxed) {
      if (!isInteresting(res)) continue
      if (conditional && !res.stages.some((s) => s.kind === 'map' && s.changed.includes(false) && s.changed.includes(true)))
        continue
    }
    seen.add(key)
    tests.push({ input, expected: res.output })
  }
  return tests
}

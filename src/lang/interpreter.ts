import { SIZES, type Marble, type Output } from './marble'
import { LangError, parseProgram, type Expr, type Program, type Step } from './parser'

type Value = number | string | boolean

/** What happened at each step - used to animate the marble machine. */
export type Stage =
  | { kind: 'filter'; line: number; input: Marble[]; kept: boolean[] }
  | { kind: 'map'; line: number; input: Marble[]; output: Marble[]; changed: boolean[] }
  | { kind: 'reduce'; line: number; input: Marble[]; label: string; start: number | null; accs: number[]; result: number }

export interface RunResult {
  output: Output
  stages: Stage[]
}

const MAX_ABS = 1_000_000_000

function evaluate(e: Expr, m: Marble, line: number, total = 0): Value {
  switch (e.k) {
    case 'num':
      return e.v
    case 'lit':
      return e.v
    case 'prop':
      return m[e.name]
    case 'total':
      return total
    case 'bin': {
      const l = evaluate(e.l, m, line, total) as number
      const r = evaluate(e.r, m, line, total) as number
      let v: number
      switch (e.op) {
        case '+':
          v = l + r
          break
        case '-':
          v = l - r
          break
        case '*':
          v = l * r
          break
        case '/':
        case '%':
          if (r === 0) throw new LangError('Oops - you cannot divide by zero!', line, e.col, e.end)
          v = e.op === '/' ? Math.trunc(l / r) : l % r
          break
      }
      if (Math.abs(v) > MAX_ABS) throw new LangError('Whoa, this number got way too big!', line, e.col, e.end)
      return v
    }
    case 'cmp': {
      const l = evaluate(e.l, m, line, total)
      const r = evaluate(e.r, m, line, total)
      if (e.op === '==' || e.op === '!=') {
        let eq: boolean
        if (r === 'even' || r === 'odd' || l === 'even' || l === 'odd') {
          const n = (typeof l === 'number' ? l : r) as number
          const parity = typeof l === 'number' ? r : l
          eq = (Math.abs(n) % 2 === 0) === (parity === 'even')
        } else eq = l === r
        return e.op === '==' ? eq : !eq
      }
      const ln = typeof l === 'number' ? l : SIZES.indexOf(l as (typeof SIZES)[number])
      const rn = typeof r === 'number' ? r : SIZES.indexOf(r as (typeof SIZES)[number])
      switch (e.op) {
        case '<':
          return ln < rn
        case '>':
          return ln > rn
        case '<=':
          return ln <= rn
        case '>=':
          return ln >= rn
      }
    }
    // eslint-disable-next-line no-fallthrough
    case 'logic': {
      const l = evaluate(e.l, m, line, total) as boolean
      if (e.op === 'and') return l && (evaluate(e.r, m, line, total) as boolean)
      return l || (evaluate(e.r, m, line, total) as boolean)
    }
    case 'not':
      return !(evaluate(e.e, m, line, total) as boolean)
  }
}

const DUMMY: Marble = { color: 'blue', size: 'medium', pattern: 'plain', number: 0 }

function runStep(step: Step, input: Marble[]): { stage: Stage; out: Output } {
  switch (step.kind) {
    case 'filter': {
      const kept = input.map((m) => evaluate(step.cond, m, step.line) as boolean)
      return { stage: { kind: 'filter', line: step.line, input, kept }, out: input.filter((_, i) => kept[i]) }
    }
    case 'map': {
      const changed: boolean[] = []
      const output = input.map((m) => {
        if (step.cond && !(evaluate(step.cond, m, step.line) as boolean)) {
          changed.push(false)
          return m
        }
        const n: Marble = { ...m }
        // all changes use the *old* marble's values
        for (const a of step.assigns) (n as unknown as Record<string, Value>)[a.prop] = evaluate(a.expr, m, step.line)
        changed.push(true)
        return n
      })
      return { stage: { kind: 'map', line: step.line, input, output, changed }, out: output }
    }
    default: {
      let acc: number | null
      let label: string
      let next: (acc: number | null, m: Marble) => number
      if (step.kind === 'count') {
        acc = 0
        label = 'count'
        next = (a) => (a as number) + 1
      } else if (step.kind === 'sum') {
        acc = 0
        label = 'sum'
        next = (a, m) => (a as number) + (evaluate(step.expr, m, step.line) as number)
      } else if (step.kind === 'max' || step.kind === 'min') {
        acc = null
        label = step.kind
        const pick = step.kind === 'max' ? Math.max : Math.min
        next = (a, m) => {
          const v = evaluate(step.expr, m, step.line) as number
          return a === null ? v : pick(a, v)
        }
      } else {
        const fold = step as Extract<Step, { kind: 'fold' }>
        acc = evaluate(fold.start, DUMMY, fold.line) as number
        label = 'total'
        next = (a, m) => {
          const v = evaluate(fold.body, m, fold.line, a as number) as number
          if (Math.abs(v) > MAX_ABS) throw new LangError('Whoa, the total got way too big!', step.line)
          return v
        }
      }
      const start = acc
      const accs: number[] = []
      for (const m of input) {
        acc = next(acc, m)
        accs.push(acc)
      }
      const result = acc ?? 0
      return { stage: { kind: 'reduce', line: step.line, input, label, start, accs, result }, out: result }
    }
  }
}

export function runProgram(program: Program, input: Marble[]): RunResult {
  let cur: Output = input
  const stages: Stage[] = []
  for (const step of program.steps) {
    const { stage, out } = runStep(step, cur as Marble[])
    stages.push(stage)
    cur = out
  }
  return { output: cur, stages }
}

/** Parse + run; convenient for tests and level generation. */
export function run(source: string, input: Marble[]): RunResult {
  return runProgram(parseProgram(source), input)
}

import { SIZES, type Marble, type Output } from './marble'
import { LangError, parseProgram, type Expr, type Program, type Step } from './parser'

export type Value = number | string | boolean
/** Values of every expression node that has an id, for one marble passing one step. */
export type Values = Map<string, Value>

/** What happened at each step - used to animate and explain the marble machine. */
export type Stage =
  | { kind: 'filter'; line: number; input: Marble[]; kept: boolean[]; values: Values[] }
  | { kind: 'map'; line: number; input: Marble[]; output: Marble[]; changed: boolean[]; values: Values[] }
  | {
      kind: 'reduce'
      line: number
      input: Marble[]
      label: string
      start: number | null
      accs: number[]
      result: number
      values: Values[]
    }

export interface RunResult {
  output: Output
  stages: Stage[]
}

const MAX_ABS = 1_000_000_000

function evaluate(e: Expr, m: Marble, line: number, total: number, rec: Values): Value {
  const v = evalNode(e, m, line, total, rec)
  if (e.id) rec.set(e.id, v)
  return v
}

function evalNode(e: Expr, m: Marble, line: number, total: number, rec: Values): Value {
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
      const l = evaluate(e.l, m, line, total, rec) as number
      const r = evaluate(e.r, m, line, total, rec) as number
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
          if (r === 0) throw new LangError('Oops - you cannot divide by zero!', line, e.col, e.end, 'divzero')
          v = e.op === '/' ? Math.trunc(l / r) : l % r
          break
      }
      if (Math.abs(v) > MAX_ABS) throw new LangError('Whoa, this number got way too big!', line, e.col, e.end, 'toobig')
      return v
    }
    case 'cmp': {
      const l = evaluate(e.l, m, line, total, rec)
      const r = evaluate(e.r, m, line, total, rec)
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
      if (e.op === '<') return ln < rn
      if (e.op === '>') return ln > rn
      if (e.op === '<=') return ln <= rn
      return ln >= rn
    }
    case 'logic': {
      // evaluate both sides (no short-circuit) so every question can be explained
      const l = evaluate(e.l, m, line, total, rec) as boolean
      const r = evaluate(e.r, m, line, total, rec) as boolean
      return e.op === 'and' ? l && r : l || r
    }
    case 'not':
      return !(evaluate(e.e, m, line, total, rec) as boolean)
  }
}

const DUMMY: Marble = { color: 'blue', size: 'medium', pattern: 'plain', number: 0 }

function runStep(step: Step, input: Marble[]): { stage: Stage; out: Output } {
  const values: Values[] = input.map(() => new Map())
  switch (step.kind) {
    case 'filter': {
      const kept = input.map((m, i) => evaluate(step.cond, m, step.line, 0, values[i]) as boolean)
      return { stage: { kind: 'filter', line: step.line, input, kept, values }, out: input.filter((_, i) => kept[i]) }
    }
    case 'map': {
      const changed: boolean[] = []
      const output = input.map((m, i) => {
        if (step.cond && !(evaluate(step.cond, m, step.line, 0, values[i]) as boolean)) {
          changed.push(false)
          return m
        }
        const n: Marble = { ...m }
        // all changes use the *old* marble's values
        for (const a of step.assigns)
          (n as unknown as Record<string, Value>)[a.prop] = evaluate(a.expr, m, step.line, 0, values[i])
        changed.push(true)
        return n
      })
      return { stage: { kind: 'map', line: step.line, input, output, changed, values }, out: output }
    }
    default: {
      let acc: number | null
      let label: string
      let next: (acc: number | null, m: Marble, rec: Values) => number
      if (step.kind === 'count') {
        acc = 0
        label = 'count'
        next = (a) => (a as number) + 1
      } else if (step.kind === 'sum') {
        acc = 0
        label = 'sum'
        next = (a, m, rec) => (a as number) + (evaluate(step.expr, m, step.line, 0, rec) as number)
      } else if (step.kind === 'max' || step.kind === 'min') {
        acc = null
        label = step.kind
        const pick = step.kind === 'max' ? Math.max : Math.min
        next = (a, m, rec) => {
          const v = evaluate(step.expr, m, step.line, 0, rec) as number
          return a === null ? v : pick(a, v)
        }
      } else {
        const fold = step as Extract<Step, { kind: 'fold' }>
        acc = evaluate(fold.start, DUMMY, fold.line, 0, new Map()) as number
        label = 'total'
        next = (a, m, rec) => {
          const v = evaluate(fold.body, m, fold.line, a as number, rec) as number
          if (Math.abs(v) > MAX_ABS) throw new LangError('Whoa, the total got way too big!', step.line, 0, 1, 'toobig')
          return v
        }
      }
      const start = acc
      const accs: number[] = []
      input.forEach((m, i) => {
        acc = next(acc, m, values[i])
        accs.push(acc)
      })
      const result = acc ?? 0
      return { stage: { kind: 'reduce', line: step.line, input, label, start, accs, result, values }, out: result }
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

export interface SafeRunResult {
  output?: Output
  stages: Stage[]
  error?: LangError
}

/** Like runProgram, but keeps the stages that finished before a runtime error. */
export function runSafe(program: Program, input: Marble[]): SafeRunResult {
  let cur: Output = input
  const stages: Stage[] = []
  try {
    for (const step of program.steps) {
      const { stage, out } = runStep(step, cur as Marble[])
      stages.push(stage)
      cur = out
    }
  } catch (e) {
    if (e instanceof LangError) return { stages, error: e }
    throw e
  }
  return { output: cur, stages }
}

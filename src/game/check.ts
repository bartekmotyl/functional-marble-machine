import { runSafe, type Stage } from '../lang/interpreter'
import { outputsEqual, type Marble, type Output } from '../lang/marble'
import { LangError, parseProgram, type Program, type StepKind } from '../lang/parser'
import { generateTests, hash, type TestCase } from './generate'
import type { Level } from './levels'

export const VISIBLE_EXAMPLES = 5
export const HIDDEN_TESTS = 5

const cache = new Map<string, { visible: TestCase[]; hidden: TestCase[] }>()

export function getTests(level: Level) {
  let t = cache.get(level.id)
  if (!t) {
    const count = level.count ?? [4, 7]
    t = generateTests(level.solution, level.features, count, VISIBLE_EXAMPLES, HIDDEN_TESTS, hash(level.id))
    cache.set(level.id, t)
  }
  return t
}

export interface CaseResult {
  input: Marble[]
  expected: Output
  actual?: Output
  stages: Stage[]
  error?: LangError
  pass: boolean
  hidden: boolean
}

export interface CheckResult {
  parseError?: LangError
  cases: CaseResult[]
  /** all visible and hidden cases pass and mustUse is satisfied */
  solved: boolean
  missing?: StepKind[]
  /** the machine has more steps than the level allows */
  tooLong?: boolean
  stepCount: number
}

export function runCase(program: Program, tc: TestCase, hidden = false): CaseResult {
  const res = runSafe(program, tc.input)
  return {
    ...tc,
    actual: res.output,
    stages: res.stages,
    error: res.error,
    pass: !res.error && outputsEqual(res.output!, tc.expected),
    hidden,
  }
}

export function checkSolution(level: Level, source: string | Program): CheckResult {
  const { visible, hidden } = getTests(level)
  let program: Program
  try {
    program = typeof source === 'string' ? parseProgram(source) : source
  } catch (e) {
    if (e instanceof LangError) return { parseError: e, cases: [], solved: false, stepCount: 0 }
    throw e
  }
  const cases = [...visible.map((tc) => runCase(program, tc, false)), ...hidden.map((tc) => runCase(program, tc, true))]
  const kinds = new Set(program.steps.map((s) => s.kind))
  const missing = (level.mustUse ?? []).filter((k) => !kinds.has(k))
  const tooLong = level.maxSteps !== undefined && program.steps.length > level.maxSteps
  return {
    cases,
    solved: cases.every((c) => c.pass) && missing.length === 0 && !tooLong,
    missing: missing.length ? missing : undefined,
    tooLong: tooLong || undefined,
    stepCount: program.steps.length,
  }
}

/** Stars for a solved level: start with 3, lose one per mistake (failed run or hint), never below 1. */
export function starsFor(mistakes: number): number {
  return Math.max(1, 3 - mistakes)
}

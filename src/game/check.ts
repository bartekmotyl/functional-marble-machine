import { runProgram, type Stage } from '../lang/interpreter'
import { outputsEqual, type Marble, type Output } from '../lang/marble'
import { LangError, parseProgram, type StepKind } from '../lang/parser'
import { generateTests, hash, type TestCase } from './generate'
import type { Level } from './levels'

export const VISIBLE_EXAMPLES = 3
export const HIDDEN_TESTS = 5

const cache = new Map<string, { visible: TestCase[]; hidden: TestCase[] }>()

export function getTests(level: Level) {
  let t = cache.get(level.id)
  if (!t) {
    const count = level.count ?? [4, 7]
    const all = generateTests(level.solution, level.features, count, VISIBLE_EXAMPLES + HIDDEN_TESTS, hash(level.id))
    t = { visible: all.slice(0, VISIBLE_EXAMPLES), hidden: all.slice(VISIBLE_EXAMPLES) }
    cache.set(level.id, t)
  }
  return t
}

export interface CaseResult {
  input: Marble[]
  expected: Output
  actual?: Output
  stages?: Stage[]
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
  stepCount: number
}

function runCase(program: ReturnType<typeof parseProgram>, tc: TestCase, hidden: boolean): CaseResult {
  try {
    const res = runProgram(program, tc.input)
    return { ...tc, actual: res.output, stages: res.stages, pass: outputsEqual(res.output, tc.expected), hidden }
  } catch (e) {
    if (e instanceof LangError) return { ...tc, error: e, pass: false, hidden }
    throw e
  }
}

export function checkSolution(level: Level, source: string): CheckResult {
  const { visible, hidden } = getTests(level)
  let program
  try {
    program = parseProgram(source)
  } catch (e) {
    if (e instanceof LangError) return { parseError: e, cases: [], solved: false, stepCount: 0 }
    throw e
  }
  const cases = [...visible.map((tc) => runCase(program, tc, false)), ...hidden.map((tc) => runCase(program, tc, true))]
  const kinds = new Set(program.steps.map((s) => s.kind))
  const missing = (level.mustUse ?? []).filter((k) => !kinds.has(k))
  return {
    cases,
    solved: cases.every((c) => c.pass) && missing.length === 0,
    missing: missing.length ? missing : undefined,
    stepCount: program.steps.length,
  }
}

export function parCount(level: Level): number {
  return parseProgram(level.solution).steps.length
}

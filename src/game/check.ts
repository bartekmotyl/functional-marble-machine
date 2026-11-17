import { runSafe, type Stage } from '../lang/interpreter'
import { outputsEqual, type Marble, type Output } from '../lang/marble'
import { LangError, parseProgram, type Program, type StepKind } from '../lang/parser'
import { generateTests, hash, type TestCase } from './generate'
import type { Level } from './levels'

export const VISIBLE_EXAMPLES = 5
export const HIDDEN_TESTS = 5

const cache = new Map<string, { visible: TestCase[]; hidden: TestCase[] }>()

export function getTests(level: Level) {
  // custom levels can change when their pack is loaded again, so the key has the whole level
  const key = JSON.stringify([level.id, level.solution, level.features, level.count])
  let t = cache.get(key)
  if (!t) {
    const count = level.count ?? [4, 7]
    t = generateTests(level.solution, level.features, count, VISIBLE_EXAMPLES, HIDDEN_TESTS, hash(level.id))
    cache.set(key, t)
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

/** The most stars a level gives. */
export const MAX_STARS = 5

/**
 * What help costs, in stars. Trying your own marbles costs one star (once per try at a level);
 * after that, telling the rule costs one more instead of two - so experimenting first never
 * costs more, and pays off when you guess the rule yourself.
 */
export const COST = { mistake: 1, experiment: 1, rule: 2, ruleAfterExperiment: 1, tip: 1 } as const

/** The cost of the next hint: the rule first, then tips, then a solution. */
export function hintCost(index: number, experimented: boolean): number {
  if (index > 0) return COST.tip
  return experimented ? COST.ruleAfterExperiment : COST.rule
}

/** Stars for a solved level: start with MAX_STARS, minus the stars lost, never below 1. */
export function starsFor(lost: number): number {
  return Math.max(1, MAX_STARS - lost)
}

/** The expected output of the level's rule for any marbles (used by the marble lab). */
export function expectedFor(level: Level, input: Marble[]): { output?: Output; error?: LangError } {
  const res = runSafe(parseProgram(level.solution), input)
  return { output: res.error ? undefined : res.output, error: res.error }
}

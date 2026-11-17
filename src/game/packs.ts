/**
 * Custom level packs: levels written by players in YAML, loaded from a link and kept in the
 * browser. The format is described in levels-format/README.md.
 *
 * Everything in a pack comes from the internet, so it is checked here before the game uses it:
 * only known fields, only known colors/sizes/patterns, limited sizes, and every solution must be
 * a program the block editor can build and that gives good examples. Texts are kept as plain
 * strings; the UI shows them as text, never as HTML.
 */
import { parse } from 'yaml'
import { fromSource } from '../blocks/model'
import { COLORS, PATTERNS, SIZES } from '../lang/marble'
import { LangError, parseProgram, type StepKind } from '../lang/parser'
import { runProgram } from '../lang/interpreter'
import { generateTests, hash, type Features } from './generate'
import { HIDDEN_TESTS, VISIBLE_EXAMPLES } from './check'
import type { Level } from './levels'

export const PACK_FORMAT = 1
export const MAX_PACK_BYTES = 200_000
export const MAX_LEVELS = 60
const MAX_TEXT = 4000
const MAX_NAME = 80
const STEP_KINDS: StepKind[] = ['filter', 'map', 'count', 'sum', 'max', 'min', 'fold']

export interface LevelTexts {
  goal: string
  intro?: string
  hints: string[]
}

export interface PackLevel extends Level {
  /** texts per language code, e.g. { en: {...}, pl: {...} } */
  texts: Record<string, LevelTexts>
}

export interface Pack {
  /** stable id made from the link, so loading the same link again updates the pack */
  id: string
  url: string
  name: string
  author: string
  description?: string
  levels: PackLevel[]
}

/** A problem in a pack, with the place it was found (like `levels[2].features.colors`). */
export class PackError extends Error {
  constructor(
    public where: string,
    public problem: string,
  ) {
    super(where ? `${where}: ${problem}` : problem)
  }
}

const fail = (where: string, problem: string): never => {
  throw new PackError(where, problem)
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

function obj(where: string, v: unknown, allowed: string[]): Obj {
  if (!isObj(v)) fail(where, 'must be a map of "key: value" lines')
  const o = v as Obj
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(where, `unknown field "${k}" (allowed: ${allowed.join(', ')})`)
  return o
}

function text(where: string, v: unknown, max = MAX_TEXT): string {
  if (typeof v !== 'string' || !v.trim()) fail(where, 'must be some text')
  const s = (v as string).trim()
  if (s.length > max) fail(where, `is too long (at most ${max} characters)`)
  return s
}

function int(where: string, v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(where, `must be a whole number from ${min} to ${max}`)
  return v as number
}

function range(where: string, v: unknown, min: number, max: number): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) fail(where, `must be [lowest, highest], like [${min}, ${Math.min(max, min + 5)}]`)
  const [a, b] = v as unknown[]
  const lo = int(`${where}[0]`, a, min, max)
  const hi = int(`${where}[1]`, b, min, max)
  if (lo > hi) fail(where, 'the first number must not be bigger than the second')
  return [lo, hi]
}

function pickList<T extends string>(where: string, v: unknown, all: readonly T[]): T[] {
  if (!Array.isArray(v) || v.length === 0) fail(where, `must be a list, like [${all.slice(0, 2).join(', ')}]`)
  const list = v as unknown[]
  list.forEach((x, i) => {
    if (!all.includes(x as T)) fail(`${where}[${i}]`, `"${String(x)}" is not one of: ${all.join(', ')}`)
  })
  if (new Set(list).size !== list.length) fail(where, 'lists the same value twice')
  return list as T[]
}

function features(where: string, v: unknown): Features {
  const o = obj(where, v, ['colors', 'sizes', 'patterns', 'numbers'])
  const f: Features = { colors: pickList(`${where}.colors`, o.colors, COLORS) }
  if (o.sizes !== undefined) f.sizes = pickList(`${where}.sizes`, o.sizes, SIZES)
  if (o.patterns !== undefined) f.patterns = pickList(`${where}.patterns`, o.patterns, PATTERNS)
  if (o.numbers !== undefined) f.numbers = range(`${where}.numbers`, o.numbers, 0, 99)
  return f
}

function program(where: string, v: unknown): string {
  const src = text(where, v, 1000)
  try {
    parseProgram(src)
  } catch (e) {
    if (e instanceof LangError) fail(where, `is not a valid program: ${e.message}`)
    throw e
  }
  if (!fromSource(src)) fail(where, 'cannot be built from blocks in the game')
  return src
}

function levelTexts(where: string, v: unknown): Record<string, LevelTexts> {
  if (!isObj(v) || Object.keys(v).length === 0) fail(where, 'needs texts for at least one language, like "en:"')
  const out: Record<string, LevelTexts> = {}
  for (const [lang, t] of Object.entries(v as Obj)) {
    const w = `${where}.${lang}`
    if (!/^[a-z]{2}$/.test(lang)) fail(w, 'the language must be a two-letter code, like en or pl')
    const o = obj(w, t, ['goal', 'intro', 'hints'])
    const hints = o.hints === undefined ? [] : o.hints
    if (!Array.isArray(hints) || hints.length > 10) fail(`${w}.hints`, 'must be a list of at most 10 texts')
    out[lang] = {
      goal: text(`${w}.goal`, o.goal),
      intro: o.intro === undefined ? undefined : text(`${w}.intro`, o.intro),
      hints: (hints as unknown[]).map((h, i) => text(`${w}.hints[${i}]`, h, 1000)),
    }
  }
  return out
}

/**
 * Do the level's examples show the rule? The same test the built-in levels pass: five
 * different examples, every question of the rule says both yes and no, and not every
 * example gives the same answer.
 */
export function examplesProblem(level: Level): string | null {
  const { visible } = generateTests(level.solution, level.features, level.count ?? [4, 7], VISIBLE_EXAMPLES, HIDDEN_TESTS, hash(level.id))
  if (visible.length < VISIBLE_EXAMPLES || new Set(visible.map((t) => JSON.stringify(t.input))).size < VISIBLE_EXAMPLES)
    return 'there are too few different marble rows - add more colors, sizes, patterns or numbers'
  if (new Set(visible.map((t) => JSON.stringify(t.expected))).size < 2) return 'every example gives the same answer, so the rule cannot be found'
  const program = parseProgram(level.solution)
  const seen = new Map<string, Set<boolean>>()
  for (const tc of visible)
    for (const stage of runProgram(program, tc.input).stages)
      for (const values of stage.values)
        values.forEach((v, id) => {
          if (typeof v !== 'boolean') return
          if (!seen.has(id)) seen.set(id, new Set())
          seen.get(id)!.add(v)
        })
  if ([...seen.values()].some((s) => s.size < 2))
    return 'some question of the rule always says the same (yes or no) in the examples - check the features and "count"'
  return null
}

/** Id of a pack loaded from a link. */
export function packId(url: string): string {
  return 'p' + hash(url).toString(36)
}

export interface ReadOptions {
  /** also generate the examples of every level and check them (slow-ish; done when adding a pack) */
  checkExamples?: boolean
}

/** Read and check a pack. Throws a PackError that says what is wrong and where. */
export function readPack(source: string, url: string, { checkExamples = true }: ReadOptions = {}): Pack {
  if (source.length > MAX_PACK_BYTES) fail('', `the file is too big (at most ${MAX_PACK_BYTES / 1000} kB)`)
  let y: unknown
  try {
    y = parse(source, { maxAliasCount: 50 })
  } catch (e) {
    fail('', `this is not valid YAML: ${(e as Error).message.split('\n')[0]}`)
  }
  const top = obj('pack', y, ['format', 'name', 'author', 'description', 'levels'])
  if (top.format !== undefined && top.format !== PACK_FORMAT) fail('format', `must be ${PACK_FORMAT} (or left out)`)
  const id = packId(url)
  const levels = top.levels
  if (!Array.isArray(levels) || levels.length === 0) fail('levels', 'must be a list with at least one level')
  if ((levels as unknown[]).length > MAX_LEVELS) fail('levels', `has too many levels (at most ${MAX_LEVELS})`)

  const ids = new Set<string>()
  const out = (levels as unknown[]).map((raw, i): PackLevel => {
    const w = `levels[${i}]`
    const o = obj(w, raw, ['id', 'solution', 'features', 'count', 'maxSteps', 'mustUse', 'starter', 'texts'])
    const own = o.id === undefined ? String(i + 1) : String(o.id)
    if (!/^[a-z0-9]{1,20}$/.test(own)) fail(`${w}.id`, 'must be lowercase letters and digits only')
    if (ids.has(own)) fail(`${w}.id`, `"${own}" is used by another level`)
    ids.add(own)
    const level: PackLevel = {
      id: `${id}_${own}`,
      solution: program(`${w}.solution`, o.solution),
      features: features(`${w}.features`, o.features),
      texts: levelTexts(`${w}.texts`, o.texts),
    }
    if (o.count !== undefined) level.count = range(`${w}.count`, o.count, 1, 12)
    if (o.maxSteps !== undefined) level.maxSteps = int(`${w}.maxSteps`, o.maxSteps, 1, 20)
    if (o.mustUse !== undefined) level.mustUse = pickList(`${w}.mustUse`, o.mustUse, STEP_KINDS)
    if (o.starter !== undefined) level.starter = program(`${w}.starter`, o.starter)
    if (level.maxSteps !== undefined && parseProgram(level.solution).steps.length > level.maxSteps)
      fail(`${w}.maxSteps`, 'the solution itself has more steps than this')
    const used = new Set(parseProgram(level.solution).steps.map((s) => s.kind))
    for (const k of level.mustUse ?? []) if (!used.has(k)) fail(`${w}.mustUse`, `the solution does not use "${k}" itself`)
    if (checkExamples) {
      const problem = examplesProblem(level)
      if (problem) fail(`${w}.solution`, problem)
    }
    return level
  })

  const pack: Pack = {
    id,
    url,
    name: text('name', top.name, MAX_NAME),
    author: text('author', top.author, MAX_NAME),
    levels: out,
  }
  if (top.description !== undefined) pack.description = text('description', top.description, 500)
  return pack
}

/** Texts of a pack level in the given language, falling back to English, then to any language. */
export function textsFor(level: PackLevel, lang: string): LevelTexts {
  return level.texts[lang] ?? level.texts.en ?? Object.values(level.texts)[0]
}

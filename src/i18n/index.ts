/**
 * Tiny translation layer.
 *
 * Every visible text lives in a JSON file in this folder (en.json is the reference).
 * Any `xx.json` dropped here is picked up automatically as a new language - see README.
 *
 *   t('ui.check.all')                      -> plain text
 *   t('ui.examplesWork', { ok: 3, all: 5 }) -> "{ok}" placeholders are filled in
 *   tn('ui.steps', 2)                       -> plural forms: "ui.steps.one" / ".few" / ".many" / ".other"
 *   tl('levels.f1.hints')                   -> list of texts
 */
type Dict = { [key: string]: string | string[] | Dict }

const files = import.meta.glob<{ default: Dict }>('./*.json', { eager: true })

export const DICTS: Record<string, Dict> = {}
for (const [path, mod] of Object.entries(files)) {
  const code = path.replace(/^.*\/(\w+)\.json$/, '$1')
  DICTS[code] = mod.default
}

export const LANGS = Object.keys(DICTS).sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)))

const STORAGE_KEY = 'marble-machine-lang'

function initialLang(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && DICTS[saved]) return saved
  } catch {
    /* no storage (tests) */
  }
  // not picked yet: the first of the browser's languages that the game has (e.g. "pl-PL" -> pl)
  const wanted = typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : []
  for (const l of wanted) {
    const code = l?.slice(0, 2).toLowerCase()
    if (code && DICTS[code]) return code
  }
  return 'en'
}

let current = initialLang()

export function getLang(): string {
  return current
}

export function setLang(lang: string) {
  if (!DICTS[lang]) return
  current = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

function lookup(dict: Dict | undefined, key: string): unknown {
  let v: unknown = dict
  for (const part of key.split('.')) {
    if (v && typeof v === 'object' && !Array.isArray(v)) v = (v as Dict)[part]
    else return undefined
  }
  return v
}

function raw(key: string): unknown {
  return lookup(DICTS[current], key) ?? lookup(DICTS.en, key)
}

function fill(text: string, params?: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? String(params[k]) : m))
}

export function has(key: string): boolean {
  return raw(key) !== undefined
}

export function t(key: string, params?: Record<string, string | number>): string {
  const v = raw(key)
  return typeof v === 'string' ? fill(v, params) : key
}

/** Text with plural forms, chosen by the language's own rules (Polish has one / few / many). */
export function tn(key: string, n: number, params?: Record<string, string | number>): string {
  const form = new Intl.PluralRules(current).select(n)
  const v = raw(`${key}.${form}`) ?? raw(`${key}.other`)
  return typeof v === 'string' ? fill(v, { n, ...params }) : key
}

export function tl(key: string): string[] {
  const v = raw(key)
  return Array.isArray(v) ? v : []
}

/** All keys of a dictionary as "a.b.c" paths (used by the completeness check). */
export function keysOf(dict: Dict, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keysOf(v as Dict, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

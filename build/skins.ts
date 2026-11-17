/**
 * Skins: the look of the game (colors, font, roundness, section icons), one YAML file each in
 * skins/. At build time they are checked and turned into CSS variables, served to the app as
 * the module `virtual:skins`. A skin changes only how things look, never what they mean.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parse } from 'yaml'
import type { Plugin } from 'vite'

export interface Skin {
  id: string
  /** name per language code; `en` is required */
  name: Record<string, string>
  /** section id -> icon */
  icons: Record<string, string>
  /** CSS rule that sets the skin's variables on :root[data-skin="<id>"] */
  css: string
}

export const DEFAULT_SKIN = 'candy'

/** Every skin must define these colors (see skins/candy.yaml for what each one is for). */
export const COLOR_KEYS = [
  'bg', 'panel', 'ink', 'muted', 'shadow', 'code-bg', 'code-ink', 'on-strong',
  'accent', 'accent-text', 'accent-2', 'good', 'bad', 'warn', 'gold', 'and', 'or',
] as const
export const MARBLE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'] as const

const COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|white|black)$/

function fail(file: string, msg: string): never {
  throw new Error(`skins/${file}: ${msg}`)
}

function color(file: string, key: string, v: unknown): string {
  if (typeof v === 'string' && COLOR.test(v.trim())) return v.trim()
  if (v && typeof v === 'object' && 'light' in v && 'dark' in v) {
    const { light, dark } = v as { light: unknown; dark: unknown }
    return `light-dark(${color(file, `${key}.light`, light)}, ${color(file, `${key}.dark`, dark)})`
  }
  fail(file, `"${key}" must be a color like '#6c4cf5', or { light: ..., dark: ... }`)
}

function num(file: string, key: string, v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || v < min || v > max) fail(file, `"${key}" must be a number from ${min} to ${max}`)
  return v
}

/** Read and check one skin file. */
export function readSkin(dir: string, file: string): Skin {
  const id = basename(file, '.yaml')
  if (!/^[a-z0-9-]+$/.test(id)) fail(file, 'the file name must be lowercase letters, digits or -')
  const y = parse(readFileSync(join(dir, file), 'utf8')) ?? {}

  const name = y.name
  if (!name || typeof name !== 'object' || typeof name.en !== 'string') fail(file, '"name" needs at least an "en" entry')
  if (typeof y.font !== 'string' || !y.font.trim()) fail(file, '"font" must be a CSS font list')
  if (/[;{}]/.test(y.font)) fail(file, '"font" must not contain ; { or }')

  const vars: [string, string | number][] = [
    ['font', y.font.trim()],
    ['round', num(file, 'round', y.round, 0, 2)],
    ['depth', num(file, 'depth', y.depth, 0, 2)],
  ]
  const colors = y.colors ?? {}
  for (const key of COLOR_KEYS) {
    if (!(key in colors)) fail(file, `"colors.${key}" is missing`)
    vars.push([key, color(file, `colors.${key}`, colors[key])])
  }
  for (const key of Object.keys(colors)) {
    if (!(COLOR_KEYS as readonly string[]).includes(key)) fail(file, `unknown color "colors.${key}"`)
  }
  const marbles = y.marbles ?? {}
  for (const m of MARBLE_COLORS) {
    const shades = marbles[m]
    if (!Array.isArray(shades) || shades.length !== 3) fail(file, `"marbles.${m}" must be [light, base, dark]`)
    shades.forEach((s: unknown, i: number) => vars.push([`marble-${m}-${i}`, color(file, `marbles.${m}[${i}]`, s)]))
  }

  const icons: Record<string, string> = {}
  for (const [k, v] of Object.entries(y.icons ?? {})) {
    if (typeof v !== 'string') fail(file, `"icons.${k}" must be text`)
    icons[k] = v
  }

  const body = vars.map(([k, v]) => `  --${k}: ${v};`).join('\n')
  return { id, name, icons, css: `:root[data-skin='${id}'] {\n${body}\n}\n` }
}

/** All skins, the default one first. */
export function readSkins(dir: string): Skin[] {
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'))
  const skins = files.map((f) => readSkin(dir, f))
  if (!skins.some((s) => s.id === DEFAULT_SKIN)) throw new Error(`skins/${DEFAULT_SKIN}.yaml (the default skin) is missing`)
  return skins.sort((a, b) => (a.id === DEFAULT_SKIN ? -1 : b.id === DEFAULT_SKIN ? 1 : a.id.localeCompare(b.id)))
}

const ID = 'virtual:skins'

/** Vite plugin: `import skins from 'virtual:skins'` gives the checked skins. */
export function skinsPlugin(dir = 'skins'): Plugin {
  let root = process.cwd()
  return {
    name: 'marble-skins',
    configResolved(c) {
      root = c.root
    },
    resolveId(id) {
      return id === ID ? '\0' + ID : undefined
    },
    load(id) {
      if (id !== '\0' + ID) return
      const abs = resolve(root, dir)
      for (const f of readdirSync(abs)) this.addWatchFile(join(abs, f))
      return `export default ${JSON.stringify(readSkins(abs))}`
    },
  }
}

#!/usr/bin/env node
/**
 * Translation helper.
 *
 *   npm run i18n -- check        list missing / extra keys of every language compared to en.json
 *   npm run i18n -- new de       create src/i18n/de.json from en.json (English texts, ready to translate)
 *
 * A new <lang>.json in src/i18n is picked up by the game automatically.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n')
const load = (lang) => JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8'))
const keysOf = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keysOf(v, `${p}${k}.`) : [`${p}${k}`]))
const base = (k) => k.replace(/\.(zero|one|two|few|many|other)$/, '')

const [cmd, arg] = process.argv.slice(2)
const en = load('en')

if (cmd === 'new') {
  if (!arg || !/^[a-z]{2}$/.test(arg)) {
    console.error('Usage: npm run i18n -- new <two-letter language code>')
    process.exit(1)
  }
  const file = join(dir, `${arg}.json`)
  if (existsSync(file)) {
    console.error(`${file} already exists`)
    process.exit(1)
  }
  const copy = structuredClone(en)
  copy.meta = { name: `TODO ${arg}`, flag: '🏳️' }
  writeFileSync(file, JSON.stringify(copy, null, 2) + '\n')
  console.log(`Created ${file}. Translate the texts, set "meta.name" and "meta.flag", then run: npm run i18n -- check`)
  console.log('Tip: add a "code" section to show the code view in your language (see pl.json).')
} else {
  let ok = true
  const enKeys = keysOf(en).map(base)
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
    const lang = f.replace('.json', '')
    const keys = new Set(keysOf(load(lang)).map(base))
    const missing = [...new Set(enKeys.filter((k) => !k.startsWith('code.') && !keys.has(k)))]
    const extra = [...keys].filter((k) => !k.startsWith('code.') && !enKeys.includes(k))
    console.log(`${lang}: ${missing.length} missing, ${extra.length} extra`)
    missing.forEach((k) => console.log(`  missing: ${k}`))
    extra.forEach((k) => console.log(`  extra:   ${k}`))
    if (missing.length) ok = false
  }
  process.exit(ok ? 0 : 1)
}

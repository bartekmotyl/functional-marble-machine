import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLOR_KEYS, DEFAULT_SKIN, MARBLE_COLORS, readSkin, readSkins } from './skins'
import { CHAPTERS } from '../src/game/levels'

describe('skins', () => {
  const skins = readSkins('skins')

  it('has the default skin first and at least one more', () => {
    expect(skins[0].id).toBe(DEFAULT_SKIN)
    expect(skins.length).toBeGreaterThan(1)
  })

  for (const skin of skins) {
    it(`${skin.id} sets every color, marble shade and section icon`, () => {
      for (const k of COLOR_KEYS) expect(skin.css, k).toContain(`--${k}:`)
      for (const m of MARBLE_COLORS) for (const i of [0, 1, 2]) expect(skin.css).toContain(`--marble-${m}-${i}:`)
      for (const ch of CHAPTERS) expect(skin.icons[ch.id], ch.id).toBeTruthy()
      expect(skin.name.en).toBeTruthy()
      expect(skin.name.pl).toBeTruthy()
    })
  }

  it('explains what is wrong with a broken skin', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skin-'))
    const candy = readFileSync('skins/candy.yaml', 'utf8')
    writeFileSync(join(dir, 'broken.yaml'), candy.replace(/^  accent: .*$/m, "  accent: 'not a color'"))
    expect(() => readSkin(dir, 'broken.yaml')).toThrow(/colors\.accent/)
    writeFileSync(join(dir, 'missing.yaml'), candy.replace(/^  gold: .*$/m, ''))
    expect(() => readSkin(dir, 'missing.yaml')).toThrow(/colors\.gold" is missing/)
  })
})

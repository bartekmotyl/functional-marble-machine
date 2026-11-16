import { describe, expect, it } from 'vitest'
import { CHAPTERS, ALL_LEVELS, type Concept } from '../game/levels'
import { CONCEPT_CODE } from '../game/concepts'
import { DICTS, LANGS, keysOf } from '.'

/** Plural forms differ between languages (Polish has "few" and "many"); compare the base key. */
const base = (k: string) => k.replace(/\.(zero|one|two|few|many|other)$/, '')

describe('translations', () => {
  const en = DICTS.en

  it('include English and Polish', () => {
    expect(LANGS).toContain('en')
    expect(LANGS).toContain('pl')
  })

  it('every level, section and concept has its English texts', () => {
    const enKeys = new Set(keysOf(en))
    for (const l of ALL_LEVELS) expect(enKeys.has(`levels.${l.id}.goal`), l.id).toBe(true)
    for (const c of CHAPTERS) {
      expect(enKeys.has(`chapters.${c.id}.title`), c.id).toBe(true)
      expect(enKeys.has(`chapters.${c.id}.blurb`), c.id).toBe(true)
    }
    for (const c of Object.keys(CONCEPT_CODE) as Concept[]) {
      expect(enKeys.has(`concepts.${c}.title`), c).toBe(true)
      expect(enKeys.has(`concepts.${c}.text`), c).toBe(true)
    }
  })

  for (const lang of LANGS.filter((l) => l !== 'en')) {
    it(`${lang} has every English text`, () => {
      const have = new Set(keysOf(DICTS[lang]).map(base))
      const missing = keysOf(en)
        .map(base)
        .filter((k) => !k.startsWith('code.') && !have.has(k))
      expect([...new Set(missing)]).toEqual([])
    })

    it(`${lang} keeps the {placeholders} of the English texts`, () => {
      const holes = (s: unknown) => (typeof s === 'string' ? (s.match(/\{\w+\}/g) ?? []).sort().join() : '')
      const get = (d: unknown, k: string) => k.split('.').reduce<unknown>((v, p) => (v as Record<string, unknown>)?.[p], d)
      const wrong = keysOf(en).filter((k) => {
        const theirs = get(DICTS[lang], k)
        return theirs !== undefined && holes(get(en, k)) !== holes(theirs)
      })
      expect(wrong).toEqual([])
    })
  }
})

describe('Polish texts', () => {
  it('speak to the player in a gender-neutral way', () => {
    const texts = keysOf(DICTS.pl)
      .map((k) => k.split('.').reduce<unknown>((v, p) => (v as Record<string, unknown>)?.[p], DICTS.pl))
      .flat()
      .filter((v): v is string => typeof v === 'string')
    // "Ukończyłeś" alone is masculine - it must be written "Ukończyłeś/aś"
    // (\b does not know Polish letters, so words are matched with \p{L})
    const masculine = texts.filter(
      (s) => /łeś(?!\/aś)/u.test(s) || /(?<!\p{L})sama?(?!\p{L})/u.test(s) || /mistrzem(?!\/)/u.test(s),
    )
    expect(masculine).toEqual([])
  })
})

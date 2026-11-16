import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './levels'
import type { Progress } from './progress'
import { EXAM_AFTER, continueTarget, examOf, isChapterOpen, isExamOpen, isUnlocked, practiceOf } from './progression'

const empty = (): Progress => ({ stars: {}, code: {} })
const solve = (p: Progress, ...ids: string[]) => {
  for (const id of ids) p.stars[id] = 1
  return p
}

describe('progression', () => {
  const [first, second] = CHAPTERS
  const practice = practiceOf(first)

  it('opens practice levels one after another', () => {
    const p = empty()
    expect(isUnlocked(p, practice[0].id)).toBe(true)
    expect(isUnlocked(p, practice[1].id)).toBe(false)
    solve(p, practice[0].id)
    expect(isUnlocked(p, practice[1].id)).toBe(true)
  })

  it(`opens the exam after ${EXAM_AFTER} solved levels`, () => {
    const p = empty()
    solve(p, ...practice.slice(0, EXAM_AFTER - 1).map((l) => l.id))
    expect(isExamOpen(p, first)).toBe(false)
    solve(p, practice[EXAM_AFTER - 1].id)
    expect(isExamOpen(p, first)).toBe(true)
    expect(isUnlocked(p, examOf(first).id)).toBe(true)
  })

  it('opens the next section only after its exam is passed', () => {
    const p = solve(empty(), ...practice.map((l) => l.id))
    expect(isChapterOpen(p, second)).toBe(false)
    expect(isUnlocked(p, second.levels[0].id)).toBe(false)
    solve(p, examOf(first).id)
    expect(isChapterOpen(p, second)).toBe(true)
    expect(isUnlocked(p, second.levels[0].id)).toBe(true)
  })

  it('continues with the section page first, then the next unsolved level', () => {
    const p = empty()
    expect(continueTarget(p)).toEqual({ chapter: first })
    solve(p, practice[0].id)
    expect(continueTarget(p).level?.id).toBe(practice[1].id)
    solve(p, examOf(first).id)
    expect(continueTarget(p)).toEqual({ chapter: second })
  })

  it('every section has 20-30 levels', () => {
    for (const ch of CHAPTERS) {
      expect(ch.levels.length, ch.id).toBeGreaterThanOrEqual(20)
      expect(ch.levels.length, ch.id).toBeLessThanOrEqual(30)
    }
  })

  it('cheat mode opens everything', () => {
    const p = { ...empty(), unlockAll: true }
    for (const ch of CHAPTERS) for (const l of ch.levels) expect(isUnlocked(p, l.id)).toBe(true)
  })
})

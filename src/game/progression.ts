import { CHAPTERS, chapterOf, type Chapter, type Level } from './levels'
import type { Progress } from './progress'

/** After this many solved practice levels a section's exam opens. */
export const EXAM_AFTER = 5

export const practiceOf = (ch: Chapter) => ch.levels.filter((l) => !l.exam)
export const examOf = (ch: Chapter) => ch.levels.find((l) => l.exam)!

const solved = (p: Progress, id: string) => (p.stars[id] ?? 0) > 0

export function solvedPractice(p: Progress, ch: Chapter): number {
  return practiceOf(ch).filter((l) => solved(p, l.id)).length
}

/** How many practice levels must be solved before the exam opens (always 5 - every section has more). */
export function examNeeds(_ch: Chapter): number {
  return EXAM_AFTER
}

export function isExamPassed(p: Progress, ch: Chapter): boolean {
  return solved(p, examOf(ch).id)
}

/** A section is open when it is the first one, or the exam of the section before was passed. */
export function isChapterOpen(p: Progress, ch: Chapter): boolean {
  if (p.unlockAll) return true
  const i = CHAPTERS.indexOf(ch)
  return i === 0 || isExamPassed(p, CHAPTERS[i - 1])
}

export function isExamOpen(p: Progress, ch: Chapter): boolean {
  return isChapterOpen(p, ch) && (p.unlockAll || solvedPractice(p, ch) >= examNeeds(ch))
}

export function isUnlocked(p: Progress, levelId: string): boolean {
  const ch = chapterOf(levelId)
  if (!ch || !isChapterOpen(p, ch)) return false
  if (p.unlockAll) return true
  const level = ch.levels.find((l) => l.id === levelId)!
  if (level.exam) return isExamOpen(p, ch)
  const practice = practiceOf(ch)
  const i = practice.indexOf(level)
  return i === 0 || solved(p, practice[i - 1].id)
}

/** The next practice level to play in a section (first unsolved one that is open). */
export function nextPractice(p: Progress, ch: Chapter): Level | undefined {
  return practiceOf(ch).find((l) => !solved(p, l.id) && isUnlocked(p, l.id))
}

/** Where "Continue" on the map should take you. */
export function continueTarget(p: Progress): { chapter: Chapter; level?: Level } {
  for (const ch of CHAPTERS) {
    if (!isChapterOpen(p, ch)) break
    if (isExamPassed(p, ch)) continue
    const started = ch.levels.some((l) => solved(p, l.id))
    if (!started) return { chapter: ch } // show the section page first
    const level = nextPractice(p, ch) ?? (isExamOpen(p, ch) ? examOf(ch) : undefined)
    return { chapter: ch, level }
  }
  return { chapter: CHAPTERS[CHAPTERS.length - 1] }
}

/** Number of a practice level inside its section (1, 2, 3...). Exams have none. */
export function levelNumber(levelId: string): number {
  const ch = chapterOf(levelId)
  return practiceOf(ch).findIndex((l) => l.id === levelId) + 1
}

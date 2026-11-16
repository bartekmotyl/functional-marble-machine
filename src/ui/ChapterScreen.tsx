import { CHAPTERS, type Chapter } from '../game/levels'
import type { Progress } from '../game/progress'
import { examNeeds, examOf, isExamOpen, isExamPassed, nextPractice, practiceOf, solvedPractice } from '../game/progression'
import { t, tn } from '../i18n'
import { LangSwitch, Stars3 } from './MapScreen'
import { isUnlocked } from '../game/progression'

interface Props {
  chapter: Chapter
  progress: Progress
  onOpen: (id: string) => void
  onOpenChapter: (id: string) => void
  onBack: () => void
  onLang: (lang: string) => void
}

/** The page of a section: shown when you enter it, and as its hub (practice / exam). */
export function ChapterScreen({ chapter, progress, onOpen, onOpenChapter, onBack, onLang }: Props) {
  const idx = CHAPTERS.indexOf(chapter)
  const practice = practiceOf(chapter)
  const done = solvedPractice(progress, chapter)
  const exam = examOf(chapter)
  const examOpen = isExamOpen(progress, chapter)
  const passed = isExamPassed(progress, chapter)
  const next = nextPractice(progress, chapter)
  const nextChapter = CHAPTERS[idx + 1]
  const concepts = [...new Set(chapter.levels.flatMap((l) => l.unlocks ?? []))]
  const missing = Math.max(0, examNeeds(chapter) - done)

  return (
    <div className={`chapter-screen ch-${chapter.id}`}>
      <div className="chapter-top">
        <button className="btn ghost" onClick={onBack}>
          {t('chapter.backToMap')}
        </button>
        <LangSwitch onLang={onLang} />
      </div>
      <div className="chapter-card">
        <div className="chapter-big-emoji">{chapter.emoji}</div>
        <div className="chapter-num">{t('chapter.section', { n: idx + 1 })}</div>
        <h1>{t(`chapters.${chapter.id}.title`)}</h1>
        <p className="chapter-blurb">{t(`chapters.${chapter.id}.blurb`)}</p>

        {passed && <div className="chapter-passed">{t('chapter.passed')}</div>}

        {concepts.length > 0 && (
          <div className="chapter-learn">
            <h3>{t('chapter.learn')}</h3>
            <div className="learn-chips">
              {concepts.map((c) => (
                <span key={c} className="learn-chip" title={t(`concepts.${c}.text`)}>
                  {t(`concepts.${c}.title`)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="chapter-progress">
          <div className="progress-bar">
            <div style={{ width: `${(100 * done) / practice.length}%` }} />
          </div>
          {t('chapter.progress', { done, all: practice.length })}
        </div>

        <div className="chapter-levels">
          {practice.map((l, i) => {
            const unlocked = isUnlocked(progress, l.id)
            return (
              <button key={l.id} className={`level-btn small ${progress.stars[l.id] ? 'solved' : ''} ${unlocked ? '' : 'locked'}`} disabled={!unlocked} onClick={() => onOpen(l.id)}>
                <span className="lvl-num">{unlocked ? i + 1 : '🔒'}</span>
                <Stars3 n={progress.stars[l.id] ?? 0} />
              </button>
            )
          })}
        </div>

        <div className="chapter-actions">
          {next && (
            <button className="btn run" onClick={() => onOpen(next.id)}>
              {done === 0 ? t('chapter.start') : t('chapter.continue')}
            </button>
          )}
          <button className="btn check" disabled={!examOpen} onClick={() => onOpen(exam.id)}>
            {examOpen ? t('chapter.takeExam') : tn('chapter.examLocked', missing)}
          </button>
          {passed && nextChapter && (
            <button className="btn run" onClick={() => onOpenChapter(nextChapter.id)}>
              {t('chapter.nextSection')}
            </button>
          )}
        </div>
        <p className="muted exam-info">{passed && !nextChapter ? t('chapter.allDone') : t('chapter.examInfo')}</p>
      </div>
    </div>
  )
}

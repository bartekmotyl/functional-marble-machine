import { ALL_LEVELS, CHAPTERS } from '../game/levels'
import type { Progress } from '../game/progress'
import { MAX_STARS } from '../game/check'
import { continueTarget, examNeeds, isChapterOpen, isUnlocked, practiceOf, examOf } from '../game/progression'
import { DICTS, LANGS, getLang, t } from '../i18n'
import { Marble } from './Marble'
import { ThemeSwitch } from './theme'
import { SectionIcon, SkinSwitch } from './skin'

interface Props {
  progress: Progress
  onOpen: (id: string) => void
  onOpenChapter: (id: string) => void
  onUnlockAll: (v: boolean) => void
  onReset: () => void
  onLang: (lang: string) => void
}

export function LevelStars({ n }: { n: number }) {
  return (
    <span className="lvl-stars">
      {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((k) => (
        <span key={k} className={n >= k ? 'on' : 'off'}>
          ⭐
        </span>
      ))}
    </span>
  )
}

export function LangSwitch({ onLang }: { onLang: (lang: string) => void }) {
  return (
    <div className="lang-switch" role="group" aria-label={t('map.language')}>
      <SkinSwitch />
      <ThemeSwitch />
      {LANGS.map((l) => {
        const meta = DICTS[l].meta as { name: string }
        return (
          <button key={l} className={`lang-btn ${getLang() === l ? 'on' : ''}`} onClick={() => onLang(l)} title={meta.name}>
            {meta.name}
          </button>
        )
      })}
    </div>
  )
}

export function MapScreen({ progress, onOpen, onOpenChapter, onUnlockAll, onReset, onLang }: Props) {
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0)
  const target = continueTarget(progress)
  return (
    <div className="map-screen">
      <LangSwitch onLang={onLang} />
      <header className="hero">
        <div className="hero-marbles" aria-hidden>
          <Marble marble={{ color: 'red', size: 'big', pattern: 'plain', number: 0 }} />
          <Marble marble={{ color: 'yellow', size: 'medium', pattern: 'striped', number: 0 }} />
          <Marble marble={{ color: 'blue', size: 'big', pattern: 'dotted', number: 0 }} />
          <Marble marble={{ color: 'green', size: 'small', pattern: 'plain', number: 0 }} />
          <Marble marble={{ color: 'purple', size: 'medium', pattern: 'striped', number: 0 }} />
        </div>
        <h1>{t('map.title')}</h1>
        <p>{t('map.tagline')}</p>
        <button className={`cheat ${progress.unlockAll ? 'on' : ''}`} onClick={() => onUnlockAll(!progress.unlockAll)} title={t('map.cheatTitle')}>
          {progress.unlockAll ? t('map.cheatOn') : t('map.cheatOff')}
        </button>
        <div className="hero-stats">
          ⭐ {totalStars} / {ALL_LEVELS.length * MAX_STARS}
          <button className="btn run" onClick={() => (target.level ? onOpen(target.level.id) : onOpenChapter(target.chapter.id))}>
            {totalStars === 0 ? t('map.start') : t('map.continue')}
          </button>
        </div>
      </header>

      {CHAPTERS.map((ch, ci) => {
        const open = isChapterOpen(progress, ch)
        const exam = examOf(ch)
        const examStars = progress.stars[exam.id] ?? 0
        return (
          <section key={ch.id} className={`chapter ${open ? '' : 'locked'}`}>
            <button className="chapter-head" onClick={() => onOpenChapter(ch.id)} disabled={!open} title={open ? t('map.openSection') : t('map.locked')}>
              <span className="chapter-emoji">{open ? <SectionIcon chapter={ch} /> : '🔒'}</span>
              <span>
                <span className="chapter-num">{t('chapter.section', { n: ci + 1 })}</span>
                <h2>{t(`chapters.${ch.id}.title`)}</h2>
              </span>
            </button>
            <p className="muted">{open ? t(`chapters.${ch.id}.blurb`) : t('map.locked')}</p>
            <div className="level-buttons">
              {practiceOf(ch).map((l, i) => {
                const unlocked = isUnlocked(progress, l.id)
                const s = progress.stars[l.id] ?? 0
                return (
                  <button
                    key={l.id}
                    className={`level-btn ${s ? 'solved' : ''} ${unlocked ? '' : 'locked'} ${target.level?.id === l.id ? 'next' : ''}`}
                    disabled={!unlocked}
                    onClick={() => onOpen(l.id)}
                    title={unlocked ? t('level.name', { n: i + 1 }) : t('map.levelLocked')}
                  >
                    <span className="lvl-num">{unlocked ? i + 1 : '🔒'}</span>
                    <LevelStars n={s} />
                  </button>
                )
              })}
              <button
                className={`level-btn exam ${examStars ? 'solved' : ''} ${isUnlocked(progress, exam.id) ? '' : 'locked'} ${target.level?.id === exam.id ? 'next' : ''}`}
                disabled={!isUnlocked(progress, exam.id)}
                onClick={() => onOpen(exam.id)}
                title={isUnlocked(progress, exam.id) ? t('map.exam') : t('map.examLocked', { n: examNeeds(ch) })}
              >
                <span className="lvl-num">{isUnlocked(progress, exam.id) ? '🎓' : '🔒'}</span>
                <span className="lvl-title">{t('map.exam').replace('🎓 ', '')}</span>
                <LevelStars n={examStars} />
              </button>
            </div>
          </section>
        )
      })}

      <footer className="map-footer">
        <button
          className="btn ghost small"
          onClick={() => {
            if (confirm(t('map.resetConfirm'))) onReset()
          }}
        >
          {t('map.reset')}
        </button>
      </footer>
    </div>
  )
}

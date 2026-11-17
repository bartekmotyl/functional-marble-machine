import { ALL_LEVELS, CHAPTERS } from '../game/levels'
import type { Pack } from '../game/packs'
import { CHEATS_ALLOWED, type Progress } from '../game/progress'
import { MAX_STARS } from '../game/check'
import { continueTarget, examNeeds, isChapterOpen, isUnlocked, practiceOf, examOf } from '../game/progression'
import { t } from '../i18n'
import { Marble } from './Marble'
import { ThemeSwitch } from './theme'
import { LangPicker } from './LangPicker'

const AUTHOR = 'Bartek Motyl'
const REPO_URL = 'https://github.com/bartekmotyl/functional-marble-machine'
import { SectionIcon, SkinSwitch } from './skin'

interface Props {
  progress: Progress
  onOpen: (id: string) => void
  onOpenChapter: (id: string) => void
  onUnlockAll: (v: boolean) => void
  onReset: () => void
  onLang: (lang: string) => void
  /** custom level packs, shown as extra sections below the built-in ones */
  packs: Pack[]
  onImport: () => void
  onRemovePack: (pack: Pack) => void
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
    <div className="lang-switch" role="group" aria-label={t('map.settings')}>
      <SkinSwitch />
      <ThemeSwitch />
      <LangPicker onLang={onLang} />
    </div>
  )
}

export function MapScreen({ progress, onOpen, onOpenChapter, onUnlockAll, onReset, onLang, packs, onImport, onRemovePack }: Props) {
  // stars of custom levels are not part of the game's total
  const totalStars = ALL_LEVELS.reduce((a, l) => a + (progress.stars[l.id] ?? 0), 0)
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
        {CHEATS_ALLOWED && (
          <button className={`cheat ${progress.unlockAll ? 'on' : ''}`} onClick={() => onUnlockAll(!progress.unlockAll)} title={t('map.cheatTitle')}>
            {progress.unlockAll ? t('map.cheatOn') : t('map.cheatOff')}
          </button>
        )}
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

      {packs.map((pack) => (
        <section key={pack.id} className="chapter custom-pack">
          <div className="chapter-head pack-head">
            <span className="chapter-emoji">🧪</span>
            <span>
              <span className="chapter-num">{t('packs.custom')}</span>
              <h2>{pack.name}</h2>
            </span>
            <button
              className="btn ghost small pack-remove"
              onClick={() => {
                if (confirm(t('packs.removeConfirm', { name: pack.name }))) onRemovePack(pack)
              }}
            >
              {t('packs.remove')}
            </button>
          </div>
          <p className="muted">
            {t('packs.by', { author: pack.author })}
            {pack.description ? ` - ${pack.description}` : ''}
          </p>
          <div className="level-buttons">
            {pack.levels.map((l, i) => {
              const s = progress.stars[l.id] ?? 0
              return (
                <button key={l.id} className={`level-btn ${s ? 'solved' : ''}`} onClick={() => onOpen(l.id)} title={t('level.name', { n: i + 1 })}>
                  <span className="lvl-num">{i + 1}</span>
                  <LevelStars n={s} />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <div className="pack-load">
        <button className="btn ghost" onClick={onImport}>
          {t('packs.load')}
        </button>
      </div>

      <footer className="map-footer">
        <div className="credits">
          <div>
            {t('footer.madeBy')} <b>{AUTHOR}</b> ·{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {t('footer.source')}
            </a>
          </div>
          <div>{t('footer.inspired')}</div>
        </div>
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

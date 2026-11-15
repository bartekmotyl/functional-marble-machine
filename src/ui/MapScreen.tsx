import { ALL_LEVELS, CHAPTERS } from '../game/levels'
import type { Progress } from '../game/progress'
import { Marble } from './Marble'

interface Props {
  progress: Progress
  onOpen: (id: string) => void
  onUnlockAll: (v: boolean) => void
  onReset: () => void
}

export function isUnlocked(progress: Progress, id: string): boolean {
  if (progress.unlockAll) return true
  const idx = ALL_LEVELS.findIndex((l) => l.id === id)
  return idx === 0 || (progress.stars[ALL_LEVELS[idx - 1].id] ?? 0) > 0
}

export function MapScreen({ progress, onOpen, onUnlockAll, onReset }: Props) {
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0)
  const next = ALL_LEVELS.find((l) => !progress.stars[l.id] && isUnlocked(progress, l.id))
  let n = 0
  return (
    <div className="map-screen">
      <header className="hero">
        <div className="hero-marbles" aria-hidden>
          <Marble marble={{ color: 'red', size: 'big', pattern: 'plain', number: 0 }} />
          <Marble marble={{ color: 'yellow', size: 'medium', pattern: 'striped', number: 0 }} />
          <Marble marble={{ color: 'blue', size: 'big', pattern: 'dotted', number: 0 }} />
          <Marble marble={{ color: 'green', size: 'small', pattern: 'plain', number: 0 }} />
          <Marble marble={{ color: 'purple', size: 'medium', pattern: 'striped', number: 0 }} />
        </div>
        <h1>Marble Machine</h1>
        <p>Build machines that sort, paint and count marbles - with code!</p>
        <div className="hero-stats">
          ⭐ {totalStars} / {ALL_LEVELS.length * 2}
          {next && (
            <button className="btn run" onClick={() => onOpen(next.id)}>
              ▶ {totalStars === 0 ? 'Start playing' : 'Continue'}
            </button>
          )}
        </div>
      </header>

      {CHAPTERS.map((ch) => (
        <section key={ch.id} className="chapter">
          <h2>
            <span className="chapter-emoji">{ch.emoji}</span> {ch.title}
          </h2>
          <p className="muted">{ch.blurb}</p>
          <div className="level-buttons">
            {ch.levels.map((l) => {
              n++
              const unlocked = isUnlocked(progress, l.id)
              const s = progress.stars[l.id] ?? 0
              return (
                <button
                  key={l.id}
                  className={`level-btn ${s ? 'solved' : ''} ${unlocked ? '' : 'locked'} ${next?.id === l.id ? 'next' : ''}`}
                  disabled={!unlocked}
                  onClick={() => onOpen(l.id)}
                  title={unlocked ? l.title : 'Solve the previous level first'}
                >
                  <span className="lvl-num">{unlocked ? n : '🔒'}</span>
                  <span className="lvl-title">{l.title}</span>
                  <span className="lvl-stars">{s >= 1 ? '⭐' : '☆'}{s >= 2 ? '⭐' : '☆'}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <footer className="map-footer">
        <label>
          <input type="checkbox" checked={!!progress.unlockAll} onChange={(e) => onUnlockAll(e.target.checked)} /> Unlock all levels
          (for parents & teachers)
        </label>
        <button
          className="btn ghost small"
          onClick={() => {
            if (confirm('Erase all progress and saved programs?')) onReset()
          }}
        >
          Reset progress
        </button>
      </footer>
    </div>
  )
}

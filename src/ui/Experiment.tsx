import { useMemo, useState } from 'react'
import { Picker, type Option } from '../blocks/Picker'
import { COST, expectedFor } from '../game/check'
import type { Level } from '../game/levels'
import { t } from '../i18n'
import { word } from '../i18n/words'
import type { Marble as M } from '../lang/marble'
import { Marble, OutputView } from './Marble'

const MAX_MARBLES = 12

interface Props {
  level: Level
  /** the marbles of the example in the machine - the lab starts with a copy of them */
  start: M[]
  showNumber: boolean
  open: boolean
  /** the player opens the lab (costs a star the first time) */
  onOpen: () => void
  /** put the row in the machine as an extra example */
  onAdd: (input: M[]) => void
}

const stars = (n: number) => '⭐'.repeat(n)

/**
 * The marble lab: build any row of marbles and see what the level's rule makes of it.
 * A paid hint that leaves the rule for the player to find.
 */
export function Experiment({ level, start, showNumber, open, onOpen, onAdd }: Props) {
  const [row, setRow] = useState<M[] | null>(null)
  const [sel, setSel] = useState(0)
  const marbles = row ?? start
  const f = level.features
  const expected = useMemo(() => expectedFor(level, marbles), [level, marbles])

  if (!open) {
    return (
      <div className="lab-card closed">
        <div className="lab-title">{t('lab.title')}</div>
        <div className="lab-text">{t('lab.pitch', { stars: stars(COST.experiment) })}</div>
        <button className="btn ghost small" onClick={onOpen}>
          {t('lab.open')} <span className="cost">{t('ui.costs', { stars: stars(COST.experiment) })}</span>
        </button>
      </div>
    )
  }

  const set = (next: M[]) => {
    setRow(next)
    setSel((s) => Math.min(s, next.length - 1))
  }
  const change = (patch: Partial<M>) => set(marbles.map((m, i) => (i === sel ? { ...m, ...patch } : m)))
  const current = marbles[sel]

  const opts = <T extends string>(list: readonly T[], prop: 'color' | 'size' | 'pattern'): Option<T>[] =>
    list.map((v) => ({
      value: v,
      label: (
        <span className="opt-with-icon">
          <span className="mini" aria-hidden>
            <Marble marble={{ ...current, [prop]: v }} title="" />
          </span>
          {word(v)}
        </span>
      ),
    }))
  const numbers = f.numbers ? Array.from({ length: f.numbers[1] - f.numbers[0] + 1 }, (_, i) => f.numbers![0] + i) : []

  return (
    <div className="lab-card">
      <div className="lab-title">{t('lab.title')}</div>
      <div className="lab-text">{t('lab.how')}</div>
      <div className="lab-row" role="listbox" aria-label={t('lab.yourMarbles')}>
        {marbles.map((m, i) => (
          <button
            key={i}
            className={`lab-marble ${i === sel ? 'on' : ''}`}
            onClick={() => setSel(i)}
            role="option"
            aria-selected={i === sel}
          >
            <Marble marble={m} showNumber={showNumber} />
          </button>
        ))}
        {marbles.length < MAX_MARBLES && (
          <button
            className="icon-btn lab-add"
            title={t('lab.addMarble')}
            onClick={() => {
              set([...marbles, { ...(current ?? start[0]) }])
              setSel(marbles.length)
            }}
          >
            +
          </button>
        )}
      </div>
      {current && (
        <div className="lab-edit">
          <Picker value={current.color} options={opts(f.colors, 'color')} onPick={(color) => change({ color })} />
          {f.sizes && <Picker value={current.size} options={opts(f.sizes, 'size')} onPick={(size) => change({ size })} />}
          {f.patterns && <Picker value={current.pattern} options={opts(f.patterns, 'pattern')} onPick={(pattern) => change({ pattern })} />}
          {f.numbers && (
            <Picker
              value={current.number}
              grid
              options={numbers.map((n) => ({ value: n, label: String(n), className: 'w-num' }))}
              onPick={(number) => change({ number })}
            />
          )}
          {marbles.length > 1 && (
            <button className="icon-btn remove" title={t('lab.removeMarble')} onClick={() => set(marbles.filter((_, i) => i !== sel))}>
              ✕
            </button>
          )}
        </div>
      )}
      <div className="io-box out lab-out">
        <div className="io-label">{t('lab.comesOut')}</div>
        {expected.error ? (
          <div className="lab-error">💥 {expected.error.code ? t(`errors.${expected.error.code}`) : expected.error.message}</div>
        ) : (
          <OutputView output={expected.output!} showNumber={showNumber} />
        )}
      </div>
      <div className="lab-actions">
        <button className="btn ghost small" disabled={!!expected.error} onClick={() => onAdd(marbles.map((m) => ({ ...m })))}>
          {t('lab.toMachine')}
        </button>
        {row && (
          <button className="btn ghost small" onClick={() => setRow(null)}>
            {t('lab.reset')}
          </button>
        )}
      </div>
    </div>
  )
}

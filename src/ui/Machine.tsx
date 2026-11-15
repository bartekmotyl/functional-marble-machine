import type { CSSProperties, ReactNode } from 'react'
import type { Stage } from '../lang/interpreter'
import type { Marble as M, Output } from '../lang/marble'
import type { LangError } from '../lang/parser'
import type { Block } from '../blocks/model'
import { Marble, OutputView } from './Marble'
import { Explain } from './Explain'

export const STAGE_DELAY = 0.9 // seconds between stages in the animation

/** One position of the step-by-step debugger. stage -1 = before start, stage = stages.length = the end. */
export interface Tick {
  stage: number
  index: number
}

export function buildTicks(stages: Stage[]): Tick[] {
  const ticks: Tick[] = [{ stage: -1, index: 0 }]
  stages.forEach((s, si) => {
    if (s.input.length === 0) ticks.push({ stage: si, index: -1 })
    s.input.forEach((_, i) => ticks.push({ stage: si, index: i }))
  })
  ticks.push({ stage: stages.length, index: 0 })
  return ticks
}

interface SlotProps {
  m: M
  i: number
  showNumber?: boolean
  cls?: string
  badge?: ReactNode
  tip?: ReactNode
  onClick?: () => void
}

function Slot({ m, i, showNumber, cls = '', badge, tip, onClick }: SlotProps) {
  return (
    <div
      className={`slot ${cls} ${onClick ? 'clickable' : ''}`}
      style={{ '--i': i } as CSSProperties}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <Marble marble={m} showNumber={showNumber} title={tip ? '' : undefined} />
      {cls.includes('dropped') && <span className="x-mark">✕</span>}
      {cls.includes('changed') && <span className="sparkle">✨</span>}
      {cls.includes('current') && <span className="pointer">▼</span>}
      {badge !== undefined && <span className="acc-badge">{badge}</span>}
      {tip && <div className="tip">{tip}</div>}
    </div>
  )
}

interface RowProps {
  stage: Stage
  block: Block
  si: number
  showNumber?: boolean
  /** how many marbles of this stage have been processed (stepping mode); undefined = all */
  done?: number
  current?: number
  onPick?: (stage: number, index: number) => void
}

function StageRow({ stage, block, si, showNumber, done, current, onPick }: RowProps) {
  const n = done ?? stage.input.length
  const tip = (i: number) => (done === undefined ? <Explain block={block} stage={stage} index={i} /> : undefined)
  const pick = (i: number) => (onPick ? () => onPick(si, i) : undefined)
  const state = (i: number) => (i === current ? 'current' : i >= n ? 'pending' : '')

  if (stage.input.length === 0) return <div className="marble-row"><span className="empty">no marbles reach this step</span></div>

  if (stage.kind === 'filter')
    return (
      <div className="marble-row">
        {stage.input.map((m, i) => (
          <Slot key={i} m={m} i={i} showNumber={showNumber} tip={tip(i)} onClick={pick(i)}
            cls={`${i < n ? (stage.kept[i] ? 'kept' : 'dropped') : ''} ${state(i)}`} />
        ))}
      </div>
    )
  if (stage.kind === 'map')
    return (
      <div className="marble-row">
        {stage.input.map((m, i) => (
          <Slot key={i} m={i < n ? stage.output[i] : m} i={i} showNumber={showNumber} tip={tip(i)} onClick={pick(i)}
            cls={`${i < n ? (stage.changed[i] ? 'changed' : 'same') : ''} ${state(i)}`} />
        ))}
      </div>
    )
  return (
    <div className="marble-row reduce-row">
      <div className="slot start" style={{ '--i': 0 } as CSSProperties}>
        <span className="start-label">{stage.label} starts at</span>
        <span className="acc-badge big">{stage.start ?? '–'}</span>
      </div>
      {stage.input.map((m, i) => (
        <Slot key={i} m={m} i={i + 1} showNumber={showNumber} tip={tip(i)} onClick={pick(i)}
          badge={i < n ? stage.accs[i] : undefined} cls={state(i)} />
      ))}
      {n === stage.input.length && (
        <div className="slot result-slot" style={{ '--i': stage.input.length + 1 } as CSSProperties}>
          <span className="arrow">→</span>
          <div className="number-bubble">{stage.result}</div>
        </div>
      )}
    </div>
  )
}

const KIND_LABEL = { filter: '🚪 filter', map: '🎨 map', reduce: '🧮 reduce' }

interface Props {
  input: M[]
  stages: Stage[]
  blocks: Block[]
  actual?: Output
  expected: Output
  error?: LangError
  showNumber?: boolean
  /** null = play the whole animation; otherwise show this debugger position */
  tick?: Tick | null
  onPick?: (stage: number, index: number) => void
}

export function Machine({ input, stages, blocks, actual, expected, error, showNumber, tick, onPick }: Props) {
  const stepping = !!tick
  const lastStage = stepping ? tick!.stage : stages.length
  const atEnd = !stepping || tick!.stage >= stages.length
  const pass = actual !== undefined && !error && JSON.stringify(actual) === JSON.stringify(expected)
  const delay = (k: number) => ({ '--d': stepping ? '0s' : `${k * STAGE_DELAY}s` }) as CSSProperties

  return (
    <div className={`pipeline ${stepping ? 'stepping' : ''}`}>
      <div className={`stage ${stepping && tick!.stage === -1 ? 'focus' : ''}`} style={delay(0)}>
        <div className="stage-label">
          <span className="kind in">📥 in</span>
        </div>
        <div className="marble-row">
          {input.map((m, i) => (
            <Slot key={i} m={m} i={i} showNumber={showNumber} />
          ))}
        </div>
      </div>
      {stages.map((s, si) =>
        si > lastStage ? null : (
          <div key={si} className={`stage ${stepping && si === tick!.stage ? 'focus' : ''}`} style={delay(si + 1)}>
            <div className="pipe" />
            <div className="stage-label">
              <span className={`kind ${s.kind}`}>{KIND_LABEL[s.kind]}</span>
              <span className="step-ref">step {si + 1}</span>
              {!stepping && <span className="tip-hint">hover or click a marble to see why</span>}
            </div>
            <StageRow
              stage={s}
              block={blocks[si]}
              si={si}
              showNumber={showNumber}
              done={stepping && si === tick!.stage ? tick!.index + 1 : undefined}
              current={stepping && si === tick!.stage ? tick!.index : undefined}
              onPick={onPick}
            />
          </div>
        ),
      )}
      {atEnd &&
        (error ? (
          <div className="stage" style={delay(stages.length + 1)}>
            <div className="pipe" />
            <div className="run-error">
              💥 Step {error.line}: {error.message}
            </div>
          </div>
        ) : (
          <div className={`stage final ${pass ? 'pass' : 'fail'}`} style={delay(stages.length + 1)}>
            <div className="pipe" />
            <div className="compare">
              <div className="io-box out">
                <div className="io-label">Your machine made</div>
                {actual !== undefined && <OutputView output={actual} showNumber={showNumber} />}
              </div>
              <div className="io-box expected">
                <div className="io-label">Expected</div>
                <OutputView output={expected} showNumber={showNumber} />
              </div>
              <div className="verdict">{pass ? '✅ Match!' : '❌ Not the same'}</div>
            </div>
          </div>
        ))}
    </div>
  )
}

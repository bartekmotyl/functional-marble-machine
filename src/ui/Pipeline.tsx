import type { CSSProperties, ReactNode } from 'react'
import type { Stage } from '../lang/interpreter'
import type { Marble as M } from '../lang/marble'
import type { CaseResult } from '../game/check'
import { Marble, OutputView } from './Marble'

const STAGE_DELAY = 0.9 // seconds between stages

function Slot({ m, i, showNumber, cls, badge }: { m: M; i: number; showNumber?: boolean; cls?: string; badge?: ReactNode }) {
  return (
    <div className={`slot ${cls ?? ''}`} style={{ '--i': i } as CSSProperties}>
      <Marble marble={m} showNumber={showNumber} />
      {cls === 'dropped' && <span className="x-mark">✕</span>}
      {cls === 'changed' && <span className="sparkle">✨</span>}
      {badge !== undefined && <span className="acc-badge">{badge}</span>}
    </div>
  )
}

function StageBody({ stage, showNumber }: { stage: Stage; showNumber?: boolean }) {
  switch (stage.kind) {
    case 'filter':
      return (
        <div className="marble-row">
          {stage.input.length === 0 && <span className="empty">no marbles</span>}
          {stage.input.map((m, i) => (
            <Slot key={i} m={m} i={i} showNumber={showNumber} cls={stage.kept[i] ? 'kept' : 'dropped'} />
          ))}
        </div>
      )
    case 'map':
      return (
        <div className="marble-row">
          {stage.output.length === 0 && <span className="empty">no marbles</span>}
          {stage.output.map((m, i) => (
            <Slot key={i} m={m} i={i} showNumber={showNumber} cls={stage.changed[i] ? 'changed' : 'same'} />
          ))}
        </div>
      )
    case 'reduce':
      return (
        <div className="marble-row reduce-row">
          <div className="slot start" style={{ '--i': 0 } as CSSProperties}>
            <span className="start-label">{stage.label} starts at</span>
            <span className="acc-badge big">{stage.start ?? '?'}</span>
          </div>
          {stage.input.map((m, i) => (
            <Slot key={i} m={m} i={i + 1} showNumber={showNumber} badge={stage.accs[i]} />
          ))}
          <div className="slot result-slot" style={{ '--i': stage.input.length + 1 } as CSSProperties}>
            <span className="arrow">→</span>
            <div className="number-bubble">{stage.result}</div>
          </div>
        </div>
      )
  }
}

const KIND_LABEL = { filter: '🚪 filter', map: '🎨 map', reduce: '🧮 reduce' }

interface Props {
  result: CaseResult
  sourceLines: string[]
  showNumber?: boolean
  onHoverLine?: (line: number | null) => void
}

export function Pipeline({ result, sourceLines, showNumber, onHoverLine }: Props) {
  const stages = result.stages ?? []
  const errorStageIndex = stages.length
  const finalDelay = (stages.length + 1) * STAGE_DELAY
  return (
    <div className="pipeline">
      <div className="stage" style={{ '--d': '0s' } as CSSProperties}>
        <div className="stage-label">
          <span className="kind in">📥 in</span>
        </div>
        <div className="marble-row">
          {result.input.map((m, i) => (
            <Slot key={i} m={m} i={i} showNumber={showNumber} />
          ))}
        </div>
      </div>
      {stages.map((s, idx) => (
        <div
          key={idx}
          className="stage"
          style={{ '--d': `${(idx + 1) * STAGE_DELAY}s` } as CSSProperties}
          onMouseEnter={() => onHoverLine?.(s.line)}
          onMouseLeave={() => onHoverLine?.(null)}
        >
          <div className="pipe" />
          <div className="stage-label">
            <span className={`kind ${s.kind}`}>{KIND_LABEL[s.kind]}</span>
            <code>
              line {s.line}: {sourceLines[s.line - 1]?.trim()}
            </code>
          </div>
          <StageBody stage={s} showNumber={showNumber} />
        </div>
      ))}
      {result.error ? (
        <div className="stage" style={{ '--d': `${(errorStageIndex + 1) * STAGE_DELAY}s` } as CSSProperties}>
          <div className="pipe" />
          <div className="run-error">
            💥 Line {result.error.line}: {result.error.message}
          </div>
        </div>
      ) : (
        <div className={`stage final ${result.pass ? 'pass' : 'fail'}`} style={{ '--d': `${finalDelay}s` } as CSSProperties}>
          <div className="pipe" />
          <div className="compare">
            <div>
              <div className="compare-title">Your machine made</div>
              <OutputView output={result.actual!} showNumber={showNumber} />
            </div>
            <div>
              <div className="compare-title">Expected</div>
              <OutputView output={result.expected} showNumber={showNumber} />
            </div>
            <div className="verdict">{result.pass ? '✅ Match!' : '❌ Not the same'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

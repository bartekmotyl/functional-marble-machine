import type { CSSProperties } from 'react'
import { COLORS, type Marble as M, type Output } from '../lang/marble'
import { t } from '../i18n'
import { word } from '../i18n/words'

export const COLOR_HEX: Record<string, [string, string, string]> = {
  // light, base, dark
  red: ['#ff9a8f', '#ef4136', '#9c1c14'],
  blue: ['#9fd3ff', '#2f8ff0', '#164f99'],
  green: ['#a8f0a0', '#3cb54a', '#1d6b27'],
  yellow: ['#fff3a3', '#ffc61a', '#b07d00'],
  purple: ['#e2b3ff', '#9b45d6', '#561f80'],
}

const RADIUS = { small: 13, medium: 18, big: 24 }
const BOX = 54

/** Put this once on the page: gradients and patterns shared by all marbles. */
export function MarbleDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {COLORS.map((c) => (
          <radialGradient key={c} id={`grad-${c}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={COLOR_HEX[c][0]} />
            <stop offset="45%" stopColor={COLOR_HEX[c][1]} />
            <stop offset="100%" stopColor={COLOR_HEX[c][2]} />
          </radialGradient>
        ))}
        <pattern id="pat-striped" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="4" height="9" fill="white" fillOpacity="0.55" />
        </pattern>
        <pattern id="pat-dotted" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="4.5" cy="4.5" r="2.1" fill="white" fillOpacity="0.75" />
        </pattern>
      </defs>
    </svg>
  )
}

interface Props {
  marble: M
  showNumber?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

export function Marble({ marble, showNumber, className, style, title }: Props) {
  const r = RADIUS[marble.size]
  const c = BOX / 2
  const label = t(showNumber ? 'marble.labelNumber' : 'marble.label', {
    color: word(marble.color),
    size: word(marble.size),
    pattern: word(marble.pattern),
    number: marble.number,
  })
  return (
    <svg
      className={`marble ${className ?? ''}`}
      style={style}
      width={BOX}
      height={BOX}
      viewBox={`0 0 ${BOX} ${BOX}`}
      role="img"
      aria-label={label}
    >
      <title>{title ?? label}</title>
      <ellipse cx={c} cy={c + r - 1} rx={r * 0.8} ry={r * 0.18} fill="black" opacity="0.18" />
      <circle cx={c} cy={c} r={r} fill={`url(#grad-${marble.color})`} />
      {marble.pattern !== 'plain' && <circle cx={c} cy={c} r={r} fill={`url(#pat-${marble.pattern})`} />}
      <circle cx={c} cy={c} r={r - 0.5} fill="none" stroke={COLOR_HEX[marble.color][2]} strokeOpacity="0.5" />
      <ellipse cx={c - r * 0.35} cy={c - r * 0.42} rx={r * 0.32} ry={r * 0.2} fill="white" opacity="0.7" transform={`rotate(-30 ${c - r * 0.35} ${c - r * 0.42})`} />
      {showNumber && (
        <text
          x={c}
          y={c + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          className="marble-num"
          fontSize={marble.size === 'small' ? 12 : marble.size === 'medium' ? 15 : 18}
        >
          {marble.number}
        </text>
      )}
    </svg>
  )
}

export function MarbleRow({ marbles, showNumber, empty }: { marbles: M[]; showNumber?: boolean; empty?: string }) {
  if (marbles.length === 0) return <div className="marble-row empty">{empty ?? t('machine.noMarbles')}</div>
  return (
    <div className="marble-row">
      {marbles.map((m, i) => (
        <Marble key={i} marble={m} showNumber={showNumber} />
      ))}
    </div>
  )
}

export function OutputView({ output, showNumber }: { output: Output; showNumber?: boolean }) {
  if (typeof output === 'number') return <div className="number-bubble">{output}</div>
  return <MarbleRow marbles={output} showNumber={showNumber} />
}

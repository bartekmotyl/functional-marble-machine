import { useImperativeHandle, useRef, type ReactNode, type Ref } from 'react'
import { COLORS } from '../lang/marble'

const COMMANDS = new Set(['filter', 'map', 'reduce'])
const REDUCERS = new Set(['count', 'sum', 'max', 'min', 'from'])
const LOGIC = new Set(['is', 'not', 'and', 'or', 'if'])
const PROPS = new Set(['color', 'size', 'pattern', 'number', 'total'])
const VALUES = new Set(['small', 'medium', 'big', 'plain', 'striped', 'dotted', 'even', 'odd'])
const COLOR_SET = new Set<string>(COLORS)

const TOKEN = /(#.*$)|(\d+)|([A-Za-z_]\w*)|(->|==|!=|<=|>=|[<>=+\-*/%(),:])|(\s+)|(.)/g

function classFor(word: string): string {
  const w = word.toLowerCase()
  if (COMMANDS.has(w)) return 'tk-cmd'
  if (REDUCERS.has(w)) return 'tk-red'
  if (LOGIC.has(w)) return 'tk-logic'
  if (PROPS.has(w)) return 'tk-prop'
  if (COLOR_SET.has(w)) return `tk-color c-${w}`
  if (VALUES.has(w)) return 'tk-value'
  return 'tk-unknown'
}

function highlightLine(line: string) {
  const out: ReactNode[] = []
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  let i = 0
  while ((m = TOKEN.exec(line)) && m[0].length) {
    const [text, comment, num, word, sym] = m
    const cls = comment ? 'tk-comment' : num ? 'tk-num' : word ? classFor(word) : sym ? 'tk-sym' : ''
    out.push(cls ? <span key={i++} className={cls}>{text}</span> : text)
  }
  return out
}

export interface EditorHandle {
  insert: (word: string) => void
  focus: () => void
}

interface Props {
  value: string
  onChange: (v: string) => void
  onRun: () => void
  error?: { line: number; col: number; endCol: number } | null
  activeLine?: number | null
  handle?: Ref<EditorHandle>
}

const BLOCK_WORDS = new Set(['filter', 'map', 'reduce'])

export function Editor({ value, onChange, onRun, error, activeLine, handle }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const lines = value.split('\n')
  const rows = Math.max(lines.length, 5)
  const longest = Math.max(30, ...lines.map((l) => l.length + 2))

  useImperativeHandle(handle, () => ({
    focus: () => ta.current?.focus(),
    insert: (word: string) => {
      const el = ta.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = value.slice(0, start)
      const after = value.slice(end)
      const lineBefore = before.slice(before.lastIndexOf('\n') + 1)
      let text = word
      if (BLOCK_WORDS.has(word) && lineBefore.trim() !== '') text = '\n' + word
      else if (before.length && !/[\s(]$/.test(before) && word !== ',' && word !== ')') text = ' ' + text
      if (!/^[ \n]/.test(after) && word !== '(') text += ' '
      const next = before + text + after
      onChange(next)
      const pos = start + text.length
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
  }))

  return (
    <div className="editor" onClick={() => ta.current?.focus()}>
      <div className="gutter" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`gutter-line ${error?.line === i + 1 ? 'err' : ''} ${activeLine === i + 1 ? 'active' : ''}`}>
            {i + 1}
          </div>
        ))}
      </div>
      <div className="code-area" style={{ minWidth: `${longest}ch` }}>
        {activeLine ? <div className="line-active" style={{ top: `calc(${activeLine - 1} * var(--lh))` }} /> : null}
        {error ? <div className="line-error" style={{ top: `calc(${error.line - 1} * var(--lh))` }} /> : null}
        {error ? (
          <div
            className="squiggle"
            style={{
              top: `calc(${error.line} * var(--lh) - 6px)`,
              left: `${error.col}ch`,
              width: `${Math.max(1, error.endCol - error.col)}ch`,
            }}
          />
        ) : null}
        <pre className="highlight" aria-hidden>
          {lines.map((l, i) => (
            <div key={i} className="hl-line">
              {highlightLine(l)}
              {'​'}
            </div>
          ))}
        </pre>
        <textarea
          ref={ta}
          className="code-input"
          value={value}
          rows={rows}
          spellCheck={false}
          wrap="off"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Your program"
          placeholder="Write your program here..."
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              onRun()
            }
          }}
        />
      </div>
    </div>
  )
}

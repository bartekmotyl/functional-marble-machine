import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { checkSolution, getTests, parCount, type CheckResult } from '../game/check'
import { conceptsUpTo, CHAPTERS, type Level } from '../game/levels'
import { CONCEPT_DOCS, wordsFor } from '../game/concepts'
import { Editor, type EditorHandle } from './Editor'
import { MarbleRow, OutputView } from './Marble'
import { Pipeline } from './Pipeline'
import { RichText } from './RichText'

interface Props {
  level: Level
  levelNumber: number
  savedCode?: string
  stars: number
  onSaveCode: (code: string) => void
  onSolved: (stars: number) => void
  onBack: () => void
  onNext?: () => void
}

type Message = { tone: 'error' | 'warn' | 'info' | 'good'; text: string }

const STEP_NAMES: Record<string, string> = {
  fold: 'reduce from',
  filter: 'filter',
  map: 'map',
  count: 'reduce count',
  sum: 'reduce sum',
  max: 'reduce max',
  min: 'reduce min',
}

export function LevelScreen({ level, levelNumber, savedCode, stars, onSaveCode, onSolved, onBack, onNext }: Props) {
  const [code, setCode] = useState(savedCode ?? level.starter ?? '')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [runId, setRunId] = useState(0)
  const [selected, setSelected] = useState(0)
  const [revealed, setRevealed] = useState<number[]>([]) // hidden case indices shown to the player
  const [hints, setHints] = useState(0)
  const [message, setMessage] = useState<Message | null>(null)
  const [showError, setShowError] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)
  const [hoverLine, setHoverLine] = useState<number | null>(null)
  const [spellbook, setSpellbook] = useState(false)
  const [introOpen, setIntroOpen] = useState(true)
  const editor = useRef<EditorHandle>(null)

  const tests = getTests(level)
  const showNumber = !!level.features.numbers
  const concepts = useMemo(() => conceptsUpTo(level.id), [level.id])
  const words = useMemo(() => wordsFor(concepts), [concepts])
  const par = useMemo(() => parCount(level), [level])
  const chapter = CHAPTERS.find((c) => c.levels.includes(level))!

  // Cards on the left: visible examples + any secret tests that were revealed.
  const cards = [
    ...tests.visible.map((tc, i) => ({ tc, label: `Example ${i + 1}`, caseIndex: i })),
    ...revealed.map((h) => ({ tc: tests.hidden[h], label: '🕵️ Secret test', caseIndex: tests.visible.length + h })),
  ]

  function changeCode(v: string) {
    setCode(v)
    setShowError(false)
    onSaveCode(v)
  }

  function runIt() {
    const r = checkSolution(level, code)
    setResult(r)
    setRunId((x) => x + 1)
    setShowError(true)
    setIntroOpen(false)
    if (r.parseError) {
      setMessage({ tone: 'error', text: `Line ${r.parseError.line}: ${r.parseError.message}` })
      return
    }
    if (code.trim() === '') {
      setMessage({ tone: 'info', text: 'Your program is empty, so the marbles just roll straight through. Write a line of code first!' })
    }
    const visibleCount = tests.visible.length
    const shownCaseIndices = cards.map((c) => c.caseIndex)
    const firstShownFail = shownCaseIndices.find((ci) => !r.cases[ci].pass)
    if (firstShownFail !== undefined) {
      setSelected(shownCaseIndices.indexOf(firstShownFail))
      const c = r.cases[firstShownFail]
      if (code.trim() !== '')
        setMessage(
          c.error
            ? { tone: 'error', text: `Oops! Line ${c.error.line}: ${c.error.message}` }
            : { tone: 'warn', text: 'Not quite yet! Watch the machine below to see where it goes wrong.' },
        )
      return
    }
    const hiddenFail = r.cases.findIndex((c, i) => i >= visibleCount && !c.pass)
    if (hiddenFail >= 0) {
      const h = hiddenFail - visibleCount
      setRevealed((rv) => [...rv, h])
      setSelected(cards.length) // the newly revealed card
      setMessage({
        tone: 'warn',
        text: 'Your program works for the examples... but a secret test found a problem! Look at the new secret test.',
      })
      return
    }
    if (r.missing) {
      setSelected(0)
      setMessage({
        tone: 'info',
        text: `It works! But in this level you have to use "${r.missing.map((m) => STEP_NAMES[m]).join('", "')}". Try again!`,
      })
      return
    }
    const earned = r.stepCount <= par ? 2 : 1
    setMessage({ tone: 'good', text: 'It works! 🎉' })
    setSelected(0)
    onSolved(earned)
    // let the marble machine finish its animation before celebrating
    const stages = r.cases[0]?.stages ?? []
    const last = stages[stages.length - 1]
    const reduceExtra = last?.kind === 'reduce' ? last.input.length * 260 : 0
    setTimeout(() => setSuccess(earned), (stages.length + 1) * 900 + 900 + reduceExtra)
  }

  const selectedCard = cards[Math.min(selected, cards.length - 1)]
  const caseResult = result && !result.parseError ? result.cases[selectedCard.caseIndex] : null
  const errorPos = showError
    ? result?.parseError ?? (caseResult?.error ? { line: caseResult.error.line, col: 0, endCol: code.split('\n')[caseResult.error.line - 1]?.length ?? 1 } : null)
    : null

  return (
    <div className="level-screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          ← Map
        </button>
        <div className="crumbs">
          <span className="chapter-name">
            {chapter.emoji} {chapter.title}
          </span>
          <span className="level-name">
            Level {levelNumber}: {level.title}
          </span>
        </div>
        <div className="stars" title="⭐ solved, ⭐⭐ solved with few lines">
          {stars >= 1 ? '⭐' : '☆'}
          {stars >= 2 ? '⭐' : '☆'}
        </div>
      </header>

      <div className="level-grid">
        <section className="panel task">
          <h1 className="goal">{level.goal}</h1>
          {level.intro && (
            <details className="intro" open={introOpen} onToggle={(e) => setIntroOpen((e.target as HTMLDetailsElement).open)}>
              <summary>📖 How it works</summary>
              <RichText text={level.intro} />
            </details>
          )}
          <div className="examples">
            {cards.map((c, i) => {
              const cr = result && !result.parseError ? result.cases[c.caseIndex] : null
              return (
                <button
                  key={i}
                  className={`example ${i === selected ? 'selected' : ''} ${cr ? (cr.pass ? 'pass' : 'fail') : ''}`}
                  onClick={() => setSelected(i)}
                >
                  <div className="example-head">
                    <span>{c.label}</span>
                    {cr && <span>{cr.pass ? '✅' : '❌'}</span>}
                  </div>
                  <div className="example-body">
                    <MarbleRow marbles={c.tc.input} showNumber={showNumber} />
                    <span className="big-arrow">➜</span>
                    <OutputView output={c.tc.expected} showNumber={showNumber} />
                  </div>
                </button>
              )
            })}
          </div>
          <div className="hints">
            {level.hints.slice(0, hints).map((h, i) => (
              <div key={i} className="hint">
                💡 {h.includes('\n') || /^(filter|map|reduce)\b/.test(h) ? <pre className="code-sample">{h}</pre> : h}
              </div>
            ))}
            {hints < level.hints.length && (
              <button className="btn ghost small" onClick={() => setHints(hints + 1)}>
                💡 {hints === 0 ? 'Need a hint?' : 'Another hint'}
              </button>
            )}
          </div>
        </section>

        <section className="panel workbench">
          <div className="editor-head">
            <span>🖥️ Your program</span>
            <div className="editor-actions">
              <button className="btn ghost small" onClick={() => setSpellbook(true)}>
                📕 Spellbook
              </button>
              <button
                className="btn ghost small"
                onClick={() => {
                  if (confirm('Start this level again from scratch?')) changeCode(level.starter ?? '')
                }}
              >
                ↺ Reset
              </button>
            </div>
          </div>
          <Editor value={code} onChange={changeCode} onRun={runIt} error={errorPos} activeLine={hoverLine} handle={editor} />
          <div className="chips">
            {words.code.map((w) => (
              <button key={w} className="chip code" onClick={() => editor.current?.insert(w)}>
                {w}
              </button>
            ))}
            {words.values.map((w) => (
              <button key={w} className={`chip value c-${w}`} onClick={() => editor.current?.insert(w)}>
                {w}
              </button>
            ))}
          </div>
          <div className="run-row">
            <button className="btn run" onClick={runIt}>
              ▶ Run
            </button>
            <span className="kbd-hint">or press Ctrl + Enter</span>
          </div>
          {message && <div className={`message ${message.tone}`}>{message.text}</div>}

          {caseResult ? (
            <div className="machine">
              <div className="machine-title">
                <span>
                  ⚙️ The machine working on <strong>{selectedCard.label}</strong>
                </span>
                <button className="btn ghost small" onClick={() => setRunId((x) => x + 1)}>
                  ⟳ Replay
                </button>
              </div>
              <Pipeline key={`${runId}-${selected}`} result={caseResult} sourceLines={code.split('\n')} showNumber={showNumber} onHoverLine={setHoverLine} />
            </div>
          ) : (
            !result?.parseError && (
              <div className="machine idle">
                Press <strong>▶ Run</strong> to send the marbles of {selectedCard.label} through your machine.
              </div>
            )
          )}
        </section>
      </div>

      {success !== null && (
        <div className="modal-backdrop" onClick={() => setSuccess(null)}>
          <div className="modal success" onClick={(e) => e.stopPropagation()}>
            <div className="confetti" aria-hidden>
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
            <h2>Level complete!</h2>
            <div className="big-stars">
              <span className="on">⭐</span>
              <span className={success >= 2 ? 'on' : 'off'}>⭐</span>
            </div>
            <p>
              {success >= 2
                ? `Perfect! You used only ${result?.stepCount} line${result?.stepCount === 1 ? '' : 's'}.`
                : `Great job! Bonus star: can you solve it with ${par} line${par === 1 ? '' : 's'} or fewer?`}
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setSuccess(null)}>
                Stay here
              </button>
              {onNext ? (
                <button className="btn run" onClick={onNext}>
                  Next level ➜
                </button>
              ) : (
                <button className="btn run" onClick={onBack}>
                  🏆 You finished them all!
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {spellbook && (
        <div className="modal-backdrop" onClick={() => setSpellbook(false)}>
          <div className="modal spellbook" onClick={(e) => e.stopPropagation()}>
            <h2>📕 Spellbook</h2>
            <p className="muted">Everything you have learned so far:</p>
            <div className="spells">
              {concepts.map((c) => (
                <div key={c} className="spell">
                  <h3>{CONCEPT_DOCS[c].title}</h3>
                  <pre className="code-sample">{CONCEPT_DOCS[c].code}</pre>
                  <p>{CONCEPT_DOCS[c].text}</p>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn run" onClick={() => setSpellbook(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

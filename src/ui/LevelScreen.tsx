import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { checkSolution, getTests, runCase, starsFor, type CheckResult } from '../game/check'
import { conceptsUpTo, CHAPTERS, type Level } from '../game/levels'
import { CONCEPT_DOCS } from '../game/concepts'
import { BlockEditor } from '../blocks/BlockEditor'
import {
  addQuestion,
  cmp,
  fromSource,
  propValues,
  replaceNode,
  toProgram,
  toSource,
  type BlockProgram,
  type Cond,
} from '../blocks/model'
import { LangError, type Program } from '../lang/parser'
import { MarbleRow, OutputView } from './Marble'
import { Machine, STAGE_DELAY, buildTicks, type Tick } from './Machine'
import { Explain, StepStatus } from './Explain'
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

/** Read-only blocks for code samples in texts, hints and the spellbook. */
export function CodeSample({ code, concepts }: { code: string; concepts: string[] }) {
  const blocks = useMemo(() => fromSource(code), [code])
  if (!blocks) return <pre className="code-sample">{code}</pre>
  return (
    <div className="sample-blocks">
      <BlockEditor program={blocks} concepts={concepts as never} readOnly compact />
    </div>
  )
}

function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="star-row">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? 'on' : 'off'}>
          ⭐
        </span>
      ))}
    </span>
  )
}

function nextValue(c: Cond): Cond {
  if (c.t !== 'cmp') return cmp()
  const values = propValues(c.prop)
  if (values.length === 0) return cmp(c.prop, c.op, 5)
  const i = values.indexOf(String(c.value))
  return cmp(c.prop, '==', values[(i + 1) % values.length])
}

function findCond(p: BlockProgram, id: string): Cond | null {
  let found: Cond | null = null
  const walk = (x: any) => {
    if (found || !x || typeof x !== 'object') return
    if (x.id === id) found = x
    else Object.values(x).forEach(walk)
  }
  walk(p)
  return found
}

export function LevelScreen({ level, levelNumber, savedCode, stars, onSaveCode, onSolved, onBack, onNext }: Props) {
  const [blocks, setBlocks] = useState<BlockProgram>(
    () => (savedCode !== undefined ? fromSource(savedCode) : null) ?? fromSource(level.starter ?? '') ?? [],
  )
  const [history, setHistory] = useState<BlockProgram[]>([])
  const [result, setResult] = useState<CheckResult | null>(null)
  const [runId, setRunId] = useState(0)
  const [selected, setSelected] = useState(0)
  const [revealed, setRevealed] = useState<number[]>([]) // hidden test indices shown to the player
  const [hints, setHints] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [message, setMessage] = useState<Message | null>(null)
  const [success, setSuccess] = useState<number | null>(null)
  const [spellbook, setSpellbook] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [introOpen, setIntroOpen] = useState(true)
  const [debug, setDebug] = useState<{ tick: number } | null>(null)
  const [playing, setPlaying] = useState(false)

  const tests = getTests(level)
  const showNumber = !!level.features.numbers
  const concepts = useMemo(() => conceptsUpTo(level.id), [level.id])
  const chapter = CHAPTERS.find((c) => c.levels.includes(level))!
  const potential = starsFor(mistakes)

  // Cards on the left: visible examples + any secret tests that were revealed.
  const cards = [
    ...tests.visible.map((tc, i) => ({ tc, label: `Example ${i + 1}`, caseIndex: i })),
    ...revealed.map((h) => ({ tc: tests.hidden[h], label: '🕵️ Secret test', caseIndex: tests.visible.length + h })),
  ]
  const card = cards[Math.min(selected, cards.length - 1)]

  const compiled = useMemo((): { program?: Program; error?: LangError } => {
    try {
      return { program: toProgram(blocks) }
    } catch (e) {
      if (e instanceof LangError) return { error: e }
      throw e
    }
  }, [blocks])

  // ------------------------------------------------------------ editing

  const update = useCallback(
    (next: BlockProgram) => {
      setHistory((h) => [...h.slice(-49), blocks])
      setBlocks(next)
      onSaveCode(toSource(next))
      setResult(null)
      setMessage(null)
    },
    [blocks, onSaveCode],
  )
  const edit = (id: string, fn: (node: any) => any) => update(replaceNode(blocks, id, fn))
  const addQ = (id: string, op: 'and' | 'or') => {
    const target = findCond(blocks, id)
    update(addQuestion(blocks, id, op, target ? nextValue(target) : cmp()))
  }
  const undo = () => {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory(history.slice(0, -1))
    setBlocks(prev)
    onSaveCode(toSource(prev))
    setResult(null)
    setMessage(null)
  }
  const clear = () => {
    if (blocks.length && confirm('Remove all steps and start from scratch?')) update([])
  }

  // ------------------------------------------------------------ running

  function runIt() {
    setDebug(null)
    setPlaying(false)
    setIntroOpen(false)
    if (compiled.error || !compiled.program) {
      setMessage({ tone: 'error', text: compiled.error?.message ?? 'Something is wrong with the program.' })
      return
    }
    if (blocks.length === 0) {
      setResult(null)
      setMessage({ tone: 'info', text: 'Your machine is empty, so the marbles just roll straight through. Add a step first!' })
      return
    }
    const r = checkSolution(level, compiled.program)
    setResult(r)
    setRunId((x) => x + 1)
    const visibleCount = tests.visible.length
    const shown = cards.map((c) => c.caseIndex)
    const firstShownFail = shown.find((ci) => !r.cases[ci].pass)
    const mistake = (text: string) => {
      setMistakes((m) => m + 1)
      const left = starsFor(mistakes + 1)
      setMessage({ tone: 'warn', text: `${text} ${left < potential ? `(you can still win ${'⭐'.repeat(left)})` : ''}` })
    }
    if (firstShownFail !== undefined) {
      setSelected(shown.indexOf(firstShownFail))
      const c = r.cases[firstShownFail]
      mistake(
        c.error
          ? `Oops! Step ${c.error.line}: ${c.error.message}`
          : 'Not quite yet! Watch the machine below, or press 🐞 Step by step to see what happens to each marble.',
      )
      return
    }
    const hiddenFail = r.cases.findIndex((c, i) => i >= visibleCount && !c.pass)
    if (hiddenFail >= 0) {
      setRevealed((rv) => [...rv, hiddenFail - visibleCount])
      setSelected(cards.length) // the newly revealed card
      mistake('Your machine works for the examples... but a secret test found a problem! Look at the new secret test.')
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
    const earned = starsFor(mistakes)
    setMessage({ tone: 'good', text: 'It works! 🎉' })
    setSelected(0)
    onSolved(earned)
    // let the marble machine finish its animation before celebrating
    const st = r.cases[0]?.stages ?? []
    const last = st[st.length - 1]
    const reduceExtra = last?.kind === 'reduce' ? last.input.length * 260 : 0
    setTimeout(() => setSuccess(earned), (st.length + 1) * STAGE_DELAY * 1000 + 900 + reduceExtra)
  }

  // ------------------------------------------------------------ step-by-step debugger

  const debugRun = useMemo(
    () => (debug && compiled.program ? runCase(compiled.program, card.tc) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debug !== null, compiled.program, card.tc],
  )
  const ticks = useMemo(() => (debugRun ? buildTicks(debugRun.stages) : []), [debugRun])
  const tickIdx = debug ? Math.min(debug.tick, ticks.length - 1) : 0
  const tick: Tick | null = debug ? ticks[tickIdx] ?? null : null

  const setTick = useCallback((t: number) => setDebug({ tick: Math.max(0, t) }), [])
  const startDebug = (at = 0) => {
    if (!compiled.program || blocks.length === 0) {
      setMessage({ tone: 'info', text: 'Add a step to your machine first!' })
      return
    }
    setIntroOpen(false)
    setDebug({ tick: at })
    setPlaying(false)
  }

  useEffect(() => {
    if (!playing || !debug) return
    if (tickIdx >= ticks.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setTick(tickIdx + 1), 900)
    return () => clearTimeout(t)
  }, [playing, debug, tickIdx, ticks.length, setTick])

  useEffect(() => {
    if (!debug) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setTick(Math.min(tickIdx + 1, ticks.length - 1))
      if (e.key === 'ArrowLeft') setTick(tickIdx - 1)
      if (e.key === 'Escape') setDebug(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [debug, tickIdx, ticks.length, setTick])

  const activeStage = debugRun && tick && tick.stage >= 0 && tick.stage < debugRun.stages.length ? debugRun.stages[tick.stage] : null
  const active =
    activeStage && tick
      ? {
          index: tick.stage,
          trace: tick.index >= 0 ? { values: activeStage.values[tick.index], marble: activeStage.input[tick.index] } : null,
          status: <StepStatus stage={activeStage} index={tick.index} />,
        }
      : null

  const pickMarble = (stage: number, index: number) => {
    if (!compiled.program) return
    const run = runCase(compiled.program, card.tc)
    const t = buildTicks(run.stages).findIndex((x) => x.stage === stage && x.index === index)
    startDebug(Math.max(0, t))
  }

  const caseResult = result ? result.cases[card.caseIndex] : null
  const stepNarration = (() => {
    if (!debugRun || !tick) return null
    if (tick.stage === -1) return 'These marbles are about to roll into your machine. Press ▶ to send the first one!'
    if (tick.stage >= debugRun.stages.length)
      return debugRun.error ? 'The machine stopped with an error.' : 'All marbles went through. Compare with what was expected!'
    if (tick.index < 0) return 'No marbles reached this step.'
    return null
  })()

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
        <div className="star-box" title="Solve without mistakes for 3 stars. Each wrong run or hint costs a star.">
          <span className="star-label">this try</span>
          <Stars n={potential} />
        </div>
        {stars > 0 && (
          <div className="star-box best">
            <span className="star-label">best</span>
            <Stars n={stars} />
          </div>
        )}
      </header>

      <div className="level-grid">
        <section className="panel task">
          <h1 className="goal">{level.goal}</h1>
          {level.intro && (
            <details className="intro" open={introOpen} onToggle={(e) => setIntroOpen((e.target as HTMLDetailsElement).open)}>
              <summary>📖 How it works</summary>
              <RichText text={level.intro} renderCode={(c) => <CodeSample code={c} concepts={concepts} />} />
            </details>
          )}
          <div className="examples">
            {cards.map((c, i) => {
              const cr = result ? result.cases[c.caseIndex] : null
              return (
                <button
                  key={i}
                  className={`example ${i === selected ? 'selected' : ''} ${cr ? (cr.pass ? 'pass' : 'fail') : ''}`}
                  onClick={() => {
                    setSelected(i)
                    if (debug) setDebug({ tick: 0 })
                  }}
                >
                  <div className="example-head">
                    <span>{c.label}</span>
                    {cr && <span>{cr.pass ? '✅' : '❌'}</span>}
                  </div>
                  <div className="example-body">
                    <div className="io-box in">
                      <div className="io-label">IN</div>
                      <MarbleRow marbles={c.tc.input} showNumber={showNumber} />
                    </div>
                    <div className="io-arrow">➜</div>
                    <div className="io-box out">
                      <div className="io-label">OUT</div>
                      <OutputView output={c.tc.expected} showNumber={showNumber} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="hints">
            {level.hints.slice(0, hints).map((h, i) => (
              <div key={i} className="hint">
                💡 {h.includes('\n') || /^(filter|map|reduce)\b/.test(h) ? <CodeSample code={h} concepts={concepts} /> : h}
              </div>
            ))}
            {hints < level.hints.length && (
              <button
                className="btn ghost small"
                onClick={() => {
                  setHints(hints + 1)
                  setMistakes((m) => m + 1)
                }}
              >
                💡 {hints === 0 ? 'Need a hint?' : 'Another hint'} <span className="cost">(costs a ⭐)</span>
              </button>
            )}
          </div>
        </section>

        <section className="panel workbench">
          <div className="editor-head">
            <span>🛠️ Your machine</span>
            <div className="editor-actions">
              {!debug && (
                <>
                  <button className="btn ghost small" onClick={undo} disabled={history.length === 0} title="Undo">
                    ↶ Undo
                  </button>
                  <button className="btn ghost small" onClick={clear} disabled={blocks.length === 0}>
                    🧹 Clear
                  </button>
                </>
              )}
              <button className={`btn ghost small ${showCode ? 'on' : ''}`} onClick={() => setShowCode(!showCode)}>
                {'</>'} Code
              </button>
              <button className="btn ghost small" onClick={() => setSpellbook(true)}>
                📕 Spellbook
              </button>
            </div>
          </div>

          <BlockEditor
            program={blocks}
            concepts={concepts}
            readOnly={!!debug}
            onChange={update}
            edit={edit}
            addQuestion={addQ}
            active={active}
          />
          {showCode && (
            <div className="code-view">
              <div className="code-view-title">Your machine written as code:</div>
              <pre className="code-sample">{toSource(blocks) || '(empty)'}</pre>
            </div>
          )}

          {!debug ? (
            <div className="run-row">
              <button className="btn run" onClick={runIt}>
                ▶ Run
              </button>
              <button className="btn debug" onClick={() => startDebug(0)}>
                🐞 Step by step
              </button>
              <span className="kbd-hint">Step by step is free - it doesn't cost stars.</span>
            </div>
          ) : (
            <div className="debug-bar">
              <div className="debug-controls">
                <button className="btn ghost small" title="Back to the start" onClick={() => setTick(0)} disabled={tickIdx === 0}>
                  ⏮
                </button>
                <button className="btn ghost small" title="One step back (←)" onClick={() => setTick(tickIdx - 1)} disabled={tickIdx === 0}>
                  ◀
                </button>
                <button
                  className="btn debug"
                  title="Next step (→)"
                  onClick={() => setTick(Math.min(tickIdx + 1, ticks.length - 1))}
                  disabled={tickIdx >= ticks.length - 1}
                >
                  ▶ Next
                </button>
                <button className="btn ghost small" title="Play automatically" onClick={() => setPlaying(!playing)}>
                  {playing ? '⏸ Pause' : '⏵ Play'}
                </button>
                <button
                  className="btn ghost small"
                  title="Jump to the end"
                  onClick={() => setTick(ticks.length - 1)}
                  disabled={tickIdx >= ticks.length - 1}
                >
                  ⏭
                </button>
                <span className="step-count">
                  {tickIdx + 1} / {ticks.length}
                </span>
              </div>
              <button className="btn ghost small" onClick={() => setDebug(null)}>
                ✏️ Back to editing
              </button>
            </div>
          )}
          {message && !debug && <div className={`message ${message.tone}`}>{message.text}</div>}

          {debug && debugRun && tick ? (
            <div className="machine">
              <div className="machine-title">
                <span>
                  🐞 Stepping through <strong>{card.label}</strong>
                </span>
              </div>
              <div className="narration">
                {stepNarration ??
                  (activeStage && tick.index >= 0 && (
                    <>
                      <div className="narration-title">
                        Marble {tick.index + 1} at step {tick.stage + 1}:
                      </div>
                      <Explain block={blocks[tick.stage]} stage={activeStage} index={tick.index} />
                    </>
                  ))}
              </div>
              <Machine
                input={card.tc.input}
                stages={debugRun.stages}
                blocks={blocks}
                actual={debugRun.actual}
                expected={card.tc.expected}
                error={debugRun.error}
                showNumber={showNumber}
                tick={tick}
              />
            </div>
          ) : caseResult ? (
            <div className="machine">
              <div className="machine-title">
                <span>
                  ⚙️ The machine working on <strong>{card.label}</strong>
                </span>
                <button className="btn ghost small" onClick={() => setRunId((x) => x + 1)}>
                  ⟳ Replay
                </button>
              </div>
              <Machine
                key={`${runId}-${selected}`}
                input={caseResult.input}
                stages={caseResult.stages}
                blocks={blocks}
                actual={caseResult.actual}
                expected={caseResult.expected}
                error={caseResult.error}
                showNumber={showNumber}
                onPick={pickMarble}
              />
            </div>
          ) : (
            <div className="machine idle">
              Press <strong>▶ Run</strong> to test your machine on all examples, or <strong>🐞 Step by step</strong> to follow the
              marbles of {card.label} one at a time.
            </div>
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
              <Stars n={success} />
            </div>
            <p>
              {success >= 3
                ? 'Perfect - no mistakes!'
                : `Solved! Play it again without mistakes or hints to get all 3 stars.`}
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
                  <CodeSample code={CONCEPT_DOCS[c].code} concepts={concepts} />
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

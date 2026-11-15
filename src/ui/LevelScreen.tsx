import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { checkSolution, constraintsOf, getTests, runCase, starsFor, type CheckResult } from '../game/check'
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
import { Machine, buildTicks, type Tick } from './Machine'
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
  const [view, setView] = useState<'idle' | 'run' | 'all'>('idle')
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
  const [loadFlash, setLoadFlash] = useState(0)

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
      setView((v) => (v === 'all' ? 'idle' : v))
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
    setView((v) => (v === 'all' ? 'idle' : v))
  }
  const clear = () => {
    if (blocks.length && confirm('Remove all steps and start from scratch?')) update([])
  }

  // ------------------------------------------------------------ running

  function checkAll() {
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
    setView('all')
    const visibleCount = tests.visible.length
    const shown = cards.map((c) => c.caseIndex)
    const shownPass = shown.filter((ci) => r.cases[ci].pass).length
    const mistake = (text: string) => {
      setMistakes((m) => m + 1)
      const left = starsFor(mistakes + 1)
      setMessage({ tone: 'warn', text: `${text} ${left < potential ? `(you can still win ${'⭐'.repeat(left)})` : ''}` })
    }
    if (shownPass < shown.length) {
      mistake(`${shownPass} of ${shown.length} examples work. Click a ❌ example to see what goes wrong.`)
      return
    }
    const hiddenFail = r.cases.findIndex((c, i) => i >= visibleCount && !c.pass && !revealed.includes(i - visibleCount))
    if (hiddenFail >= 0) {
      setRevealed((rv) => [...rv, hiddenFail - visibleCount])
      mistake('All examples work... but a secret test found a problem! It is now in the list with the examples.')
      return
    }
    if (r.missing) {
      setMessage({
        tone: 'info',
        text: `It works! But in this level you have to use "${r.missing.map((m) => STEP_NAMES[m]).join('", "')}". Try again!`,
      })
      return
    }
    if (r.tooLong) {
      setMessage({
        tone: 'info',
        text: `It works! But in this level your machine may have only ${level.maxSteps} step${level.maxSteps === 1 ? '' : 's'}. Can you squeeze it into fewer steps?`,
      })
      return
    }
    const earned = starsFor(mistakes)
    setMessage({ tone: 'good', text: 'Everything works! 🎉' })
    onSolved(earned)
    setTimeout(() => setSuccess(earned), 700)
  }

  /** Run only the loaded example - instantly, for free. Updates live while you edit. */
  const singleRun = useMemo(
    () => (view === 'run' && compiled.program ? runCase(compiled.program, card.tc) : null),
    [view, compiled.program, card.tc],
  )
  const runOne = () => {
    setDebug(null)
    setPlaying(false)
    setIntroOpen(false)
    if (!compiled.program || blocks.length === 0) {
      setMessage({ tone: 'info', text: 'Add a step to your machine first!' })
      return
    }
    setMessage(null)
    setView('run')
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

  const stepNarration = (() => {
    if (!debugRun || !tick) return null
    if (tick.stage === -1) return 'These marbles are about to roll into your machine. Press ▶ Next to send the first one!'
    if (tick.stage >= debugRun.stages.length)
      return debugRun.error ? 'The machine stopped with an error.' : 'All marbles went through. Compare with what was expected!'
    if (tick.index < 0) return 'No marbles reached this step.'
    return null
  })()

  // The rule itself is hidden - revealing it is the first hint.
  const ruleHint = /find the pattern/i.test(level.goal) ? null : level.goal
  const allHints = [...(ruleHint ? [ruleHint] : []), ...level.hints]
  const constraints = constraintsOf(level)

  const loadCard = (i: number) => {
    setSelected(i)
    setLoadFlash((x) => x + 1)
    if (debug) setDebug({ tick: 0 })
    else if (view === 'all') setView('run')
  }

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
        {/* ------------------------------------------------ puzzle: rule + examples */}
        <section className="panel puzzle-panel">
          <div className="panel-title">
            <span>🧩 Puzzle</span>
          </div>
          <div className="rail">
            <div className="rule-card">
              <div className="rule-title">🔍 Find the rule!</div>
              <div className="rule-text">
                Look at what goes <b>IN</b> and what comes <b>OUT</b>. What does the machine have to do?
              </div>
              {constraints.map((c) => (
                <div key={c} className="constraint">
                  📏 {c}
                </div>
              ))}
              {allHints.slice(0, hints).map((h, i) => (
                <div key={i} className={`hint ${ruleHint && i === 0 ? 'rule' : ''}`}>
                  {ruleHint && i === 0 ? <b>The rule: </b> : '💡 '}
                  {h.includes('\n') || /^(filter|map|reduce)\b/.test(h) ? <CodeSample code={h} concepts={concepts} /> : h}
                </div>
              ))}
              {hints < allHints.length && (
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setHints(hints + 1)
                    setMistakes((m) => m + 1)
                  }}
                >
                  💡 {hints === 0 ? (ruleHint ? 'Tell me the rule' : 'Need a hint?') : 'Another hint'}{' '}
                  <span className="cost">(costs a ⭐)</span>
                </button>
              )}
            </div>

            <div className="rail-title">Examples - click one to put it in the machine</div>
            {cards.map((c, i) => {
              const cr = result ? result.cases[c.caseIndex] : null
              return (
                <button
                  key={i}
                  className={`example ${i === selected ? 'selected' : ''} ${cr ? (cr.pass ? 'pass' : 'fail') : ''}`}
                  onClick={() => loadCard(i)}
                  aria-pressed={i === selected}
                  aria-label={c.label}
                  title={c.label}
                >
                  <div className="ex-badge">
                    <span className="ex-num">{c.caseIndex >= tests.visible.length ? '🕵️' : i + 1}</span>
                    {cr && <span className="ex-status">{cr.pass ? '✅' : '❌'}</span>}
                  </div>
                  <div className="ex-rows">
                    <div className="io-box in">
                      <div className="io-label">IN</div>
                      <MarbleRow marbles={c.tc.input} showNumber={showNumber} />
                    </div>
                    <div className="io-box out">
                      <div className="io-label">OUT</div>
                      <OutputView output={c.tc.expected} showNumber={showNumber} />
                    </div>
                  </div>
                  {i === selected && <span className="loaded-tag">⚙️ in the machine</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* ------------------------------------------------ program editor */}
        <section className="panel program-panel">
          <div className="panel-title">
            <span>🛠️ Your program</span>
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
          <div className="panel-scroll">
            {level.intro && (
              <details className="intro" open={introOpen} onToggle={(e) => setIntroOpen((e.target as HTMLDetailsElement).open)}>
                <summary>📖 How it works</summary>
                <RichText text={level.intro} renderCode={(c) => <CodeSample code={c} concepts={concepts} />} />
              </details>
            )}
            {debug && <div className="editing-locked">🐞 Stepping through - press ✏️ Edit program to change it.</div>}
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
          </div>
        </section>

        {/* ------------------------------------------------ execution engine */}
        <section className="panel bench">
          <div className="panel-title">
            <span>⚙️ Machine</span>
            {!debug ? (
              <div className="bench-actions">
                <button
                  className={`btn check ${view === 'all' ? 'on' : ''}`}
                  onClick={checkAll}
                  title="Your answer: tests all examples and the secret tests. A wrong answer costs a star."
                >
                  ✔ Check all
                </button>
              </div>
            ) : (
              <div className="bench-actions">
                <button className="btn ghost" onClick={() => setDebug(null)}>
                  ✏️ Edit program
                </button>
              </div>
            )}
          </div>
          {message && !debug && <div className={`message ${message.tone}`}>{message.text}</div>}

          <div className="engine">
            <div className="engine-head">
              {view === 'all' && !debug ? (
                <span className="loaded-chip all">📋 All examples</span>
              ) : (
                <span key={loadFlash} className="loaded-chip">
                  📼 {card.label}
                </span>
              )}
              {debug ? (
                <div className="debug-controls">
                  <button className="btn ghost small" title="Back to the start" onClick={() => setTick(0)} disabled={tickIdx === 0}>
                    ⏮
                  </button>
                  <button className="btn ghost small" title="One step back (←)" onClick={() => setTick(tickIdx - 1)} disabled={tickIdx === 0}>
                    ◀
                  </button>
                  <button
                    className="btn debug small-debug"
                    title="Next step (→)"
                    onClick={() => setTick(Math.min(tickIdx + 1, ticks.length - 1))}
                    disabled={tickIdx >= ticks.length - 1}
                  >
                    ▶ Next
                  </button>
                  <button className="btn ghost small" title="Play automatically" onClick={() => setPlaying(!playing)}>
                    {playing ? '⏸' : '⏵ Play'}
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
                    {tickIdx + 1}/{ticks.length}
                  </span>
                </div>
              ) : (
                <div className="engine-actions">
                  <button
                    className={`btn run small-run ${view === 'run' ? 'on' : ''}`}
                    onClick={runOne}
                    title={`Run ${card.label} - instantly, for free`}
                  >
                    ▶ Run {view === 'all' ? card.label : 'this'}
                  </button>
                  <button className="btn debug small-debug" onClick={() => startDebug(0)} title="Follow the marbles one by one - for free">
                    🐞 Step by step
                  </button>
                </div>
              )}
            </div>

            <div className="engine-scroll" key={`load-${loadFlash}-${view}-${debug ? 'd' : ''}`}>
              {debug && debugRun && tick ? (
                <>
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
                </>
              ) : view === 'all' && result ? (
                <div className="results">
                  {cards.map((c, i) => {
                    const cr = result.cases[c.caseIndex]
                    return (
                      <button
                        key={i}
                        className={`result-row ${cr.pass ? 'pass' : 'fail'}`}
                        onClick={() => {
                          loadCard(i)
                          setView('run')
                        }}
                        title={`Show ${c.label} in the machine`}
                      >
                        <div className="ex-badge">
                          <span className="ex-num">{c.caseIndex >= tests.visible.length ? '🕵️' : i + 1}</span>
                          <span className="res-mark">{cr.pass ? '✅' : '❌'}</span>
                        </div>
                        <div className="res-io">
                          <div className="res-line">
                            <span className="io-label">IN</span>
                            <MarbleRow marbles={cr.input} showNumber={showNumber} />
                          </div>
                          <div className="res-line">
                            <span className="io-label">YOURS</span>
                            {cr.error ? (
                              <span className="run-error">💥 {cr.error.message}</span>
                            ) : (
                              <OutputView output={cr.actual!} showNumber={showNumber} />
                            )}
                          </div>
                          {!cr.pass && (
                            <div className="res-line wanted">
                              <span className="io-label">WANTED</span>
                              <OutputView output={cr.expected} showNumber={showNumber} />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  {(() => {
                    const secret = result.cases.filter((c, i) => c.hidden && !revealed.includes(i - tests.visible.length))
                    const ok = secret.filter((c) => c.pass).length
                    return (
                      <div className={`result-row secret ${ok === secret.length ? 'pass' : 'fail'}`}>
                        <div className="ex-badge">
                          <span className="ex-num">🕵️</span>
                        </div>
                        <div className="res-io">
                          {cards.every((c) => result.cases[c.caseIndex].pass)
                            ? `Secret tests: ${ok} of ${secret.length} ${ok === secret.length ? '✅' : '❌'}`
                            : 'Secret tests: make all examples work first.'}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : view === 'run' && singleRun ? (
                <Machine
                  input={singleRun.input}
                  stages={singleRun.stages}
                  blocks={blocks}
                  actual={singleRun.actual}
                  expected={singleRun.expected}
                  error={singleRun.error}
                  showNumber={showNumber}
                  onPick={pickMarble}
                />
              ) : (
                <div className="pipeline idle-machine">
                  <div className="stage">
                    <div className="stage-label">
                      <span className="kind in">📥 in</span>
                    </div>
                    <MarbleRow marbles={card.tc.input} showNumber={showNumber} />
                  </div>
                  <div className="machine-waiting">
                    <div className="gear">⚙️</div>
                    <div>
                      <strong>▶ Run this</strong> - see what your machine does with {card.label}
                    </div>
                    <div>
                      <strong>🐞 Step by step</strong> - follow these marbles one at a time
                    </div>
                    <div>
                      <strong>✔ Check all</strong> - your answer: tests every example
                    </div>
                  </div>
                  <div className="stage final">
                    <div className="io-box expected">
                      <div className="io-label">Expected out</div>
                      <OutputView output={card.tc.expected} showNumber={showNumber} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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

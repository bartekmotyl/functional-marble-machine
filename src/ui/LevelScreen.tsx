import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { MAX_STARS, COST, checkSolution, expectedFor, getTests, hintCost, runCase, starsFor, type CheckResult } from '../game/check'
import type { TestCase } from '../game/generate'
import type { Marble as M } from '../lang/marble'
import { Experiment } from './Experiment'
import type { Concept, Level } from '../game/levels'
import type { LevelTexts } from '../game/packs'
import type { Progress } from '../game/progress'
import { CONCEPT_CODE } from '../game/concepts'
import { BlockEditor } from '../blocks/BlockEditor'
import { addQuestion, cmp, fromSource, propValues, replaceNode, toProgram, toSource, type BlockProgram, type Cond } from '../blocks/model'
import { LangError, type Program } from '../lang/parser'
import { t, tn } from '../i18n'
import { localizeCode } from '../i18n/words'
import { MarbleRow, OutputView } from './Marble'
import { Machine, buildTicks, type Tick } from './Machine'
import { Explain, StepStatus } from './Explain'
import { RichText } from './RichText'

interface Props {
  level: Level
  /** the level's goal, intro and hints, already in the player's language */
  texts: LevelTexts
  /** blocks the player may use */
  concepts: Concept[]
  /** "Level 3" or "Exam" */
  title: string
  /** the section in the top bar */
  section: { title: string; icon: ReactNode }
  savedCode?: string
  stars: number
  progress: Progress
  onSaveCode: (code: string) => void
  onSolved: (stars: number) => void
  onBack: () => void
  onChapter: () => void
  onNext?: () => void
  /** is the section's exam open, given the progress after solving this level? */
  examReady: (after: Progress) => boolean
  onExam: () => void
  onNextSection?: () => void
}

type Message = { tone: 'error' | 'warn' | 'info' | 'good'; text: string }

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

function Stars({ n, of = MAX_STARS }: { n: number; of?: number }) {
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

export function LevelScreen(props: Props) {
  const { level, texts, concepts, title, section, savedCode, stars, progress, onSaveCode, onSolved, onBack, onChapter, onNext, examReady, onExam, onNextSection } = props
  const [blocks, setBlocks] = useState<BlockProgram>(
    () => (savedCode !== undefined ? fromSource(savedCode) : null) ?? fromSource(level.starter ?? '') ?? [],
  )
  const [history, setHistory] = useState<BlockProgram[]>([])
  const [result, setResult] = useState<CheckResult | null>(null)
  const [view, setView] = useState<'idle' | 'run' | 'all'>('idle')
  const [selected, setSelected] = useState(0)
  const [revealed, setRevealed] = useState<number[]>([]) // hidden test indices shown to the player
  const [hints, setHints] = useState(0)
  /** stars lost on this try: wrong checks and paid help */
  const [lost, setLost] = useState(0)
  const [labOpen, setLabOpen] = useState(false)
  const [custom, setCustom] = useState<TestCase[]>([]) // rows from the marble lab
  const [message, setMessage] = useState<Message | null>(null)
  const [success, setSuccess] = useState<number | null>(null)
  const [spellbook, setSpellbook] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [introOpen, setIntroOpen] = useState(true)
  const [debug, setDebug] = useState<{ tick: number } | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loadFlash, setLoadFlash] = useState(0)
  const [benchFlash, setBenchFlash] = useState(0)
  const benchRef = useRef<HTMLElement>(null)

  const tests = getTests(level)
  const showNumber = !!level.features.numbers
  const potential = starsFor(lost)

  // Cards: visible examples + any secret tests that were revealed.
  const cards = [
    ...tests.visible.map((tc, i) => ({ tc, label: t('ui.example', { n: i + 1 }), caseIndex: i, secret: false })),
    ...revealed.map((h) => ({ tc: tests.hidden[h], label: t('ui.secretTest'), caseIndex: tests.visible.length + h, secret: true })),
    // the player's own rows are for running only - Check all does not use them
    ...custom.map((tc, i) => ({ tc, label: t('lab.card', { n: i + 1 }), caseIndex: -1, secret: false, own: true })),
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
    if (blocks.length && confirm(t('ui.clearConfirm'))) update([])
  }

  /** Draw attention to the machine (used when a button in the program column starts it). */
  const flashBench = () => {
    setBenchFlash((x) => x + 1)
    benchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // ------------------------------------------------------------ checking (the answer)

  function checkAll() {
    setDebug(null)
    setPlaying(false)
    setIntroOpen(false)
    if (compiled.error || !compiled.program) {
      setMessage({ tone: 'error', text: t('errors.generic') })
      return
    }
    if (blocks.length === 0) {
      setResult(null)
      setMessage({ tone: 'info', text: t('ui.msg.empty') })
      return
    }
    const r = checkSolution(level, compiled.program)
    setResult(r)
    setView('all')
    const visibleCount = tests.visible.length
    const shown = cards.map((c) => c.caseIndex).filter((ci) => ci >= 0)
    const shownPass = shown.filter((ci) => r.cases[ci].pass).length
    const mistake = (text: string) => {
      setLost((m) => m + 1)
      const left = starsFor(lost + 1)
      setMessage({ tone: 'warn', text: `${text} ${left < potential ? t('ui.msg.stillWin', { stars: '⭐'.repeat(left) }) : ''}` })
    }
    if (shownPass < shown.length) {
      mistake(t('ui.msg.someWork', { ok: shownPass, all: shown.length }))
      return
    }
    const hiddenFail = r.cases.findIndex((c, i) => i >= visibleCount && !c.pass && !revealed.includes(i - visibleCount))
    if (hiddenFail >= 0) {
      setRevealed((rv) => [...rv, hiddenFail - visibleCount])
      mistake(t('ui.msg.secretFail'))
      return
    }
    if (r.missing) {
      setMessage({ tone: 'info', text: t('ui.msg.mustUse', { what: r.missing.map((m) => t(`steps.${m}`)).join('", "') }) })
      return
    }
    if (r.tooLong) {
      setMessage({ tone: 'info', text: tn('ui.msg.tooLong', level.maxSteps ?? 1) })
      return
    }
    const earned = starsFor(lost)
    setMessage({ tone: 'good', text: t('ui.msg.allWork') })
    onSolved(earned)
    setTimeout(() => setSuccess(earned), 700)
  }

  // ------------------------------------------------------------ running one example

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
      setMessage({ tone: 'info', text: t('ui.msg.addStep') })
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
  const tick: Tick | null = debug ? (ticks[tickIdx] ?? null) : null

  const setTick = useCallback((n: number) => setDebug({ tick: Math.max(0, n) }), [])
  const startDebug = (at = 0) => {
    if (!compiled.program || blocks.length === 0) {
      setMessage({ tone: 'info', text: t('ui.msg.addStep') })
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
    const timer = setTimeout(() => setTick(tickIdx + 1), 900)
    return () => clearTimeout(timer)
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
    const at = buildTicks(run.stages).findIndex((x) => x.stage === stage && x.index === index)
    startDebug(Math.max(0, at))
  }

  const stepNarration = (() => {
    if (!debugRun || !tick) return null
    if (tick.stage === -1) return t('ui.narration.start')
    if (tick.stage >= debugRun.stages.length) return debugRun.error ? t('ui.narration.error') : t('ui.narration.end')
    if (tick.index < 0) return t('ui.narration.none')
    return null
  })()

  // ------------------------------------------------------------ hints: the rule, then tips, then a solution

  const allHints: { kind: 'rule' | 'tip' | 'solution'; text: string }[] = [
    { kind: 'rule', text: texts.goal },
    ...texts.hints.map((h) => ({ kind: 'tip' as const, text: h })),
    { kind: 'solution', text: level.solution },
  ]
  const constraints = [
    ...(level.mustUse ?? []).map((k) => t('ui.mustUse', { what: t(`steps.${k}`) })),
    ...(level.maxSteps !== undefined ? [tn('ui.maxSteps', level.maxSteps)] : []),
  ]
  const nextHintLabel =
    hints === 0 ? t('ui.tellRule') : hints === allHints.length - 1 ? t('ui.showSolution') : hints === 1 ? t('ui.needHint') : t('ui.anotherHint')

  const loadCard = (i: number) => {
    setSelected(i)
    setLoadFlash((x) => x + 1)
    if (debug) setDebug({ tick: 0 })
    else if (view === 'all') setView('run')
  }

  const progressAfter: Progress = { ...progress, stars: { ...progress.stars, [level.id]: Math.max(stars, success ?? 0) } }
  const runLabel = cards.length > 1 ? t('ui.runExample', { label: card.label }) : t('ui.runThis')

  return (
    <div className="level-screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>
          {t('ui.map')}
        </button>
        <button className="crumbs" onClick={onChapter}>
          <span className="chapter-name">
            {section.icon} {section.title}
          </span>
          <span className={`level-name ${level.exam ? 'exam' : ''}`}>{title}</span>
        </button>
        <div className="star-box" title={t('level.starsTitle')}>
          <span className="star-label">{t('level.thisTry')}</span>
          <Stars n={potential} />
        </div>
        {stars > 0 && (
          <div className="star-box best">
            <span className="star-label">{t('level.best')}</span>
            <Stars n={stars} />
          </div>
        )}
      </header>

      <div className="level-grid">
        {/* ------------------------------------------------ puzzle: rule + examples */}
        <section className="panel puzzle-panel">
          <div className="panel-title">
            <span>{t('ui.puzzle')}</span>
          </div>
          <div className="rail">
            {level.exam && (
              <div className="exam-banner">
                <div>{t('level.examIntro')}</div>
                <div className="exam-leave">
                  <span>{t('level.examLeave')}</span>
                  <button className="btn ghost small" onClick={onChapter}>
                    {t('level.backToPractice')}
                  </button>
                </div>
              </div>
            )}
            <div className="rule-card">
              <div className="rule-title">{t('ui.findRule')}</div>
              <div className="rule-text">{t('ui.findRuleText')}</div>
              {constraints.map((c) => (
                <div key={c} className="constraint">
                  {c}
                </div>
              ))}
              {allHints.slice(0, hints).map((h, i) => (
                <div key={i} className={`hint ${h.kind}`}>
                  {h.kind === 'rule' && <b>{t('ui.ruleLabel')} </b>}
                  {h.kind === 'tip' && '💡 '}
                  {h.kind === 'solution' ? (
                    <>
                      <b>{t('ui.solutionLabel')}</b>
                      <CodeSample code={h.text} concepts={concepts} />
                    </>
                  ) : (
                    h.text
                  )}
                </div>
              ))}
              {hints < allHints.length && (
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setHints(hints + 1)
                    setLost((m) => m + hintCost(hints, labOpen))
                  }}
                >
                  {nextHintLabel} <span className="cost">{t('ui.costs', { stars: '⭐'.repeat(hintCost(hints, labOpen)) })}</span>
                </button>
              )}
            </div>

            <Experiment
              level={level}
              start={card.tc.input}
              showNumber={showNumber}
              open={labOpen}
              onOpen={() => {
                setLabOpen(true)
                setLost((m) => m + COST.experiment)
              }}
              onAdd={(input: M[]) => {
                const tc = { input, expected: expectedFor(level, input).output! }
                setCustom((c) => [...c, tc])
                loadCard(cards.length)
              }}
            />

            <div className="rail-title">{t('ui.examples')}</div>
            {cards.map((c, i) => {
              const cr = result && c.caseIndex >= 0 ? result.cases[c.caseIndex] : null
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
                    <span className="ex-num">{c.secret ? '🕵️' : 'own' in c ? '🧪' : i + 1}</span>
                    {cr && <span className="ex-status">{cr.pass ? '✅' : '❌'}</span>}
                  </div>
                  <div className="ex-rows">
                    <div className="io-box in">
                      <div className="io-label" title={t('ui.in')}>{t('ui.inShort')}</div>
                      <MarbleRow marbles={c.tc.input} showNumber={showNumber} />
                    </div>
                    <div className="io-box out">
                      <div className="io-label" title={t('ui.out')}>{t('ui.outShort')}</div>
                      <OutputView output={c.tc.expected} showNumber={showNumber} />
                    </div>
                  </div>
                  {i === selected && <span className="loaded-tag">{t('ui.inMachine')}</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* ------------------------------------------------ program editor */}
        <section className="panel program-panel">
          <div className="panel-title">
            <span>{t('ui.program')}</span>
            <div className="editor-actions">
              {!debug && (
                <>
                  <button className="btn ghost small" onClick={undo} disabled={history.length === 0}>
                    {t('ui.undo')}
                  </button>
                  <button className="btn ghost small" onClick={clear} disabled={blocks.length === 0}>
                    {t('ui.clear')}
                  </button>
                </>
              )}
              <button className={`btn ghost small ${showCode ? 'on' : ''}`} onClick={() => setShowCode(!showCode)}>
                {t('ui.code')}
              </button>
              <button className="btn ghost small" onClick={() => setSpellbook(true)}>
                {t('ui.spellbook')}
              </button>
            </div>
          </div>
          <div className="panel-scroll">
            {texts.intro && (
              <details className="intro" open={introOpen} onToggle={(e) => setIntroOpen((e.target as HTMLDetailsElement).open)}>
                <summary>{t('ui.howItWorks')}</summary>
                <RichText text={texts.intro} renderCode={(c) => <CodeSample code={c} concepts={concepts} />} />
              </details>
            )}
            {debug && <div className="editing-locked">{t('ui.steppingLocked')}</div>}
            <BlockEditor program={blocks} concepts={concepts} readOnly={!!debug} onChange={update} edit={edit} addQuestion={addQ} active={active} />
            {showCode && (
              <div className="code-view">
                <div className="code-view-title">{t('ui.codeTitle')}</div>
                <pre className="code-sample">{localizeCode(toSource(blocks)) || t('ui.codeEmpty')}</pre>
              </div>
            )}
          </div>
          <div className="panel-foot">
            {debug ? (
              <button className="btn ghost" onClick={() => setDebug(null)}>
                {t('ui.stopDebug')}
              </button>
            ) : (
              <>
                <button
                  className="btn run small-run"
                  onClick={() => {
                    runOne()
                    flashBench()
                  }}
                  title={t('ui.runTitle', { label: card.label })}
                >
                  {runLabel}
                </button>
                <button
                  className="btn debug small-debug"
                  onClick={() => {
                    startDebug(0)
                    flashBench()
                  }}
                  title={t('ui.stepTitle')}
                >
                  {t('ui.stepByStep')}
                </button>
              </>
            )}
          </div>
        </section>

        {/* ------------------------------------------------ execution engine */}
        <section ref={benchRef} className={`panel bench ${benchFlash ? `flash-${benchFlash % 2}` : ''}`}>
          <div className="panel-title">
            <span>{t('ui.machine')}</span>
            <div className="bench-actions">
              {debug && (
                <button className="btn ghost small" onClick={() => setDebug(null)}>
                  {t('ui.stopDebug')}
                </button>
              )}
              <button className={`btn check ${view === 'all' && !debug ? 'on' : ''}`} onClick={checkAll} title={t('ui.checkAllTitle')}>
                {t('ui.checkAll')}
              </button>
            </div>
          </div>
          {message && !debug && <div className={`message ${message.tone}`}>{message.text}</div>}

          <div className="engine">
            <div className="engine-head">
              {view === 'all' && !debug ? (
                <span className="loaded-chip all">{t('ui.allExamples')}</span>
              ) : (
                <span key={loadFlash} className="loaded-chip">
                  📼 {card.label}
                </span>
              )}
              {debug ? (
                <div className="debug-controls">
                  <button className="btn ghost small" title={t('ui.toStart')} onClick={() => setTick(0)} disabled={tickIdx === 0}>
                    ⏮
                  </button>
                  <button className="btn ghost small" title={t('ui.back')} onClick={() => setTick(tickIdx - 1)} disabled={tickIdx === 0}>
                    ◀
                  </button>
                  <button
                    className="btn debug small-debug"
                    title={t('ui.nextTitle')}
                    onClick={() => setTick(Math.min(tickIdx + 1, ticks.length - 1))}
                    disabled={tickIdx >= ticks.length - 1}
                  >
                    {t('ui.next')}
                  </button>
                  <button className="btn ghost small" title={t('ui.playTitle')} onClick={() => setPlaying(!playing)}>
                    {playing ? t('ui.pause') : t('ui.play')}
                  </button>
                  <button className="btn ghost small" title={t('ui.toEnd')} onClick={() => setTick(ticks.length - 1)} disabled={tickIdx >= ticks.length - 1}>
                    ⏭
                  </button>
                  <span className="step-count">
                    {tickIdx + 1}/{ticks.length}
                  </span>
                </div>
              ) : (
                <div className="engine-actions">
                  <button className={`btn run small-run ${view === 'run' ? 'on' : ''}`} onClick={runOne} title={t('ui.runTitle', { label: card.label })}>
                    {view === 'all' ? runLabel : t('ui.runThis')}
                  </button>
                  <button className="btn debug small-debug" onClick={() => startDebug(0)} title={t('ui.stepTitle')}>
                    {t('ui.stepByStep')}
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
                          <div className="narration-title">{t('ui.narration.marble', { i: tick.index + 1, s: tick.stage + 1 })}</div>
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
                    if (c.caseIndex < 0) return null // the player's own rows are not part of the answer
                    const cr = result.cases[c.caseIndex]
                    return (
                      <button
                        key={i}
                        className={`result-row ${cr.pass ? 'pass' : 'fail'}`}
                        onClick={() => {
                          loadCard(i)
                          setView('run')
                        }}
                        title={t('ui.showInMachine', { label: c.label })}
                      >
                        <div className="ex-badge">
                          <span className="ex-num">{c.secret ? '🕵️' : i + 1}</span>
                          <span className="res-mark">{cr.pass ? '✅' : '❌'}</span>
                        </div>
                        <div className="res-io">
                          <div className="res-line">
                            <span className="io-label">{t('ui.in')}</span>
                            <MarbleRow marbles={cr.input} showNumber={showNumber} />
                          </div>
                          <div className="res-line">
                            <span className="io-label">{t('ui.yours')}</span>
                            {cr.error ? (
                              <span className="run-error">💥 {cr.error.code ? t(`errors.${cr.error.code}`) : cr.error.message}</span>
                            ) : (
                              <OutputView output={cr.actual!} showNumber={showNumber} />
                            )}
                          </div>
                          {!cr.pass && (
                            <div className="res-line wanted">
                              <span className="io-label">{t('ui.wanted')}</span>
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
                            ? `${t('ui.secretResult', { ok, all: secret.length })} ${ok === secret.length ? '✅' : '❌'}`
                            : t('ui.secretWait')}
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
                      <span className="kind in">{t('machine.in')}</span>
                    </div>
                    <MarbleRow marbles={card.tc.input} showNumber={showNumber} />
                  </div>
                  <div className="machine-waiting">
                    <div className="gear">⚙️</div>
                    <div>
                      <strong>{t('ui.runThis')}</strong> - {t('ui.idleRun', { label: card.label })}
                    </div>
                    <div>
                      <strong>{t('ui.stepByStep')}</strong> - {t('ui.idleStep')}
                    </div>
                    <div>
                      <strong>{t('ui.checkAll')}</strong> - {t('ui.idleCheck')}
                    </div>
                  </div>
                  <div className="stage final">
                    <div className="io-box expected">
                      <div className="io-label">{t('ui.expectedOut')}</div>
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
            <h2>{level.exam ? t('ui.modal.examPassed') : t('ui.modal.complete')}</h2>
            <div className="big-stars">
              <Stars n={success} />
            </div>
            <p>{success >= 3 ? t('ui.modal.perfect') : t('ui.modal.solved')}</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setSuccess(null)}>
                {t('ui.modal.stay')}
              </button>
              {level.exam ? (
                onNextSection ? (
                  <button className="btn run" onClick={onNextSection}>
                    {t('ui.modal.nextSection')}
                  </button>
                ) : (
                  <button className="btn run" onClick={onBack}>
                    {t('ui.modal.finished')}
                  </button>
                )
              ) : (
                <>
                  {examReady(progressAfter) && (
                    <button className="btn check" onClick={onExam}>
                      {t('ui.modal.toExam')}
                    </button>
                  )}
                  {onNext && (
                    <button className="btn run" onClick={onNext}>
                      {t('ui.modal.next')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {spellbook && (
        <div className="modal-backdrop" onClick={() => setSpellbook(false)}>
          <div className="modal spellbook" onClick={(e) => e.stopPropagation()}>
            <h2>{t('ui.spellbookTitle')}</h2>
            <p className="muted">{t('ui.spellbookText')}</p>
            <div className="spells">
              {concepts.map((c) => (
                <div key={c} className="spell">
                  <h3>{t(`concepts.${c}.title`)}</h3>
                  <CodeSample code={CONCEPT_CODE[c]} concepts={concepts} />
                  <p>{t(`concepts.${c}.text`)}</p>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn run" onClick={() => setSpellbook(false)}>
                {t('ui.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

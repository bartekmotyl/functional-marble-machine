import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Values } from '../lang/interpreter'
import { COLORS, PATTERNS, SIZES, type Marble as M, type PropName } from '../lang/marble'
import type { CmpOp } from '../lang/parser'
import type { Concept } from '../game/levels'
import { t } from '../i18n'
import { kw, word } from '../i18n/words'
import { Marble } from '../ui/Marble'
import { KindIcon } from '../ui/icons'
import {
  bin,
  cmp,
  defaultVal,
  defaultValue,
  lit,
  newBlock,
  nid,
  numProp,
  tidyCond,
  total,
  type Block,
  type BlockProgram,
  type Cond,
  type MathOp,
  type Num,
  type ReduceMode,
  type Val,
} from './model'
import { Picker, type Option } from './Picker'

// ---------------------------------------------------------------- context

interface EditorCtx {
  concepts: Set<Concept>
  readOnly: boolean
  edit: (id: string, fn: (node: any) => any) => void
  addQuestion: (id: string, op: 'and' | 'or') => void
  /** questions and boxes that were just added - they pop in with an animation */
  fresh: Set<string>
}
const Ctx = createContext<EditorCtx>({
  concepts: new Set(),
  readOnly: true,
  edit: () => {},
  addQuestion: () => {},
  fresh: new Set(),
})

/** Ids of all questions and boxes in the program. */
function condIds(program: BlockProgram): Set<string> {
  const ids = new Set<string>()
  const walk = (c: Cond | undefined) => {
    if (!c) return
    ids.add(c.id)
    if (c.t === 'group') c.items.forEach(walk)
  }
  for (const b of program) if (b.kind !== 'reduce') walk(b.cond)
  return ids
}

/**
 * Questions and boxes that appeared since the last edit. A program that was replaced as a
 * whole (new level, reset) shares no ids with the old one - nothing is animated then.
 */
function useFresh(program: BlockProgram): Set<string> {
  const prev = useRef<Set<string> | null>(null)
  const ids = useMemo(() => condIds(program), [program])
  const fresh = useMemo(() => {
    const before = prev.current
    if (!before || ![...ids].some((id) => before.has(id))) return new Set<string>()
    return new Set([...ids].filter((id) => !before.has(id)))
  }, [ids])
  useEffect(() => {
    prev.current = ids
  }, [ids])
  return fresh
}

/** Values for the marble currently being explained (only inside the active block). */
export interface Trace {
  values: Values
  marble: M
}
const TraceCtx = createContext<Trace | null>(null)

const useEd = () => useContext(Ctx)

/** Boxes may be nested only this deep: a box inside a box, but no deeper (kids get lost). */
const MAX_BOX_DEPTH = 2

// ---------------------------------------------------------------- option lists

const MARBLE_FOR = (prop: PropName, v: string): M => ({
  color: prop === 'color' ? (v as M['color']) : 'blue',
  size: prop === 'size' ? (v as M['size']) : 'medium',
  pattern: prop === 'pattern' ? (v as M['pattern']) : 'plain',
  number: 0,
})

function wordOptions(prop: PropName): Option<string>[] {
  const list = prop === 'color' ? COLORS : prop === 'size' ? SIZES : PATTERNS
  return list.map((v) => ({
    value: v,
    className: prop === 'color' ? `c-${v}` : '',
    label: (
      <span className="opt-with-icon">
        <span className="mini" aria-hidden>
          <Marble marble={MARBLE_FOR(prop, v)} title="" />
        </span>
        {word(v)}
      </span>
    ),
  }))
}

const NUMBERS = [...Array.from({ length: 21 }, (_, i) => i), 25, 50, 100]
const MATH_LABEL: Record<MathOp, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

function propOptions(concepts: Set<Concept>, forMap: boolean): Option<PropName>[] {
  const props: PropName[] = ['color']
  if (concepts.has('size')) props.push('size')
  if (concepts.has('pattern')) props.push('pattern')
  if (forMap ? concepts.has('math') : concepts.has('compare')) props.push('number')
  return props.map((p) => ({ value: p, label: word(p), className: 'w-prop' }))
}

function opOptions(prop: PropName, concepts: Set<Concept>): Option<CmpOp>[] {
  const ops: CmpOp[] = ['==']
  if (concepts.has('isnot')) ops.push('!=')
  if ((prop === 'number' || prop === 'size') && concepts.has('compare')) ops.push('>', '<', '>=', '<=')
  const label: Record<CmpOp, string> = { '==': kw('is'), '!=': kw('isnot'), '>': '>', '<': '<', '>=': '>=', '<=': '<=' }
  return ops.map((o) => ({ value: o, label: label[o], className: 'w-logic' }))
}

// ---------------------------------------------------------------- small pieces

function Verdict({ ok }: { ok: boolean }) {
  return <span className={`verdict-badge ${ok ? 'yes' : 'no'}`}>{ok ? t('blocks.yes') : t('blocks.no')}</span>
}

function IconBtn({ onClick, title, children, className = '' }: { onClick: () => void; title: string; children: ReactNode; className?: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`} title={title} aria-label={title} onClick={onClick}>
      {children}
    </button>
  )
}

const other = (op: 'and' | 'or') => (op === 'and' ? 'or' : 'and')

// ---------------------------------------------------------------- questions

interface CondProps {
  c: Cond
  /** how many boxes this question sits in */
  depth?: number
  /** the box around it, if any */
  parentOp?: 'and' | 'or'
  removable?: boolean
}

function CmpView({ c, depth = 0, parentOp, removable }: CondProps & { c: Extract<Cond, { t: 'cmp' }> }) {
  const ed = useEd()
  const trace = useContext(TraceCtx)
  const result = trace?.values.get(c.id)
  const isNumber = c.prop === 'number'
  const parity = c.value === 'even' || c.value === 'odd'

  const valueOptions: Option<string | number>[] = isNumber
    ? [
        ...(ed.concepts.has('evenodd') && (c.op === '==' || c.op === '!=')
          ? (['even', 'odd'] as const).map((v) => ({ value: v, label: word(v), className: 'w-value' }))
          : []),
        ...NUMBERS.map((n) => ({ value: n, label: String(n), className: 'w-num' })),
      ]
    : wordOptions(c.prop)

  // Joining buttons: a lonely question can start a box; inside a box you may start
  // a box of the other kind - but only one level deep.
  const joins: ('and' | 'or')[] = []
  if (!parentOp) {
    if (ed.concepts.has('and')) joins.push('and')
    if (ed.concepts.has('or')) joins.push('or')
  } else if (ed.concepts.has('brackets') && depth < MAX_BOX_DEPTH && ed.concepts.has(other(parentOp))) {
    joins.push(other(parentOp))
  }

  return (
    <span className={`q ${result === undefined ? '' : result ? 'yes' : 'no'} ${ed.fresh.has(c.id) ? 'fresh' : ''}`}>
      <Picker
        value={c.prop}
        options={propOptions(ed.concepts, false)}
        readOnly={ed.readOnly}
        onPick={(prop) => ed.edit(c.id, (n) => ({ ...n, prop, op: '==', value: defaultValue(prop) }))}
      />
      <Picker
        value={c.op}
        options={opOptions(c.prop, ed.concepts)}
        readOnly={ed.readOnly}
        onPick={(op) => ed.edit(c.id, (n) => ({ ...n, op, value: parity && op !== '==' && op !== '!=' ? 5 : n.value }))}
      />
      <Picker
        value={c.value}
        options={valueOptions}
        readOnly={ed.readOnly}
        grid={isNumber}
        onPick={(value) =>
          ed.edit(c.id, (n) => ({ ...n, value, op: (value === 'even' || value === 'odd') && n.op !== '!=' ? '==' : n.op }))
        }
      />
      {trace && result !== undefined && (
        <>
          <span className="actual">{t('blocks.itIs', { value: word(trace.marble[c.prop]) })}</span>
          <Verdict ok={!!result} />
        </>
      )}
      {!ed.readOnly && (
        <span className="q-tools">
          {joins.map((op) => (
            <IconBtn
              key={op}
              className={`join ${op}`}
              title={parentOp ? t('blocks.newBoxTitle', { op: kw(op) }) : t('blocks.joinTitle', { op: kw(op) })}
              onClick={() => ed.addQuestion(c.id, op)}
            >
              + {kw(op)}
            </IconBtn>
          ))}
          {removable && (
            <IconBtn className="remove" title={t('blocks.removeQuestion')} onClick={() => ed.edit(c.id, () => null)}>
              ✕
            </IconBtn>
          )}
        </span>
      )}
    </span>
  )
}

export function CondView({ c, depth = 0, parentOp, removable = false }: CondProps) {
  const ed = useEd()
  const trace = useContext(TraceCtx)
  if (c.t === 'cmp') return <CmpView c={c} depth={depth} parentOp={parentOp} removable={removable} />
  const result = trace?.values.get(c.id)
  const canSwitch = ed.concepts.has('and') && ed.concepts.has('or')
  const last = c.items[c.items.length - 1]
  return (
    <div className={`group ${c.op} ${result === undefined ? '' : result ? 'yes' : 'no'} ${ed.fresh.has(c.id) ? 'fresh' : ''}`}>
      <div className="group-head">
        <Picker
          value={c.op}
          readOnly={ed.readOnly || !canSwitch}
          className="group-title"
          title={t('blocks.switchBox')}
          options={(['and', 'or'] as const).map((op) => ({ value: op, label: t(`blocks.box.${op}`), className: `box-${op}` }))}
          onPick={(op) => ed.edit(c.id, (g) => tidyCond({ ...g, op }))}
        />
        {result !== undefined && <Verdict ok={!!result} />}
        {!ed.readOnly && removable && (
          <IconBtn className="remove" title={t('blocks.removeBox')} onClick={() => ed.edit(c.id, () => null)}>
            ✕
          </IconBtn>
        )}
      </div>
      {c.items.map((item, i) => (
        <div key={item.id} className="group-item">
          {i > 0 && <div className={`joint ${c.op}`}>{kw(c.op)}</div>}
          <CondView c={item} depth={depth + 1} parentOp={c.op} removable />
        </div>
      ))}
      {!ed.readOnly && (
        <IconBtn className={`join ${c.op} box-add`} title={t('blocks.addToBox')} onClick={() => ed.addQuestion(last.id, c.op)}>
          + {kw(c.op)}
        </IconBtn>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- numbers

function NumView({ n, inFold, top = false }: { n: Num; inFold: boolean; top?: boolean }) {
  const ed = useEd()
  const trace = useContext(TraceCtx)
  const v = trace?.values.get(n.id)

  let body: ReactNode
  if (n.t === 'bin') {
    body = (
      <span className="math">
        <NumView n={n.l} inFold={inFold} />
        <Picker
          value={n.op}
          readOnly={ed.readOnly}
          options={(['+', '-', '*', '/'] as MathOp[]).map((o) => ({ value: o, label: MATH_LABEL[o], className: 'w-sym' }))}
          onPick={(op) => ed.edit(n.id, (x) => ({ ...x, op }))}
        />
        <NumView n={n.r} inFold={inFold} />
        {v !== undefined && <span className="eq">= {String(v)}</span>}
        {!ed.readOnly && top && (
          <IconBtn className="remove" title={t('blocks.removeMath')} onClick={() => ed.edit(n.id, (x) => x.l)}>
            ✕
          </IconBtn>
        )}
      </span>
    )
  } else {
    const key = n.t === 'lit' ? n.v : n.t
    const options: Option<string | number>[] = [
      { value: 'prop', label: word('number'), className: 'w-prop' },
      ...(inFold ? [{ value: 'total', label: kw('total'), className: 'w-prop' }] : []),
      ...NUMBERS.map((x) => ({ value: x, label: String(x), className: 'w-num' })),
    ]
    body = (
      <span className="leaf">
        <Picker
          value={key}
          options={options}
          grid
          readOnly={ed.readOnly}
          onPick={(k) => ed.edit(n.id, () => (k === 'prop' ? numProp() : k === 'total' ? total() : lit(k as number)))}
        />
        {v !== undefined && n.t !== 'lit' && <span className="eq small">({String(v)})</span>}
      </span>
    )
  }
  return (
    <>
      {body}
      {top && !ed.readOnly && ed.concepts.has('math') && (
        <IconBtn className="add-math" title={t('blocks.addMathTitle')} onClick={() => ed.edit(n.id, (x) => bin('+', x, lit(1)))}>
          {t('blocks.addMath')}
        </IconBtn>
      )}
    </>
  )
}

function ValView({ v, prop }: { v: Val; prop: PropName }) {
  const ed = useEd()
  if (v.t !== 'word') return <NumView n={v} inFold={false} top />
  return <Picker value={v.v} options={wordOptions(prop)} readOnly={ed.readOnly} onPick={(w) => ed.edit(v.id, (x) => ({ ...x, v: w }))} />
}

// ---------------------------------------------------------------- blocks

function BlockBody({ b }: { b: Block }) {
  const ed = useEd()
  switch (b.kind) {
    case 'filter':
      return (
        <div className="block-body">
          <Picker
            value={b.negate ? 'drop' : 'keep'}
            readOnly={ed.readOnly || (!ed.concepts.has('negate') && !b.negate)}
            className={`filter-mode ${b.negate ? 'drop' : 'keep'}`}
            options={[
              { value: 'keep', label: t('blocks.keepWhere') },
              { value: 'drop', label: t('blocks.dropWhere') },
            ]}
            onPick={(m) => ed.edit(b.id, (x) => ({ ...x, negate: m === 'drop' || undefined }))}
          />
          <CondView c={b.cond} />
        </div>
      )
    case 'map':
      return (
        <div className="block-body">
          <div className="assigns">
            {b.assigns.map((a) => (
              <div key={a.id} className="assign">
                <Picker
                  value={a.prop}
                  options={propOptions(ed.concepts, true)}
                  readOnly={ed.readOnly}
                  onPick={(prop) => ed.edit(a.id, (x) => ({ ...x, prop, value: defaultVal(prop) }))}
                />
                <span className="arrow-word">{kw('becomes')}</span>
                <ValView v={a.value} prop={a.prop} />
                {!ed.readOnly && b.assigns.length > 1 && (
                  <IconBtn className="remove" title={t('blocks.removeChange')} onClick={() => ed.edit(a.id, () => null)}>
                    ✕
                  </IconBtn>
                )}
              </div>
            ))}
          </div>
          {!ed.readOnly && ed.concepts.has('mapmany') && (
            <IconBtn
              className="add"
              title={t('blocks.changeMoreTitle')}
              onClick={() => {
                const used = new Set(b.assigns.map((a) => a.prop))
                const prop = (['color', 'size', 'pattern', 'number'] as PropName[]).find((p) => !used.has(p)) ?? 'color'
                ed.edit(b.id, (x) => ({ ...x, assigns: [...x.assigns, { id: nid(), prop, value: defaultVal(prop) }] }))
              }}
            >
              {t('blocks.changeMore')}
            </IconBtn>
          )}
          {b.cond ? (
            <div className="only-if">
              <span className="say">{kw('onlyIf')}</span>
              <CondView c={b.cond} />
              {!ed.readOnly && (
                <IconBtn className="remove" title={t('blocks.removeOnlyIf')} onClick={() => ed.edit(b.id, (x) => ({ ...x, cond: undefined }))}>
                  ✕
                </IconBtn>
              )}
            </div>
          ) : (
            !ed.readOnly &&
            ed.concepts.has('mapif') && (
              <IconBtn className="add" title={t('blocks.onlyIfTitle')} onClick={() => ed.edit(b.id, (x) => ({ ...x, cond: cmp() }))}>
                {t('blocks.addOnlyIf')}
              </IconBtn>
            )
          )}
        </div>
      )
    case 'reduce': {
      const modes: ReduceMode[] = ['count']
      if (ed.concepts.has('sum')) modes.push('sum')
      if (ed.concepts.has('maxmin')) modes.push('max', 'min')
      if (ed.concepts.has('fold')) modes.push('from')
      return (
        <div className="block-body">
          <Picker
            value={b.mode}
            readOnly={ed.readOnly}
            options={modes.map((m) => ({ value: m, label: kw(m), className: 'w-red' }))}
            onPick={(mode) =>
              ed.edit(b.id, (x) => ({
                ...x,
                mode,
                expr: mode === 'from' ? bin('+', total(), numProp()) : x.mode === 'from' ? numProp() : x.expr,
              }))
            }
          />
          {b.mode === 'count' && <span className="say">{t('blocks.howMany')}</span>}
          {(b.mode === 'sum' || b.mode === 'max' || b.mode === 'min') && (
            <>
              <span className="say">{t(`blocks.say.${b.mode}`)}</span>
              <NumView n={b.expr} inFold={false} top />
            </>
          )}
          {b.mode === 'from' && (
            <div className="fold">
              <div>
                <span className="say">{t('blocks.totalStarts')}</span>
                <Picker
                  value={b.start}
                  grid
                  readOnly={ed.readOnly}
                  options={NUMBERS.map((x) => ({ value: x, label: String(x), className: 'w-num' }))}
                  onPick={(start) => ed.edit(b.id, (x) => ({ ...x, start }))}
                />
              </div>
              <div>
                <span className="say">{t('blocks.totalBecomes')}</span>
                <NumView n={b.expr} inFold top />
              </div>
            </div>
          )}
        </div>
      )
    }
  }
}

export interface ActiveInfo {
  index: number
  trace: Trace | null
  status: ReactNode
}

interface Props {
  program: BlockProgram
  concepts: Concept[]
  readOnly?: boolean
  onChange?: (p: BlockProgram) => void
  edit?: (id: string, fn: (node: any) => any) => void
  addQuestion?: (id: string, op: 'and' | 'or') => void
  active?: ActiveInfo | null
  compact?: boolean
}

export function BlockEditor({ program, concepts, readOnly = false, onChange, edit, addQuestion, active, compact }: Props) {
  const ctx: EditorCtx = {
    concepts: new Set(concepts),
    readOnly,
    edit: edit ?? (() => {}),
    addQuestion: addQuestion ?? (() => {}),
    fresh: useFresh(program),
  }
  const reduceAt = program.findIndex((b) => b.kind === 'reduce')
  const conceptSet = ctx.concepts
  const activeRef = useRef<HTMLDivElement>(null)

  // keep the block that is running in view while stepping through
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active?.index])

  const add = (kind: Block['kind']) => {
    const b = newBlock(kind)
    const next = [...program]
    if (reduceAt >= 0 && kind !== 'reduce') next.splice(reduceAt, 0, b)
    else next.push(b)
    onChange?.(next)
  }
  const move = (i: number, d: number) => {
    const next = [...program]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange?.(next)
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className={`blocks ${compact ? 'compact' : ''} ${readOnly ? 'read-only' : ''}`}>
        {program.length === 0 && !compact && <div className="blocks-empty">{t('blocks.empty')}</div>}
        {program.map((b, i) => {
          const isActive = active?.index === i
          const canDown = i < program.length - 1 && program[i + 1].kind !== 'reduce'
          const canUp = i > 0 && b.kind !== 'reduce'
          return (
            <div
              key={b.id}
              ref={isActive ? activeRef : undefined}
              className={`block ${b.kind} ${isActive ? 'active' : ''} ${active && active.index > i ? 'done' : ''}`}
            >
              {!compact && <div className="block-num">{i + 1}</div>}
              <div className="block-main">
                <div className="block-head">
                  <span className={`kind-chip ${b.kind}`}>
                    <KindIcon kind={b.kind} /> {kw(b.kind)}
                  </span>
                  {isActive && active?.status}
                  {!readOnly && (
                    <span className="block-tools">
                      <IconBtn title={t('blocks.moveUp')} onClick={() => move(i, -1)} className={canUp ? '' : 'hidden'}>
                        ▲
                      </IconBtn>
                      <IconBtn title={t('blocks.moveDown')} onClick={() => move(i, 1)} className={canDown ? '' : 'hidden'}>
                        ▼
                      </IconBtn>
                      <IconBtn title={t('blocks.deleteStep')} className="remove" onClick={() => onChange?.(program.filter((x) => x !== b))}>
                        🗑
                      </IconBtn>
                    </span>
                  )}
                </div>
                <TraceCtx.Provider value={isActive ? active?.trace ?? null : null}>
                  <BlockBody b={b} />
                </TraceCtx.Provider>
              </div>
            </div>
          )
        })}
        {!readOnly && (
          <div className="palette">
            <span className="say">{t('blocks.addStep')}</span>
            <button type="button" className="add-block filter" onClick={() => add('filter')}>
              + <KindIcon kind="filter" /> {kw('filter')}
            </button>
            {conceptSet.has('map') && (
              <button type="button" className="add-block map" onClick={() => add('map')}>
                + 🎨 {kw('map')}
              </button>
            )}
            {conceptSet.has('count') && (
              <button type="button" className="add-block reduce" disabled={reduceAt >= 0} onClick={() => add('reduce')}>
                + 🧮 {kw('reduce')}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

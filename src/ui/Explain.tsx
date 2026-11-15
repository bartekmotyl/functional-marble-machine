import type { ReactNode } from 'react'
import type { Stage, Values } from '../lang/interpreter'
import type { Marble } from '../lang/marble'
import { OP_WORD, type Block, type Cond, type Num } from '../blocks/model'

const MATH: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

/** A question with ✓/✗ marks on every part, e.g. "(color is red ✓ or color is blue ✗) and size is big ✗". */
export function CondTrace({ c, values, marble, nested = false }: { c: Cond; values: Values; marble: Marble; nested?: boolean }) {
  const ok = values.get(c.id)
  if (c.t === 'cmp')
    return (
      <span className={`ct ${ok ? 'yes' : 'no'}`}>
        {c.prop} {OP_WORD[c.op]} {String(c.value)} <small>(it is {String(marble[c.prop])})</small> {ok ? '✓' : '✗'}
      </span>
    )
  return (
    <span className={`ct-group ${c.op} ${ok ? 'yes' : 'no'}`}>
      {nested && '( '}
      {c.items.map((item, i) => (
        <span key={item.id}>
          {i > 0 && <b className={`ct-joint ${c.op}`}> {c.op} </b>}
          <CondTrace c={item} values={values} marble={marble} nested />
        </span>
      ))}
      {nested && ' )'}
      {nested && <span className="ct-mark">{ok ? '✓' : '✗'}</span>}
    </span>
  )
}

/** Math with the numbers filled in, e.g. "4 × 2". */
function numSub(n: Num, values: Values, nested = false): string {
  switch (n.t) {
    case 'lit':
      return String(n.v)
    case 'prop':
    case 'total':
      return String(values.get(n.id))
    case 'bin': {
      const s = `${numSub(n.l, values, true)} ${MATH[n.op]} ${numSub(n.r, values, true)}`
      return nested ? `(${s})` : s
    }
  }
}

function numWords(n: Num): string {
  switch (n.t) {
    case 'lit':
      return String(n.v)
    case 'prop':
      return 'number'
    case 'total':
      return 'total'
    case 'bin':
      return `${numWords(n.l)} ${MATH[n.op]} ${numWords(n.r)}`
  }
}

export function NumTrace({ n, values }: { n: Num; values: Values }) {
  const v = values.get(n.id)
  if (n.t === 'lit') return <span className="nt">{n.v}</span>
  if (n.t !== 'bin')
    return (
      <span className="nt">
        {numWords(n)} = <b>{String(v)}</b>
      </span>
    )
  return (
    <span className="nt">
      {numWords(n)} = {numSub(n, values)} = <b>{String(v)}</b>
    </span>
  )
}

/** Why did this marble do what it did at this step? */
export function Explain({ block, stage, index }: { block: Block; stage: Stage; index: number }): ReactNode {
  const values = stage.values[index]
  const marble = stage.input[index]
  if (!values || !marble) return null

  if (block.kind === 'filter' && stage.kind === 'filter') {
    const kept = stage.kept[index]
    return (
      <div className="explain">
        <div className="explain-q">
          <CondTrace c={block.cond} values={values} marble={marble} />
        </div>
        <div className={`explain-result ${kept ? 'yes' : 'no'}`}>
          {kept ? '✓ Yes - the marble rolls on.' : '✗ No - the marble drops out.'}
        </div>
      </div>
    )
  }

  if (block.kind === 'map' && stage.kind === 'map') {
    const changed = stage.changed[index]
    return (
      <div className="explain">
        {block.cond && (
          <div className="explain-q">
            only if <CondTrace c={block.cond} values={values} marble={marble} />
          </div>
        )}
        {changed ? (
          block.assigns.map((a) => (
            <div key={a.id} className="explain-result yes">
              {a.prop} becomes{' '}
              {a.value.t === 'word' ? <b>{a.value.v}</b> : <NumTrace n={a.value} values={values} />}
              {String(marble[a.prop]) !== String(stage.output[index][a.prop]) ? (
                <small> (was {String(marble[a.prop])})</small>
              ) : (
                <small> (it already was)</small>
              )}
            </div>
          ))
        ) : (
          <div className="explain-result no">✗ The answer is no, so this marble stays the same.</div>
        )}
      </div>
    )
  }

  if (block.kind === 'reduce' && stage.kind === 'reduce') {
    const before = index === 0 ? stage.start : stage.accs[index - 1]
    const after = stage.accs[index]
    let text: ReactNode
    switch (block.mode) {
      case 'count':
        text = (
          <>
            count was {before}, one more marble → <b>{after}</b>
          </>
        )
        break
      case 'sum':
        text = (
          <>
            sum was {before}, add <NumTrace n={block.expr} values={values} /> → <b>{after}</b>
          </>
        )
        break
      case 'max':
      case 'min':
        text = (
          <>
            {block.mode === 'max' ? 'biggest' : 'smallest'} so far: {before ?? 'nothing yet'}, this marble: <NumTrace n={block.expr} values={values} />{' '}
            → <b>{after}</b>
          </>
        )
        break
      case 'from':
        text = (
          <>
            total was {before}. New total: <NumTrace n={block.expr} values={values} />
          </>
        )
        break
    }
    return (
      <div className="explain">
        <div className="explain-result yes">{text}</div>
      </div>
    )
  }
  return null
}

/** A short label for the active block while stepping through. */
export function StepStatus({ stage, index }: { stage: Stage; index: number }) {
  if (index < 0) return <span className="step-status">no marbles here</span>
  if (stage.kind === 'filter')
    return <span className={`step-status ${stage.kept[index] ? 'yes' : 'no'}`}>{stage.kept[index] ? '✓ keep' : '✗ drop'}</span>
  if (stage.kind === 'map')
    return <span className={`step-status ${stage.changed[index] ? 'yes' : 'no'}`}>{stage.changed[index] ? '✨ changed' : 'unchanged'}</span>
  const before = index === 0 ? stage.start : stage.accs[index - 1]
  return (
    <span className="step-status yes">
      {stage.label}: {before ?? '–'} → {stage.accs[index]}
    </span>
  )
}

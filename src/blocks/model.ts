/**
 * The block program: what the clickable editor edits.
 *
 * Blocks make structure explicit: "and"/"or" questions live in boxes (groups), and math
 * lives in nested boxes, so there are no hidden priority rules. Blocks can be turned
 * into text (to show/save the code) and into the parser's AST (to run it).
 */
import { COLORS, PATTERNS, SIZES, type PropName } from '../lang/marble'
import { LITERALS, checkProgram, parseProgram, type CmpOp, type Expr, type Program, type Step } from '../lang/parser'

export type MathOp = '+' | '-' | '*' | '/'

export type Cond =
  | { id: string; t: 'cmp'; prop: PropName; op: CmpOp; value: string | number }
  | { id: string; t: 'group'; op: 'and' | 'or'; items: Cond[] }

export type Num =
  | { id: string; t: 'lit'; v: number }
  | { id: string; t: 'prop' }
  | { id: string; t: 'total' }
  | { id: string; t: 'bin'; op: MathOp; l: Num; r: Num }

/** Value for a map change: a word (color/size/pattern) or a number expression. */
export type Val = { id: string; t: 'word'; v: string } | Num

export interface Assign {
  id: string
  prop: PropName
  value: Val
}

export type ReduceMode = 'count' | 'sum' | 'max' | 'min' | 'from'

export type Block =
  | { id: string; kind: 'filter'; cond: Cond }
  | { id: string; kind: 'map'; assigns: Assign[]; cond?: Cond }
  | { id: string; kind: 'reduce'; mode: ReduceMode; expr: Num; start: number }

export type BlockProgram = Block[]

// ---------------------------------------------------------------- ids & factories

let counter = 0
export const nid = () => `b${(++counter).toString(36)}`

export const cmp = (prop: PropName = 'color', op: CmpOp = '==', value: string | number = 'red'): Cond => ({
  id: nid(),
  t: 'cmp',
  prop,
  op,
  value,
})
export const numProp = (): Num => ({ id: nid(), t: 'prop' })
export const lit = (v: number): Num => ({ id: nid(), t: 'lit', v })
export const total = (): Num => ({ id: nid(), t: 'total' })
export const bin = (op: MathOp, l: Num, r: Num): Num => ({ id: nid(), t: 'bin', op, l, r })
export const word = (v: string): Val => ({ id: nid(), t: 'word', v })

export function defaultValue(prop: PropName): string | number {
  if (prop === 'color') return 'red'
  if (prop === 'size') return 'big'
  if (prop === 'pattern') return 'striped'
  return 5
}

export function defaultVal(prop: PropName): Val {
  return prop === 'number' ? numProp() : word(defaultValue(prop) as string)
}

export function newBlock(kind: Block['kind']): Block {
  if (kind === 'filter') return { id: nid(), kind, cond: cmp() }
  if (kind === 'map') return { id: nid(), kind, assigns: [{ id: nid(), prop: 'color', value: word('blue') }] }
  return { id: nid(), kind: 'reduce', mode: 'count', expr: numProp(), start: 0 }
}

export function propValues(prop: PropName): readonly string[] {
  return prop === 'color' ? COLORS : prop === 'size' ? SIZES : prop === 'pattern' ? PATTERNS : []
}

// ---------------------------------------------------------------- blocks -> text

export const OP_WORD: Record<CmpOp, string> = { '==': 'is', '!=': 'is not', '<': '<', '>': '>', '<=': '<=', '>=': '>=' }
const PREC: Record<MathOp, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

export function condText(c: Cond, nested = false): string {
  if (c.t === 'cmp') return `${c.prop} ${OP_WORD[c.op]} ${c.value}`
  const inner = c.items.map((i) => condText(i, true)).join(` ${c.op} `)
  return nested ? `(${inner})` : inner
}

export function numText(n: Num): string {
  switch (n.t) {
    case 'lit':
      return String(n.v)
    case 'prop':
      return 'number'
    case 'total':
      return 'total'
    case 'bin': {
      const side = (x: Num, right: boolean) => {
        const s = numText(x)
        if (x.t !== 'bin') return s
        const needs = PREC[x.op] < PREC[n.op] || (right && PREC[x.op] === PREC[n.op])
        return needs ? `(${s})` : s
      }
      return `${side(n.l, false)} ${n.op} ${side(n.r, true)}`
    }
  }
}

function valText(v: Val): string {
  return v.t === 'word' ? v.v : numText(v)
}

export function blockText(b: Block): string {
  switch (b.kind) {
    case 'filter':
      return `filter ${condText(b.cond)}`
    case 'map':
      return `map ${b.assigns.map((a) => `${a.prop} -> ${valText(a.value)}`).join(', ')}${b.cond ? ` if ${condText(b.cond)}` : ''}`
    case 'reduce':
      if (b.mode === 'count') return 'reduce count'
      if (b.mode === 'from') return `reduce from ${b.start} : ${numText(b.expr)}`
      return `reduce ${b.mode} ${numText(b.expr)}`
  }
}

export function toSource(p: BlockProgram): string {
  return p.map(blockText).join('\n')
}

// ---------------------------------------------------------------- blocks -> runnable AST

const at = { col: 0, end: 0 }

function condExpr(c: Cond): Expr {
  if (c.t === 'cmp') {
    const r: Expr =
      typeof c.value === 'number'
        ? { k: 'num', v: c.value, ...at }
        : { k: 'lit', v: c.value, cat: LITERALS[c.value], ...at }
    return { k: 'cmp', op: c.op, l: { k: 'prop', name: c.prop, ...at }, r, id: c.id, ...at }
  }
  let e = condExpr(c.items[0])
  for (const item of c.items.slice(1)) e = { k: 'logic', op: c.op, l: e, r: condExpr(item), ...at }
  return { ...e, id: c.id }
}

function numExpr(n: Num): Expr {
  switch (n.t) {
    case 'lit':
      return { k: 'num', v: n.v, id: n.id, ...at }
    case 'prop':
      return { k: 'prop', name: 'number', id: n.id, ...at }
    case 'total':
      return { k: 'total', id: n.id, ...at }
    case 'bin':
      return { k: 'bin', op: n.op, l: numExpr(n.l), r: numExpr(n.r), id: n.id, ...at }
  }
}

function valExpr(v: Val): Expr {
  return v.t === 'word' ? { k: 'lit', v: v.v, cat: LITERALS[v.v], id: v.id, ...at } : numExpr(v)
}

export function toProgram(p: BlockProgram): Program {
  const steps: Step[] = p.map((b, i): Step => {
    const line = i + 1
    switch (b.kind) {
      case 'filter':
        return { line, kind: 'filter', cond: condExpr(b.cond) }
      case 'map':
        return {
          line,
          kind: 'map',
          assigns: b.assigns.map((a) => ({ prop: a.prop, expr: valExpr(a.value) })),
          cond: b.cond ? condExpr(b.cond) : undefined,
        }
      case 'reduce':
        if (b.mode === 'count') return { line, kind: 'count' }
        if (b.mode === 'from') return { line, kind: 'fold', start: { k: 'num', v: b.start, ...at }, body: numExpr(b.expr) }
        return { line, kind: b.mode, expr: numExpr(b.expr) }
    }
  })
  const program = { steps }
  checkProgram(program)
  return program
}

// ---------------------------------------------------------------- text -> blocks

const FLIP: Record<CmpOp, CmpOp> = { '==': '==', '!=': '!=', '<': '>', '>': '<', '<=': '>=', '>=': '<=' }
const NEGATE: Record<CmpOp, CmpOp> = { '==': '!=', '!=': '==', '<': '>=', '>': '<=', '<=': '>', '>=': '<' }

class Unsupported extends Error {}

function exprCond(e: Expr): Cond {
  if (e.k === 'logic') {
    const items: Cond[] = []
    for (const side of [e.l, e.r]) {
      const c = exprCond(side)
      if (c.t === 'group' && c.op === e.op) items.push(...c.items)
      else items.push(c)
    }
    return { id: nid(), t: 'group', op: e.op, items }
  }
  if (e.k === 'not') {
    const inner = exprCond(e.e)
    if (inner.t !== 'cmp') throw new Unsupported('not')
    return { ...inner, op: NEGATE[inner.op] }
  }
  if (e.k === 'cmp') {
    const value = (x: Expr) => (x.k === 'num' ? x.v : x.k === 'lit' ? x.v : undefined)
    if (e.l.k === 'prop' && value(e.r) !== undefined) return cmp(e.l.name, e.op, value(e.r)!)
    if (e.r.k === 'prop' && value(e.l) !== undefined) return cmp(e.r.name, FLIP[e.op], value(e.l)!)
  }
  throw new Unsupported(e.k)
}

function exprNum(e: Expr): Num {
  if (e.k === 'num') return lit(e.v)
  if (e.k === 'prop' && e.name === 'number') return numProp()
  if (e.k === 'total') return total()
  if (e.k === 'bin' && e.op !== '%') return bin(e.op, exprNum(e.l), exprNum(e.r))
  throw new Unsupported(e.k)
}

export function fromProgram(program: Program): BlockProgram {
  return program.steps.map((s): Block => {
    switch (s.kind) {
      case 'filter':
        return { id: nid(), kind: 'filter', cond: exprCond(s.cond) }
      case 'map':
        return {
          id: nid(),
          kind: 'map',
          assigns: s.assigns.map((a) => ({
            id: nid(),
            prop: a.prop,
            value: a.prop === 'number' ? exprNum(a.expr) : a.expr.k === 'lit' ? word(a.expr.v) : (() => { throw new Unsupported('value') })(),
          })),
          cond: s.cond ? exprCond(s.cond) : undefined,
        }
      case 'count':
        return { id: nid(), kind: 'reduce', mode: 'count', expr: numProp(), start: 0 }
      case 'fold': {
        if (s.start.k !== 'num') throw new Unsupported('start')
        return { id: nid(), kind: 'reduce', mode: 'from', expr: exprNum(s.body), start: s.start.v }
      }
      default:
        return { id: nid(), kind: 'reduce', mode: s.kind, expr: exprNum(s.expr), start: 0 }
    }
  })
}

/** Text -> blocks. Returns null when the text cannot be shown as blocks. */
export function fromSource(source: string): BlockProgram | null {
  try {
    return fromProgram(parseProgram(source))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- editing helpers

/**
 * Replace the node with the given id. Returning null from fn removes the node from
 * its list (or clears an optional field). Groups are tidied up afterwards.
 */
export function replaceNode(p: BlockProgram, id: string, fn: (node: any) => any): BlockProgram {
  const walk = (x: any): any => {
    if (Array.isArray(x)) {
      let changed = false
      const out: any[] = []
      for (const v of x) {
        const r = walk(v)
        if (r !== v) changed = true
        if (r !== null) out.push(r)
      }
      return changed ? out : x
    }
    if (x && typeof x === 'object') {
      if (x.id === id) return fn(x)
      let changed = false
      const out: any = {}
      for (const k of Object.keys(x)) {
        const r = walk(x[k])
        if (r !== x[k]) changed = true
        if (r === null) out[k] = undefined
        else out[k] = r
      }
      return changed ? tidy(out) : x
    }
    return x
  }
  return walk(p)
}

/** Flatten groups: a box with one question is just that question; and-in-and becomes one box. */
function tidy(x: any): any {
  if (x && x.t === 'group') {
    const items: Cond[] = []
    for (const i of x.items as Cond[]) {
      if (i.t === 'group' && i.op === x.op) items.push(...i.items)
      else items.push(i)
    }
    if (items.length === 1) return items[0]
    return { ...x, items }
  }
  return x
}

/** Add a new question next to `target`, joined with and/or. */
export function addQuestion(p: BlockProgram, targetId: string, op: 'and' | 'or', fresh: Cond): BlockProgram {
  return replaceNode(p, targetId, (node: Cond) => ({ id: nid(), t: 'group', op, items: [node, fresh] }))
}

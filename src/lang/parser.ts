import { COLORS, PATTERNS, SIZES, type PropName } from './marble'

/** A friendly error pointing at a place in the program. Lines are 1-based, columns 0-based. */
export class LangError extends Error {
  line: number
  col: number
  endCol: number
  constructor(message: string, line: number, col = 0, endCol = col + 1) {
    super(message)
    this.line = line
    this.col = col
    this.endCol = endCol
  }
}

// ---------------------------------------------------------------- tokens

type TokType = 'num' | 'word' | 'sym'
interface Token {
  t: TokType
  v: string
  col: number
  end: number
}

const SYMBOLS = ['->', '==', '!=', '<=', '>=', '<', '>', '=', '+', '-', '*', '/', '%', '(', ')', ',', ':']

export function tokenizeLine(text: string, line: number): Token[] {
  const toks: Token[] = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '#') break // comment until end of line
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < text.length && /[0-9]/.test(text[j])) j++
      toks.push({ t: 'num', v: text.slice(i, j), col: i, end: j })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i
      while (j < text.length && /[a-zA-Z_0-9]/.test(text[j])) j++
      toks.push({ t: 'word', v: text.slice(i, j).toLowerCase(), col: i, end: j })
      i = j
      continue
    }
    const sym = SYMBOLS.find((s) => text.startsWith(s, i))
    if (sym) {
      toks.push({ t: 'sym', v: sym, col: i, end: i + sym.length })
      i += sym.length
      continue
    }
    throw new LangError(`I don't understand the symbol "${c}".`, line, i)
  }
  return toks
}

// ---------------------------------------------------------------- AST

export type CmpOp = '==' | '!=' | '<' | '>' | '<=' | '>='
export type ValueType = 'number' | 'color' | 'size' | 'pattern' | 'bool' | 'parity'
type Span = { col: number; end: number; id?: string }

export type Expr = Span &
  (
    | { k: 'num'; v: number }
    | { k: 'lit'; v: string; cat: ValueType }
    | { k: 'prop'; name: PropName }
    | { k: 'total' }
    | { k: 'bin'; op: '+' | '-' | '*' | '/' | '%'; l: Expr; r: Expr }
    | { k: 'cmp'; op: '==' | '!=' | '<' | '>' | '<=' | '>='; l: Expr; r: Expr }
    | { k: 'logic'; op: 'and' | 'or'; l: Expr; r: Expr }
    | { k: 'not'; e: Expr }
  )

export interface Assign {
  prop: PropName
  expr: Expr
}

export type Step = { line: number } & (
  | { kind: 'filter'; cond: Expr }
  | { kind: 'map'; assigns: Assign[]; cond?: Expr }
  | { kind: 'count' }
  | { kind: 'sum' | 'max' | 'min'; expr: Expr }
  | { kind: 'fold'; start: Expr; body: Expr }
)
export type StepKind = Step['kind']

export interface Program {
  steps: Step[]
}

// ---------------------------------------------------------------- vocabulary

const PROP_TYPES: Record<PropName, ValueType> = {
  color: 'color',
  size: 'size',
  pattern: 'pattern',
  number: 'number',
}

export const LITERALS: Record<string, ValueType> = {}
COLORS.forEach((c) => (LITERALS[c] = 'color'))
SIZES.forEach((s) => (LITERALS[s] = 'size'))
PATTERNS.forEach((p) => (LITERALS[p] = 'pattern'))
LITERALS.even = 'parity'
LITERALS.odd = 'parity'

const KEYWORDS = ['filter', 'map', 'reduce', 'count', 'sum', 'max', 'min', 'from', 'if', 'and', 'or', 'not', 'is', 'total']

export const ALL_WORDS = [...KEYWORDS, ...Object.keys(PROP_TYPES), ...Object.keys(LITERALS)]

const TYPE_WORDS: Record<ValueType, string> = {
  number: 'a number',
  color: 'a color',
  size: 'a size',
  pattern: 'a pattern',
  bool: 'a yes/no question',
  parity: 'even/odd',
}

const CATEGORY_VALUES: Partial<Record<ValueType, readonly string[]>> = {
  color: COLORS,
  size: SIZES,
  pattern: PATTERNS,
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      // swapped neighbours ("rde" -> "red") count as one mistake
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  return d[a.length][b.length]
}

export function suggest(word: string, candidates: readonly string[] = ALL_WORDS): string | null {
  let best: string | null = null
  let bestD = Infinity
  for (const c of candidates) {
    const dist = editDistance(word, c)
    if (dist < bestD) {
      bestD = dist
      best = c
    }
  }
  return bestD <= Math.max(1, Math.floor(word.length / 3)) ? best : null
}

function unknownWord(word: string, candidates?: readonly string[]): string {
  const s = suggest(word, candidates)
  return s ? `I don't know the word "${word}". Did you mean "${s}"?` : `I don't know the word "${word}".`
}

// ---------------------------------------------------------------- parser

class LineParser {
  private pos = 0
  private toks: Token[]
  private line: number
  private lineLen: number
  inFold = false

  constructor(toks: Token[], line: number, lineLen: number) {
    this.toks = toks
    this.line = line
    this.lineLen = lineLen
  }

  peek(): Token | undefined {
    return this.toks[this.pos]
  }
  next(): Token | undefined {
    return this.toks[this.pos++]
  }
  atEnd(): boolean {
    return this.pos >= this.toks.length
  }
  isWord(v: string): boolean {
    const t = this.peek()
    return !!t && t.t === 'word' && t.v === v
  }
  isSym(v: string): boolean {
    const t = this.peek()
    return !!t && t.t === 'sym' && t.v === v
  }

  err(message: string, tok?: Token): never {
    if (tok) throw new LangError(message, this.line, tok.col, tok.end)
    throw new LangError(message, this.line, this.lineLen, this.lineLen + 1)
  }

  expectEnd() {
    const t = this.peek()
    if (t) {
      if (t.t === 'word' && (t.v === 'filter' || t.v === 'map' || t.v === 'reduce'))
        this.err(`Put "${t.v}" on a new line - every step needs its own line.`, t)
      this.err(`I didn't expect "${t.v}" here.`, t)
    }
  }

  // expr := or
  expr(): Expr {
    return this.or()
  }
  or(): Expr {
    let l = this.and()
    while (this.isWord('or')) {
      this.next()
      const r = this.and()
      l = { k: 'logic', op: 'or', l, r, col: l.col, end: r.end }
    }
    return l
  }
  and(): Expr {
    let l = this.not()
    while (this.isWord('and')) {
      this.next()
      const r = this.not()
      l = { k: 'logic', op: 'and', l, r, col: l.col, end: r.end }
    }
    return l
  }
  not(): Expr {
    if (this.isWord('not')) {
      const t = this.next()!
      const e = this.not()
      return { k: 'not', e, col: t.col, end: e.end }
    }
    return this.cmp()
  }
  cmp(): Expr {
    const l = this.add()
    let op: CmpOp | null = null
    const t = this.peek()
    if (this.isWord('is')) {
      this.next()
      op = '=='
      if (this.isWord('not')) {
        this.next()
        op = '!='
      }
    } else if (t && t.t === 'sym' && ['==', '=', '!=', '<', '>', '<=', '>='].includes(t.v)) {
      this.next()
      op = (t.v === '=' ? '==' : t.v) as CmpOp
    }
    if (!op) return l
    const r = this.add()
    return { k: 'cmp', op, l, r, col: l.col, end: r.end }
  }
  add(): Expr {
    let l = this.mul()
    while (this.isSym('+') || this.isSym('-')) {
      const op = this.next()!.v as '+' | '-'
      const r = this.mul()
      l = { k: 'bin', op, l, r, col: l.col, end: r.end }
    }
    return l
  }
  mul(): Expr {
    let l = this.unary()
    while (this.isSym('*') || this.isSym('/') || this.isSym('%')) {
      const op = this.next()!.v as '*' | '/' | '%'
      const r = this.unary()
      l = { k: 'bin', op, l, r, col: l.col, end: r.end }
    }
    return l
  }
  unary(): Expr {
    if (this.isSym('-')) {
      const t = this.next()!
      const e = this.unary()
      return { k: 'bin', op: '-', l: { k: 'num', v: 0, col: t.col, end: t.col }, r: e, col: t.col, end: e.end }
    }
    return this.primary()
  }
  primary(): Expr {
    const t = this.next()
    if (!t) this.err('Something is missing at the end of this line.')
    if (t.t === 'num') return { k: 'num', v: parseInt(t.v, 10), col: t.col, end: t.end }
    if (t.t === 'sym' && t.v === '(') {
      const e = this.expr()
      if (!this.isSym(')')) this.err('I expected a closing bracket ")" here.', this.peek())
      const close = this.next()!
      return { ...e, col: t.col, end: close.end }
    }
    if (t.t === 'word') {
      if (t.v in PROP_TYPES) return { k: 'prop', name: t.v as PropName, col: t.col, end: t.end }
      if (t.v in LITERALS) return { k: 'lit', v: t.v, cat: LITERALS[t.v], col: t.col, end: t.end }
      if (t.v === 'total') {
        if (!this.inFold) this.err('"total" only works inside "reduce from".', t)
        return { k: 'total', col: t.col, end: t.end }
      }
      if (KEYWORDS.includes(t.v)) this.err(`I didn't expect "${t.v}" here.`, t)
      this.err(unknownWord(t.v), t)
    }
    this.err(`I didn't expect "${t.v}" here.`, t)
  }

  step(): Step {
    const t = this.next()!
    const line = this.line
    if (t.t !== 'word' || !['filter', 'map', 'reduce'].includes(t.v)) {
      const s = t.t === 'word' ? suggest(t.v, ['filter', 'map', 'reduce']) : null
      this.err(
        s ? `Did you mean "${s}"? Every line starts with filter, map or reduce.` : 'Every line starts with filter, map or reduce.',
        t,
      )
    }
    if (this.atEnd()) {
      const examples: Record<string, string> = {
        filter: 'filter color is red',
        map: 'map color -> blue',
        reduce: 'reduce count',
      }
      this.err(`"${t.v}" needs more words after it, for example: ${examples[t.v]}`)
    }

    if (t.v === 'filter') {
      const cond = this.expr()
      this.expectEnd()
      return { line, kind: 'filter', cond }
    }

    if (t.v === 'map') {
      const assigns: Assign[] = []
      do {
        if (assigns.length) this.next() // the comma
        const p = this.next()
        if (!p) this.err('After the comma, tell me what else to change, like: size -> big')
        if (p.t !== 'word' || !(p.v in PROP_TYPES)) {
          const s = p.t === 'word' ? suggest(p.v, Object.keys(PROP_TYPES)) : null
          this.err(
            s
              ? `Did you mean "${s}"? After map, write what to change: color, size, pattern or number.`
              : 'After map, write what to change: color, size, pattern or number. For example: map color -> blue',
            p,
          )
        }
        if (!(this.isSym('->') || this.isSym('='))) this.err(`Use an arrow "->" to say what ${p.v} becomes, like: ${p.v} -> ...`, this.peek())
        this.next()
        if (this.atEnd()) this.err(`What should ${p.v} become? Write it after the arrow.`)
        assigns.push({ prop: p.v as PropName, expr: this.expr() })
      } while (this.isSym(','))
      let cond: Expr | undefined
      if (this.isWord('if')) {
        this.next()
        if (this.atEnd()) this.err('After "if", ask a yes/no question, like: color is red')
        cond = this.expr()
      }
      this.expectEnd()
      const seen = new Set<string>()
      for (const a of assigns) {
        if (seen.has(a.prop)) throw new LangError(`You change "${a.prop}" twice in one map.`, line, a.expr.col)
        seen.add(a.prop)
      }
      return { line, kind: 'map', assigns, cond }
    }

    // reduce
    const r = this.next()!
    if (r.t === 'word' && r.v === 'count') {
      this.expectEnd()
      return { line, kind: 'count' }
    }
    if (r.t === 'word' && (r.v === 'sum' || r.v === 'max' || r.v === 'min')) {
      if (this.atEnd()) this.err(`What should I ${r.v === 'sum' ? 'add up' : 'look at'}? For example: reduce ${r.v} number`)
      const expr = this.expr()
      this.expectEnd()
      return { line, kind: r.v, expr }
    }
    if (r.t === 'word' && r.v === 'from') {
      if (this.atEnd()) this.err('Write a starting number after "from", like: reduce from 0 : total + number')
      const start = this.expr()
      if (!this.isSym(':')) this.err('Put a colon ":" after the starting number, like: reduce from 0 : total + number', this.peek())
      this.next()
      if (this.atEnd()) this.err('After the colon, say how total changes for each marble, like: total + number')
      this.inFold = true
      const body = this.expr()
      this.inFold = false
      this.expectEnd()
      return { line, kind: 'fold', start, body }
    }
    const s = r.t === 'word' ? suggest(r.v, ['count', 'sum', 'max', 'min', 'from']) : null
    this.err(s ? `Did you mean "reduce ${s}"?` : 'After reduce, write count, sum, max, min or from.', r)
  }
}

// ---------------------------------------------------------------- type checking

function typeOf(e: Expr, line: number): ValueType {
  const fail = (msg: string, at: Span = e): never => {
    throw new LangError(msg, line, at.col, at.end)
  }
  switch (e.k) {
    case 'num':
      return 'number'
    case 'lit':
      return e.cat
    case 'prop':
      return PROP_TYPES[e.name]
    case 'total':
      return 'number'
    case 'bin': {
      const lt = typeOf(e.l, line)
      const rt = typeOf(e.r, line)
      if (lt !== 'number') fail(`You can only do math (${e.op}) with numbers, but this is ${TYPE_WORDS[lt]}.`, e.l)
      if (rt !== 'number') fail(`You can only do math (${e.op}) with numbers, but this is ${TYPE_WORDS[rt]}.`, e.r)
      return 'number'
    }
    case 'cmp': {
      const lt = typeOf(e.l, line)
      const rt = typeOf(e.r, line)
      if (e.op === '==' || e.op === '!=') {
        if (lt === rt && lt !== 'parity') return 'bool'
        if ((lt === 'number' && rt === 'parity') || (lt === 'parity' && rt === 'number')) return 'bool'
        // Friendly message for the most common mistake: "color is big"
        const propSide = e.l.k === 'prop' ? e.l : e.r.k === 'prop' ? e.r : null
        const litSide = e.l.k === 'lit' ? e.l : e.r.k === 'lit' ? e.r : null
        if (propSide && litSide && propSide.k === 'prop' && litSide.k === 'lit') {
          const options = CATEGORY_VALUES[PROP_TYPES[propSide.name]]
          if (options) fail(`"${litSide.v}" is not a ${propSide.name}. A ${propSide.name} can be: ${options.join(', ')}.`, litSide)
          if (PROP_TYPES[propSide.name] === 'number') fail(`"${litSide.v}" is not a number. A number can be even or odd, or compared with another number.`, litSide)
        }
        return fail(`I can't compare ${TYPE_WORDS[lt]} with ${TYPE_WORDS[rt]}.`)
      }
      if (lt === 'number' && rt === 'number') return 'bool'
      if (lt === 'size' && rt === 'size') return 'bool'
      return fail(`"${e.op}" works only with numbers (or sizes), not with ${TYPE_WORDS[lt === 'number' || lt === 'size' ? rt : lt]}.`)
    }
    case 'logic': {
      const lt = typeOf(e.l, line)
      const rt = typeOf(e.r, line)
      if (lt !== 'bool') fail(`Both sides of "${e.op}" must be yes/no questions, like: color is red`, e.l)
      if (rt !== 'bool') fail(`Both sides of "${e.op}" must be yes/no questions, like: color is red`, e.r)
      return 'bool'
    }
    case 'not': {
      if (typeOf(e.e, line) !== 'bool') fail('"not" must be followed by a yes/no question, like: not color is red', e.e)
      return 'bool'
    }
  }
}

function expectType(e: Expr, want: ValueType, line: number, message: string) {
  const got = typeOf(e, line)
  if (got !== want) throw new LangError(message.replace('{got}', TYPE_WORDS[got]), line, e.col, e.end)
}

export function checkStep(s: Step) {
  const yesNo = 'This must be a yes/no question, like "color is red" - but it is {got}.'
  switch (s.kind) {
    case 'filter':
      expectType(s.cond, 'bool', s.line, `filter needs a yes/no question, like "color is red" - but this is {got}.`)
      break
    case 'map':
      for (const a of s.assigns) {
        const want = PROP_TYPES[a.prop]
        const got = typeOf(a.expr, s.line)
        if (got !== want) {
          const options = CATEGORY_VALUES[want]
          throw new LangError(
            `${a.prop} must become ${TYPE_WORDS[want]}${options ? ` (${options.join(', ')})` : ''}, but this is ${TYPE_WORDS[got]}.`,
            s.line,
            a.expr.col,
            a.expr.end,
          )
        }
      }
      if (s.cond) expectType(s.cond, 'bool', s.line, yesNo)
      break
    case 'sum':
    case 'max':
    case 'min':
      expectType(s.expr, 'number', s.line, `reduce ${s.kind} works with numbers, but this is {got}.`)
      break
    case 'fold':
      expectType(s.start, 'number', s.line, 'The starting value must be a number, but this is {got}.')
      expectType(s.body, 'number', s.line, 'The new total must be a number, but this is {got}.')
      break
  }
}

// ---------------------------------------------------------------- entry point

export function parseProgram(source: string): Program {
  const steps: Step[] = []
  const lines = source.split('\n')
  let reduceLine = 0
  lines.forEach((text, idx) => {
    const line = idx + 1
    const toks = tokenizeLine(text, line)
    if (toks.length === 0) return
    if (reduceLine) {
      throw new LangError(
        `After reduce (line ${reduceLine}) there are no more marbles - just one number. reduce must be the last step.`,
        line,
        toks[0].col,
        toks[toks.length - 1].end,
      )
    }
    const p = new LineParser(toks, line, text.replace(/\s+$/, '').length)
    const step = p.step()
    checkStep(step)
    if (step.kind !== 'filter' && step.kind !== 'map') reduceLine = line
    steps.push(step)
  })
  return { steps }
}

/** Type-check a program that was built directly (e.g. from blocks) instead of parsed from text. */
export function checkProgram(program: Program) {
  program.steps.forEach((s, i) => {
    if (i < program.steps.length - 1 && s.kind !== 'filter' && s.kind !== 'map')
      throw new LangError('After reduce there are no more marbles - just one number. reduce must be the last step.', s.line)
    checkStep(s)
  })
}

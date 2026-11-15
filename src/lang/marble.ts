export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'] as const
export const SIZES = ['small', 'medium', 'big'] as const
export const PATTERNS = ['plain', 'striped', 'dotted'] as const

export type Color = (typeof COLORS)[number]
export type Size = (typeof SIZES)[number]
export type Pattern = (typeof PATTERNS)[number]

export interface Marble {
  color: Color
  size: Size
  pattern: Pattern
  number: number
}

export type PropName = keyof Marble
export const PROPS: PropName[] = ['color', 'size', 'pattern', 'number']

/** The output of a program: either a stream of marbles or a single number. */
export type Output = Marble[] | number

export function marblesEqual(a: Marble, b: Marble): boolean {
  return a.color === b.color && a.size === b.size && a.pattern === b.pattern && a.number === b.number
}

export function outputsEqual(a: Output, b: Output): boolean {
  if (typeof a === 'number' || typeof b === 'number') return a === b
  return a.length === b.length && a.every((m, i) => marblesEqual(m, b[i]))
}

export const DEFAULT_MARBLE: Marble = { color: 'blue', size: 'medium', pattern: 'plain', number: 0 }

export function makeMarble(partial: Partial<Marble>): Marble {
  return { ...DEFAULT_MARBLE, ...partial }
}

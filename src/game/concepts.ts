import { COLORS, PATTERNS, SIZES } from '../lang/marble'
import type { Concept } from './levels'

/** Spellbook pages: what each concept means, with an example. */
export const CONCEPT_DOCS: Record<Concept, { title: string; code: string; text: string }> = {
  filter: { title: 'filter', code: 'filter color is red', text: 'A gate: keeps only the marbles that answer yes.' },
  isnot: { title: 'is not', code: 'filter color is not red', text: 'Keeps every marble that is NOT red.' },
  size: { title: 'size', code: 'filter size is big', text: 'Sizes: small, medium, big.' },
  pattern: { title: 'pattern', code: 'filter pattern is striped', text: 'Patterns: plain, striped, dotted.' },
  chain: {
    title: 'many lines',
    code: 'filter color is red\nfilter size is big',
    text: 'Marbles go through the lines from top to bottom.',
  },
  and: { title: 'and', code: 'filter color is red and size is big', text: 'Both questions must be yes.' },
  or: { title: 'or', code: 'filter color is red or color is blue', text: 'At least one question must be yes.' },
  brackets: {
    title: '( brackets )',
    code: 'filter (color is red or color is blue) and size is big',
    text: 'Brackets group questions together.',
  },
  compare: {
    title: '> < >= <=',
    code: 'filter number > 5\nfilter number <= 3',
    text: 'Compare numbers: bigger, smaller, bigger-or-equal, smaller-or-equal.',
  },
  evenodd: { title: 'even / odd', code: 'filter number is even', text: 'Even: 0, 2, 4, 6...   Odd: 1, 3, 5, 7...' },
  map: { title: 'map', code: 'map color -> blue', text: 'A machine that changes every marble. -> means "becomes".' },
  mapmany: { title: 'map with a comma', code: 'map color -> red, size -> small', text: 'Change several things at once.' },
  mapif: { title: 'map ... if', code: 'map color -> red if size is big', text: 'Change only some marbles; the rest pass unchanged.' },
  math: {
    title: '+ - * /',
    code: 'map number -> number * 2 + 1',
    text: 'Math with numbers. On the right side, "number" is the old number.',
  },
  count: { title: 'reduce count', code: 'reduce count', text: 'How many marbles are there? Always the last line.' },
  sum: { title: 'reduce sum', code: 'reduce sum number', text: 'Adds up the numbers of all marbles.' },
  maxmin: { title: 'reduce max / min', code: 'reduce max number\nreduce min number', text: 'Biggest or smallest value.' },
  fold: {
    title: 'reduce from',
    code: 'reduce from 0 : total + number',
    text: 'Start total at 0. For every marble, total becomes total + number. The last total is the answer.',
  },
}

const CONCEPT_WORDS: Partial<Record<Concept, string[]>> = {
  filter: ['filter', 'color', 'is'],
  isnot: ['not'],
  size: ['size'],
  pattern: ['pattern'],
  and: ['and'],
  or: ['or'],
  brackets: ['(', ')'],
  compare: ['number', '>', '<', '>=', '<='],
  evenodd: ['even', 'odd'],
  map: ['map', '->'],
  mapmany: [','],
  mapif: ['if'],
  math: ['+', '-', '*', '/'],
  count: ['reduce', 'count'],
  sum: ['sum'],
  maxmin: ['max', 'min'],
  fold: ['from', ':', 'total'],
}

const ORDER = [
  'filter', 'map', 'reduce', 'count', 'sum', 'max', 'min', 'from', 'if',
  'color', 'size', 'pattern', 'number', 'total',
  'is', 'not', 'and', 'or', 'even', 'odd',
  '->', ',', ':', '>', '<', '>=', '<=', '+', '-', '*', '/', '(', ')',
]

export function wordsFor(concepts: Concept[]): { code: string[]; values: string[] } {
  const set = new Set(concepts.flatMap((c) => CONCEPT_WORDS[c] ?? []))
  const code = ORDER.filter((w) => set.has(w))
  const values: string[] = [...COLORS]
  if (set.has('size')) values.push(...SIZES)
  if (set.has('pattern')) values.push(...PATTERNS)
  return { code, values }
}

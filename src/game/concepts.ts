import type { Concept } from './levels'

/** Spellbook pages: what each concept means, with an example. */
export const CONCEPT_DOCS: Record<Concept, { title: string; code: string; text: string }> = {
  filter: { title: 'filter', code: 'filter color is red', text: 'A gate: keeps only the marbles that answer yes.' },
  isnot: { title: 'is not', code: 'filter color is not red', text: 'Keeps every marble that is NOT red.' },
  size: { title: 'size', code: 'filter size is big', text: 'Sizes: small, medium, big.' },
  pattern: { title: 'pattern', code: 'filter pattern is striped', text: 'Patterns: plain, striped, dotted.' },
  chain: {
    title: 'many steps',
    code: 'filter color is red\nfilter size is big',
    text: 'Marbles go through the steps from top to bottom.',
  },
  and: { title: 'and', code: 'filter color is red and size is big', text: 'An ALL box: every question in it must be yes.' },
  or: { title: 'or', code: 'filter color is red or color is blue', text: 'A ONE-yes box: one yes is enough.' },
  brackets: {
    title: 'boxes in boxes',
    code: 'filter (color is red or color is blue) and size is big',
    text: 'The inner box is answered first. In code, a box inside a box is written with ( brackets ).',
  },
  compare: {
    title: '> < >= <=',
    code: 'filter number > 5',
    text: '> bigger than, < smaller than, >= bigger or equal, <= smaller or equal.',
  },
  evenodd: { title: 'even / odd', code: 'filter number is even', text: 'Even: 0, 2, 4, 6...   Odd: 1, 3, 5, 7...' },
  map: { title: 'map', code: 'map color -> blue', text: 'A machine that changes every marble.' },
  mapmany: { title: 'change more', code: 'map color -> red, size -> small', text: 'Change several things at once.' },
  mapif: { title: 'map ... only if', code: 'map color -> red if size is big', text: 'Change only some marbles; the rest pass unchanged.' },
  math: {
    title: '+ − × ÷',
    code: 'map number -> number * 2 + 1',
    text: 'Math with numbers. "number" means the number the marble had before.',
  },
  count: { title: 'reduce count', code: 'reduce count', text: 'How many marbles are there? Always the last step.' },
  sum: { title: 'reduce sum', code: 'reduce sum number', text: 'Adds up the numbers of all marbles.' },
  maxmin: { title: 'reduce max / min', code: 'reduce max number', text: 'max finds the biggest value, min the smallest.' },
  fold: {
    title: 'reduce from',
    code: 'reduce from 0 : total + number',
    text: 'Start total at 0. For every marble, total becomes total + number. The last total is the answer.',
  },
}

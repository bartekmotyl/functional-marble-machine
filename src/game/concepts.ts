import type { Concept } from './levels'

/** Spellbook pages: an example program for each concept. Titles and texts: "concepts.<id>" in the language files. */
export const CONCEPT_CODE: Record<Concept, string> = {
  filter: 'filter color is red',
  isnot: 'filter color is not red',
  size: 'filter size is big',
  pattern: 'filter pattern is striped',
  chain: 'filter color is red\nfilter size is big',
  and: 'filter color is red and size is big',
  or: 'filter color is red or color is blue',
  brackets: 'filter (color is red or color is blue) and size is big',
  negate: 'filter not (color is red and size is big)',
  compare: 'filter number > 5',
  evenodd: 'filter number is even',
  map: 'map color -> blue',
  mapmany: 'map color -> red, size -> small',
  mapif: 'map color -> red if size is big',
  math: 'map number -> number * 2 + 1',
  count: 'reduce count',
  sum: 'reduce sum number',
  maxmin: 'reduce max number',
  fold: 'reduce from 0 : total + number',
}

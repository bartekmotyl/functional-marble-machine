import type { StepKind } from '../lang/parser'
import type { Features } from './generate'

/**
 * All levels, as data. Every text (rule, explanation, hints, section names) lives in the
 * language files: src/i18n/<lang>.json under "levels.<id>" and "chapters.<id>".
 */

/** Language features a level teaches. Used to unlock blocks and fill the Spellbook. */
export type Concept =
  | 'filter'
  | 'isnot'
  | 'size'
  | 'pattern'
  | 'chain'
  | 'and'
  | 'or'
  | 'brackets'
  | 'negate'
  | 'compare'
  | 'evenodd'
  | 'map'
  | 'mapmany'
  | 'mapif'
  | 'math'
  | 'count'
  | 'sum'
  | 'maxmin'
  | 'fold'

export interface Level {
  id: string
  /** the reference solution - examples and secret tests are generated from it */
  solution: string
  features: Features
  /** how many marbles per example */
  count?: [number, number]
  unlocks?: Concept[]
  mustUse?: StepKind[]
  /** the machine may have at most this many steps */
  maxSteps?: number
  starter?: string
  /** the last, hardest level of a section; passing it opens the next section */
  exam?: boolean
}

export interface Chapter {
  id: string
  emoji: string
  levels: Level[]
}

const RB: Features = { colors: ['red', 'blue'] }
const RBG: Features = { colors: ['red', 'blue', 'green'] }
const FOUR: Features = { colors: ['red', 'blue', 'green', 'yellow'] }
const ALL5: Features = { colors: ['red', 'blue', 'green', 'yellow', 'purple'] }
const S3: Features['sizes'] = ['small', 'medium', 'big']
const S2: Features['sizes'] = ['small', 'big']
const P3: Features['patterns'] = ['plain', 'striped', 'dotted']

export const CHAPTERS: Chapter[] = [
  {
    id: 'filter',
    emoji: '🔍',
    levels: [
      { id: 'f1', starter: 'filter color is blue', solution: 'filter color is red', features: RB, count: [4, 6], unlocks: ['filter'] },
      { id: 'f2', solution: 'filter color is green', features: RBG },
      { id: 'fb1', solution: 'filter color is blue', features: FOUR },
      { id: 'fd1', solution: 'filter color is yellow', features: ALL5, count: [5, 8] },
      { id: 'fd2', solution: 'filter color is purple', features: ALL5, count: [5, 8] },
      { id: 'f3', solution: 'filter color is not yellow', features: FOUR, unlocks: ['isnot'] },
      { id: 'fb2', solution: 'filter color is not purple', features: ALL5, count: [5, 8] },
      { id: 'fd3', solution: 'filter color is not red', features: RBG },
      { id: 'f4', solution: 'filter size is big', features: { colors: RBG.colors, sizes: S3 }, unlocks: ['size'] },
      { id: 'fd4', solution: 'filter size is small', features: { colors: FOUR.colors, sizes: S3 } },
      { id: 'fd5', solution: 'filter size is medium', features: { colors: RB.colors, sizes: S3 } },
      { id: 'fb3', solution: 'filter size is not big', features: { colors: RBG.colors, sizes: S3 } },
      { id: 'fd6', solution: 'filter size is not small', features: { colors: FOUR.colors, sizes: S3 } },
      { id: 'f5', solution: 'filter pattern is striped', features: { colors: RBG.colors, patterns: P3 }, unlocks: ['pattern'] },
      { id: 'fd7', solution: 'filter pattern is dotted', features: { colors: RB.colors, sizes: S3, patterns: P3 } },
      { id: 'fd8', solution: 'filter pattern is plain', features: { colors: FOUR.colors, patterns: P3 } },
      { id: 'fb4', solution: 'filter pattern is not plain', features: { colors: RBG.colors, patterns: P3 } },
      { id: 'fd9', solution: 'filter pattern is not striped', features: { colors: RB.colors, sizes: S3, patterns: P3 } },
      { id: 'f6', solution: 'filter color is red\nfilter size is big', features: { colors: RBG.colors, sizes: S3 }, count: [5, 8], unlocks: ['chain'] },
      { id: 'fd10', solution: 'filter color is blue\nfilter pattern is dotted', features: { colors: RBG.colors, patterns: P3 }, count: [5, 8] },
      { id: 'f7', solution: 'filter size is small\nfilter color is not blue', features: { colors: RBG.colors, sizes: S3 }, count: [5, 8] },
      { id: 'fd11', solution: 'filter size is not small\nfilter pattern is striped', features: { colors: RB.colors, sizes: S3, patterns: P3 }, count: [5, 8] },
      { id: 'fb5', solution: 'filter pattern is striped\nfilter color is not green', features: { colors: RBG.colors, patterns: P3 }, count: [5, 8] },
      { id: 'fd12', solution: 'filter color is not red\nfilter color is not blue', features: FOUR, count: [5, 8] },
      { id: 'fd13', solution: 'filter color is green\nfilter size is big\nfilter pattern is plain', features: { colors: RBG.colors, sizes: S2, patterns: ['plain', 'dotted'] }, count: [7, 10] },
      {
        id: 'fx',
        exam: true,
        solution: 'filter size is big\nfilter color is not red\nfilter pattern is dotted',
        features: { colors: RBG.colors, sizes: S2, patterns: ['plain', 'dotted'] },
        count: [7, 10],
      },
    ],
  },
  {
    id: 'boxes',
    emoji: '🧩',
    levels: [
      { id: 'f8', solution: 'filter color is green and pattern is striped', features: { colors: RBG.colors, patterns: P3 }, count: [5, 8], unlocks: ['and'], maxSteps: 1 },
      { id: 'fc1', solution: 'filter color is red and size is small', features: { colors: RBG.colors, sizes: S3 }, count: [5, 8], maxSteps: 1 },
      { id: 'fe1', solution: 'filter size is big and pattern is dotted', features: { colors: RB.colors, sizes: S3, patterns: P3 }, count: [5, 8], maxSteps: 1 },
      { id: 'fe2', solution: 'filter color is yellow and size is not small', features: { colors: FOUR.colors, sizes: S3 }, count: [6, 9], maxSteps: 1 },
      { id: 'fc3', solution: 'filter color is not blue and size is big', features: { colors: RBG.colors, sizes: S3 }, count: [5, 8], maxSteps: 1 },
      { id: 'fa2', solution: 'filter color is blue and size is small and pattern is dotted', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'dotted'] }, count: [6, 9], maxSteps: 1 },
      { id: 'fe3', solution: 'filter color is not red and pattern is not plain', features: { colors: RBG.colors, patterns: P3 }, count: [6, 9], maxSteps: 1 },
      { id: 'f9', solution: 'filter color is red or color is yellow', features: FOUR, count: [5, 8], unlocks: ['or'] },
      { id: 'fe4', solution: 'filter color is blue or color is green', features: FOUR, count: [5, 8], maxSteps: 1 },
      { id: 'fc2', solution: 'filter size is big or pattern is striped', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'] }, count: [5, 8] },
      { id: 'fe5', solution: 'filter size is small or pattern is dotted', features: { colors: RB.colors, sizes: S3, patterns: P3 }, count: [6, 9], maxSteps: 1 },
      { id: 'fo2', solution: 'filter color is red or color is yellow or color is purple', features: ALL5, count: [6, 9] },
      { id: 'fe6', solution: 'filter size is small or size is big', features: { colors: RBG.colors, sizes: S3 }, count: [5, 8] },
      { id: 'fe7', solution: 'filter color is red or pattern is striped', features: { colors: RBG.colors, patterns: P3 }, count: [6, 9], maxSteps: 1 },
      { id: 'fg1', solution: 'filter color is red and (size is big or pattern is striped)', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'] }, count: [7, 9], unlocks: ['brackets'], maxSteps: 1 },
      { id: 'fe8', solution: 'filter pattern is plain and (color is red or color is green)', features: { colors: RBG.colors, patterns: P3 }, count: [6, 9], maxSteps: 1 },
      { id: 'fc4', solution: 'filter (color is red or color is blue) and pattern is dotted', features: { colors: RBG.colors, patterns: ['plain', 'dotted'] }, count: [6, 9], maxSteps: 1 },
      { id: 'fe9', solution: 'filter size is big and (pattern is striped or pattern is dotted)', features: { colors: RB.colors, sizes: S2, patterns: P3 }, count: [6, 9], maxSteps: 1 },
      { id: 'fg2', solution: 'filter (color is red and size is big) or (color is blue and size is small)', features: { colors: RB.colors, sizes: S2 }, count: [6, 9] },
      { id: 'fe10', solution: 'filter (color is green and pattern is dotted) or size is big', features: { colors: RBG.colors, sizes: S2, patterns: ['plain', 'dotted'] }, count: [7, 9], maxSteps: 1 },
      { id: 'fe11', solution: 'filter (color is blue and size is small) or (color is red and pattern is striped)', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'] }, count: [7, 9], maxSteps: 1 },
      { id: 'fn1', solution: 'filter not (color is red and size is big)', features: { colors: RB.colors, sizes: S2 }, count: [6, 9], unlocks: ['negate'], maxSteps: 1 },
      { id: 'fe12', solution: 'filter not (color is blue or size is small)', features: { colors: RB.colors, sizes: S2 }, count: [6, 9], maxSteps: 1 },
      { id: 'fe13', solution: 'filter not (pattern is plain and size is big)', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'] }, count: [6, 9], maxSteps: 1 },
      { id: 'fe14', solution: 'filter not (color is red or color is green)', features: FOUR, count: [6, 9], maxSteps: 1 },
      {
        id: 'f10',
        exam: true,
        solution: 'filter (size is big or pattern is dotted) and color is not purple',
        features: { colors: ['red', 'blue', 'purple'], sizes: S2, patterns: ['plain', 'dotted'] },
        count: [7, 10],
        maxSteps: 1,
      },
    ],
  },
  {
    id: 'numbers',
    emoji: '🔢',
    levels: [
      { id: 'n1', solution: 'filter number > 5', features: { colors: ['blue'], numbers: [1, 9] }, unlocks: ['compare'] },
      { id: 'ng1', solution: 'filter number < 4', features: { colors: ['green'], numbers: [1, 9] } },
      { id: 'ng2', solution: 'filter number > 10', features: { colors: ['purple'], numbers: [1, 20] } },
      { id: 'n2', solution: 'filter number <= 3', features: { colors: ['green'], numbers: [1, 9] } },
      { id: 'nb0', solution: 'filter number >= 7', features: { colors: ['red'], numbers: [1, 12] } },
      { id: 'ng3', solution: 'filter number is 5', features: { colors: ['yellow'], numbers: [3, 7] }, count: [5, 8] },
      { id: 'ng4', solution: 'filter number is not 1', features: { colors: ['blue'], numbers: [1, 4] } },
      { id: 'n3', solution: 'filter number is even', features: { colors: ['yellow'], numbers: [1, 9] }, unlocks: ['evenodd'] },
      { id: 'ng5', solution: 'filter number is odd', features: { colors: ['red'], numbers: [1, 12] } },
      { id: 'ng6', solution: 'filter number is even and number < 6', features: { colors: ['green'], numbers: [1, 10] }, count: [5, 8] },
      { id: 'nb1', solution: 'filter number is odd and number > 4', features: { colors: ['purple'], numbers: [1, 9] }, count: [5, 8] },
      { id: 'n4', solution: 'filter color is red and number is odd', features: { colors: RB.colors, numbers: [1, 9] }, count: [5, 8] },
      { id: 'ng7', solution: 'filter color is blue or number > 7', features: { colors: RB.colors, numbers: [1, 9] }, count: [5, 8] },
      { id: 'n5', solution: 'filter number >= 3 and number <= 7', features: { colors: ['purple'], numbers: [1, 10] }, count: [5, 8] },
      { id: 'ng8', solution: 'filter number > 2 and number < 6', features: { colors: ['yellow'], numbers: [1, 8] }, count: [5, 8] },
      { id: 'nb2', solution: 'filter number < 3 or number > 7', features: { colors: ['green'], numbers: [1, 10] }, count: [5, 8] },
      { id: 'ng9', solution: 'filter number is odd and number is not 5', features: { colors: ['blue'], numbers: [1, 9] }, count: [6, 9] },
      { id: 'n6', solution: 'filter size > small', features: { colors: RBG.colors, sizes: S3 } },
      { id: 'ng10', solution: 'filter size < big', features: { colors: RB.colors, sizes: S3 } },
      { id: 'ng11', solution: 'filter size >= medium and color is red', features: { colors: RB.colors, sizes: S3 }, count: [5, 8] },
      { id: 'nb3', solution: 'filter size >= medium and number is even', features: { colors: RB.colors, sizes: S3, numbers: [1, 9] }, count: [6, 9] },
      { id: 'ng12', solution: 'filter (number is even or number > 6) and size is big', features: { colors: RB.colors, sizes: S2, numbers: [1, 9] }, count: [6, 9] },
      { id: 'ng13', solution: 'filter not (number > 3 and number < 7)', features: { colors: ['green'], numbers: [1, 10] }, count: [5, 8] },
      { id: 'ng14', solution: 'filter number is even\nfilter number > 4', features: { colors: ['red'], numbers: [1, 10] }, count: [5, 8] },
      { id: 'ng15', solution: 'filter (color is red and number < 5) or (color is blue and number > 5)', features: { colors: RB.colors, numbers: [1, 9] }, count: [6, 9] },
      {
        id: 'nx',
        exam: true,
        solution: 'filter (number is even and color is red) or number > 8',
        features: { colors: RB.colors, numbers: [1, 12] },
        count: [6, 9],
      },
    ],
  },
  {
    id: 'map',
    emoji: '🎨',
    levels: [
      { id: 'm1', solution: 'map color -> blue', features: { colors: ['red', 'green', 'yellow'], sizes: S2 }, unlocks: ['map'] },
      { id: 'mh1', solution: 'map color -> red', features: { colors: ['blue', 'green', 'yellow'] } },
      { id: 'm2', solution: 'map size -> big', features: { colors: RBG.colors, sizes: ['small', 'medium'] } },
      { id: 'mh2', solution: 'map size -> small', features: { colors: RB.colors, sizes: ['medium', 'big'] } },
      { id: 'mb1', solution: 'map pattern -> striped', features: { colors: RBG.colors, patterns: ['plain', 'dotted'] } },
      { id: 'mh3', solution: 'map pattern -> plain', features: { colors: RB.colors, patterns: ['striped', 'dotted'] } },
      { id: 'm3', solution: 'map color -> purple, pattern -> dotted', features: { colors: RBG.colors, patterns: ['plain', 'striped'] }, unlocks: ['mapmany'] },
      { id: 'mh4', solution: 'map size -> big, pattern -> striped', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'dotted'] } },
      { id: 'mh5', solution: 'map color -> green, size -> small, pattern -> plain', features: { colors: RB.colors, sizes: S2, patterns: P3 } },
      { id: 'm4', solution: 'filter color is red\nmap color -> yellow', features: RBG, count: [5, 8] },
      { id: 'm5', solution: 'filter size is small\nmap pattern -> striped', features: { colors: RB.colors, sizes: S2 }, count: [5, 8] },
      { id: 'mh6', solution: 'filter pattern is not plain\nmap color -> red', features: { colors: ['blue', 'green'], patterns: P3 }, count: [5, 8] },
      { id: 'mh7', solution: 'map color -> yellow\nfilter size is big', features: { colors: RBG.colors, sizes: S2 }, count: [5, 8] },
      { id: 'm6', solution: 'map color -> red if size is big', features: { colors: ['blue', 'green', 'yellow'], sizes: S2 }, count: [5, 7], unlocks: ['mapif'] },
      { id: 'mh8', solution: 'map size -> big if color is blue', features: { colors: RBG.colors, sizes: S2 }, count: [5, 8] },
      { id: 'mb2', solution: 'map pattern -> dotted if pattern is plain', features: { colors: RB.colors, patterns: P3 }, count: [5, 8] },
      { id: 'mh9', solution: 'map color -> purple if pattern is striped', features: { colors: RB.colors, patterns: P3 }, count: [5, 8] },
      { id: 'mh10', solution: 'map color -> green, size -> big if pattern is dotted', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'dotted'] }, count: [5, 8] },
      { id: 'm8', solution: 'map size -> big if color is green\nfilter size is big', features: { colors: RBG.colors, sizes: S2 }, count: [6, 8] },
      { id: 'mb3', solution: 'map color -> yellow if size is big or pattern is striped', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'] }, count: [6, 9] },
      { id: 'mh11', solution: 'map color -> red if color is blue\nmap color -> blue if color is green', features: { colors: ['blue', 'green', 'yellow'] }, count: [5, 8] },
      { id: 'mh12', solution: 'map size -> small if size is big\nfilter color is not red', features: { colors: RB.colors, sizes: S2 }, count: [6, 9] },
      { id: 'mh13', solution: 'map pattern -> dotted if color is red and size is big', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'] }, count: [6, 9] },
      { id: 'mh14', solution: 'filter not (pattern is plain)\nmap size -> big if color is red', features: { colors: RB.colors, sizes: S2, patterns: P3 }, count: [6, 9] },
      {
        id: 'm7',
        exam: true,
        solution: 'map color -> green if color is red\nmap color -> red if color is blue\nmap color -> blue if color is green',
        features: RB,
        count: [5, 8],
      },
    ],
  },
  {
    id: 'math',
    emoji: '⚙️',
    levels: [
      { id: 'x1', solution: 'map number -> number * 2', features: { colors: ['blue'], numbers: [1, 9] }, unlocks: ['math'] },
      { id: 'xi1', solution: 'map number -> number + 1', features: { colors: ['red'], numbers: [0, 9] } },
      { id: 'x2', solution: 'map number -> number + 3', features: { colors: ['green'], numbers: [0, 9] } },
      { id: 'xi2', solution: 'map number -> number * 3', features: { colors: ['purple'], numbers: [1, 9] } },
      { id: 'xb1', solution: 'map number -> number - 1', features: { colors: ['yellow'], numbers: [1, 9] } },
      { id: 'xi3', solution: 'map number -> number + 10', features: { colors: ['blue'], numbers: [0, 9] } },
      { id: 'xi4', solution: 'map number -> number * 10', features: { colors: ['green'], numbers: [1, 9] } },
      { id: 'xi5', solution: 'map number -> number - 2', features: { colors: ['red'], numbers: [2, 12] } },
      { id: 'x3', solution: 'map number -> 10 - number', features: { colors: ['red'], numbers: [0, 10] } },
      { id: 'xi6', solution: 'map number -> 20 - number', features: { colors: ['yellow'], numbers: [0, 20] } },
      { id: 'xi7', solution: 'map number -> number * 5', features: { colors: ['purple'], numbers: [1, 9] } },
      { id: 'x4', solution: 'map number -> number * 2 + 1', features: { colors: ['purple'], numbers: [0, 9] } },
      { id: 'xb2', solution: 'map number -> number * 3 - 1', features: { colors: ['blue'], numbers: [1, 9] } },
      { id: 'xi8', solution: 'map number -> (number + 2) * 2', features: { colors: ['green'], numbers: [0, 9] } },
      { id: 'xi9', solution: 'map number -> number * 2 - 3', features: { colors: ['red'], numbers: [2, 9] } },
      { id: 'x5', solution: 'map number -> number * number', features: { colors: ['yellow'], numbers: [1, 9] } },
      { id: 'xi10', solution: 'map number -> number * number + 1', features: { colors: ['blue'], numbers: [0, 9] } },
      { id: 'x6', solution: 'filter number is even\nmap number -> number / 2', features: { colors: ['blue'], numbers: [1, 12] }, count: [5, 8] },
      { id: 'xi11', solution: 'filter number > 4\nmap number -> number - 4', features: { colors: ['green'], numbers: [1, 12] }, count: [5, 8] },
      { id: 'x7', solution: 'map number -> number + 10 if color is red', features: { colors: RB.colors, numbers: [1, 9] }, count: [5, 8] },
      { id: 'xb3', solution: 'map number -> number * 2 if number < 5', features: { colors: ['green'], numbers: [1, 9] }, count: [5, 8] },
      { id: 'xi12', solution: 'map number -> 0 if number is odd', features: { colors: ['purple'], numbers: [1, 9] }, count: [5, 8] },
      { id: 'xi13', solution: 'map number -> number + 5 if size is big', features: { colors: ['yellow'], sizes: S2, numbers: [1, 9] }, count: [5, 8] },
      { id: 'x8', solution: 'filter color is not green\nmap number -> number * 3', features: { colors: RBG.colors, numbers: [1, 9] }, count: [5, 8] },
      { id: 'xi14', solution: 'map number -> number * 2\nfilter number > 10', features: { colors: ['red'], numbers: [1, 9] }, count: [5, 8] },
      {
        id: 'xx',
        exam: true,
        solution: 'filter number is odd\nmap number -> (number + 1) * 2',
        features: { colors: RB.colors, numbers: [1, 9] },
        count: [5, 8],
      },
    ],
  },
  {
    id: 'reduce',
    emoji: '🧮',
    levels: [
      { id: 'r1', solution: 'reduce count', features: ALL5, count: [2, 9], unlocks: ['count'] },
      { id: 'rc1', solution: 'filter size is big\nreduce count', features: { colors: RB.colors, sizes: S3 }, count: [5, 9] },
      { id: 'r2', solution: 'filter color is red\nreduce count', features: RBG, count: [5, 9] },
      { id: 'rc2', solution: 'filter color is not green\nreduce count', features: RBG, count: [5, 9] },
      { id: 'rb1', solution: 'filter number > 5\nreduce count', features: { colors: ['blue'], numbers: [1, 9] }, count: [5, 9] },
      { id: 'rc3', solution: 'filter number is odd\nreduce count', features: { colors: ['green'], numbers: [1, 9] }, count: [5, 9] },
      { id: 'r8', solution: 'filter pattern is not plain\nreduce count', features: { colors: RB.colors, patterns: P3 }, count: [5, 9] },
      { id: 'rc4', solution: 'filter color is red or color is blue\nreduce count', features: FOUR, count: [5, 9] },
      { id: 'r3', solution: 'reduce sum number', features: { colors: ['blue'], numbers: [1, 9] }, count: [2, 5], unlocks: ['sum'] },
      { id: 'rc5', solution: 'filter color is red\nreduce sum number', features: { colors: RB.colors, numbers: [1, 9] }, count: [4, 7] },
      { id: 'r6', solution: 'filter size is big\nreduce sum number', features: { colors: ['yellow'], sizes: S2, numbers: [1, 9] }, count: [4, 7] },
      { id: 'rb3', solution: 'filter number is even\nreduce sum number', features: { colors: ['green'], numbers: [1, 9] }, count: [4, 7] },
      { id: 'rc6', solution: 'filter number > 4\nreduce sum number', features: { colors: ['purple'], numbers: [1, 9] }, count: [4, 7] },
      { id: 'r4', solution: 'reduce max number', features: { colors: ['green'], numbers: [1, 20] }, count: [3, 6], unlocks: ['maxmin'] },
      { id: 'rb2', solution: 'reduce min number', features: { colors: ['purple'], numbers: [1, 20] }, count: [3, 6] },
      { id: 'r5', solution: 'filter color is blue\nreduce min number', features: { colors: RB.colors, numbers: [1, 20] }, count: [5, 8] },
      { id: 'rc7', solution: 'filter size is small\nreduce max number', features: { colors: ['red'], sizes: S2, numbers: [1, 20] }, count: [5, 8] },
      { id: 'r7', solution: 'map number -> number * 2\nreduce sum number', features: { colors: ['red'], numbers: [1, 9] }, count: [2, 4] },
      { id: 'rc8', solution: 'map number -> number + 1\nreduce sum number', features: { colors: ['yellow'], numbers: [1, 9] }, count: [2, 4] },
      { id: 'rc9', solution: 'reduce sum number * 10', features: { colors: ['blue'], numbers: [1, 9] }, count: [2, 4] },
      { id: 'rc10', solution: 'map number -> number * number\nreduce max number', features: { colors: ['green'], numbers: [1, 9] }, count: [3, 6] },
      { id: 'rc11', solution: 'filter color is blue\nmap number -> number * 2\nreduce sum number', features: { colors: RB.colors, numbers: [1, 9] }, count: [4, 7] },
      { id: 'rc12', solution: 'filter number is even\nreduce min number', features: { colors: ['purple'], numbers: [1, 20] }, count: [5, 8] },
      { id: 'rc13', solution: 'filter pattern is striped or size is big\nreduce sum number', features: { colors: RB.colors, sizes: S2, patterns: ['plain', 'striped'], numbers: [1, 9] }, count: [5, 8] },
      {
        id: 'rx',
        exam: true,
        solution: 'filter color is red or size is big\nmap number -> number * number\nreduce max number',
        features: { colors: RB.colors, sizes: S2, numbers: [1, 9] },
        count: [5, 8],
      },
    ],
  },
  {
    id: 'fold',
    emoji: '🏆',
    levels: [
      { id: 'd1', solution: 'reduce from 0 : total + number', features: { colors: ['blue'], numbers: [1, 9] }, count: [3, 5], unlocks: ['fold'], mustUse: ['fold'] },
      { id: 'd2', solution: 'reduce from 0 : total + 1', features: ALL5, count: [2, 8], mustUse: ['fold'] },
      { id: 'dk1', solution: 'reduce from 10 : total + number', features: { colors: ['green'], numbers: [1, 9] }, count: [2, 5], mustUse: ['fold'] },
      { id: 'db1', solution: 'reduce from 0 : total + number * 2', features: { colors: ['red'], numbers: [1, 9] }, count: [2, 5], mustUse: ['fold'] },
      { id: 'dk2', solution: 'reduce from 0 : total + number + 1', features: { colors: ['yellow'], numbers: [1, 9] }, count: [2, 5], mustUse: ['fold'] },
      { id: 'dk3', solution: 'reduce from 0 : total + 10', features: RBG, count: [2, 8], mustUse: ['fold'] },
      { id: 'd3', solution: 'reduce from 50 : total - number', features: { colors: ['yellow'], numbers: [1, 9] }, count: [3, 6], mustUse: ['fold'] },
      { id: 'dk4', solution: 'reduce from 20 : total - number', features: { colors: ['purple'], numbers: [1, 5] }, count: [2, 4], mustUse: ['fold'] },
      { id: 'db3', solution: 'reduce from 100 : total - 10', features: RBG, count: [2, 8], mustUse: ['fold'] },
      { id: 'db2', solution: 'filter color is red\nreduce from 0 : total + 1', features: RBG, count: [5, 9], mustUse: ['fold'] },
      { id: 'dk5', solution: 'filter size is big\nreduce from 0 : total + number', features: { colors: ['blue'], sizes: S2, numbers: [1, 9] }, count: [4, 7], mustUse: ['fold'] },
      { id: 'dk6', solution: 'filter number is even\nreduce from 0 : total + 1', features: { colors: ['green'], numbers: [1, 9] }, count: [5, 8], mustUse: ['fold'] },
      { id: 'dk7', solution: 'map number -> number * 3\nreduce from 0 : total + number', features: { colors: ['red'], numbers: [1, 9] }, count: [2, 4], mustUse: ['fold'] },
      { id: 'd4', solution: 'reduce from 1 : total * number', features: { colors: ['purple'], numbers: [1, 5] }, count: [2, 4], mustUse: ['fold'] },
      { id: 'dk8', solution: 'reduce from 2 : total * number', features: { colors: ['yellow'], numbers: [1, 4] }, count: [2, 3], mustUse: ['fold'] },
      { id: 'd5', solution: 'reduce from 1 : total * 2', features: RBG, count: [1, 7], mustUse: ['fold'] },
      { id: 'dk9', solution: 'reduce from 1 : total * 3', features: RB, count: [1, 5], mustUse: ['fold'] },
      { id: 'dk10', solution: 'reduce from 0 : total * 2 + number', features: { colors: ['blue'], numbers: [1, 3] }, count: [2, 4], mustUse: ['fold'] },
      { id: 'dk11', solution: 'reduce from 0 : total + number * number', features: { colors: ['green'], numbers: [1, 5] }, count: [2, 4], mustUse: ['fold'] },
      { id: 'dk12', solution: 'reduce from 0 : number', features: { colors: ['red'], numbers: [1, 9] }, count: [2, 6], mustUse: ['fold'] },
      { id: 'dk13', solution: 'reduce from 100 : total - number * 2', features: { colors: ['yellow'], numbers: [1, 9] }, count: [2, 5], mustUse: ['fold'] },
      { id: 'dk14', solution: 'filter color is red\nreduce from 1 : total * number', features: { colors: RB.colors, numbers: [1, 4] }, count: [3, 6], mustUse: ['fold'] },
      { id: 'dk15', solution: 'reduce from 0 : total + number - 1', features: { colors: ['purple'], numbers: [1, 9] }, count: [2, 5], mustUse: ['fold'] },
      { id: 'dk16', solution: 'map number -> number + 1\nreduce from 1 : total * number', features: { colors: ['blue'], numbers: [1, 3] }, count: [2, 4], mustUse: ['fold'] },
      {
        id: 'd6',
        exam: true,
        solution: 'filter size is big\nreduce from 0 : total + number * 10',
        features: { colors: RB.colors, sizes: S2, numbers: [1, 9] },
        count: [4, 7],
        mustUse: ['fold'],
      },
    ],
  },
]

export const ALL_LEVELS: Level[] = CHAPTERS.flatMap((c) => c.levels)

export function levelIndex(id: string): number {
  return ALL_LEVELS.findIndex((l) => l.id === id)
}

export function chapterOf(id: string): Chapter {
  return CHAPTERS.find((c) => c.levels.some((l) => l.id === id))!
}

/** All concepts unlocked up to and including the given level. */
export function conceptsUpTo(id: string): Concept[] {
  const idx = levelIndex(id)
  return ALL_LEVELS.slice(0, idx + 1).flatMap((l) => l.unlocks ?? [])
}

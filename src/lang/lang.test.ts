import { describe, expect, it } from 'vitest'
import { run } from './interpreter'
import { makeMarble as mk } from './marble'
import { LangError, parseProgram } from './parser'
import { ALL_LEVELS, CHAPTERS } from '../game/levels'
import { checkSolution, getTests, HIDDEN_TESTS, VISIBLE_EXAMPLES } from '../game/check'

const ms = [
  mk({ color: 'red', size: 'big', number: 3 }),
  mk({ color: 'blue', size: 'small', number: 4 }),
  mk({ color: 'red', size: 'small', pattern: 'striped', number: 7 }),
]

function err(src: string): LangError {
  try {
    parseProgram(src)
  } catch (e) {
    if (e instanceof LangError) return e
    throw e
  }
  throw new Error('expected an error for: ' + src)
}

describe('language', () => {
  it('filters', () => {
    expect(run('filter color is red', ms).output).toEqual([ms[0], ms[2]])
    expect(run('filter color is not red', ms).output).toEqual([ms[1]])
    expect(run('filter number is even', ms).output).toEqual([ms[1]])
    expect(run('filter size > small', ms).output).toEqual([ms[0]])
    expect(run('filter (color is red or color is blue) and size is small', ms).output).toEqual([ms[1], ms[2]])
    expect(run('filter not color is red', ms).output).toEqual([ms[1]])
    expect(run('FILTER Color = RED  # comment', ms).output).toEqual([ms[0], ms[2]])
  })

  it('maps', () => {
    expect(run('map number -> number * 2 + 1', ms).output).toEqual(ms.map((m) => ({ ...m, number: m.number * 2 + 1 })))
    const out = run('map color -> green, size -> big if color is red', ms).output
    expect(out).toEqual([{ ...ms[0], color: 'green' }, ms[1], { ...ms[2], color: 'green', size: 'big' }])
    expect(run('map number -> 0 - number', ms).output).toEqual(ms.map((m) => ({ ...m, number: -m.number })))
    expect(run('map number -> -number / 2', ms).output).toEqual(ms.map((m) => ({ ...m, number: Math.trunc(-m.number / 2) })))
  })

  it('reduces', () => {
    expect(run('reduce count', ms).output).toBe(3)
    expect(run('reduce sum number', ms).output).toBe(14)
    expect(run('reduce max number', ms).output).toBe(7)
    expect(run('reduce min number * 10', ms).output).toBe(30)
    expect(run('reduce from 1 : total * number', ms).output).toBe(84)
    const r = run('filter color is red\nreduce from 0 : total + number', ms)
    expect(r.output).toBe(10)
    expect(r.stages[1]).toMatchObject({ kind: 'reduce', start: 0, accs: [3, 10] })
  })

  it('gives friendly errors', () => {
    expect(err('filter color is rde').message).toContain('Did you mean "red"')
    expect(err('filtr color is red').message).toContain('Did you mean "filter"')
    expect(err('filter color is big').message).toContain('is not a color')
    expect(err('filter color').message).toContain('yes/no')
    expect(err('map color -> 3').message).toContain('must become a color')
    expect(err('map color blue').message).toContain('->')
    expect(err('reduce count\nfilter size is big').line).toBe(2)
    expect(err('filter number > total').message).toContain('total')
    expect(err('reduce from 0 total + 1').message).toContain(':')
    expect(err('filter color is red map color -> blue').message).toContain('new line')
    expect(err('filter number + 1 > color').message).toContain('numbers')
    expect(() => run('map number -> number / 0', ms)).toThrow(LangError)
  })
})

describe('levels', () => {
  it('have unique ids', () => {
    expect(new Set(ALL_LEVELS.map((l) => l.id)).size).toBe(ALL_LEVELS.length)
  })

  for (const level of ALL_LEVELS) {
    it(`${level.id} generates good tests and is solvable`, () => {
      const { visible, hidden } = getTests(level)
      expect(visible).toHaveLength(VISIBLE_EXAMPLES)
      expect(hidden).toHaveLength(HIDDEN_TESTS)
      expect(checkSolution(level, level.solution).solved).toBe(true)
      // the starter code (or an empty program) must not already solve the level
      expect(checkSolution(level, level.starter ?? '').solved).toBe(false)
    })
  }

  it('every section ends with exactly one exam', () => {
    for (const ch of CHAPTERS) {
      expect(ch.levels.filter((l) => l.exam).map((l) => l.id)).toEqual([ch.levels[ch.levels.length - 1].id])
    }
  })
})

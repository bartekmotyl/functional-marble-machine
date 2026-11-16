import { describe, expect, it } from 'vitest'
import { ALL_LEVELS } from '../game/levels'
import { CONCEPT_CODE } from '../game/concepts'
import { checkSolution, getTests } from '../game/check'
import { runProgram } from '../lang/interpreter'
import { parseProgram } from '../lang/parser'
import { addQuestion, boxDepth, cmp, fromSource, replaceNode, tidyCond, toProgram, toSource, type Cond } from './model'

describe('block model', () => {
  it('turns every level solution, starter, hint and spellbook sample into blocks and back', () => {
    const sources = [
      ...ALL_LEVELS.flatMap((l) => [l.solution, l.starter ?? '']),
      ...Object.values(CONCEPT_CODE),
    ]
    for (const src of sources) {
      let parsed
      try {
        parsed = parseProgram(src)
      } catch {
        continue // hints in plain words
      }
      const blocks = fromSource(src)
      expect(blocks, src).not.toBeNull()
      // the text written from blocks means the same program
      expect(parseProgram(toSource(blocks!)).steps.length).toBe(parsed.steps.length)
    }
  })

  it('block programs solve their levels exactly like the text solutions', () => {
    for (const level of ALL_LEVELS) {
      const blocks = fromSource(level.solution)!
      expect(checkSolution(level, toProgram(blocks)).solved, level.id).toBe(true)
      const { visible } = getTests(level)
      const a = runProgram(toProgram(blocks), visible[0].input).output
      const b = runProgram(parseProgram(toSource(blocks)), visible[0].input).output
      expect(a).toEqual(b)
    }
  })

  it('writes boxes inside boxes with brackets', () => {
    const src = 'filter (color is red and size is big) or (color is blue and size is small)'
    expect(toSource(fromSource(src)!)).toBe(src)
    expect(toSource(fromSource('filter color is red and (size is big or pattern is striped)')!)).toBe(
      'filter color is red and (size is big or pattern is striped)',
    )
    expect(toSource(fromSource('map number -> number * 2 + 1')!)).toBe('map number -> number * 2 + 1')
    expect(toSource(fromSource('map number -> (number + 1) * 2')!)).toBe('map number -> (number + 1) * 2')
    expect(toSource(fromSource('map number -> 10 - (number - 1)')!)).toBe('map number -> 10 - (number - 1)')
  })

  it('adds and removes questions, keeping boxes tidy', () => {
    let p = fromSource('filter color is red')!
    const first = (p[0] as { cond: Cond }).cond
    p = addQuestion(p, first.id, 'and', cmp('size', '==', 'big'))
    expect(toSource(p)).toBe('filter color is red and size is big')
    // adding "and" next to a question that is already in an ALL box extends that box
    const second = ((p[0] as { cond: Cond }).cond as Extract<Cond, { t: 'group' }>).items[1]
    p = addQuestion(p, second.id, 'and', cmp('pattern', '==', 'dotted'))
    expect(toSource(p)).toBe('filter color is red and size is big and pattern is dotted')
    // "or" makes a new box inside
    p = addQuestion(p, second.id, 'or', cmp('size', '==', 'small'))
    expect(toSource(p)).toBe('filter color is red and (size is big or size is small) and pattern is dotted')
    // removing leaves a box with one question -> just that question
    const inner = ((p[0] as { cond: Cond }).cond as Extract<Cond, { t: 'group' }>).items[1] as Extract<Cond, { t: 'group' }>
    p = replaceNode(p, inner.items[1].id, () => null)
    expect(toSource(p)).toBe('filter color is red and size is big and pattern is dotted')
  })

  it('reports runtime-safe programs with node values for explanations', () => {
    const blocks = fromSource('filter color is red and size is big')!
    const res = runProgram(toProgram(blocks), [{ color: 'red', size: 'small', pattern: 'plain', number: 0 }])
    const stage = res.stages[0]
    const cond = (blocks[0] as { cond: Extract<Cond, { t: 'group' }> }).cond
    expect(stage.values[0].get(cond.id)).toBe(false)
    expect(stage.values[0].get(cond.items[0].id)).toBe(true)
    expect(stage.values[0].get(cond.items[1].id)).toBe(false)
  })

  it('throws away marbles with a negated filter', () => {
    const src = 'filter not (color is red and size is big)'
    const blocks = fromSource(src)!
    expect(blocks[0]).toMatchObject({ kind: 'filter', negate: true })
    expect(toSource(blocks)).toBe(src)
    const m = (color: 'red' | 'blue', size: 'big' | 'small') => ({ color, size, pattern: 'plain' as const, number: 0 })
    const out = runProgram(toProgram(blocks), [m('red', 'big'), m('red', 'small'), m('blue', 'big')]).output
    expect(out).toEqual([m('red', 'small'), m('blue', 'big')])
  })

  it('switches a box between and / or and merges boxes of the same kind', () => {
    let p = fromSource('filter color is red and (size is big or pattern is striped)')!
    const outer = (p[0] as { cond: Extract<Cond, { t: 'group' }> }).cond
    const inner = outer.items[1]
    expect(boxDepth(outer)).toBe(2)
    // inner or-box becomes an and-box -> it melts into the outer and-box
    p = replaceNode(p, inner.id, (g) => tidyCond({ ...g, op: 'and' }))
    expect(toSource(p)).toBe('filter color is red and size is big and pattern is striped')
    // the whole box becomes an or-box
    const box = (p[0] as { cond: Cond }).cond
    p = replaceNode(p, box.id, (g) => tidyCond({ ...g, op: 'or' }))
    expect(toSource(p)).toBe('filter color is red or size is big or pattern is striped')
  })
})

import { describe, expect, it } from 'vitest'
import { runProgram } from '../lang/interpreter'
import { fromSource, toProgram } from '../blocks/model'
import { ALL_LEVELS } from './levels'
import { getTests, VISIBLE_EXAMPLES } from './check'

/**
 * Players must find the rule from the examples alone, so the visible examples
 * should show every question of the rule answering both "yes" and "no".
 */
describe('visible examples explain the rule', () => {
  for (const level of ALL_LEVELS) {
    it(`${level.id} "${level.title}"`, () => {
      const { visible } = getTests(level)
      expect(visible).toHaveLength(VISIBLE_EXAMPLES)
      // all examples are different
      expect(new Set(visible.map((t) => JSON.stringify(t.input))).size).toBe(VISIBLE_EXAMPLES)

      const program = toProgram(fromSource(level.solution)!)
      const seen = new Map<string, Set<boolean>>()
      for (const tc of visible) {
        for (const stage of runProgram(program, tc.input).stages)
          for (const values of stage.values)
            values.forEach((v, id) => {
              if (typeof v !== 'boolean') return
              if (!seen.has(id)) seen.set(id, new Set())
              seen.get(id)!.add(v)
            })
      }
      const oneSided = [...seen.entries()].filter(([, s]) => s.size < 2).map(([id]) => id)
      expect(oneSided, 'questions that never say both yes and no').toEqual([])
    })
  }
})

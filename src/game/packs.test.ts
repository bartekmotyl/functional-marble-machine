import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ALL_LEVELS } from './levels'
import { examplesProblem, packId, readPack, textsFor } from './packs'

const URL = 'https://example.com/pack.yaml'
const example = readFileSync('levels-format/example-pack.yaml', 'utf8')

/** A small valid pack with one level; `extra` is added to the level. */
const pack = (level = '', top = '') => `
name: Test pack
author: Someone
${top}
levels:
  - solution: filter color is red
    features:
      colors: [red, blue]
    texts:
      en:
        goal: Keep the red ones.
${level}`

const problem = (source: string) => {
  try {
    readPack(source, URL)
    return ''
  } catch (e) {
    return (e as Error).message
  }
}

describe('level packs', () => {
  it('reads the example pack', () => {
    const p = readPack(example, URL)
    expect(p.name).toBe('Rainbow Workshop')
    expect(p.author).toBeTruthy()
    expect(p.levels).toHaveLength(5)
    expect(p.levels[0].id).toBe(`${packId(URL)}_reds`)
    expect(p.levels[4].mustUse).toEqual(['sum'])
    expect(textsFor(p.levels[0], 'pl').goal).toMatch(/czerwone/)
  })

  it('the example pack in public/ is the same file', () => {
    expect(readFileSync('public/example-pack.yaml', 'utf8')).toBe(example)
  })

  it('numbers levels without an id and falls back to English texts', () => {
    const p = readPack(pack(), URL)
    expect(p.levels[0].id).toBe(`${packId(URL)}_1`)
    expect(textsFor(p.levels[0], 'pl').goal).toBe('Keep the red ones.')
  })

  it('built-in levels would pass the same examples check', () => {
    for (const l of ALL_LEVELS) expect(examplesProblem(l), l.id).toBeNull()
  })

  it.each([
    ['not YAML at all', 'name: [unclosed', /not valid YAML/],
    ['no name', pack().replace('name: Test pack', ''), /^name: must be some text/],
    ['no levels', 'name: A\nauthor: B\nlevels: []', /^levels: must be a list/],
    ['unknown top field', pack('', 'script: alert(1)'), /unknown field "script"/],
    ['unknown level field', pack('    exam: true'), /levels\[0\]: unknown field "exam"/],
    ['bad color', pack().replace('[red, blue]', '[red, pink]'), /features\.colors\[1\]: "pink" is not one of/],
    ['bad number range', pack('    count: [5, 2]'), /levels\[0\]\.count: the first number/],
    ['program that does not parse', pack().replace('filter color is red', 'filter colour is red'), /solution: is not a valid program/],
    ['no texts', pack().replace(/    texts:[\s\S]*$/, ''), /texts: needs texts/],
    ['bad language', pack().replace('      en:', '      english:'), /two-letter code/],
    ['too many steps', pack('    maxSteps: 0'), /maxSteps: must be a whole number/],
    ['mustUse the solution lacks', pack('    mustUse: [map]'), /does not use "map"/],
    ['duplicate ids', `name: A\nauthor: B\nlevels:\n${'  - id: x\n    solution: filter color is red\n    features: {colors: [red, blue]}\n    texts: {en: {goal: g}}\n'.repeat(2)}`, /"x" is used by another level/],
    ['boring examples', pack().replace('[red, blue]', '[red]'), /solution: (there are too few|every example|some question)/],
    ['rule always says yes', pack().replace('filter color is red', 'filter color is not purple'), /levels\[0\]\.solution: /],
    ['wrong format', pack('', 'format: 2'), /^format: must be 1/],
  ])('explains what is wrong: %s', (_, source, msg) => {
    expect(problem(source)).toMatch(msg)
  })

  it('refuses huge files', () => {
    expect(problem(pack() + '#'.repeat(300_000))).toMatch(/too big/)
  })
})

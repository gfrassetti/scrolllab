import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { FIZZ_FLAVOR_COLORS, fizzHeroPalette, linkedFizzProps } from '../../domain/fizzPalette.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const hero = (props) => ({ sectionId: 'fizz/HeroBubbles', props })
const worlds = { sectionId: 'fizz/FlavorWorlds', props: {} }
const benefits = { sectionId: 'fizz/BubbleBenefits', props: {} }
const footer = { sectionId: 'fizz/FooterSplash', props: {} }
const nav = { sectionId: 'fizz/NavFizz', props: {} }

describe('paleta de FIZZ que sigue al hero', () => {
  it('repite los sabores de HeroBubbles.jsx (si cambian allá, esto se entera)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/components/sections/fizz/HeroBubbles.jsx'),
      'utf8',
    )
    const block = src.match(/export const FIZZ_FLAVORS = \{([\s\S]*?)\n\}/)?.[1] || ''
    const parsed = {}
    for (const m of block.matchAll(/(\w+):\s*\{\s*bg:\s*'(#[0-9a-f]{6})',\s*ink:\s*'(#[0-9a-f]{6})',\s*liquid:\s*'(#[0-9a-f]{6})'/gi)) {
      parsed[m[1]] = { bg: m[2], ink: m[3], liquid: m[4] }
    }
    assert.deepEqual(parsed, FIZZ_FLAVOR_COLORS)
  })

  it('con el hero en cobalto (la demo) no propaga nada', () => {
    const entries = [nav, hero({}), worlds, benefits, footer]
    assert.equal(fizzHeroPalette(entries), null)
    assert.deepEqual(linkedFizzProps('fizz/BubbleBenefits', {}, entries), {})
  })

  it('un sabor distinto: las secciones vacías toman el fondo y la tinta del hero', () => {
    const entries = [nav, hero({ flavor: 'berry' }), worlds, benefits, footer]
    assert.deepEqual(linkedFizzProps('fizz/FlavorWorlds', {}, entries), {
      startBg: '#ff3ea5',
      startInk: '#241352',
      startLiquid: '#ffc9e8',
    })
    assert.deepEqual(linkedFizzProps('fizz/BubbleBenefits', {}, entries), {
      bg: '#ff3ea5',
      fg: '#241352',
    })
    assert.deepEqual(linkedFizzProps('fizz/FooterSplash', {}, entries), {
      bg: '#ff3ea5',
      fg: '#241352',
    })
    assert.deepEqual(linkedFizzProps('fizz/NavFizz', {}, entries), { menuInk: '#ff3ea5' })
  })

  it('el fondo propio del hero pisa al del sabor', () => {
    const entries = [hero({ flavor: 'berry', bg: '#123456', fg: '#abcdef' }), benefits]
    assert.deepEqual(linkedFizzProps('fizz/BubbleBenefits', {}, entries), {
      bg: '#123456',
      fg: '#abcdef',
    })
  })

  it('lo que el comprador escribió en la sección manda', () => {
    const entries = [hero({ flavor: 'mint' }), benefits]
    assert.deepEqual(
      linkedFizzProps('fizz/BubbleBenefits', { bg: '#000000', fg: '' }, entries),
      { fg: '#241352' },
    )
  })

  it('sin hero, o en secciones que no la siguen, no cambia nada', () => {
    assert.deepEqual(linkedFizzProps('fizz/BubbleBenefits', {}, [benefits]), {})
    const entries = [hero({ flavor: 'berry' })]
    assert.deepEqual(linkedFizzProps('fizz/ContactSteps', {}, entries), {})
    assert.deepEqual(linkedFizzProps('chapters/Footer', {}, entries), {})
  })
})

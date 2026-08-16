import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { enterDx, fitScale, glyphsOf, packLine } from '../beat/layout.js'

describe('beat layout — pack + dx from rest', () => {
  it('glyphsOf drops spaces', () => {
    assert.deepEqual(glyphsOf('A B'), ['A', 'B'])
    assert.deepEqual(glyphsOf(''), [])
  })

  it('packLine centres each box and reports total width', () => {
    const { slots, width } = packLine([100, 100], { left: 0, tracking: 0 })
    assert.deepEqual(slots, [
      { x: 50, w: 100 },
      { x: 150, w: 100 },
    ])
    assert.equal(width, 200)
  })

  it('enterDx matches the old JUST rail (rest 2250 → stage 102)', () => {
    assert.equal(enterDx(2250, 102), -2148)
  })

  it('fitScale only shrinks when the line overflows the band', () => {
    assert.equal(fitScale(400, 800), 1)
    assert.equal(fitScale(1600, 800), 0.5)
  })
})

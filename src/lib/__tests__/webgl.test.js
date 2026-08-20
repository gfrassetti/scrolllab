import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { damp } from '../webgl/damp.js'

describe('webgl/damp', () => {
  it('approaches target over time', () => {
    let v = 0
    for (let i = 0; i < 60; i += 1) v = damp(v, 1, 3, 1 / 60)
    assert.ok(v > 0.9)
    assert.ok(v < 1)
  })
})

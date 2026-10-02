import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hostViewportUnits } from '../hostViewportUnits.js'

const V = (n) => `calc(var(--sl-vh,1vh)*${n})`

describe('hostViewportUnits', () => {
  it('reescribe vh/svh/dvh/lvh de las declaraciones al viewport del sitio', () => {
    assert.equal(hostViewportUnits('.a{padding-top:30svh}'), `.a{padding-top:${V(30)}}`)
    assert.equal(hostViewportUnits('.a{margin-top:-100svh}'), `.a{margin-top:${V(-100)}}`)
    assert.equal(hostViewportUnits('.a{top:.5vh;height:44dvh}'), `.a{top:${V('.5')};height:${V(44)}}`)
    assert.equal(
      hostViewportUnits('.a{height:calc(100lvh - 2rem)}'),
      `.a{height:calc(${V(100)} - 2rem)}`,
    )
  })

  it('no toca selectores, media queries, vw ni urls', () => {
    const css = '@media (min-width:48rem){.md\\:pt-\\[34svh\\]{width:10vw;background:url(a3vh.png)}}'
    assert.equal(hostViewportUnits(css), css)
    assert.equal(
      hostViewportUnits('.pt-\\[30svh\\]{padding-top:30svh}'),
      `.pt-\\[30svh\\]{padding-top:${V(30)}}`,
    )
  })
})

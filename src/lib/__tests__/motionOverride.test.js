import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStorage } from './storageMock.js'

// El módulo captura `window.matchMedia` al importarse: se la damos antes, para
// ver exactamente qué consulta le llega.
const asked = []
let deviceReduces = true
globalThis.window = globalThis
globalThis.matchMedia = (query) => {
  asked.push(query)
  return {
    matches: query === '(prefers-reduced-motion: reduce)' ? deviceReduces : false,
    addEventListener() {},
    removeEventListener() {},
  }
}
let reloads = 0
globalThis.location = { reload: () => (reloads += 1) }
globalThis.document = { documentElement: { dataset: {} } }

const m = await import('../motionOverride.js')

const useStorage = (storage) =>
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  })

const throwing = () => {
  const boom = () => {
    throw new Error('storage bloqueado')
  }
  return { getItem: boom, setItem: boom, removeItem: boom, clear: boom }
}

describe('rewriteMotionQuery', () => {
  const cases = [
    ['(prefers-reduced-motion: reduce)', '(max-width: -1px)'],
    ['(prefers-reduced-motion:reduce)', '(max-width: -1px)'],
    ['( PREFERS-REDUCED-MOTION : Reduce )', '(max-width: -1px)'],
    ['(prefers-reduced-motion: no-preference)', '(min-width: 0px)'],
    ['(prefers-reduced-motion)', '(max-width: -1px)'],
    [
      '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
      '(min-width: 768px) and (min-width: 0px)',
    ],
    ['not (prefers-reduced-motion: reduce)', 'not (max-width: -1px)'],
    [
      '(max-width: 767px), (prefers-reduced-motion: reduce)',
      '(max-width: 767px), (max-width: -1px)',
    ],
  ]
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => assert.equal(m.rewriteMotionQuery(input), expected))
  }

  it('no toca las consultas que no hablan de movimiento', () => {
    for (const q of ['(min-width: 768px)', '(hover: hover) and (pointer: fine)', 'print']) {
      assert.equal(m.rewriteMotionQuery(q), q)
    }
  })
})

describe('movimiento completo por defecto; «menos movimiento» es una elección', () => {
  beforeEach(() => {
    useStorage(createMemoryStorage())
    reloads = 0
    globalThis.document.documentElement.dataset = {}
  })

  it('al principio no hay elección guardada (= completo)', () => {
    assert.equal(m.getMotion(), null)
  })

  it('elegir «No» (calma) estando en completo: guarda y recarga una vez', () => {
    globalThis.document.documentElement.dataset.motion = 'full'
    assert.equal(m.setMotion('calm'), true)
    assert.equal(m.getMotion(), 'calm')
    assert.equal(reloads, 1)
  })

  it('elegir «Sí» estando en calma: guarda y recarga una vez', () => {
    assert.equal(m.setMotion('full'), true)
    assert.equal(m.getMotion(), 'full')
    assert.equal(reloads, 1)
  })

  it('elegir lo que ya se ve no recarga', () => {
    globalThis.document.documentElement.dataset.motion = 'full'
    m.setMotion('full')
    assert.equal(reloads, 0)
  })

  it('un valor raro en el storage cuenta como sin elección', () => {
    localStorage.setItem('scrolllab-motion', 'quizas')
    assert.equal(m.getMotion(), null)
  })
})

describe('storage bloqueado', () => {
  it('no rompe nada: no se puede recordar, no se guarda y no se recarga', () => {
    useStorage(throwing())
    reloads = 0
    assert.equal(m.canRemember(), false)
    assert.equal(m.getMotion(), null)
    assert.equal(m.setMotion('calm'), false)
    assert.equal(reloads, 0)
  })

  it('con storage común sí se puede recordar', () => {
    useStorage(createMemoryStorage())
    assert.equal(m.canRemember(), true)
  })
})

describe('matchMedia: completo para todos, salvo quien eligió menos', () => {
  it('el ajuste real del dispositivo se lee con la consulta original', () => {
    asked.length = 0
    deviceReduces = true
    assert.equal(m.deviceWantsLessMotion(), true)
    deviceReduces = false
    assert.equal(m.deviceWantsLessMotion(), false)
    assert.deepEqual(asked, ['(prefers-reduced-motion: reduce)', '(prefers-reduced-motion: reduce)'])
    deviceReduces = true
  })

  // Va antes que los demás: el reemplazo de matchMedia, una vez hecho, queda.
  it('con `calm` elegido: no se marca <html> ni se reemplaza nada (manda el dispositivo)', () => {
    useStorage(createMemoryStorage())
    localStorage.setItem('scrolllab-motion', 'calm')
    globalThis.document.documentElement.dataset = {}
    const before = globalThis.window.matchMedia
    m.bootMotionOverride()
    assert.equal(globalThis.window.matchMedia, before)
    assert.equal(globalThis.document.documentElement.dataset.motion, undefined)
  })

  it('sin elección guardada (visita nueva): completo, también con el dispositivo en «reducir»', () => {
    useStorage(createMemoryStorage())
    globalThis.document.documentElement.dataset = {}
    deviceReduces = true
    m.bootMotionOverride()
    assert.equal(globalThis.document.documentElement.dataset.motion, 'full')

    asked.length = 0
    globalThis.window.matchMedia('(prefers-reduced-motion: reduce)')
    globalThis.window.matchMedia('(max-width: 767px) and (prefers-reduced-motion: no-preference)')
    globalThis.window.matchMedia('(min-width: 768px)')
    assert.deepEqual(asked, [
      '(max-width: -1px)',
      '(max-width: 767px) and (min-width: 0px)',
      '(min-width: 768px)',
    ])

    // y el toggle sigue viendo lo que pide el dispositivo de verdad
    asked.length = 0
    assert.equal(m.deviceWantsLessMotion(), true)
    assert.deepEqual(asked, ['(prefers-reduced-motion: reduce)'])
  })

  it('con el storage bloqueado también es completo (el default no necesita memoria)', () => {
    useStorage(throwing())
    globalThis.document.documentElement.dataset = {}
    m.bootMotionOverride()
    assert.equal(globalThis.document.documentElement.dataset.motion, 'full')
  })
})

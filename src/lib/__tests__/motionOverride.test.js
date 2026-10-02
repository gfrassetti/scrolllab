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

describe('respuesta guardada (una sola vez, para siempre)', () => {
  beforeEach(() => {
    useStorage(createMemoryStorage())
    reloads = 0
    globalThis.document.documentElement.dataset = {}
  })

  it('al principio no hay respuesta y el aviso no se mostró', () => {
    assert.equal(m.getMotion(), null)
    assert.equal(m.noticeSeen(), false)
  })

  it('mostrar el aviso lo marca como visto aunque no responda', () => {
    m.markNoticeSeen()
    assert.equal(m.noticeSeen(), true)
    assert.equal(m.getMotion(), null)
  })

  it('«Dejarlo así» estando en calma: guarda, no recarga y no vuelve a preguntar', () => {
    assert.equal(m.setMotion('calm'), true)
    assert.equal(m.getMotion(), 'calm')
    assert.equal(m.noticeSeen(), true)
    assert.equal(reloads, 0)
  })

  it('«Ver con animaciones»: guarda y recarga una vez', () => {
    assert.equal(m.setMotion('full'), true)
    assert.equal(m.getMotion(), 'full')
    assert.equal(m.noticeSeen(), true)
    assert.equal(reloads, 1)
  })

  it('con las animaciones puestas: volver a calma recarga, repetir full no', () => {
    m.setMotion('full')
    globalThis.document.documentElement.dataset.motion = 'full'
    reloads = 0
    m.setMotion('full')
    assert.equal(reloads, 0)
    m.setMotion('calm')
    assert.equal(reloads, 1)
    assert.equal(m.getMotion(), 'calm')
  })

  it('un valor raro en el storage cuenta como sin respuesta', () => {
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
    assert.equal(m.noticeSeen(), false)
    assert.equal(m.setMotion('full'), false)
    assert.equal(reloads, 0)
    assert.doesNotThrow(() => m.markNoticeSeen())
  })

  it('con storage común sí se puede recordar', () => {
    useStorage(createMemoryStorage())
    assert.equal(m.canRemember(), true)
  })
})

describe('matchMedia con las animaciones pedidas', () => {
  it('el ajuste real del dispositivo se lee con la consulta original', () => {
    asked.length = 0
    deviceReduces = true
    assert.equal(m.deviceWantsLessMotion(), true)
    deviceReduces = false
    assert.equal(m.deviceWantsLessMotion(), false)
    assert.deepEqual(asked, ['(prefers-reduced-motion: reduce)', '(prefers-reduced-motion: reduce)'])
    deviceReduces = true
  })

  it('sin respuesta guardada no se reemplaza nada', () => {
    useStorage(createMemoryStorage())
    const before = globalThis.window.matchMedia
    m.bootMotionOverride()
    assert.equal(globalThis.window.matchMedia, before)
    assert.equal(globalThis.document.documentElement.dataset.motion, undefined)
  })

  it('con `full`: marca <html>, reescribe las consultas de movimiento y deja pasar el resto', () => {
    useStorage(createMemoryStorage())
    localStorage.setItem('scrolllab-motion', 'full')
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

    // y el aviso/toggle siguen viendo lo que pide el dispositivo de verdad
    asked.length = 0
    assert.equal(m.deviceWantsLessMotion(), true)
    assert.deepEqual(asked, ['(prefers-reduced-motion: reduce)'])
  })
})

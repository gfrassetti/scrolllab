import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { trackPointer } from '../motion.js'

/** Una `window` mínima: registra listeners y deja dispararlos. */
function fakeWindow({ innerWidth = 400, innerHeight = 800 } = {}) {
  const listeners = new Map()
  const registered = []
  return {
    innerWidth,
    innerHeight,
    registered,
    addEventListener(type, fn, options) {
      registered.push({ type, options })
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn)
    },
    emit(type, event) {
      listeners.get(type)?.forEach((fn) => fn(event))
    },
    listenerCount() {
      return [...listeners.values()].reduce((n, set) => n + set.size, 0)
    },
  }
}

afterEach(() => {
  delete globalThis.window
})

test('el mouse se normaliza a -1…1 sobre el viewport', () => {
  const win = (globalThis.window = fakeWindow())
  const pointer = trackPointer()
  win.emit('pointermove', { pointerType: 'mouse', clientX: 0, clientY: 0 })
  assert.deepEqual([pointer.x, pointer.y], [-1, -1])
  win.emit('pointermove', { pointerType: 'mouse', clientX: 400, clientY: 800 })
  assert.deepEqual([pointer.x, pointer.y], [1, 1])
  win.emit('pointermove', { pointerType: 'pen', clientX: 200, clientY: 400 })
  assert.deepEqual([pointer.x, pointer.y], [0, 0])
  assert.equal(pointer.touching, false)
})

test('el dedo mueve el puntero mientras scrollea y vuelve al centro al soltar', () => {
  const win = (globalThis.window = fakeWindow())
  const pointer = trackPointer()
  win.emit('touchstart', { touches: [{ clientX: 100, clientY: 600 }] })
  assert.equal(pointer.touching, true)
  assert.deepEqual([pointer.x, pointer.y], [-0.5, 0.5])
  win.emit('touchmove', { touches: [{ clientX: 300, clientY: 100 }] })
  assert.deepEqual([pointer.x, pointer.y], [0.5, -0.75])
  assert.deepEqual([pointer.clientX, pointer.clientY], [300, 100])

  win.emit('touchend', { touches: [] })
  assert.equal(pointer.touching, false)
  assert.deepEqual([pointer.x, pointer.y], [0, 0])
  assert.deepEqual([pointer.clientX, pointer.clientY], [200, 400])
})

test('los eventos de puntero táctiles no pisan al dedo (los cubre touchmove)', () => {
  const win = (globalThis.window = fakeWindow())
  const pointer = trackPointer()
  win.emit('touchmove', { touches: [{ clientX: 300, clientY: 200 }] })
  win.emit('pointermove', { pointerType: 'touch', clientX: 0, clientY: 0 })
  assert.deepEqual([pointer.clientX, pointer.clientY], [300, 200])
})

test('si queda otro dedo apoyado, soltar uno no lo suelta', () => {
  const win = (globalThis.window = fakeWindow())
  const pointer = trackPointer()
  win.emit('touchstart', { touches: [{ clientX: 100, clientY: 100 }, { clientX: 300, clientY: 700 }] })
  win.emit('touchend', { touches: [{ clientX: 300, clientY: 700 }] })
  assert.equal(pointer.touching, true)
  assert.deepEqual([pointer.clientX, pointer.clientY], [300, 700])
})

test('los listeners táctiles son pasivos: no frenan el scroll', () => {
  const win = (globalThis.window = fakeWindow())
  trackPointer()
  const touch = win.registered.filter(({ type }) => type.startsWith('touch'))
  assert.equal(touch.length, 4)
  for (const { options } of touch) assert.deepEqual(options, { passive: true })
})

test('dispose quita todos los listeners', () => {
  const win = (globalThis.window = fakeWindow())
  const pointer = trackPointer()
  assert.equal(win.listenerCount(), 5)
  pointer.dispose()
  assert.equal(win.listenerCount(), 0)
})

test('sin window (SSR) devuelve un puntero quieto que no rompe', () => {
  const pointer = trackPointer()
  assert.deepEqual([pointer.x, pointer.y], [0, 0])
  assert.doesNotThrow(() => pointer.dispose())
})

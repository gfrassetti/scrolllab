import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { createFrameBudget } from '../motion.js'

const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'navigator', original)
  else delete globalThis.navigator
})

/** Alimenta N cuadros de `ms` cada uno. */
function feed(budget, frames, ms) {
  for (let i = 0; i < frames; i++) budget.tick(ms)
}

const WARMUP = 15
const SPAN = 30

test('si va lento baja el pixel ratio un escalón y vuelve a medir', () => {
  setNavigator({ webdriver: false })
  const applied = []
  const budget = createFrameBudget({ dpr: 2, apply: (v) => applied.push(v) })
  feed(budget, WARMUP + SPAN, 50)
  assert.deepEqual(applied, [1.5])
  assert.equal(budget.dpr, 1.5)
  feed(budget, WARMUP + SPAN, 50)
  assert.deepEqual(applied, [1.5, 1.13])
})

test('nunca baja del piso', () => {
  setNavigator({ webdriver: false })
  const applied = []
  const budget = createFrameBudget({ dpr: 1.2, apply: (v) => applied.push(v), min: 1 })
  feed(budget, (WARMUP + SPAN) * 5, 80)
  assert.deepEqual(applied, [1])
  assert.equal(budget.dpr, 1)
})

test('si anda bien deja de medir y no toca nada', () => {
  setNavigator({ webdriver: false })
  const applied = []
  const budget = createFrameBudget({ dpr: 2, apply: (v) => applied.push(v) })
  feed(budget, WARMUP + SPAN, 16.7)
  feed(budget, (WARMUP + SPAN) * 3, 90) // ya no mide: un mal rato posterior no lo toca
  assert.deepEqual(applied, [])
  assert.equal(budget.dpr, 2)
})

test('un teléfono muy lento no espera medio minuto: la ventana también corta por tiempo', () => {
  setNavigator({ webdriver: false })
  const applied = []
  const budget = createFrameBudget({ dpr: 2, apply: (v) => applied.push(v) })
  feed(budget, WARMUP + 7, 400) // 3 cuadros por segundo: 7 cuadros ya son 2,8 s
  assert.deepEqual(applied, [1.5])
})

test('la pestaña en segundo plano y los tirones de más de un segundo no cuentan', () => {
  setNavigator({ webdriver: false })
  const applied = []
  const budget = createFrameBudget({ dpr: 2, apply: (v) => applied.push(v) })
  feed(budget, 500, 2000) // pestaña dormida: nada de esto suma
  feed(budget, WARMUP + SPAN, 16.7)
  assert.deepEqual(applied, [])
  assert.equal(budget.dpr, 2)
})

test('con un navegador automatizado no actúa', () => {
  setNavigator({ webdriver: true })
  const applied = []
  const budget = createFrameBudget({ dpr: 2, apply: (v) => applied.push(v) })
  feed(budget, (WARMUP + SPAN) * 4, 200)
  assert.deepEqual(applied, [])
  assert.equal(budget.dpr, 2)
})

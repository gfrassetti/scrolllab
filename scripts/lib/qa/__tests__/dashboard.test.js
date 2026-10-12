import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { renderDashboard, statusLine } from '../dashboard.js'

const now = '2026-10-12T15:00:00.000Z'
const f = (id, status, extra = {}) => ({
  id,
  model: 'kin',
  step: 'mobile',
  detail: `detalle ${id}`,
  status,
  firstSeen: '2026-10-11T03:00:00.000Z',
  timesSeen: 1,
  ...extra,
})

describe('renderDashboard', () => {
  it('todo en verde sin hallazgos', () => {
    const md = renderDashboard({}, { lastRun: now, lastCommit: 'abcdef123' }, { now })
    assert.match(md, /🟢 todo en verde/)
    assert.match(md, /`abcdef1`/)
    assert.match(md, /_Nada abierto\._/)
  })
  it('lo que espera una persona va primero y manda el semáforo', () => {
    const md = renderDashboard(
      { a: f('a', 'open'), b: f('b', 'needs-person', { note: 'está en motion.js' }) },
      {},
      { now },
    )
    assert.match(md, /🟠 1 esperan tu decisión/)
    assert.ok(md.indexOf('Esperan tu decisión') < md.indexOf('## Abiertos'))
    assert.match(md, /está en motion\.js/)
    assert.match(md, /### kin \(1\)/)
    assert.match(md, /teléfono/)
  })
  it('arreglados solo de los últimos días, del más nuevo al más viejo', () => {
    const md = renderDashboard(
      {
        old: f('old', 'fixed', { fixedAt: '2026-09-01T03:00:00.000Z' }),
        a: f('a', 'fixed', { fixedAt: '2026-10-11T03:00:00.000Z', note: 'abc1234: era el clip' }),
        b: f('b', 'fixed', { fixedAt: '2026-10-12T03:00:00.000Z' }),
      },
      {},
      { now },
    )
    assert.match(md, /Arreglados en los últimos 7 días \(2\)/)
    assert.ok(md.indexOf('detalle b') < md.indexOf('detalle a'))
    assert.doesNotMatch(md, /detalle old/)
    assert.match(md, /abc1234: era el clip/)
  })
  it('muestra la última observación del agente que mira', () => {
    const obs = '# Observaciones\n\n## 2026-10-11 — apex\n- vieja\n\n## 2026-10-12 — kin\n- nueva'
    const md = renderDashboard({}, {}, { now, observations: obs })
    assert.match(md, /## 2026-10-12 — kin\n- nueva/)
    assert.doesNotMatch(md, /- vieja/)
  })
})

describe('statusLine', () => {
  it('cuenta por estado', () => {
    assert.equal(statusLine({ a: f('a', 'open'), b: f('b', 'fixed') }), 'abiertos 1 · esperan decisión 0 · arreglados 1')
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildSubscriptionPriceChange } from '../services/emailTemplatesBilling.js'

const base = { plan: 'hosted_pro', cycle: 'monthly', currency_id: 'ARS', locale: 'es', status: 'authorized' }
const args = (subscription, notice) => ({
  subscription,
  user: { name: 'Ana', email: 'ana@example.com' },
  accountUrl: 'https://x/lab',
  logoUrl: 'https://x/logo.svg',
  notice,
})

describe('mail de cambio de precio de LAB', () => {
  it('suba: los dos precios, desde qué cobro y cómo cancelar sin que se le cobre', () => {
    const m = buildSubscriptionPriceChange(
      args(base, { kind: 'increase', from: 99900, to: 129900, effectiveAt: '2026-12-01T12:00:00Z' }),
    )
    assert.match(m.subject, /Pro de LAB cambia de precio/)
    assert.match(m.text, /99\.900/)
    assert.match(m.text, /129\.900/)
    assert.match(m.text, /diciembre/)
    assert.match(m.text, /cancelás desde Mi LAB antes del/)
    assert.match(m.text, /hasta ese día pagás lo mismo que ahora/)
    assert.match(m.html, /Ir a Mi LAB/)
  })
  it('baja: sin aviso de cancelación y sin fecha obligatoria', () => {
    const m = buildSubscriptionPriceChange(args(base, { kind: 'decrease', from: 129900, to: 89900 }))
    assert.match(m.subject, /baja de precio/)
    assert.match(m.text, /desde el próximo cobro\./)
    assert.doesNotMatch(m.text, /cancelás/)
  })
  it('recordatorio del anual', () => {
    const m = buildSubscriptionPriceChange(
      args({ ...base, cycle: 'yearly' }, { kind: 'reminder', from: 999000, to: 1299000, effectiveAt: '2027-09-01T12:00:00Z' }),
    )
    assert.match(m.subject, /Recordatorio: tu plan Pro anual se renueva a/)
    assert.match(m.text, /por año/)
    assert.match(m.text, /cancelás desde Mi LAB/)
  })
  it('en inglés y en dólares (Paddle)', () => {
    const m = buildSubscriptionPriceChange(
      args({ ...base, locale: 'en', currency_id: 'USD' }, { kind: 'increase', from: 79, to: 99, effectiveAt: '2026-12-01T12:00:00Z' }),
    )
    assert.match(m.subject, /The price of your LAB Pro plan is changing/)
    assert.match(m.text, /US\$|\$\s?99|USD/)
    assert.match(m.text, /cancel from My LAB before/)
  })
  it('el nombre del usuario sale escapado en el HTML', () => {
    const m = buildSubscriptionPriceChange({
      ...args(base, { kind: 'increase', from: 1, to: 2, effectiveAt: '2026-12-01T12:00:00Z' }),
      user: { name: '<b>Ana</b>' },
    })
    assert.ok(!m.html.includes('<b>Ana</b>'))
  })
})

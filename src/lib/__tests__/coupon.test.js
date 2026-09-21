import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { couponLinePrice, formatCouponDate } from '../coupon.js'

describe('couponLinePrice', () => {
  it('en pesos usa el mismo redondeo que el servidor', () => {
    assert.equal(couponLinePrice({ usd: 149, rate: 1560, percent: 10, currency: 'ARS' }), 210000)
    assert.equal(couponLinePrice({ usd: 649, rate: 1560, percent: 10, currency: 'ARS' }), 912000)
  })

  it('en USD descuenta y redondea a centavos', () => {
    assert.equal(couponLinePrice({ usd: 149, percent: 10, currency: 'USD' }), 134.1)
    assert.equal(couponLinePrice({ usd: 189, percent: 10, currency: 'USD' }), 170.1)
  })

  it('sin precio de lista devuelve null', () => {
    assert.equal(couponLinePrice({ usd: null, rate: 1560, percent: 10, currency: 'ARS' }), null)
  })
})

describe('formatCouponDate', () => {
  it('escribe el vencimiento en hora argentina y en el idioma de la UI', () => {
    assert.equal(formatCouponDate('2026-10-02T15:00:00Z', 'es'), '2 de octubre')
    assert.equal(formatCouponDate('2026-10-02T15:00:00Z', 'en'), 'October 2')
  })

  it('una fecha inválida no rompe', () => {
    assert.equal(formatCouponDate('nunca', 'es'), '')
  })
})

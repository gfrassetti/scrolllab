import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { couponLinePrice, firstPurchaseDeal, formatCouponDate } from '../coupon.js'

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

describe('firstPurchaseDeal (precio de los «Comprar» rápidos)', () => {
  const COUPON = { code: 'SL-ABCDEF', percent: 10 }

  it('con cupón vigente: lista tachada y precio con el 10%, en pesos', () => {
    const deal = firstPurchaseDeal({ usd: 149, currency: 'ARS', rate: 1560, coupon: COUPON })
    assert.equal(deal.percent, 10)
    assert.match(deal.list.replace(/\s/g, ' '), /233\.000/)
    assert.match(deal.price.replace(/\s/g, ' '), /210\.000/)
  })

  it('con cupón vigente, en dólares (Paddle): con centavos', () => {
    const deal = firstPurchaseDeal({ usd: 149, currency: 'USD', coupon: COUPON })
    assert.deepEqual(deal, { list: 'US$149', price: 'US$134.10', percent: 10 })
  })

  it('sin cupón (sin sesión, ya compró o ya lo usó): solo la lista', () => {
    assert.deepEqual(firstPurchaseDeal({ usd: 149, currency: 'USD', coupon: null }), {
      list: 'US$149',
      price: null,
      percent: null,
    })
  })

  it('sin precio no muestra nada', () => {
    assert.equal(firstPurchaseDeal({ usd: null, currency: 'USD', coupon: COUPON }), null)
  })
})

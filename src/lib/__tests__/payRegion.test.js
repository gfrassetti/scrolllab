import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  pickRegion,
  regionFromCountry,
  regionFromTimeZone,
  providerForRegion,
} from '../payRegion.js'
import { formatUsd } from '../pricing.js'
import { couponLinePrice } from '../coupon.js'

/**
 * Desde dónde paga el comprador (el default del selector del carrito y de
 * LAB): la detección solo propone; la elección guardada manda; sin Paddle,
 * siempre Mercado Pago.
 */
describe('región de pago', () => {
  it('país: Argentina → ar; cualquier otro (también Latinoamérica) → intl', () => {
    assert.equal(regionFromCountry('AR'), 'ar')
    assert.equal(regionFromCountry('ar'), 'ar')
    for (const c of ['ES', 'US', 'CL', 'MX', 'UY', 'BR', 'DE']) {
      assert.equal(regionFromCountry(c), 'intl', c)
    }
    assert.equal(regionFromCountry(null), null)
  })

  it('zona horaria: las de Argentina → ar; el resto → intl', () => {
    for (const tz of [
      'America/Argentina/Buenos_Aires',
      'America/Argentina/Cordoba',
      'America/Buenos_Aires',
      'America/Mendoza',
    ]) {
      assert.equal(regionFromTimeZone(tz), 'ar', tz)
    }
    for (const tz of ['Europe/Madrid', 'America/Santiago', 'America/Montevideo', 'UTC']) {
      assert.equal(regionFromTimeZone(tz), 'intl', tz)
    }
    assert.equal(regionFromTimeZone(''), null)
  })

  it('el default: sin Paddle, Argentina; si no, guardado > país > zona horaria > Argentina', () => {
    assert.equal(pickRegion({ stored: 'intl', country: 'ES', paddleEnabled: false }), 'ar')
    assert.equal(
      pickRegion({ stored: 'ar', country: 'ES', timeZone: 'Europe/Madrid', paddleEnabled: true }),
      'ar',
    )
    assert.equal(
      pickRegion({ stored: null, country: 'ES', timeZone: 'America/Argentina/Salta', paddleEnabled: true }),
      'intl',
    )
    assert.equal(
      pickRegion({ stored: 'basura', country: null, timeZone: 'Europe/Madrid', paddleEnabled: true }),
      'intl',
    )
    assert.equal(pickRegion({ paddleEnabled: true }), 'ar')
  })

  it('cada región tiene su pasarela', () => {
    assert.equal(providerForRegion('ar'), 'mercadopago')
    assert.equal(providerForRegion('intl'), 'paddle')
  })

  it('USD: centavos solo si los hay, igual que lo que cobra Paddle con el cupón', () => {
    assert.equal(formatUsd(149), '$149')
    const discounted = couponLinePrice({ usd: 149, rate: 1500, percent: 10, currency: 'USD' })
    assert.equal(discounted, 134.1)
    assert.equal(formatUsd(discounted), '$134.10')
  })
})

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const {
  captureCouponFromUrl,
  clearCoupon,
  couponLinePrice,
  formatCouponDate,
  loadCoupon,
  saveCoupon,
} = await import('../coupon.js')

describe('cupón guardado', () => {
  beforeEach(() => localStorage.clear())

  it('guarda, lee y borra', () => {
    assert.equal(loadCoupon(), null)
    saveCoupon({ code: 'SL-ABC234', percent: 10, expiresAt: '2026-10-02T15:00:00Z' })
    assert.deepEqual(loadCoupon(), {
      code: 'SL-ABC234',
      percent: 10,
      expiresAt: '2026-10-02T15:00:00Z',
    })
    clearCoupon()
    assert.equal(loadCoupon(), null)
  })

  it('guarda el mail enmascarado para decir con qué cuenta entrar', () => {
    saveCoupon({ code: 'SL-ABC234', percent: 10, emailHint: 'a***@gmail.com' })
    assert.equal(loadCoupon().emailHint, 'a***@gmail.com')
  })

  it('no guarda nada sin código y tolera basura en el storage', () => {
    saveCoupon({})
    saveCoupon()
    assert.equal(loadCoupon(), null)
    localStorage.setItem('scrolllab-coupon', '{no es json')
    assert.equal(loadCoupon(), null)
    localStorage.setItem('scrolllab-coupon', JSON.stringify({ percent: 10 }))
    assert.equal(loadCoupon(), null)
  })
})

describe('captureCouponFromUrl', () => {
  beforeEach(() => localStorage.clear())

  function fakeWindow(url) {
    const u = new URL(url)
    const calls = []
    return {
      loc: { search: u.search, pathname: u.pathname, hash: u.hash },
      hist: { state: null, replaceState: (...args) => calls.push(args) },
      calls,
    }
  }

  it('guarda el código del link del mail y lo saca de la URL', () => {
    const { loc, hist, calls } = fakeWindow('https://x.test/?cupon=SL-ABC234&utm=mail#templates')
    assert.equal(captureCouponFromUrl(loc, hist), 'SL-ABC234')
    assert.equal(loadCoupon().code, 'SL-ABC234')
    assert.equal(calls[0][2], '/?utm=mail#templates')
  })

  it('sin ?cupon no toca nada', () => {
    const { loc, hist, calls } = fakeWindow('https://x.test/cart')
    assert.equal(captureCouponFromUrl(loc, hist), null)
    assert.equal(loadCoupon(), null)
    assert.equal(calls.length, 0)
  })

  it('con la URL limpia no deja el signo ?', () => {
    const { loc, hist, calls } = fakeWindow('https://x.test/cart?cupon=SL-ABC234')
    captureCouponFromUrl(loc, hist)
    assert.equal(calls[0][2], '/cart')
  })
})

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

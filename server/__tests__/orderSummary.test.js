import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { orderPriceSummary } from '../../src/domain/orderSummary.js'
import { arsFromUsd, discountedArsFromUsd } from '../catalog.js'
import { buildOrderReceipt } from '../services/emailTemplates.js'
import { labelDiscount } from '../services/checkout.js'

const RATE = 1560

/**
 * El 10% de primera compra a la vista y bien cuadrado: el resumen (subtotal a
 * precio de lista − descuento = total cobrado) en pesos y en dólares, el recibo
 * y lo que ven las pantallas de Mercado Pago y de Paddle.
 */
describe('orderPriceSummary', () => {
  it('en pesos: subtotal de lista − descuento = lo cobrado, con el mismo redondeo', () => {
    const order = {
      currency_id: 'ARS',
      fxRate: RATE,
      discountPct: 10,
      items: [
        { sku: 'chapters', title: 'CHAPTERS', unit_price_usd: 149, unit_price: discountedArsFromUsd(149, RATE, 10) },
        { sku: 'fizz', title: 'FIZZ', unit_price_usd: 189, unit_price: discountedArsFromUsd(189, RATE, 10) },
      ],
    }
    order.total = order.items.reduce((s, i) => s + i.unit_price, 0)
    const s = orderPriceSummary(order)
    assert.equal(s.subtotal, arsFromUsd(149, RATE) + arsFromUsd(189, RATE))
    assert.equal(s.discountPct, 10)
    assert.equal(s.subtotal - s.discount, order.total)
    assert.deepEqual(s.items.map((i) => i.list), [arsFromUsd(149, RATE), arsFromUsd(189, RATE)])
  })

  it('en dólares: con centavos', () => {
    const order = { currency_id: 'USD', discountPct: 10, total: 134.1, items: [{ title: 'CHAPTERS', unit_price_usd: 149, unit_price: 134.1 }] }
    const s = orderPriceSummary(order)
    assert.deepEqual([s.subtotal, s.discount, s.total], [149, 14.9, 134.1])
  })

  it('sin descuento: el subtotal es el total y no hay línea de descuento', () => {
    const order = { currency_id: 'USD', total: 149, items: [{ title: 'CHAPTERS', unit_price_usd: 149, unit_price: 149 }] }
    const s = orderPriceSummary(order)
    assert.deepEqual([s.subtotal, s.discount, s.discountPct], [149, 0, 0])
  })
})

describe('el descuento a la vista', () => {
  it('el recibo muestra precio de lista, el descuento con nombre y el total cobrado', () => {
    const order = {
      id: 'o1',
      currency_id: 'USD',
      provider: 'paddle',
      discountPct: 10,
      total: 134.1,
      items: [{ sku: 'chapters', title: 'CHAPTERS — template', unit_price_usd: 149, unit_price: 134.1 }],
    }
    const mail = buildOrderReceipt({ order, user: { name: 'Ana' }, accountUrl: 'https://x/account', logoUrl: 'https://x/l.png' })
    assert.match(mail.text, /CHAPTERS — template: US\$\s?149/)
    assert.match(mail.text, /Descuento de primera compra \(10%\): −US\$\s?14[.,]90/)
    assert.match(mail.text, /Total: US\$\s?134[.,]10/)
    const en = buildOrderReceipt({ order: { ...order, locale: 'en' }, user: { name: 'Ana' }, accountUrl: 'https://x/account', logoUrl: 'https://x/l.png' })
    assert.match(en.text, /First-purchase discount \(10%\)/)
  })

  it('el recibo sin descuento queda igual que siempre', () => {
    const order = { id: 'o2', currency_id: 'ARS', total: 233000, items: [{ title: 'CHAPTERS', unit_price: 233000 }] }
    const mail = buildOrderReceipt({ order, user: { name: 'Ana' }, accountUrl: 'https://x/account', logoUrl: 'https://x/l.png' })
    assert.ok(!/Descuento/.test(mail.text))
  })

  it('Mercado Pago y Paddle muestran el descuento en el nombre del ítem', () => {
    const line = { sku: 'chapters', title: 'CHAPTERS — template', unit_price_usd: 149, unit_price: 210000 }
    const mp = labelDiscount(line, 10, { paddle: false, rate: RATE })
    assert.equal(mp.title, 'CHAPTERS — template · 10% off primera compra')
    assert.match(mp.description, /Precio de lista \$ 233\.000 — 10% de descuento/)
    assert.equal(mp.unit_price, 210000)
    const pd = labelDiscount({ ...line, unit_price: 134.1 }, 10, { paddle: true, lang: 'en' })
    assert.equal(pd.title, 'CHAPTERS — template (10% off, first purchase)')
    assert.match(pd.description, /List price US\$149/)
  })
})

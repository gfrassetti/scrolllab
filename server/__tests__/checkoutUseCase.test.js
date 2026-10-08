import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

/**
 * createCheckoutOrder sin HTTP (modo mock): la orden sale con los precios del
 * servidor, nunca con los del cliente.
 */
describe('createCheckoutOrder', () => {
  let dir
  let createCheckoutOrder
  let db
  let arsFromUsd
  let TEMPLATE_PRICES_USD
  let config
  let user

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.FX_OFFLINE = 'true'
    process.env.FX_FALLBACK_RATE = '1560'
    process.env.FX_SPREAD_PCT = '0'
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-checkout-uc-'))
    process.env.STORAGE_DIR = dir
    process.env.FILE_DB_DIR = path.join(dir, 'db')
    ;({ db } = await import('../db.js'))
    ;({ createCheckoutOrder } = await import('../services/checkout.js'))
    ;({ arsFromUsd } = await import('../catalog.js'))
    ;({ TEMPLATE_PRICES_USD } = await import('../../src/domain/catalog.js'))
    config = {
      mpMock: true,
      clientUrl: 'http://localhost:5173',
      maxCartItems: 5,
      maxRecipeSections: 30,
    }
    user = await db.createUser({ email: 'uc@test.com', name: 'UC' })
  })

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('primera compra: el 10% se aplica solo, aunque no venga el código (Comprar rápido)', async () => {
    const first = await db.createUser({ email: 'primera@test.com', name: 'Primera' })
    const out = await createCheckoutOrder({ user: first, items: [{ sku: 'chapters' }], config })
    const order = await db.findOrderById(out.orderId)
    assert.equal(order.discountPct, 10)
    assert.match(order.couponCode, /^SL-/)
    assert.ok(order.total < arsFromUsd(TEMPLATE_PRICES_USD.chapters, 1560))
  })

  it('ignora el precio del cliente y cobra el de lista (cliente que ya compró)', async () => {
    await db.createOrder({ userId: db.uid(user), status: 'paid', provider: 'mercadopago', items: [{ sku: 'nocturne' }], total: 1, currency_id: 'ARS' })
    const out = await createCheckoutOrder({
      user,
      items: [{ sku: 'chapters', unit_price: 1, unit_price_usd: 1 }],
      config,
    })
    assert.equal(out.mock, true)
    assert.equal(out.init_point, `http://localhost:5173/checkout/mock?orderId=${out.orderId}`)
    const order = await db.findOrderById(out.orderId)
    assert.equal(order.status, 'pending')
    assert.equal(order.userId, db.uid(user))
    assert.equal(order.totalUsd, TEMPLATE_PRICES_USD.chapters)
    assert.equal(order.total, arsFromUsd(TEMPLATE_PRICES_USD.chapters, 1560))
    assert.equal(order.items[0].unit_price, order.total)
    assert.equal(order.couponCode, undefined)
  })

  it('un SKU que no se vende corta antes de crear la orden', async () => {
    const before = (await db.findOrdersByUser(db.uid(user))).length
    await assert.rejects(
      createCheckoutOrder({ user, items: [{ sku: 'ratio' }], config }),
      (err) => err.status === 400,
    )
    assert.equal((await db.findOrdersByUser(db.uid(user))).length, before)
  })
})

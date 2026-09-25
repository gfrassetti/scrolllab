/**
 * El camino de Mongo (producción) del cupón. No hay Mongo en los tests, así que
 * acá se prueba lo que sí se puede sin base: que los esquemas conserven los
 * campos del cupón (Mongoose descarta en silencio lo que no está en el esquema)
 * y que las consultas que arma `db.js` sean las correctas, con los modelos
 * simulados.
 */
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// db.js elige el camino según STORE al cargarse; nunca se conecta.
process.env.NODE_ENV = 'development'
process.env.STORE = 'mongo'

const { Lead, Order } = await import('../models.js')
const { db } = await import('../db.js')
const { markOrderPaid } = await import('../services/orders.js')
const { resolveCouponForCheckout } = await import('../services/coupons.js')

const restores = []
/** Reemplaza un método estático del modelo; se deshace solo en afterEach. */
function stub(model, name, impl) {
  const own = Object.prototype.hasOwnProperty.call(model, name)
  const original = model[name]
  model[name] = impl
  restores.push(() => {
    if (own) model[name] = original
    else delete model[name]
  })
}
afterEach(() => {
  while (restores.length) restores.pop()()
})

const future = () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)

describe('esquemas de Mongoose (sin base)', () => {
  it('la orden conserva el cupón y el descuento', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      items: [{ sku: 'chapters', unit_price: 210000, unit_price_usd: 149 }],
      total: 210000,
      couponCode: 'SL-ABC234',
      discountPct: 10,
    })
    assert.equal(order.couponCode, 'SL-ABC234')
    assert.equal(order.toObject().discountPct, 10)
    assert.equal(order.validateSync(), undefined)
  })

  it('una orden sin cupón no inventa esos campos', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      items: [{ sku: 'chapters', unit_price: 233000, unit_price_usd: 149 }],
      total: 233000,
    })
    const plain = order.toObject()
    assert.equal('couponCode' in plain, false)
    assert.equal('discountPct' in plain, false)
  })

  it('el lead conserva el cupón, normaliza el mail y guarda las fechas', () => {
    const expires = future()
    const lead = new Lead({
      email: '  Ana@Estudio.COM ',
      couponCode: 'SL-ABC234',
      couponPercent: 10,
      couponExpiresAt: expires,
    })
    assert.equal(lead.email, 'ana@estudio.com')
    assert.equal(lead.couponCode, 'SL-ABC234')
    assert.equal(lead.couponPercent, 10)
    assert.equal(lead.couponExpiresAt.getTime(), expires.getTime())
    assert.equal(lead.couponRedeemedAt, undefined)
    assert.equal(lead.validateSync(), undefined)
  })

  it('el código del cupón es único y sparse: muchos leads sin cupón no chocan', () => {
    const index = Lead.schema.indexes().find(([fields]) => 'couponCode' in fields)
    assert.ok(index, 'falta el índice de couponCode')
    assert.equal(index[1].unique, true)
    assert.equal(index[1].sparse, true)
  })

  it('el mail del lead es único', () => {
    const index = Lead.schema.indexes().find(([fields]) => 'email' in fields)
    assert.ok(index)
    assert.equal(index[1].unique, true)
  })
})

describe('db — camino de Mongo con los modelos simulados', () => {
  it('upsertLead crea y avisa que es el primer alta', async () => {
    stub(Lead, 'create', async (data) => ({ ...data, _id: 'nuevo' }))
    const { lead, created } = await db.upsertLead({ email: 'ana@estudio.com', source: 'home' })
    assert.equal(created, true)
    assert.equal(lead.email, 'ana@estudio.com')
  })

  it('upsertLead: un duplicado (11000) devuelve el lead que ya estaba', async () => {
    let queried
    stub(Lead, 'create', async () => {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    })
    stub(Lead, 'findOne', async (query) => {
      queried = query
      return { email: 'ana@estudio.com', couponCode: 'SL-ABC234' }
    })
    const { lead, created } = await db.upsertLead({ email: 'ANA@estudio.com' })
    assert.equal(created, false)
    assert.equal(lead.couponCode, 'SL-ABC234')
    assert.deepEqual(queried, { email: 'ana@estudio.com' })
  })

  it('upsertLead: cualquier otro error se propaga', async () => {
    stub(Lead, 'create', async () => {
      throw new Error('se cayó la base')
    })
    await assert.rejects(() => db.upsertLead({ email: 'ana@estudio.com' }), /se cayó la base/)
  })

  it('findLeadByCoupon busca por el código exacto', async () => {
    let queried
    stub(Lead, 'findOne', async (query) => {
      queried = query
      return null
    })
    await db.findLeadByCoupon('SL-ABC234')
    assert.deepEqual(queried, { couponCode: 'SL-ABC234' })
  })

  it('redeemCoupon gana una sola vez: filtra los sin canjear y guarda la orden como texto', async () => {
    let call
    stub(Lead, 'findOneAndUpdate', async (filter, update, options) => {
      call = { filter, update, options }
      return { couponCode: 'SL-ABC234' }
    })
    const out = await db.redeemCoupon({ code: 'SL-ABC234', orderId: 12345 })
    assert.deepEqual(out, { redeemed: true })
    assert.deepEqual(call.filter, { couponCode: 'SL-ABC234', couponRedeemedAt: null })
    assert.equal(call.update.$set.couponOrderId, '12345')
    assert.ok(call.update.$set.couponRedeemedAt instanceof Date)
    assert.equal(call.options.new, true)
  })

  it('redeemCoupon: repetir con la misma orden es ok; con otra orden o sin cupón, no', async () => {
    stub(Lead, 'findOneAndUpdate', async () => null) // ya estaba canjeado
    stub(Lead, 'findOne', async ({ couponCode }) =>
      couponCode === 'SL-ABC234' ? { couponCode, couponOrderId: 'ord-1' } : null,
    )
    assert.deepEqual(await db.redeemCoupon({ code: 'SL-ABC234', orderId: 'ord-1' }), { redeemed: true })
    assert.deepEqual(await db.redeemCoupon({ code: 'SL-ABC234', orderId: 'ord-2' }), { redeemed: false })
    assert.deepEqual(await db.redeemCoupon({ code: 'SL-ZZZZZZ', orderId: 'ord-1' }), { redeemed: false })
  })

  it('listLeads({ unsyncedOnly }) filtra por crmSyncedAt null y ordena por alta', async () => {
    let filter
    let sort
    stub(Lead, 'find', (query) => {
      filter = query
      return {
        sort: async (order) => {
          sort = order
          return [{ email: 'uno@estudio.com' }]
        },
      }
    })
    const rows = await db.listLeads({ unsyncedOnly: true })
    assert.deepEqual(filter, { crmSyncedAt: null })
    assert.deepEqual(sort, { createdAt: 1 })
    assert.equal(rows.length, 1)

    await db.listLeads()
    assert.deepEqual(filter, {})
  })
})

describe('cobro en Mongo: el cupón se canjea con la orden', () => {
  const orderId = new mongoose.Types.ObjectId()

  function stubOrderPaid({ created }) {
    // markOrderPaidAtomic: primero busca un pago igual ya cobrado, después pasa pending → paid.
    stub(Order, 'findOne', async () => (created ? null : { _id: orderId, status: 'paid', couponCode: 'SL-ABC234' }))
    stub(Order, 'findOneAndUpdate', async () => ({ _id: orderId, status: 'paid', couponCode: 'SL-ABC234' }))
  }

  it('al pasar a paga canjea el cupón de esa orden', async () => {
    stubOrderPaid({ created: true })
    let redeem
    stub(Lead, 'findOneAndUpdate', async (filter, update) => {
      redeem = { filter, update }
      return { couponCode: 'SL-ABC234' }
    })
    const result = await markOrderPaid({ orderId: String(orderId), mpPaymentId: 'pay-1' })
    assert.equal(result.created, true)
    assert.deepEqual(redeem.filter, { couponCode: 'SL-ABC234', couponRedeemedAt: null })
    assert.equal(redeem.update.$set.couponOrderId, String(orderId))
  })

  it('un pago ya cobrado (webhook repetido) no vuelve a canjear', async () => {
    stubOrderPaid({ created: false })
    stub(Lead, 'findOneAndUpdate', async () => {
      assert.fail('no debería canjear de nuevo')
    })
    const result = await markOrderPaid({ orderId: String(orderId), mpPaymentId: 'pay-1' })
    assert.equal(result.created, false)
  })

  it('si canjear falla, el pago se registra igual', async () => {
    stubOrderPaid({ created: true })
    stub(Lead, 'findOneAndUpdate', async () => {
      throw new Error('Mongo se cayó justo ahora')
    })
    const originalError = console.error
    console.error = () => {}
    try {
      const result = await markOrderPaid({ orderId: String(orderId), mpPaymentId: 'pay-1' })
      assert.equal(result.created, true)
      assert.equal(result.order.status, 'paid')
    } finally {
      console.error = originalError
    }
  })
})

describe('primera compra en Mongo', () => {
  const lead = () => ({
    couponCode: 'SL-ABC234',
    couponPercent: 10,
    couponExpiresAt: future(),
  })

  it('un usuario con una compra paga no puede usar el cupón (422)', async () => {
    stub(Lead, 'findOne', async () => lead())
    stub(Order, 'find', () => ({ sort: async () => [{ status: 'pending' }, { status: 'paid' }] }))
    await assert.rejects(
      () => resolveCouponForCheckout({ code: 'SL-ABC234', userId: 'u1' }),
      (err) => err.status === 422,
    )
  })

  it('con solo checkouts pendientes o fallidos sí puede', async () => {
    stub(Lead, 'findOne', async () => lead())
    stub(Order, 'find', () => ({ sort: async () => [{ status: 'pending' }, { status: 'failed' }] }))
    const out = await resolveCouponForCheckout({ code: 'sl-abc234', userId: 'u1' })
    assert.equal(out.code, 'SL-ABC234')
    assert.equal(out.percent, 10)
  })
})

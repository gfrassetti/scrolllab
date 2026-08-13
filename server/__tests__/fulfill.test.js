import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Webhook y confirm cumplen la misma orden. Confirmar un pago que el webhook ya
 * cumplió tiene que devolver éxito: cualquier excepción acá se le muestra como
 * «Error interno» a alguien que ya pagó.
 */
describe('fulfillApprovedPayment (file store)', () => {
  let fulfillApprovedPayment
  let db
  let HttpError
  let config
  let storageDir

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-fulfill-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    ;({ db } = await import('../db.js'))
    ;({ HttpError } = await import('../validation.js'))
    ;({ fulfillApprovedPayment } = await import('../services/orders.js'))

    config = {
      storageDir,
      clientUrl: 'http://localhost:5173',
      email: { enabled: false },
    }
  })

  after(() => {
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  let seq = 0
  async function seedOrder(total = 12000) {
    seq += 1
    const tag = `fulfill-${Date.now()}-${seq}`
    const user = await db.createUser({
      email: `${tag}@test.com`,
      name: 'Buyer',
      googleId: `dev-${tag}`,
    })
    const order = await db.createOrder({
      userId: db.uid(user),
      status: 'pending',
      items: [
        {
          sku: 'chapters',
          title: 'Chapters',
          unit_price: total,
          currency_id: 'ARS',
        },
      ],
      total,
      currency_id: 'ARS',
    })
    return { user, order }
  }

  function approvedPayment(order, extra = {}) {
    return {
      id: 1234567890,
      status: 'approved',
      transaction_amount: order.total,
      currency_id: 'ARS',
      external_reference: order.id,
      ...extra,
    }
  }

  const isHttp = (status) => (err) =>
    err instanceof HttpError && err.status === status

  it('es idempotente: el segundo fulfillment devuelve la orden, no un error', async () => {
    const { user, order } = await seedOrder()
    const payment = approvedPayment(order)

    const first = await fulfillApprovedPayment({ payment, config })
    assert.equal(first.alreadyFulfilled, false)
    assert.equal(first.order.status, 'paid')
    assert.equal(first.orderId, order.id)
    // El pack se hace best-effort y traga el error: sin esto, un ENOENT en
    // STORAGE_DIR pasaría desapercibido.
    assert.ok(first.order.zipPath, 'no dejó el ZIP de la orden')
    assert.ok(fs.existsSync(first.order.zipPath), 'el ZIP no está en disco')

    const second = await fulfillApprovedPayment({
      payment,
      config,
      expectedUserId: db.uid(user),
    })
    assert.equal(second.alreadyFulfilled, true)
    assert.equal(second.order.status, 'paid')
    assert.equal(second.orderId, order.id)
  })

  it('un pago en proceso es 409, no 500', async () => {
    const { order } = await seedOrder()
    await assert.rejects(
      fulfillApprovedPayment({
        payment: approvedPayment(order, { status: 'in_process' }),
        config,
      }),
      isHttp(409),
    )
  })

  it('un pago rechazado es 400', async () => {
    const { order } = await seedOrder()
    await assert.rejects(
      fulfillApprovedPayment({
        payment: approvedPayment(order, { status: 'rejected' }),
        config,
      }),
      isHttp(400),
    )
  })

  it('un external_reference desconocido es 404', async () => {
    const { order } = await seedOrder()
    await assert.rejects(
      fulfillApprovedPayment({
        payment: approvedPayment(order, {
          external_reference: 'deadbeefdeadbeefdeadbeef',
        }),
        config,
      }),
      isHttp(404),
    )
  })

  it('un pago sin referencia de orden es 400', async () => {
    const { order } = await seedOrder()
    await assert.rejects(
      fulfillApprovedPayment({
        payment: approvedPayment(order, { external_reference: null }),
        config,
      }),
      isHttp(400),
    )
  })

  it('confirmar el pago de otra cuenta es 403', async () => {
    const { order } = await seedOrder()
    await assert.rejects(
      fulfillApprovedPayment({
        payment: approvedPayment(order),
        config,
        expectedUserId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      }),
      isHttp(403),
    )
  })
})

describe('sendOrderReceiptOnce (file store)', () => {
  let db
  let sendOrderReceiptOnce
  let storageDir

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-email-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    ;({ db } = await import('../db.js'))
    ;({ sendOrderReceiptOnce } = await import('../services/email.js'))
  })

  after(() => {
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  async function seedPaidOrder() {
    const tag = `email-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const user = await db.createUser({
      email: `${tag}@test.com`,
      name: 'Buyer',
      googleId: `dev-${tag}`,
    })
    const created = await db.createOrder({
      userId: db.uid(user),
      status: 'pending',
      items: [
        {
          sku: 'chapters',
          title: 'CHAPTERS',
          unit_price: 12000,
          currency_id: 'ARS',
        },
      ],
      total: 12000,
      currency_id: 'ARS',
    })
    const { order } = await db.markOrderPaidAtomic({
      orderId: created.id,
      mpPaymentId: `mp-${tag}`,
    })
    return { user, order }
  }

  it('sin email enabled hace skip', async () => {
    const { user, order } = await seedPaidOrder()
    const result = await sendOrderReceiptOnce({
      order,
      user,
      config: {
        clientUrl: 'http://localhost:5173',
        email: { enabled: false },
      },
      client: { emails: { send: async () => assert.fail('no debía llamar Resend') } },
    })
    assert.equal(result.skipped, 'disabled')
  })

  it('envía una sola vez con client mock (idempotente)', async () => {
    const { user, order } = await seedPaidOrder()
    const calls = []
    const client = {
      emails: {
        send: async (body, opts) => {
          calls.push({ body, opts })
          return { data: { id: 're_test_123' }, error: null }
        },
      },
    }
    const config = {
      clientUrl: 'http://localhost:5173',
      email: {
        enabled: true,
        apiKey: 're_test',
        from: 'SCROLLLAB <compras@scrolllab.com.ar>',
        replyTo: 'hola@scrolllab.com.ar',
      },
    }

    const first = await sendOrderReceiptOnce({ order, user, config, client })
    assert.equal(first.sent, true)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.to[0], user.email)
    assert.equal(calls[0].opts.idempotencyKey, `scrolllab-order-${order.id}`)

    const second = await sendOrderReceiptOnce({ order, user, config, client })
    assert.equal(second.skipped, 'already-sent-or-in-progress')
    assert.equal(calls.length, 1)
  })
})

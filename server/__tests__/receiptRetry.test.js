import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeMercadoPago, startAppAgainstFakeMp } from './helpers/fakeMercadoPago.js'
import { retryUnsentReceipts, runSweeps } from '../services/paymentFailedSweep.js'

/**
 * El recibo de una compra paga sale una vez. Si Resend falla justo al cobrar,
 * el barrido lo reintenta (y no lo duplica); fuera de la ventana de 3 días no
 * manda recibos viejos.
 */
describe('recibo que no salió al cobrar', () => {
  const mp = createFakeMercadoPago()
  let loginAs
  let webhook
  let cleanup
  let config
  let fileDb

  before(async () => {
    ;({ loginAs, webhook, cleanup, config, fileDb } = await startAppAgainstFakeMp(mp))
  })
  after(() => cleanup())

  const receipts = (email) => mp.mailsTo(email).filter((m) => /Tu compra en SCROLLLAB|Your SCROLLLAB purchase/.test(m.body.subject))
  const minutes = (n) => new Date(Date.now() + n * 60_000)

  async function buyWhileResendIsDown(email) {
    const agent = await loginAs(email)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }] })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    mp.mailFails = 1 // el recibo (el primer mail de la entrega) falla
    const payment = mp.pay(mp.lastPreference().id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    mp.mailFails = 0
    const order = await fileDb.findOrderById(res.body.orderId)
    assert.equal(order.status, 'paid')
    assert.equal(receipts(email).length, 0, 'el recibo falló al cobrar')
    return order
  }

  it('el barrido manda el recibo una sola vez', async () => {
    const email = 'recibo-caido@test.com'
    await buyWhileResendIsDown(email)

    // Recién pagada: espera, no se pisa con la entrega en curso.
    await retryUnsentReceipts({ config, now: minutes(1) })
    assert.equal(receipts(email).length, 0)

    const out = await retryUnsentReceipts({ config, now: minutes(6) })
    assert.ok(out.sent >= 1)
    assert.equal(receipts(email).length, 1)

    await retryUnsentReceipts({ config, now: minutes(11) })
    assert.equal(receipts(email).length, 1, 'no se duplica')
  })

  it('pasados 3 días no se manda un recibo viejo', async () => {
    const email = 'recibo-viejo@test.com'
    await buyWhileResendIsDown(email)
    await retryUnsentReceipts({ config, now: minutes(4 * 24 * 60) })
    assert.equal(receipts(email).length, 0)
  })

  it('un paso del barrido que falla no frena a los demás', async () => {
    const email = 'recibo-barrido@test.com'
    await buyWhileResendIsDown(email)
    const original = fileDb.listFailedOrdersDue
    fileDb.listFailedOrdersDue = async () => {
      throw new Error('base caída')
    }
    try {
      await runSweeps({ config, now: minutes(6) })
    } finally {
      fileDb.listFailedOrdersDue = original
    }
    assert.equal(receipts(email).length, 1)
  })
})

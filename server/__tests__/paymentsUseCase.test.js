import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

/**
 * handleMercadoPagoNotification sin HTTP: qué notificaciones se ignoran (el
 * webhook responde 200) y cuáles tiran (MP tiene que enterarse). El
 * procesamiento real de pagos y suscripciones lo cubren checkoutPayments,
 * couponPayments y subscriptionsMp contra el MP simulado.
 */
describe('handleMercadoPagoNotification', () => {
  let handle
  const base = {
    mpMock: false,
    mpAccessToken: 'TEST-token',
    mpWebhookSecret: 'whsec_market',
    mpSubs: { accessToken: 'TEST-subs', webhookSecret: 'whsec_subs' },
  }

  before(async () => {
    ;({ handleMercadoPagoNotification: handle } = await import('../services/payments.js'))
  })

  it('sin data.id no hace nada', async () => {
    assert.equal(await handle({ type: 'payment', config: base }), undefined)
  })

  it('en modo mock ignora los pagos', async () => {
    assert.equal(await handle({ type: 'payment', dataId: '1', config: { ...base, mpMock: true } }), undefined)
  })

  it('un tipo que no es pago ni suscripción se ignora', async () => {
    assert.equal(await handle({ type: 'merchant_order', dataId: '1', config: base }), undefined)
  })

  it('suscripciones sin token de LAB se ignoran', async () => {
    const config = { ...base, mpSubs: { accessToken: '', webhookSecret: 'x' } }
    assert.equal(await handle({ type: 'subscription_preapproval', dataId: '1', config }), undefined)
  })

  it('un pago con firma inválida tira 401 (MP no lo da por entregado)', async () => {
    await assert.rejects(
      handle({ type: 'payment', dataId: '1', xSignature: 'ts=1,v1=deadbeef', xRequestId: 'r', config: base }),
      (err) => err.status === 401,
    )
  })

  it('una suscripción con firma inválida también tira 401', async () => {
    await assert.rejects(
      handle({ type: 'subscription_preapproval', dataId: '1', xSignature: 'ts=1,v1=deadbeef', xRequestId: 'r', config: base }),
      (err) => err.status === 401,
    )
  })

  it('el pago de un upgrade de LAB se valida con el secreto de LAB, no el del market', async () => {
    // Firmado con el secreto del market: con source=lab tiene que fallar.
    const { default: crypto } = await import('node:crypto')
    const ts = String(Date.now())
    const v1 = crypto.createHmac('sha256', base.mpWebhookSecret).update(`id:9;request-id:r;ts:${ts};`).digest('hex')
    await assert.rejects(
      handle({ type: 'payment', dataId: '9', source: 'lab', xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'r', config: base }),
      (err) => err.status === 401,
    )
  })
})

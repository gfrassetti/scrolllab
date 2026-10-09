import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeMercadoPago, startAppAgainstFakeMp, waitFor } from './helpers/fakeMercadoPago.js'
import { startAppAgainstFakePaddle } from './helpers/fakePaddle.js'
import { arsFromUsd, discountedArsFromUsd, HOSTED_PLANS } from '../catalog.js'
import {
  TEMPLATE_PRICES_USD,
  BUNDLE_PRICE_USD,
  CUSTOM_BASE_PRICE_USD,
  WELCOME_COUPON_PERCENT,
} from '../../src/domain/catalog.js'

/**
 * El 10% de bienvenida: SOLO en la primera compra de cada usuario, y en
 * cualquier cosa del market (template, bundle, builder), cobre Mercado Pago o
 * Paddle. Nunca en la segunda ni en la tercera, ni aunque mande el código; una
 * compra reembolsada cuenta como compra; dos compras abiertas a la vez no se
 * llevan el descuento las dos. LAB (suscripciones) no tiene descuento y no gasta
 * el cupón.
 */
const RATE = 1560
const PCT = WELCOME_COUPON_PERCENT
const OWNER = 'owner@scrolllab.test'
const RECIPE = ['chapters/HeroKinetic', 'nocturne/StickyWordCycle', 'chapters/BigNumbers']

const KINDS = [
  { kind: 'template', items: [{ sku: 'chapters' }], usd: TEMPLATE_PRICES_USD.chapters },
  { kind: 'bundle', items: [{ sku: 'bundle' }], usd: BUNDLE_PRICE_USD },
  { kind: 'builder', items: [{ sku: 'custom', recipe: RECIPE }], usd: CUSTOM_BASE_PRICE_USD },
]

const usdWithDiscount = (usd) => Math.round(usd * (100 - PCT)) / 100

describe('10% de primera compra — Mercado Pago (pesos)', () => {
  const mp = createFakeMercadoPago()
  let loginAs
  let webhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ loginAs, webhook, cleanup, fileDb } = await startAppAgainstFakeMp(mp))
  })
  after(() => cleanup())

  async function checkout(agent, items, extra = {}) {
    const res = await agent.post('/api/checkout').send({ items, ...extra })
    return { res, order: res.status === 200 ? await fileDb.findOrderById(res.body.orderId) : null, pref: mp.lastPreference() }
  }
  async function pay(pref) {
    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    return payment
  }

  for (const k of KINDS) {
    it(`${k.kind}: la primera compra lleva el 10% solo; la segunda y la tercera, precio de lista (ni con el código)`, async () => {
      const agent = await loginAs(`mp-${k.kind}@test.com`)
      // 1ª: sin mandar código (como un «Comprar» rápido) igual se aplica.
      const first = await checkout(agent, k.items)
      assert.equal(first.res.status, 200, JSON.stringify(first.res.body))
      assert.equal(first.order.discountPct, PCT)
      assert.equal(first.order.total, discountedArsFromUsd(k.usd, RATE, PCT))
      assert.equal(first.pref.items[0].unit_price, first.order.total)
      assert.match(first.pref.items[0].title, /10% off primera compra/)
      await pay(first.pref)
      assert.equal((await fileDb.findOrderById(first.order.id)).status, 'paid')
      const code = first.order.couponCode
      // El navegador ya no recibe el cupón: los «Comprar» rápidos muestran la lista.
      const welcome = await agent.post('/api/coupons/welcome').send({})
      assert.equal(welcome.body.coupon, null)

      // 2ª y 3ª: precio de lista; con el código, rechazado.
      for (const nth of ['2ª', '3ª']) {
        const next = await checkout(agent, k.items)
        assert.equal(next.order.total, arsFromUsd(k.usd, RATE), `${nth} compra`)
        assert.equal(next.order.discountPct, undefined, `${nth} compra`)
        assert.doesNotMatch(next.pref.items[0].title, /off/)
        const withCode = await checkout(agent, k.items, { couponCode: code })
        assert.ok([409, 422].includes(withCode.res.status), `${nth} con código: ${withCode.res.status}`)
        await pay(next.pref)
      }
    })
  }

  it('el 10% se gasta una vez entre todo: compró un template, el builder ya va a precio de lista', async () => {
    const agent = await loginAs('mp-cruzado@test.com')
    const first = await checkout(agent, [{ sku: 'chapters' }])
    await pay(first.pref)
    const builder = await checkout(agent, [{ sku: 'custom', recipe: RECIPE }])
    assert.equal(builder.order.total, arsFromUsd(CUSTOM_BASE_PRICE_USD, RATE))
  })

  it('una compra que no se pagó no cuenta: la siguiente sigue siendo la primera', async () => {
    const agent = await loginAs('mp-abandona@test.com')
    await checkout(agent, [{ sku: 'chapters' }]) // nunca la paga
    assert.equal((await agent.post('/api/coupons/welcome').send({})).body.coupon.percent, PCT)
    const second = await checkout(agent, [{ sku: 'fizz' }])
    assert.equal(second.order.discountPct, PCT)
  })

  it('dos compras abiertas a la vez: al pagar una, la otra se anula y no se puede pagar con descuento', async () => {
    const agent = await loginAs('mp-dos@test.com')
    const a = await checkout(agent, [{ sku: 'chapters' }])
    const b = await checkout(agent, [{ sku: 'fizz' }])
    assert.equal(a.order.discountPct, PCT)
    assert.equal(b.order.discountPct, PCT)
    await pay(a.pref)
    // La de la otra pestaña: vencida en MP y fuera de Mis compras.
    assert.ok(mp.preferences.get(b.pref.id).expires, 'la preference quedó vencida')
    assert.throws(() => mp.pay(b.pref.id), /vencida/)
    assert.equal(await fileDb.findOrderById(b.order.id), null)
    // Si vuelve a comprar, precio de lista.
    const again = await checkout(agent, [{ sku: 'fizz' }])
    assert.equal(again.order.total, arsFromUsd(TEMPLATE_PRICES_USD.fizz, RATE))
  })

  it('una primera compra reembolsada cuenta como compra: no vuelve a haber 10%', async () => {
    const agent = await loginAs('mp-reembolso@test.com')
    const first = await checkout(agent, [{ sku: 'chapters' }])
    const payment = await pay(first.pref)
    mp.payments.get(String(payment.id)).status = 'refunded'
    await webhook('payment', payment.id)
    assert.equal((await fileDb.findOrderById(first.order.id)).status, 'refunded')
    assert.equal((await agent.post('/api/coupons/welcome').send({})).body.coupon, null)
    const again = await checkout(agent, [{ sku: 'chapters' }])
    assert.equal(again.order.total, arsFromUsd(TEMPLATE_PRICES_USD.chapters, RATE))
  })

  it('LAB no tiene descuento (ni con el código) y no gasta el 10% del market', async () => {
    const agent = await loginAs('mp-lab@test.com')
    const welcome = await agent.post('/api/coupons/welcome').send({})
    const code = welcome.body.coupon.code
    const res = await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly', couponCode: code })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(mp.lastPreapproval().auto_recurring.transaction_amount, HOSTED_PLANS.hosted_pro.priceMonthly)
    // Su primera compra del market sigue teniendo el 10%.
    const first = await checkout(agent, [{ sku: 'chapters' }])
    assert.equal(first.order.discountPct, PCT)
    assert.equal(first.order.couponCode, code)
  })
})

describe('10% de primera compra — Paddle (dólares)', () => {
  let pd
  let mp
  let loginAs
  let paddleWebhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ pd, mp, loginAs, paddleWebhook, cleanup, fileDb } = await startAppAgainstFakePaddle())
  })
  after(() => cleanup())

  async function checkout(agent, items, extra = {}) {
    const res = await agent.post('/api/checkout').send({ items, provider: 'paddle', ...extra })
    return {
      res,
      order: res.status === 200 ? await fileDb.findOrderById(res.body.orderId) : null,
      txnId: res.body?.transactionId,
      body: res.status === 200 ? pd.lastCall('POST /transactions').body : null,
    }
  }
  async function pay(txnId) {
    const { txn } = pd.pay(txnId)
    assert.equal((await paddleWebhook('transaction.completed', txn)).status, 200)
    return txn
  }
  const cents = (usd) => String(Math.round(usd * 100))

  for (const k of KINDS) {
    it(`${k.kind}: la primera compra lleva el 10% en USD; la segunda y la tercera, precio de lista`, async () => {
      const agent = await loginAs(`pd-${k.kind}@test.com`)
      const first = await checkout(agent, k.items)
      assert.equal(first.res.status, 200, JSON.stringify(first.res.body))
      assert.equal(first.order.total, usdWithDiscount(k.usd))
      assert.equal(first.body.items[0].price.unit_price.amount, cents(usdWithDiscount(k.usd)))
      assert.match(first.body.items[0].price.name, /10% off/)
      await pay(first.txnId)
      const code = first.order.couponCode
      assert.equal((await agent.post('/api/coupons/welcome').send({})).body.coupon, null)

      for (const nth of ['2ª', '3ª']) {
        const next = await checkout(agent, k.items)
        assert.equal(next.order.total, k.usd, `${nth} compra`)
        assert.equal(next.body.items[0].price.unit_price.amount, cents(k.usd), `${nth} compra`)
        assert.doesNotMatch(next.body.items[0].price.name, /off/)
        const withCode = await checkout(agent, k.items, { couponCode: code })
        assert.ok([409, 422].includes(withCode.res.status), `${nth} con código: ${withCode.res.status}`)
        await pay(next.txnId)
      }
    })
  }

  it('dos compras abiertas a la vez: al pagar una, la otra se cancela en Paddle', async () => {
    const agent = await loginAs('pd-dos@test.com')
    const a = await checkout(agent, [{ sku: 'chapters' }])
    const b = await checkout(agent, [{ sku: 'fizz' }])
    await pay(a.txnId)
    assert.equal(pd.transactions.get(b.txnId).status, 'canceled')
    assert.throws(() => pd.pay(b.txnId), /canceled/)
    assert.equal(await fileDb.findOrderById(b.order.id), null)
  })

  it('si igual se pagan las dos (a la vez), al dueño le llega el aviso', async () => {
    const agent = await loginAs('pd-carrera@test.com')
    const a = await checkout(agent, [{ sku: 'chapters' }])
    const b = await checkout(agent, [{ sku: 'fizz' }])
    // Las dos se cobran antes de que llegue ningún webhook.
    const ta = pd.pay(a.txnId).txn
    const tb = pd.pay(b.txnId).txn
    await paddleWebhook('transaction.completed', ta)
    await paddleWebhook('transaction.completed', tb)
    await waitFor(
      () => mp.mailsTo(OWNER).some((m) => /USADO DOS VECES/.test(m.body.subject) && m.body.text.includes(b.order.id)),
      'el aviso del descuento usado dos veces',
    )
  })

  it('LAB no tiene descuento en Paddle (ni con el código)', async () => {
    const agent = await loginAs('pd-lab@test.com')
    const welcome = await agent.post('/api/coupons/welcome').send({})
    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly', provider: 'paddle', couponCode: welcome.body.coupon.code })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const body = pd.lastCall('POST /transactions').body
    assert.equal(body.items[0].price.unit_price.amount, cents(HOSTED_PLANS.hosted_pro.priceMonthlyUsd))
    assert.doesNotMatch(body.items[0].price.name, /off/)
  })
})

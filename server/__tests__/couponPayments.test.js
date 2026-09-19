/**
 * El cupón de punta a punta contra Mercado Pago y Resend. No se simula nuestro
 * código de pago: corre el SDK real de cada uno con `fetch` interceptado, así
 * los tests ven el pedido exacto que saldría a la red (y contestan como
 * contestaría la API). Sin credenciales, sin red.
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

import { HOSTED_PLANS, arsFromUsd, discountedArsFromUsd } from '../catalog.js'

// fileStore lee FILE_DB_DIR al cargarse: antes de importar nada que toque la base.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-couponpay-'))
const dbDir = path.join(dir, 'db')
process.env.NODE_ENV = 'development'
process.env.STORE = 'file'
process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
process.env.CLIENT_URL = 'http://localhost:5173'
process.env.API_PUBLIC_URL = 'http://localhost:8787'
process.env.FX_OFFLINE = 'true'
process.env.FX_FALLBACK_RATE = '1560'
process.env.FX_SPREAD_PCT = '0'
process.env.RATE_LIMIT_DISABLED = 'true'
process.env.STORAGE_DIR = dir
process.env.FILE_DB_DIR = dbDir

const { COUPON_CODE_RE } = await import('../services/coupons.js')

const ORIGIN = 'http://localhost:5173'
const RATE = 1560
const MP_TOKEN = 'TEST-mp-access-token'
const WEBHOOK_SECRET = 'whsec-test-secret'

describe('cupón de bienvenida — pagos reales (SDK con red interceptada)', () => {
  const realFetch = globalThis.fetch
  let app
  let config
  let db
  // Lo que salió hacia cada API y lo que contestan.
  let mpPreferences
  let mpPreapprovals
  let resendMails
  let payments
  let resendOk
  let seq = 0

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  function installFetch() {
    globalThis.fetch = async (url, init = {}) => {
      // El SDK de MP termina algunas URLs en "/": se compara sin la barra final.
      const u = String(url).replace(/\/+$/, '')
      if (u === 'https://api.mercadopago.com/checkout/preferences' && init.method === 'POST') {
        mpPreferences.push({ body: JSON.parse(init.body), headers: init.headers })
        const n = mpPreferences.length
        return json({ id: `pref-${n}`, init_point: `https://mp.test/pay/${n}` }, 201)
      }
      if (u === 'https://api.mercadopago.com/preapproval' && init.method === 'POST') {
        mpPreapprovals.push({ body: JSON.parse(init.body) })
        return json({ id: `pre-${mpPreapprovals.length}`, init_point: 'https://mp.test/sub/1' }, 201)
      }
      if (u.startsWith('https://api.mercadopago.com/v1/payments/')) {
        const payment = payments.get(u.split('/').pop())
        return payment ? json(payment) : json({ message: 'Payment not found', status: 404 }, 404)
      }
      if (u === 'https://api.resend.com/emails') {
        resendMails.push({ body: JSON.parse(init.body), headers: new Headers(init.headers) })
        return resendOk
          ? json({ id: `em_${resendMails.length}` })
          : json({ name: 'application_error', message: 'boom', statusCode: 500 }, 500)
      }
      return realFetch(url, init)
    }
  }

  const leadsFile = path.join(dbDir, 'leads.json')
  const editLeads = (fn) => {
    const rows = JSON.parse(fs.readFileSync(leadsFile, 'utf8'))
    fn(rows)
    fs.writeFileSync(leadsFile, JSON.stringify(rows, null, 2))
  }
  const rowFor = (email) =>
    JSON.parse(fs.readFileSync(leadsFile, 'utf8')).find((l) => l.email === email)

  async function login(email) {
    const agent = request.agent(app)
    const res = await agent
      .post('/api/auth/dev-login')
      .set('Origin', ORIGIN)
      .send({ email, name: 'Buyer' })
    assert.equal(res.status, 200)
    return agent
  }
  async function newCode(email) {
    const res = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email })
    assert.equal(res.status, 200)
    return res.body.coupon.code
  }
  async function checkout(agent, body) {
    const res = await agent.post('/api/checkout').set('Origin', ORIGIN).send(body)
    return res
  }
  /** Pide el cupón y entra con la misma cuenta: el cupón es de ese mail. */
  async function buyerWithCoupon(email) {
    const code = await newCode(email)
    const agent = await login(email)
    return { code, agent }
  }
  async function pendingOrder(agent, body) {
    const res = await checkout(agent, body)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const order = await db.findOrderById(res.body.orderId)
    return { order, orderId: res.body.orderId, res }
  }
  const approved = (order, extra = {}) => ({
    id: `pay-${(seq += 1)}`,
    status: 'approved',
    transaction_amount: order.total,
    currency_id: 'ARS',
    external_reference: db.uid(order) || order.id,
    ...extra,
  })
  function signedHeaders(dataId) {
    const ts = String(Date.now())
    const requestId = `req-${dataId}`
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')
    return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId }
  }
  /** MP avisa por webhook de un pago (que además tiene que existir en su API). */
  function webhook(payment, headers = signedHeaders(payment.id)) {
    payments.set(payment.id, payment)
    return request(app)
      .post('/api/webhooks/mercadopago')
      .query({ type: 'payment', 'data.id': payment.id })
      .set(headers)
      .send({})
  }

  before(async () => {
    const { loadConfig } = await import('../config.js')
    config = loadConfig()
    config.storageDir = dir
    config.store = 'file'
    // Mercado Pago "de verdad": sin mock, con token y secreto de webhook.
    config.mpMock = false
    config.mpAccessToken = MP_TOKEN
    config.mpWebhookSecret = WEBHOOK_SECRET
    config.mpSubs = { accessToken: 'TEST-subs-token', webhookSecret: WEBHOOK_SECRET }
    const { createApp } = await import('../app.js')
    app = await createApp(config)
    db = (await import('../db.js')).db
  })

  beforeEach(() => {
    mpPreferences = []
    mpPreapprovals = []
    resendMails = []
    payments = new Map()
    resendOk = true
    config.email = { enabled: false, apiKey: 're_test', from: 'SCROLLLAB <compras@scrolllab.com.ar>', replyTo: 'hola@scrolllab.com.ar', notifyTo: '', logoUrl: '' }
    installFetch()
  })

  after(() => {
    globalThis.fetch = realFetch
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  describe('lo que recibe Mercado Pago', () => {
    it('la preference lleva los precios ya descontados y suman el total de la orden', async () => {
      const { code, agent } = await buyerWithCoupon('mp1@test.com')
      const { order, res } = await pendingOrder(agent, {
        items: [{ sku: 'chapters' }, { sku: 'bundle' }],
        couponCode: code,
      })

      assert.equal(res.body.init_point, 'https://mp.test/pay/1')
      assert.equal(mpPreferences.length, 1)
      const { body, headers } = mpPreferences[0]
      assert.match(String(headers.Authorization || headers.authorization), /Bearer TEST-mp-access-token/)
      assert.deepEqual(
        body.items.map((i) => [i.id, i.unit_price, i.quantity, i.currency_id]),
        [
          ['chapters', discountedArsFromUsd(149, RATE, 10), 1, 'ARS'],
          ['bundle', discountedArsFromUsd(649, RATE, 10), 1, 'ARS'],
        ],
      )
      assert.equal(body.items[0].unit_price, 210000)
      assert.equal(body.items[1].unit_price, 912000)
      // Lo que cobra MP (la suma de los ítems) es lo que la orden espera cobrar.
      assert.equal(body.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0), order.total)
      assert.equal(body.external_reference, db.uid(order))
      assert.ok(body.notification_url.endsWith('/api/webhooks/mercadopago'))
    })

    it('sin cupón la preference lleva el precio de lista', async () => {
      const agent = await login('buyer-mp2@test.com')
      const { order } = await pendingOrder(agent, { items: [{ sku: 'chapters' }] })
      assert.equal(mpPreferences[0].body.items[0].unit_price, arsFromUsd(149, RATE))
      assert.equal(order.total, arsFromUsd(149, RATE))
      assert.equal(order.couponCode, undefined)
    })

    it('el cliente no puede colar un monto ni un descuento propio: a MP le llega el del servidor', async () => {
      const { code, agent } = await buyerWithCoupon('mp3@test.com')
      await pendingOrder(agent, {
        items: [{ sku: 'chapters', unit_price: 1, discountPct: 99 }],
        couponCode: code,
        discountPct: 99,
        total: 1,
      })
      assert.equal(mpPreferences[0].body.items[0].unit_price, 210000)
    })
  })

  describe('cobro: webhook y confirmación', () => {
    it('un pago aprobado por el monto descontado deja la orden paga y canjea el cupón', async () => {
      const { code, agent } = await buyerWithCoupon('cobro1@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })
      assert.equal(order.total, 210000)

      const payment = approved(order)
      const res = await webhook(payment)
      assert.equal(res.status, 200)

      const paid = await db.findOrderById(orderId)
      assert.equal(paid.status, 'paid')
      assert.equal(paid.mpPaymentId, payment.id)
      const lead = rowFor('cobro1@test.com')
      assert.ok(lead.couponRedeemedAt)
      assert.equal(lead.couponOrderId, orderId)
    })

    it('el mismo webhook otra vez no canjea dos veces ni falla', async () => {
      const { code, agent } = await buyerWithCoupon('cobro2@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })
      const payment = approved(order)

      assert.equal((await webhook(payment)).status, 200)
      const firstRedeemedAt = rowFor('cobro2@test.com').couponRedeemedAt
      assert.equal((await webhook(payment)).status, 200)

      const lead = rowFor('cobro2@test.com')
      assert.equal(lead.couponRedeemedAt, firstRedeemedAt)
      assert.equal(lead.couponOrderId, orderId)
    })

    it('un pago por el precio de lista (monto que no coincide) no se acepta y el cupón queda disponible', async () => {
      const { code, agent } = await buyerWithCoupon('cobro3@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })

      const res = await webhook(approved(order, { transaction_amount: arsFromUsd(149, RATE) }))
      assert.equal(res.status, 200) // MP no reintenta un 4xx: se corta con 200 y no se cumple

      assert.equal((await db.findOrderById(orderId)).status, 'pending')
      assert.equal(rowFor('cobro3@test.com').couponRedeemedAt, undefined)
    })

    it('una firma inválida se rechaza con 401 y no toca la orden', async () => {
      const { code, agent } = await buyerWithCoupon('cobro4@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })

      const res = await webhook(approved(order), { 'x-signature': 'ts=1,v1=deadbeef', 'x-request-id': 'r1' })
      assert.equal(res.status, 401)
      assert.equal((await db.findOrderById(orderId)).status, 'pending')
      assert.equal(rowFor('cobro4@test.com').couponRedeemedAt, undefined)
    })

    it('un pago no aprobado no canjea el cupón', async () => {
      const { code, agent } = await buyerWithCoupon('cobro5@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })

      await webhook(approved(order, { status: 'rejected' }))
      assert.equal((await db.findOrderById(orderId)).status, 'pending')
      assert.equal(rowFor('cobro5@test.com').couponRedeemedAt, undefined)
    })

    it('la confirmación al volver de MP también canjea, y repetirla es idempotente', async () => {
      const { code, agent } = await buyerWithCoupon('confirm1@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })
      const payment = approved(order)
      payments.set(payment.id, payment)

      const first = await agent.post('/api/checkout/confirm').set('Origin', ORIGIN).send({ paymentId: payment.id })
      assert.equal(first.status, 200)
      assert.equal(first.body.alreadyFulfilled, false)
      assert.equal(first.body.order.total, 210000)
      assert.equal(rowFor('confirm1@test.com').couponOrderId, orderId)

      const again = await agent.post('/api/checkout/confirm').set('Origin', ORIGIN).send({ paymentId: payment.id })
      assert.equal(again.status, 200)
      assert.equal(again.body.alreadyFulfilled, true)
    })

    it('la confirmación desde otra cuenta se rechaza y no canjea', async () => {
      const { code, agent: owner } = await buyerWithCoupon('confirm2@test.com')
      const { order, orderId } = await pendingOrder(owner, { items: [{ sku: 'chapters' }], couponCode: code })
      const payment = approved(order)
      payments.set(payment.id, payment)

      const intruder = await login('intruso@test.com')
      const res = await intruder.post('/api/checkout/confirm').set('Origin', ORIGIN).send({ paymentId: payment.id })
      assert.equal(res.status, 403)
      assert.equal((await db.findOrderById(orderId)).status, 'pending')
      assert.equal(rowFor('confirm2@test.com').couponRedeemedAt, undefined)
    })

    it('si el cupón vence entre crear la orden y pagar, el pago igual se acepta y se canjea', async () => {
      const { code, agent } = await buyerWithCoupon('vence@test.com')
      const { order, orderId } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })

      editLeads((rows) => {
        rows.find((l) => l.email === 'vence@test.com').couponExpiresAt = '2020-01-01T00:00:00.000Z'
      })
      assert.equal((await webhook(approved(order))).status, 200)

      assert.equal((await db.findOrderById(orderId)).status, 'paid')
      assert.equal(rowFor('vence@test.com').couponOrderId, orderId)
    })

    it('dos órdenes pendientes con el mismo cupón se cobran las dos; el cupón queda con la primera', async () => {
      const { code, agent } = await buyerWithCoupon('doble@test.com')
      const a = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })
      const b = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode: code })

      // Lo que ya cobró Mercado Pago no lo frena la contabilidad del cupón.
      assert.equal((await webhook(approved(a.order))).status, 200)
      assert.equal((await webhook(approved(b.order))).status, 200)

      assert.equal((await db.findOrderById(a.orderId)).status, 'paid')
      assert.equal((await db.findOrderById(b.orderId)).status, 'paid')
      assert.equal(rowFor('doble@test.com').couponOrderId, a.orderId)
    })
  })

  describe('LAB no tiene cupón', () => {
    it('la suscripción cobra el monto del plan aunque el cliente mande un cupón, y no lo gasta', async () => {
      const { code, agent } = await buyerWithCoupon('lab@test.com')

      const res = await agent
        .post('/api/subscriptions')
        .set('Origin', ORIGIN)
        .send({ plan: 'hosted_starter', cycle: 'monthly', couponCode: code })
      assert.equal(res.status, 200, JSON.stringify(res.body))
      assert.equal(res.body.init_point, 'https://mp.test/sub/1')

      const { auto_recurring: recurring } = mpPreapprovals[0].body
      assert.equal(recurring.transaction_amount, HOSTED_PLANS.hosted_starter.priceMonthly)
      assert.equal(recurring.currency_id, 'ARS')
      // El cupón sigue intacto para una compra de ZIP.
      assert.equal(rowFor('lab@test.com').couponRedeemedAt, undefined)
      const check = await request(app).post('/api/coupons/check').set('Origin', ORIGIN).send({ code })
      assert.equal(check.status, 200)
    })
  })

  describe('entradas raras', () => {
    it('un couponCode que no es un código nunca crea órdenes ni llega a la base como objeto', async () => {
      const agent = await login('buyer-raro@test.com')
      const seen = []
      const original = db.findLeadByCoupon
      db.findLeadByCoupon = async (code) => {
        seen.push(code)
        return original(code)
      }
      try {
        for (const couponCode of [{ $gt: '' }, { $ne: null }, ['SL-AAAAAA'], 12345, true, 'x'.repeat(30000), '<script>']) {
          const res = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode })
          assert.equal(res.status, 404, JSON.stringify(couponCode).slice(0, 40))
        }
      } finally {
        db.findLeadByCoupon = original
      }
      assert.ok(seen.every((code) => typeof code === 'string' && COUPON_CODE_RE.test(code)))
      const user = await db.findUser({ email: 'buyer-raro@test.com' })
      assert.equal((await db.findOrdersByUser(db.uid(user))).length, 0)
      assert.equal(mpPreferences.length, 0)
    })

    it('quien tiene el código pero no es el dueño no llega a Mercado Pago', async () => {
      const code = await newCode('ajeno@test.com')
      const thief = await login('ladron@test.com')
      const res = await checkout(thief, { items: [{ sku: 'chapters' }], couponCode: code })
      assert.equal(res.status, 403)
      assert.equal(res.body.code, 'coupon_other_account')
      assert.equal(mpPreferences.length, 0)
    })

    it('un couponCode vacío o null se ignora: checkout normal a precio de lista', async () => {
      const agent = await login('buyer-vacio@test.com')
      for (const couponCode of ['', null]) {
        const { order } = await pendingOrder(agent, { items: [{ sku: 'chapters' }], couponCode })
        assert.equal(order.total, arsFromUsd(149, RATE))
      }
    })

    it('un carrito inválido falla antes de tocar el cupón', async () => {
      const code = await newCode('vacio@test.com')
      const agent = await login('buyer-carrito@test.com')
      assert.equal((await checkout(agent, { items: [], couponCode: code })).status, 400)
      assert.equal((await checkout(agent, { items: [{ sku: 'no-existe' }], couponCode: code })).status, 400)
      assert.equal((await request(app).post('/api/coupons/check').set('Origin', ORIGIN).send({ code })).status, 200)
    })
  })

  describe('mail del cupón por Resend', () => {
    it('el alta manda el mail con el código y un link que guarda el cupón', async () => {
      config.email.enabled = true
      const res = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email: 'mail1@test.com', locale: 'es' })
      assert.equal(res.status, 200)
      assert.equal(res.body.emailed, true)

      assert.equal(resendMails.length, 1)
      const { body, headers } = resendMails[0]
      assert.deepEqual(body.to, ['mail1@test.com'])
      assert.match(body.subject, /10%/)
      assert.ok(body.html.includes(res.body.coupon.code))
      assert.ok(body.html.includes(`?cupon=${res.body.coupon.code}`))
      assert.match(headers.get('idempotency-key'), /^scrolllab-coupon-/)
    })

    it('volver a anotarse con el mismo mail no manda otro mail y devuelve el mismo cupón', async () => {
      config.email.enabled = true
      const first = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email: 'mail2@test.com' })
      const again = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email: 'mail2@test.com' })

      assert.equal(resendMails.length, 1)
      assert.equal(again.body.emailed, false)
      assert.equal(again.body.coupon.code, first.body.coupon.code)
    })

    it('si Resend falla, el alta igual devuelve el cupón para mostrarlo en pantalla', async () => {
      config.email.enabled = true
      resendOk = false
      const res = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email: 'mail3@test.com' })
      assert.equal(res.status, 200)
      assert.equal(res.body.emailed, false)
      assert.match(res.body.coupon.code, COUPON_CODE_RE)
      assert.equal(rowFor('mail3@test.com').couponCode, res.body.coupon.code)
    })

    it('con el mail apagado no se llama a Resend', async () => {
      const res = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email: 'mail4@test.com' })
      assert.equal(res.body.emailed, false)
      assert.equal(resendMails.length, 0)
    })
  })
})

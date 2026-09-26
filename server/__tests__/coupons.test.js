import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

import {
  PRODUCTS,
  WELCOME_COUPON_DAYS,
  WELCOME_COUPON_PERCENT,
  arsFromUsd,
  catalogWithArs,
  discountedArsFromUsd,
} from '../catalog.js'
import {
  WELCOME_COUPON_PERCENT as CLIENT_PERCENT,
  discountedArsFromUsd as clientDiscountedArsFromUsd,
} from '../../src/lib/pricing.js'

// fileStore lee FILE_DB_DIR al cargarse: hay que fijarlo antes de importar
// cualquier módulo que toque la base, o esta suite escribiría en storage/db.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-coupons-'))
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

const {
  COUPON_CODE_RE,
  canonicalEmail,
  claimWelcomeCoupon,
  couponStatus,
  generateCouponCode,
  maskEmail,
  normalizeCouponCode,
  resolveCouponForCheckout,
} = await import('../services/coupons.js')
const { buildCouponEmail, sendCouponEmail } = await import('../services/email.js')

const ORIGIN = 'http://localhost:5173'
const RATE = 1560

describe('generateCouponCode / normalizeCouponCode', () => {
  it('genera códigos SL-XXXXXX sin caracteres ambiguos y sin repetirse', () => {
    const seen = new Set()
    for (let i = 0; i < 2000; i += 1) {
      const code = generateCouponCode()
      assert.match(code, COUPON_CODE_RE)
      assert.doesNotMatch(code.slice(3), /[01OIL]/)
      seen.add(code)
    }
    assert.equal(seen.size, 2000)
  })

  it('tolera minúsculas, espacios y guiones', () => {
    assert.equal(normalizeCouponCode('sl-abc234'), 'SL-ABC234')
    assert.equal(normalizeCouponCode(' SL 7K2P9X '), 'SL-7K2P9X')
    assert.equal(normalizeCouponCode('sl7k2p9x'), 'SL-7K2P9X')
  })

  it('rechaza lo que no es un código', () => {
    for (const bad of ['', 'ABC', 'SL-0OIL11', 'SL-7K2P9', 'SL-7K2P9XX', 'XX-7K2P9X', null, undefined]) {
      assert.equal(normalizeCouponCode(bad), null, String(bad))
    }
  })
})

describe('couponStatus', () => {
  const now = new Date('2026-09-20T12:00:00Z')
  const base = { couponCode: 'SL-AAAAAA', couponExpiresAt: '2026-10-01T00:00:00Z' }

  it('recorre los estados del cupón', () => {
    assert.equal(couponStatus({}, now), 'none')
    assert.equal(couponStatus(base, now), 'active')
    assert.equal(couponStatus({ ...base, couponRedeemedAt: '2026-09-19T00:00:00Z' }, now), 'redeemed')
    assert.equal(couponStatus({ ...base, couponExpiresAt: '2026-09-20T12:00:00Z' }, now), 'expired')
  })
})

describe('canonicalEmail / maskEmail', () => {
  it('unifica las variantes de una misma casilla de Gmail', () => {
    for (const email of [
      'anaperez@gmail.com',
      'Ana.Perez@gmail.com',
      'ana.perez+promo@gmail.com',
      'ANAPEREZ+x@googlemail.com',
      '  anaperez@gmail.com ',
    ]) {
      assert.equal(canonicalEmail(email), 'anaperez@gmail.com', email)
    }
  })

  it('en otros dominios respeta los puntos pero saca la +etiqueta', () => {
    assert.equal(canonicalEmail('ana.perez+promo@estudio.com'), 'ana.perez@estudio.com')
    assert.notEqual(canonicalEmail('ana.perez@estudio.com'), canonicalEmail('anaperez@estudio.com'))
  })

  it('el mismo usuario en otro dominio no es el mismo mail', () => {
    assert.notEqual(canonicalEmail('ana@gmail.com'), canonicalEmail('ana@yahoo.com'))
  })

  it('no se rompe con basura', () => {
    for (const bad of [null, undefined, '', 'sin-arroba', '@', 'a@@b']) {
      assert.equal(typeof canonicalEmail(bad), 'string')
      assert.equal(typeof maskEmail(bad), 'string')
    }
  })

  it('maskEmail deja la primera letra y el dominio', () => {
    assert.equal(maskEmail('ana.perez@gmail.com'), 'a***@gmail.com')
    assert.equal(maskEmail('x@y.com'), 'x***@y.com')
  })
})

describe('discountedArsFromUsd', () => {
  it('descuenta en USD y redondea al millar de arriba, como arsFromUsd', () => {
    assert.equal(discountedArsFromUsd(149, RATE, 10), 210000)
    assert.equal(discountedArsFromUsd(189, RATE, 10), 266000)
    assert.equal(discountedArsFromUsd(269, RATE, 10), 378000)
    assert.equal(discountedArsFromUsd(649, RATE, 10), 912000)
  })

  it('sin descuento da lo mismo que arsFromUsd', () => {
    for (const usd of [149, 189, 229, 279, 649]) {
      assert.equal(discountedArsFromUsd(usd, RATE, 0), arsFromUsd(usd, RATE))
    }
  })

  it('no se pasa de un millar exacto por errores de coma flotante', () => {
    assert.equal(discountedArsFromUsd(100, 1000, 10), 90000)
    assert.equal(discountedArsFromUsd(250, 1560, 10), 351000)
  })

  it('siempre cobra menos que el precio de lista', () => {
    for (const usd of Object.values(PRODUCTS).map((p) => p.unit_price_usd)) {
      assert.ok(discountedArsFromUsd(usd, RATE, WELCOME_COUPON_PERCENT) < arsFromUsd(usd, RATE))
    }
  })

  it('rechaza porcentajes y montos inválidos', () => {
    for (const percent of [-1, 100, 150, Number.NaN]) {
      assert.throws(() => discountedArsFromUsd(149, RATE, percent), /Descuento inválido/)
    }
    assert.throws(() => discountedArsFromUsd(Number.NaN, RATE, 10), /Conversión/)
    assert.throws(() => discountedArsFromUsd(149, 0, 10), /Conversión/)
  })

  it('el cliente calcula exactamente lo mismo que el servidor', () => {
    assert.equal(CLIENT_PERCENT, WELCOME_COUPON_PERCENT)
    for (const usd of [149, 189, 229, 269, 279, 309, 649]) {
      for (const rate of [1000, 1560, 1560.5, 1700, 2100.75]) {
        for (const percent of [0, 10, 15]) {
          assert.equal(
            clientDiscountedArsFromUsd(usd, rate, percent),
            discountedArsFromUsd(usd, rate, percent),
            `usd ${usd} rate ${rate} pct ${percent}`,
          )
        }
      }
    }
  })
})

describe('mail del cupón', () => {
  const args = {
    code: 'SL-7K2P9X',
    percent: 10,
    expiresAt: '2026-10-02T15:00:00Z',
    email: 'ana@estudio.com',
    shopUrl: 'https://www.scrolllab.com.ar/',
    logoUrl: 'https://www.scrolllab.com.ar/icon-192.png',
  }

  it('dice que el descuento ya está en la cuenta y se aplica solo: sin código para tipear ni link que lo guarde', () => {
    const mail = buildCouponEmail(args)
    assert.match(mail.subject, /10%/)
    assert.ok(mail.html.includes('ana@estudio.com'), 'dice con qué cuenta hay que pagar')
    assert.match(mail.text, /se aplica solo/)
    assert.ok(mail.html.includes('https://www.scrolllab.com.ar/#templates'))
    assert.ok(!mail.html.includes('?cupon='))
    assert.match(mail.text, /newsletters/)
    // El código queda solo como referencia, en el pie.
    assert.match(mail.text, /Código de referencia: SL-7K2P9X/)
    assert.ok(!/Tu código/.test(mail.html) && !/Your code/.test(mail.html), 'no hay caja de código')
  })

  it('sale en inglés si la cuenta está en inglés', () => {
    const mail = buildCouponEmail({ ...args, locale: 'en' })
    assert.match(mail.subject, /Your 10% welcome discount/)
    assert.match(mail.text, /applied automatically/)
    assert.match(mail.text, /Reference code: SL-7K2P9X/)
  })

  it('escapa HTML en lo que interpola', () => {
    const mail = buildCouponEmail({ ...args, code: '<b>x</b>', email: '<i>y</i>@x.com' })
    assert.ok(!mail.html.includes('<b>x</b>'))
    assert.ok(!mail.html.includes('<i>y</i>'))
    assert.ok(mail.html.includes('&lt;b&gt;'))
  })

  const lead = {
    id: 'lead1',
    email: 'ana@estudio.com',
    locale: 'es',
    couponCode: 'SL-7K2P9X',
    couponPercent: 10,
    couponExpiresAt: '2026-10-02T15:00:00Z',
  }
  const config = (enabled) => ({
    clientUrl: 'https://www.scrolllab.com.ar',
    email: { enabled, apiKey: 'k', from: 'SCROLLLAB <compras@scrolllab.com.ar>', replyTo: 'hola@scrolllab.com.ar', logoUrl: '' },
  })

  it('con el mail apagado no manda nada', async () => {
    const out = await sendCouponEmail({ lead, config: config(false), client: { emails: { send: () => assert.fail('no debería mandar') } } })
    assert.deepEqual(out, { skipped: 'disabled' })
  })

  it('manda al mail del lead con una key idempotente por lead', async () => {
    let sent
    const client = {
      emails: {
        send: async (msg, opts) => {
          sent = { msg, opts }
          return { data: { id: 'em_1' } }
        },
      },
    }
    const out = await sendCouponEmail({ lead, config: config(true), client })
    assert.deepEqual(out, { sent: true, id: 'em_1' })
    assert.deepEqual(sent.msg.to, ['ana@estudio.com'])
    assert.equal(sent.msg.replyTo, 'hola@scrolllab.com.ar')
    assert.deepEqual(sent.msg.tags, [{ name: 'type', value: 'welcome_coupon' }])
    assert.equal(sent.opts.idempotencyKey, 'scrolllab-coupon-lead1')
  })

  it('si Resend rechaza, tira', async () => {
    const client = { emails: { send: async () => ({ error: { message: 'boom' } }) } }
    await assert.rejects(() => sendCouponEmail({ lead, config: config(true), client }), /boom/)
  })
})

describe('cupón de bienvenida — API (file store)', () => {
  let app
  let db
  let markOrderPaid

  const leadsFile = path.join(dbDir, 'leads.json')
  const leadRows = () => JSON.parse(fs.readFileSync(leadsFile, 'utf8'))
  const editLeads = (fn) => {
    const rows = leadRows()
    fn(rows)
    fs.writeFileSync(leadsFile, JSON.stringify(rows, null, 2))
  }
  const rowFor = (email) => leadRows().find((l) => l.email === email)

  const welcome = (agent, body = {}) =>
    agent.post('/api/coupons/welcome').set('Origin', ORIGIN).send(body)
  const check = (code, agent = request(app)) =>
    agent.post('/api/coupons/check').set('Origin', ORIGIN).send({ code })
  const checkout = (agent, body) =>
    agent.post('/api/checkout').set('Origin', ORIGIN).send(body)

  async function login(email) {
    const agent = request.agent(app)
    const res = await agent
      .post('/api/auth/dev-login')
      .set('Origin', ORIGIN)
      .send({ email, name: 'Buyer' })
    assert.equal(res.status, 200)
    return agent
  }
  async function orderOf(orderId) {
    return db.findOrderById(orderId)
  }
  /** Entra con Google (dev-login) y recibe su cupón de bienvenida: es de ese mail. */
  async function buyerWithCoupon(email) {
    const agent = await login(email)
    const res = await welcome(agent)
    assert.equal(res.status, 200)
    return { code: res.body.coupon.code, agent }
  }
  async function newCode(email) {
    return (await buyerWithCoupon(email)).code
  }

  before(async () => {
    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = dir
    config.store = 'file'
    const { createApp } = await import('../app.js')
    app = await createApp(config)
    db = (await import('../db.js')).db
    markOrderPaid = (await import('../services/orders.js')).markOrderPaid
  })

  after(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  it('quien entra con su cuenta recibe un cupón del 10% que vence en 14 días, atado a su mail', async () => {
    const res = await welcome(await login('alta@test.com'))
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)
    assert.equal(res.body.eligible, true)
    assert.equal(res.body.created, true)
    assert.match(res.body.coupon.code, COUPON_CODE_RE)
    assert.equal(res.body.coupon.percent, WELCOME_COUPON_PERCENT)
    assert.equal(res.body.couponStatus, 'active')
    assert.equal(res.body.emailed, false) // en los tests el mail está apagado

    const expected = Date.now() + WELCOME_COUPON_DAYS * 24 * 60 * 60 * 1000
    assert.ok(Math.abs(Date.parse(res.body.coupon.expiresAt) - expected) < 60_000)
    const row = rowFor('alta@test.com')
    assert.equal(row.couponCode, res.body.coupon.code)
    assert.equal(row.source, 'account')
    assert.equal(row.locale, 'es')
  })

  it('pedirlo de nuevo devuelve el mismo cupón, sin crear otro', async () => {
    const agent = await login('repite@test.com')
    const first = await welcome(agent)
    const again = await welcome(agent)
    assert.equal(again.body.created, false)
    assert.equal(again.body.coupon.code, first.body.coupon.code)
    assert.equal(leadRows().filter((l) => l.email === 'repite@test.com').length, 1)
  })

  it('sin sesión no hay cupón (ya no existe el formulario público de mails)', async () => {
    const anonymous = await request(app).post('/api/coupons/welcome').set('Origin', ORIGIN).send({})
    assert.equal(anonymous.status, 401)

    // Antes cualquiera podía anotar cualquier mail: se cerró porque servía para
    // mandarle mails a terceros.
    const leads = await request(app).post('/api/leads').set('Origin', ORIGIN).send({ email: 'tercero@test.com' })
    assert.equal(leads.status, 404)
    assert.equal(rowFor('tercero@test.com'), undefined)
  })

  it('rechaza un Origin ajeno', async () => {
    const agent = await login('origen@test.com')
    const res = await agent.post('/api/coupons/welcome').set('Origin', 'https://evil.example').send({})
    assert.equal(res.status, 403)
    assert.equal(rowFor('origen@test.com'), undefined)
  })

  it('el mail sale una sola vez: al crear el cupón, no al volver a entrar', async () => {
    await buyerWithCoupon('ya-tenia@test.com')
    const user = await db.findUser({ email: 'ya-tenia@test.com' })
    let sent = 0
    const sendEmail = async () => {
      sent += 1
      return true
    }
    const fresh = await db.createUser({ email: 'mail-una-vez@test.com', name: 'Nueva', googleId: 'dev-mail-una-vez' })
    const first = await claimWelcomeCoupon({ user: fresh, config: {}, sendEmail })
    const again = await claimWelcomeCoupon({ user: fresh, config: {}, sendEmail })
    assert.deepEqual([first.created, first.emailed], [true, true])
    assert.deepEqual([again.created, again.emailed], [false, false])
    assert.equal(sent, 1)
    // Quien ya tenía cupón desde antes tampoco recibe otro mail.
    const old = await claimWelcomeCoupon({ user, config: {}, sendEmail })
    assert.equal(old.created, false)
    assert.equal(sent, 1)
  })

  it('un cliente que ya compró no recibe cupón: no se lo ofrece ni queda anotado', async () => {
    const agent = await login('cliente@ya.com')
    const first = await checkout(agent, { items: [{ sku: 'chapters' }] })
    await agent.post('/api/checkout/mock-pay').set('Origin', ORIGIN).send({ orderId: first.body.orderId })

    const res = await welcome(agent)
    assert.equal(res.status, 200)
    assert.equal(res.body.eligible, false)
    assert.equal(res.body.coupon, null)
    assert.equal(res.body.couponStatus, 'none')
    assert.equal(rowFor('cliente@ya.com'), undefined)
  })

  it('guarda de qué canal llegó (utm), saneado, y la primera visita gana', async () => {
    const agent = await login('canal@test.com')
    await welcome(agent, { utm: { source: 'Instagram', medium: 'reels', campaign: 'Nocturne!!' } })
    await welcome(agent, { utm: { source: 'reddit' } })
    const row = rowFor('canal@test.com')
    assert.deepEqual([row.utmSource, row.utmMedium, row.utmCampaign], ['instagram', 'reels', 'nocturne'])

    const raro = await welcome(await login('raro@test.com'), { utm: 'instagram', locale: 'fr' })
    assert.equal(raro.status, 200)
    assert.equal(rowFor('raro@test.com').utmSource, undefined)
    assert.equal(rowFor('raro@test.com').locale, 'es')
    assert.equal((await welcome(await login('ingles@test.com'), { locale: 'en' })).status, 200)
    assert.equal(rowFor('ingles@test.com').locale, 'en')
  })

  it('un lead viejo (del formulario que ya no existe) conserva su cupón al entrar con esa cuenta', async () => {
    const { lead } = await db.upsertLead({ email: 'viejo@test.com', source: 'home' })
    const { ensureCoupon } = await import('../services/coupons.js')
    await ensureCoupon(lead)

    const res = await welcome(await login('viejo@test.com'))
    assert.equal(res.body.created, false)
    assert.equal(res.body.emailed, false)
    assert.equal(res.body.coupon.code, lead.couponCode)
    assert.equal(rowFor('viejo@test.com').source, 'home')
  })

  it('el chequeo acepta el código con minúsculas y espacios', async () => {
    const code = await newCode('chequeo@test.com')
    const res = await check(` ${code.toLowerCase()} `)
    assert.equal(res.status, 200)
    assert.deepEqual([res.body.ok, res.body.code, res.body.percent], [true, code, 10])
  })

  it('el chequeo distingue inexistente, mal formado y vencido', async () => {
    assert.equal((await check('SL-AAAAAA')).status, 404)
    assert.equal((await check('hola')).status, 404)

    const { code, agent } = await buyerWithCoupon('vencido@test.com')
    editLeads((rows) => {
      rows.find((l) => l.email === 'vencido@test.com').couponExpiresAt = '2020-01-01T00:00:00.000Z'
    })
    assert.equal((await check(code)).status, 410)
    const again = await welcome(agent)
    assert.equal(again.body.couponStatus, 'expired')
    assert.equal(again.body.coupon, null)
  })

  it('el checkout con cupón descuenta en el servidor y guarda el cupón en la orden', async () => {
    const { code, agent } = await buyerWithCoupon('descuento@test.com')

    const full = await checkout(agent, { items: [{ sku: 'chapters' }] })
    assert.equal(full.status, 200)
    assert.equal((await orderOf(full.body.orderId)).total, arsFromUsd(149, RATE))

    const res = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode: code })
    assert.equal(res.status, 200)
    const order = await orderOf(res.body.orderId)
    assert.equal(order.total, 210000)
    assert.equal(order.items[0].unit_price, 210000)
    assert.equal(order.items[0].unit_price_usd, 149)
    assert.equal(order.couponCode, code)
    assert.equal(order.discountPct, 10)
  })

  it('ignora precios y descuentos que manda el cliente', async () => {
    const { code, agent } = await buyerWithCoupon('cliente@test.com')
    const res = await checkout(agent, {
      items: [{ sku: 'chapters', unit_price: 1, discountPct: 99 }],
      couponCode: code,
      discountPct: 99,
      total: 1,
    })
    assert.equal(res.status, 200)
    const order = await orderOf(res.body.orderId)
    assert.equal(order.total, 210000)
    assert.equal(order.discountPct, 10)
  })

  it('el descuento cubre el bundle y las composiciones del builder', async () => {
    const { code, agent } = await buyerWithCoupon('varios@test.com')
    const res = await checkout(agent, {
      items: [{ sku: 'bundle' }, { sku: 'custom', recipe: ['chapters/HeroKinetic'] }],
      couponCode: code,
    })
    assert.equal(res.status, 200)
    const order = await orderOf(res.body.orderId)
    const expected =
      discountedArsFromUsd(PRODUCTS.bundle.unit_price_usd, RATE, 10) +
      discountedArsFromUsd(PRODUCTS.custom.unit_price_usd, RATE, 10)
    assert.equal(order.total, expected)
    assert.equal(order.items.reduce((sum, i) => sum + i.unit_price, 0), order.total)
  })

  it('el descuento aplica a todo lo que se vende: cada modelo, el bundle y las composiciones', async () => {
    const { code, agent } = await buyerWithCoupon('todos@test.com')
    // Sale del catálogo real: si se suma un modelo, este test lo cubre solo.
    const products = catalogWithArs(RATE).filter((p) => p.sku !== 'custom')
    assert.ok(products.length >= 10, 'esperaba los 9 modelos y el bundle')
    assert.ok(products.some((p) => p.sku === 'bundle'))

    for (const product of products) {
      const res = await checkout(agent, { items: [{ sku: product.sku }], couponCode: code })
      assert.equal(res.status, 200, product.sku)
      const order = await orderOf(res.body.orderId)
      assert.equal(order.total, discountedArsFromUsd(product.unit_price_usd, RATE, 10), product.sku)
      assert.ok(order.total < arsFromUsd(product.unit_price_usd, RATE), `${product.sku} sin descuento`)
    }

    const custom = await checkout(agent, {
      items: [{ sku: 'custom', recipe: ['chapters/HeroKinetic'] }],
      couponCode: code,
    })
    assert.equal(custom.status, 200)
    assert.equal(
      (await orderOf(custom.body.orderId)).total,
      discountedArsFromUsd(PRODUCTS.custom.unit_price_usd, RATE, 10),
    )
  })

  it('un cupón inválido corta antes de crear la orden', async () => {
    const agent = await login('buyer-invalido@test.com')
    const res = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode: 'SL-AAAAAA' })
    assert.equal(res.status, 404)
    const user = await db.findUser({ email: 'buyer-invalido@test.com' })
    assert.equal((await db.findOrdersByUser(db.uid(user))).length, 0)
  })

  it('se canjea al pagar y no se puede volver a usar', async () => {
    const { code, agent } = await buyerWithCoupon('canje@test.com')
    const { body } = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode: code })

    // Mientras la orden está pendiente el cupón sigue disponible.
    assert.equal((await check(code)).status, 200)

    const pay = await agent.post('/api/checkout/mock-pay').set('Origin', ORIGIN).send({ orderId: body.orderId })
    assert.equal(pay.status, 200)

    assert.ok(rowFor('canje@test.com').couponRedeemedAt)
    assert.equal(rowFor('canje@test.com').couponOrderId, body.orderId)
    assert.equal((await check(code)).status, 409)
    // Ya compró: no se le vuelve a ofrecer nada.
    const after = await welcome(agent)
    assert.equal(after.body.eligible, false)
    assert.equal(after.body.coupon, null)

    const other = await login('otro-canje@test.com')
    const reuse = await checkout(other, { items: [{ sku: 'chapters' }], couponCode: code })
    assert.equal(reuse.status, 409)
    const user = await db.findUser({ email: 'otro-canje@test.com' })
    assert.equal((await db.findOrdersByUser(db.uid(user))).length, 0)
  })

  it('vale solo para la primera compra', async () => {
    // Tiene su cupón, pero primero compra sin usarlo: después ya no es su primera compra.
    const { code, agent } = await buyerWithCoupon('recurrente@test.com')
    const first = await checkout(agent, { items: [{ sku: 'chapters' }] })
    await agent.post('/api/checkout/mock-pay').set('Origin', ORIGIN).send({ orderId: first.body.orderId })

    const res = await checkout(agent, { items: [{ sku: 'nocturne' }], couponCode: code })
    assert.equal(res.status, 422)
    assert.equal((await check(code, agent)).status, 422)
    // Sin sesión no se puede saber: el chequeo pasa y el checkout decide.
    assert.equal((await check(code)).status, 200)
  })

  it('canjear dos veces la misma orden es idempotente; otra orden no puede', async () => {
    const code = await newCode('idem@test.com')
    assert.deepEqual(await db.redeemCoupon({ code, orderId: 'ord-1' }), { redeemed: true })
    assert.deepEqual(await db.redeemCoupon({ code, orderId: 'ord-1' }), { redeemed: true })
    assert.deepEqual(await db.redeemCoupon({ code, orderId: 'ord-2' }), { redeemed: false })
    assert.deepEqual(await db.redeemCoupon({ code: 'SL-ZZZZZZ', orderId: 'ord-3' }), { redeemed: false })
  })

  it('markOrderPaid repetido no falla ni canjea de nuevo', async () => {
    const { code, agent } = await buyerWithCoupon('doble@test.com')
    const { body } = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode: code })
    const first = await markOrderPaid({ orderId: body.orderId, mpPaymentId: 'p-1' })
    const second = await markOrderPaid({ orderId: body.orderId, mpPaymentId: 'p-1' })
    assert.equal(first.created, true)
    assert.equal(second.created, false)
    assert.equal(rowFor('doble@test.com').couponOrderId, body.orderId)
  })

  it('el checkout sin cupón no cambia', async () => {
    const agent = await login('sin-cupon@test.com')
    const res = await checkout(agent, { items: [{ sku: 'chapters' }, { sku: 'fizz' }] })
    assert.equal(res.status, 200)
    const order = await orderOf(res.body.orderId)
    assert.equal(order.total, arsFromUsd(149, RATE) + arsFromUsd(189, RATE))
    assert.equal(order.couponCode, undefined)
  })

  describe('el cupón es personal (atado al mail de la cuenta)', () => {
    it('otra cuenta recibe 403 con código, no crea orden y el cupón sigue intacto para su dueño', async () => {
      const code = await newCode('dueno@test.com')
      const other = await login('otro@test.com')

      const res = await checkout(other, { items: [{ sku: 'chapters' }], couponCode: code })
      assert.equal(res.status, 403)
      assert.equal(res.body.code, 'coupon_other_account')
      assert.equal(res.body.details.emailHint, 'd***@test.com')
      const user = await db.findUser({ email: 'otro@test.com' })
      assert.equal((await db.findOrdersByUser(db.uid(user))).length, 0)

      // El intento ajeno no lo gasta: el dueño lo usa después.
      const owner = await login('dueno@test.com')
      const ok = await checkout(owner, { items: [{ sku: 'chapters' }], couponCode: code })
      assert.equal(ok.status, 200)
      assert.equal((await orderOf(ok.body.orderId)).total, 210000)
    })

    it('un cupón reenviado a muchas cuentas no le sirve a ninguna de ellas', async () => {
      const code = await newCode('viral@test.com')
      for (let i = 0; i < 12; i += 1) {
        const stranger = await login(`desconocido${i}@test.com`)
        const res = await checkout(stranger, { items: [{ sku: 'chapters' }], couponCode: code })
        assert.equal(res.status, 403, `desconocido${i}`)
      }
      assert.equal(rowFor('viral@test.com').couponRedeemedAt, undefined)

      const owner = await login('viral@test.com')
      assert.equal((await checkout(owner, { items: [{ sku: 'chapters' }], couponCode: code })).status, 200)
    })

    it('el chequeo sin sesión pasa y trae el mail enmascarado; con otra cuenta, 403', async () => {
      const code = await newCode('chequeo2@test.com')
      const anonymous = await check(code)
      assert.equal(anonymous.status, 200)
      assert.equal(anonymous.body.emailHint, 'c***@test.com')

      const other = await login('otro2@test.com')
      const denied = await check(code, other)
      assert.equal(denied.status, 403)
      assert.equal(denied.body.code, 'coupon_other_account')

      const owner = await login('chequeo2@test.com')
      assert.equal((await check(code, owner)).status, 200)
    })

    it('las variantes de Gmail (puntos y +etiqueta) son la misma casilla: el dueño no queda afuera', async () => {
      const code = await newCode('Ana.Perez+promo@gmail.com')
      const agent = await login('anaperez@gmail.com')
      const res = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode: code })
      assert.equal(res.status, 200)
      assert.equal((await orderOf(res.body.orderId)).total, 210000)
    })

    it('el mismo usuario en otro dominio no cuenta como el dueño', async () => {
      const code = await newCode('ana@test.com')
      const agent = await login('ana@otro-dominio.com')
      const res = await checkout(agent, { items: [{ sku: 'chapters' }], couponCode: code })
      assert.equal(res.status, 403)
    })

    it('con el atado apagado (bound: false) vuelve a ser un código al portador', async () => {
      await newCode('portador@test.com')
      const { couponCode } = rowFor('portador@test.com')
      const stranger = { code: couponCode, userEmail: 'cualquiera@otro.com' }

      assert.equal((await resolveCouponForCheckout({ ...stranger, bound: false })).code, couponCode)
      await assert.rejects(
        () => resolveCouponForCheckout({ ...stranger, bound: true }),
        (err) => err.status === 403 && err.code === 'coupon_other_account',
      )
    })

    it('un cupón ya usado o vencido se informa como tal antes de mirar de quién es', async () => {
      const code = await newCode('orden@test.com')
      editLeads((rows) => {
        rows.find((l) => l.email === 'orden@test.com').couponRedeemedAt = new Date().toISOString()
      })
      const stranger = await login('curioso@test.com')
      assert.equal((await check(code, stranger)).status, 409)
    })
  })
})

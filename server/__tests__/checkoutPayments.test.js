import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import {
  createFakeMercadoPago,
  startAppAgainstFakeMp,
  waitFor,
} from './helpers/fakeMercadoPago.js'
import { readZip } from './helpers/zip.js'
import {
  arsFromUsd,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
  COMMERCE_PACK_SURCHARGE_USD,
  PRODUCTS,
} from '../catalog.js'

/**
 * Pagos de templates contra el MP simulado: lo que pasa después de que el
 * comprador paga. Un segundo pago de la misma orden, un pago cuya orden ya no
 * existe y un reembolso o contracargo le avisan al dueño por mail; el
 * reembolso además corta las descargas.
 */
describe('Pagos de templates (MP simulado)', () => {
  const OWNER = 'owner@scrolllab.test'
  const mp = createFakeMercadoPago()
  let app
  let loginAs
  let webhook
  let cleanup
  let fileDb

  before(async () => {
    process.env.EMAIL_NOTIFY_TO = OWNER
    ;({ app, loginAs, webhook, cleanup, fileDb } = await startAppAgainstFakeMp(mp))
  })
  after(() => cleanup())

  const alerts = (title) =>
    mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))

  /** Compra hasta la preference de MP; devuelve la orden y la preference. */
  async function checkout(agent, items) {
    const res = await agent.post('/api/checkout').send({ items })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return { orderId: res.body.orderId, pref: mp.lastPreference() }
  }

  async function paidOrder(email, items = [{ sku: 'chapters' }]) {
    const agent = await loginAs(email)
    const { orderId, pref } = await checkout(agent, items)
    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    return { agent, orderId, pref, payment }
  }

  it('la preference lleva lo que pide MP: comprador, descripción, categoría y vencimiento del efectivo', async () => {
    const agent = request.agent(app)
    await agent
      .post('/api/auth/dev-login')
      .send({ email: 'ana@test.com', name: 'Ana María Pérez' })
    const before = Date.now()
    const { pref } = await checkout(agent, [{ sku: 'chapters' }, { sku: 'nocturne' }])

    assert.deepEqual(pref.payer, { email: 'ana@test.com', name: 'Ana', surname: 'María Pérez' })
    assert.equal(pref.items.length, 2)
    for (const item of pref.items) {
      assert.equal(item.category_id, 'virtual_goods')
      assert.ok(item.description && item.description.length <= 250)
    }
    const ticketDays = (Date.parse(pref.date_of_expiration) - before) / 86_400_000
    assert.ok(ticketDays > 2.9 && ticketDays < 3.1, `vence en ${ticketDays} días`)
  })

  it('comprar dos templates juntos: MP cobra la suma y el ZIP trae los dos', async () => {
    const { agent, orderId, payment } = await paidOrder('two@test.com', [
      { sku: 'chapters' },
      { sku: 'nocturne' },
    ])
    const order = await fileDb.findOrderById(orderId)
    assert.equal(order.status, 'paid')
    assert.equal(payment.transaction_amount, order.total)

    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 200)
    const zip = fs.readFileSync(order.zipPath || (await fileDb.findOrderById(orderId)).zipPath)
    const names = zip.toString('latin1')
    assert.ok(names.includes('chapters/package.json'))
    assert.ok(names.includes('nocturne/package.json'))
  })

  // La composición del builder de punta a punta: precio por tramos del
  // servidor (no el del cliente), lo que ve MP, y un ZIP pago que trae lo que
  // el comprador armó y editó (textos, listas, fotos de MERIDIAN).
  it('comprar una composición del builder: cobra los tramos del servidor y el ZIP trae lo editado', async () => {
    const recipe = [
      { id: 'chapters/NavMinimal', props: { brand: 'ESTUDIO SUR' } },
      { id: 'meridian/Hero', props: { wordmark: 'Casa Arena' } },
      { id: 'chapters/BigNumbers', props: { stats: [{ value: '12', suffix: 'k', label: 'Visitas' }] } },
      { id: 'meridian/GallerySlider' },
      { id: 'atelier/KeyFacts' },
      { id: 'nocturne/DiagonalMarquee' },
      { id: 'unity/HeroTwin' },
      { id: 'atrium/ScopeSerif' },
      { id: 'velocity/ParallaxRise' },
      { id: 'commerce/ProductGrid', props: { title: 'Tienda' } },
      {
        id: 'chapters/FooterCTA',
        props: { links: [{ label: 'Instagram', href: 'https://instagram.com/sur' }] },
      },
    ]
    const agent = await loginAs('builder-buyer@test.com')
    const res = await agent.post('/api/checkout').send({
      items: [{ sku: 'custom', title: 'Inventado', unit_price: 1, recipe }],
    })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const pref = mp.lastPreference()

    const usd =
      PRODUCTS.custom.unit_price_usd +
      (recipe.length - CUSTOM_BASE_SECTIONS) * CUSTOM_EXTRA_SECTION_USD +
      COMMERCE_PACK_SURCHARGE_USD
    const order = await fileDb.findOrderById(res.body.orderId)
    assert.equal(order.items[0].unit_price_usd, usd)
    assert.equal(order.total, arsFromUsd(usd, order.fxRate))
    assert.equal(pref.items.length, 1)
    assert.equal(pref.items[0].unit_price, order.total)
    assert.equal(pref.items[0].title, PRODUCTS.custom.title)
    assert.equal(pref.items[0].category_id, 'virtual_goods')
    assert.match(pref.items[0].id, /^custom:chapters\/NavMinimal\+meridian\/Hero/)

    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    assert.equal(payment.transaction_amount, order.total)

    // Mis compras: la receta con sus props, la misma que arma el ZIP.
    const listed = (await agent.get('/api/orders')).body.orders.find((o) => o.id === order.id)
    assert.equal(listed.status, 'paid')
    assert.deepEqual(listed.items[0].recipe[2].props.stats, recipe[2].props.stats)

    assert.equal((await agent.get(`/api/orders/${order.id}/download`)).status, 200)
    const files = readZip(fs.readFileSync((await fileDb.findOrderById(order.id)).zipPath))
    const app = files.get('src/App.jsx').toString('utf8')
    assert.match(app, /brand=\{"ESTUDIO SUR"\}/)
    assert.match(app, /wordmark=\{"Casa Arena"\}/)
    assert.match(app, /label: "Visitas"/, 'la lista editada no llegó al ZIP')
    assert.match(app, /href: "https:\/\/instagram\.com\/sur"/)
    assert.ok(files.has('public/meridian/hero/seq/0001.webp'), 'faltan los frames del hero')
    assert.ok(files.has('public/meridian/gallery/01.webp'), 'falta la galería')
    assert.ok(files.has('src/lib/shop/checkoutAdapter.js'), 'falta el kit de commerce')
    assert.match(files.get('LICENSE.txt').toString('utf8'), /builder-buyer@test\.com/)
  })

  it('pagar dos veces la misma orden: queda paga una vez y le llega el aviso al dueño', async () => {
    const { orderId, pref, payment: first } = await paidOrder('twice@test.com')
    const second = mp.pay(pref.id)
    assert.equal((await webhook('payment', second.id)).status, 200)
    assert.equal((await webhook('payment', second.id)).status, 200) // reintento de MP

    const order = await fileDb.findOrderById(orderId)
    assert.equal(order.status, 'paid')
    assert.equal(order.mpPaymentId, String(first.id))

    await waitFor(() => alerts('COMPRA PAGADA DOS VECES').length >= 1, 'el aviso de doble pago')
    const mails = alerts('COMPRA PAGADA DOS VECES')
    assert.ok(mails.every((m) => m.idempotencyKey === `scrolllab-alert-duplicate-${second.id}`))
    assert.match(mails[0].body.text, new RegExp(`pago MP ${second.id}`))
    assert.match(mails[0].body.text, /twice@test\.com/)
    // El primer pago no es un duplicado.
    assert.equal(
      mp.outbox.filter((m) => m.idempotencyKey === `scrolllab-alert-duplicate-${first.id}`).length,
      0,
    )
  })

  it('un pago aprobado por otro monto que la orden: no se entrega y le avisa al dueño (antes solo quedaba en el log)', async () => {
    const agent = await loginAs('monto-mp@test.com')
    const { orderId, pref } = await checkout(agent, [{ sku: 'chapters' }])
    const payment = mp.pay(pref.id, { amount: 1000 })
    assert.equal((await webhook('payment', payment.id)).status, 200)
    await waitFor(() => alerts('NO COINCIDE').some((m) => m.body.text.includes(`pago MP ${payment.id}`)), 'el aviso de monto distinto')
    const mail = alerts('NO COINCIDE').find((m) => m.body.text.includes(`pago MP ${payment.id}`))
    assert.match(mail.body.text, /Monto del pago no coincide/)
    assert.match(mail.body.text, new RegExp(`orden ${orderId} espera`))
    assert.match(mail.body.text, /monto-mp@test\.com/)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'pending')
  })

  it('un pago cuya orden ya no existe avisa con el pago, el monto y el mail para entregar o reembolsar', async () => {
    const agent = await loginAs('late-cash@test.com')
    const { orderId, pref } = await checkout(agent, [{ sku: 'fizz' }])
    // La orden pendiente venció (índice TTL) antes de que se acreditara el pago.
    const file = path.join(process.env.FILE_DB_DIR, 'orders.json')
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
    fs.writeFileSync(file, JSON.stringify(rows.filter((r) => r.id !== orderId)))

    const payment = mp.pay(pref.id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    await waitFor(() => alerts('PAGO SIN ORDEN').length === 1, 'el aviso de pago sin orden')
    const [mail] = alerts('PAGO SIN ORDEN')
    assert.match(mail.body.text, new RegExp(`pago MP ${payment.id}`))
    assert.match(mail.body.text, new RegExp(String(payment.transaction_amount)))
    assert.match(mail.body.text, /late-cash@test\.com/)
  })

  it('los cobros de una suscripción de LAB que llegan como `payment` no disparan avisos', async () => {
    const before = alerts('PAGO SIN ORDEN').length
    const agent = await loginAs('lab-payment@test.com')
    await agent.post('/api/subscriptions').send({ plan: 'hosted_pro', cycle: 'monthly' })
    const sub = (await fileDb.findSubscriptionsByUser(
      (await fileDb.findUser({ email: 'lab-payment@test.com' })).id,
    ))[0]
    for (const [id, extra] of [
      ['900001', { operation_type: 'recurring_payment', external_reference: sub.id }],
      ['900002', { operation_type: 'regular_payment', external_reference: sub.id }],
    ]) {
      mp.payments.set(id, {
        id: Number(id),
        status: 'approved',
        transaction_amount: 99900,
        currency_id: 'ARS',
        ...extra,
      })
      assert.equal((await webhook('payment', id)).status, 200)
    }
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(alerts('PAGO SIN ORDEN').length, before)
  })

  it('reembolso del pago: la orden queda reembolsada, no se descarga más y avisa', async () => {
    const { agent, orderId, payment } = await paidOrder('refund@test.com')
    assert.equal((await agent.get(`/api/orders/${orderId}/download`)).status, 200)

    mp.payments.get(String(payment.id)).status = 'refunded'
    assert.equal((await webhook('payment', payment.id)).status, 200)
    const order = await fileDb.findOrderById(orderId)
    assert.equal(order.status, 'refunded')
    assert.equal(order.refundReason, 'refunded')

    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 403)
    assert.match(link.body.error, /reembolsada/)
    const list = await agent.get('/api/orders')
    assert.equal(list.body.orders.find((o) => o.id === orderId).status, 'refunded')
    await waitFor(() => alerts('ORDEN REEMBOLSADA').length === 1, 'el aviso de reembolso')
    // Queda en el libro de reembolsos (lo muestra el panel): quién y cuánto.
    const [row] = (await fileDb.listRefunds()).filter((r) => r.externalId === `mp-${payment.id}`)
    assert.equal(row.email, 'refund@test.com')
    assert.equal(row.amount, payment.transaction_amount)
    assert.deepEqual([row.provider, row.kind, row.orderId, row.partial], ['mercadopago', 'order', orderId, false])
  })

  it('reembolso parcial: la orden sigue paga y descargable, y avisa una sola vez', async () => {
    const { agent, orderId, payment } = await paidOrder('partial@test.com')
    Object.assign(mp.payments.get(String(payment.id)), { transaction_amount_refunded: 1000 })
    assert.equal((await webhook('payment', payment.id)).status, 200)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
    assert.equal((await agent.get(`/api/orders/${orderId}/download`)).status, 200)
    const ledger = (await fileDb.listRefunds()).filter((r) => r.externalId === `mp-${payment.id}`)
    assert.equal(ledger.length, 1)
    assert.deepEqual([ledger[0].email, ledger[0].amount, ledger[0].partial], ['partial@test.com', 1000, true])
    // Resend descarta el repetido por la clave de idempotencia: cuenta una sola clave.
    const mine = () => alerts('REEMBOLSO PARCIAL').filter((m) => m.body.text.includes(String(payment.id)))
    await waitFor(() => mine().length >= 1, 'el aviso del parcial')
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(new Set(mine().map((m) => m.idempotencyKey)).size, 1)
    assert.match(mine()[0].body.text, /devuelto 1000 de/)
  })

  it('contracargo: igual que el reembolso, con su propio aviso', async () => {
    const { orderId, payment } = await paidOrder('chargeback@test.com')
    mp.payments.get(String(payment.id)).status = 'charged_back'
    assert.equal((await webhook('payment', payment.id)).status, 200)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'refunded')
    await waitFor(() => alerts('CONTRACARGO').length === 1, 'el aviso de contracargo')
  })

  it('reembolsar el pago duplicado no toca la orden: sigue paga y descargable', async () => {
    const { agent, orderId, pref } = await paidOrder('dup-refund@test.com')
    const duplicate = mp.pay(pref.id)
    await webhook('payment', duplicate.id)

    const refundsBefore = alerts('ORDEN REEMBOLSADA').length
    mp.payments.get(String(duplicate.id)).status = 'refunded'
    assert.equal((await webhook('payment', duplicate.id)).status, 200)
    assert.equal((await fileDb.findOrderById(orderId)).status, 'paid')
    assert.equal((await agent.get(`/api/orders/${orderId}/download`)).status, 200)
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(alerts('ORDEN REEMBOLSADA').length, refundsBefore)
  })
})

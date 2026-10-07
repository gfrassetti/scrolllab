import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import {
  createFakeMercadoPago,
  startAppAgainstFakeMp,
  waitFor,
} from './helpers/fakeMercadoPago.js'
import { refundEligibility, REFUND_DAYS } from '../../src/domain/policy.js'

const DAY = 86_400_000

/**
 * Elegibilidad del reembolso por arrepentimiento (pura) y el botón de
 * arrepentimiento (Res. 424/2020): público, sin cuenta, con código de
 * seguimiento, mail al cliente y aviso al dueño con el veredicto del reembolso.
 */
describe('refundEligibility', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')
  const paid = (extra = {}) => ({
    status: 'paid',
    paidAt: new Date(now - 3 * DAY).toISOString(),
    downloadCount: 0,
    ...extra,
  })

  it('pagada, dentro del plazo y sin descargar: elegible, con su fecha límite', () => {
    const r = refundEligibility(paid(), { now })
    assert.equal(r.eligible, true)
    assert.equal(r.reason, 'ok')
    assert.equal(r.days, REFUND_DAYS)
    assert.equal(r.deadline, new Date(now - 3 * DAY + REFUND_DAYS * DAY).toISOString())
  })

  it('el ZIP descargado corta el reembolso por arrepentimiento', () => {
    const r = refundEligibility(paid({ downloadCount: 1 }), { now })
    assert.deepEqual([r.eligible, r.reason, r.downloads], [false, 'downloaded', 1])
  })

  it('pasado el plazo no hay reembolso (aunque no haya descargado)', () => {
    const old = paid({ paidAt: new Date(now - (REFUND_DAYS + 1) * DAY).toISOString() })
    assert.equal(refundEligibility(old, { now }).reason, 'expired')
    // El último día todavía vale.
    const edge = paid({ paidAt: new Date(now - REFUND_DAYS * DAY + 60_000).toISOString() })
    assert.equal(refundEligibility(edge, { now }).eligible, true)
  })

  it('pendiente, reembolsada o inexistente: no elegible, cada una con su motivo', () => {
    assert.equal(refundEligibility({ status: 'pending' }, { now }).reason, 'not_paid')
    assert.equal(refundEligibility({ status: 'refunded' }, { now }).reason, 'refunded')
    assert.equal(refundEligibility(null, { now }).reason, 'no_order')
  })

  it('órdenes viejas sin paidAt cuentan desde que se crearon', () => {
    const legacy = { status: 'paid', createdAt: new Date(now - 2 * DAY).toISOString() }
    assert.equal(refundEligibility(legacy, { now }).eligible, true)
  })
})

describe('Botón de arrepentimiento (MP simulado)', () => {
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

  const alerts = (title) => mp.mailsTo(OWNER).filter((m) => m.body.subject.includes(title))
  const withdraw = (body) => request(app).post('/api/withdrawals').send(body)
  /** Mails de arrepentimiento que recibió un cliente (aparte del recibo de su compra). */
  const confirmations = (email) =>
    mp.mailsTo(email).filter((m) => /arrepentimiento|withdrawal request/i.test(m.body.subject))

  async function paidOrder(email) {
    const agent = await loginAs(email)
    const res = await agent.post('/api/checkout').send({ items: [{ sku: 'chapters' }] })
    assert.equal(res.status, 200)
    const payment = mp.pay(mp.lastPreference().id)
    assert.equal((await webhook('payment', payment.id)).status, 200)
    return { agent, orderId: res.body.orderId }
  }

  /** Baja el ZIP de verdad (link firmado + archivo): el contador sube con el archivo, no con el link. */
  async function download(agent, orderId) {
    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 200)
    const file = await agent.get(new URL(link.body.url, 'http://x').pathname + new URL(link.body.url, 'http://x').search)
    assert.equal(file.status, 200)
  }

  const ordersOf = async (agent) => (await agent.get('/api/orders')).body.orders

  it('al cobrar la orden queda con paidAt, y «Mis compras» dice que el reembolso está disponible', async () => {
    const { agent, orderId } = await paidOrder('eleg@test.com')
    const order = await fileDb.findOrderById(orderId)
    assert.ok(order.paidAt)
    const [mine] = await ordersOf(agent)
    assert.equal(mine.refund.eligible, true)
    assert.equal(mine.refund.reason, 'ok')
    assert.equal(mine.refund.downloads, 0)
    const left = (Date.parse(mine.refund.deadline) - Date.now()) / DAY
    assert.ok(left > REFUND_DAYS - 0.1 && left <= REFUND_DAYS, String(left))
  })

  it('descargar el ZIP cierra el reembolso: «Mis compras» lo refleja', async () => {
    const { agent, orderId } = await paidOrder('baja@test.com')
    // Pedir solo el link no cuenta: tiene que bajarse el archivo.
    const link = await agent.get(`/api/orders/${orderId}/download`)
    assert.equal(link.status, 200)
    assert.equal((await ordersOf(agent))[0].refund.eligible, true)
    await download(agent, orderId)
    const [after] = await ordersOf(agent)
    assert.equal(after.refund.eligible, false)
    assert.equal(after.refund.reason, 'downloaded')
    assert.equal(after.downloadCount, 1)
  })

  it('el pedido público devuelve solo el código y avisa al dueño: ELEGIBLE si no descargó', async () => {
    const { orderId } = await paidOrder('cliente@test.com')
    const res = await withdraw({ email: 'Cliente@Test.com', name: 'Ana Pérez', order: orderId.slice(-8), message: 'No era lo que esperaba' })
    assert.equal(res.status, 201)
    assert.match(res.body.code, /^ARR-[A-Z2-9]{6}$/)
    // Nada de la orden en la respuesta pública.
    assert.deepEqual(Object.keys(res.body).sort(), ['code', 'ok'])

    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso al dueño')
    const text = alerts(res.body.code)[0].body.text
    assert.match(text, /ELEGIBLE — reembolsar/)
    assert.match(text, /cliente@test\.com/)
    assert.match(text, new RegExp(`orden ${orderId}`))
    assert.match(text, /No era lo que esperaba/)

    await waitFor(() => confirmations('cliente@test.com').length === 1, 'el mail al cliente')
    const mail = confirmations('cliente@test.com')[0].body
    assert.match(mail.subject, new RegExp(`arrepentimiento · ${res.body.code}`))
    assert.match(mail.text, new RegExp(res.body.code))
    assert.match(mail.text, /CHAPTERS/)
  })

  it('con el ZIP descargado el aviso dice NO elegible y por qué', async () => {
    const { agent, orderId } = await paidOrder('bajo@test.com')
    await download(agent, orderId)
    const res = await withdraw({ email: 'bajo@test.com', name: 'Beto', order: orderId })
    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso al dueño')
    const text = alerts(res.body.code)[0].body.text
    assert.match(text, /NO elegible por arrepentimiento: el ZIP se descargó 1 vez/)
    assert.match(text, /defecto técnico/)
  })

  it('pedirlo dos veces el mismo día devuelve el mismo código y manda un solo mail', async () => {
    const { orderId } = await paidOrder('doble@test.com')
    const a = await withdraw({ email: 'doble@test.com', name: 'Doble', order: orderId.slice(-8) })
    const b = await withdraw({ email: 'doble@test.com', name: 'Doble', order: orderId.slice(-8) })
    assert.equal(a.status, 201)
    assert.equal(b.status, 200)
    assert.equal(b.body.code, a.body.code)
    await waitFor(() => confirmations('doble@test.com').length >= 1, 'el mail')
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(confirmations('doble@test.com').length, 1)
    assert.equal(alerts(a.body.code).length, 1)
  })

  it('un mail que no es el de la compra no asocia la orden (y no filtra si existe)', async () => {
    const { orderId } = await paidOrder('dueno@test.com')
    const res = await withdraw({ email: 'otro@test.com', name: 'Otro', order: orderId })
    assert.equal(res.status, 201)
    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso')
    assert.match(alerts(res.body.code)[0].body.text, /SIN ORDEN/)
    // Un número sin ninguna compra que lo respalde responde igual que uno válido.
    const ghost = await withdraw({ email: 'dueno@test.com', name: 'Dueño', order: 'ffffffff' })
    assert.equal(ghost.status, 201)
    assert.deepEqual(Object.keys(ghost.body).sort(), ['code', 'ok'])
  })

  it('sin número de orden también se registra (LAB u otro caso a mano) y en inglés el mail sale en inglés', async () => {
    const res = await withdraw({ email: 'lab@test.com', name: 'Lab User', locale: 'en', message: 'LAB subscription' })
    assert.equal(res.status, 201)
    await waitFor(() => confirmations('lab@test.com').length === 1, 'el mail')
    const mail = confirmations('lab@test.com')[0].body
    assert.match(mail.subject, /We received your withdrawal request/)
    assert.match(mail.text, new RegExp(res.body.code))
    await waitFor(() => alerts(res.body.code).length === 1, 'el aviso')
    assert.match(alerts(res.body.code)[0].body.text, /SIN ORDEN/)
  })

  it('valida lo mínimo: mail válido y nombre', async () => {
    assert.equal((await withdraw({ email: 'no-es-un-mail', name: 'Ana' })).status, 400)
    assert.equal((await withdraw({ email: 'ana@test.com', name: ' ' })).status, 400)
    assert.equal((await withdraw({})).status, 400)
    const bad = await withdraw({ email: 'ana@test.com', name: '' })
    assert.match(bad.body.error, /nombre/i)
  })

  it('el reembolso aprobado de una compra sin descargar la deja reembolsada y «Mis compras» no ofrece más', async () => {
    const { agent, orderId, } = await paidOrder('reemb@test.com')
    const payment = [...mp.payments.values()].at(-1)
    mp.payments.get(String(payment.id)).status = 'refunded'
    assert.equal((await webhook('payment', payment.id)).status, 200)
    const [mine] = await ordersOf(agent)
    assert.equal(mine.status, 'refunded')
    assert.equal(mine.refund.eligible, false)
    assert.equal(mine.refund.reason, 'refunded')
    assert.ok(orderId)
  })
})

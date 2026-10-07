import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildMoneyStatus } from '../services/moneyStatus.js'
import { REFUND_DAYS } from '../../src/domain/policy.js'
import { HOSTED_PLANS } from '../catalog.js'

const DAY = 86_400_000
const now = new Date('2026-10-20T12:00:00Z')
const ago = (days) => new Date(now.getTime() - days * DAY).toISOString()

const users = [
  { _id: 'u1', email: 'ana@test.com' },
  { _id: 'u2', email: 'beto@test.com' },
  { _id: 'u3', email: 'caro@test.com' },
]

/**
 * La plata en el panel: qué no se toca (todavía reembolsable), qué está libre,
 * los reembolsos con quién y cuánto, y las solicitudes de arrepentimiento.
 */
describe('buildMoneyStatus', () => {
  it('sin descargar y en plazo: no tocar; descargada o vencida: libre', () => {
    const out = buildMoneyStatus({
      now,
      users,
      orders: [
        { _id: 'o1', userId: 'u1', status: 'paid', paidAt: ago(2), downloadCount: 0, total: 149, currency_id: 'USD', provider: 'paddle', items: [{ sku: 'chapters', title: 'CHAPTERS' }] },
        { _id: 'o2', userId: 'u2', status: 'paid', paidAt: ago(2), downloadCount: 1, total: 231000, currency_id: 'ARS', items: [{ sku: 'nocturne' }] },
        { _id: 'o3', userId: 'u3', status: 'paid', paidAt: ago(REFUND_DAYS + 1), downloadCount: 0, total: 100000, currency_id: 'ARS', items: [] },
        { _id: 'o4', userId: 'u3', status: 'pending', total: 5, currency_id: 'USD', items: [] },
      ],
    })
    assert.deepEqual(out.locked.total, [{ currency: 'USD', total: 149 }])
    assert.deepEqual(out.free, [{ currency: 'ARS', total: 331000 }])
    const [row] = out.locked.rows
    assert.equal(row.email, 'ana@test.com')
    assert.equal(row.amount, 149)
    assert.equal(row.what, 'CHAPTERS')
    assert.equal(row.until, new Date(Date.parse(ago(2)) + REFUND_DAYS * DAY).toISOString())
  })

  it('LAB: solo el primer cobro queda sin tocar, mientras dure el plazo desde el alta', () => {
    const lab = (extra) => ({ status: 'authorized', plan: 'hosted_pro', cycle: 'monthly', currency_id: 'USD', provider: 'paddle', ...extra })
    const out = buildMoneyStatus({
      now,
      users,
      subscriptions: [
        // Se suscribió hace 10 días (7 de prueba) y pagó hace 3: le quedan 4 para pedirlo.
        lab({ _id: 's1', userId: 'u1', activatedAt: ago(10), firstPaidAt: ago(3), lastPaidAt: ago(3) }),
        // Renovación: no se devuelve.
        lab({ _id: 's2', userId: 'u2', activatedAt: ago(40), firstPaidAt: ago(33), lastPaidAt: ago(3) }),
        // En la prueba: no hay cobro que guardar.
        lab({ _id: 's4', userId: 'u2', activatedAt: ago(2) }),
        // Primer cobro pero ya pasaron los días desde el alta.
        lab({ _id: 's5', userId: 'u3', activatedAt: ago(REFUND_DAYS + 1), firstPaidAt: ago(REFUND_DAYS - 6), lastPaidAt: ago(REFUND_DAYS - 6) }),
        lab({ _id: 's3', userId: 'u3', status: 'cancelled', activatedAt: ago(5), lastPaidAt: ago(1) }),
      ],
    })
    assert.deepEqual(out.locked.total, [{ currency: 'USD', total: HOSTED_PLANS.hosted_pro.priceMonthlyUsd }])
    assert.equal(out.locked.rows[0].email, 'ana@test.com')
    assert.match(out.locked.rows[0].what, /LAB/)
  })

  it('reembolsos: quién, cuánto y qué; los parciales se descuentan de lo que queda', () => {
    const out = buildMoneyStatus({
      now,
      users,
      orders: [
        { _id: 'o1', userId: 'u1', status: 'paid', paidAt: ago(1), downloadCount: 0, total: 149, currency_id: 'USD', items: [{ title: 'CHAPTERS' }] },
        // Reembolsada antes de que existiera el libro: aparece igual.
        { _id: 'o9', userId: 'u2', status: 'refunded', refundedAt: ago(40), total: 231000, currency_id: 'ARS', items: [{ sku: 'nocturne' }] },
      ],
      refunds: [
        { externalId: 'paddle-adj_1', provider: 'paddle', kind: 'order', orderId: 'o1', userId: 'u1', amount: 5, currency: 'USD', partial: true, refundedAt: ago(1) },
        { externalId: 'paddle-adj_2', provider: 'paddle', kind: 'lab', userId: 'u3', email: 'caro@test.com', amount: 79, currency: 'USD', refundedAt: ago(2) },
      ],
    })
    assert.deepEqual(out.locked.total, [{ currency: 'USD', total: 144 }])
    assert.equal(out.refunds.rows.length, 3)
    assert.deepEqual(
      out.refunds.rows.map((r) => [r.email, r.amount, r.currency, r.what, r.partial]),
      [
        ['ana@test.com', 5, 'USD', 'CHAPTERS', true],
        ['caro@test.com', 79, 'USD', 'LAB', false],
        ['beto@test.com', 231000, 'ARS', 'nocturne', false],
      ],
    )
    assert.equal(out.refunds.last7Count, 2)
    assert.deepEqual(out.refunds.last30, [{ currency: 'USD', total: 84 }])
  })

  it('arrepentimiento: qué hacer con cada solicitud según la compra de hoy', () => {
    const out = buildMoneyStatus({
      now,
      users,
      orders: [
        { _id: 'o1', userId: 'u1', status: 'paid', paidAt: ago(1), downloadCount: 0, total: 149, currency_id: 'USD', provider: 'paddle', items: [{ title: 'CHAPTERS' }] },
        { _id: 'o2', userId: 'u2', status: 'paid', paidAt: ago(1), downloadCount: 2, total: 149, currency_id: 'USD', items: [] },
        { _id: 'o3', userId: 'u3', status: 'refunded', total: 149, currency_id: 'USD', items: [] },
      ],
      withdrawals: [
        { code: 'ARR-AAAAAA', email: 'ana@test.com', orderId: 'o1', createdAt: ago(0) },
        { code: 'ARR-BBBBBB', email: 'beto@test.com', orderId: 'o2', createdAt: ago(0) },
        { code: 'ARR-CCCCCC', email: 'caro@test.com', orderId: 'o3', createdAt: ago(0) },
        { code: 'ARR-DDDDDD', email: 'x@test.com', orderId: null, createdAt: ago(0) },
      ],
    })
    assert.deepEqual(
      out.withdrawals.rows.map((w) => [w.code, w.verdict, w.open]),
      [
        ['ARR-AAAAAA', 'ELEGIBLE — reembolsar', true],
        ['ARR-BBBBBB', 'descargó: solo por defecto', true],
        ['ARR-CCCCCC', 'reembolsada', false],
        ['ARR-DDDDDD', 'revisar a mano', true],
      ],
    )
    assert.equal(out.withdrawals.open, 3)
  })
})

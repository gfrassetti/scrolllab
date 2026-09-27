/**
 * El camino de Mongo (producción) de la suscripción, sin base: Mongoose
 * descarta en silencio lo que no está en el esquema, y la subida de plan vive
 * de estos campos (lo pagado del período, el checkout de la diferencia y los
 * pagos ya aplicados). Los recorridos corren contra el store de archivo, que
 * guarda cualquier cosa: esto es lo que ellos no ven.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// db.js elige el camino según STORE al cargarse; nunca se conecta.
process.env.NODE_ENV = 'development'
process.env.STORE = 'mongo'

const { Subscription } = await import('../models.js')

const base = () => ({
  userId: new mongoose.Types.ObjectId(),
  plan: 'hosted_pro',
  cycle: 'monthly',
  status: 'authorized',
})

describe('esquema de la suscripción (sin base)', () => {
  it('conserva lo pagado, el checkout de la diferencia y los pagos aplicados', () => {
    const expiresAt = new Date('2026-10-21T17:00:00.000Z')
    const sub = new Subscription({
      ...base(),
      paidPlan: 'hosted_starter',
      paidCycle: 'monthly',
      pendingUpgrade: {
        plan: 'hosted_pro',
        amount: 43549,
        reference: 'labup:x:hosted_pro:43549:n',
        preferenceId: 'pref1',
        initPoint: 'https://mp.test/checkout/pref1',
        expiresAt,
        createdAt: new Date(),
      },
      upgradePayments: [
        { paymentId: '123', plan: 'hosted_pro', amount: 43549, at: new Date(), outcome: 'applied' },
      ],
    })
    assert.equal(sub.validateSync(), undefined)
    const plain = sub.toObject()
    assert.equal(plain.paidPlan, 'hosted_starter')
    assert.equal(plain.paidCycle, 'monthly')
    assert.equal(plain.pendingUpgrade.amount, 43549)
    assert.equal(plain.pendingUpgrade.reference, 'labup:x:hosted_pro:43549:n')
    assert.equal(plain.pendingUpgrade.initPoint, 'https://mp.test/checkout/pref1')
    assert.equal(plain.pendingUpgrade.expiresAt.toISOString(), expiresAt.toISOString())
    assert.deepEqual(
      plain.upgradePayments.map((p) => [p.paymentId, p.plan, p.amount, p.outcome]),
      [['123', 'hosted_pro', 43549, 'applied']],
    )
    assert.equal('_id' in plain.upgradePayments[0], false)
  })

  it('un ciclo pagado que no existe no valida', () => {
    const sub = new Subscription({ ...base(), paidCycle: 'weekly' })
    assert.ok(sub.validateSync()?.errors?.paidCycle)
  })

  it('una suscripción guardada: limpiar el checkout lo borra y sumar un pago lo persiste', () => {
    const sub = Subscription.hydrate({
      _id: new mongoose.Types.ObjectId(),
      ...base(),
      pendingUpgrade: { plan: 'hosted_pro', amount: 43549, reference: 'labup:x:hosted_pro:43549:n' },
    })
    sub.pendingUpgrade = undefined
    sub.upgradePayments = [
      ...(sub.upgradePayments || []),
      { paymentId: '123', plan: 'hosted_pro', amount: 43549, at: new Date(), outcome: 'applied' },
    ]
    const changes = sub.getChanges()
    const unset = Object.keys(changes.$unset || {})
    assert.ok(
      unset.some((k) => k === 'pendingUpgrade' || k.startsWith('pendingUpgrade.')),
      JSON.stringify(changes),
    )
    assert.equal(changes.$set.upgradePayments.length, 1)
    assert.equal(changes.$set.upgradePayments[0].paymentId, '123')
    // Leído de nuevo, no queda un checkout "abierto" a medias.
    assert.equal(sub.pendingUpgrade?.plan, undefined)
  })
})

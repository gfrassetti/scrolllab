/**
 * El camino de Mongo (producción) del aviso de fin de prueba. No hay Mongo en
 * los tests, así que se prueba lo que sí se puede sin base: que el esquema
 * conserve los campos del aviso (Mongoose descarta en silencio lo que no está
 * en el esquema y el mail saldría en cada pasada) y que las consultas de db.js
 * sean las correctas, con el modelo simulado.
 */
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// db.js elige el camino según STORE al cargarse; nunca se conecta.
process.env.NODE_ENV = 'development'
process.env.STORE = 'mongo'

const { Subscription } = await import('../models.js')
const { db } = await import('../db.js')

const restores = []
/** Reemplaza un método estático del modelo; se deshace solo en afterEach. */
function stub(model, name, impl) {
  const own = Object.prototype.hasOwnProperty.call(model, name)
  const original = model[name]
  model[name] = impl
  restores.push(() => {
    if (own) model[name] = original
    else delete model[name]
  })
}
afterEach(() => {
  while (restores.length) restores.pop()()
})

const NOW = new Date('2026-10-01T15:00:00.000Z')
const WITHIN = 2 * 86_400_000

describe('esquema de la suscripción (sin base)', () => {
  it('conserva los campos del aviso de fin de prueba', () => {
    const at = new Date('2026-10-02T12:00:00.000Z')
    const sub = new Subscription({
      userId: new mongoose.Types.ObjectId(),
      plan: 'hosted_pro',
      cycle: 'monthly',
      trialEndsAt: new Date('2026-10-03T09:00:00.000Z'),
      trialReminderEmailSendingAt: at,
      trialReminderEmailSentAt: at,
      trialReminderEmailId: 'em-1',
      trialReminderEmailError: 'boom',
    })
    const plain = sub.toObject()
    assert.equal(plain.trialReminderEmailSentAt.getTime(), at.getTime())
    assert.equal(plain.trialReminderEmailSendingAt.getTime(), at.getTime())
    assert.equal(plain.trialReminderEmailId, 'em-1')
    assert.equal(plain.trialReminderEmailError, 'boom')
    assert.equal(sub.validateSync(), undefined)
  })
})

describe('consultas de Mongo del aviso (modelo simulado)', () => {
  it('claim: solo pruebas sin cancelar que terminan dentro del plazo y sin aviso previo', async () => {
    let seen
    stub(Subscription, 'findOneAndUpdate', async (filter, update, opts) => {
      seen = { filter, update, opts }
      return { id: 's1' }
    })

    const out = await db.claimSubscriptionEmail('s1', 'trialReminder', {
      withinMs: WITHIN,
      now: NOW,
    })

    assert.deepEqual(out, { id: 's1' })
    assert.equal(seen.filter._id, 's1')
    assert.equal(seen.filter.status, 'authorized')
    assert.equal(seen.filter.canceledAt, null)
    assert.equal(seen.filter.lastPaidAt, null)
    assert.deepEqual(seen.filter.trialEndsAt, {
      $gt: NOW,
      $lte: new Date(NOW.getTime() + WITHIN),
    })
    assert.equal(seen.filter.trialReminderEmailSentAt, null)
    assert.deepEqual(seen.filter.$or[0], { trialReminderEmailSendingAt: null })
    assert.ok(seen.update.$set.trialReminderEmailSendingAt instanceof Date)
    assert.deepEqual(seen.update.$unset, { trialReminderEmailError: 1 })
    assert.equal(seen.opts.new, true)
  })

  it('claim sin plazo no consulta nada', async () => {
    stub(Subscription, 'findOneAndUpdate', async () => assert.fail('no debía consultar'))
    assert.equal(await db.claimSubscriptionEmail('s1', 'trialReminder'), null)
    assert.equal(
      await db.claimSubscriptionEmail('s1', 'trialReminder', { withinMs: 0 }),
      null,
    )
  })

  it('la bienvenida y la baja siguen con su gate y sus campos', async () => {
    const seen = []
    stub(Subscription, 'findOneAndUpdate', async (filter) => {
      seen.push(filter)
      return {}
    })

    await db.claimSubscriptionEmail('s1', 'welcome')
    await db.claimSubscriptionEmail('s1', 'canceled')

    assert.equal(seen[0].status, 'authorized')
    assert.equal(seen[0].welcomeEmailSentAt, null)
    assert.equal('trialEndsAt' in seen[0], false)
    assert.deepEqual(seen[1].canceledAt, { $ne: null })
    assert.equal(seen[1].canceledEmailSentAt, null)
  })

  it('un mail desconocido falla en vez de escribir en otros campos', async () => {
    stub(Subscription, 'findOneAndUpdate', async () => assert.fail('no debía consultar'))
    await assert.rejects(() => db.claimSubscriptionEmail('s1', 'nope'), /desconocido/)
  })

  it('complete y release usan los campos del aviso', async () => {
    const seen = []
    stub(Subscription, 'findByIdAndUpdate', async (id, update) => {
      seen.push({ id, update })
      return {}
    })

    await db.completeSubscriptionEmail('s1', 'trialReminder', 'em-9')
    await db.releaseSubscriptionEmail('s1', 'trialReminder', 'boom')

    const [done, released] = seen
    assert.ok(done.update.$set.trialReminderEmailSentAt instanceof Date)
    assert.equal(done.update.$set.trialReminderEmailId, 'em-9')
    assert.deepEqual(done.update.$unset, {
      trialReminderEmailSendingAt: 1,
      trialReminderEmailError: 1,
    })
    assert.deepEqual(released.update.$set, { trialReminderEmailError: 'boom' })
    assert.deepEqual(released.update.$unset, { trialReminderEmailSendingAt: 1 })
  })

  it('el listado pide el mismo filtro que el claim', async () => {
    let seen
    stub(Subscription, 'find', async (filter) => {
      seen = filter
      return []
    })

    await db.listTrialReminderCandidates({ now: NOW, withinMs: WITHIN })

    assert.deepEqual(seen, {
      status: 'authorized',
      canceledAt: null,
      lastPaidAt: null,
      trialReminderEmailSentAt: null,
      trialEndsAt: { $gt: NOW, $lte: new Date(NOW.getTime() + WITHIN) },
    })
  })
})

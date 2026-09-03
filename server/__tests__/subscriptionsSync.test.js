import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

/**
 * `syncSubscriptionForUser` — el sync manual que dispara el usuario al volver
 * del checkout de MP (mismo efecto que el webhook `subscription_preapproval`).
 * `fetchPreapproval` se inyecta como doble: no se le pega a MP.
 */
describe('syncSubscriptionForUser (file store, MP inyectado)', () => {
  let db
  let sync
  let onPayment
  let storageDir
  const config = { mpSubs: { accessToken: 'TEST-TOKEN' } }

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-sync-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')
    ;({ db } = await import('../db.js'))
    ;({
      syncSubscriptionForUser: sync,
      handleAuthorizedPaymentEvent: onPayment,
    } = await import('../services/subscriptions.js'))
  })

  after(() => {
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  async function seed(userId, patch = {}) {
    const sub = await db.createSubscription({
      userId,
      plan: 'hosted_pro',
      cycle: 'monthly',
      status: 'pending',
    })
    Object.assign(sub, { mpPreapprovalId: `pre_${userId}`, ...patch })
    await sub.save()
    return sub
  }

  it('baja el estado authorized + próximo cobro desde MP', async () => {
    await seed('u-auth')
    const deps = {
      fetchPreapproval: async () => ({
        status: 'authorized',
        next_payment_date: '2026-10-01T00:00:00.000Z',
      }),
    }
    const out = await sync({ userId: 'u-auth', config }, deps)
    assert.equal(out.status, 'authorized')
    assert.equal(
      new Date(out.currentPeriodEnd).toISOString(),
      '2026-10-01T00:00:00.000Z',
    )

    const [row] = await db.findSubscriptionsByUser('u-auth')
    assert.equal(row.status, 'authorized')
  })

  it('propaga paused', async () => {
    await seed('u-paused')
    const out = await sync(
      { userId: 'u-paused', config },
      { fetchPreapproval: async () => ({ status: 'paused' }) },
    )
    assert.equal(out.status, 'paused')
  })

  it('un status desconocido de MP no toca la fila', async () => {
    await seed('u-weird')
    const out = await sync(
      { userId: 'u-weird', config },
      { fetchPreapproval: async () => ({ status: 'something_else' }) },
    )
    assert.equal(out.status, 'pending')
  })

  it('sin fila con preapproval → 404', async () => {
    await seed('u-nopre', { mpPreapprovalId: '' })
    await assert.rejects(
      sync(
        { userId: 'u-nopre', config },
        { fetchPreapproval: async () => ({ status: 'authorized' }) },
      ),
      (err) => err.status === 404,
    )
  })

  it('toma la fila más reciente', async () => {
    await seed('u-multi', {
      mpPreapprovalId: 'pre_old',
      createdAt: '2020-01-01T00:00:00.000Z',
    })
    await new Promise((r) => setTimeout(r, 5))
    await seed('u-multi', { mpPreapprovalId: 'pre_new' })

    const seen = []
    await sync(
      { userId: 'u-multi', config },
      {
        fetchPreapproval: async (_tok, id) => {
          seen.push(id)
          return { status: 'authorized' }
        },
      },
    )
    assert.deepEqual(seen, ['pre_new'])
  })

  // ——— handleAuthorizedPaymentEvent (renovación) ———

  const ap = (over = {}) => ({
    preapproval_id: over.preapproval_id ?? 'pre_u-pay',
    status: over.status ?? 'processed',
    payment: over.payment,
  })

  it('pago cobrado extiende el período ~31 días desde ahora', async () => {
    await seed('u-pay')
    const before = Date.now()
    const out = await onPayment(
      { authorizedPaymentId: 'ap-1', config },
      { fetchAuthorizedPayment: async () => ap() },
    )
    assert.equal(out.status, 'authorized')
    const days = (new Date(out.currentPeriodEnd) - before) / 86_400_000
    assert.ok(days > 30.5 && days < 31.5, `extendió ${days} días`)
  })

  it('extiende desde el fin de período vigente si es futuro (no desde hoy)', async () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString()
    await seed('u-pay2', {
      mpPreapprovalId: 'pre_u-pay2',
      currentPeriodEnd: future,
    })
    const out = await onPayment(
      { authorizedPaymentId: 'ap-2', config },
      { fetchAuthorizedPayment: async () => ap({ preapproval_id: 'pre_u-pay2' }) },
    )
    const days = (new Date(out.currentPeriodEnd) - new Date(future)) / 86_400_000
    assert.ok(days > 30.5 && days < 31.5, `extendió ${days} días desde el fin vigente`)
  })

  it('pago no aprobado no toca el período', async () => {
    await seed('u-pay3', { mpPreapprovalId: 'pre_u-pay3', currentPeriodEnd: null })
    const out = await onPayment(
      { authorizedPaymentId: 'ap-3', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({ preapproval_id: 'pre_u-pay3', status: 'cancelled' }),
      },
    )
    assert.equal(out.currentPeriodEnd, null)
  })

  it('authorized_payment sin preapproval_id → skipped', async () => {
    const out = await onPayment(
      { authorizedPaymentId: 'ap-4', config },
      { fetchAuthorizedPayment: async () => ({ status: 'processed' }) },
    )
    assert.ok(out.skipped)
  })

  it('mail de bienvenida: se manda una sola vez y solo si authorized', async () => {
    const { sendSubscriptionWelcomeOnce } = await import('../services/email.js')
    const user = await db.createUser({ email: 'welcome@test.com', name: 'W' })
    const emailCfg = {
      clientUrl: 'https://www.scrolllab.com.ar',
      email: { enabled: true, apiKey: 'x', from: 'x', replyTo: '', logoUrl: '' },
    }
    let calls = 0
    const client = {
      emails: {
        send: async () => {
          calls++
          return { data: { id: `em-${calls}` } }
        },
      },
    }

    const sub = await db.createSubscription({
      userId: user.id,
      plan: 'hosted_starter',
      cycle: 'monthly',
      status: 'pending',
    })

    // pending → no manda
    let r = await sendSubscriptionWelcomeOnce({
      subscription: sub,
      config: emailCfg,
      client,
    })
    assert.ok(r.skipped)
    assert.equal(calls, 0)

    sub.status = 'authorized'
    await sub.save()

    r = await sendSubscriptionWelcomeOnce({
      subscription: sub,
      config: emailCfg,
      client,
    })
    assert.equal(r.sent, true)
    assert.equal(calls, 1)

    // segundo intento → dedup
    r = await sendSubscriptionWelcomeOnce({
      subscription: sub,
      config: emailCfg,
      client,
    })
    assert.ok(r.skipped)
    assert.equal(calls, 1)
  })

  it('mail de bienvenida: no-op si email deshabilitado', async () => {
    const { sendSubscriptionWelcomeOnce } = await import('../services/email.js')
    const sub = await db.createSubscription({
      userId: 'noemail',
      plan: 'hosted_pro',
      cycle: 'monthly',
      status: 'authorized',
    })
    const r = await sendSubscriptionWelcomeOnce({
      subscription: sub,
      config: { clientUrl: 'https://x', email: { enabled: false } },
    })
    assert.equal(r.skipped, 'disabled')
  })

  it('mail de baja: se manda una sola vez y solo si canceledAt', async () => {
    const { sendSubscriptionCanceledOnce } = await import('../services/email.js')
    const user = await db.createUser({ email: 'cancel@test.com', name: 'C' })
    const emailCfg = {
      clientUrl: 'https://www.scrolllab.com.ar',
      email: { enabled: true, apiKey: 'x', from: 'x', replyTo: '', logoUrl: '' },
    }
    let calls = 0
    const client = {
      emails: {
        send: async () => {
          calls++
          return { data: { id: `em-${calls}` } }
        },
      },
    }

    const sub = await db.createSubscription({
      userId: user.id,
      plan: 'hosted_starter',
      cycle: 'monthly',
      status: 'authorized',
    })
    sub.currentPeriodEnd = '2026-11-01T00:00:00.000Z'
    await sub.save()

    // sin canceledAt → no manda
    let r = await sendSubscriptionCanceledOnce({
      subscription: sub,
      config: emailCfg,
      client,
    })
    assert.ok(r.skipped)
    assert.equal(calls, 0)

    sub.canceledAt = new Date().toISOString()
    await sub.save()

    r = await sendSubscriptionCanceledOnce({
      subscription: sub,
      config: emailCfg,
      client,
    })
    assert.equal(r.sent, true)
    assert.equal(calls, 1)

    // dedup + no pisa el mail de bienvenida (kind distinto)
    r = await sendSubscriptionCanceledOnce({
      subscription: sub,
      config: emailCfg,
      client,
    })
    assert.ok(r.skipped)
    assert.equal(calls, 1)
  })
})

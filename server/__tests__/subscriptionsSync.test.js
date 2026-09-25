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
  let handlePre
  let resolve
  let cancelConfirmed
  let retirePending
  let addBillingCycle
  let trialEligible
  let storageDir
  const config = { mpSubs: { accessToken: 'TEST-TOKEN' } }
  const entConfig = { ...config, hostedFreeQuota: 1, hostedGraceDays: 10 }

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
      handlePreapprovalEvent: handlePre,
      resolveEntitlement: resolve,
      cancelPreapprovalConfirmed: cancelConfirmed,
      retirePendingSubscription: retirePending,
      addBillingCycle,
      trialEligible,
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

  const DAY = 86_400_000
  const iso = (d) => new Date(d).toISOString()
  const ap = (over = {}) => ({
    preapproval_id: over.preapproval_id ?? 'pre_u-pay',
    status: over.status ?? 'processed',
    debit_date: over.debit_date,
    payment: 'payment' in over ? over.payment : { status: 'approved' },
  })

  it('pago aprobado: el período queda en debit_date + 1 mes y activa la fila', async () => {
    await seed('u-pay')
    const out = await onPayment(
      { authorizedPaymentId: 'ap-1', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({ debit_date: '2026-09-10T12:00:00.000Z' }),
      },
    )
    assert.equal(out.status, 'authorized')
    assert.equal(iso(out.currentPeriodEnd), '2026-10-10T12:00:00.000Z')
    const [row] = await db.findSubscriptionsByUser('u-pay')
    assert.equal(iso(row.lastPaidAt), '2026-09-10T12:00:00.000Z')
    assert.ok(row.activatedAt)
  })

  it('el mismo pago entregado dos veces no regala otro mes (idempotente)', async () => {
    const debit = iso(Date.now() - 1000)
    await seed('u-dup', { currentPeriodEnd: debit })
    const deps = {
      fetchAuthorizedPayment: async () =>
        ap({ preapproval_id: 'pre_u-dup', debit_date: debit }),
    }
    const first = await onPayment({ authorizedPaymentId: 'ap-d', config }, deps)
    const second = await onPayment({ authorizedPaymentId: 'ap-d', config }, deps)
    assert.equal(iso(second.currentPeriodEnd), iso(first.currentPeriodEnd))
    const days = (new Date(second.currentPeriodEnd) - Date.now()) / DAY
    assert.ok(days > 27 && days < 32, `período de ${days} días`)
  })

  it('webhook de preapproval + webhook del pago, en cualquier orden → el mismo período', async () => {
    const debit = '2026-09-01T10:00:00.000Z'
    const payment = async () => ap({ preapproval_id: 'pre_u-order', debit_date: debit })
    // MP ya avanzó next_payment_date al mes siguiente después de cobrar.
    const preapproval = async () => ({
      status: 'authorized',
      next_payment_date: '2026-10-01T10:00:00.000Z',
    })
    await seed('u-order', { status: 'authorized', currentPeriodEnd: debit })
    await handlePre({ preapprovalId: 'pre_u-order', config }, { fetchPreapproval: preapproval })
    const out = await onPayment(
      { authorizedPaymentId: 'ap-o', config },
      { fetchAuthorizedPayment: payment },
    )
    assert.equal(iso(out.currentPeriodEnd), '2026-10-01T10:00:00.000Z')
  })

  it('un pago viejo que llega tarde no acorta un período ya extendido', async () => {
    const ahead = iso(Date.now() + 40 * DAY)
    await seed('u-late', { status: 'authorized', currentPeriodEnd: ahead })
    const out = await onPayment(
      { authorizedPaymentId: 'ap-l', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({ preapproval_id: 'pre_u-late', debit_date: iso(Date.now() - 20 * DAY) }),
      },
    )
    assert.equal(iso(out.currentPeriodEnd), ahead)
  })

  it('processed con pago rechazado (reintentos agotados) NO extiende y marca el fallo', async () => {
    await seed('u-exhausted', { status: 'authorized', currentPeriodEnd: iso(Date.now() - DAY) })
    const out = await onPayment(
      { authorizedPaymentId: 'ap-x', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({
            preapproval_id: 'pre_u-exhausted',
            status: 'processed',
            payment: { status: 'rejected' },
          }),
      },
    )
    assert.equal(out.approved, false)
    assert.equal(out.failed, true)
    const [row] = await db.findSubscriptionsByUser('u-exhausted')
    assert.ok(new Date(row.currentPeriodEnd) < new Date())
    assert.ok(row.paymentFailedAt)
  })

  it('recycling marca el fallo; el cobro aprobado del reintento lo limpia', async () => {
    await seed('u-retry', { status: 'authorized', currentPeriodEnd: iso(Date.now() - DAY) })
    await onPayment(
      { authorizedPaymentId: 'ap-r1', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({ preapproval_id: 'pre_u-retry', status: 'recycling', payment: null }),
      },
    )
    let [row] = await db.findSubscriptionsByUser('u-retry')
    assert.ok(row.paymentFailedAt)

    await onPayment(
      { authorizedPaymentId: 'ap-r1', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({ preapproval_id: 'pre_u-retry', debit_date: iso(Date.now()) }),
      },
    )
    ;[row] = await db.findSubscriptionsByUser('u-retry')
    assert.equal(row.paymentFailedAt, undefined)
    assert.ok(new Date(row.currentPeriodEnd) > new Date())
  })

  it('pago no aprobado no toca el período', async () => {
    await seed('u-pay3', { mpPreapprovalId: 'pre_u-pay3', currentPeriodEnd: null })
    const out = await onPayment(
      { authorizedPaymentId: 'ap-3', config },
      {
        fetchAuthorizedPayment: async () =>
          ap({ preapproval_id: 'pre_u-pay3', status: 'cancelled', payment: null }),
      },
    )
    assert.equal(out.currentPeriodEnd, null)
  })

  it('cobro sobre una suscripción reemplazada no la revive si ya hay otra activa', async () => {
    await seed('u-replaced', {
      mpPreapprovalId: 'pre_old_replaced',
      status: 'cancelled',
      canceledAt: iso(Date.now() - 5 * DAY),
      createdAt: '2020-01-01T00:00:00.000Z',
    })
    await seed('u-replaced', {
      mpPreapprovalId: 'pre_new_replaced',
      status: 'authorized',
      currentPeriodEnd: iso(Date.now() + 20 * DAY),
    })
    await onPayment(
      { authorizedPaymentId: 'ap-rep', config },
      { fetchAuthorizedPayment: async () => ap({ preapproval_id: 'pre_old_replaced' }) },
    )
    const old = await db.findSubscriptionByPreapproval('pre_old_replaced')
    assert.equal(old.status, 'cancelled')
    const active = await db.findActiveSubscriptionByUser('u-replaced')
    assert.equal(active.mpPreapprovalId, 'pre_new_replaced')
  })

  // ——— subscription_preapproval: bajas ———

  it('MP "cancelled" con días pagos (baja nuestra o desde la app de MP) → conserva el acceso', async () => {
    const paidUntil = iso(Date.now() + 20 * DAY)
    await seed('u-mpcancel', { status: 'authorized', currentPeriodEnd: paidUntil })
    await handlePre(
      { preapprovalId: 'pre_u-mpcancel', config },
      { fetchPreapproval: async () => ({ status: 'cancelled' }) },
    )
    const ent = await resolve('u-mpcancel', entConfig)
    assert.equal(ent.plan, 'hosted_pro')
    assert.ok(ent.canceledAt, 'marca la baja para que la UI la muestre')
    assert.equal(iso(ent.currentPeriodEnd), paidUntil)
  })

  it('sync manual después de cancelar tampoco corta el acceso', async () => {
    await seed('u-synccancel', {
      status: 'authorized',
      canceledAt: iso(Date.now()),
      currentPeriodEnd: iso(Date.now() + 20 * DAY),
    })
    await sync(
      { userId: 'u-synccancel', config },
      { fetchPreapproval: async () => ({ status: 'cancelled' }) },
    )
    assert.equal((await resolve('u-synccancel', entConfig)).plan, 'hosted_pro')
  })

  it('MP "cancelled" sin días pagos (p. ej. 3 cuotas rechazadas) → cancelled', async () => {
    await seed('u-autocancel', {
      status: 'authorized',
      currentPeriodEnd: iso(Date.now() - 40 * DAY),
    })
    await handlePre(
      { preapprovalId: 'pre_u-autocancel', config },
      { fetchPreapproval: async () => ({ status: 'cancelled' }) },
    )
    const [row] = await db.findSubscriptionsByUser('u-autocancel')
    assert.equal(row.status, 'cancelled')
  })

  it('MP "cancelled" sobre un alta nunca activada no quema la prueba gratis', async () => {
    await seed('u-neveractive')
    await handlePre(
      { preapprovalId: 'pre_u-neveractive', config },
      { fetchPreapproval: async () => ({ status: 'cancelled' }) },
    )
    const rows = await db.findSubscriptionsByUser('u-neveractive')
    assert.equal(rows[0].status, 'cancelled')
    assert.equal(trialEligible(rows), true)
  })

  it('una fila ya activa no cambia su período por el next_payment_date de MP', async () => {
    const end = iso(Date.now() + 3 * DAY)
    await seed('u-keepend', { status: 'authorized', currentPeriodEnd: end })
    await handlePre(
      { preapprovalId: 'pre_u-keepend', config },
      {
        fetchPreapproval: async () => ({
          status: 'authorized',
          next_payment_date: iso(Date.now() + 60 * DAY),
        }),
      },
    )
    const [row] = await db.findSubscriptionsByUser('u-keepend')
    assert.equal(iso(row.currentPeriodEnd), end)
  })

  // ——— baja confirmada contra MP ———

  it('cancelar: si el PUT a MP falla y MP no la canceló → 502', async () => {
    const sub = await seed('u-cfail', { status: 'authorized' })
    await assert.rejects(
      cancelConfirmed(sub, config, {
        cancelPreapproval: async () => {
          throw Object.assign(new Error('boom'), { status: 503 })
        },
        fetchPreapproval: async () => ({ status: 'authorized' }),
      }),
      (err) => err.status === 502 && err.expose === true,
    )
  })

  it('cancelar: si el PUT falla pero MP ya la tiene cancelada → ok', async () => {
    const sub = await seed('u-calready', { status: 'authorized' })
    await cancelConfirmed(sub, config, {
      cancelPreapproval: async () => {
        throw Object.assign(new Error('already'), { status: 400 })
      },
      fetchPreapproval: async () => ({ status: 'cancelled' }),
    })
  })

  // ——— altas pendientes ———

  it('alta pendiente en MP → se cancela en MP y queda abandonada', async () => {
    const sub = await seed('u-retire')
    const canceled = []
    const out = await retirePending(sub, config, {
      fetchPreapproval: async () => ({ status: 'pending' }),
      cancelPreapproval: async (_tok, id) => canceled.push(id),
    })
    assert.equal(out, 'retired')
    assert.deepEqual(canceled, ['pre_u-retire'])
    const [row] = await db.findSubscriptionsByUser('u-retire')
    assert.equal(row.status, 'pending')
    assert.ok(row.abandonedAt)
  })

  it('alta "pendiente" que en MP ya está autorizada → se activa, no se cancela', async () => {
    const sub = await seed('u-completed')
    let canceled = false
    const out = await retirePending(sub, config, {
      fetchPreapproval: async () => ({
        status: 'authorized',
        next_payment_date: iso(Date.now() + 7 * DAY),
      }),
      cancelPreapproval: async () => {
        canceled = true
      },
    })
    assert.equal(out, 'activated')
    assert.equal(canceled, false)
    assert.equal((await resolve('u-completed', entConfig)).plan, 'hosted_pro')
  })

  it('alta pendiente que MP no conoce (404) → se abandona sin más', async () => {
    const sub = await seed('u-gone')
    const out = await retirePending(sub, config, {
      fetchPreapproval: async () => {
        throw Object.assign(new Error('not found'), { status: 404 })
      },
    })
    assert.equal(out, 'retired')
  })

  it('si MP no responde no se abre otra alta (podría estar completándose)', async () => {
    const sub = await seed('u-mpdown')
    await assert.rejects(
      retirePending(sub, config, {
        fetchPreapproval: async () => {
          throw Object.assign(new Error('down'), { status: 503 })
        },
      }),
      (err) => err.status === 503,
    )
  })

  // ——— helpers puros ———

  it('addBillingCycle: mes calendario (con fin de mes) y año', () => {
    assert.equal(
      iso(addBillingCycle('2026-01-31T12:00:00.000Z', 'monthly')),
      '2026-02-28T12:00:00.000Z',
    )
    assert.equal(
      iso(addBillingCycle('2026-03-31T12:00:00.000Z', 'monthly')),
      '2026-04-30T12:00:00.000Z',
    )
    assert.equal(
      iso(addBillingCycle('2026-12-15T00:00:00.000Z', 'monthly')),
      '2027-01-15T00:00:00.000Z',
    )
    assert.equal(
      iso(addBillingCycle('2026-09-25T00:00:00.000Z', 'yearly')),
      '2027-09-25T00:00:00.000Z',
    )
  })

  it('trialEligible: la prueba se pierde al activarse una suscripción, no por altas abandonadas', () => {
    assert.equal(trialEligible([]), true)
    assert.equal(trialEligible([{ status: 'pending' }]), true)
    assert.equal(trialEligible([{ status: 'cancelled', abandonedAt: 'x' }]), true)
    assert.equal(trialEligible([{ status: 'cancelled', activatedAt: 'x' }]), false)
    assert.equal(trialEligible([{ status: 'authorized' }]), false)
    assert.equal(trialEligible([{ status: 'cancelled' }]), false) // fila vieja
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

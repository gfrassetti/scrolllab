import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

// Base de archivos temporal ANTES de cargar db.js (no tocar storage/db de desarrollo).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-price-change-'))
process.env.NODE_ENV = 'development'
process.env.STORE = 'file'
process.env.FILE_DB_DIR = dir

const { db, connectDb } = await import('../db.js')
const { runPriceChanges, effectiveDateFor, currentChanges } = await import('../services/subscriptions/priceChange.js')

const DAY = 86400000
const up = { id: 'pro-m-ars-1', plan: 'hosted_pro', cycle: 'monthly', currency: 'ARS', from: 99900, to: 129900, announcedOn: '2026-10-01' }
const config = (live = true) => ({
  isProd: false,
  clientUrl: 'http://localhost:5173',
  mpSubs: { accessToken: 'TEST' },
  email: { enabled: false },
  priceChanges: { live },
})

/** MP simulado: monto y próximo cobro por preapproval; registra los cambios de monto. */
function fakeMp(state) {
  const updates = []
  return {
    updates,
    fetchPreapproval: async (_t, id) => ({
      auto_recurring: { transaction_amount: state[id].amount },
      next_payment_date: state[id].next,
    }),
    updateAmount: async (_t, id, { amount }) => {
      updates.push({ id, amount })
      state[id].amount = amount
    },
  }
}

let user
let n = 0
async function newSub(extra = {}) {
  n += 1
  return db.createSubscription({
    userId: db.uid(user),
    plan: 'hosted_pro',
    cycle: 'monthly',
    status: 'authorized',
    provider: 'mercadopago',
    currency_id: 'ARS',
    mpPreapprovalId: `pa-${n}`,
    ...extra,
  })
}

describe('cambio de precio de LAB — servicio', () => {
  before(async () => {
    await connectDb({ store: 'file' })
    user = await db.createUser({ email: 'ana@example.com', name: 'Ana', googleId: 'g-ana' })
  })
  after(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('una lista vacía no hace nada', async () => {
    const s = await runPriceChanges({ config: config(), changes: [] })
    assert.deepEqual([s.enrolled, s.announced, s.applied], [0, 0, 0])
  })

  it('el último cambio de cada cadena es el que rige', () => {
    const next = { ...up, id: 'pro-m-ars-2', from: 129900, to: 149900, announcedOn: '2026-12-01' }
    assert.deepEqual(currentChanges([up, next]).map((c) => c.id), ['pro-m-ars-2'])
  })

  it('suba: la fecha es el primer cobro a 15 días o más; baja: el próximo cobro', () => {
    const now = new Date('2026-11-10T12:00:00Z')
    assert.equal(effectiveDateFor(up, new Date('2026-11-20T12:00:00Z'), 'monthly', now).toISOString(), '2026-12-20T12:00:00.000Z')
    assert.equal(effectiveDateFor(up, new Date('2026-12-01T12:00:00Z'), 'monthly', now).toISOString(), '2026-12-01T12:00:00.000Z')
    const down = { ...up, from: 129900, to: 89900 }
    assert.equal(effectiveDateFor(down, new Date('2026-11-12T12:00:00Z'), 'monthly', now).toISOString(), '2026-11-12T12:00:00.000Z')
  })

  it('simulación: cuenta a quién avisaría, sin escribir, mandar ni tocar el proveedor', async () => {
    const sub = await newSub()
    const mp = fakeMp({ [sub.mpPreapprovalId]: { amount: 99900, next: '2026-12-20T12:00:00Z' } })
    const sent = []
    const s = await runPriceChanges({
      config: config(false),
      changes: [up],
      deps: { ...mp, send: async (m) => sent.push(m) },
    })
    assert.equal(s.mode, 'simulación')
    assert.ok(s.enrolled >= 1)
    assert.equal(await db.findPriceChangeNotice(String(db.uid(sub)), up.id), null)
    assert.deepEqual([sent.length, mp.updates.length], [0, 0])
  })

  it('en vivo: inscribe, avisa una vez con la fecha y aplica una sola vez después del último cobro viejo', async () => {
    const sub = await newSub({ mpPreapprovalId: 'pa-live' })
    const state = { 'pa-live': { amount: 99900, next: '2026-12-20T12:00:00Z' } }
    const mp = fakeMp(state)
    const sent = []
    const send = async (m) => {
      sent.push(m)
      return { sent: true, id: `mail-${sent.length}` }
    }
    const now = new Date()
    const changes = [up]
    await runPriceChanges({ config: config(), changes, now, deps: { ...mp, send } })
    const mine = sent.filter((m) => m.subscription.mpPreapprovalId === 'pa-live')
    assert.equal(mine.length, 1)
    assert.equal(mine[0].notice.kind, 'increase')
    assert.equal(mine[0].notice.from, 99900)
    assert.equal(mine[0].notice.to, 129900)
    const notice = await db.findPriceChangeNotice(String(db.uid(sub)), up.id)
    assert.ok(notice.emailSentAt)

    // Otra corrida: no repite el mail.
    await runPriceChanges({ config: config(), changes, now, deps: { ...mp, send } })
    assert.equal(sent.filter((m) => m.subscription.mpPreapprovalId === 'pa-live').length, 1)

    // Cerca del cobro con el precio nuevo: se aplica una vez.
    const nearCharge = new Date(Date.parse(notice.effectiveAt) - DAY)
    await runPriceChanges({ config: config(), changes, now: nearCharge, deps: { ...mp, send } })
    await runPriceChanges({ config: config(), changes, now: nearCharge, deps: { ...mp, send } })
    assert.deepEqual(mp.updates.filter((u) => u.id === 'pa-live'), [{ id: 'pa-live', amount: 129900 }])
    assert.ok((await db.findPriceChangeNotice(String(db.uid(sub)), up.id)).appliedAt)
  })

  it('no inscribe a quien ya paga el precio nuevo, a Paddle (en espera), a canceladas ni a las de prueba', async () => {
    const paying = await newSub({ mpPreapprovalId: 'pa-new' })
    const paddle = await newSub({ provider: 'paddle', mpPreapprovalId: undefined, currency_id: 'ARS' })
    const canceled = await newSub({ mpPreapprovalId: 'pa-cx', canceledAt: new Date() })
    const qa = await newSub({ mpPreapprovalId: 'pa-qa', qa: true })
    const mp = fakeMp({
      'pa-new': { amount: 129900, next: '2026-12-20T12:00:00Z' },
      'pa-cx': { amount: 99900, next: '2026-12-20T12:00:00Z' },
      'pa-qa': { amount: 99900, next: '2026-12-20T12:00:00Z' },
    })
    const s = await runPriceChanges({ config: config(), changes: [up], deps: { ...mp, send: async () => ({ sent: true, id: 'x' }) } })
    for (const sub of [paying, paddle, canceled, qa]) {
      assert.equal(await db.findPriceChangeNotice(String(db.uid(sub)), up.id), null)
    }
    assert.ok(s.skipped['paddle-pendiente'] >= 1)
  })

  it('anual: aviso al anunciar y un solo recordatorio cerca del cobro con el precio nuevo', async () => {
    const yearly = { ...up, id: 'pro-y-ars-1', cycle: 'yearly', from: 999000, to: 1299000 }
    const sub = await newSub({ mpPreapprovalId: 'pa-year', cycle: 'yearly' })
    const nextCharge = new Date(Date.now() + 300 * DAY).toISOString()
    const mp = fakeMp({ 'pa-year': { amount: 999000, next: nextCharge } })
    const sent = []
    const send = async (m) => {
      sent.push(m)
      return { sent: true, id: `y-${sent.length}` }
    }
    const changes = [yearly]
    await runPriceChanges({ config: config(), changes, deps: { ...mp, send } })
    const mine = () => sent.filter((m) => m.subscription.mpPreapprovalId === 'pa-year').map((m) => m.notice.kind)
    assert.deepEqual(mine(), ['increase'])
    // Lejos del cobro: nada más.
    await runPriceChanges({ config: config(), changes, now: new Date(Date.now() + 100 * DAY), deps: { ...mp, send } })
    assert.deepEqual(mine(), ['increase'])
    // A 30 días del cobro: el recordatorio, una sola vez.
    const near = new Date(Date.parse(nextCharge) - 30 * DAY)
    await runPriceChanges({ config: config(), changes, now: near, deps: { ...mp, send } })
    await runPriceChanges({ config: config(), changes, now: near, deps: { ...mp, send } })
    assert.deepEqual(mine(), ['increase', 'reminder'])
    assert.ok((await db.findPriceChangeNotice(String(db.uid(sub)), yearly.id)).reminderSentAt)
  })

  it('si el mail no sale (falla o está apagado), no hay fecha ni precio nuevo; la próxima corrida reintenta', async () => {
    const sub = await newSub({ mpPreapprovalId: 'pa-fail' })
    const mp = fakeMp({ 'pa-fail': { amount: 99900, next: '2026-12-20T12:00:00Z' } })
    const changes = [up]
    await runPriceChanges({ config: config(), changes, deps: { ...mp, send: async () => { throw new Error('Resend caído') } } })
    let notice = await db.findPriceChangeNotice(String(db.uid(sub)), up.id)
    assert.equal(notice.emailSentAt ?? null, null)
    assert.match(notice.emailError, /Resend caído/)
    await runPriceChanges({ config: config(), changes, deps: { ...mp, send: async () => ({ skipped: 'disabled' }) } })
    notice = await db.findPriceChangeNotice(String(db.uid(sub)), up.id)
    assert.equal(notice.emailSentAt ?? null, null)
    await runPriceChanges({ config: config(), changes, now: new Date(Date.now() + 60 * DAY), deps: { ...mp, send: async () => ({ skipped: 'disabled' }) } })
    assert.equal(mp.updates.filter((u) => u.id === 'pa-fail').length, 0, 'sin mail nunca se aplica')
    await runPriceChanges({ config: config(), changes, deps: { ...mp, send: async () => ({ sent: true, id: 'ok' }) } })
    assert.ok((await db.findPriceChangeNotice(String(db.uid(sub)), up.id)).emailSentAt)
  })
})

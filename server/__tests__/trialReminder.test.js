import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const DAY = 86_400_000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Aviso de fin de prueba de LAB (server/services/trialReminders.js): mail unos
 * días antes del primer cobro. File store, Resend inyectado (no sale ningún
 * mail) y un `now` fijo para mover el reloj sin esperar.
 */
describe('aviso de fin de prueba (LAB)', () => {
  let db
  let sendDue
  let startReminders
  let buildReminder
  let sendReminder
  let storageDir

  // 1 de octubre de 2026, mediodía en Buenos Aires.
  const NOW = new Date('2026-10-01T15:00:00.000Z')

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.AUTH_DEV_ENABLED = 'true'
    process.env.MP_MOCK_ENABLED = 'true'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.CLIENT_URL = 'http://localhost:5173'
    process.env.API_PUBLIC_URL = 'http://localhost:8787'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-trial-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')
    ;({ db } = await import('../db.js'))
    ;({ sendDueTrialReminders: sendDue, startTrialReminders: startReminders } =
      await import('../services/trialReminders.js'))
    ;({
      buildSubscriptionTrialReminder: buildReminder,
      sendSubscriptionTrialReminderOnce: sendReminder,
    } = await import('../services/email.js'))
  })

  after(() => {
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  const config = (patch = {}) => ({
    clientUrl: 'https://www.scrolllab.com.ar',
    hostedTrialReminderDays: 2,
    email: { enabled: true, apiKey: 'x', from: 'x', replyTo: '', logoUrl: '' },
    ...patch,
  })

  /** Resend de mentira: guarda lo que se "manda". `reply` decide la respuesta. */
  function mailbox(reply = (n) => ({ data: { id: `em-${n}` } })) {
    const sent = []
    return {
      sent,
      to: (email) => sent.filter((m) => m.msg.to[0] === email),
      client: {
        emails: {
          send: async (msg, opts) => {
            sent.push({ msg, opts })
            return reply(sent.length)
          },
        },
      },
    }
  }

  let seq = 0
  /**
   * Suscripción en prueba que termina `endsInDays` después de NOW. Los tests
   * comparten la base: cada uno mira solo el mail de su propio usuario.
   */
  async function seedTrial({ endsInDays = 1.75, trialDays = 7, patch = {} } = {}) {
    seq += 1
    const user = await db.createUser({
      email: `trial${seq}@test.com`,
      name: `Trial ${seq}`,
    })
    const sub = await db.createSubscription({
      userId: user.id,
      plan: 'hosted_pro',
      cycle: 'monthly',
      status: 'authorized',
    })
    const end = new Date(NOW.getTime() + endsInDays * DAY).toISOString()
    Object.assign(sub, {
      trialEndsAt: end,
      currentPeriodEnd: end,
      createdAt: new Date(new Date(end).getTime() - trialDays * DAY).toISOString(),
      ...patch,
    })
    await sub.save()
    return { user, sub }
  }

  it('avisa una sola vez, dentro del plazo, con la fecha y el importe', async () => {
    const { user } = await seedTrial({ endsInDays: 1.75 })
    const box = mailbox()

    const first = await sendDue({ config: config(), client: box.client, now: NOW })
    assert.ok(first.sent >= 1)
    const mine = box.to(user.email)
    assert.equal(mine.length, 1)
    assert.match(mine[0].msg.subject, /termina el 3 de octubre de 2026/)
    assert.match(mine[0].msg.text, /Al terminar se cobra el primer pago de/)
    assert.equal(mine[0].msg.tags[0].value, 'subscription_trial_reminder')
    assert.match(mine[0].opts.idempotencyKey, /^scrolllab-sub-trial-reminder-/)

    // Segunda pasada: ya salió, no se repite.
    await sendDue({ config: config(), client: box.client, now: NOW })
    assert.equal(box.to(user.email).length, 1)
  })

  it('espera a que la prueba entre en el plazo de 2 días', async () => {
    const { user } = await seedTrial({ endsInDays: 5 })
    const box = mailbox()

    await sendDue({ config: config(), client: box.client, now: NOW })
    assert.equal(box.to(user.email).length, 0, 'faltan 5 días: es pronto')

    const later = new Date(NOW.getTime() + 3.5 * DAY) // quedan 1,5 días
    await sendDue({ config: config(), client: box.client, now: later })
    assert.equal(box.to(user.email).length, 1)
  })

  it('no avisa si canceló, si no está activa, si ya pagó o si la prueba ya terminó', async () => {
    const canceled = await seedTrial({ patch: { canceledAt: NOW.toISOString() } })
    const paused = await seedTrial({ patch: { status: 'paused' } })
    const paid = await seedTrial({ patch: { lastPaidAt: NOW.toISOString() } })
    const ended = await seedTrial({ endsInDays: -0.5 })
    const box = mailbox()

    await sendDue({ config: config(), client: box.client, now: NOW })
    for (const { user } of [canceled, paused, paid, ended]) {
      assert.equal(box.to(user.email).length, 0, user.email)
    }
  })

  it('con una prueba tan corta como el plazo no manda nada: la bienvenida ya trae la fecha', async () => {
    const { user } = await seedTrial({ endsInDays: 1.75, trialDays: 2 })
    const box = mailbox()

    await sendDue({ config: config(), client: box.client, now: NOW })
    assert.equal(box.to(user.email).length, 0)
  })

  it('con el mail apagado o el aviso en 0 días no hace nada, y no gasta el aviso', async () => {
    const { user } = await seedTrial()
    const box = mailbox()

    const off = await sendDue({
      config: config({ email: { enabled: false } }),
      client: box.client,
      now: NOW,
    })
    assert.equal(off.skipped, 'disabled')
    const zero = await sendDue({
      config: config({ hostedTrialReminderDays: 0 }),
      client: box.client,
      now: NOW,
    })
    assert.equal(zero.skipped, 'disabled')
    assert.equal(box.sent.length, 0)

    // Prendido de nuevo, sale.
    await sendDue({ config: config(), client: box.client, now: NOW })
    assert.equal(box.to(user.email).length, 1)
  })

  it('si Resend falla, lo reintenta en la próxima pasada', async () => {
    const { user } = await seedTrial()
    const quiet = mock.method(console, 'error', () => {})
    const broken = mailbox(() => ({ error: { message: 'boom' } }))

    const bad = await sendDue({ config: config(), client: broken.client, now: NOW })
    quiet.mock.restore()
    assert.ok(bad.failed >= 1)

    const working = mailbox()
    await sendDue({ config: config(), client: working.client, now: NOW })
    assert.equal(working.to(user.email).length, 1)
  })

  it('si cancela justo antes del envío, o no hay plazo, el claim lo frena', async () => {
    const { user, sub } = await seedTrial()
    const box = mailbox()

    const noWindow = await sendReminder({
      subscription: sub,
      config: config(),
      client: box.client,
      now: NOW,
    })
    assert.ok(noWindow.skipped)

    sub.canceledAt = NOW.toISOString()
    await sub.save()
    const canceled = await sendReminder({
      subscription: sub,
      config: config(),
      client: box.client,
      withinMs: 2 * DAY,
      now: NOW,
    })
    assert.ok(canceled.skipped)
    assert.equal(box.to(user.email).length, 0)
  })

  it('el mail dice cuándo se cobra y cuánto, y escapa el nombre', () => {
    const msg = buildReminder({
      subscription: {
        plan: 'hosted_pro',
        cycle: 'yearly',
        trialEndsAt: '2026-10-03T09:00:00.000Z',
      },
      user: { name: '<b>Ana</b>', email: 'ana@test.com' },
      accountUrl: 'https://www.scrolllab.com.ar/lab',
      logoUrl: 'https://www.scrolllab.com.ar/logo.svg',
    })
    assert.match(msg.subject, /termina el 3 de octubre de 2026/)
    assert.match(msg.text, /Primer cobro: 3 de octubre de 2026/)
    assert.match(msg.text, /Importe: .* \/ año/)
    assert.match(msg.text, /Cancelar suscripción/)
    assert.ok(msg.html.includes('https://www.scrolllab.com.ar/lab'))
    assert.ok(!msg.html.includes('<b>Ana</b>'))
    assert.ok(msg.html.includes('&lt;b&gt;Ana&lt;/b&gt;'))
  })

  it('config: 2 días por defecto; HOSTED_TRIAL_REMINDER_DAYS lo cambia y 0 lo apaga', async () => {
    const { loadConfig } = await import('../config.js')
    const prev = process.env.HOSTED_TRIAL_REMINDER_DAYS
    try {
      delete process.env.HOSTED_TRIAL_REMINDER_DAYS
      assert.equal(loadConfig().hostedTrialReminderDays, 2)
      process.env.HOSTED_TRIAL_REMINDER_DAYS = '3'
      assert.equal(loadConfig().hostedTrialReminderDays, 3)
      process.env.HOSTED_TRIAL_REMINDER_DAYS = '0'
      assert.equal(loadConfig().hostedTrialReminderDays, 0)
      process.env.HOSTED_TRIAL_REMINDER_DAYS = 'abc'
      assert.equal(loadConfig().hostedTrialReminderDays, 2)
    } finally {
      if (prev === undefined) delete process.env.HOSTED_TRIAL_REMINDER_DAYS
      else process.env.HOSTED_TRIAL_REMINDER_DAYS = prev
    }
  })

  it('startTrialReminders repite la pasada y se detiene con stop()', async () => {
    let runs = 0
    const stop = startReminders({
      config: config(),
      intervalMs: 15,
      initialDelayMs: 0,
      run: async () => {
        runs += 1
      },
    })
    await sleep(120)
    stop()
    const seen = runs
    assert.ok(seen >= 2, `hubo ${seen} pasadas`)
    await sleep(60)
    assert.equal(runs, seen, 'siguió corriendo después de stop()')
  })

  it('startTrialReminders no encima pasadas: si una sigue en curso, salta la siguiente', async () => {
    let active = 0
    let maxActive = 0
    const stop = startReminders({
      config: config(),
      intervalMs: 10,
      initialDelayMs: 0,
      run: async () => {
        active += 1
        maxActive = Math.max(maxActive, active)
        await sleep(40)
        active -= 1
      },
    })
    await sleep(150)
    stop()
    await sleep(60)
    assert.equal(maxActive, 1)
  })

  it('startTrialReminders no arranca con el mail apagado o el aviso en 0 días', async () => {
    let runs = 0
    const run = async () => {
      runs += 1
    }
    const stops = [
      startReminders({ config: config({ email: { enabled: false } }), intervalMs: 5, initialDelayMs: 0, run }),
      startReminders({ config: config({ hostedTrialReminderDays: 0 }), intervalMs: 5, initialDelayMs: 0, run }),
    ]
    await sleep(50)
    stops.forEach((stop) => stop())
    assert.equal(runs, 0)
  })
})

import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import crypto from 'node:crypto'
import request from 'supertest'

/**
 * MercadoPago y Resend falsos, en memoria, detrás del `fetch` global (lo usan
 * el SDK de MP, `fetchAuthorizedPayment` y el SDK de Resend). Emula lo que la
 * app le pide a MP: preapprovals (alta, consulta, baja, cambio de monto),
 * authorized_payments y el cobro de cuotas en `next_payment_date` (`bill`,
 * `retry`). Las fechas salen del reloj actual, así que `mock.timers` las mueve.
 */
export function createFakeMercadoPago(realFetch = globalThis.fetch) {
  const mp = {
    preapprovals: new Map(),
    authorizedPayments: new Map(),
    calls: [],
    // `mp.failNext['PUT /preapproval'] = 400` → el próximo PUT falla.
    failNext: {},
    seq: 0,
    // Mails que la app le mandó a Resend (no sale nada).
    outbox: [],
  }

  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  mp.fetch = async (url, init = {}) => {
    const u = new URL(String(url))
    if (u.hostname === 'api.resend.com') {
      mp.outbox.push({
        path: u.pathname,
        body: init.body ? JSON.parse(init.body) : null,
        idempotencyKey: new Headers(init.headers).get('idempotency-key'),
      })
      return json(200, { id: `em_${mp.outbox.length}` })
    }
    if (u.hostname !== 'api.mercadopago.com') return realFetch(url, init)

    const method = String(init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : null
    const [resource, id] = u.pathname.split('/').filter(Boolean)
    const route = `${method} /${resource}`
    mp.calls.push({ method, resource, id, body })

    const fail = mp.failNext[route]
    if (fail) {
      delete mp.failNext[route]
      return json(fail, { message: 'fake MP error', status: fail })
    }
    if (resource === 'preapproval' && method === 'POST') {
      // Como MP real (verificado en sandbox): `years` no es válido.
      const ft = body.auto_recurring?.frequency_type
      if (ft !== 'days' && ft !== 'months') {
        return json(400, {
          message: 'Invalid value for frequency type, valid ones are [days, months]',
          status: 400,
        })
      }
      const pre = {
        id: `pre${++mp.seq}`,
        status: body.status || 'pending',
        init_point: `https://mp.test/checkout/pre${mp.seq}`,
        external_reference: body.external_reference,
        date_created: new Date().toISOString(),
        auto_recurring: { ...body.auto_recurring },
        next_payment_date: body.auto_recurring?.start_date || new Date().toISOString(),
      }
      mp.preapprovals.set(pre.id, pre)
      return json(201, pre)
    }
    if (resource === 'preapproval' && id) {
      const pre = mp.preapprovals.get(id)
      if (!pre) return json(404, { message: 'not found', status: 404 })
      if (method === 'PUT') {
        // Como MP: una baja no se puede modificar.
        if (pre.status === 'cancelled') {
          return json(400, { message: 'You can not modify a cancelled preapproval.', status: 400 })
        }
        const { auto_recurring: ar, ...rest } = body
        Object.assign(pre, rest)
        if (ar) pre.auto_recurring = { ...pre.auto_recurring, ...ar }
      }
      return json(200, pre)
    }
    if (resource === 'authorized_payments' && id) {
      const ap = mp.authorizedPayments.get(id)
      return ap ? json(200, ap) : json(404, { message: 'not found', status: 404 })
    }
    return json(404, { message: `ruta desconocida ${route}`, status: 404 })
  }

  /** El comprador autoriza el alta en el checkout de MP (init_point). */
  mp.authorize = (preapprovalId) => {
    mp.preapprovals.get(preapprovalId).status = 'authorized'
  }

  /**
   * MP cobra la cuota que vence (`next_payment_date`). Aprobada: avanza el
   * próximo cobro un ciclo. Rechazada: la cuota queda en `recycling` para que
   * MP la reintente (`retry`).
   */
  mp.bill = (preapprovalId, { approved = true } = {}) => {
    const pre = mp.preapprovals.get(preapprovalId)
    if (pre?.status !== 'authorized') {
      throw new Error(`MP no cobra un preapproval en estado ${pre?.status}`)
    }
    const ap = {
      id: `ap${++mp.seq}`,
      preapproval_id: pre.id,
      debit_date: pre.next_payment_date,
      transaction_amount: pre.auto_recurring.transaction_amount,
      currency_id: pre.auto_recurring.currency_id,
    }
    mp.authorizedPayments.set(ap.id, ap)
    settle(pre, ap, approved)
    return ap
  }

  /** MP reintenta una cuota rechazada: misma cuota, misma `debit_date`. */
  mp.retry = (apId, { approved = true } = {}) => {
    const ap = mp.authorizedPayments.get(apId)
    const pre = mp.preapprovals.get(ap.preapproval_id)
    if (pre.status !== 'authorized') {
      throw new Error(`MP no reintenta sobre un preapproval en estado ${pre.status}`)
    }
    settle(pre, ap, approved)
    return ap
  }

  function settle(pre, ap, approved) {
    ap.status = approved ? 'processed' : 'recycling'
    ap.payment = {
      id: 900000 + mp.seq,
      status: approved ? 'approved' : 'rejected',
      transaction_amount: ap.transaction_amount,
    }
    if (approved) pre.next_payment_date = nextCycle(ap.debit_date, pre.auto_recurring)
  }

  /** Cobros aprobados de un preapproval (lo que el cliente pagó de verdad). */
  mp.charges = (preapprovalId) =>
    [...mp.authorizedPayments.values()].filter(
      (a) => a.preapproval_id === preapprovalId && a.payment?.status === 'approved',
    )

  mp.lastPreapproval = () => [...mp.preapprovals.values()].at(-1)
  mp.lastCall = (method, resource) =>
    mp.calls.findLast((c) => c.method === method && c.resource === resource)
  mp.mailsTo = (email) => mp.outbox.filter((m) => m.body?.to?.includes(email))

  return mp
}

// Independiente de la app a propósito (no reusa `addBillingCycle`): los tests
// evitan los días 29-31, donde los calendarios de mes difieren.
function nextCycle(date, autoRecurring) {
  const d = new Date(date)
  const n = autoRecurring.frequency || 1
  if (autoRecurring.frequency_type === 'days') d.setUTCDate(d.getUTCDate() + n)
  else d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString()
}

/**
 * App real con el mock de MP apagado, store de archivo en un tmp y mails
 * habilitados (van al `outbox` del doble). Devuelve helpers de sesión y de
 * webhooks firmados como los manda MP.
 */
export async function startAppAgainstFakeMp(mp, { secret = 'whsec_subs_test_secret_value' } = {}) {
  Object.assign(process.env, {
    NODE_ENV: 'development',
    STORE: 'file',
    AUTH_DEV_ENABLED: 'true',
    MP_MOCK_ENABLED: 'false',
    MP_ACCESS_TOKEN: 'TEST-fake-access-token',
    MP_WEBHOOK_SECRET: secret,
    SESSION_SECRET: 'test-session-secret-min-24-chars',
    DOWNLOAD_SECRET: 'test-download-secret-min-24-chars',
    CLIENT_URL: 'http://localhost:5173',
    API_PUBLIC_URL: 'http://localhost:8787',
    FX_OFFLINE: 'true',
    FX_FALLBACK_RATE: '1560',
    HOSTED_FREE_QUOTA: '1',
    RATE_LIMIT_DISABLED: 'true',
    EMAIL_ENABLED: 'true',
    RESEND_API_KEY: 're_test_fake_key',
    EMAIL_FROM: 'SCROLLLAB <lab@scrolllab.test>',
  })
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-subs-mp-'))
  process.env.STORAGE_DIR = storageDir
  process.env.FILE_DB_DIR = path.join(storageDir, 'db')

  const { loadConfig } = await import('../../config.js')
  const config = loadConfig()
  config.storageDir = storageDir
  config.store = 'file'
  config.authDev = true
  config.mpMock = false

  const { createApp } = await import('../../app.js')
  const app = await createApp(config)
  const { fileDb } = await import('../../fileStore.js')
  const realFetch = globalThis.fetch
  globalThis.fetch = mp.fetch

  async function loginAs(email) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email })
    return agent
  }

  function signed(dataId) {
    const ts = String(Date.now())
    const requestId = crypto.randomUUID()
    const v1 = crypto
      .createHmac('sha256', secret)
      .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
      .digest('hex')
    return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId }
  }

  const webhook = (type, dataId) =>
    request(app)
      .post(`/api/webhooks/mercadopago?type=${type}&data.id=${dataId}`)
      .set(signed(dataId))
      .send({ type, data: { id: dataId } })

  function cleanup() {
    globalThis.fetch = realFetch
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }

  return { app, config, fileDb, loginAs, webhook, cleanup }
}

/** Espera a que algo fire-and-forget (un mail) ocurra, sin depender del reloj. */
export async function waitFor(check, what, tries = 150) {
  for (let i = 0; i < tries; i++) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error(`timeout esperando ${what}`)
}

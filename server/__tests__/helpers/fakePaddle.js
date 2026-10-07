import crypto from 'node:crypto'
import request from 'supertest'
import { createFakeMercadoPago, startAppAgainstFakeMp } from './fakeMercadoPago.js'

/**
 * Paddle Billing falso, en memoria, detrás del `fetch` global (lo usa
 * server/services/paddle.js). Emula lo que la app le pide a Paddle:
 * transacciones con ítems non-catalog (alta, consulta, cancelación),
 * suscripciones (consulta, baja programada o inmediata, cambio de plan con
 * prorrateo y su preview) y lo que pasa del lado de Paddle: el comprador paga o
 * le rechazan la tarjeta en el checkout (`pay`, `decline`), la renovación al
 * fin del período (`renew`) y los reembolsos (`refund`). Las fechas salen del
 * reloj actual, así que `mock.timers` las mueve.
 *
 * Valida lo que valida Paddle de verdad en lo que usamos: montos como string
 * en centavos, moneda, `tax_category` del producto non-catalog, y que una baja
 * programada no se puede pedir sobre una suscripción `past_due`.
 */
export function createFakePaddle(nextFetch = globalThis.fetch) {
  const pd = {
    apiKey: 'pdl_sdbx_apikey_fake_test_key',
    transactions: new Map(),
    subscriptions: new Map(),
    calls: [],
    // `pd.failNext['POST /transactions'] = 500` → el próximo POST falla.
    failNext: {},
    // Subidas de plan con `prorated_immediately` que la tarjeta rechaza.
    declineUpgrades: false,
    seq: 0,
  }

  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  const ok = (data, status = 200) => json(status, { data, meta: { request_id: `req_${++pd.seq}` } })
  const err = (status, code, detail, errors) =>
    json(status, { error: { type: 'request_error', code, detail, errors } })
  const nowIso = () => new Date().toISOString()

  function addInterval(date, interval, frequency = 1) {
    const d = new Date(date)
    if (interval === 'day') d.setUTCDate(d.getUTCDate() + frequency)
    else if (interval === 'week') d.setUTCDate(d.getUTCDate() + 7 * frequency)
    else if (interval === 'month') d.setUTCMonth(d.getUTCMonth() + frequency)
    else if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + frequency)
    return d.toISOString()
  }

  function validateItems(items) {
    if (!Array.isArray(items) || items.length === 0) return 'items vacío'
    for (const item of items) {
      const price = item.price
      if (!price) return 'items[].price requerido (non-catalog)'
      if (!/^\d+$/.test(String(price.unit_price?.amount))) return 'unit_price.amount tiene que ser string de centavos'
      if (price.unit_price?.currency_code !== 'USD') return 'currency_code'
      if (!price.name || !price.description) return 'price.name / price.description'
      if (!price.product?.name || !price.product?.tax_category) return 'product.name / product.tax_category'
      if (price.product.image_url && !String(price.product.image_url).startsWith('https://')) {
        return 'product.image_url tiene que ser https'
      }
    }
    return null
  }

  const itemsCents = (items) =>
    items.reduce((sum, i) => sum + Number(i.price.unit_price.amount) * (i.quantity || 1), 0)

  function totals(subtotal, tax = 0) {
    return {
      subtotal: String(subtotal),
      tax: String(tax),
      total: String(subtotal + tax),
      grand_total: String(subtotal + tax),
      currency_code: 'USD',
    }
  }

  // Como Paddle real (verificado en sandbox): sin comprador ni dirección la
  // transacción nace `draft`; el checkout le pide los datos y cobra.
  function newTransaction({ items, custom_data, origin = 'api', subscription_id = null, status = 'draft', tax = 0 }) {
    const id = `txn_${String(++pd.seq).padStart(6, '0')}`
    const priced = items.map((i) => ({
      quantity: i.quantity || 1,
      price: { id: `pri_${++pd.seq}`, ...i.price },
    }))
    const txn = {
      id,
      status,
      origin,
      currency_code: 'USD',
      collection_mode: 'automatic',
      custom_data: custom_data || null,
      customer_id: subscription_id ? pd.subscriptions.get(subscription_id)?.customer_id : null,
      subscription_id,
      items: priced,
      details: { totals: totals(itemsCents(priced), tax) },
      billing_period: null,
      billed_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      payments: [],
      checkout: { url: `https://localhost/checkout/pay?_ptxn=${id}` },
    }
    pd.transactions.set(id, txn)
    return txn
  }

  pd.fetch = async (url, init = {}) => {
    const u = new URL(String(url))
    if (u.hostname !== 'sandbox-api.paddle.com') return nextFetch(url, init)
    const headers = new Headers(init.headers)
    if (headers.get('authorization') !== `Bearer ${pd.apiKey}`) {
      return err(403, 'forbidden', 'API key inválida')
    }
    const method = String(init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : null
    const parts = u.pathname.split('/').filter(Boolean)
    const route = `${method} /${parts[0]}${parts[2] ? `/:id/${parts[2]}` : parts[1] ? '/:id' : ''}`
    pd.calls.push({ method, route, path: u.pathname, body })

    const fail = pd.failNext[route]
    if (fail) {
      delete pd.failNext[route]
      return err(fail, 'internal_error', 'fake Paddle error')
    }

    if (route === 'POST /transactions') {
      const bad = validateItems(body?.items)
      if (bad) return err(400, 'bad_request', bad)
      if (body.currency_code !== 'USD') return err(400, 'bad_request', 'currency_code')
      return ok(newTransaction({ items: body.items, custom_data: body.custom_data }), 201)
    }
    if (route === 'GET /transactions/:id') {
      const txn = pd.transactions.get(parts[1])
      return txn ? ok(txn) : err(404, 'not_found', 'transaction not found')
    }
    if (route === 'PATCH /transactions/:id') {
      const txn = pd.transactions.get(parts[1])
      if (!txn) return err(404, 'not_found', 'transaction not found')
      if (body?.status === 'canceled') {
        if (!['draft', 'ready'].includes(txn.status)) {
          return err(400, 'transaction_immutable', `no se puede cancelar una transacción ${txn.status}`)
        }
        txn.status = 'canceled'
        txn.updated_at = nowIso()
      }
      return ok(txn)
    }
    if (route === 'GET /subscriptions/:id') {
      const sub = pd.subscriptions.get(parts[1])
      return sub ? ok(sub) : err(404, 'not_found', 'subscription not found')
    }
    if (route === 'POST /subscriptions/:id/cancel') {
      const sub = pd.subscriptions.get(parts[1])
      if (!sub) return err(404, 'not_found', 'subscription not found')
      if (sub.status === 'canceled') return err(400, 'subscription_locked_canceled', 'ya cancelada')
      if (body?.effective_from === 'immediately') {
        sub.status = 'canceled'
        sub.canceled_at = nowIso()
        sub.scheduled_change = null
        sub.current_billing_period = null
        sub.next_billed_at = null
      } else {
        if (sub.status === 'past_due') {
          return err(400, 'subscription_cannot_be_canceled_past_due', 'past_due: cancelar inmediatamente')
        }
        sub.scheduled_change = {
          action: 'cancel',
          effective_at: sub.current_billing_period.ends_at,
          resume_at: null,
        }
      }
      sub.updated_at = nowIso()
      return ok(sub)
    }
    if (route === 'PATCH /subscriptions/:id' || route === 'PATCH /subscriptions/:id/preview') {
      const sub = pd.subscriptions.get(parts[1])
      if (!sub) return err(404, 'not_found', 'subscription not found')
      const bad = validateItems(body?.items)
      if (bad) return err(400, 'bad_request', bad)
      const preview = route.endsWith('/preview')
      const bill = body.proration_billing_mode === 'prorated_immediately'
      const oldCents = itemsCents(sub.items)
      const newCents = itemsCents(body.items)
      const period = sub.current_billing_period
      const fraction = period
        ? Math.max(0, (Date.parse(period.ends_at) - Date.now()) / (Date.parse(period.ends_at) - Date.parse(period.starts_at)))
        : 0
      const diff = bill ? Math.max(0, Math.round((newCents - oldCents) * fraction)) : 0
      if (preview) {
        return ok({
          ...sub,
          immediate_transaction: bill ? { details: { totals: totals(diff) } } : null,
        })
      }
      if (bill && diff > 0 && pd.declineUpgrades) {
        return err(400, 'subscription_payment_declined', 'card declined')
      }
      sub.items = body.items.map((i) => ({ quantity: i.quantity || 1, price: { id: `pri_${++pd.seq}`, ...i.price } }))
      sub.updated_at = nowIso()
      if (bill && diff > 0) {
        const txn = newTransaction({
          items: body.items.map((i) => ({ ...i, price: { ...i.price, unit_price: { amount: String(diff), currency_code: 'USD' } } })),
          custom_data: sub.custom_data,
          origin: 'subscription_update',
          subscription_id: sub.id,
          status: 'completed',
        })
        txn.billed_at = nowIso()
        txn.billing_period = { starts_at: nowIso(), ends_at: period.ends_at }
        pd.lastUpgradeTransaction = txn
      }
      return ok(sub)
    }
    return err(404, 'not_found', `fake Paddle: ${route} no implementado`)
  }

  /** El comprador paga en el checkout. Con precio recurrente nace la suscripción. */
  pd.pay = (txnId, { tax = 0 } = {}) => {
    const txn = pd.transactions.get(txnId)
    if (!txn) throw new Error(`fake Paddle: no existe ${txnId}`)
    if (!['draft', 'ready'].includes(txn.status)) throw new Error(`fake Paddle: ${txnId} está ${txn.status}`)
    const now = nowIso()
    const customer = `ctm_${++pd.seq}`
    txn.customer_id = customer
    txn.billed_at = now
    txn.updated_at = now
    txn.status = 'completed'
    txn.payments = [{ status: 'captured', created_at: now }]
    const price = txn.items[0].price
    let sub = null
    if (price.billing_cycle) {
      const trial = price.trial_period
      const ends = trial
        ? addInterval(now, trial.interval, trial.frequency)
        : addInterval(now, price.billing_cycle.interval, price.billing_cycle.frequency)
      sub = {
        id: `sub_${String(++pd.seq).padStart(6, '0')}`,
        status: trial ? 'trialing' : 'active',
        customer_id: customer,
        currency_code: 'USD',
        custom_data: txn.custom_data,
        items: txn.items.map((i) => ({
          ...i,
          trial_dates: trial ? { starts_at: now, ends_at: ends } : null,
        })),
        current_billing_period: { starts_at: now, ends_at: ends },
        next_billed_at: ends,
        scheduled_change: null,
        canceled_at: null,
        management_urls: {
          update_payment_method: `https://sandbox-customer-portal.paddle.com/update/${customer}`,
          cancel: `https://sandbox-customer-portal.paddle.com/cancel/${customer}`,
        },
        created_at: now,
        updated_at: now,
      }
      pd.subscriptions.set(sub.id, sub)
      txn.subscription_id = sub.id
      if (trial) {
        // La prueba no cobra: Paddle guarda la tarjeta y la transacción va en 0.
        txn.details.totals = totals(0)
      } else {
        txn.details.totals = totals(itemsCents(txn.items), tax)
        txn.billing_period = { ...sub.current_billing_period }
      }
    } else {
      txn.details.totals = totals(itemsCents(txn.items), tax)
    }
    return { txn, sub }
  }

  /** La tarjeta se rechaza en el checkout: la transacción sigue abierta. */
  pd.decline = (txnId) => {
    const txn = pd.transactions.get(txnId)
    txn.payments = [...(txn.payments || []), { status: 'error', error_code: 'declined', created_at: nowIso() }]
    txn.updated_at = nowIso()
    return txn
  }

  /**
   * Fin del período: Paddle factura la cuota. Si cobra, la suscripción sigue
   * `active` con el período nuevo; si la rechaza, queda `past_due` (el período
   * igual avanza, como en Paddle) y la transacción `past_due`.
   */
  pd.renew = (subId, { decline = false } = {}) => {
    const sub = pd.subscriptions.get(subId)
    const cycle = sub.items[0].price.billing_cycle
    const starts = sub.current_billing_period.ends_at
    const ends = addInterval(starts, cycle.interval, cycle.frequency)
    const txn = newTransaction({
      items: sub.items.map(({ quantity, price }) => {
        const { trial_period: _trial, id: _id, ...rest } = price
        return { quantity, price: rest }
      }),
      custom_data: sub.custom_data,
      origin: 'subscription_recurring',
      subscription_id: sub.id,
      status: decline ? 'past_due' : 'completed',
    })
    txn.billed_at = nowIso()
    txn.billing_period = { starts_at: starts, ends_at: ends }
    if (decline) txn.payments = [{ status: 'error', error_code: 'declined', created_at: nowIso() }]
    sub.current_billing_period = { starts_at: starts, ends_at: ends }
    sub.next_billed_at = ends
    sub.status = decline ? 'past_due' : 'active'
    sub.items = sub.items.map((i) => ({ ...i, trial_dates: null }))
    sub.updated_at = nowIso()
    return txn
  }

  /** Paddle reintenta una cuota rechazada y esta vez cobra. */
  pd.recover = (txnId) => {
    const txn = pd.transactions.get(txnId)
    txn.status = 'completed'
    txn.payments = [...txn.payments, { status: 'captured', created_at: nowIso() }]
    const sub = pd.subscriptions.get(txn.subscription_id)
    sub.status = 'active'
    return txn
  }

  /** Fin del período de una baja programada: Paddle la cierra. */
  pd.endScheduledCancel = (subId) => {
    const sub = pd.subscriptions.get(subId)
    sub.status = 'canceled'
    sub.canceled_at = nowIso()
    sub.scheduled_change = null
    return sub
  }

  /** Reembolso / contracargo aprobado sobre una transacción. */
  pd.adjust = (txnId, { action = 'refund', type = 'full', status = 'approved' } = {}) => {
    const txn = pd.transactions.get(txnId)
    return {
      id: `adj_${++pd.seq}`,
      action,
      type,
      status,
      transaction_id: txnId,
      subscription_id: txn.subscription_id,
      customer_id: txn.customer_id,
      currency_code: 'USD',
      totals: { total: type === 'full' ? txn.details.totals.grand_total : '100', currency_code: 'USD' },
      created_at: nowIso(),
    }
  }

  pd.lastTransaction = () => [...pd.transactions.values()].at(-1)
  pd.lastCall = (route) => [...pd.calls].reverse().find((c) => c.route === route)
  return pd
}

/** Evento como lo manda Paddle. */
export function paddleEvent(type, data) {
  return {
    event_id: `evt_${crypto.randomBytes(6).toString('hex')}`,
    event_type: type,
    occurred_at: new Date().toISOString(),
    notification_id: `ntf_${crypto.randomBytes(6).toString('hex')}`,
    data,
  }
}

/** Header `Paddle-Signature` de un body crudo. */
export function signPaddle(rawBody, secret, ts = Math.floor(Date.now() / 1000)) {
  const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex')
  return `ts=${ts};h1=${h1}`
}

export const PADDLE_TEST_SECRET = 'pdl_ntfset_fake_webhook_secret_value'

/**
 * La app real contra MP + Paddle + Resend falsos (store de archivo, mails al
 * `outbox` del doble de MP). Suma `paddleWebhook(type, data)` firmado como lo
 * firma Paddle.
 */
export async function startAppAgainstFakePaddle(env = {}) {
  const pd = createFakePaddle()
  const mp = createFakeMercadoPago(pd.fetch)
  Object.assign(process.env, {
    PADDLE_ENV: 'sandbox',
    PADDLE_API_KEY: pd.apiKey,
    PADDLE_CLIENT_TOKEN: 'test_fake_client_token',
    PADDLE_WEBHOOK_SECRET: PADDLE_TEST_SECRET,
    PADDLE_MOCK_ENABLED: 'false',
    ...env,
  })
  const started = await startAppAgainstFakeMp(mp)

  function paddleWebhook(type, data, { secret = PADDLE_TEST_SECRET, signature } = {}) {
    const raw = JSON.stringify(paddleEvent(type, data))
    return request(started.app)
      .post('/api/webhooks/paddle')
      .set('content-type', 'application/json')
      .set('paddle-signature', signature ?? signPaddle(raw, secret))
      .send(raw)
  }

  return { ...started, mp, pd, paddleWebhook }
}

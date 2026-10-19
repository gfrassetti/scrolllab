import crypto from 'node:crypto'
import request from 'supertest'
import { createFakeMercadoPago, startAppAgainstFakeMp } from './fakeMercadoPago.js'

/**
 * Polar falso, en memoria, detrás del `fetch` global (lo usa server/services/polar.js).
 * Emula lo que la app le pide en las compras: listar / crear el producto genérico, el
 * checkout con precio ad hoc, consultar una orden y reembolsarla. Y lo que pasa de su
 * lado: el comprador paga (`pay`), el reembolso hecho desde el panel (`refund`) y los
 * webhooks firmados (Standard Webhooks).
 *
 * Valida lo que valida el real en lo que usamos: el token, que el precio ad hoc sea un
 * entero de centavos en USD y que no se devuelva más de lo cobrado.
 */
export const POLAR_TEST_SECRET = 'whsec_' + Buffer.from('polar-test-secret-0123456789abcdef').toString('base64')

let seq = 0
const uuid = () => {
  seq += 1
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`
}

export function createFakePolar(nextFetch = globalThis.fetch) {
  const pl = {
    token: 'polar_oat_fake_token',
    products: [],
    checkouts: new Map(),
    orders: new Map(),
    subscriptions: new Map(),
    refunds: [],
    calls: [],
    failNext: {},
  }
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  pl.fetch = async (url, init = {}) => {
    const u = new URL(String(url))
    if (u.hostname !== 'sandbox-api.polar.sh' && u.hostname !== 'api.polar.sh') return nextFetch(url, init)
    const headers = new Headers(init.headers)
    if (headers.get('authorization') !== `Bearer ${pl.token}`) return json(401, { detail: 'Unauthorized' })
    const method = (init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(String(init.body)) : null
    const path = u.pathname.replace(/^\/v1/, '')
    const route = `${method} ${path.replace(/\/[0-9a-f-]{36}$/i, '/:id')}`
    pl.calls.push({ route, path, body })
    if (pl.failNext[route]) {
      const status = pl.failNext[route]
      delete pl.failNext[route]
      return json(status, { detail: 'fake Polar error' })
    }

    if (route === 'GET /products/') return json(200, { items: pl.products })
    if (route === 'POST /products/') {
      const p = {
        id: uuid(),
        name: body.name,
        is_recurring: Boolean(body.recurring_interval),
        recurring_interval: body.recurring_interval || null,
        prices: body.prices.map((x) => ({ ...x, is_archived: false })),
      }
      pl.products.push(p)
      return json(201, p)
    }
    if (route === 'POST /checkouts/') {
      const productId = body.products?.[0]
      if (!pl.products.some((p) => p.id === productId)) return json(422, { detail: [{ msg: 'product not found' }] })
      const adhoc = body.prices?.[productId]?.[0]
      if (adhoc && (!Number.isInteger(adhoc.price_amount) || adhoc.price_currency !== 'usd')) {
        return json(422, { detail: [{ msg: 'invalid price' }] })
      }
      const id = uuid()
      const checkout = { id, url: `https://sandbox.polar.sh/checkout/polar_c_${id}`, body, amount: adhoc?.price_amount }
      pl.checkouts.set(id, checkout)
      return json(201, { id, url: checkout.url, amount: checkout.amount, metadata: body.metadata, status: 'open' })
    }
    if (route === 'GET /subscriptions/:id') {
      const sub = pl.subscriptions.get(path.split('/').pop())
      return sub ? json(200, sub) : json(404, { detail: 'Not found' })
    }
    if (route === 'GET /subscriptions/') {
      const ext = u.searchParams.get('external_customer_id')
      return json(200, { items: [...pl.subscriptions.values()].filter((x) => x.customer.external_id === ext).reverse() })
    }
    if (route === 'PATCH /subscriptions/:id') {
      const sub = pl.subscriptions.get(path.split('/').pop())
      if (!sub) return json(404, { detail: 'Not found' })
      if (body.revoke) {
        if (sub.status === 'canceled') return json(403, { detail: 'already canceled' })
        sub.status = 'canceled'
        sub.ended_at = new Date(Date.now()).toISOString()
        sub.cancel_at_period_end = false
      } else if ('cancel_at_period_end' in body) {
        sub.cancel_at_period_end = Boolean(body.cancel_at_period_end)
      } else if (body.product_id) {
        const product = pl.products.find((p) => p.id === body.product_id)
        if (!product) return json(422, { detail: [{ msg: 'product not found' }] })
        const before = productPrice(sub.product_id)
        sub.product_id = product.id
        if (body.proration_behavior === 'invoice' && productPrice(product.id) > before && sub.status === 'active') {
          // Cobra ya la diferencia por lo que queda del período (aprox.: la mitad).
          pl.lastProration = newOrder(sub, Math.round((productPrice(product.id) - before) / 2), 'subscription_update')
        }
      }
      return json(200, sub)
    }
    if (route === 'POST /customer-sessions/') {
      return json(201, { customer_portal_url: `https://sandbox.polar.sh/portal/${body.customer_id}` })
    }
    if (route === 'GET /orders/:id') {
      const o = pl.orders.get(path.split('/').pop())
      return o ? json(200, o) : json(404, { detail: 'Not found' })
    }
    if (route === 'POST /refunds/') {
      const o = pl.orders.get(body.order_id)
      if (!o) return json(404, { detail: 'Order not found' })
      if (o.subscription_id && body.revoke_benefits) return json(422, { detail: [{ msg: 'revoke_benefits only for one-time' }] })
      if (!Number.isInteger(body.amount) || body.amount < 1 || body.amount + o.refunded_amount > o.net_amount) {
        return json(422, { detail: [{ msg: 'invalid amount' }] })
      }
      applyRefund(o, body.amount)
      const r = { id: uuid(), order_id: o.id, amount: body.amount, status: 'succeeded', reason: body.reason }
      pl.refunds.push(r)
      return json(201, r)
    }
    return json(404, { detail: `fake Polar: ${route}` })
  }

  const productPrice = (id) => pl.products.find((p) => p.id === id)?.prices?.[0]?.price_amount ?? 0
  const addInterval = (date, interval) => {
    const d = new Date(date)
    if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1)
    else d.setUTCMonth(d.getUTCMonth() + 1)
    return d
  }

  function newOrder(sub, amount, reason) {
    const order = {
      id: uuid(),
      status: 'paid',
      paid: true,
      billing_reason: reason,
      subtotal_amount: amount,
      discount_amount: 0,
      net_amount: amount,
      tax_amount: 0,
      total_amount: amount,
      refunded_amount: 0,
      currency: 'usd',
      customer: { email: sub.customer.email },
      metadata: sub.metadata,
      checkout_id: null,
      subscription_id: sub.id,
    }
    pl.orders.set(order.id, order)
    return order
  }

  /**
   * El comprador completa el checkout de LAB: nace la suscripción (en prueba si el
   * checkout la trae) y, sin prueba, la orden del primer cobro.
   */
  pl.subscribe = (checkoutId, { email = 'buyer@test.com' } = {}) => {
    const c = pl.checkouts.get(checkoutId)
    if (!c) throw new Error(`checkout ${checkoutId} no existe`)
    const product = pl.products.find((p) => p.id === c.body.products[0])
    const trialDays = c.body.allow_trial ? c.body.trial_interval_count || 0 : 0
    const now = new Date(Date.now())
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null
    const sub = {
      id: uuid(),
      status: trialEnd ? 'trialing' : 'active',
      product_id: product.id,
      customer_id: `cus_${c.body.external_customer_id}`,
      customer: { id: `cus_${c.body.external_customer_id}`, email, external_id: c.body.external_customer_id },
      current_period_start: now.toISOString(),
      current_period_end: (trialEnd || addInterval(now, product.recurring_interval)).toISOString(),
      trial_start: trialEnd ? now.toISOString() : null,
      trial_end: trialEnd ? trialEnd.toISOString() : null,
      cancel_at_period_end: false,
      started_at: now.toISOString(),
      ended_at: null,
      metadata: c.body.metadata,
    }
    pl.subscriptions.set(sub.id, sub)
    const order = trialEnd ? null : newOrder(sub, productPrice(product.id), 'subscription_create')
    return { sub, order }
  }

  /** Renovación (o fin de la prueba): nuevo período y su orden; `decline` la deja en mora. */
  pl.renew = (subscriptionId, { decline = false } = {}) => {
    const sub = pl.subscriptions.get(subscriptionId)
    const product = pl.products.find((p) => p.id === sub.product_id)
    if (decline) {
      sub.status = 'past_due'
      return { sub, order: null }
    }
    sub.status = 'active'
    sub.current_period_start = new Date(Date.now()).toISOString()
    sub.current_period_end = addInterval(new Date(Date.now()), product.recurring_interval).toISOString()
    const order = newOrder(sub, productPrice(product.id), 'subscription_cycle')
    return { sub, order }
  }

  function applyRefund(o, amount) {
    o.refunded_amount += amount
    o.status = o.refunded_amount >= o.net_amount ? 'refunded' : 'partially_refunded'
  }

  /** El comprador paga el checkout. `tax` en centavos (el MoR lo suma al total). */
  pl.pay = (checkoutId, { email = 'buyer@test.com', tax = 0, discount = 0, amount, currency = 'usd' } = {}) => {
    const c = pl.checkouts.get(checkoutId)
    if (!c) throw new Error(`checkout ${checkoutId} no existe`)
    const subtotal = amount ?? c.amount
    const net = subtotal - discount
    const order = {
      id: uuid(),
      status: 'paid',
      paid: true,
      billing_reason: 'purchase',
      subtotal_amount: subtotal,
      discount_amount: discount,
      net_amount: net,
      tax_amount: tax,
      total_amount: net + tax,
      refunded_amount: 0,
      currency,
      customer: { email },
      metadata: c.body.metadata,
      checkout_id: c.id,
      subscription_id: null,
    }
    pl.orders.set(order.id, order)
    return order
  }

  /** Reembolso hecho desde el panel de Polar. */
  pl.refund = (orderId, amount) => {
    const o = pl.orders.get(orderId)
    applyRefund(o, amount ?? o.net_amount - o.refunded_amount)
    return o
  }

  globalThis.fetch = pl.fetch
  return pl
}

/** Firma Standard Webhooks: base64 de HMAC-SHA256(`${id}.${ts}.${body}`) con la llave decodificada. */
export function signPolar(raw, { secret = POLAR_TEST_SECRET, id = `msg_${crypto.randomUUID()}`, ts = Math.floor(Date.now() / 1000) } = {}) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const sig = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64')
  return { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': `v1,${sig}` }
}

export async function startAppAgainstFakePolar(env = {}) {
  const pl = createFakePolar()
  const mp = createFakeMercadoPago(pl.fetch)
  Object.assign(process.env, {
    POLAR_ACCESS_TOKEN: pl.token,
    POLAR_WEBHOOK_SECRET: POLAR_TEST_SECRET,
    // Por defecto la cuenta real: el sandbox es solo para las cuentas de QA.
    POLAR_ENV: 'production',
    ...env,
  })
  const { resetPolarCache, resetPolarLabCache } = await import('../../services/polar.js')
  resetPolarCache()
  resetPolarLabCache()
  const started = await startAppAgainstFakeMp(mp)

  function polarWebhook(type, data, { headers } = {}) {
    const raw = JSON.stringify({ type, timestamp: new Date().toISOString(), data })
    const req = request(started.app).post('/api/webhooks/polar').set('content-type', 'application/json')
    for (const [k, v] of Object.entries(headers ?? signPolar(raw))) req.set(k, v)
    return req.send(raw)
  }

  return { ...started, mp, pl, polarWebhook }
}

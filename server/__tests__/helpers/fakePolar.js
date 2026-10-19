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
      const p = { id: uuid(), name: body.name, is_recurring: Boolean(body.recurring_interval), prices: body.prices }
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
    if (route === 'GET /orders/:id') {
      const o = pl.orders.get(path.split('/').pop())
      return o ? json(200, o) : json(404, { detail: 'Not found' })
    }
    if (route === 'POST /refunds/') {
      const o = pl.orders.get(body.order_id)
      if (!o) return json(404, { detail: 'Order not found' })
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
  const { resetPolarCache } = await import('../../services/polar.js')
  resetPolarCache()
  const started = await startAppAgainstFakeMp(mp)

  function polarWebhook(type, data, { headers } = {}) {
    const raw = JSON.stringify({ type, timestamp: new Date().toISOString(), data })
    const req = request(started.app).post('/api/webhooks/polar').set('content-type', 'application/json')
    for (const [k, v] of Object.entries(headers ?? signPolar(raw))) req.set(k, v)
    return req.send(raw)
  }

  return { ...started, mp, pl, polarWebhook }
}

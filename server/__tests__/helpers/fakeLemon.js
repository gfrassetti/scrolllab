import crypto from 'node:crypto'
import request from 'supertest'
import { createFakeMercadoPago, startAppAgainstFakeMp } from './fakeMercadoPago.js'

/**
 * Lemon Squeezy falso, en memoria, detrás del `fetch` global (lo usa
 * server/services/lemonsqueezy.js). Emula lo que la app le pide: crear un checkout
 * con `custom_price` sobre una variante de una tienda, y reembolsar una orden. Y lo
 * que pasa de su lado: el comprador paga (`pay`) y llegan los webhooks firmados.
 *
 * Valida lo que valida el real en lo que usamos: la clave, que `custom_price` sea un
 * entero de centavos, que haya tienda y variante, y que el checkout sea de la tienda.
 */
export const LEMON_TEST_SECRET = 'lemon_whsec_test_secret_0123456789abcdef'

// Ids de orden únicos en todo el proceso, como los reales (varios fakes pueden
// compartir el mismo store de archivos en un archivo de tests).
let orderSeq = 900000

export function createFakeLemon(nextFetch = globalThis.fetch) {
  const ls = {
    apiKey: 'lsk_test_fake_api_key',
    storeId: '498952',
    variantId: '777001',
    checkouts: new Map(),
    orders: new Map(),
    calls: [],
    seq: 0,
    failNext: {},
  }
  const json = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/vnd.api+json' } })
  const errors = (status, title, detail) => json(status, { errors: [{ status: String(status), title, detail }] })

  ls.fetch = async (url, init = {}) => {
    const u = new URL(String(url))
    if (u.hostname !== 'api.lemonsqueezy.com') return nextFetch(url, init)
    const headers = new Headers(init.headers)
    if (headers.get('authorization') !== `Bearer ${ls.apiKey}`) return errors(401, 'Unauthenticated', 'API key inválida')
    const method = String(init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : null
    const route = `${method} ${u.pathname.replace(/\/\d+/g, '/:id')}`
    ls.calls.push({ route, path: u.pathname, body })
    const fail = ls.failNext[route]
    if (fail) {
      delete ls.failNext[route]
      return errors(fail, 'Server error', 'fake Lemon Squeezy error')
    }

    if (route === 'POST /v1/checkouts') {
      const a = body?.data?.attributes || {}
      const store = body?.data?.relationships?.store?.data?.id
      const variant = body?.data?.relationships?.variant?.data?.id
      if (store !== ls.storeId) return errors(422, 'Unprocessable', 'store inválida')
      if (variant !== ls.variantId) return errors(422, 'Unprocessable', 'variant inválida')
      if (!Number.isInteger(a.custom_price) || a.custom_price < 50) {
        return errors(422, 'Unprocessable', 'custom_price tiene que ser un entero de centavos')
      }
      const id = `chk_${++ls.seq}`
      const checkout = { id, attributes: a, url: `https://scrolllab.lemonsqueezy.com/checkout/custom/${id}` }
      ls.checkouts.set(id, checkout)
      return json(201, { data: { type: 'checkouts', id, attributes: { url: checkout.url } } })
    }
    if (route === 'POST /v1/orders/:id/refund') {
      const order = ls.orders.get(u.pathname.split('/')[3])
      if (!order) return errors(404, 'Not found', 'order not found')
      return json(200, { data: { type: 'orders', id: order.id, attributes: { status: 'refunded' } } })
    }
    return errors(404, 'Not found', `ruta no emulada: ${route}`)
  }

  /**
   * El comprador paga el checkout: crea la orden de Lemon Squeezy (con el subtotal
   * del `custom_price`, el tax que sume y los datos propios del checkout).
   * @param {string} checkoutId
   * @param {{ tax?: number, discount?: number, email?: string, testMode?: boolean, status?: string }} [opts]
   */
  ls.pay = (checkoutId, opts = {}) => {
    const checkout = ls.checkouts.get(checkoutId)
    const subtotal = checkout.attributes.custom_price
    const tax = opts.tax ?? 0
    const discount = opts.discount ?? 0
    const order = {
      id: String(++orderSeq),
      attributes: {
        status: opts.status || 'paid',
        currency: 'USD',
        subtotal,
        discount_total: discount,
        tax,
        total: subtotal - discount + tax,
        user_email: opts.email || checkout.attributes.checkout_data?.email || 'comprador@example.com',
        refunded: false,
        refunded_amount: 0,
        test_mode: opts.testMode ?? checkout.attributes.test_mode ?? false,
      },
      custom: checkout.attributes.checkout_data?.custom || {},
    }
    ls.orders.set(order.id, order)
    return order
  }
  return ls
}

export const signLemon = (raw, secret = LEMON_TEST_SECRET) =>
  crypto.createHmac('sha256', secret).update(raw).digest('hex')

/** Cuerpo de un webhook de orden, como lo manda Lemon Squeezy. */
export function lemonEvent(name, order, overrides = {}) {
  return {
    meta: { event_name: name, custom_data: order.custom },
    data: { type: 'orders', id: order.id, attributes: { ...order.attributes, ...overrides } },
  }
}

export async function startAppAgainstFakeLemon(env = {}) {
  const ls = createFakeLemon()
  const mp = createFakeMercadoPago(ls.fetch)
  Object.assign(process.env, {
    LEMONSQUEEZY_API_KEY: ls.apiKey,
    LEMONSQUEEZY_STORE_ID: ls.storeId,
    LEMONSQUEEZY_ORDER_VARIANT_ID: ls.variantId,
    LEMONSQUEEZY_WEBHOOK_SECRET: LEMON_TEST_SECRET,
    // Por defecto modo real: el modo prueba es solo para las cuentas de QA.
    LEMONSQUEEZY_TEST_MODE: 'false',
    ...env,
  })
  const started = await startAppAgainstFakeMp(mp)

  function lemonWebhook(name, order, { secret = LEMON_TEST_SECRET, signature, overrides } = {}) {
    const raw = JSON.stringify(lemonEvent(name, order, overrides))
    return request(started.app)
      .post('/api/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .set('x-signature', signature ?? signLemon(raw, secret))
      .send(raw)
  }

  return { ...started, mp, ls, lemonWebhook }
}

import crypto from 'node:crypto'
import request from 'supertest'
import { createFakeMercadoPago, startAppAgainstFakeMp } from './fakeMercadoPago.js'
import { HOSTED_PLANS } from '../../catalog.js'

/**
 * Lemon Squeezy falso, en memoria, detrás del `fetch` global (lo usa
 * server/services/lemonsqueezy.js). Emula lo que la app le pide:
 * - compras: checkout con `custom_price` sobre la variante genérica, reembolso de una orden;
 * - LAB: el producto «ScrollLab LAB» con una variante por plan y ciclo (precio de lista,
 *   7 días de prueba), checkout de suscripción (`skip_trial`), consultar / cambiar
 *   (`variant_id`, `trial_ends_at`, prorrateo) / dar de baja una suscripción, buscarlas
 *   por mail y reembolsar una factura.
 * Y lo que pasa de su lado: el comprador paga (`pay`, `subscribe`), las renovaciones
 * (`renew`) y los webhooks firmados.
 *
 * Valida lo que valida el real en lo que usamos: la clave, la tienda, la variante, que
 * `custom_price` sea un entero de centavos y que una baja no se repita.
 */
export const LEMON_TEST_SECRET = 'lemon_whsec_test_secret_0123456789abcdef'

// Ids únicos en todo el proceso, como los reales (varios fakes pueden compartir el
// mismo store de archivos en un archivo de tests).
let orderSeq = 900000
let subSeq = 500000
let invoiceSeq = 700000

const LAB_VARIANTS = Object.values(HOSTED_PLANS).flatMap((p, i) => [
  { id: String(880010 + i * 2), name: `${p.tier[0].toUpperCase()}${p.tier.slice(1)} (monthly)`, interval: 'month', price: Math.round(p.priceMonthlyUsd * 100) },
  { id: String(880011 + i * 2), name: `${p.tier[0].toUpperCase()}${p.tier.slice(1)} (yearly)`, interval: 'year', price: Math.round(p.priceYearlyUsd * 100) },
])

export function createFakeLemon(nextFetch = globalThis.fetch) {
  const ls = {
    apiKey: 'lsk_test_fake_api_key',
    storeId: '498952',
    variantId: '777001',
    labProductId: '880000',
    labVariants: LAB_VARIANTS.map((v) => ({ ...v, trialDays: 7, status: 'published' })),
    checkouts: new Map(),
    orders: new Map(),
    subscriptions: new Map(),
    invoices: new Map(),
    calls: [],
    seq: 0,
    failNext: {},
  }
  const json = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/vnd.api+json' } })
  const errors = (status, title, detail) => json(status, { errors: [{ status: String(status), title, detail }] })
  const now = () => new Date(Date.now())
  const addInterval = (date, interval) => {
    const d = new Date(date)
    if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1)
    else d.setUTCMonth(d.getUTCMonth() + 1)
    return d
  }
  const labVariant = (id) => ls.labVariants.find((v) => v.id === String(id))
  const subData = (s) => ({ type: 'subscriptions', id: s.id, attributes: s.attributes })
  const invData = (inv) => ({ type: 'subscription-invoices', id: inv.id, attributes: inv.attributes })

  function newInvoice(sub, { reason, total, status = 'paid' }) {
    const inv = {
      id: String(++invoiceSeq),
      type: 'subscription-invoices',
      custom: sub.custom,
      attributes: {
        subscription_id: Number(sub.id),
        billing_reason: reason,
        status,
        subtotal: total,
        discount_total: 0,
        tax: 0,
        total,
        refunded_amount: 0,
        currency: 'USD',
        created_at: now().toISOString(),
        test_mode: sub.attributes.test_mode,
        user_email: sub.attributes.user_email,
      },
    }
    ls.invoices.set(inv.id, inv)
    return inv
  }

  ls.fetch = async (url, init = {}) => {
    const u = new URL(String(url))
    if (u.hostname !== 'api.lemonsqueezy.com') return nextFetch(url, init)
    const headers = new Headers(init.headers)
    if (headers.get('authorization') !== `Bearer ${ls.apiKey}`) return errors(401, 'Unauthenticated', 'API key inválida')
    const method = String(init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : null
    const route = `${method} ${u.pathname.replace(/\/\d+/g, '/:id')}`
    const id = u.pathname.split('/')[3]
    ls.calls.push({ route, path: u.pathname, search: u.search, body })
    const fail = ls.failNext[route]
    if (fail) {
      delete ls.failNext[route]
      return errors(fail, 'Server error', 'fake Lemon Squeezy error')
    }

    if (route === 'GET /v1/products') {
      if (u.searchParams.get('filter[store_id]') !== ls.storeId) return json(200, { data: [] })
      return json(200, {
        data: [
          { type: 'products', id: '777000', attributes: { name: 'ScrollLab order' } },
          { type: 'products', id: ls.labProductId, attributes: { name: 'ScrollLab LAB' } },
        ],
      })
    }
    if (route === 'GET /v1/variants') {
      if (u.searchParams.get('filter[product_id]') !== ls.labProductId) return json(200, { data: [] })
      return json(200, {
        data: ls.labVariants.map((v) => ({
          type: 'variants',
          id: v.id,
          attributes: {
            name: v.name,
            price: v.price,
            interval: v.interval,
            is_subscription: true,
            has_free_trial: v.trialDays > 0,
            trial_interval: 'day',
            trial_interval_count: v.trialDays,
            status: v.status,
          },
        })),
      })
    }
    if (route === 'POST /v1/checkouts') {
      const a = body?.data?.attributes || {}
      const store = body?.data?.relationships?.store?.data?.id
      const variant = body?.data?.relationships?.variant?.data?.id
      if (store !== ls.storeId) return errors(422, 'Unprocessable', 'store inválida')
      const lab = labVariant(variant)
      if (variant !== ls.variantId && !lab) return errors(422, 'Unprocessable', 'variant inválida')
      if (!lab && (!Number.isInteger(a.custom_price) || a.custom_price < 50)) {
        return errors(422, 'Unprocessable', 'custom_price tiene que ser un entero de centavos')
      }
      const cid = `chk_${++ls.seq}`
      const checkout = { id: cid, variantId: variant, attributes: a, url: `https://scrolllab.lemonsqueezy.com/checkout/custom/${cid}` }
      ls.checkouts.set(cid, checkout)
      return json(201, { data: { type: 'checkouts', id: cid, attributes: { url: checkout.url } } })
    }
    if (route === 'POST /v1/orders/:id/refund') {
      const order = ls.orders.get(id)
      if (!order) return errors(404, 'Not found', 'order not found')
      return json(200, { data: { type: 'orders', id: order.id, attributes: { status: 'refunded' } } })
    }
    if (route === 'GET /v1/subscriptions') {
      const email = u.searchParams.get('filter[user_email]')
      const rows = [...ls.subscriptions.values()].filter((s) => s.attributes.user_email === email)
      return json(200, { data: rows.map(subData) })
    }
    if (route === 'GET /v1/subscriptions/:id') {
      const s = ls.subscriptions.get(id)
      return s ? json(200, { data: subData(s) }) : errors(404, 'Not found', 'subscription not found')
    }
    if (route === 'PATCH /v1/subscriptions/:id') {
      const s = ls.subscriptions.get(id)
      if (!s) return errors(404, 'Not found', 'subscription not found')
      const a = body?.data?.attributes || {}
      ls.updates = [...(ls.updates || []), { id, attributes: a }]
      if (a.trial_ends_at) {
        s.attributes.trial_ends_at = a.trial_ends_at
        s.attributes.renews_at = a.trial_ends_at
      }
      if (a.variant_id) {
        const from = labVariant(s.attributes.variant_id)
        const to = labVariant(a.variant_id)
        if (!to) return errors(422, 'Unprocessable', 'variant inválida')
        s.attributes.variant_id = Number(to.id)
        if (a.invoice_immediately && !a.disable_prorations && s.attributes.status === 'active') {
          const end = new Date(s.attributes.renews_at).getTime()
          const start = new Date(s.periodStart).getTime()
          const fraction = Math.max(0, Math.min(1, (end - Date.now()) / (end - start)))
          const amount = Math.round((to.price - from.price) * fraction)
          if (amount > 0) ls.lastProration = newInvoice(s, { reason: 'updated', total: amount })
        }
      }
      return json(200, { data: subData(s) })
    }
    if (route === 'DELETE /v1/subscriptions/:id') {
      const s = ls.subscriptions.get(id)
      if (!s) return errors(404, 'Not found', 'subscription not found')
      if (s.attributes.cancelled) return errors(422, 'Unprocessable', 'ya está cancelada')
      s.attributes.cancelled = true
      s.attributes.status = 'cancelled'
      s.attributes.ends_at = s.attributes.renews_at
      return json(200, { data: subData(s) })
    }
    if (route === 'POST /v1/subscription-invoices/:id/refund') {
      const inv = ls.invoices.get(id)
      if (!inv) return errors(404, 'Not found', 'invoice not found')
      inv.attributes.status = 'refunded'
      inv.attributes.refunded_amount = inv.attributes.total
      return json(200, { data: invData(inv) })
    }
    return errors(404, 'Not found', `ruta no emulada: ${route}`)
  }

  /**
   * El comprador paga el checkout de una compra: crea la orden de Lemon Squeezy (con el
   * subtotal del `custom_price`, el tax que sume y los datos propios del checkout).
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

  /**
   * El comprador completa el checkout de LAB: nace la suscripción. Con prueba (la
   * variante la tiene y el checkout no la salteó) queda `on_trial` sin cobro; sin
   * prueba se cobra la primera factura en el acto.
   * @returns {{ sub: any, invoice: any | null }}
   */
  ls.subscribe = (checkoutId, opts = {}) => {
    const checkout = ls.checkouts.get(checkoutId)
    const v = labVariant(checkout.variantId)
    const trial = v.trialDays > 0 && !checkout.attributes.checkout_options?.skip_trial
    const t = now()
    const trialEnds = trial ? new Date(t.getTime() + v.trialDays * 86_400_000) : null
    const sub = {
      id: String(++subSeq),
      type: 'subscriptions',
      custom: checkout.attributes.checkout_data?.custom || {},
      periodStart: (trialEnds || t).toISOString(),
      attributes: {
        status: trial ? 'on_trial' : 'active',
        variant_id: Number(v.id),
        customer_id: 4000 + subSeq,
        cancelled: false,
        trial_ends_at: trialEnds ? trialEnds.toISOString() : null,
        renews_at: (trial ? trialEnds : addInterval(t, v.interval)).toISOString(),
        ends_at: null,
        test_mode: opts.testMode ?? Boolean(checkout.attributes.test_mode),
        user_email: opts.email || checkout.attributes.checkout_data?.email || 'cliente@example.com',
        created_at: t.toISOString(),
        urls: { update_payment_method: `https://scrolllab.lemonsqueezy.com/subscription/${subSeq}/payment-details?signature=x` },
      },
    }
    if (!trial) sub.periodStart = t.toISOString()
    ls.subscriptions.set(sub.id, sub)
    const invoice = trial ? null : newInvoice(sub, { reason: 'initial', total: v.price })
    return { sub, invoice }
  }

  /** Fin de la prueba o del período: renueva (o rechaza la tarjeta). */
  ls.renew = (subscriptionId, { decline = false } = {}) => {
    const s = ls.subscriptions.get(String(subscriptionId))
    const v = labVariant(s.attributes.variant_id)
    if (decline) {
      s.attributes.status = 'past_due'
      return newInvoice(s, { reason: 'renewal', total: v.price, status: 'failed' })
    }
    const start = new Date(s.attributes.renews_at)
    s.periodStart = start.toISOString()
    s.attributes.status = 'active'
    s.attributes.trial_ends_at = null
    s.attributes.renews_at = addInterval(start, v.interval).toISOString()
    return newInvoice(s, { reason: 'renewal', total: v.price })
  }
  return ls
}

export const signLemon = (raw, secret = LEMON_TEST_SECRET) =>
  crypto.createHmac('sha256', secret).update(raw).digest('hex')

/** Cuerpo de un webhook (orden, suscripción o factura), como lo manda Lemon Squeezy. */
export function lemonEvent(name, obj, overrides = {}) {
  return {
    meta: { event_name: name, custom_data: obj.custom },
    data: { type: obj.type || 'orders', id: obj.id, attributes: { ...obj.attributes, ...overrides } },
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
  const { resetLabVariantCache } = await import('../../services/lemonsqueezy.js')
  resetLabVariantCache()
  const started = await startAppAgainstFakeMp(mp)

  function lemonWebhook(name, obj, { secret = LEMON_TEST_SECRET, signature, overrides } = {}) {
    const raw = JSON.stringify(lemonEvent(name, obj, overrides))
    return request(started.app)
      .post('/api/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .set('x-signature', signature ?? signLemon(raw, secret))
      .send(raw)
  }

  return { ...started, mp, ls, lemonWebhook }
}

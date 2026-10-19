import crypto from 'node:crypto'
import { HttpError } from '../errors.js'

/**
 * Polar (API v1) por `fetch`, sin SDK: cobro internacional en USD como merchant of
 * record (ver docs/polar.md). Acá viven el cliente HTTP, la firma de los webhooks
 * (Standard Webhooks) y el armado del checkout. Las reglas de negocio (orden pagada,
 * reembolso, baja) van aparte (polarPayments.js).
 *
 * Una orden se cobra sobre UN producto «ScrollLab order» con un precio ad hoc
 * (`prices` del checkout) que calcula el servidor. Montos en centavos enteros.
 * Lo que identifica la orden viaja en `metadata` del checkout y Polar lo copia a la
 * orden (y a la suscripción): vuelve en cada webhook.
 *
 * Entornos: `sandbox` (https://sandbox-api.polar.sh, otra cuenta y otro token) y
 * `production`. El sandbox cobra con la tarjeta de prueba y nunca entrega una compra real.
 */

export const POLAR_CURRENCY = 'USD'
export const POLAR_API = {
  sandbox: 'https://sandbox-api.polar.sh/v1',
  production: 'https://api.polar.sh/v1',
}
/** Nombre del producto genérico sobre el que se cobra cada orden. */
export const POLAR_ORDER_PRODUCT = 'ScrollLab order'

/** Error de la API: `status` HTTP y el detalle que informa Polar. */
export class PolarError extends Error {
  constructor(message, { status = 502, code = 'polar_error', detail = '' } = {}) {
    super(message)
    this.name = 'PolarError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/** USD con decimales → centavos enteros. */
export function usdCents(amount) {
  return Math.round(Number(amount) * 100)
}

/**
 * Llamada a la API. Un 4xx sale como PolarError con su status; la red caída o un 5xx, como 502.
 * @param {{ polar: { accessToken: string, apiBase: string } }} config
 * @param {string} method
 * @param {string} pathname
 * @param {unknown} [body]
 */
export async function polarRequest(config, method, pathname, body) {
  const { accessToken, apiBase } = config.polar
  if (!accessToken) throw new PolarError('Polar no está configurado', { status: 503 })
  let res
  try {
    res = await fetch(`${apiBase}${pathname}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    throw new PolarError(`Polar no responde: ${err?.message || err}`, { status: 502 })
  }
  /** @type {any} */
  let json = null
  try {
    json = await res.json()
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const detail = Array.isArray(json?.detail)
      ? json.detail.map((d) => d?.msg || '').filter(Boolean).join('; ')
      : String(json?.detail || json?.error || '')
    throw new PolarError(`Polar ${method} ${pathname} → ${res.status} ${detail}`.trim(), {
      status: res.status >= 500 ? 502 : res.status,
      code: String(json?.type || res.status),
      detail,
    })
  }
  return json
}

let orderProductCache = null

/** Para los tests (cada uno arranca su Polar simulado). */
export function resetPolarCache() {
  orderProductCache = null
}

/**
 * Id del producto genérico de las órdenes. Se busca por nombre (no hace falta una
 * variable por entorno); si no existe, se crea una vez.
 * @param {any} config
 */
export async function orderProductId(config) {
  const key = `${config.polar.apiBase}|${config.polar.accessToken.slice(-6)}`
  if (orderProductCache?.key === key) return orderProductCache.id
  const list = await polarRequest(config, 'GET', `/products/?limit=100&is_archived=false`)
  let product = (list?.items || []).find((p) => p.name === POLAR_ORDER_PRODUCT && !p.is_recurring)
  if (!product) {
    product = await polarRequest(config, 'POST', '/products/', {
      name: POLAR_ORDER_PRODUCT,
      description: 'Scroll Lab — templates and builder compositions (source code, one-time purchase).',
      recurring_interval: null,
      prices: [{ amount_type: 'fixed', price_amount: 100, price_currency: 'usd' }],
    })
  }
  orderProductCache = { key, id: String(product.id) }
  return orderProductCache.id
}

/**
 * Cuerpo de `POST /v1/checkouts/` de una orden del market o del builder: el producto
 * genérico con el total que calculó el servidor (cupón ya aplicado), sin códigos de
 * descuento de Polar (cobrarían menos y la orden no se entregaría).
 * @param {{ productId: string, orderId: string, userId: string, totalUsd: number,
 *   email?: string, name?: string, successUrl: string, locale?: string }} args
 */
export function buildCheckoutBody({ productId, orderId, userId, totalUsd, email, name, successUrl, locale }) {
  return {
    products: [productId],
    prices: { [productId]: [{ amount_type: 'fixed', price_amount: usdCents(totalUsd), price_currency: 'usd' }] },
    ...(email ? { customer_email: email } : {}),
    ...(name ? { customer_name: String(name).slice(0, 120) } : {}),
    external_customer_id: String(userId),
    metadata: { kind: 'order', orderId: String(orderId), userId: String(userId) },
    success_url: successUrl,
    allow_discount_codes: false,
    locale: locale === 'en' ? 'en' : 'es',
  }
}

/** Crea el checkout y devuelve su id y su URL. */
export async function createCheckout(config, body) {
  const json = await polarRequest(config, 'POST', '/checkouts/', body)
  if (!json?.url) throw new PolarError('Polar no devolvió la URL del checkout', { status: 502 })
  return { id: String(json.id), url: String(json.url) }
}

/** Orden de Polar (estado, montos y reembolsos). */
export function getOrder(config, id) {
  return polarRequest(config, 'GET', `/orders/${encodeURIComponent(id)}`)
}

/**
 * Reembolso de una orden de Polar. `amountCents` es el monto antes de impuestos
 * (Polar devuelve el impuesto proporcional). Para una compra suelta se revoca el acceso.
 * @param {any} config
 * @param {{ orderId: string, amountCents: number, comment?: string, oneTime?: boolean }} args
 */
export function refundOrder(config, { orderId, amountCents, comment, oneTime = true }) {
  return polarRequest(config, 'POST', '/refunds/', {
    order_id: String(orderId),
    reason: 'customer_request',
    amount: Math.round(amountCents),
    ...(comment ? { comment: String(comment).slice(0, 300) } : {}),
    revoke_benefits: Boolean(oneTime),
  })
}

/**
 * Firma de un webhook (Standard Webhooks): HMAC-SHA256 de `${id}.${timestamp}.${body}`,
 * en base64, en `webhook-signature` («v1,<firma>», puede traer varias separadas por
 * espacio). Polar usó dos llaves según cuándo se creó el secreto: los bytes del secreto
 * `whsec_…` entero, o (Standard Webhooks) la parte después de `whsec_` decodificada de
 * base64. Se aceptan las dos. Ventana de 5 minutos contra repeticiones.
 * @param {{ rawBody: Buffer | string, headers: Record<string, any>, secret: string, now?: number }} args
 */
export function verifyPolarSignature({ rawBody, headers, secret, now = Date.now() }) {
  if (!secret) throw new HttpError(500, 'POLAR_WEBHOOK_SECRET no configurado')
  const id = headers['webhook-id']
  const ts = headers['webhook-timestamp']
  const sigHeader = headers['webhook-signature']
  if (!id || !ts || !sigHeader || rawBody == null) throw new HttpError(401, 'Firma de Polar ausente')
  const seconds = Number(ts)
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > 5 * 60) {
    throw new HttpError(401, 'Firma de Polar vencida')
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)
  const signed = `${id}.${ts}.${body}`
  const raw = String(secret)
  const keys = [Buffer.from(raw, 'utf8')]
  const b64 = raw.startsWith('whsec_') ? raw.slice(6) : raw
  try {
    const decoded = Buffer.from(b64, 'base64')
    if (decoded.length) keys.push(decoded)
  } catch {
    /* no era base64 */
  }
  const given = String(sigHeader)
    .split(' ')
    .map((s) => s.split(',')[1])
    .filter(Boolean)
    .map((s) => Buffer.from(s, 'base64'))
  for (const key of keys) {
    const expected = crypto.createHmac('sha256', key).update(signed).digest()
    if (given.some((g) => g.length === expected.length && crypto.timingSafeEqual(g, expected))) return
  }
  throw new HttpError(401, 'Firma de Polar inválida')
}

/**
 * Una orden de Polar, aplanada: lo que se valida contra la nuestra.
 * @param {any} o
 */
export function parsePolarOrder(o) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null)
  return {
    id: o?.id != null ? String(o.id) : '',
    status: String(o?.status || ''),
    paid: Boolean(o?.paid) || o?.status === 'paid',
    billingReason: String(o?.billing_reason || ''),
    // Antes de impuestos y descuentos: tiene que ser el precio que calculó el servidor.
    subtotalCents: num(o?.subtotal_amount),
    discountCents: num(o?.discount_amount) ?? 0,
    netCents: num(o?.net_amount),
    taxCents: num(o?.tax_amount),
    totalCents: num(o?.total_amount),
    refundedCents: num(o?.refunded_amount) ?? 0,
    currency: String(o?.currency || '').toUpperCase(),
    email: String(o?.customer?.email || ''),
    metadata: o?.metadata && typeof o.metadata === 'object' ? o.metadata : {},
    subscriptionId: o?.subscription_id ? String(o.subscription_id) : null,
    checkoutId: o?.checkout_id ? String(o.checkout_id) : null,
  }
}

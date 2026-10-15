import crypto from 'node:crypto'
import { HttpError } from '../errors.js'

/**
 * Lemon Squeezy (API v1, JSON:API) por `fetch`, sin SDK: cobro internacional en USD
 * como merchant of record (ver docs/lemonsqueezy.md). Acá viven el cliente HTTP, la
 * verificación de la firma de los webhooks y el armado del checkout. Las reglas de
 * negocio (orden pagada, reembolso, baja) van aparte, como con Paddle.
 *
 * A diferencia de Paddle no hay precios efímeros: una orden se cobra sobre UNA variante
 * «ScrollLab order» y el monto sale de `custom_price` (el servidor lo calcula, igual que
 * con Paddle). Montos en centavos enteros.
 *
 * Los datos que identifican la orden viajan en `checkout_data.custom` y vuelven en
 * `meta.custom_data` de cada webhook.
 */

export const LEMON_CURRENCY = 'USD'
const API_BASE = 'https://api.lemonsqueezy.com/v1'

/** Error de la API: `status` HTTP y `code` de la primera falla que informa. */
export class LemonError extends Error {
  constructor(message, { status = 502, code = 'lemon_error', detail = '' } = {}) {
    super(message)
    this.name = 'LemonError'
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
 * Llamada a la API. Devuelve el documento JSON:API completo (`{ data, included, meta }`).
 * Un 4xx sale como LemonError con su status; la red caída o un 5xx, como 502.
 * @param {{ lemon: { apiKey: string, apiBase?: string } }} config
 * @param {string} method
 * @param {string} pathname
 * @param {unknown} [body]
 */
export async function lemonRequest(config, method, pathname, body) {
  const { apiKey, apiBase = API_BASE } = config.lemon
  if (!apiKey) throw new LemonError('Lemon Squeezy no está configurado', { status: 503 })
  let res
  try {
    res = await fetch(`${apiBase}${pathname}`, {
      method,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    throw new LemonError(`Lemon Squeezy no responde: ${err?.message || err}`, { status: 502 })
  }
  /** @type {any} */
  let json = null
  try {
    json = await res.json()
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const first = Array.isArray(json?.errors) ? json.errors[0] || {} : {}
    throw new LemonError(
      `Lemon Squeezy ${method} ${pathname} → ${res.status} ${first.title || ''} ${first.detail || ''}`.trim(),
      { status: res.status >= 500 ? 502 : res.status, code: String(first.status || res.status), detail: first.detail || '' },
    )
  }
  return json
}

const clip = (s, n) => String(s || '').slice(0, n)

/**
 * Cuerpo de `POST /v1/checkouts` de una orden del market o del builder: una sola línea
 * (la variante genérica) con el total que calculó el servidor, el cupón ya aplicado.
 * `title` y `description` son lo que ve el comprador en la pantalla de pago.
 * @param {{ storeId: string | number, variantId: string | number, orderId: string, userId: string,
 *   title: string, description?: string, totalUsd: number, email?: string, name?: string,
 *   redirectUrl: string, testMode?: boolean }} args
 */
export function buildCheckoutBody({
  storeId,
  variantId,
  orderId,
  userId,
  title,
  description,
  totalUsd,
  email,
  name,
  redirectUrl,
  testMode = false,
}) {
  return {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: usdCents(totalUsd),
        product_options: {
          name: clip(title, 150),
          description: clip(description || title, 1000),
          redirect_url: redirectUrl,
          receipt_button_text: 'Ver mi compra',
          receipt_link_url: redirectUrl,
        },
        checkout_options: { embed: false, media: false, logo: true, desc: true, discount: false },
        checkout_data: {
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          custom: { kind: 'order', orderId: String(orderId), userId: String(userId) },
        },
        test_mode: Boolean(testMode),
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }
}

/**
 * Crea el checkout y devuelve su URL (`https://<tienda>.lemonsqueezy.com/checkout/custom/…`).
 * @param {any} config
 * @param {ReturnType<typeof buildCheckoutBody>} body
 */
export async function createCheckout(config, body) {
  const json = await lemonRequest(config, 'POST', '/checkouts', body)
  const url = json?.data?.attributes?.url
  if (!url) throw new LemonError('Lemon Squeezy no devolvió la URL del checkout', { status: 502 })
  return { id: String(json.data.id), url: String(url) }
}

/** Orden de Lemon Squeezy (estado, total y reembolsos). */
export async function getOrder(config, id) {
  const json = await lemonRequest(config, 'GET', `/orders/${encodeURIComponent(id)}`)
  return json?.data
}

/**
 * Reembolso de una orden. Sin `amountCents` es total. (Verificar el contrato exacto en
 * test mode: ver docs/lemonsqueezy.md.)
 * @param {any} config
 * @param {string} id id de la orden en Lemon Squeezy
 * @param {number} [amountCents]
 */
export async function refundOrder(config, id, amountCents) {
  const attributes = amountCents ? { amount: Math.round(amountCents) } : {}
  const json = await lemonRequest(config, 'POST', `/orders/${encodeURIComponent(id)}/refund`, {
    data: { type: 'orders', id: String(id), attributes },
  })
  return json?.data
}

/**
 * Verifica `X-Signature`: HMAC-SHA256 hex del cuerpo crudo con el secreto del webhook.
 * Lemon Squeezy no manda marca de tiempo: un evento repetido se resuelve por idempotencia
 * (la orden ya está pagada / reembolsada), no por ventana de tiempo.
 * @param {{ rawBody: Buffer | string, header: string | undefined, secret: string }} args
 */
export function verifyLemonSignature({ rawBody, header, secret }) {
  if (!secret) throw new HttpError(500, 'LEMONSQUEEZY_WEBHOOK_SECRET no configurado')
  if (!header || rawBody == null) throw new HttpError(401, 'Firma de Lemon Squeezy ausente')
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody))
  const expected = crypto.createHmac('sha256', secret).update(body).digest()
  const given = String(header).trim()
  if (!/^[a-f0-9]{64}$/i.test(given)) throw new HttpError(401, 'Firma de Lemon Squeezy inválida')
  if (!crypto.timingSafeEqual(expected, Buffer.from(given, 'hex'))) {
    throw new HttpError(401, 'Firma de Lemon Squeezy inválida')
  }
}

/**
 * Lo que importa de un webhook, ya aplanado: nombre del evento, datos propios (`custom`)
 * y la orden o suscripción que lo trae.
 * @param {any} payload cuerpo JSON ya parseado
 */
export function parseLemonEvent(payload) {
  const meta = payload?.meta || {}
  const data = payload?.data || {}
  const a = data.attributes || {}
  return {
    name: String(meta.event_name || ''),
    custom: meta.custom_data && typeof meta.custom_data === 'object' ? meta.custom_data : {},
    type: String(data.type || ''),
    id: data.id != null ? String(data.id) : '',
    status: String(a.status || ''),
    totalCents: Number.isFinite(Number(a.total)) ? Number(a.total) : null,
    currency: String(a.currency || ''),
    email: String(a.user_email || ''),
    refunded: Boolean(a.refunded),
    refundedAmountCents: Number.isFinite(Number(a.refunded_amount)) ? Number(a.refunded_amount) : null,
    testMode: Boolean(a.test_mode),
  }
}

import crypto from 'node:crypto'
import { HttpError } from '../errors.js'

/**
 * Paddle Billing (API v1) por `fetch`, sin SDK: cobro internacional en USD del
 * market, del builder y de LAB (ver docs/paddle.md). Acá viven el cliente
 * HTTP, la verificación de la firma de los webhooks y el armado de las
 * transacciones; las reglas de negocio están en paddlePayments.js y en
 * subscriptions/paddleSync.js.
 *
 * Los precios viajan como ítems non-catalog: el servidor arma el precio en el
 * momento (el builder no tiene un precio fijo) y Paddle crea la entidad
 * efímera. Montos en centavos y como string, como pide la API.
 */

export const PADDLE_CURRENCY = 'USD'

/** Error de la API de Paddle: `status` HTTP y `code` de Paddle. */
export class PaddleError extends Error {
  constructor(message, { status = 502, code = 'paddle_error', detail = '' } = {}) {
    super(message)
    this.name = 'PaddleError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/** USD con decimales → centavos enteros. */
export function usdCents(amount) {
  return Math.round(Number(amount) * 100)
}

/** Centavos → USD (número con hasta dos decimales). */
export function centsToUsd(cents) {
  return Math.round(Number(cents)) / 100
}

/**
 * Llamada a la API. Devuelve `data` (o la respuesta entera con `{ raw: true }`).
 * Un 4xx de Paddle sale como PaddleError con su status; la red caída o un 5xx,
 * como 502.
 */
export async function paddleRequest(config, method, pathname, body, { raw = false } = {}) {
  const { apiBase, apiKey } = config.paddle
  if (!apiKey) throw new PaddleError('Paddle no está configurado', { status: 503 })
  let res
  try {
    res = await fetch(`${apiBase}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Paddle-Version': '1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    throw new PaddleError(`Paddle no responde: ${err?.message || err}`, { status: 502 })
  }
  /** @type {any} */
  let json = null
  try {
    json = await res.json()
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const e = json?.error || {}
    const fields = Array.isArray(e.errors)
      ? e.errors.map((f) => `${f.field}: ${f.message}`).join('; ')
      : ''
    throw new PaddleError(
      `Paddle ${method} ${pathname} → ${res.status} ${e.code || ''} ${e.detail || ''} ${fields}`.trim(),
      { status: res.status >= 500 ? 502 : res.status, code: e.code, detail: e.detail || '' },
    )
  }
  return raw ? json : json?.data
}

export const createTransaction = (config, body) =>
  paddleRequest(config, 'POST', '/transactions', body)

export const getTransaction = (config, id) =>
  paddleRequest(config, 'GET', `/transactions/${encodeURIComponent(id)}`)

/** Cancela una transacción que nadie pagó (`draft` / `ready`). */
export const cancelTransaction = (config, id) =>
  paddleRequest(config, 'PATCH', `/transactions/${encodeURIComponent(id)}`, {
    status: 'canceled',
  })

export const getSubscription = (config, id) =>
  paddleRequest(config, 'GET', `/subscriptions/${encodeURIComponent(id)}`)

/** Baja al fin del período pago (o ya mismo con `immediately`). */
export const cancelSubscription = (config, id, effectiveFrom = 'next_billing_period') =>
  paddleRequest(config, 'POST', `/subscriptions/${encodeURIComponent(id)}/cancel`, {
    effective_from: effectiveFrom,
  })

export const updateSubscription = (config, id, body) =>
  paddleRequest(config, 'PATCH', `/subscriptions/${encodeURIComponent(id)}`, body)

export const previewSubscriptionUpdate = (config, id, body) =>
  paddleRequest(config, 'PATCH', `/subscriptions/${encodeURIComponent(id)}/preview`, body)

/** Reembolso o crédito sobre una transacción (POST /adjustments). */
export const createAdjustment = (config, body) => paddleRequest(config, 'POST', '/adjustments', body)

/** Cargo único sobre una suscripción (la diferencia de una subida de plan). */
export const chargeSubscription = (config, id, body) =>
  paddleRequest(config, 'POST', `/subscriptions/${encodeURIComponent(id)}/charge`, body)

/**
 * Verifica `Paddle-Signature: ts=…;h1=…` (HMAC-SHA256 de `ts:body crudo` con el
 * secreto del destination). Acepta cualquiera de los `h1` (rotación de
 * secreto). La tolerancia cubre el desfase de relojes; cada reintento de Paddle
 * viene firmado de nuevo, así que un evento viejo es una repetición.
 */
export function verifyPaddleSignature({
  rawBody,
  header,
  secret,
  now = Date.now(),
  toleranceSec = 300,
}) {
  if (!secret) throw new HttpError(500, 'PADDLE_WEBHOOK_SECRET no configurado')
  if (!header || rawBody == null) throw new HttpError(401, 'Firma de Paddle ausente')
  let ts = null
  const signatures = []
  for (const part of String(header).split(';')) {
    const [k, v] = part.split('=')
    if (k?.trim() === 'ts') ts = v?.trim()
    if (k?.trim() === 'h1' && v) signatures.push(v.trim())
  }
  if (!ts || !/^\d+$/.test(ts) || signatures.length === 0) {
    throw new HttpError(401, 'Firma de Paddle inválida')
  }
  if (Math.abs(now / 1000 - Number(ts)) > toleranceSec) {
    throw new HttpError(401, 'Firma de Paddle vencida')
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody))
  const expected = crypto
    .createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${ts}:`), body]))
    .digest()
  const ok = signatures.some((sig) => {
    if (!/^[a-f0-9]{64}$/i.test(sig)) return false
    return crypto.timingSafeEqual(expected, Buffer.from(sig, 'hex'))
  })
  if (!ok) throw new HttpError(401, 'Firma de Paddle inválida')
}

/** Lo que el front necesita para abrir Paddle.js (el token es público). */
export function paddleClientInfo(config) {
  return {
    environment: config.paddle.environment,
    clientToken: config.paddle.clientToken,
  }
}

const clip = (s, n) => String(s || '').slice(0, n)

/** Imagen del producto en el checkout: solo URLs https (Paddle rechaza el resto). */
function httpsImage(clientUrl, picture) {
  if (!picture || !String(clientUrl).startsWith('https://')) return undefined
  return new URL(picture, clientUrl).toString()
}

/**
 * Transacción de una orden del market o del builder: un ítem non-catalog por
 * línea, con el precio que calculó el servidor (cupón incluido).
 * @param {{ orderId: string, userId: string, lines: Array<{ title: string, description?: string, sku: string, unit_price: number, picture?: string }>, taxCategory: string, clientUrl: string }} args
 */
export function buildOrderTransactionBody({ orderId, userId, lines, taxCategory, clientUrl }) {
  return {
    currency_code: PADDLE_CURRENCY,
    collection_mode: 'automatic',
    custom_data: { kind: 'order', orderId: String(orderId), userId: String(userId) },
    items: lines.map((line) => ({
      quantity: 1,
      price: {
        name: clip(line.title, 150),
        description: clip(`${line.sku} — ${line.title}`, 500),
        unit_price: {
          amount: String(usdCents(line.unit_price)),
          currency_code: PADDLE_CURRENCY,
        },
        quantity: { minimum: 1, maximum: 1 },
        product: {
          name: clip(line.title, 200),
          tax_category: taxCategory,
          description: clip(line.description || line.title, 2048),
          image_url: httpsImage(clientUrl, line.picture),
        },
      },
    })),
  }
}

const LAB_TIER_NAME = { starter: 'Starter', pro: 'Pro', studio: 'Studio' }

/**
 * Precio recurrente non-catalog de un plan de LAB (alta y cambio de plan).
 * @param {{ tier: string, cycle: 'monthly' | 'yearly', amountUsd: number, taxCategory: string, trialDays?: number }} args
 */
export function labPrice({ tier, cycle, amountUsd, taxCategory, trialDays = 0 }) {
  const tierName = LAB_TIER_NAME[tier] || tier
  const yearly = cycle === 'yearly'
  return {
    name: `LAB ${tierName} — ${yearly ? 'yearly' : 'monthly'}`,
    description: `ScrollLab LAB ${tierName} (${cycle})`,
    unit_price: { amount: String(usdCents(amountUsd)), currency_code: PADDLE_CURRENCY },
    billing_cycle: { interval: yearly ? 'year' : 'month', frequency: 1 },
    ...(trialDays > 0 ? { trial_period: { interval: 'day', frequency: trialDays } } : {}),
    quantity: { minimum: 1, maximum: 1 },
    product: {
      name: `ScrollLab LAB ${tierName}`,
      tax_category: taxCategory,
      description: 'Live scrollytelling sections embedded on your own site.',
    },
  }
}

/**
 * Precio único (non-catalog) de la diferencia al subir de plan: lo que queda
 * del período, calculado por nosotros igual que en Mercado Pago.
 * @param {{ tier: string, amountUsd: number, days?: number | null, taxCategory: string }} args
 */
export function labUpgradeChargeItem({ tier, amountUsd, days, taxCategory }) {
  const tierName = LAB_TIER_NAME[tier] || tier
  const rest = days ? ` — ${days} ${days === 1 ? 'day' : 'days'} left in the period` : ''
  return {
    quantity: 1,
    price: {
      name: `Upgrade to LAB ${tierName}`,
      description: `ScrollLab LAB: upgrade to ${tierName}${rest}`,
      unit_price: { amount: String(usdCents(amountUsd)), currency_code: PADDLE_CURRENCY },
      quantity: { minimum: 1, maximum: 1 },
      product: {
        name: `ScrollLab LAB ${tierName} — upgrade`,
        tax_category: taxCategory,
        description: 'Prorated difference for the rest of the current billing period.',
      },
    },
  }
}

/**
 * Transacción del alta de una suscripción de LAB. `trialDays` es la prueba
 * gratis o los días ya pagos de una baja (el primer cobro es cuando terminan).
 */
export function buildSubscriptionTransactionBody({
  subscriptionId,
  userId,
  plan,
  tier,
  cycle,
  amountUsd,
  trialDays,
  taxCategory,
}) {
  return {
    currency_code: PADDLE_CURRENCY,
    collection_mode: 'automatic',
    custom_data: {
      kind: 'lab',
      subscriptionId: String(subscriptionId),
      userId: String(userId),
      plan,
      cycle,
    },
    items: [{ quantity: 1, price: labPrice({ tier, cycle, amountUsd, taxCategory, trialDays }) }],
  }
}

/** Días enteros (hacia arriba) hasta `date`; 0 si ya pasó. */
export function daysUntil(date, now = Date.now()) {
  if (!date) return 0
  const ms = new Date(date).getTime() - now
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}

/**
 * Suma de los precios de la transacción (`unit_price × quantity`) en centavos,
 * antes de impuestos: lo que puso el servidor. Paddle suma el IVA aparte según
 * el país, así que el control es contra esto y no contra el total cobrado.
 */
export function transactionItemsCents(txn) {
  return (txn?.items || []).reduce((sum, item) => {
    const amount = Number(item?.price?.unit_price?.amount)
    const qty = Number(item?.quantity ?? 1)
    return sum + (Number.isFinite(amount) ? amount * qty : NaN)
  }, 0)
}

/** Estados de una transacción que ya están cobrados. */
export const PADDLE_PAID_STATUSES = new Set(['paid', 'completed'])

/** Total cobrado (con impuestos) en USD, para logs y alertas. */
export function transactionGrandTotal(txn) {
  const t = txn?.details?.totals
  const cents = Number(t?.grand_total ?? t?.total)
  return Number.isFinite(cents) ? centsToUsd(cents) : null
}

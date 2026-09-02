import {
  MercadoPagoConfig,
  Preference,
  Payment,
  PreApproval,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from 'mercadopago'
import { PRODUCTS } from '../catalog.js'
import { HttpError } from '../validation.js'

/** Máx. 13 caracteres: sale en el resumen de la tarjeta del comprador. */
export const MP_STATEMENT_DESCRIPTOR = 'SCROLLLAB'

/** Imagen del ítem en Checkout Pro (PNG/JPG públicos; no el logo del comercio). */
export const MP_DEFAULT_ITEM_PICTURE = '/icon-512.png'

export function createMpClient(accessToken) {
  return new MercadoPagoConfig({ accessToken })
}

export function absoluteClientAsset(clientUrl, path) {
  const base = String(clientUrl || '').replace(/\/$/, '')
  const rel = String(path || MP_DEFAULT_ITEM_PICTURE)
  const normalized = rel.startsWith('/') ? rel : `/${rel}`
  return `${base}${normalized}`
}

function picturePathForSku(sku) {
  const key = String(sku || '').startsWith('custom') ? 'custom' : String(sku || '')
  return PRODUCTS[key]?.picture || MP_DEFAULT_ITEM_PICTURE
}

/** Body de la preference — puro, testeable sin pegarle a MP. */
export function buildPreferenceBody({
  items,
  orderId,
  userId,
  clientUrl,
  apiPublicUrl,
}) {
  return {
    items: items.map((i) => ({
      id: i.sku,
      title: i.title,
      quantity: 1,
      unit_price: i.unit_price,
      currency_id: i.currency_id,
      picture_url: absoluteClientAsset(
        clientUrl,
        i.picture || picturePathForSku(i.sku),
      ),
    })),
    external_reference: orderId,
    metadata: { orderId, userId },
    back_urls: {
      success: `${clientUrl}/checkout/success`,
      failure: `${clientUrl}/checkout/failure`,
      pending: `${clientUrl}/checkout/success`,
    },
    auto_return: 'approved',
    notification_url: `${apiPublicUrl}/api/webhooks/mercadopago`,
    statement_descriptor: MP_STATEMENT_DESCRIPTOR,
  }
}

export async function createCheckoutPreference({
  accessToken,
  items,
  orderId,
  userId,
  clientUrl,
  apiPublicUrl,
}) {
  const client = createMpClient(accessToken)
  const preference = new Preference(client)
  return preference.create({
    body: buildPreferenceBody({
      items,
      orderId,
      userId,
      clientUrl,
      apiPublicUrl,
    }),
  })
}

export function verifyMpWebhookSignature({
  secret,
  xSignature,
  xRequestId,
  dataId,
}) {
  if (!secret) {
    throw new HttpError(500, 'MP_WEBHOOK_SECRET no configurado')
  }
  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret,
    })
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      throw new HttpError(401, 'Firma de webhook inválida')
    }
    throw err
  }
}

/**
 * El SDK de MP tira el body JSON del error, no un Error: sin traducir, un 404
 * (token de otro entorno) o un timeout salían como 500 «Error interno».
 * Solo 400/404 son definitivos; el resto se marca 5xx para que el webhook
 * reintente, con `expose` para que el comprador vea algo útil igual.
 */
export function mpPaymentError(err, paymentId) {
  const status = Number(err?.status || err?.statusCode) || 0
  const detail = String(err?.error || err?.message || err || '').slice(0, 300)
  console.error(
    `MP payment fetch failed payment=${paymentId} status=${status || '-'} detail=${detail}`,
  )

  if (status === 404) {
    return new HttpError(
      404,
      'Mercado Pago no reconoce ese pago con las credenciales configuradas',
    )
  }
  if (status === 401 || status === 403) {
    return new HttpError(
      502,
      'No pudimos validar el pago con Mercado Pago (credenciales rechazadas)',
      { expose: true },
    )
  }
  if (status === 429 || status >= 500) {
    return new HttpError(503, 'Mercado Pago no está respondiendo, probá en un momento', {
      expose: true,
    })
  }
  if (status >= 400) {
    return new HttpError(400, 'Mercado Pago rechazó la consulta de ese pago')
  }
  return new HttpError(504, 'No pudimos comunicarnos con Mercado Pago', {
    expose: true,
  })
}

// ————————————————————————————————————————————————————————————————
// Suscripciones (PreApproval) — LAB, Fase 4. Misma app de MP, token aparte.
// Sin plan pre-creado: el monto va inline en cada alta. Solo hace falta
// MP_SUBS_ACCESS_TOKEN — nada de seed ni plan IDs.
// ————————————————————————————————————————————————————————————————

/** Body del preapproval — puro, testeable sin pegarle a MP. */
export function buildPreapprovalBody({
  reason,
  amount,
  currencyId = 'ARS',
  frequency,
  frequencyType,
  payerEmail,
  externalReference,
  backUrl,
}) {
  return {
    reason,
    external_reference: externalReference,
    payer_email: payerEmail,
    back_url: backUrl,
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: amount,
      currency_id: currencyId,
    },
    status: 'pending',
  }
}

/** Alta de una suscripción con monto inline. Devuelve `init_point`. */
export async function createPreapproval({ accessToken, ...rest }) {
  const pa = new PreApproval(createMpClient(accessToken))
  return pa.create({ body: buildPreapprovalBody(rest) })
}

export async function fetchPreapproval(accessToken, id) {
  const pa = new PreApproval(createMpClient(accessToken))
  try {
    return await pa.get({ id })
  } catch (err) {
    throw mpPaymentError(err, id)
  }
}

/**
 * Trae un authorized_payment (una cuota cobrada de una suscripción). El SDK no
 * lo expone, así que va por REST. Devuelve, entre otros, `preapproval_id` y
 * `status` (`processed` = cobrado) + `payment.status`.
 */
export async function fetchAuthorizedPayment(accessToken, id) {
  const res = await fetch(
    `https://api.mercadopago.com/authorized_payments/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw mpPaymentError({ status: res.status }, id)
  return res.json()
}

export async function cancelPreapproval(accessToken, id) {
  const pa = new PreApproval(createMpClient(accessToken))
  return pa.update({ id, body: { status: 'cancelled' } })
}

export async function fetchPayment(accessToken, paymentId) {
  const client = createMpClient(accessToken)
  const paymentApi = new Payment(client)
  try {
    return await paymentApi.get({ id: paymentId })
  } catch (err) {
    throw mpPaymentError(err, paymentId)
  }
}

/**
 * Comprueba que el pago aprobado coincide con la orden local.
 */
export function assertPaymentMatchesOrder(payment, order) {
  if (payment.status !== 'approved') {
    throw new HttpError(400, 'Pago no aprobado')
  }
  const amount = Number(payment.transaction_amount)
  const currency = payment.currency_id
  if (currency !== order.currency_id) {
    throw new HttpError(400, 'Moneda del pago no coincide')
  }
  if (Number(order.total) !== amount) {
    throw new HttpError(400, 'Monto del pago no coincide')
  }
  const ref = String(payment.external_reference || payment.metadata?.orderId || '')
  const orderId = String(order.id || order._id || '')
  if (ref && orderId && ref !== orderId) {
    throw new HttpError(400, 'Referencia de orden no coincide')
  }
}

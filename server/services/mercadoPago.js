import {
  MercadoPagoConfig,
  Preference,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from 'mercadopago'
import { HttpError } from '../validation.js'

export function createMpClient(accessToken) {
  return new MercadoPagoConfig({ accessToken })
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
    body: {
      items: items.map((i) => ({
        id: i.sku,
        title: i.title,
        quantity: 1,
        unit_price: i.unit_price,
        currency_id: i.currency_id,
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
    },
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

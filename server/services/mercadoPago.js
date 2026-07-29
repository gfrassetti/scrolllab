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

export async function fetchPayment(accessToken, paymentId) {
  const client = createMpClient(accessToken)
  const paymentApi = new Payment(client)
  return paymentApi.get({ id: paymentId })
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

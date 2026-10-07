import { Resend } from 'resend'
import { db } from '../db.js'
import {
  escapeHtml,
  buildOrderReceipt,
  buildOrderAdminNotify,
  buildSubscriptionWelcome,
  buildSubscriptionCanceled,
  buildSubscriptionTrialReminder,
  buildCouponEmail,
} from './emailTemplates.js'
import {
  buildOrderPaymentFailed,
  buildSubscriptionCharge,
  buildSubscriptionPaymentFailed,
  buildWithdrawalReceived,
} from './emailTemplatesBilling.js'

// Los mails se arman en emailTemplates.js; quien los necesita sin enviar
// (tests, vista previa) los sigue importando de acá.
export {
  buildOrderReceipt,
  buildOrderAdminNotify,
  buildSubscriptionWelcome,
  buildSubscriptionCanceled,
  buildSubscriptionTrialReminder,
  buildCouponEmail,
  buildOrderPaymentFailed,
  buildSubscriptionCharge,
  buildSubscriptionPaymentFailed,
  buildWithdrawalReceived,
}

/**
 * Confirmación del botón de arrepentimiento, con el código de seguimiento.
 * Idempotente por código (clave de Resend): un reintento no repite el mail.
 * @param {{ code: string, email: string, name: string, locale?: string, order?: any, config: any, client?: any }} args
 */
export async function sendWithdrawalReceived({ code, email, name, locale, order, config, client }) {
  if (!config.email.enabled) return { skipped: 'disabled' }
  const refundsUrl = new URL('/legal/refunds', config.clientUrl).toString()
  const logoUrl =
    config.email.logoUrl || new URL('/logo.svg', config.clientUrl).toString()
  const message = buildWithdrawalReceived({ code, name, locale, order, refundsUrl, logoUrl })
  const resend = client || new Resend(config.email.apiKey)
  const response = await resend.emails.send(
    {
      from: config.email.from,
      to: [email],
      replyTo: config.email.replyTo || undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'type', value: 'withdrawal_received' }],
    },
    { idempotencyKey: `scrolllab-withdrawal-${code}` },
  )
  if (response.error) {
    throw new Error(response.error.message || 'Resend rechazó el correo')
  }
  return { sent: true, id: response.data?.id || null }
}

/**
 * Envía una sola confirmación por orden. Resend también recibe una
 * Idempotency-Key estable para cubrir reintentos tras cortes de proceso.
 * @param {{ order: any, user: any, config: any, client?: any }} args
 */
export async function sendOrderReceiptOnce({ order, user, config, client }) {
  if (!config.email.enabled) return { skipped: 'disabled' }

  const orderId = String(db.uid(order) || order.id)
  const claimed = await db.claimReceiptEmail(orderId)
  if (!claimed) return { skipped: 'already-sent-or-in-progress' }

  const accountUrl = new URL('/account', config.clientUrl).toString()
  const logoUrl =
    config.email.logoUrl || new URL('/logo.svg', config.clientUrl).toString()
  const message = buildOrderReceipt({
    order: claimed,
    user,
    accountUrl,
    logoUrl,
  })

  const resend = client || new Resend(config.email.apiKey)

  try {
    const response = await resend.emails.send(
      {
        from: config.email.from,
        to: [user.email],
        replyTo: config.email.replyTo || undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [{ name: 'type', value: 'order_receipt' }],
      },
      { idempotencyKey: `scrolllab-order-${orderId}` },
    )

    if (response.error) {
      throw new Error(response.error.message || 'Resend rechazó el correo')
    }

    await db.completeReceiptEmail(orderId, response.data?.id || null)
    return { sent: true, id: response.data?.id || null }
  } catch (err) {
    await db.releaseReceiptEmail(orderId, err.message)
    throw err
  }
}

/**
 * «Pago rechazado» de una compra (Mercado Pago o Paddle): uno por orden, y
 * solo si la orden sigue pendiente (un reintento que pagó ya no lo manda). El
 * botón lleva al carrito, que sigue armado.
 * @param {{ order: any, config: any, client?: any }} args
 */
export async function sendOrderPaymentFailedOnce({ order, config, client }) {
  if (!config.email.enabled) return { skipped: 'disabled' }

  const orderId = String(db.uid(order) || order.id)
  const claimed = await db.claimFailedEmail(orderId)
  if (!claimed) return { skipped: 'already-sent-or-not-pending' }

  const user = await db.findUserById(String(claimed.userId))
  if (!user?.email) {
    await db.releaseFailedEmail(orderId, 'usuario sin email')
    return { skipped: 'no-user-email' }
  }

  const retryUrl = new URL('/cart', config.clientUrl).toString()
  const logoUrl =
    config.email.logoUrl || new URL('/logo.svg', config.clientUrl).toString()
  const message = buildOrderPaymentFailed({ order: claimed, user, retryUrl, logoUrl })
  const resend = client || new Resend(config.email.apiKey)

  try {
    const response = await resend.emails.send(
      {
        from: config.email.from,
        to: [user.email],
        replyTo: config.email.replyTo || undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [{ name: 'type', value: 'order_payment_failed' }],
      },
      { idempotencyKey: `scrolllab-order-failed-${orderId}` },
    )
    if (response.error) {
      throw new Error(response.error.message || 'Resend rechazó el correo')
    }
    await db.completeFailedEmail(orderId, response.data?.id || null)
    return { sent: true, id: response.data?.id || null }
  } catch (err) {
    await db.releaseFailedEmail(orderId, err.message)
    throw err
  }
}

const SUB_EMAIL = {
  welcome: {
    build: buildSubscriptionWelcome,
    tag: 'subscription_welcome',
    idPrefix: 'scrolllab-sub-welcome',
  },
  canceled: {
    build: buildSubscriptionCanceled,
    tag: 'subscription_canceled',
    idPrefix: 'scrolllab-sub-canceled',
  },
  trialReminder: {
    build: buildSubscriptionTrialReminder,
    tag: 'subscription_trial_reminder',
    idPrefix: 'scrolllab-sub-trial-reminder',
  },
  // Por evento (uno por cobro): el `ref` entra en la clave de idempotencia.
  charge: {
    build: buildSubscriptionCharge,
    tag: 'subscription_charge',
    idPrefix: 'scrolllab-sub-charge',
  },
  paymentFailed: {
    build: buildSubscriptionPaymentFailed,
    tag: 'subscription_payment_failed',
    idPrefix: 'scrolllab-sub-payment-failed',
  },
}

/**
 * Un solo mail de suscripción por evento (`welcome` al activarse / `canceled`
 * al dar de baja / `trialReminder` antes del primer cobro). Idempotente por el
 * claim en DB + Idempotency-Key de Resend. Fire-and-forget desde los paths que
 * disparan (webhook / sync / cancel route); el aviso sale del barrido de
 * services/trialReminders.js, que pasa `withinMs` (el plazo) y `now`.
 * `charge` / `paymentFailed` son uno por cobro: `ref` identifica el cobro y
 * `extra` lleva sus datos al armado del mail.
 * @param {{ kind: string, subscription: any, config: any, client?: any, withinMs?: number, now?: Date, ref?: string, extra?: Record<string, any> }} args
 */
async function sendSubscriptionEmailOnce({
  kind,
  subscription,
  config,
  client,
  withinMs,
  now,
  ref,
  extra = {},
}) {
  if (!config.email.enabled) return { skipped: 'disabled' }
  const spec = SUB_EMAIL[kind]

  const subId = String(db.uid(subscription) || subscription.id)
  const claimed = await db.claimSubscriptionEmail(subId, kind, { withinMs, now, ref })
  if (!claimed) return { skipped: 'already-sent-or-not-applicable' }

  const user = await db.findUserById(String(claimed.userId))
  if (!user?.email) {
    await db.releaseSubscriptionEmail(subId, kind, 'usuario sin email')
    return { skipped: 'no-user-email' }
  }

  const accountUrl = new URL('/lab', config.clientUrl).toString()
  const logoUrl =
    config.email.logoUrl || new URL('/logo.svg', config.clientUrl).toString()
  const message = spec.build({ subscription: claimed, user, accountUrl, logoUrl, ...extra })

  const resend = client || new Resend(config.email.apiKey)
  try {
    const response = await resend.emails.send(
      {
        from: config.email.from,
        to: [user.email],
        replyTo: config.email.replyTo || undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [{ name: 'type', value: spec.tag }],
      },
      { idempotencyKey: ref ? `${spec.idPrefix}-${subId}-${ref}` : `${spec.idPrefix}-${subId}` },
    )
    if (response.error) {
      throw new Error(response.error.message || 'Resend rechazó el correo')
    }
    await db.completeSubscriptionEmail(subId, kind, response.data?.id || null)
    return { sent: true, id: response.data?.id || null }
  } catch (err) {
    await db.releaseSubscriptionEmail(subId, kind, err.message)
    throw err
  }
}

/**
 * @param {{ subscription: any, config: any, client?: any }} args
 */
export function sendSubscriptionWelcomeOnce({ subscription, config, client }) {
  return sendSubscriptionEmailOnce({ kind: 'welcome', subscription, config, client })
}

/**
 * @param {{ subscription: any, config: any, client?: any }} args
 */
export function sendSubscriptionCanceledOnce({ subscription, config, client }) {
  return sendSubscriptionEmailOnce({
    kind: 'canceled',
    subscription,
    config,
    client,
  })
}

/** Aviso de fin de prueba: solo si termina dentro de `withinMs` (ms) y sigue sin cancelar. */
/**
 * @param {{ subscription: any, config: any, client?: any, withinMs?: number, now?: Date }} args
 */
export function sendSubscriptionTrialReminderOnce({
  subscription,
  config,
  client,
  withinMs,
  now,
}) {
  return sendSubscriptionEmailOnce({
    kind: 'trialReminder',
    subscription,
    config,
    client,
    withinMs,
    now,
  })
}

/**
 * Cuota de LAB cobrada (MP o Paddle). Una por cobro (`ref`).
 * @param {{ subscription: any, config: any, ref: string, charge?: { amount?: number | null, currency?: string, paidAt?: any, periodEnd?: any }, client?: any }} args
 */
export function sendSubscriptionChargeOnce({ subscription, config, ref, charge, client }) {
  return sendSubscriptionEmailOnce({
    kind: 'charge',
    subscription,
    config,
    client,
    ref,
    extra: { charge },
  })
}

/**
 * Cobro de LAB rechazado (MP o Paddle). Uno por cobro (`ref`).
 * @param {{ subscription: any, config: any, ref: string, stage?: 'renewal' | 'checkout', updateUrl?: string | null, graceEndsAt?: any, client?: any }} args
 */
export function sendSubscriptionPaymentFailedOnce({
  subscription,
  config,
  ref,
  stage = 'renewal',
  updateUrl = null,
  graceEndsAt = null,
  client,
}) {
  return sendSubscriptionEmailOnce({
    kind: 'paymentFailed',
    subscription,
    config,
    client,
    ref,
    extra: { stage, updateUrl, graceEndsAt },
  })
}

/**
 * Aviso interno al dueño del marketplace. Idempotente vía Resend (webhook + confirm).
 * @param {{ order: any, user: any, config: any, client?: any }} args
 */
export async function sendOrderAdminNotifyOnce({ order, user, config, client }) {
  if (!config.email.enabled) return { skipped: 'disabled' }

  const notifyTo = config.email.notifyTo
  if (!notifyTo) return { skipped: 'no-notify-to' }

  const orderId = String(db.uid(order) || order.id)
  const message = buildOrderAdminNotify({ order, user })
  const resend = client || new Resend(config.email.apiKey)

  const response = await resend.emails.send(
    {
      from: config.email.from,
      to: [notifyTo],
      replyTo: user.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'type', value: 'order_admin' }],
    },
    { idempotencyKey: `scrolllab-order-admin-${orderId}` },
  )

  if (response.error) {
    throw new Error(response.error.message || 'Resend rechazó el aviso interno')
  }

  return { sent: true, id: response.data?.id || null }
}

/**
 * Aviso interno de un pago que pide acción a mano (reembolsar, entregar).
 * Uno por evento: la clave de idempotencia evita que los reintentos del
 * webhook repitan el mail. Sin mail configurado queda solo el log.
 * @param {{ kind: string, key: string, subject: string, lines: string[], config: any, client?: any }} args
 */
export async function sendAdminAlert({ kind, key, subject, lines, config, client }) {
  if (!config?.email?.enabled) return { skipped: 'disabled' }
  const notifyTo = config.email.notifyTo
  if (!notifyTo) return { skipped: 'no-notify-to' }
  const resend = client || new Resend(config.email.apiKey)
  const text = lines.join('\n')
  const response = await resend.emails.send(
    {
      from: config.email.from,
      to: [notifyTo],
      subject: `[SCROLLLAB] ${subject}`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">${lines
        .map((line) => escapeHtml(line))
        .join('<br>')}</div>`,
      text,
      tags: [{ name: 'type', value: `alert_${kind}` }],
    },
    { idempotencyKey: `scrolllab-alert-${kind}-${key}` },
  )
  if (response.error) {
    throw new Error(response.error.message || 'Resend rechazó el aviso')
  }
  return { sent: true, id: response.data?.id || null }
}

/**
 * Manda el cupón al mail del lead. Idempotente vía Resend (una key por lead):
 * un reintento no duplica el mail.
 * @param {{ lead: any, config: any, client?: any }} args
 */
export async function sendCouponEmail({ lead, config, client }) {
  if (!config.email.enabled) return { skipped: 'disabled' }
  if (!lead?.couponCode) return { skipped: 'no-coupon' }

  const logoUrl =
    config.email.logoUrl || new URL('/logo.svg', config.clientUrl).toString()
  const message = buildCouponEmail({
    code: lead.couponCode,
    percent: lead.couponPercent,
    expiresAt: lead.couponExpiresAt,
    email: lead.email,
    locale: lead.locale,
    shopUrl: config.clientUrl,
    logoUrl,
  })
  const resend = client || new Resend(config.email.apiKey)

  const response = await resend.emails.send(
    {
      from: config.email.from,
      to: [lead.email],
      replyTo: config.email.replyTo || undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'type', value: 'welcome_coupon' }],
    },
    { idempotencyKey: `scrolllab-coupon-${db.uid(lead) || lead.id}` },
  )

  if (response.error) {
    throw new Error(response.error.message || 'Resend rechazó el cupón')
  }

  return { sent: true, id: response.data?.id || null }
}

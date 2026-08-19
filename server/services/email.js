import { Resend } from 'resend'
import { db } from '../db.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function buildOrderReceipt({ order, user, accountUrl, logoUrl }) {
  const orderId = String(db.uid(order) || order.id)
  const buyerName = user.name || user.email
  const itemRows = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #dedad2;color:#161412;font-size:15px;">
            ${escapeHtml(item.title || item.sku)}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #dedad2;color:#161412;font-size:15px;text-align:right;white-space:nowrap;">
            ${escapeHtml(formatMoney(item.unit_price, item.currency_id || order.currency_id))}
          </td>
        </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <div style="display:none;max-height:0;overflow:hidden;">
      Tu compra en SCROLLLAB está lista para descargar.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f2efe9;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #d6d1c8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="SCROLLLAB" style="display:block;border:0;" />
                    </td>
                    <td align="right" style="font-size:12px;letter-spacing:3px;font-weight:700;">SCROLLLAB</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 24px;">
                <p style="margin:0 0 12px;color:#ff4b00;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Pago confirmado</p>
                <h1 style="margin:0 0 18px;font-size:34px;line-height:1.08;font-weight:600;">Gracias por tu compra, ${escapeHtml(buyerName)}.</h1>
                <p style="margin:0;color:#5b5650;font-size:16px;line-height:1.6;">
                  Tu orden fue confirmada y el código fuente ya está preparado. Ingresá a tu cuenta para descargar el ZIP.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0 0 8px;color:#77716a;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Orden</p>
                <p style="margin:0 0 20px;font-family:monospace;font-size:14px;">${escapeHtml(orderId)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${itemRows}
                  <tr>
                    <td style="padding:18px 0 0;font-size:16px;font-weight:700;">Total</td>
                    <td style="padding:18px 0 0;font-size:16px;font-weight:700;text-align:right;">
                      ${escapeHtml(formatMoney(order.total, order.currency_id))}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 40px;">
                <a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#161412;color:#f2efe9;text-decoration:none;padding:16px 24px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                  Ingresar y descargar →
                </a>
                <p style="margin:20px 0 0;color:#77716a;font-size:13px;line-height:1.5;">
                  Por seguridad, el botón lleva a “Mis compras”: iniciá sesión con la misma cuenta de Google usada al comprar.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #d6d1c8;color:#77716a;font-size:12px;line-height:1.5;">
                Este correo es el detalle de tu compra y no reemplaza una factura fiscal.
                Si necesitás ayuda, respondé a este email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `SCROLLLAB

Gracias por tu compra, ${buyerName}.

Orden: ${orderId}
${(order.items || [])
  .map(
    (item) =>
      `- ${item.title || item.sku}: ${formatMoney(
        item.unit_price,
        item.currency_id || order.currency_id,
      )}`,
  )
  .join('\n')}
Total: ${formatMoney(order.total, order.currency_id)}

Ingresá y descargá tu ZIP desde:
${accountUrl}

Este correo es el detalle de tu compra y no reemplaza una factura fiscal.`

  return {
    subject: `Tu compra en SCROLLLAB · Orden ${orderId.slice(-8)}`,
    html,
    text,
  }
}

export function buildOrderAdminNotify({ order, user }) {
  const orderId = String(db.uid(order) || order.id)
  const userId = String(db.uid(user) || user.id || '')
  const buyerName = user.name || user.email
  const buyerEmail = user.email
  const paidAt = order.updatedAt || order.createdAt || new Date()
  const createdAt = order.createdAt || paidAt
  const paidLabel = formatDateTime(paidAt)
  const createdLabel = formatDateTime(createdAt)
  const itemLines = (order.items || [])
    .map(
      (item) =>
        `- ${item.title || item.sku} (${item.sku}) · ${formatMoney(
          item.unit_price,
          item.currency_id || order.currency_id,
        )}`,
    )
    .join('\n')

  const htmlItems = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#161412;font-size:14px;">
            ${escapeHtml(item.title || item.sku)}
            <span style="color:#77716a;font-size:12px;"> · ${escapeHtml(item.sku)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#161412;font-size:14px;text-align:right;white-space:nowrap;">
            ${escapeHtml(formatMoney(item.unit_price, item.currency_id || order.currency_id))}
          </td>
        </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #d6d1c8;">
                <p style="margin:0;color:#ff4b00;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Nueva venta</p>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1;font-weight:600;">Compra confirmada</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <p style="margin:0 0 8px;color:#77716a;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Comprador</p>
                <p style="margin:0 0 4px;font-size:16px;font-weight:600;">${escapeHtml(buyerName)}</p>
                <p style="margin:0 0 4px;font-size:14px;color:#5b5650;">${escapeHtml(buyerEmail)}</p>
                <p style="margin:0 0 20px;font-size:12px;color:#77716a;font-family:monospace;">User ID: ${escapeHtml(userId)}</p>
                <p style="margin:0 0 8px;color:#77716a;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Fecha y hora</p>
                <p style="margin:0 0 4px;font-size:14px;color:#161412;">Pago confirmado: <strong>${escapeHtml(paidLabel)}</strong></p>
                <p style="margin:0 0 20px;font-size:13px;color:#77716a;">Checkout iniciado: ${escapeHtml(createdLabel)}</p>
                <p style="margin:0 0 8px;color:#77716a;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Orden</p>
                <p style="margin:0 0 20px;font-family:monospace;font-size:14px;">${escapeHtml(orderId)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${htmlItems}
                  <tr>
                    <td style="padding:16px 0 0;font-size:15px;font-weight:700;">Total</td>
                    <td style="padding:16px 0 0;font-size:15px;font-weight:700;text-align:right;">
                      ${escapeHtml(formatMoney(order.total, order.currency_id))}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `SCROLLLAB — nueva venta

Comprador: ${buyerName} <${buyerEmail}>
User ID: ${userId}
Pago confirmado: ${paidLabel}
Checkout iniciado: ${createdLabel}
Orden: ${orderId}

Qué compró:
${itemLines}
Total: ${formatMoney(order.total, order.currency_id)}`

  const itemSummary = (order.items || [])
    .map((item) => item.title || item.sku)
    .slice(0, 2)
    .join(', ')

  return {
    subject: `[SCROLLLAB] Venta · ${itemSummary || 'orden'} · ${buyerEmail}`,
    html,
    text,
  }
}

/**
 * Envía una sola confirmación por orden. Resend también recibe una
 * Idempotency-Key estable para cubrir reintentos tras cortes de proceso.
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
 * Aviso interno al dueño del marketplace. Idempotente vía Resend (webhook + confirm).
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

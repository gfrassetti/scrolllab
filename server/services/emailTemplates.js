import { db } from '../db.js'
import { HOSTED_PLANS, hostedPlanPrice } from '../catalog.js'

/**
 * Contenido de los mails (asunto, HTML y texto): funciones puras de datos →
 * contenido, sin red ni base. El envío (Resend, idempotencia, claims en la
 * base) vive en email.js, que re-exporta los `build*`.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatDateTime(value) {
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

// ————————————————————————————————————————————————————————————————
// Suscripción de Hosted Component (LAB) — mail de bienvenida al activarse.
// ————————————————————————————————————————————————————————————————

const TIER_LABEL = { starter: 'Starter', pro: 'Pro', studio: 'Studio' }

function formatDateOnly(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'long',
  }).format(date)
}

/** Contenido del mail — puro, testeable. */
export function buildSubscriptionWelcome({
  subscription,
  user,
  accountUrl,
  logoUrl,
}) {
  const plan = HOSTED_PLANS[subscription.plan] || {}
  const tier = TIER_LABEL[plan.tier] || subscription.plan
  const cycle = subscription.cycle === 'yearly' ? 'anual' : 'mensual'
  const price = hostedPlanPrice(subscription.plan, subscription.cycle)
  const priceLabel = price != null ? formatMoney(price, 'ARS') : null
  const quota = Number.isFinite(plan.instanceQuota)
    ? `${plan.instanceQuota} secciones publicadas`
    : 'secciones publicadas sin tope'
  const nextPayment = formatDateOnly(subscription.currentPeriodEnd)
  const name = user.name || user.email
  // Primera suscripción = prueba gratis: nada se cobra hasta que termina.
  const trialEnd =
    subscription.trialEndsAt &&
    !subscription.lastPaidAt &&
    new Date(subscription.trialEndsAt) > new Date()
      ? formatDateOnly(subscription.trialEndsAt)
      : null
  const nextPaymentLabel = trialEnd ? 'Primer cobro' : 'Próximo pago'
  const headline = trialEnd
    ? 'Tu prueba gratis de ScrollLab LAB arrancó.'
    : 'Tu suscripción a ScrollLab LAB está activa.'
  const trialLine = trialEnd
    ? `Tenés prueba gratis hasta el ${trialEnd}: no se te cobra nada hasta ese día. Si cancelás antes desde “Mi cuenta”, no pagás nada.`
    : null

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <div style="display:none;max-height:0;overflow:hidden;">
      ${escapeHtml(headline)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f2efe9;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #d6d1c8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="SCROLLLAB" style="display:block;border:0;" /></td>
                    <td align="right" style="font-size:12px;letter-spacing:3px;font-weight:700;">SCROLLLAB</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 20px;">
                <p style="margin:0 0 12px;color:#ff4b00;font-size:12px;letter-spacing:3px;text-transform:uppercase;">${trialEnd ? 'Prueba gratis' : 'Suscripción activa'}</p>
                <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1;font-weight:600;">Ya estás en LAB, ${escapeHtml(name)}.</h1>
                <p style="margin:0;color:#5b5650;font-size:16px;line-height:1.6;">
                  Tu plan <strong>${escapeHtml(tier)}</strong> (${escapeHtml(cycle)}) está activo. Ya podés publicar y editar tus secciones hosteadas.
                </p>
                ${trialLine ? `<p style="margin:16px 0 0;padding:12px 14px;border:1px solid #ffb899;background:#fff1ea;color:#161412;font-size:15px;line-height:1.5;">${escapeHtml(trialLine)}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr><td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#77716a;">Plan</td><td style="padding:10px 0;border-bottom:1px solid #dedad2;text-align:right;">${escapeHtml(tier)} · ${escapeHtml(cycle)}</td></tr>
                  ${priceLabel ? `<tr><td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#77716a;">Importe</td><td style="padding:10px 0;border-bottom:1px solid #dedad2;text-align:right;">${escapeHtml(priceLabel)} / ${escapeHtml(cycle === 'anual' ? 'año' : 'mes')}</td></tr>` : ''}
                  <tr><td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#77716a;">Incluye</td><td style="padding:10px 0;border-bottom:1px solid #dedad2;text-align:right;">${escapeHtml(quota)}</td></tr>
                  ${nextPayment ? `<tr><td style="padding:10px 0;color:#77716a;">${nextPaymentLabel}</td><td style="padding:10px 0;text-align:right;">${escapeHtml(nextPayment)}</td></tr>` : ''}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 40px;">
                <a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#161412;color:#f2efe9;text-decoration:none;padding:16px 24px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                  Ir a LAB →
                </a>
                <p style="margin:20px 0 0;color:#77716a;font-size:13px;line-height:1.5;">
                  Se renueva automáticamente. Podés cancelar cuando quieras desde “Mi cuenta”: seguís con acceso hasta el fin del período pagado.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #d6d1c8;color:#77716a;font-size:12px;line-height:1.5;">
                Este correo confirma la activación de tu suscripción y no reemplaza una factura fiscal.
                Si necesitás ayuda, respondé a este email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `SCROLLLAB — ${trialEnd ? 'Prueba gratis' : 'Suscripción activa'}

Ya estás en LAB, ${name}.
${trialLine ? `\n${trialLine}\n` : ''}
Plan: ${tier} · ${cycle}${priceLabel ? `\nImporte: ${priceLabel} / ${cycle === 'anual' ? 'año' : 'mes'}` : ''}
Incluye: ${quota}${nextPayment ? `\n${nextPaymentLabel}: ${nextPayment}` : ''}

Ir a LAB:
${accountUrl}

Se renueva automáticamente. Podés cancelar cuando quieras desde "Mi cuenta";
seguís con acceso hasta el fin del período pagado.

Este correo confirma la activación y no reemplaza una factura fiscal.`

  return {
    subject: trialEnd
      ? `Tu prueba gratis de ScrollLab LAB arrancó · ${tier}`
      : `Tu suscripción a ScrollLab LAB está activa · ${tier}`,
    html,
    text,
  }
}

/** Contenido del mail de confirmación de baja — puro, testeable. */
export function buildSubscriptionCanceled({
  subscription,
  user,
  accountUrl,
  logoUrl,
}) {
  const plan = HOSTED_PLANS[subscription.plan] || {}
  const tier = TIER_LABEL[plan.tier] || subscription.plan
  // `cancelled` en el acto = no quedaban días pagos (p. ej. una renovación
  // que no se cobró): no hay "acceso hasta" que prometer.
  const closed = subscription.status === 'cancelled'
  // Baja durante la prueba gratis: nunca se cobró y ya no se va a cobrar.
  const inTrial =
    !closed &&
    !!subscription.trialEndsAt &&
    !subscription.lastPaidAt &&
    new Date(subscription.trialEndsAt) > new Date()
  const endsAt = closed
    ? null
    : formatDateOnly(subscription.currentPeriodEnd || (inTrial && subscription.trialEndsAt))
  const name = user.name || user.email
  const accessLine = closed
    ? `Tu plan <strong>${escapeHtml(tier)}</strong> quedó dado de baja. No se te va a cobrar de nuevo.`
    : inTrial
      ? `Cancelaste durante la prueba gratis: <strong>no se te cobra nada</strong>. Seguís con acceso al plan <strong>${escapeHtml(tier)}</strong> hasta el <strong>${escapeHtml(endsAt)}</strong>.`
      : endsAt
        ? `Seguís con acceso al plan <strong>${escapeHtml(tier)}</strong> hasta el <strong>${escapeHtml(endsAt)}</strong>. No se te va a cobrar de nuevo.`
        : `Tu acceso al plan <strong>${escapeHtml(tier)}</strong> termina al final del período pagado. No se te va a cobrar de nuevo.`
  const accessText = closed
    ? `Tu plan ${tier} quedó dado de baja. No se te va a cobrar de nuevo.`
    : inTrial
      ? `Cancelaste durante la prueba gratis: no se te cobra nada. Seguís con acceso al plan ${tier} hasta el ${endsAt}.`
      : endsAt
        ? `Seguís con acceso al plan ${tier} hasta el ${endsAt}. No se te va a cobrar de nuevo.`
        : `Tu acceso al plan ${tier} termina al final del período pagado. No se te va a cobrar de nuevo.`
  const freezeLine = closed
    ? 'Las secciones publicadas por encima del tope gratis dejan de mostrarse.'
    : inTrial
      ? 'Al terminar la prueba, las secciones publicadas por encima del tope gratis dejan de mostrarse.'
      : 'Al terminar el período, las secciones publicadas por encima del tope gratis dejan de mostrarse.'

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <div style="display:none;max-height:0;overflow:hidden;">
      Cancelaste tu suscripción a ScrollLab LAB.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f2efe9;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #d6d1c8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="SCROLLLAB" style="display:block;border:0;" /></td>
                    <td align="right" style="font-size:12px;letter-spacing:3px;font-weight:700;">SCROLLLAB</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 20px;">
                <p style="margin:0 0 12px;color:#77716a;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Suscripción cancelada</p>
                <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1;font-weight:600;">Listo, ${escapeHtml(name)}.</h1>
                <p style="margin:0;color:#5b5650;font-size:16px;line-height:1.6;">
                  Cancelamos la renovación automática de tu suscripción a LAB. ${accessLine}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;color:#5b5650;font-size:15px;line-height:1.6;">
                ${freezeLine} Volvés a activar cuando quieras.
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 40px;">
                <a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#161412;color:#f2efe9;text-decoration:none;padding:16px 24px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                  Reactivar en LAB →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #d6d1c8;color:#77716a;font-size:12px;line-height:1.5;">
                Si esto no lo hiciste vos, respondé a este email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `SCROLLLAB — Suscripción cancelada

Listo, ${name}.

Cancelamos la renovación automática de tu suscripción a LAB.
${accessText}

${freezeLine} Volvés a activar cuando quieras:
${accountUrl}

Si esto no lo hiciste vos, respondé a este email.`

  return {
    subject: `Cancelaste tu suscripción a ScrollLab LAB`,
    html,
    text,
  }
}

/**
 * Aviso unos días antes del primer cobro, para quien está en la prueba gratis:
 * dice cuándo se cobra, cuánto, y que cancelando antes no se paga nada.
 * Puro, testeable.
 */
export function buildSubscriptionTrialReminder({
  subscription,
  user,
  accountUrl,
  logoUrl,
}) {
  const plan = HOSTED_PLANS[subscription.plan] || {}
  const tier = TIER_LABEL[plan.tier] || subscription.plan
  const cycle = subscription.cycle === 'yearly' ? 'anual' : 'mensual'
  const per = cycle === 'anual' ? 'año' : 'mes'
  const price = hostedPlanPrice(subscription.plan, subscription.cycle)
  const priceLabel = price != null ? formatMoney(price, 'ARS') : null
  const chargeDate = formatDateOnly(subscription.trialEndsAt)
  const when = chargeDate ? `el ${chargeDate}` : 'pronto'
  const amount = priceLabel ? `el primer pago de ${priceLabel}` : 'el primer pago'
  const name = user.name || user.email

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <div style="display:none;max-height:0;overflow:hidden;">
      Tu prueba gratis de ScrollLab LAB termina ${escapeHtml(when)}. Si cancelás antes, no se te cobra nada.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f2efe9;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #d6d1c8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="SCROLLLAB" style="display:block;border:0;" /></td>
                    <td align="right" style="font-size:12px;letter-spacing:3px;font-weight:700;">SCROLLLAB</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 20px;">
                <p style="margin:0 0 12px;color:#ff4b00;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Prueba gratis</p>
                <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1;font-weight:600;">Tu prueba termina ${escapeHtml(when)}, ${escapeHtml(name)}.</h1>
                <p style="margin:0;color:#5b5650;font-size:16px;line-height:1.6;">
                  Al terminar se cobra ${escapeHtml(amount)} de tu plan <strong>${escapeHtml(tier)}</strong> (${escapeHtml(cycle)}).
                  Si querés seguir, no tenés que hacer nada. Si no, cancelá antes y no se te cobra nada: seguís con acceso hasta esa fecha.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr><td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#77716a;">Plan</td><td style="padding:10px 0;border-bottom:1px solid #dedad2;text-align:right;">${escapeHtml(tier)} · ${escapeHtml(cycle)}</td></tr>
                  ${priceLabel ? `<tr><td style="padding:10px 0;border-bottom:1px solid #dedad2;color:#77716a;">Importe</td><td style="padding:10px 0;border-bottom:1px solid #dedad2;text-align:right;">${escapeHtml(priceLabel)} / ${escapeHtml(per)}</td></tr>` : ''}
                  ${chargeDate ? `<tr><td style="padding:10px 0;color:#77716a;">Primer cobro</td><td style="padding:10px 0;text-align:right;">${escapeHtml(chargeDate)}</td></tr>` : ''}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 40px;">
                <a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#161412;color:#f2efe9;text-decoration:none;padding:16px 24px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                  Ver mi plan →
                </a>
                <p style="margin:20px 0 0;color:#77716a;font-size:13px;line-height:1.5;">
                  Podés cancelar cuando quieras desde LAB, en “Cancelar suscripción”.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #d6d1c8;color:#77716a;font-size:12px;line-height:1.5;">
                Te escribimos porque tenés una prueba gratis activa en ScrollLab LAB.
                Si necesitás ayuda, respondé a este email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `SCROLLLAB — Prueba gratis

Tu prueba de LAB termina ${when}, ${name}.

Al terminar se cobra ${amount} de tu plan ${tier} (${cycle}).
Si querés seguir, no tenés que hacer nada. Si no, cancelá antes y no se te cobra
nada: seguís con acceso hasta esa fecha.

Plan: ${tier} · ${cycle}${priceLabel ? `\nImporte: ${priceLabel} / ${per}` : ''}${chargeDate ? `\nPrimer cobro: ${chargeDate}` : ''}

Ver mi plan:
${accountUrl}

Podés cancelar cuando quieras desde LAB, en "Cancelar suscripción".`

  return {
    subject: `Tu prueba de ScrollLab LAB termina ${when}`,
    html,
    text,
  }
}

const COUPON_COPY = {
  es: {
    subject: (percent) => `Tu ${percent}% de bienvenida en SCROLL LAB`,
    preheader: (percent) => `${percent}% menos en tu primera compra. Ya está en tu cuenta.`,
    eyebrow: 'Cupón de bienvenida',
    title: (percent) => `${percent}% menos en tu primera compra.`,
    body: (date, email) =>
      `Ya está en tu cuenta: cuando pagues con ${email}, el descuento se aplica solo en el carrito. Sirve para cualquier modelo, para tu composición del builder o para el bundle. Vale hasta el ${date} y se usa una sola vez.`,
    cta: 'Elegir mi modelo',
    foot: (code) =>
      `Recibís este mail porque entraste a scrolllab.com.ar con tu cuenta de Google. Es el único mail promocional que te mandamos: no enviamos newsletters. Código de referencia: ${code}.`,
  },
  en: {
    subject: (percent) => `Your ${percent}% welcome discount at SCROLL LAB`,
    preheader: (percent) => `${percent}% off your first purchase. It’s already in your account.`,
    eyebrow: 'Welcome coupon',
    title: (percent) => `${percent}% off your first purchase.`,
    body: (date, email) =>
      `It’s already in your account: when you pay with ${email}, the discount is applied automatically in the cart. It works for any model, your builder composition, or the bundle. It’s valid until ${date} and can be used once.`,
    cta: 'Pick my model',
    foot: (code) =>
      `You’re getting this email because you signed in to scrolllab.com.ar with your Google account. It’s the only promotional email we send you: no newsletters. Reference code: ${code}.`,
  },
}

/**
 * Mail del cupón de bienvenida: dice que el descuento ya está en la cuenta y se
 * aplica solo. No hay código para tipear; se muestra solo como referencia.
 */
export function buildCouponEmail({
  code,
  percent,
  expiresAt,
  email,
  locale = 'es',
  shopUrl,
  logoUrl,
}) {
  const lang = locale === 'en' ? 'en' : 'es'
  const c = COUPON_COPY[lang]
  const date = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'long',
  }).format(new Date(expiresAt))
  const link = `${String(shopUrl).replace(/\/$/, '')}/#templates`

  const html = `<!doctype html>
<html lang="${lang}">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(c.preheader(percent))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f2efe9;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #d6d1c8;">
                <img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="SCROLLLAB" style="display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 12px;">
                <p style="margin:0 0 12px;color:#ff4b00;font-size:12px;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(c.eyebrow)}</p>
                <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;font-weight:600;">${escapeHtml(c.title(percent))}</h1>
                <p style="margin:0;color:#5b5650;font-size:16px;line-height:1.6;">${escapeHtml(c.body(date, email))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 36px;">
                <a href="${escapeHtml(link)}" style="display:inline-block;background:#161412;color:#f2efe9;padding:14px 26px;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">${escapeHtml(c.cta)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #d6d1c8;color:#7a746b;font-size:12px;line-height:1.6;">${escapeHtml(c.foot(code))}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [c.title(percent), '', c.body(date, email), '', link, '', c.foot(code)].join('\n')

  return { subject: c.subject(percent), html, text }
}

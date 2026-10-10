import { db } from '../db.js'
import { orderPriceSummary } from '../../src/domain/orderSummary.js'
import { HOSTED_PLANS, subscriptionPlanPrice } from '../catalog.js'

/**
 * Mails de cobro en dos idiomas (es / en): pago rechazado de una compra, cuota
 * de LAB cobrada o rechazada, y la versión en inglés del recibo y de los mails
 * de LAB para quien compra con el sitio en inglés. Funciones puras de datos →
 * contenido, como emailTemplates.js (que despacha acá con `locale: 'en'`).
 * Mismo diseño que los mails existentes: `emailShell` es ese HTML de tabla.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export const langOf = (locale) => (locale === 'en' ? 'en' : 'es')

/** ARS sin decimales; USD con centavos solo si los hay (un cupón los deja). */
export function money(value, currency = 'ARS', lang = 'es') {
  const n = Number(value || 0)
  const usd = currency === 'USD'
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: usd && !Number.isInteger(n) ? 2 : 0,
    maximumFractionDigits: usd ? 2 : 0,
  }).format(n)
}

export function dateLong(value, lang = 'es') {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'long',
  }).format(date)
}

const ROW =
  'padding:10px 0;border-bottom:1px solid #dedad2;'

/**
 * HTML del mail. Los campos `*Html` ya vienen escapados; el resto se escapa acá.
 * @param {{ lang: string, preheader: string, logoUrl: string, eyebrow: string, eyebrowTone?: 'accent' | 'muted' | 'danger', title: string, introHtml: string, noticeHtml?: string, rows?: Array<[string, string]>, cta?: { href: string, label: string }, afterCtaHtml?: string, footer: string }} m
 */
export function emailShell(m) {
  const tone = { accent: '#ff4b00', muted: '#77716a', danger: '#c0341d' }[m.eyebrowTone || 'accent']
  const rows = (m.rows || []).filter(Boolean)
  const rowsHtml = rows.length
    ? `<tr>
              <td style="padding:0 32px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  ${rows
                    .map(
                      ([k, v], i) =>
                        `<tr><td style="${i < rows.length - 1 ? ROW : 'padding:10px 0;'}color:#77716a;">${escapeHtml(k)}</td><td style="${i < rows.length - 1 ? ROW : 'padding:10px 0;'}text-align:right;">${escapeHtml(v)}</td></tr>`,
                    )
                    .join('\n                  ')}
                </table>
              </td>
            </tr>`
    : ''
  return `<!doctype html>
<html lang="${m.lang === 'en' ? 'en' : 'es'}">
  <body style="margin:0;background:#ece9e2;font-family:Arial,Helvetica,sans-serif;color:#161412;">
    <div style="display:none;max-height:0;overflow:hidden;">
      ${escapeHtml(m.preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece9e2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f2efe9;border:1px solid #d6d1c8;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #d6d1c8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><img src="${escapeHtml(m.logoUrl)}" width="32" height="32" alt="SCROLLLAB" style="display:block;border:0;" /></td>
                    <td align="right" style="font-size:12px;letter-spacing:3px;font-weight:700;">SCROLLLAB</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 20px;">
                <p style="margin:0 0 12px;color:${tone};font-size:12px;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(m.eyebrow)}</p>
                <h1 style="margin:0 0 18px;font-size:32px;line-height:1.1;font-weight:600;">${escapeHtml(m.title)}</h1>
                <p style="margin:0;color:#5b5650;font-size:16px;line-height:1.6;">${m.introHtml}</p>
                ${m.noticeHtml ? `<p style="margin:16px 0 0;padding:12px 14px;border:1px solid #ffb899;background:#fff1ea;color:#161412;font-size:15px;line-height:1.5;">${m.noticeHtml}</p>` : ''}
              </td>
            </tr>
            ${rowsHtml}
            ${
              m.cta
                ? `<tr>
              <td style="padding:4px 32px 40px;">
                <a href="${escapeHtml(m.cta.href)}" style="display:inline-block;background:#161412;color:#f2efe9;text-decoration:none;padding:16px 24px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                  ${escapeHtml(m.cta.label)} →
                </a>
                ${m.afterCtaHtml ? `<p style="margin:20px 0 0;color:#77716a;font-size:13px;line-height:1.5;">${m.afterCtaHtml}</p>` : ''}
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #d6d1c8;color:#77716a;font-size:12px;line-height:1.5;">
                ${escapeHtml(m.footer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** Texto plano equivalente (los clientes sin HTML y los filtros de spam lo leen). */
function plain({ eyebrow, title, intro, notice, rows, cta, after, footer }) {
  return [
    `SCROLLLAB — ${eyebrow}`,
    '',
    title,
    '',
    intro,
    notice ? `\n${notice}` : null,
    rows?.length ? `\n${rows.filter(Boolean).map(([k, v]) => `${k}: ${v}`).join('\n')}` : null,
    cta ? `\n${cta.label}:\n${cta.href}` : null,
    after ? `\n${after}` : null,
    '',
    footer,
  ]
    .filter((l) => l != null)
    .join('\n')
}

/** Arma html + text desde la misma copia (intro / notice / after en texto plano). */
function render(m) {
  const html = emailShell({
    ...m,
    introHtml: escapeHtml(m.intro),
    noticeHtml: m.notice ? escapeHtml(m.notice) : '',
    afterCtaHtml: m.after ? escapeHtml(m.after) : '',
  })
  return { subject: m.subject, html, text: plain(m) }
}

const orderIdOf = (order) => String(db.uid(order) || order.id)
const nameOf = (user) => user?.name || user?.email || ''

// ——— Compra (market / builder) ———

const PAYMENT_FAILED_COPY = {
  es: {
    subject: (ref) => `No pudimos procesar tu pago · Orden ${ref}`,
    preheader: 'Tu pago no se acreditó. Tu carrito sigue guardado para reintentar.',
    eyebrow: 'Pago rechazado',
    title: (name) => `Tu pago no se acreditó, ${name}.`,
    intro: (provider) =>
      `${provider === 'paddle' ? 'El procesador' : 'Mercado Pago'} rechazó el pago de tu compra, así que no se te cobró nada. Suele pasar por fondos, límites de la tarjeta o una validación del banco.`,
    notice:
      'Tu carrito sigue guardado: podés reintentar con otra tarjeta u otro medio de pago.',
    order: 'Orden',
    total: 'Total',
    cta: 'Reintentar el pago',
    after: 'Si el banco te pidió autorizar la compra, aprobala y volvé a intentar.',
    footer:
      'Si el cobro aparece en tu resumen igual, respondé a este email con la orden y lo revisamos.',
  },
  en: {
    subject: (ref) => `We couldn’t process your payment · Order ${ref}`,
    preheader: 'Your payment didn’t go through. Your cart is saved so you can retry.',
    eyebrow: 'Payment declined',
    title: (name) => `Your payment didn’t go through, ${name}.`,
    intro: () =>
      'Your payment was declined, so you haven’t been charged. This usually happens because of funds, card limits or a bank check.',
    notice: 'Your cart is saved: you can retry with another card or payment method.',
    order: 'Order',
    total: 'Total',
    cta: 'Retry payment',
    after: 'If your bank asked you to authorize the purchase, approve it and try again.',
    footer:
      'If the charge still shows on your statement, reply to this email with the order number and we’ll look into it.',
  },
}

/**
 * «Pago rechazado» de una compra (Mercado Pago o Paddle). La orden sigue
 * pendiente y el carrito del comprador no se vació.
 * @param {{ order: any, user: any, retryUrl: string, logoUrl: string }} args
 */
export function buildOrderPaymentFailed({ order, user, retryUrl, logoUrl }) {
  const lang = langOf(order.locale)
  const c = PAYMENT_FAILED_COPY[lang]
  const id = orderIdOf(order)
  const rows = [
    [c.order, id],
    ...(order.items || []).map((i) => [
      i.title || i.sku,
      money(i.unit_price, i.currency_id || order.currency_id, lang),
    ]),
    [c.total, money(order.total, order.currency_id, lang)],
  ]
  return render({
    lang,
    logoUrl,
    subject: c.subject(id.slice(-8)),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    eyebrowTone: 'danger',
    title: c.title(nameOf(user)),
    intro: c.intro(order.provider),
    notice: c.notice,
    rows,
    cta: { href: retryUrl, label: c.cta },
    after: c.after,
    footer: c.footer,
  })
}

const PADDLE_INVOICE_NOTE = {
  es: 'La factura la emite Paddle.com, nuestro revendedor autorizado, y te llega en un mail aparte.',
  en: 'Your invoice is issued by Paddle.com, our authorized reseller, and arrives in a separate email.',
}

/** Nota del pie del recibo cuando cobró Paddle (merchant of record). */
export function paddleInvoiceNote(locale) {
  return PADDLE_INVOICE_NOTE[langOf(locale)]
}

/**
 * Recibo en inglés (el español sigue en emailTemplates.js). Misma información:
 * orden, ítems, total y el camino a «My purchases».
 * @param {{ order: any, user: any, accountUrl: string, logoUrl: string }} args
 */
export function buildOrderReceiptEn({ order, user, accountUrl, logoUrl }) {
  const id = orderIdOf(order)
  const summary = orderPriceSummary(order)
  const footer =
    order.provider === 'paddle'
      ? `This email is your purchase summary, not a tax invoice. ${PADDLE_INVOICE_NOTE.en} Need help? Just reply.`
      : 'This email is your purchase summary, not a tax invoice. Need help? Just reply.'
  return render({
    lang: 'en',
    logoUrl,
    subject: `Your SCROLLLAB purchase · Order ${id.slice(-8)}`,
    preheader: 'Your SCROLLLAB purchase is ready to download.',
    eyebrow: 'Payment confirmed',
    title: `Thanks for your purchase, ${nameOf(user)}.`,
    intro:
      'Your order is confirmed and the source code is ready. Sign in to your account to download the ZIP.',
    rows: [
      ['Order', id],
      ...summary.items.map((i) => [i.title, money(i.list, order.currency_id, 'en')]),
      summary.discount > 0
        ? [`First-purchase discount (${summary.discountPct}%)`, `−${money(summary.discount, order.currency_id, 'en')}`]
        : null,
      ['Total', money(order.total, order.currency_id, 'en')],
    ],
    cta: { href: accountUrl, label: 'Sign in and download' },
    after:
      'For security, the button opens “My purchases”: sign in with the same Google account you used to buy.',
    footer,
  })
}

// ——— Botón de arrepentimiento ———

const WITHDRAWAL_COPY = {
  es: {
    subject: (code) => `Recibimos tu solicitud de arrepentimiento · ${code}`,
    preheader: 'Tu código de seguimiento está adentro.',
    eyebrow: 'Arrepentimiento',
    title: (name) => `Recibimos tu solicitud, ${name}.`,
    intro:
      'Guardá el código de abajo: es el seguimiento de tu pedido. Lo revisamos y te respondemos por este mismo mail.',
    code: 'Código',
    order: 'Compra',
    date: 'Fecha',
    cta: 'Ver la política de reembolsos',
    introChoose:
      'Tenés más de una compra o suscripción con este mail y no nos dijiste de cuál te arrepentís, así que todavía no devolvimos nada. Entrá con tu cuenta y elegila: si corresponde, te devolvemos el dinero en el momento. Si preferís, respondé este mail diciéndonos cuál.',
    ctaChoose: 'Entrar y elegir',
    footer:
      'Si no hiciste este pedido, ignorá este mail o respondelo. Podés escribirnos citando el código.',
  },
  en: {
    subject: (code) => `We received your withdrawal request · ${code}`,
    preheader: 'Your tracking code is inside.',
    eyebrow: 'Withdrawal request',
    title: (name) => `We received your request, ${name}.`,
    intro:
      'Keep the code below: it tracks your request. We’ll review it and reply to you by this same email.',
    code: 'Code',
    order: 'Purchase',
    date: 'Date',
    cta: 'See the refund policy',
    introChoose:
      'You have more than one purchase or subscription with this email and didn’t tell us which one, so nothing has been refunded yet. Sign in and pick it: if it qualifies, we refund it on the spot. Or reply to this email telling us which one.',
    ctaChoose: 'Sign in and choose',
    footer:
      'If you didn’t make this request, ignore this email or reply to it. You can write to us quoting the code.',
  },
}

/**
 * Confirmación del botón de arrepentimiento: el código de seguimiento (la ley
 * pide darlo al instante). No dice si procede el reembolso: eso lo decide la
 * revisión, y la política está a un click.
 * `chooseUrl`: tiene más de una compra y no dijo cuál — el mail le da el link para entrar y elegir.
 * @param {{ code: string, name: string, locale?: string, order?: any, refundsUrl: string, logoUrl: string, chooseUrl?: string | null }} args
 */
export function buildWithdrawalReceived({ code, name, locale, order, refundsUrl, logoUrl, chooseUrl = null }) {
  const lang = langOf(locale)
  const c = WITHDRAWAL_COPY[lang]
  const orderTitle = (order?.items || []).map((i) => i.title || i.sku).join(', ')
  return render({
    lang,
    logoUrl,
    subject: c.subject(code),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    eyebrowTone: 'muted',
    title: c.title(name),
    intro: chooseUrl ? c.introChoose : c.intro,
    rows: [
      [c.code, code],
      orderTitle ? [c.order, orderTitle] : null,
      [c.date, dateLong(new Date(), lang)],
    ],
    cta: chooseUrl ? { href: chooseUrl, label: c.ctaChoose } : { href: refundsUrl, label: c.cta },
    footer: c.footer,
  })
}

// ——— LAB ———

const TIER_LABEL = { starter: 'Starter', pro: 'Pro', studio: 'Studio' }

/** Plan, ciclo y precio de una suscripción, en su moneda. */
export function subscriptionTerms(subscription, lang = 'es') {
  const plan = HOSTED_PLANS[subscription.plan] || {}
  const tier = TIER_LABEL[plan.tier] || subscription.plan
  const yearly = subscription.cycle === 'yearly'
  const currency = subscription.currency_id || 'ARS'
  const price = subscriptionPlanPrice(subscription, subscription.plan, subscription.cycle, currency)
  return {
    tier,
    currency,
    cycle: lang === 'en' ? (yearly ? 'yearly' : 'monthly') : yearly ? 'anual' : 'mensual',
    per: lang === 'en' ? (yearly ? 'year' : 'month') : yearly ? 'año' : 'mes',
    price,
    priceLabel: price != null ? money(price, currency, lang) : null,
    quota: Number.isFinite(plan.instanceQuota)
      ? lang === 'en'
        ? `${plan.instanceQuota} published sections`
        : `${plan.instanceQuota} secciones publicadas`
      : lang === 'en'
        ? 'unlimited published sections'
        : 'secciones publicadas sin tope',
  }
}

const CHARGE_COPY = {
  es: {
    subject: (tier) => `Recibimos tu pago de ScrollLab LAB · ${tier}`,
    preheader: 'Se acreditó el pago de tu suscripción a LAB.',
    eyebrow: 'Pago acreditado',
    title: (name) => `Gracias, ${name}. Tu plan sigue activo.`,
    intro: (tier, cycle) =>
      `Cobramos la cuota de tu plan ${tier} (${cycle}). Tus secciones siguen publicadas sin cambios.`,
    plan: 'Plan',
    amount: 'Importe',
    paidAt: 'Fecha',
    next: 'Próximo cobro',
    cta: 'Ir a LAB',
    after: 'Podés cancelar cuando quieras desde LAB: seguís con acceso hasta el fin del período pagado.',
    footer: 'Este correo confirma el cobro y no reemplaza una factura fiscal. Si necesitás ayuda, respondé a este email.',
  },
  en: {
    subject: (tier) => `We received your ScrollLab LAB payment · ${tier}`,
    preheader: 'Your LAB subscription payment went through.',
    eyebrow: 'Payment received',
    title: (name) => `Thanks, ${name}. Your plan is still active.`,
    intro: (tier, cycle) =>
      `We charged your ${tier} plan (${cycle}). Your sections stay published as they are.`,
    plan: 'Plan',
    amount: 'Amount',
    paidAt: 'Date',
    next: 'Next charge',
    cta: 'Go to LAB',
    after: 'You can cancel anytime from LAB: you keep access until the end of the paid period.',
    footer: 'This email confirms the charge and is not a tax invoice. Need help? Just reply.',
  },
}

/**
 * Cuota de LAB cobrada (renovación, o el primer cobro al terminar la prueba).
 * @param {{ subscription: any, user: any, accountUrl: string, logoUrl: string, charge: { amount?: number | null, currency?: string, paidAt?: any, periodEnd?: any } }} args
 */
export function buildSubscriptionCharge({ subscription, user, accountUrl, logoUrl, charge = {} }) {
  const lang = langOf(subscription.locale)
  const c = CHARGE_COPY[lang]
  const t = subscriptionTerms(subscription, lang)
  const currency = charge.currency || t.currency
  const amount = charge.amount != null ? money(charge.amount, currency, lang) : t.priceLabel
  const paidAt = dateLong(charge.paidAt || new Date(), lang)
  const next = subscription.canceledAt
    ? null
    : dateLong(charge.periodEnd || subscription.currentPeriodEnd, lang)
  const footer =
    subscription.provider === 'paddle' ? `${c.footer} ${paddleInvoiceNote(lang)}` : c.footer
  return render({
    lang,
    logoUrl,
    subject: c.subject(t.tier),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    title: c.title(nameOf(user)),
    intro: c.intro(t.tier, t.cycle),
    rows: [
      [c.plan, `${t.tier} · ${t.cycle}`],
      amount ? [c.amount, amount] : null,
      paidAt ? [c.paidAt, paidAt] : null,
      next ? [c.next, next] : null,
    ],
    cta: { href: accountUrl, label: c.cta },
    after: c.after,
    footer,
  })
}

const SUB_FAILED_COPY = {
  es: {
    subject: {
      renewal: (tier) => `No pudimos cobrar tu plan ${tier} de ScrollLab LAB`,
      checkout: () => 'Tu suscripción a ScrollLab LAB no se activó',
    },
    preheader: {
      renewal: 'Actualizá tu medio de pago para no perder tus secciones publicadas.',
      checkout: 'El pago fue rechazado y no se te cobró nada.',
    },
    eyebrow: 'Pago rechazado',
    title: {
      renewal: (name) => `${name}, tu pago no se acreditó.`,
      checkout: (name) => `${name}, tu suscripción no se activó.`,
    },
    intro: {
      renewal: (tier) =>
        `Intentamos cobrar la cuota de tu plan ${tier} y la tarjeta la rechazó. Vamos a reintentar en los próximos días.`,
      checkout: (tier) =>
        `El pago del plan ${tier} fue rechazado, así que no se te cobró nada y la suscripción no arrancó.`,
    },
    notice: {
      renewal: (grace) =>
        grace
          ? `Tus secciones siguen publicadas hasta el ${grace}. Si para entonces no se cobra, el plan pasa al gratis.`
          : 'Si no se cobra, el plan pasa al gratis y las secciones por encima del tope dejan de mostrarse.',
      checkout: () => 'Podés volver a suscribirte con otra tarjeta desde LAB.',
    },
    plan: 'Plan',
    amount: 'Importe',
    cta: { renewal: 'Actualizar medio de pago', checkout: 'Volver a LAB' },
    footer: 'Si el cobro aparece igual en tu resumen, respondé a este email y lo revisamos.',
  },
  en: {
    subject: {
      renewal: (tier) => `We couldn’t charge your ScrollLab LAB ${tier} plan`,
      checkout: () => 'Your ScrollLab LAB subscription didn’t start',
    },
    preheader: {
      renewal: 'Update your payment method to keep your published sections.',
      checkout: 'The payment was declined and you haven’t been charged.',
    },
    eyebrow: 'Payment declined',
    title: {
      renewal: (name) => `${name}, your payment didn’t go through.`,
      checkout: (name) => `${name}, your subscription didn’t start.`,
    },
    intro: {
      renewal: (tier) =>
        `We tried to charge your ${tier} plan and the card was declined. We’ll retry over the next few days.`,
      checkout: (tier) =>
        `The payment for the ${tier} plan was declined, so you haven’t been charged and the subscription didn’t start.`,
    },
    notice: {
      renewal: (grace) =>
        grace
          ? `Your sections stay published until ${grace}. If the charge hasn’t gone through by then, the plan drops to free.`
          : 'If the charge doesn’t go through, the plan drops to free and sections above the free limit stop showing.',
      checkout: () => 'You can subscribe again with another card from LAB.',
    },
    plan: 'Plan',
    amount: 'Amount',
    cta: { renewal: 'Update payment method', checkout: 'Back to LAB' },
    footer: 'If the charge still shows on your statement, reply to this email and we’ll look into it.',
  },
}

/**
 * Cobro de LAB rechazado. `stage: 'renewal'` (cuota de una suscripción viva:
 * el link actualiza la tarjeta) o `'checkout'` (el alta no se pagó).
 * @param {{ subscription: any, user: any, accountUrl: string, logoUrl: string, stage?: 'renewal' | 'checkout', updateUrl?: string | null, graceEndsAt?: any }} args
 */
export function buildSubscriptionPaymentFailed({
  subscription,
  user,
  accountUrl,
  logoUrl,
  stage = 'renewal',
  updateUrl = null,
  graceEndsAt = null,
}) {
  const lang = langOf(subscription.locale)
  const c = SUB_FAILED_COPY[lang]
  const t = subscriptionTerms(subscription, lang)
  const grace = dateLong(graceEndsAt, lang)
  return render({
    lang,
    logoUrl,
    subject: c.subject[stage](t.tier),
    preheader: c.preheader[stage],
    eyebrow: c.eyebrow,
    eyebrowTone: 'danger',
    title: c.title[stage](nameOf(user)),
    intro: c.intro[stage](t.tier),
    notice: c.notice[stage](grace),
    rows: [
      [c.plan, `${t.tier} · ${t.cycle}`],
      t.priceLabel ? [c.amount, `${t.priceLabel} / ${t.per}`] : null,
    ],
    cta: { href: (stage === 'renewal' && updateUrl) || accountUrl, label: c.cta[stage] },
    footer: c.footer,
  })
}

// ——— LAB en inglés: bienvenida, baja y aviso de fin de prueba ———

/** @param {{ subscription: any, user: any, accountUrl: string, logoUrl: string }} args */
export function buildSubscriptionWelcomeEn({ subscription, user, accountUrl, logoUrl }) {
  const t = subscriptionTerms(subscription, 'en')
  const trialEnd =
    subscription.trialEndsAt &&
    !subscription.lastPaidAt &&
    new Date(subscription.trialEndsAt) > new Date()
      ? dateLong(subscription.trialEndsAt, 'en')
      : null
  const next = dateLong(subscription.currentPeriodEnd, 'en')
  return render({
    lang: 'en',
    logoUrl,
    subject: trialEnd
      ? `Your ScrollLab LAB free trial has started · ${t.tier}`
      : `Your ScrollLab LAB subscription is active · ${t.tier}`,
    preheader: trialEnd
      ? 'Your ScrollLab LAB free trial has started.'
      : 'Your ScrollLab LAB subscription is active.',
    eyebrow: trialEnd ? 'Free trial' : 'Subscription active',
    title: `You’re in LAB, ${nameOf(user)}.`,
    intro: `Your ${t.tier} plan (${t.cycle}) is active. You can now publish and edit your hosted sections.`,
    notice: trialEnd
      ? `Your free trial runs until ${trialEnd}: nothing is charged before that day. Cancel before then from LAB and you pay nothing.`
      : '',
    rows: [
      ['Plan', `${t.tier} · ${t.cycle}`],
      t.priceLabel ? ['Amount', `${t.priceLabel} / ${t.per}`] : null,
      ['Includes', t.quota],
      next ? [trialEnd ? 'First charge' : 'Next charge', next] : null,
    ],
    cta: { href: accountUrl, label: 'Go to LAB' },
    after:
      'It renews automatically. Cancel anytime from LAB: you keep access until the end of the paid period.',
    footer:
      'This email confirms your subscription and is not a tax invoice. Need help? Just reply.',
  })
}

/** @param {{ subscription: any, user: any, accountUrl: string, logoUrl: string }} args */
export function buildSubscriptionCanceledEn({ subscription, user, accountUrl, logoUrl }) {
  const t = subscriptionTerms(subscription, 'en')
  const closed = subscription.status === 'cancelled'
  const inTrial =
    !closed &&
    !!subscription.trialEndsAt &&
    !subscription.lastPaidAt &&
    new Date(subscription.trialEndsAt) > new Date()
  const endsAt = closed
    ? null
    : dateLong(subscription.currentPeriodEnd || (inTrial && subscription.trialEndsAt), 'en')
  const access = closed
    ? `Your ${t.tier} plan has been canceled. You won’t be charged again.`
    : inTrial
      ? `You canceled during the free trial: you won’t be charged anything. You keep access to the ${t.tier} plan until ${endsAt}.`
      : endsAt
        ? `You keep access to the ${t.tier} plan until ${endsAt}. You won’t be charged again.`
        : `Your access to the ${t.tier} plan ends with the paid period. You won’t be charged again.`
  const freeze = closed
    ? 'Sections published above the free limit stop showing.'
    : inTrial
      ? 'When the trial ends, sections published above the free limit stop showing.'
      : 'When the period ends, sections published above the free limit stop showing.'
  return render({
    lang: 'en',
    logoUrl,
    subject: 'You canceled your ScrollLab LAB subscription',
    preheader: 'You canceled your ScrollLab LAB subscription.',
    eyebrow: 'Subscription canceled',
    eyebrowTone: 'muted',
    title: `Done, ${nameOf(user)}.`,
    intro: `We turned off the automatic renewal of your LAB subscription. ${access}`,
    notice: '',
    rows: [],
    cta: { href: accountUrl, label: 'Reactivate in LAB' },
    after: `${freeze} You can come back anytime.`,
    footer: 'If you didn’t do this, reply to this email.',
  })
}

/** @param {{ subscription: any, user: any, accountUrl: string, logoUrl: string }} args */
export function buildSubscriptionTrialReminderEn({ subscription, user, accountUrl, logoUrl }) {
  const t = subscriptionTerms(subscription, 'en')
  const chargeDate = dateLong(subscription.trialEndsAt, 'en')
  const when = chargeDate ? `on ${chargeDate}` : 'soon'
  const amount = t.priceLabel ? `the first payment of ${t.priceLabel}` : 'the first payment'
  return render({
    lang: 'en',
    logoUrl,
    subject: `Your ScrollLab LAB free trial ends ${when}`,
    preheader: `Your ScrollLab LAB free trial ends ${when}. Cancel before then and you won’t be charged.`,
    eyebrow: 'Free trial',
    title: `Your trial ends ${when}, ${nameOf(user)}.`,
    intro: `When it ends we’ll charge ${amount} for your ${t.tier} plan (${t.cycle}). To keep going you don’t need to do anything. If not, cancel before then and you won’t be charged: you keep access until that date.`,
    rows: [
      ['Plan', `${t.tier} · ${t.cycle}`],
      t.priceLabel ? ['Amount', `${t.priceLabel} / ${t.per}`] : null,
      chargeDate ? ['First charge', chargeDate] : null,
    ],
    cta: { href: accountUrl, label: 'Manage in LAB' },
    footer: 'This is a heads-up before your first charge. Need help? Just reply.',
  })
}

// ——— Devoluciones, confirmación del arrepentimiento y avisos de LAB ———

const GATEWAY = {
  es: { mercadopago: 'Mercado Pago', paddle: 'tu tarjeta (Paddle)' },
  en: { mercadopago: 'Mercado Pago', paddle: 'your card (Paddle)' },
}

const REFUND_COPY = {
  es: {
    subject: (partial) => (partial ? 'Te devolvimos parte de tu compra en SCROLLLAB' : 'Te devolvimos el dinero de tu compra en SCROLLLAB'),
    preheader: 'La devolución ya está hecha. Te contamos cuándo la ves.',
    eyebrow: 'Devolución hecha',
    title: (name) => `Listo, ${name}: te devolvimos el dinero.`,
    intro: (gateway) =>
      `Hicimos la devolución a ${gateway}, el mismo medio con el que pagaste. Según tu banco o tu tarjeta, puede tardar unos días en verse en tu resumen.`,
    noticeOrder: 'La licencia y las descargas de esa compra quedan sin efecto.',
    noticeLab: 'Tu suscripción a LAB quedó dada de baja y no se te va a cobrar más.',
    noticePartial: 'Fue una devolución parcial: tu compra sigue activa.',
    what: 'Compra',
    amount: 'Monto devuelto',
    date: 'Fecha',
    cta: 'Ver mi cuenta',
    footer: 'Si en unos días no lo ves en tu resumen, respondé a este email y lo revisamos.',
  },
  en: {
    subject: (partial) => (partial ? 'We refunded part of your SCROLLLAB purchase' : 'We refunded your SCROLLLAB purchase'),
    preheader: 'Your refund is done. Here’s when you’ll see it.',
    eyebrow: 'Refund issued',
    title: (name) => `All set, ${name}: we refunded you.`,
    intro: (gateway) =>
      `We sent the refund to ${gateway}, the same method you paid with. Depending on your bank or card, it can take a few days to show on your statement.`,
    noticeOrder: 'The license and downloads for that purchase are no longer valid.',
    noticeLab: 'Your LAB subscription has been canceled and you won’t be charged again.',
    noticePartial: 'It was a partial refund: your purchase is still active.',
    what: 'Purchase',
    amount: 'Amount refunded',
    date: 'Date',
    cta: 'Go to my account',
    footer: 'If you don’t see it on your statement in a few days, reply to this email and we’ll look into it.',
  },
}

/**
 * «Te devolvimos el dinero»: sale cuando la pasarela confirma una devolución
 * (automática por el Botón de arrepentimiento o hecha a mano en el panel).
 * @param {{ name: string, locale?: string, amount: number, currency: string, provider: string, what: string, kind: 'order' | 'lab', partial?: boolean, accountUrl: string, logoUrl: string }} args
 */
export function buildRefundIssued({ name, locale, amount, currency, provider, what, kind, partial = false, accountUrl, logoUrl }) {
  const lang = langOf(locale)
  const c = REFUND_COPY[lang]
  const gateway = GATEWAY[lang][provider === 'paddle' ? 'paddle' : 'mercadopago']
  return render({
    lang,
    logoUrl,
    subject: c.subject(partial),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    title: c.title(name),
    intro: c.intro(gateway),
    notice: partial ? c.noticePartial : kind === 'lab' ? c.noticeLab : c.noticeOrder,
    rows: [
      [c.what, what],
      [c.amount, money(amount, currency, lang)],
      [c.date, dateLong(new Date(), lang)],
    ],
    cta: { href: accountUrl, label: c.cta },
    footer: c.footer,
  })
}

const WITHDRAWAL_CONFIRM_COPY = {
  es: {
    subject: (code) => `Confirmá la devolución de tu compra · ${code}`,
    preheader: 'Un click y te devolvemos el dinero.',
    eyebrow: 'Arrepentimiento',
    title: (name) => `${name}, confirmá la devolución.`,
    intro: 'Pediste arrepentirte de esta compra y corresponde la devolución total. Para que nadie pueda pedirla por vos, confirmala con el botón: te devolvemos el dinero en el momento.',
    notice: (kind) =>
      kind === 'lab'
        ? 'Al confirmar, tu suscripción a LAB se da de baja en el momento.'
        : 'Al confirmar, la licencia y las descargas de esta compra quedan sin efecto.',
    what: 'Compra',
    amount: 'A devolver',
    code: 'Código',
    cta: 'Confirmar la devolución',
    after: 'El link vale 48 horas. Si no lo pediste vos, ignorá este mail: no pasa nada.',
    footer: 'Si tenés dudas, respondé a este email citando el código.',
  },
  en: {
    subject: (code) => `Confirm the refund of your purchase · ${code}`,
    preheader: 'One click and we refund you.',
    eyebrow: 'Withdrawal request',
    title: (name) => `${name}, confirm your refund.`,
    intro: 'You asked to withdraw from this purchase and it qualifies for a full refund. So nobody can request it for you, confirm it with the button: we refund you right away.',
    notice: (kind) =>
      kind === 'lab'
        ? 'Once confirmed, your LAB subscription ends right away.'
        : 'Once confirmed, the license and downloads for this purchase are no longer valid.',
    what: 'Purchase',
    amount: 'To refund',
    code: 'Code',
    cta: 'Confirm the refund',
    after: 'The link is valid for 48 hours. If you didn’t request this, just ignore this email.',
    footer: 'Questions? Reply to this email quoting the code.',
  },
}

/**
 * Confirmación del arrepentimiento pedido sin sesión: un link firmado al mail
 * de la compra, para que nadie que sepa el mail ajeno pueda pedir la devolución.
 * @param {{ code: string, name: string, locale?: string, what: string, amount: number, currency: string, kind: 'order' | 'lab', confirmUrl: string, logoUrl: string }} args
 */
export function buildWithdrawalConfirm({ code, name, locale, what, amount, currency, kind, confirmUrl, logoUrl }) {
  const lang = langOf(locale)
  const c = WITHDRAWAL_CONFIRM_COPY[lang]
  return render({
    lang,
    logoUrl,
    subject: c.subject(code),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    eyebrowTone: 'muted',
    title: c.title(name),
    intro: c.intro,
    notice: c.notice(kind),
    rows: [
      [c.what, what],
      [c.amount, money(amount, currency, lang)],
      [c.code, code],
    ],
    cta: { href: confirmUrl, label: c.cta },
    after: c.after,
    footer: c.footer,
  })
}

const SUSPENDED_COPY = {
  es: {
    subject: (tier) => `Tu plan ${tier} de ScrollLab LAB se suspendió`,
    preheader: 'No pudimos cobrar la renovación. Así lo reactivás.',
    eyebrow: 'Plan suspendido',
    title: (name) => `${name}, tu plan se suspendió.`,
    intro: (tier) =>
      `No pudimos cobrar la renovación de tu plan ${tier} y terminó el período de gracia, así que pasó al plan gratis: las secciones por encima del tope gratis dejaron de mostrarse.`,
    notice: (provider) =>
      provider === 'paddle'
        ? 'Actualizá tu tarjeta y, si Paddle logra el cobro, el plan vuelve solo con tus secciones.'
        : 'Si Mercado Pago logra el cobro, el plan vuelve solo con tus secciones. También podés volver a suscribirte desde LAB.',
    plan: 'Plan',
    since: 'Suspendido el',
    cta: 'Ir a LAB',
    footer: 'Si ya no querés seguir, cancelá la suscripción desde LAB y no se reintenta más.',
  },
  en: {
    subject: (tier) => `Your ScrollLab LAB ${tier} plan was suspended`,
    preheader: 'We couldn’t charge the renewal. Here’s how to get it back.',
    eyebrow: 'Plan suspended',
    title: (name) => `${name}, your plan was suspended.`,
    intro: (tier) =>
      `We couldn’t charge the renewal of your ${tier} plan and the grace period ended, so it moved to the free plan: sections above the free limit stopped showing.`,
    notice: (provider) =>
      provider === 'paddle'
        ? 'Update your card and, if Paddle gets the charge through, the plan comes back with your sections.'
        : 'If Mercado Pago gets the charge through, the plan comes back with your sections. You can also subscribe again from LAB.',
    plan: 'Plan',
    since: 'Suspended on',
    cta: 'Go to LAB',
    footer: 'If you don’t want to continue, cancel the subscription from LAB and it won’t be retried.',
  },
}

/** «Tu plan se suspendió»: terminó la gracia sin cobro (una vez por período). */
export function buildSubscriptionSuspended({ subscription, user, accountUrl, logoUrl }) {
  const lang = langOf(subscription.locale)
  const c = SUSPENDED_COPY[lang]
  const t = subscriptionTerms(subscription, lang)
  return render({
    lang,
    logoUrl,
    subject: c.subject(t.tier),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    eyebrowTone: 'danger',
    title: c.title(nameOf(user)),
    intro: c.intro(t.tier),
    notice: c.notice(subscription.provider),
    rows: [
      [c.plan, `${t.tier} · ${t.cycle}`],
      [c.since, dateLong(new Date(), lang)],
    ],
    cta: { href: accountUrl, label: c.cta },
    footer: c.footer,
  })
}

const PLAN_CHANGED_COPY = {
  es: {
    subject: (tier) => `Cambiaste a ${tier} en ScrollLab LAB`,
    preheader: 'Tu nuevo plan ya está activo.',
    eyebrow: 'Cambio de plan',
    title: (name, tier) => `${name}, ya estás en ${tier}.`,
    intro: (from, tier) => `Pasaste de ${from} a ${tier}. El cambio ya rige: tu cupo de secciones es el del plan nuevo.`,
    plan: 'Plan nuevo',
    charged: 'Cobrado hoy (diferencia)',
    next: 'Desde el próximo cobro',
    on: 'Próximo cobro',
    cta: 'Ir a LAB',
    footer: 'Podés cambiar de plan o cancelar cuando quieras desde LAB.',
  },
  en: {
    subject: (tier) => `You switched to ${tier} on ScrollLab LAB`,
    preheader: 'Your new plan is active.',
    eyebrow: 'Plan change',
    title: (name, tier) => `${name}, you’re on ${tier} now.`,
    intro: (from, tier) => `You moved from ${from} to ${tier}. The change is live: your section limit is the new plan’s.`,
    plan: 'New plan',
    charged: 'Charged today (difference)',
    next: 'From your next charge',
    on: 'Next charge',
    cta: 'Go to LAB',
    footer: 'You can switch plans or cancel anytime from LAB.',
  },
}

/**
 * «Cambiaste a <plan>»: desde cuándo y a qué precio; si hubo cobro de la
 * diferencia, el monto. Uno por cambio.
 * @param {{ subscription: any, user: any, accountUrl: string, logoUrl: string, change: { from: string, charged?: number | null } }} args
 */
export function buildSubscriptionPlanChanged({ subscription, user, accountUrl, logoUrl, change }) {
  const lang = langOf(subscription.locale)
  const c = PLAN_CHANGED_COPY[lang]
  const t = subscriptionTerms(subscription, lang)
  const from = subscriptionTerms({ ...subscription, plan: change.from }, lang).tier
  return render({
    lang,
    logoUrl,
    subject: c.subject(t.tier),
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    title: c.title(nameOf(user), t.tier),
    intro: c.intro(from, t.tier),
    rows: [
      [c.plan, `${t.tier} · ${t.cycle}`],
      change.charged ? [c.charged, money(change.charged, t.currency, lang)] : null,
      [c.next, t.priceLabel],
      subscription.currentPeriodEnd ? [c.on, dateLong(subscription.currentPeriodEnd, lang)] : null,
    ],
    cta: { href: accountUrl, label: c.cta },
    footer: c.footer,
  })
}

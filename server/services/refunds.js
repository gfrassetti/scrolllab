import crypto from 'node:crypto'
import { db } from '../db.js'
import { HttpError } from '../errors.js'
import { refundEligibility, labRefundEligibility, REFUND_DAYS } from '../../src/domain/policy.js'
import { HOSTED_PLANS, subscriptionPlanPrice } from '../catalog.js'
import { alertAdmin } from './orders.js'
import { sendWithdrawalReceived, sendWithdrawalConfirm } from './email.js'
import { executeWithdrawal, signWithdrawalToken, verifyWithdrawalToken } from './autoRefund.js'
import { refundWhat } from './refundLedger.js'

/**
 * Botón de arrepentimiento (Resolución 424/2020): un pedido público, sin
 * cuenta. Busca la compra del mail (orden por número, o si no la suscripción de
 * LAB) y decide con la política (src/domain/policy.js):
 *
 * - Corresponde (compra sin descargar en plazo; LAB en la prueba o con el
 *   primer cobro en plazo) y lo pide la cuenta dueña con sesión → se devuelve
 *   (o se da de baja, en la prueba) en el momento, automático.
 * - Corresponde pero sin sesión de la cuenta dueña → mail al dueño de la compra
 *   con un link para confirmar (nadie que sepa un mail ajeno puede pedirla).
 * - No corresponde (descargó, fuera de plazo, renovación de LAB) o no hay
 *   compra → lo revisa el dueño; el cliente recibe el código por mail.
 *
 * La respuesta pública no filtra nada de la compra: con sesión dueña dice qué
 * pasó; sin ella, solo «revisá tu mail».
 */

const DAY_MS = 86_400_000
// Sin 0/O/1/I/L: el código se dicta y se copia a mano.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newWithdrawalCode() {
  let out = ''
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  return `ARR-${out}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const uidOf = (row) => (row ? String(db.uid(row) || row.id) : null)

/**
 * La compra del mail. Con número de orden (completo o los últimos caracteres,
 * como se ve en «Mis compras»): esa orden, y si no coincide no se adivina. Sin
 * número: la suscripción de LAB si tiene una, si no la última compra pagada.
 * Sin una cuenta con ese mail no hay nada: no se filtra si una compra existe.
 */
async function findTarget(email, ref) {
  const none = { user: null, order: null, sub: null }
  const user = await db.findUser({ email })
  if (!user) return none
  const orders = await db.findOrdersByUser(db.uid(user))
  const wanted = clean(ref, 40).replace(/^#/, '').toLowerCase()
  if (wanted) {
    const order = orders.find((o) => {
      const id = String(db.uid(o) || o.id).toLowerCase()
      return wanted.length >= 6 && (id === wanted || id.endsWith(wanted))
    })
    return order ? { user, order, sub: null } : { ...none, user }
  }
  const sub = await db.findActiveSubscriptionByUser(db.uid(user)).catch(() => null)
  if (sub) return { user, order: null, sub }
  const lastPaid = orders
    .filter((o) => o.status === 'paid')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
  return { user, order: lastPaid || null, sub: null }
}

/** El veredicto para el dueño (aviso y panel). */
function verdictLine({ order, sub, e }) {
  if (order) {
    if (e.eligible) return `ELEGIBLE — se devuelve solo: pagada, dentro de ${REFUND_DAYS} días (hasta ${e.deadline?.slice(0, 10)}) y ZIP sin descargar.`
    return (
      {
        downloaded: `NO elegible por arrepentimiento: el ZIP se descargó ${e.downloads} ${e.downloads === 1 ? 'vez' : 'veces'}. Solo corresponde si hay defecto técnico.`,
        expired: `NO elegible: pasó el plazo de ${REFUND_DAYS} días (venció el ${e.deadline?.slice(0, 10)}).`,
        refunded: 'Ya está reembolsada.',
        not_paid: 'La orden no está pagada.',
      }[e.reason] || 'NO elegible.'
    )
  }
  if (sub) {
    return (
      {
        trial: 'LAB en la prueba gratis: no hubo cobro, se da de baja (no paga nada).',
        ok: `LAB ELEGIBLE — se devuelve solo el primer cobro y la suscripción se da de baja (plazo hasta ${e.deadline?.slice(0, 10)}).`,
        renewal: 'LAB: es una renovación, no se devuelve (solo puede cancelar).',
        expired: `LAB: pasaron los ${REFUND_DAYS} días desde el alta (venció el ${e.deadline?.slice(0, 10)}). No se devuelve.`,
      }[e.reason] || 'LAB: revisar.'
    )
  }
  return 'SIN COMPRA: no coincide el mail o el número con ninguna compra ni suscripción. Revisar a mano.'
}

/**
 * @param {{ email: string, name: string, orderRef?: string, message?: string, locale?: string, sessionUser?: any, config: any }} args
 * @returns {Promise<{ code: string, duplicate: boolean, outcome: 'refunded' | 'canceled' | 'pending' | 'review' | 'check_email' }>}
 */
export async function requestWithdrawal({ email, name, orderRef, message, locale, sessionUser = null, config }) {
  const mail = clean(email, 254).toLowerCase()
  const fullName = clean(name, 120)
  if (!EMAIL_RE.test(mail)) throw new HttpError(400, 'Ingresá un email válido', { expose: true })
  if (fullName.length < 2) throw new HttpError(400, 'Ingresá tu nombre', { expose: true })
  const lang = locale === 'en' ? 'en' : 'es'

  const { order, sub } = await findTarget(mail, orderRef)
  const orderId = uidOf(order)
  const subscriptionId = sub ? uidOf(sub) : null
  const ownerId = order?.userId || sub?.userId || null
  const owner = !!sessionUser && !!ownerId && String(db.uid(sessionUser)) === String(ownerId)

  // Un doble click, o pedirlo dos veces, no abre dos solicitudes: vuelve el mismo código.
  const recent = await db.findRecentWithdrawal({ email: mail, orderId, subscriptionId, since: new Date(Date.now() - DAY_MS) })
  if (recent) return { code: recent.code, duplicate: true, outcome: owner ? outcomeOf(recent.status) : 'check_email' }

  const e = order ? refundEligibility(order) : sub ? labRefundEligibility(sub) : null
  const actionable = !!e && (e.eligible || (sub && e.reason === 'trial'))
  const code = newWithdrawalCode()
  const row = await db.createWithdrawal({
    code,
    email: mail,
    name: fullName,
    orderRef: clean(orderRef, 40) || undefined,
    orderId,
    subscriptionId,
    kind: order ? 'order' : sub ? 'lab' : null,
    message: clean(message, 1000) || undefined,
    locale: lang,
    eligibility: e || undefined,
    status: actionable ? (owner ? 'executing' : 'awaiting_confirmation') : 'received',
  })

  const verdict = verdictLine({ order, sub, e })
  const titles = order ? refundWhat({ order }) : sub ? refundWhat({ sub }) : ''
  alertAdmin({
    kind: 'withdrawal',
    key: code,
    title: `ARREPENTIMIENTO — solicitud ${code}`,
    lines: [
      `${fullName} <${mail}>`,
      order
        ? `orden ${orderId} (${order.provider || 'mercadopago'}) · ${titles} · ${order.total} ${order.currency_id}`
        : sub
          ? `suscripción ${subscriptionId} (${sub.provider || 'mercadopago'}) · ${titles} · ${sub.status}`
          : `orden indicada: ${clean(orderRef, 40) || '—'}`,
      verdict,
      actionable ? (owner ? 'Pedido desde su cuenta: se ejecuta ya.' : 'Sin sesión de la cuenta: le mandamos el link para confirmar.') : 'Revisalo y respondele con el código.',
      ...(message ? [`mensaje: ${clean(message, 300)}`] : []),
    ],
    config,
  })

  if (actionable && owner) {
    const out = await executeWithdrawal(row, config)
    return { code, duplicate: false, outcome: outcomeOf(out.status) }
  }
  if (actionable) {
    const { amount, currency } = amountOf({ order, sub })
    sendWithdrawalConfirm({
      to: mail,
      code,
      name: fullName,
      locale: lang,
      what: titles,
      amount,
      currency,
      kind: order ? 'order' : 'lab',
      token: signWithdrawalToken(code, config.downloadSecret),
      config,
    }).catch((err) => console.error('withdrawal confirm email', err?.message))
    return { code, duplicate: false, outcome: 'check_email' }
  }
  // No corresponde solo: el código por mail y lo revisa el dueño.
  sendWithdrawalReceived({ code, email: mail, name: fullName, locale: lang, order, config }).catch((err) =>
    console.error('withdrawal confirmation email', err?.message),
  )
  return { code, duplicate: false, outcome: owner ? 'review' : 'check_email' }
}

/**
 * El cliente tocó «Confirmar la devolución» en el mail: ejecuta una sola vez.
 * @param {{ token: string, config: any }} args
 */
export async function confirmWithdrawal({ token, config }) {
  const code = verifyWithdrawalToken(token, config.downloadSecret)
  if (!code) throw new HttpError(400, 'El link venció o no es válido. Volvé a pedirlo desde el Botón de arrepentimiento.', { expose: true })
  const claimed = await db.claimWithdrawal(code, 'awaiting_confirmation', 'executing')
  if (!claimed) {
    const row = await db.findWithdrawalByCode(code)
    if (!row) throw new HttpError(404, 'No encontramos esa solicitud', { expose: true })
    return { code, outcome: outcomeOf(row.status) }
  }
  const out = await executeWithdrawal(claimed, config)
  return { code, outcome: outcomeOf(out.status) }
}

/** Estado interno → lo que ve el cliente. */
function outcomeOf(status) {
  if (status === 'refunded') return 'refunded'
  if (status === 'canceled') return 'canceled'
  if (status === 'refund_pending' || status === 'refund_retry' || status === 'executing') return 'pending'
  if (status === 'awaiting_confirmation') return 'check_email'
  return 'review'
}

/** Lo que se devolvería (para el mail de confirmación). */
function amountOf({ order, sub }) {
  if (order) return { amount: Number(order.total) || 0, currency: order.currency_id || 'ARS' }
  const usd = sub?.currency_id === 'USD'
  const plan = sub?.paidPlan || sub?.plan
  const price = HOSTED_PLANS[plan] ? subscriptionPlanPrice(sub, plan, sub.paidCycle || sub.cycle, usd ? 'USD' : 'ARS') : 0
  // En la prueba no hay cobro: se confirma la baja, monto 0.
  return { amount: sub?.firstChargeId || sub?.lastPaidAt ? price : 0, currency: usd ? 'USD' : 'ARS' }
}

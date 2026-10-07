import crypto from 'node:crypto'
import { db } from '../db.js'
import { HttpError } from '../errors.js'
import { refundEligibility, REFUND_DAYS } from '../../src/domain/policy.js'
import { alertAdmin } from './orders.js'
import { sendWithdrawalReceived } from './email.js'

/**
 * Botón de arrepentimiento (Resolución 424/2020): un pedido público, sin
 * cuenta, que devuelve un código de seguimiento y le avisa al dueño con la foto
 * del reembolso (¿pagada?, ¿cuántas descargas?, ¿dentro del plazo?) para
 * decidir rápido. Reembolsar sigue siendo manual (panel de Paddle o de Mercado
 * Pago); acá solo se registra, se confirma y se avisa. Ver docs/paddle.md.
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

/**
 * Busca la orden por mail de compra + número (completo o los últimos
 * caracteres, como se ve en «Mis compras»). Sin mail que coincida con la
 * cuenta no hay orden: no se filtra si una orden existe.
 */
async function findOrder(email, ref) {
  const wanted = clean(ref, 40).replace(/^#/, '').toLowerCase()
  if (wanted.length < 6) return null
  const user = await db.findUser({ email })
  if (!user) return null
  const orders = await db.findOrdersByUser(db.uid(user))
  return (
    orders.find((o) => {
      const id = String(db.uid(o) || o.id).toLowerCase()
      return id === wanted || id.endsWith(wanted)
    }) || null
  )
}

/**
 * @param {{ email: string, name: string, orderRef?: string, message?: string, locale?: string, config: any }} args
 * @returns {Promise<{ code: string, duplicate: boolean }>}
 */
export async function requestWithdrawal({ email, name, orderRef, message, locale, config }) {
  const mail = clean(email, 254).toLowerCase()
  const fullName = clean(name, 120)
  if (!EMAIL_RE.test(mail)) throw new HttpError(400, 'Ingresá un email válido', { expose: true })
  if (fullName.length < 2) throw new HttpError(400, 'Ingresá tu nombre', { expose: true })
  const lang = locale === 'en' ? 'en' : 'es'

  const order = await findOrder(mail, orderRef)
  const orderId = order ? String(db.uid(order) || order.id) : null

  // Un doble click, o pedirlo dos veces, no abre dos solicitudes: vuelve el mismo código.
  const recent = await db.findRecentWithdrawal({
    email: mail,
    orderId,
    since: new Date(Date.now() - DAY_MS),
  })
  if (recent) return { code: recent.code, duplicate: true }

  const eligibility = order ? refundEligibility(order) : null
  const code = newWithdrawalCode()
  await db.createWithdrawal({
    code,
    email: mail,
    name: fullName,
    orderRef: clean(orderRef, 40) || undefined,
    orderId,
    message: clean(message, 1000) || undefined,
    locale: lang,
    eligibility: eligibility || undefined,
  })

  const titles = (order?.items || []).map((i) => i.title || i.sku).join(', ')
  const verdict = !order || !eligibility
    ? 'SIN ORDEN: no se pudo asociar (no coincide el mail o el número). Si es de LAB, revisá la suscripción a mano.'
    : eligibility.eligible
      ? `ELEGIBLE — reembolsar: pagada, dentro de ${REFUND_DAYS} días (hasta ${eligibility.deadline?.slice(0, 10)}) y ZIP sin descargar.`
      : {
          downloaded: `NO elegible por arrepentimiento: el ZIP se descargó ${eligibility.downloads} vez/veces. Solo corresponde si hay defecto técnico.`,
          expired: `NO elegible: pasó el plazo de ${REFUND_DAYS} días (venció el ${eligibility.deadline?.slice(0, 10)}).`,
          refunded: 'Ya está reembolsada.',
          not_paid: 'La orden no está pagada.',
        }[eligibility.reason] || 'NO elegible.'
  alertAdmin({
    kind: 'withdrawal',
    key: code,
    title: `ARREPENTIMIENTO — solicitud ${code}`,
    lines: [
      `${fullName} <${mail}>`,
      order
        ? `orden ${orderId} (${order.provider || 'mercadopago'}) · ${titles} · ${order.total} ${order.currency_id}`
        : `orden indicada: ${clean(orderRef, 40) || '—'}`,
      verdict,
      ...(message ? [`mensaje: ${clean(message, 300)}`] : []),
      'Reembolsá desde el panel de Paddle o de Mercado Pago y respondele al cliente con el código.',
    ],
    config,
  })

  // El código se entrega ya; el mail de confirmación no frena la respuesta.
  sendWithdrawalReceived({ code, email: mail, name: fullName, locale: lang, order, config }).catch(
    (err) => console.error('withdrawal confirmation email', err?.message),
  )
  return { code, duplicate: false }
}

/**
 * Cupón de bienvenida: 10% en la primera compra, uno por mail y de un solo uso.
 * Se le da a quien entra con su cuenta de Google y todavía no compró (ver
 * `claimWelcomeCoupon`): no hay formulario, el mail sale una sola vez al crearlo.
 * Vive en el lead (couponCode / couponPercent / couponExpiresAt / couponRedeemedAt).
 * El cliente solo manda el código: el descuento lo calcula el servidor sobre el
 * precio de lista (ver POST /api/checkout) y nunca sale de un monto del cliente.
 */
import crypto from 'node:crypto'
import { db } from '../db.js'
import { HttpError, cleanUtm, normalizeLeadEmail } from '../validation.js'
import {
  WELCOME_COUPON_BOUND_TO_EMAIL,
  WELCOME_COUPON_DAYS,
  WELCOME_COUPON_PERCENT,
} from '../catalog.js'
import { sendCouponEmail } from './email.js'

// Sin 0/O/1/I/L: el código se dicta y se tipea a mano.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
export const COUPON_CODE_RE = new RegExp(`^SL-[${ALPHABET}]{${CODE_LENGTH}}$`)
const DAY_MS = 24 * 60 * 60 * 1000

export function generateCouponCode() {
  let code = 'SL-'
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)]
  }
  return code
}

/** Tolera minúsculas, espacios y guiones sueltos. Devuelve el código canónico o null. */
export function normalizeCouponCode(raw) {
  const compact = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!compact.startsWith('SL')) return null
  const code = `SL-${compact.slice(2)}`
  return COUPON_CODE_RE.test(code) ? code : null
}

/**
 * El mail sin sus variantes: minúsculas, sin "+etiqueta" y, en Gmail, sin puntos
 * (ana.perez+promo@gmail.com y anaperez@gmail.com son la misma casilla).
 */
export function canonicalEmail(email) {
  const [rawLocal = '', rawDomain = ''] = String(email ?? '')
    .trim()
    .toLowerCase()
    .split('@')
  const domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain
  let local = rawLocal.split('+')[0]
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domain}`
}

/** a***@gmail.com: le alcanza al dueño para reconocer su mail. */
export function maskEmail(email) {
  const [local = '', domain = ''] = String(email ?? '').split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

/** 'none' | 'active' | 'redeemed' | 'expired' */
export function couponStatus(lead, now = new Date()) {
  if (!lead?.couponCode) return 'none'
  if (lead.couponRedeemedAt) return 'redeemed'
  if (new Date(lead.couponExpiresAt).getTime() <= now.getTime()) return 'expired'
  return 'active'
}

export function publicCoupon(lead) {
  return {
    code: lead.couponCode,
    percent: lead.couponPercent,
    expiresAt: new Date(lead.couponExpiresAt).toISOString(),
    emailHint: maskEmail(lead.email),
  }
}

/** Le da su cupón al lead si todavía no tiene: uno por mail, para siempre. */
export async function ensureCoupon(lead, now = new Date()) {
  if (lead.couponCode) return lead
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCouponCode()
    if (await db.findLeadByCoupon(code)) continue
    lead.couponCode = code
    lead.couponPercent = WELCOME_COUPON_PERCENT
    lead.couponExpiresAt = new Date(now.getTime() + WELCOME_COUPON_DAYS * DAY_MS)
    try {
      await lead.save()
      return lead
    } catch (err) {
      if (err?.code !== 11000) throw err // 11000: otro alta se quedó con ese código
      lead.couponCode = undefined
    }
  }
  throw new Error('No se pudo generar un cupón único')
}

/**
 * Valida un código para pagar con él. Los errores se distinguen por status y el
 * front los traduce: 404 no existe · 409 ya usado · 410 vencido · 403 es de
 * otro mail (code `coupon_other_account`) · 422 no es su primera compra. Las
 * dos últimas solo se chequean si se conoce al usuario (`userEmail`, `userId`).
 *
 * Personal: el código solo vale con la cuenta de Google del mail que lo pidió.
 * Sin eso es un código al portador: aunque se reenvíe a miles de personas
 * canjea el primero que pague, que puede ser un tercero.
 */
export async function resolveCouponForCheckout({
  code,
  userId = null,
  userEmail = null,
  bound = WELCOME_COUPON_BOUND_TO_EMAIL,
  now = new Date(),
}) {
  const canonical = normalizeCouponCode(code)
  const lead = canonical ? await db.findLeadByCoupon(canonical) : null
  if (!lead) throw new HttpError(404, 'Ese cupón no existe.')

  const status = couponStatus(lead, now)
  if (status === 'redeemed') throw new HttpError(409, 'Ese cupón ya se usó.')
  if (status === 'expired') throw new HttpError(410, 'Ese cupón venció.')

  if (bound && userEmail && canonicalEmail(userEmail) !== canonicalEmail(lead.email)) {
    const emailHint = maskEmail(lead.email)
    throw new HttpError(
      403,
      `Este cupón es para ${emailHint}. Entrá con esa cuenta de Google.`,
      { code: 'coupon_other_account', details: { emailHint } },
    )
  }

  if (userId) {
    const orders = await db.findOrdersByUser(userId)
    if (orders.some((order) => order.status === 'paid')) {
      throw new HttpError(422, 'El cupón vale solo para la primera compra.')
    }
  }
  return { lead, code: canonical, percent: lead.couponPercent }
}

/**
 * El cupón de bienvenida de quien tiene sesión. Idempotente: la primera vez lo
 * crea (y manda el mail); las siguientes devuelven el mismo, sin mail.
 *
 *  - Solo para quien todavía no compró (`eligible: false` si ya hay una orden
 *    paga): el cupón es de primera compra y no se le ofrece a un cliente.
 *  - El mail es el de la cuenta de Google, así que el cupón queda atado a la
 *    cuenta con la que va a pagar sin pedirle nada.
 *  - El canal de origen (utm) se guarda en el alta y la primera visita gana.
 */
export async function claimWelcomeCoupon({
  user,
  locale,
  utm,
  config,
  now = new Date(),
  sendEmail = sendCouponEmailSafely,
}) {
  const orders = await db.findOrdersByUser(db.uid(user))
  if (orders.some((order) => order.status === 'paid')) {
    return { eligible: false, coupon: null, couponStatus: 'none', created: false, emailed: false }
  }

  const { lead, created } = await db.upsertLead({
    email: normalizeLeadEmail(user.email),
    source: 'account',
    locale: locale === 'en' ? 'en' : 'es',
    ...cleanUtm(utm),
  })
  await ensureCoupon(lead, now)
  // El mail sale solo al crear el cupón: entrar cien veces no llena la casilla.
  const emailed = created ? await sendEmail({ lead, config }) : false

  const status = couponStatus(lead, now)
  return {
    eligible: true,
    coupon: status === 'active' ? publicCoupon(lead) : null,
    couponStatus: status,
    created,
    emailed,
  }
}

/** Canjea el cupón de una orden recién pagada. Repetir con la misma orden es ok. */
export async function redeemCouponForOrder(order) {
  if (!order?.couponCode) return { redeemed: false }
  return db.redeemCoupon({
    code: order.couponCode,
    orderId: String(db.uid(order) || order.id),
  })
}

/** Mail del cupón, sin tirar: el cupón ya se muestra en pantalla. */
export async function sendCouponEmailSafely({ lead, config, client }) {
  try {
    const out = await sendCouponEmail({ lead, config, client })
    return out.sent === true
  } catch (err) {
    console.error('Coupon email failed', err.message)
    return false
  }
}

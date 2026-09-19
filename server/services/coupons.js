/**
 * Cupón de bienvenida: 10% en la primera compra, uno por mail y de un solo uso.
 * Vive en el lead (couponCode / couponPercent / couponExpiresAt / couponRedeemedAt).
 * El cliente solo manda el código: el descuento lo calcula el servidor sobre el
 * precio de lista (ver POST /api/checkout) y nunca sale de un monto del cliente.
 */
import crypto from 'node:crypto'
import { db } from '../db.js'
import { HttpError } from '../validation.js'
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

/**
 * Cambios de precio de LAB para los que ya están suscriptos: la lista
 * declarada (append-only mientras haya avisos sin aplicar) y las reglas puras
 * de a quién afecta, cuándo rige y cuándo se recuerda. El servicio
 * (server/services/subscriptions/priceChange.js) lee el monto real y las
 * fechas del proveedor y le pregunta a estas funciones.
 *
 * Decisiones del dueño (2026-10-12):
 * - Suba: aviso por mail con 15 días; el precio nuevo rige desde el primer cobro
 *   que cae al menos 15 días después de que SALIÓ el mail (no de cuando se
 *   anunció), y nunca se aplica sin mail enviado.
 * - Baja: rige en el próximo cobro, con un mail corto.
 * - Anual: aviso al anunciar y un recordatorio cerca del cobro con el precio
 *   nuevo (el cobro puede estar a 11 meses).
 * Lo legal (cuántos días exige la ley, el derecho a cancelar) lo confirma el
 * dueño con quien lo asesore: estos números son su decisión, no un «cumple».
 *
 * Dominio puro: sin I/O, sin React, sin servicios.
 */

/** Días entre el mail de una suba y el primer cobro con el precio nuevo. */
export const PRICE_NOTICE_DAYS = 15

/** Anual: el recordatorio sale cuando faltan esto o menos para el cobro con el precio nuevo. */
export const YEARLY_REMINDER_DAYS = 40

/**
 * Los cambios declarados. Un deploy con un precio tocado por error en la lista
 * no dispara nada: el aviso sale solo por una entrada acá, y `npm run check`
 * exige que `to` sea el precio de lista vigente y que la cadena de cada
 * plan/ciclo/moneda sea coherente (`validatePriceChanges`).
 *
 * @type {ReadonlyArray<PriceChange>}
 *
 * @typedef {Object} PriceChange
 * @property {string} id           único y estable (ej. 'pro-monthly-ARS-2026-11')
 * @property {string} plan         'hosted_starter' | 'hosted_pro' | 'hosted_studio'
 * @property {'monthly' | 'yearly'} cycle
 * @property {'ARS' | 'USD'} currency
 * @property {number} from         el precio anterior (el `to` del cambio anterior de la misma cadena)
 * @property {number} to           el precio nuevo (= el de lista vigente si es el último de su cadena)
 * @property {string} announcedOn  'YYYY-MM-DD'
 */
export const HOSTED_PRICE_CHANGES = Object.freeze([])

const DAY = 86400000
const t = (d) => (d instanceof Date ? d.getTime() : Date.parse(d))

/** @param {PriceChange} change */
export function priceChangeKind(change) {
  if (change.to > change.from) return 'increase'
  if (change.to < change.from) return 'decrease'
  return 'none'
}

/**
 * ¿Este cambio le toca a esta suscripción? `currentAmount` es lo que el
 * proveedor le cobra hoy (MP auto_recurring.transaction_amount / Paddle precio
 * del item), no la lista: si ya paga `to` (entró después) no se le avisa nada,
 * y una suba nunca se le aplica a quien paga más que `to`.
 *
 * @param {PriceChange} change
 * @param {{ plan?: string, cycle?: string, currency_id?: string, status?: string, canceledAt?: any, qa?: boolean }} sub
 * @param {number | null | undefined} currentAmount
 */
export function affectedBy(change, sub, currentAmount) {
  if (!sub || sub.qa) return false
  if (sub.canceledAt || !['authorized', 'paused'].includes(String(sub.status))) return false
  if (sub.plan !== change.plan || sub.cycle !== change.cycle) return false
  if ((sub.currency_id || 'ARS') !== change.currency) return false
  if (typeof currentAmount !== 'number' || !Number.isFinite(currentAmount)) return false
  const kind = priceChangeKind(change)
  if (kind === 'increase') return currentAmount < change.to
  if (kind === 'decrease') return currentAmount > change.to
  return false
}

/**
 * Desde cuándo puede regir el precio nuevo: el mail tiene que haber salido
 * (sin mail no hay precio nuevo). Suba: 15 días después del mail. Baja: ya.
 * @param {PriceChange} change
 * @param {Date | string | null | undefined} emailSentAt
 * @returns {Date | null}
 */
export function earliestEffectiveAt(change, emailSentAt) {
  if (!emailSentAt) return null
  const sent = t(emailSentAt)
  if (!Number.isFinite(sent)) return null
  return new Date(priceChangeKind(change) === 'increase' ? sent + PRICE_NOTICE_DAYS * DAY : sent)
}

/**
 * ¿Se cambia ya el monto en el proveedor? Solo si el próximo cobro (la fecha
 * REAL del proveedor: MP next_payment_date / Paddle next_billed_at) cae en o
 * después de `earliestEffectiveAt`: es decir, después del último cobro a precio
 * viejo y antes del primero a precio nuevo. Si el próximo cobro es antes, se
 * espera a que pase (ese cobro va con el precio viejo, como se avisó).
 *
 * @returns {'apply' | 'wait' | 'no-email'}
 */
export function applyDecision({ change, emailSentAt, nextChargeAt, appliedAt = null }) {
  if (appliedAt) return 'wait'
  const earliest = earliestEffectiveAt(change, emailSentAt)
  if (!earliest) return 'no-email'
  const next = t(nextChargeAt)
  if (!Number.isFinite(next)) return 'wait'
  return next >= earliest.getTime() ? 'apply' : 'wait'
}

/**
 * Anual: el recordatorio sale una vez, cuando el cobro con el precio nuevo
 * está a YEARLY_REMINDER_DAYS o menos, si el aviso original salió antes de esa
 * ventana (si salió adentro, ya es reciente y no hace falta otro).
 */
export function needsYearlyReminder({ change, emailSentAt, reminderSentAt = null, nextChargeAt, now }) {
  if (change.cycle !== 'yearly' || priceChangeKind(change) !== 'increase') return false
  if (!emailSentAt || reminderSentAt) return false
  const next = t(nextChargeAt)
  const sent = t(emailSentAt)
  const nowMs = t(now)
  if (![next, sent, nowMs].every(Number.isFinite)) return false
  const earliest = earliestEffectiveAt(change, emailSentAt)
  if (!earliest || next < earliest.getTime()) return false // ese cobro todavía va con el precio viejo
  const windowStart = next - YEARLY_REMINDER_DAYS * DAY
  return nowMs >= windowStart && nowMs < next && sent < windowStart
}

/**
 * Coherencia de la lista (la corre `npm run check`, que conoce la lista vigente).
 * @param {ReadonlyArray<PriceChange>} list
 * @param {(plan: string, cycle: string, currency: string) => number | null} listPriceOf
 * @returns {string[]} problemas
 */
export function validatePriceChanges(list, listPriceOf) {
  const problems = []
  const ids = new Set()
  const chains = new Map()
  for (const c of list) {
    if (!c?.id) {
      problems.push('un cambio de precio sin id')
      continue
    }
    if (ids.has(c.id)) problems.push(`${c.id}: id repetido`)
    ids.add(c.id)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.announcedOn))) problems.push(`${c.id}: announcedOn no es YYYY-MM-DD`)
    if (!['monthly', 'yearly'].includes(c.cycle)) problems.push(`${c.id}: ciclo desconocido ${c.cycle}`)
    if (!['ARS', 'USD'].includes(c.currency)) problems.push(`${c.id}: moneda desconocida ${c.currency}`)
    if (!(c.from > 0) || !(c.to > 0)) problems.push(`${c.id}: from y to tienen que ser montos positivos`)
    if (c.from === c.to) problems.push(`${c.id}: from y to son iguales`)
    const key = `${c.plan}|${c.cycle}|${c.currency}`
    chains.set(key, [...(chains.get(key) || []), c])
  }
  for (const [key, chain] of chains) {
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1]
      const cur = chain[i]
      if (cur.from !== prev.to) problems.push(`${cur.id}: from (${cur.from}) no es el to del anterior (${prev.id}: ${prev.to})`)
      if (String(cur.announcedOn) < String(prev.announcedOn)) problems.push(`${cur.id}: anunciado antes que ${prev.id} (la lista es en orden)`)
    }
    const last = chain[chain.length - 1]
    const [plan, cycle, currency] = key.split('|')
    const listPrice = listPriceOf(plan, cycle, currency)
    if (listPrice == null) problems.push(`${last.id}: el plan ${plan} no existe`)
    else if (last.to !== listPrice) {
      problems.push(`${last.id}: to (${last.to}) no es el precio de lista vigente de ${plan} ${cycle} ${currency} (${listPrice})`)
    }
  }
  return problems
}

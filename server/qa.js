import { HttpError } from './errors.js'

/**
 * ¿Esta cuenta puede ver y comprar los productos de prueba? Solo los mails de
 * `QA_BUYER_EMAILS` (src/domain/qa.js).
 * @param {any} user
 * @param {any} config
 */
export function isQaBuyer(user, config) {
  const email = String(user?.email || '').trim().toLowerCase()
  return !!email && (config?.qaBuyerEmails || []).includes(email)
}

/**
 * Corta si la cuenta no está autorizada. El error es el mismo que un SKU que no
 * existe: no se filtra que hay productos de prueba.
 * @param {any} user
 * @param {any} config
 * @param {string} [what]
 */
export function assertQaBuyer(user, config, what = 'SKU inválido') {
  if (!isQaBuyer(user, config)) throw new HttpError(400, what)
}

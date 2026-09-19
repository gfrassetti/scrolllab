/**
 * Alta al formulario de novedades. Guarda el mail en la API (POST /api/leads);
 * la copia al CRM la hace el servidor.
 */
import { api } from './api.js'

/** `kind`: invalid (400) · rate (429) · network (sin respuesta) · server (el resto). */
export class LeadError extends Error {
  constructor(kind) {
    super(kind)
    this.name = 'LeadError'
    this.kind = kind
  }
}

/**
 * Devuelve lo que responde la API: `{ ok, coupon, couponStatus, emailed }`.
 * `website` es el honeypot: un humano lo deja vacío.
 */
export async function submitLead(
  { email, source, locale, website = '', utm = null },
  post = api.lead,
) {
  try {
    return await post({ email, source, locale, website, ...(utm ? { utm } : {}) })
  } catch (err) {
    if (err?.status === 400) throw new LeadError('invalid')
    if (err?.status === 429) throw new LeadError('rate')
    if (err?.status) throw new LeadError('server')
    throw new LeadError('network')
  }
}

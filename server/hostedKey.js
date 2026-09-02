import crypto from 'node:crypto'

/**
 * Clave pública de una instancia hosteada. Va en el `<script data-key>` del
 * cliente y en la URL del config. No es secreta (viaja en HTML ajeno) pero sí
 * revocable: borrar/suspender la instancia la invalida.
 */
export function newHostedKey() {
  return `pub_${crypto.randomBytes(12).toString('hex')}`
}

export const HOSTED_KEY_RE = /^pub_[a-f0-9]{24}$/

export function isHostedKey(value) {
  return typeof value === 'string' && HOSTED_KEY_RE.test(value)
}

/** hostname del sitio que pide el config (para el domain-lock). */
export function requestHost(req) {
  const raw = req.headers.origin || req.headers.referer || ''
  if (!raw) return null
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i

/** Normaliza y valida una lista de dominios para el allowlist. */
export function cleanDomains(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    let host = raw.trim().toLowerCase()
    if (!host) continue
    if (host.includes('/')) {
      try {
        host = new URL(host.includes('://') ? host : `https://${host}`).hostname
      } catch {
        continue
      }
    }
    host = host.replace(/^www\./, '')
    if (!HOSTNAME_RE.test(host)) continue
    if (!out.includes(host)) out.push(host)
    if (out.length >= 10) break
  }
  return out
}

/** ¿`host` (o su base sin www) está en el allowlist? Lista vacía = sin lock. */
export function domainAllowed(domains, host) {
  if (!Array.isArray(domains) || domains.length === 0) return true
  if (!host) return false
  const base = host.replace(/^www\./, '')
  return domains.includes(host) || domains.includes(base)
}

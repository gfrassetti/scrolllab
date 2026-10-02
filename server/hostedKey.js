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

/**
 * hostname del sitio donde está embebida la sección (para el domain-lock).
 *
 * El config lo pide el iframe, que corre en NUESTRO origen: su `Origin` es
 * siempre embed.scrolllab.com.ar, nunca el sitio del cliente. Por eso el frame
 * manda `?host=` con el sitio que lo contiene (lo lee de
 * `location.ancestorOrigins`, del referrer o del loader). Sin `host` (un frame
 * viejo, un pedido directo a la API) queda el `Origin`/`Referer` del pedido.
 */
const EMBED_HOST_RE = /^[a-z0-9]([a-z0-9-]{0,62}\.)*[a-z0-9-]{1,63}$/

export function requestHost(req) {
  const fromFrame = String(req.query?.host || '').trim().toLowerCase()
  if (fromFrame) return fromFrame.length <= 253 && EMBED_HOST_RE.test(fromFrame) ? fromFrame : null
  const raw = req.headers.origin || req.headers.referer || ''
  if (!raw) return null
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i
// Sin TLD pero legítimos: probar el embed en la máquina antes de subir el sitio.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

/** Normaliza y valida una lista de dominios para el allowlist. */
export function cleanDomains(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    let host = raw.trim().toLowerCase()
    if (!host) continue
    if (host.includes('/') || host.includes(':')) {
      try {
        host = new URL(host.includes('://') ? host : `https://${host}`).hostname
      } catch {
        continue
      }
    }
    host = host.replace(/^www\./, '')
    if (!HOSTNAME_RE.test(host) && !LOCAL_HOSTS.has(host)) continue
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

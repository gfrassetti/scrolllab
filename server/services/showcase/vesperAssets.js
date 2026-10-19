import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * VESPER, la vitrina del Estudio: los modelos y las imágenes viajan cifrados (scripts/vesper-seal.mjs) y
 * se entregan solo con un link que vence. La página pide un pase (dura 15 min) y con él baja cada pieza;
 * un link copiado deja de andar enseguida y otro sitio no puede colgarse de los archivos.
 *
 * No es una caja fuerte (lo que el navegador muestra se puede sacar de la memoria): es que copiarlo
 * cueste mucho más que mirarlo.
 */
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../showcase/vesper')
const TTL_MS = 15 * 60 * 1000
const ID_RE = /^[0-9a-f]{20}$/

const sign = (secret, exp) => crypto.createHmac('sha256', secret).update(`vesper:${exp}`).digest('base64url').slice(0, 27)

/** Un pase nuevo: `<vence>.<firma>`. */
export function issuePass(secret, now = Date.now()) {
  const exp = now + TTL_MS
  return { pass: `${exp}.${sign(secret, exp)}`, expiresAt: exp }
}

/** ¿El pase es nuestro y sigue vigente? */
export function passIsValid(secret, pass, now = Date.now()) {
  const m = /^(\d{13})\.([\w-]{27})$/.exec(String(pass || ''))
  if (!m) return false
  const exp = Number(m[1])
  if (exp < now || exp > now + TTL_MS) return false
  const want = Buffer.from(sign(secret, exp))
  const got = Buffer.from(m[2])
  return want.length === got.length && crypto.timingSafeEqual(want, got)
}

/** La ruta del archivo sellado, o null si el id no es válido o no existe. */
export function sealedAssetPath(id) {
  if (!ID_RE.test(String(id || ''))) return null
  const file = path.join(DIR, `${id}.bin`)
  return fs.existsSync(file) ? file : null
}

/**
 * ¿El pedido viene de nuestra propia página? Con `Sec-Fetch-Site` (todos los navegadores actuales) alcanza;
 * si falta, se mira el Origin o el Referer contra los orígenes permitidos.
 */
export function fromOurSite(headers, allowed) {
  const site = headers['sec-fetch-site']
  if (site) return site === 'same-origin' || site === 'same-site'
  for (const h of [headers.origin, headers.referer]) {
    if (!h) continue
    try {
      return allowed.has(new URL(h).origin)
    } catch {
      return false
    }
  }
  return false
}

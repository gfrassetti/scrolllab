import crypto from 'node:crypto'
import { db } from '../db.js'
import { HttpError } from '../errors.js'
import { sanitizeAuthReturn } from '../authReturn.js'
import { sendLoginLink } from './email.js'

/**
 * Entrar con un link por mail (sin Google): para quien no usa Google o está en
 * el navegador de una app (Instagram, TikTok…), donde Google no deja entrar.
 *
 * - El token es aleatorio (256 bits) y viaja solo en el mail; se guarda su hash.
 * - Vale LINK_TTL_MS y una sola vez. El link abre una página del sitio con un
 *   botón «Entrar»: el canje es un POST, así un antivirus de mail que abre los
 *   links para revisarlos no lo gasta.
 * - Pedirlo responde siempre lo mismo, exista o no la cuenta (no se puede
 *   averiguar quién compró). Tope de MAX_PER_WINDOW mails por dirección.
 * - El mail es la cuenta: si ya entró con Google con ese mail, es la misma.
 */
export const LINK_TTL_MS = 15 * 60 * 1000
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_WINDOW = 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

/**
 * @param {{ email: any, next?: any, locale?: any, config: any, client?: any }} args
 * @returns {Promise<{ ok: true }>}
 */
export async function requestLoginLink({ email, next, locale, config, client }) {
  const mail = String(email || '').trim().toLowerCase().slice(0, 254)
  if (!EMAIL_RE.test(mail)) throw new HttpError(400, 'Falta un email válido', { expose: true })
  const lang = locale === 'en' ? 'en' : 'es'

  const recent = await db.countLoginLinksSince(mail, new Date(Date.now() - WINDOW_MS))
  if (recent >= MAX_PER_WINDOW) return { ok: true }

  const token = crypto.randomBytes(32).toString('base64url')
  await db.createLoginLink({
    tokenHash: hashToken(token),
    email: mail,
    next: sanitizeAuthReturn(next) || null,
    locale: lang,
    expiresAt: new Date(Date.now() + LINK_TTL_MS),
  })
  try {
    const sent = await sendLoginLink({ to: mail, token, locale: lang, config, client })
    // Desarrollo sin mails: el link sale en la consola para poder entrar igual.
    if (sent?.skipped && !config.isProd) {
      console.log(`login link (sin mail) ${mail}: ${new URL('/login/email', config.clientUrl)}?token=${token}`)
    }
  } catch (err) {
    console.error('login link email failed', err?.message || err)
    throw new HttpError(502, 'No pudimos mandar el mail. Podés intentarlo de nuevo en un momento.', { expose: true })
  }
  return { ok: true }
}

/**
 * Canjea el token: la cuenta de ese mail (la crea si no existe) y adónde volver.
 * @param {{ token: any }} args
 */
export async function consumeLoginLink({ token }) {
  const raw = String(token || '')
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(raw)) throw new HttpError(400, 'Link inválido', { expose: true })
  const link = await db.consumeLoginLink(hashToken(raw))
  if (!link) {
    throw new HttpError(410, 'El link venció o ya se usó. Podés pedir otro desde «Entrar».', { expose: true })
  }
  let user = await db.findUser({ email: link.email })
  if (!user) {
    user = await db.createUser({ email: link.email, name: link.email.split('@')[0] })
  }
  return { user, next: sanitizeAuthReturn(link.next) || '/account' }
}

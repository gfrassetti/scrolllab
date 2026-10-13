import { Resend } from 'resend'
import nodemailer from 'nodemailer'

/**
 * Cliente de correo con la misma forma que el de Resend: `emails.send(payload,
 * { idempotencyKey })` devuelve `{ data: { id }, error }`. Con `SMTP_USER` +
 * `SMTP_PASS` los mails salen por SMTP (Gmail con contraseña de aplicación):
 * el remitente es esa cuenta y Gmail le muestra al destinatario su foto de
 * perfil. Sin eso, sigue Resend con el dominio verificado.
 *
 * SMTP no tiene clave de idempotencia: se recuerda en memoria durante un día
 * (un reintento del mismo evento no repite el mail mientras el proceso viva;
 * los que importan además tienen su reclamo en la base).
 */
const SEEN_TTL_MS = 24 * 60 * 60 * 1000
const seen = new Map()

function alreadySent(key, now = Date.now()) {
  if (!key) return false
  for (const [k, at] of seen) if (now - at > SEEN_TTL_MS) seen.delete(k)
  if (seen.has(key)) return true
  seen.set(key, now)
  return false
}

/** Prepara el cliente SMTP una sola vez por combinación de datos de acceso. */
const transports = new Map()
function transportFor(smtp) {
  const id = `${smtp.host}:${smtp.port}:${smtp.user}`
  let transport = transports.get(id)
  if (!transport) {
    transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    })
    transports.set(id, transport)
  }
  return transport
}

/**
 * @param {any} config configuración del servidor (`config.email`)
 * @param {{ transport?: any }} [opts] `transport`: para los tests
 */
export function createMailClient(config, opts = {}) {
  const smtp = config.email.smtp
  if (!smtp?.user || !smtp?.pass) return new Resend(config.email.apiKey)
  return {
    emails: {
      async send(payload, options = {}) {
        if (alreadySent(options.idempotencyKey)) return { data: { id: null }, error: null }
        try {
          const info = await (opts.transport || transportFor(smtp)).sendMail({
            from: payload.from,
            to: payload.to,
            replyTo: payload.replyTo,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            attachments: payload.attachments,
          })
          return { data: { id: info.messageId || null }, error: null }
        } catch (err) {
          // Si falló, el reintento tiene que poder salir.
          if (options.idempotencyKey) seen.delete(options.idempotencyKey)
          return { data: null, error: { message: err?.message || 'SMTP rechazó el correo' } }
        }
      },
    },
  }
}

import { Resend } from 'resend'

/**
 * Cliente de correo: Resend con el dominio verificado (`emails.send(payload,
 * { idempotencyKey })` → `{ data: { id }, error }`). El envío por SMTP (Gmail)
 * se sacó el 2026-10-17: Railway bloquea SMTP saliente y su dependencia
 * (nodemailer) arrastraba vulnerabilidades conocidas.
 * @param {any} config configuración del servidor (`config.email`)
 */
export function createMailClient(config) {
  return new Resend(config.email.apiKey)
}

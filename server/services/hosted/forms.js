import crypto from 'node:crypto'
import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { isHostedKey } from '../../hostedKey.js'
import { cleanLabFormMessage, isLabFormSection } from '../../../src/domain/labForms.js'
import { sendLabFormMessage } from '../email.js'
import { hostedServability } from './serving.js'

/**
 * Formularios de LAB (src/domain/labForms.js): el visitante del sitio del
 * cliente manda el formulario y le llega por mail al dueño del widget, con
 * reply-to al visitante. Solo un widget publicado, que hoy se sirve en ese
 * dominio y que es un formulario. Sin `req`/`res`.
 */

/** Tope por widget y por día (UTC): frena a un bot que pasó el límite por IP. */
export const LAB_FORM_DAILY_CAP = 100

/** key → { day, count }. En memoria: un reinicio lo pone en cero, alcanza como freno. */
const daily = new Map()

function overDailyCap(key, now = new Date()) {
  const day = now.toISOString().slice(0, 10)
  const row = daily.get(key)
  if (!row || row.day !== day) {
    daily.set(key, { day, count: 1 })
    return false
  }
  row.count += 1
  return row.count > LAB_FORM_DAILY_CAP
}

/** Solo para tests: vuelve el contador a cero. */
export function resetLabFormCaps() {
  daily.clear()
}

/** El idioma de los mails del dueño: el de su última suscripción (o español). */
async function ownerLocale(userId) {
  try {
    const subs = await db.findSubscriptionsByUser(userId)
    return subs?.[0]?.locale === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

/**
 * @param {{ key: string, host: string | null | undefined, body: unknown, config: any, client?: any }} args
 * @returns {Promise<{ ok: true, delivered: boolean }>}
 */
export async function deliverLabForm({ key, host, body, config, client }) {
  if (!isHostedKey(key)) throw new HttpError(404, 'No encontrado')
  const inst = await db.findHostedInstanceByKey(key)
  const { error } = await hostedServability(inst, host, config)
  if (error) throw error
  if (!isLabFormSection(inst.sectionId)) throw new HttpError(404, 'Este widget no es un formulario')

  const owner = await db.findUserById(inst.userId)
  if (!owner?.email) throw new HttpError(409, 'El widget no tiene a quién mandarle el mensaje')
  const locale = await ownerLocale(inst.userId)
  const message = cleanLabFormMessage(body, locale)
  if (!message) throw new HttpError(400, 'El formulario llegó vacío o es demasiado largo')
  // El campo trampa vino lleno: para el bot salió bien, pero no se manda nada.
  if ('spam' in message) return { ok: true, delivered: false }
  if (overDailyCap(key)) throw new HttpError(429, 'Este formulario recibió demasiados mensajes hoy')

  const id = db.uid(inst) || inst.id
  const result = await sendLabFormMessage({
    to: owner.email,
    id: crypto.randomUUID(),
    message,
    host: host || null,
    locale,
    labUrl: `${String(config.clientUrl || '').replace(/\/$/, '')}/lab/${id}`,
    config,
    client,
  })
  if (result?.skipped) console.warn(`[lab-form] mail apagado (${result.skipped}): mensaje de ${key} sin enviar`)
  return { ok: true, delivered: !!result?.sent }
}

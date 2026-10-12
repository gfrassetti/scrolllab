import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { isHostableSectionId } from '../../sections.js'
import { sanitizeHostedProps } from '../../sectionFields.js'
import { newEditToken, isEditToken, hashEditToken } from '../../hostedKey.js'

/**
 * Link de edición: el dueño de un widget le da a su cliente un link secreto
 * para que cambie textos, fotos y colores sin cuenta y sin ver la facturación.
 *
 * Lo que puede hacer quien tiene el link — y solo eso:
 *  - leer y guardar el borrador (mismos filtros que el dueño: sanitizeHostedProps)
 *  - republicar un widget que YA está publicado (no consume cupo: el dueño ya lo
 *    publicó). La primera publicación y despublicar son del dueño.
 * No toca dominios, no borra, no ve plan ni cuenta. El token se guarda hasheado.
 */

/**
 * Genera (o reemplaza) el link. Devuelve el token en claro: es la única vez
 * que existe fuera del hash.
 * @param {{ inst: any }} args
 */
export async function createEditLink({ inst }) {
  const token = newEditToken()
  inst.editTokenHash = hashEditToken(token)
  inst.editTokenCreatedAt = new Date()
  await inst.save()
  return token
}

/** @param {{ inst: any }} args */
export async function revokeEditLink({ inst }) {
  inst.editTokenHash = undefined
  inst.editTokenCreatedAt = undefined
  if (typeof inst.markModified === 'function') {
    inst.markModified('editTokenHash')
    inst.markModified('editTokenCreatedAt')
  }
  await inst.save()
}

/**
 * La instancia de ese token, o 404 (igual para «no existe» y «mal formado»: no
 * se filtra nada). Una suspendida no se edita.
 * @param {string} token
 */
export async function findByEditToken(token) {
  if (!isEditToken(token)) throw new HttpError(404, 'Link no válido')
  const inst = await db.findHostedInstanceByEditTokenHash(hashEditToken(token))
  if (!inst) throw new HttpError(404, 'Link no válido')
  if (inst.status === 'suspended') {
    throw new HttpError(403, 'Este widget está suspendido', { expose: true })
  }
  return inst
}

/**
 * Lo único que ve quien edita con el link. `freeBadge`: el sitio del dueño
 * muestra el sello «Hecho con Scroll Lab» (plan gratis); el preview del cliente
 * lo tiene que mostrar igual.
 * @param {any} inst
 * @param {{ freeBadge?: boolean }} [extra]
 */
export function sharedView(inst, { freeBadge = false } = {}) {
  return {
    freeBadge,
    sectionId: inst.sectionId,
    status: inst.status,
    draftProps: inst.draftProps || {},
    publishedProps: inst.publishedProps || null,
    updatedAt: inst.updatedAt || null,
  }
}

/**
 * @param {{ inst: any, body: any }} args
 */
export async function updateViaEditLink({ inst, body }) {
  const touch = (p) => {
    if (typeof inst.markModified === 'function') inst.markModified(p)
  }
  if (body?.draftProps !== undefined) {
    inst.draftProps = sanitizeHostedProps(inst.sectionId, body.draftProps) || {}
    touch('draftProps')
  }
  if (body?.publish === true) {
    if (inst.status !== 'published') {
      throw new HttpError(
        409,
        'Este widget todavía no está publicado: lo publica quien lo creó. Tus cambios quedan guardados como borrador.',
        { expose: true },
      )
    }
    if (!isHostableSectionId(inst.sectionId)) {
      throw new HttpError(409, 'Esta sección ya no se puede hostear', { expose: true })
    }
    inst.publishedProps = inst.draftProps || {}
    touch('publishedProps')
    inst.publishedAt = new Date()
  }
  await inst.save()
  return inst
}

import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { assertObjectIdLike } from '../../validation.js'
import { isHostableSectionId } from '../../sections.js'
import { isBuilderHiddenSku } from '../../../src/domain/catalog.js'
import { sanitizeHostedProps } from '../../sectionFields.js'
import { newHostedKey, cleanDomains } from '../../hostedKey.js'
import { resolveEntitlement, assertCanPublish } from '../subscriptions.js'

/**
 * Instancias de LAB del suscriptor: crear, editar el borrador y los dominios,
 * publicar / despublicar, borrar y la suspensión del dueño del producto. Sin
 * `req`/`res`: el router traduce el body y la respuesta.
 */

/**
 * La instancia del usuario, o 404 (también si es de otro: no se filtra que
 * existe). `id` mal formado es un 400.
 * @param {string} userId
 * @param {string} id
 */
export async function getOwnedHostedInstance(userId, id) {
  assertObjectIdLike(id)
  const inst = await db.findHostedInstanceById(id)
  if (!inst || String(inst.userId) !== String(userId)) {
    throw new HttpError(404, 'Instancia no encontrada')
  }
  return inst
}

/**
 * Crea un borrador. LAB es de pago: un usuario free solo puede tener hasta
 * `hostedFreeQuota` instancias (0 = ninguna). Con plan/prueba activa el tope
 * lo pone `assertCanPublish` al publicar, no acá.
 * @param {{ userId: string, body: any, config: any }} args
 */
export async function createHostedInstance({ userId, body, config }) {
  const sectionId = String(body?.sectionId || '')
  // un modelo fuera de la venta (VELOCITY) no suma widgets nuevos; los publicados siguen
  if (!isHostableSectionId(sectionId) || isBuilderHiddenSku(sectionId.split('/')[0])) {
    throw new HttpError(400, 'Sección no hosteable')
  }
  const ent = await resolveEntitlement(userId, config, { persist: false })
  if (ent.plan === 'free') {
    const mine = await db.findHostedInstancesByUser(userId)
    if (mine.length >= config.hostedFreeQuota) {
      throw new HttpError(
        402,
        config.hostedFreeQuota > 0
          ? 'Llegaste al límite gratis. Suscribite o empezá tu prueba para crear más.'
          : 'Suscribite o empezá tu prueba gratis para crear secciones en LAB.',
        { expose: true },
      )
    }
  }
  const draftProps = sanitizeHostedProps(sectionId, body?.draftProps) || {}
  return db.createHostedInstance({
    userId,
    key: newHostedKey(),
    sectionId,
    status: 'draft',
    domains: [],
    draftProps,
  })
}

/**
 * Edita una instancia propia: borrador, dominios y publicar / despublicar. La
 * cuota se chequea al publicar una que no estaba publicada (republicar no
 * cuenta).
 * @param {{ inst: any, userId: string, body: any, config: any }} args
 */
export async function updateHostedInstance({ inst, userId, body, config }) {
  // `draftProps` / `publishedProps` son Mixed en Mongo: reasignarlos no
  // siempre queda marcado como modificado y `save()` no los persiste.
  const touch = (p) => {
    if (typeof inst.markModified === 'function') inst.markModified(p)
  }

  if (body?.draftProps !== undefined) {
    inst.draftProps = sanitizeHostedProps(inst.sectionId, body.draftProps) || {}
    touch('draftProps')
  }
  if (body?.domains !== undefined) {
    inst.domains = cleanDomains(body.domains)
  }
  if (body?.publish === true) {
    // Una sección puede haber salido de HOSTABLE_SECTIONS después de crearse
    // la instancia (ej: scrolljack que rompe en el embed). No re-publicar.
    if (!isHostableSectionId(inst.sectionId)) {
      throw new HttpError(
        409,
        'Esta sección ya no se puede hostear. Borrá la instancia.',
        { expose: true },
      )
    }
    // Cuota: publicar de nuevo una ya publicada no cuenta (se excluye).
    if (inst.status !== 'published') {
      await assertCanPublish({
        userId,
        instanceId: db.uid(inst) || inst.id,
        config,
      })
    }
    inst.publishedProps = inst.draftProps || {}
    touch('publishedProps')
    inst.status = 'published'
    inst.publishedAt = new Date()
  } else if (body?.unpublish === true && inst.status === 'published') {
    inst.status = 'draft'
  }

  await inst.save()
  return inst
}

/**
 * Borra una instancia propia y la saca de los packs del usuario.
 * @param {{ inst: any, userId: string }} args
 */
export async function deleteHostedInstance({ inst, userId }) {
  const id = db.uid(inst) || inst.id
  await db.deleteHostedInstance(id)
  await db.removeInstanceFromPacks(userId, id)
}

/**
 * Revocación de una key (solo el dueño del producto, con ADMIN_TOKEN): suspendida
 * el config público responde 402 y el embed deja de renderizar. Reactivar la
 * deja publicada si tenía versión publicada, o borrador si no.
 * @param {{ id: string, suspended: boolean }} args
 */
export async function setHostedSuspended({ id, suspended }) {
  assertObjectIdLike(id)
  const inst = await db.findHostedInstanceById(id)
  if (!inst) throw new HttpError(404, 'Instancia no encontrada')
  inst.status = suspended ? 'suspended' : inst.publishedProps ? 'published' : 'draft'
  await inst.save()
  return inst
}

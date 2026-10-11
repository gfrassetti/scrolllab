import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { assertObjectIdLike } from '../../validation.js'
import { newPackKey, cleanDomains } from '../../hostedKey.js'
import { PACKS_PAID_ONLY, packsAllowed } from './serving.js'

/**
 * Packs de LAB: varias secciones del usuario bajo un solo `<script data-pack>`.
 * No guardan props ni suman cupo (cada sección ya cuenta como instancia
 * publicada). Sin `req`/`res`: el router traduce el body y la respuesta.
 */

/** Tope de secciones por pack y de packs por usuario (abuso / tamaño de página). */
export const PACK_MAX_ITEMS = 30
export const PACK_MAX_PER_USER = 20
const PACK_NAME_MAX = 60

/** @param {unknown} raw */
export function cleanPackName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, PACK_NAME_MAX)
}

/**
 * Ids de instancias del usuario, sin repetir, en el orden pedido.
 * @param {string} userId
 * @param {unknown} raw
 */
async function cleanPackItems(userId, raw) {
  if (!Array.isArray(raw)) {
    throw new HttpError(400, 'items tiene que ser una lista', { expose: true })
  }
  const owned = new Set(
    (await db.findHostedInstancesByUser(userId)).map((i) => String(db.uid(i) || i.id)),
  )
  const out = []
  for (const id of raw) {
    const s = String(id)
    if (!owned.has(s)) {
      throw new HttpError(400, 'Uno de los widgets no es tuyo o ya no existe', {
        expose: true,
      })
    }
    if (!out.includes(s)) out.push(s)
  }
  if (out.length > PACK_MAX_ITEMS) {
    throw new HttpError(400, `Un pack lleva hasta ${PACK_MAX_ITEMS} widgets`, {
      expose: true,
    })
  }
  return out
}

/**
 * El pack del usuario, o 404 (también si es de otro). `id` mal formado es un 400.
 * @param {string} userId
 * @param {string} id
 */
export async function getOwnedHostedPack(userId, id) {
  assertObjectIdLike(id)
  const pack = await db.findHostedPackById(id)
  if (!pack || String(pack.userId) !== String(userId)) {
    throw new HttpError(404, 'Pack no encontrado')
  }
  return pack
}

/**
 * @param {{ userId: string, body: any, config: any }} args
 */
export async function createHostedPack({ userId, body, config }) {
  if (!(await packsAllowed(userId, config))) throw new HttpError(402, PACKS_PAID_ONLY, { expose: true })
  const mine = await db.findHostedPacksByUser(userId)
  if (mine.length >= PACK_MAX_PER_USER) {
    throw new HttpError(400, `Podés tener hasta ${PACK_MAX_PER_USER} packs`, {
      expose: true,
    })
  }
  const items = body?.items !== undefined ? await cleanPackItems(userId, body.items) : []
  return db.createHostedPack({
    userId,
    key: newPackKey(),
    name: cleanPackName(body?.name),
    items,
    domains: [],
  })
}

/**
 * @param {{ pack: any, userId: string, body: any }} args
 */
export async function updateHostedPack({ pack, userId, body }) {
  if (body?.name !== undefined) pack.name = cleanPackName(body.name)
  if (body?.items !== undefined) {
    pack.items = await cleanPackItems(userId, body.items)
    if (typeof pack.markModified === 'function') pack.markModified('items')
  }
  if (body?.domains !== undefined) pack.domains = cleanDomains(body.domains)
  await pack.save()
  return pack
}

/** @param {{ pack: any }} args */
export async function deleteHostedPack({ pack }) {
  await db.deleteHostedPack(db.uid(pack) || pack.id)
}

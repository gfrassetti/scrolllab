import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { sanitizeHostedProps } from '../../sectionFields.js'
import { isHostedKey, isPackKey, domainAllowed } from '../../hostedKey.js'
import { resolveEntitlement } from '../subscriptions.js'

/**
 * Qué se le sirve al embed de un sitio ajeno y quién puede usar packs.
 * Hosted Component / LAB (docs/hosted-component-plan.md): el config público
 * que lee el embed, el de un pack y los flags que muestra el panel. Sin
 * `req`/`res`: el router pone el CORS y el cache.
 */

/** Los packs son de los planes pagos: con el plan gratis (1 widget) no juntan nada. */
export const PACKS_PAID_ONLY = 'Los packs vienen con los planes pagos'

/** A dónde lleva el sello del plan gratis (con UTM: se mide en el panel). */
export function badgeHref(config) {
  const base = String(config.clientUrl || '').replace(/\/$/, '')
  return `${base}/lab?utm_source=lab-embed&utm_medium=badge&utm_campaign=free-plan`
}

/**
 * Si la instancia se sirve hoy en ese host. Devuelve `{ error }` (por qué no,
 * un HttpError, o null si se sirve) y el `ent` (plan efectivo del dueño) que ya
 * hubo que calcular: el config lo usa para el sello del plan gratis sin otra
 * consulta. Lo comparten el config de una sección y el de un pack: mismas
 * reglas.
 * @param {any} inst
 * @param {string | null | undefined} host
 * @param {any} config
 */
export async function hostedServability(inst, host, config) {
  if (!inst) return { error: new HttpError(404, 'No encontrado') }
  if (inst.status === 'suspended') return { error: new HttpError(402, 'Instancia suspendida') }
  if (inst.status !== 'published') {
    return { error: new HttpError(409, 'La instancia todavía no se publicó') }
  }
  if (!domainAllowed(inst.domains, host)) return { error: new HttpError(403, 'Dominio no autorizado') }

  // Suscripción caída o bajada de plan: las publicadas por encima del tope
  // dejan de servir. Chequeo perezoso, sin tocar `inst.status` — si el
  // dueño vuelve a suscribirse, reviven solas. Orden estable por
  // `createdAt`: quedan cubiertas las más viejas. `persist:false` para NO
  // escribir la fila de suscripción desde este path anónimo/caliente — el
  // barrido de vencimiento lo hace `/api/subscriptions/me` o el publish.
  const ent = await resolveEntitlement(inst.userId, config, { persist: false })
  if (Number.isFinite(ent.quota)) {
    const olderPublished = await db.countPublishedHostedCreatedBefore(
      inst.userId,
      inst.createdAt,
      db.uid(inst) || inst.id,
    )
    if (olderPublished >= ent.quota) {
      return { error: new HttpError(402, 'Sección por encima del límite del plan'), ent }
    }
  }
  return { error: null, ent }
}

/**
 * Config público de una instancia (lo consume el `<script>` del embed desde
 * sitios de terceros). Tira el HttpError de por qué no se sirve.
 * @param {{ key: string, host: string | null | undefined, config: any }} args
 */
export async function resolveEmbedConfig({ key, host, config }) {
  if (!isHostedKey(key)) throw new HttpError(404, 'No encontrado')

  const inst = await db.findHostedInstanceByKey(key)
  const { error: why, ent } = await hostedServability(inst, host, config)
  if (why) throw why

  // Señal de uso, best-effort: no bloquea la respuesta.
  db.incHostedViews(key).catch(() => {})

  return {
    sectionId: inst.sectionId,
    // Otra pasada al servir: instancias publicadas antes de que LAB exigiera
    // URL completa en las imágenes (una /ruta ahí sale rota).
    props: sanitizeHostedProps(inst.sectionId, inst.publishedProps) || {},
    // Plan gratis: el frame muestra «Hecho con Scroll Lab» (los pagos lo sacan).
    ...(ent?.plan === 'free' ? { badge: { href: badgeHref(config) } } : {}),
  }
}

/**
 * ¿Puede este usuario tener packs? Solo con un plan pago.
 * @param {string} userId
 * @param {any} config
 */
export async function packsAllowed(userId, config) {
  const ent = await resolveEntitlement(userId, config, { persist: false })
  return ent.plan !== 'free'
}

/**
 * Las keys de un pack que hoy se sirven, en orden (el loader monta un iframe
 * por key). Solo las que se sirven con las mismas reglas que el config de cada
 * una: un borrador o una congelada no deja un hueco en la página.
 * @param {{ key: string, host: string | null | undefined, config: any }} args
 */
export async function resolveEmbedPack({ key, host, config }) {
  if (!isPackKey(key)) throw new HttpError(404, 'No encontrado')
  const pack = await db.findHostedPackByKey(key)
  if (!pack) throw new HttpError(404, 'No encontrado')
  if (!domainAllowed(pack.domains, host)) throw new HttpError(403, 'Dominio no autorizado')
  // Bajó a gratis: el pack se apaga (sus widgets sueltos siguen sus reglas).
  if (!(await packsAllowed(pack.userId, config))) throw new HttpError(402, PACKS_PAID_ONLY)

  const keys = []
  for (const id of pack.items || []) {
    const inst = await db.findHostedInstanceById(id)
    if (!inst || String(inst.userId) !== String(pack.userId)) continue
    if ((await hostedServability(inst, host, config)).error) continue
    keys.push(inst.key)
  }
  return { keys }
}

/**
 * Las instancias del usuario con los flags derivados, que NO se persisten
 * (mismas reglas de orden por `createdAt` que el config público):
 *  - `frozen`: el plan YA no la cubre → hoy responde 402. LAB muestra
 *    "Congelada" en vez de "Publicada".
 *  - `stopsOnPlanEnd`: hoy se sirve, pero caería fuera de la cuota free → si
 *    la suscripción no se reactiva, se apaga al fin de período. LAB avisa
 *    "se apaga el <fecha>".
 * Al re-suscribirse ambos se apagan solos (no hubo cambio de estado).
 * @param {{ userId: string, config: any }} args
 * @returns {Promise<Array<{ inst: any, frozen: boolean, stopsOnPlanEnd: boolean }>>}
 */
export async function listHostedWithFlags({ userId, config }) {
  const rows = await db.findHostedInstancesByUser(userId)
  const ent = await resolveEntitlement(userId, config, { persist: false })
  const freeQuota = config.hostedFreeQuota
  return Promise.all(
    rows.map(async (r) => {
      let frozen = false
      let stopsOnPlanEnd = false
      if (r.status === 'published') {
        const older = await db.countPublishedHostedCreatedBefore(
          userId,
          r.createdAt,
          db.uid(r) || r.id,
        )
        frozen = Number.isFinite(ent.quota) && older >= ent.quota
        stopsOnPlanEnd = !frozen && older >= freeQuota
      }
      return { inst: r, frozen, stopsOnPlanEnd }
    }),
  )
}

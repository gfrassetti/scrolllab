import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
// node:crypto explícito: el `crypto` global de Node es WebCrypto y no tiene
// timingSafeEqual (safeEqual / requireAdmin romperían sin aviso de lint).
import crypto from 'node:crypto'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { HOSTABLE_SECTIONS } from '../../sections.js'
import { isBuilderHiddenSku } from '../../../src/domain/catalog.js'
import { requestHost } from '../../hostedKey.js'
import {
  resolveEmbedConfig,
  resolveEmbedPack,
  listHostedWithFlags,
  packsAllowed,
  badgeHref,
} from '../../services/hosted/serving.js'
import {
  getOwnedHostedInstance,
  createHostedInstance,
  updateHostedInstance,
  deleteHostedInstance,
  setHostedSuspended,
} from '../../services/hosted/instances.js'
import { deliverLabForm } from '../../services/hosted/forms.js'
import {
  createEditLink,
  revokeEditLink,
  findByEditToken,
  sharedView,
  updateViaEditLink,
} from '../../services/hosted/editLink.js'
import { resolveEntitlement } from '../../services/subscriptions.js'
import {
  PACK_MAX_ITEMS,
  PACK_MAX_PER_USER,
  getOwnedHostedPack,
  createHostedPack,
  updateHostedPack,
  deleteHostedPack,
} from '../../services/hosted/packs.js'

/**
 * Hosted Component / LAB (docs/hosted-component-plan.md, Fase 3): el config
 * público que lee el embed desde sitios de terceros, el loader con SRI, y el
 * CRUD de instancias y packs del suscriptor. Solo traduce HTTP: las reglas
 * (qué se sirve, cupo, publicar, packs) están en services/hosted/. Suspender /
 * reactivar una key solo con ADMIN_TOKEN.
 */
export { PACK_MAX_ITEMS, PACK_MAX_PER_USER, badgeHref }

export function createHostedRouter({ config, limits }) {
  const router = express.Router()

  function publicHosted(inst) {
    return {
      id: db.uid(inst) || inst.id,
      key: inst.key,
      sectionId: inst.sectionId,
      status: inst.status,
      domains: inst.domains || [],
      draftProps: inst.draftProps || {},
      publishedProps: inst.publishedProps || null,
      publishedAt: inst.publishedAt || null,
      views: inst.views || 0,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
      // El link de edición del cliente: si hay, y desde cuándo (nunca el hash).
      hasEditLink: Boolean(inst.editTokenHash),
      editLinkCreatedAt: inst.editTokenCreatedAt || null,
    }
  }

  function safeEqual(a, b) {
    const ba = Buffer.from(String(a))
    const bb = Buffer.from(String(b))
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
  }

  function requireAdmin(req) {
    const token = req.get('x-admin-token') || ''
    if (!config.adminToken || !safeEqual(token, config.adminToken)) {
      throw new HttpError(403, 'Forbidden')
    }
  }

  // Info del loader para armar el snippet con SRI. El hash lo escribe
  // embed/build-loader.mjs en embed-dist/v1/manifest.json.
  let loaderInfoCache = null

  function loaderInfo() {
    if (loaderInfoCache) return loaderInfoCache
    let integrity = null
    let version = 'v1'
    try {
      const raw = fs.readFileSync(
        path.join(process.cwd(), 'embed-dist', 'v1', 'manifest.json'),
        'utf8',
      )
      const m = JSON.parse(raw)
      integrity = m.integrity || null
      version = m.version || version
    } catch {
      /* build todavía no corrió */
    }
    loaderInfoCache = {
      version,
      url: `${config.embedCdnUrl}/${version}/loader.js`,
      // El frame (estático) no sabe dónde está la API — se la pasamos en el
      // snippet como `data-api`.
      api: config.apiPublicUrl || '',
      // Solo mandamos el hash si SRI está habilitado (el host tiene CORS).
      integrity: config.embedSri ? integrity : null,
    }
    return loaderInfoCache
  }

  function publicPack(pack) {
    return {
      id: db.uid(pack) || pack.id,
      key: pack.key,
      name: pack.name || '',
      items: (pack.items || []).map(String),
      domains: pack.domains || [],
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
    }
  }

  function publicCors(res) {
    // Endpoint público: cualquier origen, sin credenciales (el embed usa
    // credentials:'omit'). ACAO:* con ACAC:true es combo inválido → se saca.
    res.set('Access-Control-Allow-Origin', '*')
    res.removeHeader('Access-Control-Allow-Credentials')
    res.set('Vary', 'Origin')
  }

  // max-age=0 + must-revalidate: al republicar, el cambio se ve en la
  // próxima carga (el ETag débil de Express hace que lo igual devuelva 304
  // barato). `s-maxage` deja un margen para un cache compartido/CDN futuro.
  const PUBLIC_CACHE = 'public, max-age=0, s-maxage=5, must-revalidate'

  // Público: lo consume el `<script>` del embed desde sitios de terceros.
  router.get(
    '/api/embed/:key/config',
    limits.embedConfig,
    asyncHandler(async (req, res) => {
      publicCors(res)

      const body = await resolveEmbedConfig({
        key: String(req.params.key || ''),
        host: requestHost(req),
        config,
      })

      res.set('Cache-Control', PUBLIC_CACHE)
      res.json(body)
    }),
  )

  // Público: un formulario de LAB (lo manda el frame del embed). El mensaje le
  // llega por mail al dueño del widget; CORS abierto en createCors.
  router.post(
    '/api/embed/:key/form',
    limits.labForm,
    asyncHandler(async (req, res) => {
      const result = await deliverLabForm({
        key: String(req.params.key || ''),
        host: requestHost(req),
        body: req.body,
        config,
      })
      res.json(result)
    }),
  )

  // Snippet + hash SRI para la página LAB.
  router.get('/api/embed/loader', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300')
    res.json(loaderInfo())
  })

  // Público: el loader lo pide para un `<script data-pack>` y monta un iframe
  // por key, en orden. Solo las que hoy se sirven (mismas reglas que el config
  // de cada una): un borrador o una congelada no deja un hueco en la página.
  // Lo pide la página del cliente (no el frame), así que `requestHost` sale
  // del Origin/Referer del pedido.
  router.get(
    '/api/embed/pack/:key',
    limits.embedConfig,
    asyncHandler(async (req, res) => {
      publicCors(res)
      const { keys } = await resolveEmbedPack({
        key: String(req.params.key || ''),
        host: requestHost(req),
        config,
      })
      res.set('Cache-Control', PUBLIC_CACHE)
      res.json({ keys })
    }),
  )

  router.get(
    '/api/hosted/sections',
    requireAuth,
    asyncHandler(async (_req, res) => {
      // la lista para elegir un widget nuevo: sin los modelos fuera de la venta
      res.json({ sections: HOSTABLE_SECTIONS.filter((id) => !isBuilderHiddenSku(id.split('/')[0])) })
    }),
  )

  router.get(
    '/api/hosted',
    requireAuth,
    asyncHandler(async (req, res) => {
      const rows = await listHostedWithFlags({ userId: db.uid(req.user), config })
      res.json({
        instances: rows.map(({ inst, frozen, stopsOnPlanEnd }) => ({
          ...publicHosted(inst),
          frozen,
          stopsOnPlanEnd,
        })),
      })
    }),
  )

  router.post(
    '/api/hosted',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await createHostedInstance({
        userId: db.uid(req.user),
        body: req.body,
        config,
      })
      res.status(201).json({ instance: publicHosted(inst) })
    }),
  )

  router.get(
    '/api/hosted/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const inst = await getOwnedHostedInstance(db.uid(req.user), req.params.id)
      res.json({ instance: publicHosted(inst) })
    }),
  )

  router.put(
    '/api/hosted/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const found = await getOwnedHostedInstance(userId, req.params.id)
      const inst = await updateHostedInstance({ inst: found, userId, body: req.body, config })
      res.json({ instance: publicHosted(inst) })
    }),
  )

  // ——— Link de edición para el cliente del dueño (sin cuenta) ———

  async function ownerOnFreePlan(inst) {
    const ent = await resolveEntitlement(String(inst.userId), config, { persist: false })
    return ent.plan === 'free'
  }

  router.post(
    '/api/hosted/:id/edit-link',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await getOwnedHostedInstance(db.uid(req.user), req.params.id)
      const token = await createEditLink({ inst })
      // El token viaja una sola vez: después solo queda su hash.
      res.status(201).json({ token, instance: publicHosted(inst) })
    }),
  )

  router.delete(
    '/api/hosted/:id/edit-link',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await getOwnedHostedInstance(db.uid(req.user), req.params.id)
      await revokeEditLink({ inst })
      res.json({ instance: publicHosted(inst) })
    }),
  )

  router.get(
    '/api/hosted-edit/:token',
    limits.sharedEdit,
    asyncHandler(async (req, res) => {
      const inst = await findByEditToken(req.params.token)
      res.set('Cache-Control', 'no-store')
      res.json({ instance: sharedView(inst, { freeBadge: await ownerOnFreePlan(inst) }) })
    }),
  )

  router.put(
    '/api/hosted-edit/:token',
    limits.sharedEdit,
    asyncHandler(async (req, res) => {
      const found = await findByEditToken(req.params.token)
      const inst = await updateViaEditLink({ inst: found, body: req.body })
      res.set('Cache-Control', 'no-store')
      res.json({ instance: sharedView(inst, { freeBadge: await ownerOnFreePlan(inst) }) })
    }),
  )

  router.delete(
    '/api/hosted/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const inst = await getOwnedHostedInstance(userId, req.params.id)
      await deleteHostedInstance({ inst, userId })
      res.json({ ok: true })
    }),
  )

  // ——— Packs: varias secciones del usuario bajo un solo script ———
  // No suman cupo: cada sección ya cuenta como instancia publicada.
  router.get(
    '/api/hosted-packs',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const packs = await db.findHostedPacksByUser(userId)
      res.json({
        packs: packs.map(publicPack),
        maxItems: PACK_MAX_ITEMS,
        // Con el plan gratis no se crean ni se muestran (la UI lo explica).
        allowed: await packsAllowed(userId, config),
      })
    }),
  )

  router.post(
    '/api/hosted-packs',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const pack = await createHostedPack({ userId: db.uid(req.user), body: req.body, config })
      res.status(201).json({ pack: publicPack(pack) })
    }),
  )

  router.get(
    '/api/hosted-packs/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const pack = await getOwnedHostedPack(db.uid(req.user), req.params.id)
      res.json({ pack: publicPack(pack), maxItems: PACK_MAX_ITEMS })
    }),
  )

  router.put(
    '/api/hosted-packs/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const found = await getOwnedHostedPack(userId, req.params.id)
      const pack = await updateHostedPack({ pack: found, userId, body: req.body })
      res.json({ pack: publicPack(pack) })
    }),
  )

  router.delete(
    '/api/hosted-packs/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const pack = await getOwnedHostedPack(db.uid(req.user), req.params.id)
      await deleteHostedPack({ pack })
      res.json({ ok: true })
    }),
  )

  // Revocación de key: solo con ADMIN_TOKEN (header x-admin-token). Sin UI.
  // Suspender → el config público responde 402 y el embed deja de renderizar.
  router.post(
    '/api/hosted/:id/suspend',
    asyncHandler(async (req, res) => {
      requireAdmin(req)
      const inst = await setHostedSuspended({ id: req.params.id, suspended: true })
      res.json({ instance: publicHosted(inst) })
    }),
  )

  router.post(
    '/api/hosted/:id/unsuspend',
    asyncHandler(async (req, res) => {
      requireAdmin(req)
      const inst = await setHostedSuspended({ id: req.params.id, suspended: false })
      res.json({ instance: publicHosted(inst) })
    }),
  )

  return router
}

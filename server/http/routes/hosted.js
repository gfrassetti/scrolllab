import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
// node:crypto explícito: el `crypto` global de Node es WebCrypto y no tiene
// timingSafeEqual (safeEqual / requireAdmin romperían sin aviso de lint).
import crypto from 'node:crypto'
import { db } from '../../db.js'
import { requireAuth, asyncHandler, HttpError } from '../../middleware.js'
import { assertObjectIdLike } from '../../validation.js'
import { isHostableSectionId, HOSTABLE_SECTIONS } from '../../sections.js'
import { sanitizeHostedProps } from '../../sectionFields.js'
import {
  newHostedKey,
  isHostedKey,
  requestHost,
  cleanDomains,
  domainAllowed,
} from '../../hostedKey.js'
import { resolveEntitlement, assertCanPublish } from '../../services/subscriptions.js'

/**
 * Hosted Component / LAB (docs/hosted-component-plan.md, Fase 3): el config
 * público que lee el embed desde sitios de terceros, el loader con SRI, y el
 * CRUD de instancias del suscriptor (borrador, publicar, dominios). Suspender
 * / reactivar una key solo con ADMIN_TOKEN.
 */
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

  async function loadOwnedHosted(req) {
    assertObjectIdLike(req.params.id)
    const inst = await db.findHostedInstanceById(req.params.id)
    if (!inst || String(inst.userId) !== String(db.uid(req.user))) {
      throw new HttpError(404, 'Instancia no encontrada')
    }
    return inst
  }

  // Público: lo consume el `<script>` del embed desde sitios de terceros.
  router.get(
    '/api/embed/:key/config',
    limits.embedConfig,
    asyncHandler(async (req, res) => {
      // Endpoint público: cualquier origen, sin credenciales (el embed usa
      // credentials:'omit'). ACAO:* con ACAC:true es combo inválido → se saca.
      res.set('Access-Control-Allow-Origin', '*')
      res.removeHeader('Access-Control-Allow-Credentials')
      res.set('Vary', 'Origin')

      const key = String(req.params.key || '')
      if (!isHostedKey(key)) throw new HttpError(404, 'No encontrado')

      const inst = await db.findHostedInstanceByKey(key)
      if (!inst) throw new HttpError(404, 'No encontrado')
      if (inst.status === 'suspended') {
        throw new HttpError(402, 'Instancia suspendida')
      }
      if (inst.status !== 'published') {
        throw new HttpError(409, 'La instancia todavía no se publicó')
      }
      if (!domainAllowed(inst.domains, requestHost(req))) {
        throw new HttpError(403, 'Dominio no autorizado')
      }

      // Suscripción caída o bajada de plan: las publicadas por encima del tope
      // dejan de servir. Chequeo perezoso, sin tocar `inst.status` — si el
      // dueño vuelve a suscribirse, reviven solas. Orden estable por
      // `createdAt`: quedan cubiertas las más viejas. `persist:false` para NO
      // escribir la fila de suscripción desde este path anónimo/caliente — el
      // barrido de vencimiento lo hace `/api/subscriptions/me` o el publish.
      const ent = await resolveEntitlement(inst.userId, config, {
        persist: false,
      })
      if (Number.isFinite(ent.quota)) {
        const olderPublished = await db.countPublishedHostedCreatedBefore(
          inst.userId,
          inst.createdAt,
          db.uid(inst) || inst.id,
        )
        if (olderPublished >= ent.quota) {
          throw new HttpError(402, 'Sección por encima del límite del plan')
        }
      }

      // Señal de uso, best-effort: no bloquea la respuesta.
      db.incHostedViews(key).catch(() => {})

      // max-age=0 + must-revalidate: al republicar, el cambio se ve en la
      // próxima carga (el ETag débil de Express hace que lo igual devuelva 304
      // barato). `s-maxage` deja un margen para un cache compartido/CDN futuro.
      res.set('Cache-Control', 'public, max-age=0, s-maxage=5, must-revalidate')
      res.json({
        sectionId: inst.sectionId,
        // Otra pasada al servir: instancias publicadas antes de que LAB exigiera
        // URL completa en las imágenes (una /ruta ahí sale rota).
        props: sanitizeHostedProps(inst.sectionId, inst.publishedProps) || {},
      })
    }),
  )

  // Snippet + hash SRI para la página LAB.
  router.get('/api/embed/loader', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300')
    res.json(loaderInfo())
  })

  router.get(
    '/api/hosted/sections',
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json({ sections: HOSTABLE_SECTIONS })
    }),
  )

  router.get(
    '/api/hosted',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = db.uid(req.user)
      const rows = await db.findHostedInstancesByUser(userId)
      // Flags derivados, NO se persisten — mismas reglas de orden por
      // `createdAt` que `/api/embed/:key/config`:
      //  - `frozen`: el plan YA no la cubre → hoy responde 402. LAB muestra
      //    "Congelada" en vez de "Publicada".
      //  - `stopsOnPlanEnd`: hoy se sirve, pero caería fuera de la cuota
      //    free → si la suscripción no se reactiva, se apaga al fin de
      //    período. LAB avisa "se apaga el <fecha>".
      // Al re-suscribirse ambos se apagan solos (no hubo cambio de estado).
      const ent = await resolveEntitlement(userId, config, { persist: false })
      const freeQuota = config.hostedFreeQuota
      const instances = await Promise.all(
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
          return { ...publicHosted(r), frozen, stopsOnPlanEnd }
        }),
      )
      res.json({ instances })
    }),
  )

  router.post(
    '/api/hosted',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const sectionId = String(req.body?.sectionId || '')
      if (!isHostableSectionId(sectionId)) {
        throw new HttpError(400, 'Sección no hosteable')
      }
      // LAB es de pago: un usuario free solo puede tener hasta
      // `hostedFreeQuota` instancias (0 = ninguna). Con plan/prueba activa
      // el tope lo pone `assertCanPublish` al publicar, no acá.
      const userId = db.uid(req.user)
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
      const draftProps =
        sanitizeHostedProps(sectionId, req.body?.draftProps) || {}
      const inst = await db.createHostedInstance({
        userId,
        key: newHostedKey(),
        sectionId,
        status: 'draft',
        domains: [],
        draftProps,
      })
      res.status(201).json({ instance: publicHosted(inst) })
    }),
  )

  router.get(
    '/api/hosted/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const inst = await loadOwnedHosted(req)
      res.json({ instance: publicHosted(inst) })
    }),
  )

  router.put(
    '/api/hosted/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await loadOwnedHosted(req)
      // `draftProps` / `publishedProps` son Mixed en Mongo: reasignarlos no
      // siempre queda marcado como modificado y `save()` no los persiste.
      const touch = (p) => {
        if (typeof inst.markModified === 'function') inst.markModified(p)
      }

      if (req.body?.draftProps !== undefined) {
        inst.draftProps =
          sanitizeHostedProps(inst.sectionId, req.body.draftProps) || {}
        touch('draftProps')
      }
      if (req.body?.domains !== undefined) {
        inst.domains = cleanDomains(req.body.domains)
      }
      if (req.body?.publish === true) {
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
            userId: db.uid(req.user),
            instanceId: db.uid(inst) || inst.id,
            config,
          })
        }
        inst.publishedProps = inst.draftProps || {}
        touch('publishedProps')
        inst.status = 'published'
        inst.publishedAt = new Date()
      } else if (req.body?.unpublish === true && inst.status === 'published') {
        inst.status = 'draft'
      }

      await inst.save()
      res.json({ instance: publicHosted(inst) })
    }),
  )

  router.delete(
    '/api/hosted/:id',
    requireAuth,
    limits.hosted,
    asyncHandler(async (req, res) => {
      const inst = await loadOwnedHosted(req)
      await db.deleteHostedInstance(db.uid(inst) || inst.id)
      res.json({ ok: true })
    }),
  )

  // Revocación de key: solo con ADMIN_TOKEN (header x-admin-token). Sin UI.
  // Suspender → el config público responde 402 y el embed deja de renderizar.
  router.post(
    '/api/hosted/:id/suspend',
    asyncHandler(async (req, res) => {
      requireAdmin(req)
      assertObjectIdLike(req.params.id)
      const inst = await db.findHostedInstanceById(req.params.id)
      if (!inst) throw new HttpError(404, 'Instancia no encontrada')
      inst.status = 'suspended'
      await inst.save()
      res.json({ instance: publicHosted(inst) })
    }),
  )

  router.post(
    '/api/hosted/:id/unsuspend',
    asyncHandler(async (req, res) => {
      requireAdmin(req)
      assertObjectIdLike(req.params.id)
      const inst = await db.findHostedInstanceById(req.params.id)
      if (!inst) throw new HttpError(404, 'Instancia no encontrada')
      inst.status = inst.publishedProps ? 'published' : 'draft'
      await inst.save()
      res.json({ instance: publicHosted(inst) })
    }),
  )

  return router
}

import express from 'express'
import { db, storeMode } from '../../db.js'
import { assertWritableDir, authDiagnostics } from '../../config.js'
import { asyncHandler } from '../../middleware.js'
import { getUsdArsRate } from '../../fx.js'
import {
  catalogWithArs,
  arsFromUsd,
  COMMERCE_PACK_SURCHARGE_USD,
} from '../../catalog.js'

/**
 * Salud del proceso (health / ready, para Railway y el monitoreo) y el
 * catálogo público con los precios ya en pesos. Sin sesión.
 */
export function createHealthRouter({ config }) {
  const router = express.Router()

  router.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      brand: 'SCROLLLAB',
      uptime: process.uptime(),
    })
  })

  router.get(
    '/api/ready',
    asyncHandler(async (_req, res) => {
      const mongoOk = await db.isReady()
      let storageOk = false
      try {
        assertWritableDir(config.storageDir)
        storageOk = true
      } catch {
        storageOk = false
      }
      if (!mongoOk || !storageOk) {
        return res.status(503).json({
          ok: false,
          store: storeMode(),
          mongo: mongoOk,
          storage: storageOk,
        })
      }
      res.json({
        ok: true,
        store: storeMode(),
        mongo: mongoOk,
        storage: storageOk,
        mpMock: config.mpMock,
        // Estado de Paddle (sin detalles): `misconfigured` = variables PADDLE_*
        // inválidas en producción, Paddle quedó apagado (el motivo está en el log).
        paddle: config.paddle?.error
          ? 'misconfigured'
          : config.paddle?.enabled
            ? 'on'
            : 'off',
        auth: authDiagnostics(config),
      })
    }),
  )

  router.get(
    '/api/catalog',
    asyncHandler(async (_req, res) => {
      const fx = await getUsdArsRate()
      res.json({
        products: catalogWithArs(fx.rate),
        commercePackSurchargeUsd: COMMERCE_PACK_SURCHARGE_USD,
        commercePackSurcharge: arsFromUsd(COMMERCE_PACK_SURCHARGE_USD, fx.rate),
        fx: {
          rate: fx.rate,
          spreadPct: fx.spreadPct,
          updatedAt: fx.updatedAt,
          stale: fx.stale,
        },
      })
    }),
  )

  return router
}

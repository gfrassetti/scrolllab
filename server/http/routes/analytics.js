import express from 'express'
import mongoose from 'mongoose'
import { db } from '../../db.js'
import { getMode } from '../../repositories/mode.js'
import { asyncHandler } from '../../middleware.js'
import { buildDashboard, sanitizeEvents } from '../../services/analytics.js'
import { buildMoneyStatus } from '../../services/moneyStatus.js'
import { buildLabFunnel } from '../../services/labFunnel.js'

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Solo desde esta máquina: nunca en producción, y aun fuera de producción solo
 * si la conexión Y el Host son loopback (el Host frena el DNS rebinding). Detrás
 * de un proxy en el mismo servidor la IP sería local para todos: por eso en
 * producción el panel directamente no existe.
 */
export function localOnly(config) {
  return (req, res, next) => {
    const local =
      !config.isProd &&
      LOOPBACK.has(req.socket.remoteAddress || '') &&
      LOCAL_HOSTS.has(String(req.hostname || '').toLowerCase());
    if (!local) return res.status(404).json({ error: 'No encontrado' })
    next()
  }
}

export function createAnalyticsRouter({ config, limits }) {
  const router = express.Router()

  // Recibe lotes de eventos del navegador. Siempre 204: el sitio no tiene que
  // enterarse (ni esperar) si la analítica falla.
  router.post(
    '/api/track',
    limits.track,
    asyncHandler(async (req, res) => {
      try {
        await db.addEvents(sanitizeEvents(req.body))
      } catch (err) {
        console.warn('track: no se pudo guardar', err?.message)
      }
      res.status(204).end()
    }),
  )

  router.get(
    '/api/admin/analytics',
    localOnly(config),
    asyncHandler(async (req, res) => {
      const days = Math.max(1, Math.min(365, Number.parseInt(req.query.days, 10) || 30))
      const since = new Date(Date.now() - days * 86400000)
      const [events, users, orders, leads, refunds, withdrawals, subscriptions, hosted] = await Promise.all([
        db.listEvents({ since }),
        db.listUsers(),
        db.listOrders(),
        db.listLeads(),
        db.listRefunds(),
        db.listWithdrawals(),
        db.listSubscriptions(),
        db.listHostedInstances(),
      ])
      res.set('Cache-Control', 'no-store')
      res.json({
        ...buildDashboard({ events, users, orders, leads, days, store: getMode(), dbHost: getMode() === 'mongo' ? mongoose.connection.host || '' : '' }),
        // La plata: qué no tocar (en plazo de reembolso), reembolsos y arrepentimiento.
        money: buildMoneyStatus({ orders, users, refunds, withdrawals, subscriptions }),
        // LAB: de la visita al cobro (server/services/labFunnel.js).
        lab: buildLabFunnel({ events, hosted, subscriptions, since }),
      })
    }),
  )

  return router
}

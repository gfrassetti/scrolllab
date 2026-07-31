import crypto from 'node:crypto'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { HttpError } from './validation.js'

export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID()
  req.requestId = id
  res.setHeader('x-request-id', id)
  next()
}

/**
 * Orígenes aceptados: CLIENT_URL más la variante apex/www del mismo host.
 * Mercado Pago puede devolver al apex aunque el canónico sea www, y ahí el
 * POST de confirmación moría en 403 «Origen no permitido».
 */
export function allowedOrigins(config) {
  const base = new URL(config.clientUrl)
  const origins = new Set([base.origin])
  const host = base.hostname
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  if (!isIp && host.includes('.')) {
    const sibling = host.startsWith('www.') ? host.slice(4) : `www.${host}`
    if (sibling.includes('.')) {
      const url = new URL(base.origin)
      url.hostname = sibling
      origins.add(url.origin)
    }
  }
  return [...origins]
}

export function createCors(config) {
  return cors({
    origin: allowedOrigins(config),
    credentials: true,
  })
}

export function createHelmet() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
}

export function createLogger(config) {
  morgan.token('rid', (req) => req.requestId || '-')
  return morgan(config.isProd ? ':rid :method :url :status :response-time ms' : 'dev', {
    skip: (req) => req.path === '/api/health' || req.path === '/api/ready',
  })
}

export function requireAuth(req, res, next) {
  if (req.isAuthenticated?.() && req.user) return next()
  return res.status(401).json({ error: 'Tenés que iniciar sesión' })
}

/**
 * Defensa CSRF para mutaciones con cookie de sesión.
 * Exige Origin o Referer dentro de allowedOrigins (misma política que CORS).
 */
export function requireSameOrigin(config) {
  const allowed = new Set(allowedOrigins(config))
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    // Webhook de MP no usa cookie de sesión
    if (req.path.startsWith('/api/webhooks/')) return next()

    const origin = req.headers.origin
    if (origin) {
      try {
        if (allowed.has(new URL(origin).origin)) return next()
      } catch {
        /* fallthrough */
      }
      return res.status(403).json({ error: 'Origen no permitido' })
    }

    const referer = req.headers.referer
    if (referer) {
      try {
        if (allowed.has(new URL(referer).origin)) return next()
      } catch {
        /* fallthrough */
      }
      return res.status(403).json({ error: 'Origen no permitido' })
    }

    // Sin Origin/Referer: rechazar mutaciones (navegadores modernos siempre envían Origin en fetch cross-site)
    if (config.isProd) {
      return res.status(403).json({ error: 'Origen no permitido' })
    }
    return next()
  }
}

export function rateLimits() {
  return {
    auth: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiados intentos de login' },
    }),
    checkout: rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiados checkouts' },
    }),
    webhook: rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Rate limit' },
    }),
    download: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiadas descargas' },
    }),
  }
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'No encontrado' })
}

export function errorHandler(config) {
  return (err, req, res, _next) => {
    const status = err.status || err.statusCode || 500
    if (status >= 500) {
      console.error(`[${req.requestId || '-'}]`, err)
    }
    const message =
      status >= 500 && config.isProd
        ? 'Error interno'
        : err.message || 'Error interno'
    res.status(status).json({ error: message })
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export { HttpError }

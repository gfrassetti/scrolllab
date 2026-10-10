import express from 'express'
import { isQaBuyer } from '../../qa.js'
import passport from 'passport'
import { db } from '../../db.js'
import { asyncHandler, HttpError } from '../../middleware.js'
import { sanitizeAuthReturn } from '../../authReturn.js'

/**
 * Sesión: quién soy, login con Google (ida y vuelta, con `next` para volver
 * adonde estaba), login de desarrollo y logout. La estrategia de Google y la
 * serialización de la sesión están en server/auth/passport.js.
 */
export function createAuthRouter({ config, limits }) {
  const router = express.Router()

  function publicUser(user) {
    if (!user) return null
    return {
      id: db.uid(user),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      // Solo para las cuentas de QA_BUYER_EMAILS: el front muestra /test,
      // /builder-test y /lab-test (src/domain/qa.js).
      ...(isQaBuyer(user, config) ? { qa: true } : {}),
    }
  }

  router.get('/api/auth/me', (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json({ user: publicUser(req.user) })
  })

  router.get('/api/auth/google', limits.auth, (req, res, next) => {
    if (!config.google.clientId) {
      const nextQ = sanitizeAuthReturn(req.query.next)
      const q = new URLSearchParams({ error: 'google_not_configured' })
      if (nextQ) q.set('next', nextQ)
      return res.redirect(`${config.clientUrl}/login?${q}`)
    }
    const nextPath = sanitizeAuthReturn(req.query.next)
    if (nextPath) req.session.authNext = nextPath
    else delete req.session.authNext

    req.session.save((err) => {
      if (err) return next(err)
      // El `state` anti-CSRF lo pone la estrategia (auth/passport.js).
      passport.authenticate('google', {
        scope: ['profile', 'email'],
      })(req, res, next)
    })
  })

  router.get(
    '/api/auth/google/callback',
    limits.auth,
    // `logIn` regenera la sesión (anti session fixation) y se llevaría
    // `authNext`: sin keepSessionInfo el comprador siempre cae en /account.
    passport.authenticate('google', {
      failureRedirect: `${config.clientUrl}/login?error=google_failed`,
      keepSessionInfo: true,
    }),
    (req, res, next) => {
      const nextPath = sanitizeAuthReturn(req.session.authNext) || '/account'
      delete req.session.authNext
      req.session.save((err) => {
        if (err) return next(err)
        res.redirect(`${config.clientUrl}${nextPath}`)
      })
    },
  )

  router.post(
    '/api/auth/dev-login',
    limits.auth,
    asyncHandler(async (req, res) => {
      if (!config.authDev) {
        throw new HttpError(403, 'Dev login deshabilitado')
      }
      const email = String(req.body?.email || 'dev@scrolllab.com').slice(0, 120)
      let user = await db.findUser({ email })
      if (!user) {
        user = await db.createUser({
          email,
          name: String(req.body?.name || 'Dev Buyer').slice(0, 80),
          googleId: `dev-${email}`,
        })
      }
      await /** @type {Promise<void>} */ (
        new Promise((resolve, reject) => {
          req.login(user, (err) => (err ? reject(err) : resolve()))
        })
      )
      res.json({ user: publicUser(user) })
    }),
  )

  router.post('/api/auth/logout', (req, res, next) => {
    req.logout((logoutErr) => {
      if (logoutErr) return next(logoutErr)
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr)
        res.clearCookie(config.cookie.name, {
          path: '/',
          sameSite: config.cookie.sameSite,
          secure: config.cookie.secure,
          httpOnly: config.cookie.httpOnly,
        })
        res.json({ ok: true })
      })
    })
  })

  return router
}

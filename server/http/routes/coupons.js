import express from 'express'
import { db } from '../../db.js'
import { requireAuth, asyncHandler } from '../../middleware.js'
import {
  claimWelcomeCoupon,
  maskEmail,
  resolveCouponForCheckout,
} from '../../services/coupons.js'

/**
 * Cupón de bienvenida: pedirlo (una vez por cuenta) y chequear un código antes
 * del checkout. El descuento real lo recalcula el checkout del lado servidor.
 */
export function createCouponsRouter({ config, limits }) {
  const router = express.Router()

  // Cupón de bienvenida de quien tiene sesión: la primera vez lo crea y le manda
  // el mail; después devuelve el mismo. No hay formulario ni mail que tipear: el
  // mail es el de su cuenta de Google. Ver `claimWelcomeCoupon`.
  router.post(
    '/api/coupons/welcome',
    requireAuth,
    limits.welcome,
    asyncHandler(async (req, res) => {
      const out = await claimWelcomeCoupon({
        user: req.user,
        locale: req.body?.locale,
        utm: req.body?.utm,
        config,
      })
      res.set('Cache-Control', 'no-store')
      res.json({ ok: true, ...out })
    }),
  )

  // Chequeo del cupón por código. Si hay sesión también mira de quién es y
  // "primera compra"; sin sesión devuelve el mail enmascarado. El checkout lo
  // revalida.
  router.post(
    '/api/coupons/check',
    limits.coupons,
    asyncHandler(async (req, res) => {
      const { lead, code, percent } = await resolveCouponForCheckout({
        code: req.body?.code,
        userId: req.user ? db.uid(req.user) : null,
        userEmail: req.user?.email || null,
      })
      res.json({
        ok: true,
        code,
        percent,
        // Sin vencimiento: vale hasta la primera compra.
        expiresAt: null,
        emailHint: maskEmail(lead.email),
      })
    }),
  )

  return router
}

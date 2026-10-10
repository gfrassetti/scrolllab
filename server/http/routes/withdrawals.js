import express from 'express'
import { asyncHandler, requireAuth } from '../../middleware.js'
import { requestWithdrawal, confirmWithdrawal, listWithdrawalOptions } from '../../services/refunds.js'

/**
 * Botón de arrepentimiento (Resolución 424/2020): público y sin cuenta. Si el
 * pedido viene con la sesión de la cuenta dueña de la compra, se ejecuta ya;
 * si no, el dueño de la compra lo confirma desde el link del mail. La
 * respuesta pública no filtra nada de la compra.
 */
export function createWithdrawalsRouter({ config, limits }) {
  const router = express.Router()

  router.post(
    '/api/withdrawals',
    limits.withdrawal,
    asyncHandler(async (req, res) => {
      const { code, duplicate, outcome } = await requestWithdrawal({
        email: req.body?.email,
        name: req.body?.name,
        orderRef: req.body?.order,
        message: req.body?.message,
        locale: req.body?.locale,
        sessionUser: req.user || null,
        config,
      })
      res.status(duplicate ? 200 : 201).json({ ok: true, code, outcome })
    }),
  )

  // Con sesión: sus compras y su suscripción, para elegir de cuál se arrepiente
  // (sin esto el servidor tenía que adivinar).
  router.get(
    '/api/withdrawals/options',
    requireAuth,
    asyncHandler(async (req, res) => {
      res.set('Cache-Control', 'no-store')
      res.json({ ok: true, options: await listWithdrawalOptions(req.user) })
    }),
  )

  // El link «Confirmar la devolución» del mail.
  router.post(
    '/api/withdrawals/confirm',
    limits.withdrawal,
    asyncHandler(async (req, res) => {
      const { code, outcome } = await confirmWithdrawal({ token: req.body?.token, config })
      res.json({ ok: true, code, outcome })
    }),
  )

  return router
}

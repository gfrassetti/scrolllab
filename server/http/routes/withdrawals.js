import express from 'express'
import { asyncHandler } from '../../middleware.js'
import { requestWithdrawal } from '../../services/refunds.js'

/**
 * Botón de arrepentimiento (Resolución 424/2020): público y sin cuenta. Devuelve
 * solo el código de seguimiento: nada de la orden, para no confirmar a un
 * extraño si un mail o un número existen.
 */
export function createWithdrawalsRouter({ config, limits }) {
  const router = express.Router()

  router.post(
    '/api/withdrawals',
    limits.withdrawal,
    asyncHandler(async (req, res) => {
      const { code, duplicate } = await requestWithdrawal({
        email: req.body?.email,
        name: req.body?.name,
        orderRef: req.body?.order,
        message: req.body?.message,
        locale: req.body?.locale,
        config,
      })
      res.status(duplicate ? 200 : 201).json({ ok: true, code })
    }),
  )

  return router
}

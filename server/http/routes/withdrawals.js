import express from 'express'
import { asyncHandler } from '../../middleware.js'
import { requestWithdrawal, confirmWithdrawal } from '../../services/refunds.js'

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

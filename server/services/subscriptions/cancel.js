import { sendSubscriptionCanceledOnce } from '../email.js'
import { isMock } from './billing.js'
import { cancelPreapprovalConfirmed } from './mpSync.js'
import { cancelPaddleConfirmed, isPaddleSub } from './paddleSync.js'

/**
 * Baja de LAB pedida por el cliente (desde LAB, Mi cuenta o el Botón de
 * arrepentimiento en la prueba): la pasarela deja de cobrar y el acceso sigue
 * hasta `currentPeriodEnd` (lo ya pagado, o el fin de la prueba). Sin días pagos
 * por delante se cierra en el acto. Si la pasarela no confirma la baja, tira
 * (502) y no se marca nada: una baja local que no hizo seguiría cobrando.
 * @returns {Promise<{ endsAt: Date | null, status: string }>}
 */
export async function cancelAtPeriodEnd(sub, config, deps = {}) {
  if (isPaddleSub(sub)) {
    await cancelPaddleConfirmed(sub, config, {}, deps)
  } else if (!isMock(config) && sub.mpPreapprovalId) {
    await cancelPreapprovalConfirmed(sub, config, deps)
  }
  sub.canceledAt = new Date()
  const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : null
  if (end == null || end <= Date.now()) sub.status = 'cancelled'
  await sub.save()
  sendSubscriptionCanceledOnce({ subscription: sub, config }).catch((err) =>
    console.error('subs canceled email', err?.message),
  )
  return { endsAt: sub.status === 'cancelled' ? null : sub.currentPeriodEnd, status: sub.status }
}

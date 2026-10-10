import { db } from '../../db.js'
import { alertAdmin } from '../orders.js'
import { noteRefund } from '../refundLedger.js'
import { subId, isMock } from './billing.js'
import { cancelPreapprovalConfirmed } from './mpSync.js'
import { cancelPaddleConfirmed, isPaddleSub } from './paddleSync.js'

/**
 * Devolución (o contracargo) de un cobro de LAB, venga de Mercado Pago o de
 * Paddle. Política (src/domain/policy.js `labRefundEligibility`): solo se
 * devuelve el PRIMER cobro, dentro de los días del alta; al devolverlo, la
 * suscripción se da de baja en el momento (no se le vuelve a cobrar y pierde el
 * acceso). Un contracargo también la da de baja. Una devolución de otra cuota
 * (excepción que hizo el dueño a mano) solo se anota y avisa: la suscripción
 * sigue.
 *
 * Siempre: libro de reembolsos + mail «Te devolvimos el dinero» (noteRefund) y
 * aviso al dueño. Idempotente: el mismo evento dos veces no da de baja dos
 * veces ni manda dos mails.
 *
 * @param {{ sub: any, provider: 'mercadopago' | 'paddle', externalId: string, chargeId: string | null, amount: number, currency: string, partial: boolean, reason: 'refunded' | 'charged_back', config: any }} args
 */
export async function handleLabRefund(
  { sub, provider, externalId, chargeId, amount, currency, partial, reason, config },
  deps = {},
) {
  await noteRefund({
    sub,
    config,
    data: {
      externalId,
      provider,
      kind: 'lab',
      subscriptionId: subId(sub),
      userId: sub.userId ? String(sub.userId) : null,
      amount,
      currency,
      partial,
      reason,
      refundedAt: new Date(),
    },
  })

  const first = !!chargeId && !!sub.firstChargeId && String(chargeId) === String(sub.firstChargeId)
  const ends = reason === 'charged_back' || (!partial && first)
  let ended = false
  if (ends && sub.status !== 'cancelled') {
    await endSubscriptionNow(sub, config, deps)
    ended = true
  }

  alertAdmin({
    kind: 'lab-refund',
    key: externalId,
    title: ended
      ? `LAB: ${reason === 'charged_back' ? 'CONTRACARGO' : 'DEVOLUCIÓN DEL PRIMER COBRO'} — suscripción dada de baja`
      : `LAB: ${reason === 'charged_back' ? 'CONTRACARGO' : partial ? 'DEVOLUCIÓN PARCIAL' : 'DEVOLUCIÓN DE UNA CUOTA'} — la suscripción sigue`,
    lines: [
      `${provider === 'paddle' ? 'Paddle' : 'Mercado Pago'} ${externalId} · ${amount} ${currency}`,
      `suscripción ${subId(sub)} · plan ${sub.plan} · ${ended ? 'baja inmediata y acceso cortado' : sub.status}`,
    ],
    config,
  })
  return { ended }
}

/**
 * Devolución (o contracargo) del pago de una diferencia de plan (subir de plan
 * a mitad de período, Mercado Pago). No da de baja la suscripción: eso lo hace
 * la del primer cobro cuando es un arrepentimiento. Libro de reembolsos + mail
 * «Te devolvimos el dinero» (noteRefund, idempotente por pago) y aviso al dueño.
 * @param {{ sub: any, paymentId: string, amount: number, currency: string, reason: 'refunded' | 'charged_back', config: any }} args
 */
export async function handleUpgradeRefund({ sub, paymentId, amount, currency, reason, config }) {
  const externalId = `mp-${paymentId}`
  await noteRefund({
    sub,
    config,
    data: {
      externalId,
      provider: 'mercadopago',
      kind: 'lab',
      subscriptionId: subId(sub),
      userId: sub.userId ? String(sub.userId) : null,
      amount,
      currency,
      partial: false,
      reason,
      refundedAt: new Date(),
    },
  })
  const paid = (sub.upgradePayments || []).find((p) => String(p.paymentId) === String(paymentId))
  if (paid && !paid.refundedAt) {
    paid.refundedAt = new Date()
    if (typeof sub.markModified === 'function') sub.markModified('upgradePayments')
    await sub.save()
  }
  alertAdmin({
    kind: 'lab-refund',
    key: externalId,
    title: `LAB: ${reason === 'charged_back' ? 'CONTRACARGO' : 'DEVOLUCIÓN'} DE UNA DIFERENCIA DE PLAN`,
    lines: [
      `Mercado Pago ${externalId} · ${amount} ${currency}`,
      `suscripción ${subId(sub)} · plan ${sub.plan} · ${sub.status}`,
    ],
    config,
  })
}

/**
 * Baja YA: en la pasarela (no se le vuelve a cobrar) y acá (el acceso termina
 * ahora). Si la pasarela no confirma la baja, avisa al dueño y la deja marcada
 * igual de este lado: ya se le devolvió el cobro, no puede seguir con el plan.
 */
async function endSubscriptionNow(sub, config, deps) {
  try {
    if (isPaddleSub(sub)) {
      await cancelPaddleConfirmed(sub, config, { immediately: true }, deps)
    } else if (!isMock(config) && sub.mpPreapprovalId) {
      await cancelPreapprovalConfirmed(sub, config, deps)
    }
  } catch (err) {
    alertAdmin({
      kind: 'lab-refund-cancel',
      key: `cancel-${subId(sub)}`,
      title: 'LAB: DEVOLVIMOS EL COBRO PERO LA PASARELA NO CONFIRMÓ LA BAJA — darla de baja a mano',
      lines: [`suscripción ${subId(sub)} · ${sub.provider || 'mercadopago'}`, String(err?.message || err)],
      config,
    })
  }
  const now = new Date()
  sub.status = 'cancelled'
  if (!sub.canceledAt) sub.canceledAt = now
  sub.currentPeriodEnd = now
  sub.refundedAt = now
  await sub.save()
}

/**
 * La suscripción de un pago de Mercado Pago que no es de una orden: las cuotas
 * de LAB llevan como referencia el id de la suscripción (el `external_reference`
 * del preapproval) o el id del preapproval.
 */
export async function findLabSubscriptionForMpPayment(payment) {
  const ref = String(payment?.external_reference || '')
  if (ref) {
    const byRef = await db.findSubscriptionById(ref).catch(() => null)
    if (byRef && !isPaddleSub(byRef)) return byRef
  }
  const preapprovalId =
    payment?.metadata?.preapproval_id ||
    payment?.point_of_interaction?.transaction_data?.subscription_id ||
    null
  if (preapprovalId) {
    return db.findSubscriptionByPreapproval(String(preapprovalId)).catch(() => null)
  }
  return null
}

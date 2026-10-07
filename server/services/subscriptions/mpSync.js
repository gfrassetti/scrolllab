import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { hostedPlanPrice } from '../../catalog.js'
import {
  fetchPreapproval,
  fetchAuthorizedPayment,
  cancelPreapproval,
} from '../mercadoPago.js'
import {
  toMs,
  subId,
  isMock,
  fireWelcome,
  fireCanceled,
  fireCharge,
  firePaymentFailed,
  addBillingCycle,
} from './billing.js'

/**
 * Sincronización con Mercado Pago: estados del preapproval, cuotas cobradas
 * (extienden el período), baja confirmada, cierre por vencimiento, altas
 * abandonadas y la activación mock de desarrollo.
 */

/** Mapea el status de MP a nuestro enum. */
function mapMpStatus(mpStatus) {
  switch (mpStatus) {
    case 'authorized':
      return 'authorized'
    case 'paused':
      return 'paused'
    case 'cancelled':
      return 'cancelled'
    case 'pending':
      return 'pending'
    default:
      return null
  }
}

export function markActivated(sub) {
  sub.status = 'authorized'
  if (!sub.activatedAt) sub.activatedAt = new Date()
  if (sub.abandonedAt) sub.abandonedAt = undefined
}

/**
 * Al activarse una suscripción nueva, las anteriores del usuario que seguían
 * vigentes por días ya pagados (canceladas) se cierran: la nueva cubre ese
 * período (el primer cobro es cuando terminaba la vieja).
 */
export async function closeSupersededSubscriptions(sub) {
  const id = subId(sub)
  const created = toMs(sub.createdAt) ?? Date.now()
  for (const other of await db.findSubscriptionsByUser(sub.userId)) {
    if (subId(other) === id) continue
    if (other.status !== 'authorized' && other.status !== 'paused') continue
    if ((toMs(other.createdAt) ?? 0) > created) continue
    if (other.canceledAt) {
      other.status = 'cancelled'
      await other.save()
    } else {
      console.error(
        `subs DOBLE SUSCRIPCIÓN user=${sub.userId} nueva=${id} previa=${subId(other)} ` +
          `ref=${other.mpPreapprovalId || other.paddleSubscriptionId || '-'} — revisar y dar de baja una`,
      )
    }
  }
}

export async function hasOtherActiveSubscription(sub) {
  const other = await db.findActiveSubscriptionByUser(sub.userId)
  return !!other && subId(other) !== subId(sub)
}

/**
 * Trae el preapproval de MP y baja su estado a la fila local. Compartido por el
 * webhook y por el sync manual (`POST /api/subscriptions/sync`), que hace lo
 * mismo pero disparado por el usuario — sirve para probar el flujo real de MP
 * sin exponer el webhook con un túnel.
 *
 * El período (`currentPeriodEnd`) solo se inicializa acá, al activarse; lo
 * extiende únicamente un cobro aprobado (`handleAuthorizedPaymentEvent`).
 */
// `deps.fetchPreapproval` es un seam para los tests: en prod usa el SDK de MP,
// en los tests se inyecta un doble sin pegarle a la red.
async function applyPreapprovalState(sub, config, deps = {}) {
  const fetchPre = deps.fetchPreapproval || fetchPreapproval
  const mp = await fetchPre(config.mpSubs.accessToken, sub.mpPreapprovalId)
  const next = mapMpStatus(mp?.status)
  let activated = false
  let canceledNow = false

  if (next === 'cancelled') {
    const paidAhead =
      (sub.status === 'authorized' || sub.status === 'paused') &&
      (toMs(sub.currentPeriodEnd) ?? 0) > Date.now()
    if (sub.status === 'pending') {
      // Nunca se activó (alta abandonada o reemplazada): no cuenta como
      // suscripción real para la prueba gratis.
      sub.status = 'cancelled'
      if (!sub.abandonedAt) sub.abandonedAt = new Date()
    } else if (paidAhead) {
      // Baja (nuestra, o desde la app de MP) con días pagos por delante: MP
      // ya no renueva, pero el acceso sigue hasta `currentPeriodEnd`.
      if (!sub.canceledAt) {
        sub.canceledAt = new Date()
        canceledNow = true
      }
    } else {
      sub.status = 'cancelled'
    }
  } else if (next === 'authorized') {
    if (sub.status !== 'authorized') {
      if (sub.canceledAt) {
        console.error(
          `subs MP AUTORIZADA SOBRE BAJA sub=${subId(sub)} preapproval=${sub.mpPreapprovalId} — revisar`,
        )
      }
      markActivated(sub)
      activated = true
    }
    if (!sub.currentPeriodEnd) {
      // Primer cobro según MP (fin de la prueba / ya mismo sin prueba).
      sub.currentPeriodEnd = new Date(
        mp.next_payment_date || sub.firstChargeAt || sub.trialEndsAt || Date.now(),
      )
    }
  } else if (next === 'paused') {
    sub.status = 'paused'
    if (!sub.activatedAt) sub.activatedAt = new Date()
    if (!sub.currentPeriodEnd) sub.currentPeriodEnd = new Date()
  } else if (next === 'pending') {
    sub.status = 'pending'
  }

  if (next) await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  if (canceledNow) fireCanceled(sub, config)
  fireWelcome(sub, config)
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
}

/**
 * Webhook `subscription_preapproval`: alta / pausa / baja de una suscripción.
 * Trae el id del preapproval en `data.id`.
 */
export async function handlePreapprovalEvent({ preapprovalId, config }, deps) {
  const sub = await db.findSubscriptionByPreapproval(preapprovalId)
  if (!sub) return { skipped: 'sin suscripción local' }
  return applyPreapprovalState(sub, config, deps)
}

/**
 * Sync manual: el usuario vuelve del checkout de MP y pide actualizar el estado
 * de su suscripción sin esperar al webhook. Toma la fila más reciente que tenga
 * `mpPreapprovalId` y no esté cancelada ni abandonada.
 */
export async function syncSubscriptionForUser({ userId, config }, deps) {
  // `findSubscriptionsByUser` ya viene ordenada por createdAt desc (file + mongo).
  const rows = await db.findSubscriptionsByUser(userId)
  const sub = rows.find(
    (s) => s.mpPreapprovalId && s.status !== 'cancelled' && !s.abandonedAt,
  )
  if (!sub) throw new HttpError(404, 'No hay suscripción para sincronizar')
  return applyPreapprovalState(sub, config, deps)
}

function warnIfSuspiciousAmount(ap, sub) {
  // Defensa en profundidad: el monto cobrado debería parecerse al precio del
  // plan. No bloqueamos (proración / promos de MP pueden diferir), pero un
  // desvío grande queda logueado para revisar una config equivocada.
  const charged = Number(ap?.payment?.transaction_amount ?? ap?.transaction_amount)
  const expected = hostedPlanPrice(sub.plan, sub.cycle)
  if (
    Number.isFinite(charged) &&
    Number.isFinite(expected) &&
    expected > 0 &&
    Math.abs(charged - expected) / expected > 0.5
  ) {
    console.warn(
      `subs authorized_payment monto sospechoso sub=${subId(sub)} ` +
        `plan=${sub.plan}/${sub.cycle} cobrado=${charged} esperado=${expected}`,
    )
  }
}

/**
 * Webhook `subscription_authorized_payment`: se cobró (o falló) una cuota de una
 * suscripción. `data.id` es el id del authorized_payment (NO del preapproval),
 * así que lo traemos de MP para saber a qué suscripción pertenece y si se cobró.
 *
 * - Aprobada solo si `payment.status === 'approved'`: MP deja la cuota en
 *   `processed` también cuando agotó los reintentos con el pago rechazado.
 * - El período queda en `debit_date + 1 ciclo` (máximo con el vigente), un
 *   valor absoluto: el mismo evento entregado dos veces, o en cualquier orden
 *   con el de preapproval, no regala días.
 * - Rechazada / reintentando (`recycling`): marca `paymentFailedAt` para la UI.
 *
 * `deps.fetchAuthorizedPayment` es el seam para los tests.
 */
export async function handleAuthorizedPaymentEvent(
  { authorizedPaymentId, config },
  deps = {},
) {
  const fetchAP = deps.fetchAuthorizedPayment || fetchAuthorizedPayment
  const ap = await fetchAP(config.mpSubs.accessToken, authorizedPaymentId)
  const preapprovalId = ap?.preapproval_id
  if (!preapprovalId) return { skipped: 'authorized_payment sin preapproval_id' }

  const sub = await db.findSubscriptionByPreapproval(String(preapprovalId))
  if (!sub) return { skipped: 'sin suscripción local' }

  const payStatus = ap?.payment?.status
  const approved = payStatus === 'approved'
  const failed =
    !approved &&
    (ap?.status === 'recycling' ||
      payStatus === 'rejected' ||
      payStatus === 'cancelled')
  let activated = false
  const firstCharge = !sub.lastPaidAt

  if (approved) {
    warnIfSuspiciousAmount(ap, sub)
    const debit = ap.debit_date ? new Date(ap.debit_date) : new Date()
    const paidThrough = addBillingCycle(debit, sub.cycle)
    if (!sub.currentPeriodEnd || paidThrough > new Date(sub.currentPeriodEnd)) {
      sub.currentPeriodEnd = paidThrough
    }
    if (!sub.lastPaidAt || debit > new Date(sub.lastPaidAt)) sub.lastPaidAt = debit
    // Lo pagado en este período: base para cobrar la diferencia si sube.
    sub.paidPlan = sub.plan
    sub.paidCycle = sub.cycle
    sub.paymentFailedAt = undefined
    if (sub.canceledAt) {
      console.error(
        `subs COBRO SOBRE BAJA sub=${subId(sub)} preapproval=${preapprovalId} ` +
          `ap=${authorizedPaymentId} — MP cobró una suscripción dada de baja: revisar y reembolsar`,
      )
    }
    if (sub.status !== 'authorized') {
      if (sub.status === 'cancelled' && (await hasOtherActiveSubscription(sub))) {
        console.error(
          `subs COBRO SOBRE SUSCRIPCIÓN REEMPLAZADA sub=${subId(sub)} ` +
            `preapproval=${preapprovalId} ap=${authorizedPaymentId} — revisar y reembolsar`,
        )
      } else {
        markActivated(sub)
        activated = true
      }
    }
  } else if (failed) {
    if (!sub.paymentFailedAt) sub.paymentFailedAt = new Date()
  } else if (ap?.status === 'processed' && !payStatus) {
    console.warn(
      `subs authorized_payment processed sin payment.status ap=${authorizedPaymentId} sub=${subId(sub)}`,
    )
  }

  if (approved || failed) await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  fireWelcome(sub, config)
  if (approved) {
    const amount = Number(ap?.payment?.transaction_amount ?? ap?.transaction_amount)
    fireCharge(sub, config, {
      ref: `mp-${authorizedPaymentId}`,
      firstCharge,
      amount: Number.isFinite(amount) ? amount : null,
      currency: sub.currency_id || 'ARS',
      paidAt: ap.debit_date || new Date(),
    })
  } else if (failed) {
    firePaymentFailed(sub, config, { ref: `mp-${authorizedPaymentId}` })
  }
  return {
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    approved,
    failed,
  }
}

/**
 * Da de baja un preapproval en MP y confirma que quedó cancelado. Si el PUT
 * falla pero MP ya lo tiene cancelado (baja desde la app de MP, o un reintento
 * de este mismo pedido), cuenta como éxito. Si no, 502: nunca marcamos una baja
 * local que MP no hizo — seguiría cobrando.
 */
export async function cancelPreapprovalConfirmed(sub, config, deps = {}) {
  const cancel = deps.cancelPreapproval || cancelPreapproval
  try {
    await cancel(config.mpSubs.accessToken, sub.mpPreapprovalId)
  } catch (err) {
    const fetchPre = deps.fetchPreapproval || fetchPreapproval
    const mp = await fetchPre(config.mpSubs.accessToken, sub.mpPreapprovalId).catch(
      () => null,
    )
    if (mapMpStatus(mp?.status) === 'cancelled') return
    console.error(
      `subs cancel FALLÓ en MP sub=${subId(sub)} preapproval=${sub.mpPreapprovalId}`,
      err?.message || err,
    )
    throw new HttpError(
      502,
      'No pudimos dar de baja la suscripción en Mercado Pago. Probá de nuevo en unos minutos.',
      { expose: true },
    )
  }
}

/**
 * Renovación caída (vencida sin cobro, MP puede seguir reintentando): se da de
 * baja en MP antes de abrir otra suscripción, o terminaría cobrando las dos.
 */
export async function closeLapsedSubscription(sub, config, deps = {}) {
  if (!isMock(config) && sub.mpPreapprovalId) {
    await cancelPreapprovalConfirmed(sub, config, deps)
  }
  sub.canceledAt = new Date()
  sub.status = 'cancelled'
  await sub.save()
}

/**
 * Alta a medio hacer (`pending`): se da de baja en MP antes de abrir otra, así
 * un checkout viejo que quedó abierto no puede terminar en un segundo cobro.
 * Si resulta que el usuario sí la completó, se activa y devuelve 'activated'.
 */
export async function retirePendingSubscription(sub, config, deps = {}) {
  if (!isMock(config) && sub.mpPreapprovalId) {
    const fetchPre = deps.fetchPreapproval || fetchPreapproval
    let mp = null
    try {
      mp = await fetchPre(config.mpSubs.accessToken, sub.mpPreapprovalId)
    } catch (err) {
      // 404: MP no la conoce (otro entorno) → no hay nada que completar.
      // Cualquier otro error: no sabemos si se completó, no abrimos otra.
      if (err?.status !== 404) throw err
    }
    const status = mapMpStatus(mp?.status)
    if (status === 'authorized' || status === 'paused') {
      await applyPreapprovalState(sub, config, { fetchPreapproval: async () => mp })
      return 'activated'
    }
    if (status === 'pending') {
      const cancel = deps.cancelPreapproval || cancelPreapproval
      await cancel(config.mpSubs.accessToken, sub.mpPreapprovalId)
    }
  }
  sub.abandonedAt = new Date()
  await sub.save()
  return 'retired'
}

/**
 * Modo mock: activa sin MP. Con primer cobro diferido (prueba o días ya
 * pagados) el período corre hasta ahí; sin él, simula el cobro inmediato.
 */
export async function activateMockSubscription(sub, config) {
  const now = new Date()
  const first = sub.firstChargeAt || sub.trialEndsAt
  markActivated(sub)
  if (first && new Date(first) > now) {
    sub.currentPeriodEnd = new Date(first)
  } else {
    sub.lastPaidAt = now
    sub.paidPlan = sub.plan
    sub.paidCycle = sub.cycle
    sub.currentPeriodEnd = addBillingCycle(now, sub.cycle)
  }
  await sub.save()
  await closeSupersededSubscriptions(sub)
  fireWelcome(sub, config)
  return sub
}

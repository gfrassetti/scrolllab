import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { HOSTED_PLANS, hostedPlanPriceIn } from '../../catalog.js'
import {
  createTransaction,
  getTransaction,
  cancelTransaction,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  previewSubscriptionUpdate,
  buildSubscriptionTransactionBody,
  labPrice,
  daysUntil,
  centsToUsd,
  PADDLE_PAID_STATUSES,
  PaddleError,
} from '../paddle.js'
import {
  toMs,
  subId,
  fireWelcome,
  fireCanceled,
  fireCharge,
  firePaymentFailed,
} from './billing.js'
import {
  markActivated,
  closeSupersededSubscriptions,
  hasOtherActiveSubscription,
} from './mpSync.js'

/**
 * LAB cobrado por Paddle (USD, ver docs/paddle.md): alta, estados de la
 * suscripción, cuotas cobradas o rechazadas, baja, alta abandonada y cambio de
 * plan. Las reglas de acceso son las mismas que con Mercado Pago (entitlement.js
 * no sabe de pasarelas): `currentPeriodEnd` lo extiende solo un cobro, la baja
 * respeta los días pagos y una suscripción nueva cierra la vieja.
 *
 * `deps.*` son seams para los tests (en prod, la API de Paddle por fetch).
 */

export const isPaddleSub = (sub) => sub?.provider === 'paddle'

const isPaddleMock = (config) => !!config.paddle?.mock

const api = (deps) => ({
  createTransaction: deps.createTransaction || createTransaction,
  getTransaction: deps.getTransaction || getTransaction,
  cancelTransaction: deps.cancelTransaction || cancelTransaction,
  getSubscription: deps.getSubscription || getSubscription,
  cancelSubscription: deps.cancelSubscription || cancelSubscription,
  updateSubscription: deps.updateSubscription || updateSubscription,
  previewSubscriptionUpdate: deps.previewSubscriptionUpdate || previewSubscriptionUpdate,
})

/** Estado de Paddle → nuestro enum. `past_due` sigue viva: corre la gracia. */
function mapPaddleStatus(status) {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
      return 'authorized'
    case 'paused':
      return 'paused'
    case 'canceled':
      return 'cancelled'
    default:
      return null
  }
}

const planTier = (plan) => HOSTED_PLANS[plan]?.tier || plan

/** Precio USD del plan como ítem non-catalog (alta y cambio de plan). */
function labItem(plan, cycle, config, trialDays = 0) {
  return {
    quantity: 1,
    price: labPrice({
      tier: planTier(plan),
      cycle,
      amountUsd: hostedPlanPriceIn(plan, cycle, 'USD'),
      taxCategory: config.paddle.taxCategory.lab,
      trialDays,
    }),
  }
}

/**
 * Abre el checkout del alta: una transacción con el precio recurrente del plan.
 * La prueba gratis o los días ya pagos de una baja van como `trial_period`
 * (días hasta el primer cobro), igual que `start_date` en MP.
 */
export async function startPaddleSubscription({ sub, user, firstChargeAt, config }, deps = {}) {
  const body = buildSubscriptionTransactionBody({
    subscriptionId: subId(sub),
    userId: String(sub.userId),
    plan: sub.plan,
    tier: planTier(sub.plan),
    cycle: sub.cycle,
    amountUsd: hostedPlanPriceIn(sub.plan, sub.cycle, 'USD'),
    trialDays: daysUntil(firstChargeAt),
    taxCategory: config.paddle.taxCategory.lab,
  })
  const txn = await api(deps).createTransaction(config, body)
  sub.paddleTransactionId = String(txn.id)
  await sub.save()
  return { transactionId: String(txn.id), email: user.email }
}

/**
 * Baja el estado de una suscripción de Paddle a la fila local. Compartido por
 * los webhooks `subscription.*` y el sync manual.
 * - `active` / `trialing` / `past_due` → `authorized` (en `past_due` corre la
 *   gracia y queda `paymentFailedAt`).
 * - El período se inicializa al activarse (fin de la prueba o del primer
 *   período ya cobrado) y después solo lo extiende un cobro: Paddle mueve
 *   `current_billing_period` al facturar, antes de saber si cobró.
 * - Baja programada (`scheduled_change.action === 'cancel'`) o `canceled` con
 *   días pagos: sigue con acceso hasta `currentPeriodEnd`.
 */
export async function applyPaddleSubscriptionState(sub, ps, config) {
  const next = mapPaddleStatus(ps?.status)
  let activated = false
  let canceledNow = false
  if (ps?.id && !sub.paddleSubscriptionId) sub.paddleSubscriptionId = String(ps.id)
  if (ps?.customer_id && !sub.paddleCustomerId) sub.paddleCustomerId = String(ps.customer_id)

  if (next === 'cancelled') {
    const paidAhead =
      (sub.status === 'authorized' || sub.status === 'paused') &&
      (toMs(sub.currentPeriodEnd) ?? 0) > Date.now()
    if (sub.status === 'pending') {
      sub.status = 'cancelled'
      if (!sub.abandonedAt) sub.abandonedAt = new Date()
    } else if (paidAhead) {
      if (!sub.canceledAt) {
        sub.canceledAt = new Date()
        canceledNow = true
      }
    } else {
      sub.status = 'cancelled'
    }
  } else if (next === 'authorized') {
    if (sub.status !== 'authorized') {
      if (sub.status === 'cancelled' && (await hasOtherActiveSubscription(sub))) {
        console.error(
          `subs PADDLE ACTIVA SOBRE SUSCRIPCIÓN REEMPLAZADA sub=${subId(sub)} ` +
            `paddle=${ps.id} — revisar y dar de baja una`,
        )
        await sub.save()
        return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
      }
      if (sub.canceledAt) {
        console.error(
          `subs PADDLE ACTIVA SOBRE BAJA sub=${subId(sub)} paddle=${ps.id} — revisar`,
        )
      }
      markActivated(sub)
      activated = true
    }
    const periodEnd = ps.current_billing_period?.ends_at
    if (!sub.currentPeriodEnd && periodEnd) sub.currentPeriodEnd = new Date(periodEnd)
    if (ps.status === 'trialing' && !sub.trialEndsAt && periodEnd) {
      sub.trialEndsAt = new Date(periodEnd)
    }
    if (ps.status === 'past_due' && !sub.paymentFailedAt) sub.paymentFailedAt = new Date()
    if (ps.scheduled_change?.action === 'cancel' && !sub.canceledAt) {
      sub.canceledAt = new Date()
      canceledNow = true
    }
  } else if (next === 'paused') {
    sub.status = 'paused'
    if (!sub.activatedAt) sub.activatedAt = new Date()
    if (!sub.currentPeriodEnd) sub.currentPeriodEnd = new Date()
  }

  await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  if (canceledNow) fireCanceled(sub, config)
  fireWelcome(sub, config)
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
}

/** Una fila nuestra referida por `custom_data`, solo si es del mismo usuario y de Paddle. */
async function subscriptionFromCustomData(custom) {
  if (custom?.kind !== 'lab' || !custom.subscriptionId) return null
  let sub = null
  try {
    sub = await db.findSubscriptionById(String(custom.subscriptionId))
  } catch (err) {
    if (err?.name !== 'CastError') throw err
  }
  if (!sub || !isPaddleSub(sub)) return null
  if (custom.userId && String(sub.userId) !== String(custom.userId)) return null
  return sub
}

/** La fila local de una transacción de LAB: por suscripción, por la transacción del alta o por custom_data. */
async function findLabSubscription(txn) {
  return (
    (await db.findSubscriptionByPaddle({
      subscriptionId: txn?.subscription_id || null,
      transactionId: txn?.id || null,
    })) || (await subscriptionFromCustomData(txn?.custom_data))
  )
}

/**
 * Webhook `subscription.*`: trae la suscripción de Paddle (el estado de ahora,
 * no el del evento: pueden llegar desordenados) y la aplica.
 */
export async function syncPaddleSubscription({ paddleSubscriptionId, config }, deps = {}) {
  const ps = await api(deps).getSubscription(config, paddleSubscriptionId)
  const sub =
    (await db.findSubscriptionByPaddle({ subscriptionId: ps?.id })) ||
    (await subscriptionFromCustomData(ps?.custom_data))
  if (!sub) return { skipped: 'sin suscripción local' }
  return applyPaddleSubscriptionState(sub, ps, config)
}

function warnIfSuspiciousUsd(txn, sub) {
  const sub_cents = Number(txn?.details?.totals?.subtotal)
  const expected = hostedPlanPriceIn(sub.plan, sub.cycle, 'USD')
  if (
    txn?.origin !== 'subscription_update' &&
    Number.isFinite(sub_cents) &&
    Number.isFinite(expected) &&
    expected > 0 &&
    Math.abs(centsToUsd(sub_cents) - expected) / expected > 0.5
  ) {
    console.warn(
      `subs paddle cobro sospechoso sub=${subId(sub)} txn=${txn.id} ` +
        `plan=${sub.plan}/${sub.cycle} cobrado=${centsToUsd(sub_cents)} esperado=${expected} USD`,
    )
  }
}

/**
 * Webhook `transaction.completed` / `.paid` de LAB: el alta (con o sin prueba),
 * una renovación o la diferencia de una subida de plan.
 * - Con monto: extiende el período hasta el fin del período facturado (valor
 *   absoluto, el mismo evento dos veces no regala días), anota el cobro y
 *   limpia el rechazo. Mail «cobro realizado» (uno por transacción).
 * - En cero (alta con prueba): el estado real lo da la suscripción.
 */
export async function handlePaddleLabTransaction({ transaction: txn, config }, deps = {}) {
  const sub = await findLabSubscription(txn)
  if (!sub) {
    console.error(
      `subs paddle COBRO SIN SUSCRIPCIÓN txn=${txn?.id} paddleSub=${txn?.subscription_id || '-'} — revisar`,
    )
    return { skipped: 'sin suscripción local' }
  }
  if (txn.subscription_id && !sub.paddleSubscriptionId) {
    sub.paddleSubscriptionId = String(txn.subscription_id)
  }
  if (txn.customer_id && !sub.paddleCustomerId) sub.paddleCustomerId = String(txn.customer_id)
  if (!PADDLE_PAID_STATUSES.has(txn.status)) {
    await sub.save()
    return { skipped: `transacción ${txn.status}` }
  }

  const totals = txn.details?.totals || {}
  const charged = Number(totals.grand_total ?? totals.total ?? 0)
  if (!(charged > 0)) {
    // Alta con prueba: Paddle guarda la tarjeta y no cobra. Lo demás lo
    // trae la suscripción (trialing, fin de la prueba).
    await sub.save()
    if (sub.paddleSubscriptionId) {
      return syncPaddleSubscription(
        { paddleSubscriptionId: sub.paddleSubscriptionId, config },
        deps,
      )
    }
    return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
  }

  warnIfSuspiciousUsd(txn, sub)
  const firstCharge = !sub.lastPaidAt
  let activated = false
  const periodEnd = txn.billing_period?.ends_at ? new Date(txn.billing_period.ends_at) : null
  if (periodEnd && (!sub.currentPeriodEnd || periodEnd > new Date(sub.currentPeriodEnd))) {
    sub.currentPeriodEnd = periodEnd
  }
  const paidAt = new Date(txn.billed_at || txn.updated_at || Date.now())
  if (!sub.lastPaidAt || paidAt > new Date(sub.lastPaidAt)) sub.lastPaidAt = paidAt
  sub.paidPlan = sub.plan
  sub.paidCycle = sub.cycle
  sub.paymentFailedAt = undefined
  if (sub.canceledAt && txn.origin !== 'subscription_update') {
    console.error(
      `subs paddle COBRO SOBRE BAJA sub=${subId(sub)} txn=${txn.id} — revisar y reembolsar`,
    )
  }
  if (sub.status !== 'authorized') {
    if (sub.status === 'cancelled' && (await hasOtherActiveSubscription(sub))) {
      console.error(
        `subs paddle COBRO SOBRE SUSCRIPCIÓN REEMPLAZADA sub=${subId(sub)} txn=${txn.id} — revisar y reembolsar`,
      )
    } else {
      markActivated(sub)
      activated = true
    }
  }
  await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  fireWelcome(sub, config)
  fireCharge(sub, config, {
    ref: `paddle-${txn.id}`,
    firstCharge,
    amount: centsToUsd(charged),
    currency: txn.currency_code || 'USD',
    paidAt,
  })
  return {
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    approved: true,
  }
}

/** Link de Paddle para cambiar la tarjeta (null si no se puede traer). */
async function updatePaymentUrl(sub, config, deps) {
  if (!sub.paddleSubscriptionId || isPaddleMock(config)) return null
  try {
    const ps = await api(deps).getSubscription(config, sub.paddleSubscriptionId)
    return ps?.management_urls?.update_payment_method || null
  } catch (err) {
    console.error(`subs paddle management_urls sub=${subId(sub)}`, err?.message)
    return null
  }
}

/**
 * Webhook `transaction.payment_failed` de LAB.
 * - En el alta (fila `pending`): se anota y el barrido manda el mail si en un
 *   rato no se pagó (suelen reintentar con otra tarjeta en el mismo checkout).
 * - En una renovación: `paymentFailedAt` y mail ya, con el link para cambiar
 *   la tarjeta. Paddle reintenta; un cobro posterior lo limpia.
 */
export async function handlePaddleLabPaymentFailed({ transaction: txn, config }, deps = {}) {
  const sub = await findLabSubscription(txn)
  if (!sub) return { skipped: 'sin suscripción local' }
  if (sub.status === 'pending') {
    sub.paymentFailedAt = new Date()
    await sub.save()
    return { failed: true, stage: 'checkout' }
  }
  if (!sub.paymentFailedAt) sub.paymentFailedAt = new Date()
  await sub.save()
  firePaymentFailed(sub, config, {
    ref: `paddle-${txn.id}`,
    updateUrl: await updatePaymentUrl(sub, config, deps),
  })
  return { failed: true, stage: 'renewal' }
}

/**
 * Sync manual al cerrar el checkout (no espera al webhook): la fila más nueva
 * de Paddle que no esté cerrada. Sin suscripción todavía, mira la transacción
 * del alta.
 */
export async function syncPaddleForUser({ userId, config }, deps = {}) {
  const rows = await db.findSubscriptionsByUser(userId)
  const sub = rows.find(
    (s) =>
      isPaddleSub(s) &&
      (s.paddleSubscriptionId || s.paddleTransactionId) &&
      s.status !== 'cancelled' &&
      !s.abandonedAt,
  )
  if (!sub) throw new HttpError(404, 'No hay suscripción para sincronizar')
  if (!sub.paddleSubscriptionId) {
    const txn = await api(deps).getTransaction(config, sub.paddleTransactionId)
    if (txn?.subscription_id) {
      sub.paddleSubscriptionId = String(txn.subscription_id)
      await sub.save()
    } else {
      return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
    }
    if (PADDLE_PAID_STATUSES.has(txn.status)) {
      const totals = txn.details?.totals || {}
      if (Number(totals.grand_total ?? totals.total ?? 0) > 0) {
        await handlePaddleLabTransaction({ transaction: txn, config }, deps)
      }
    }
  }
  return syncPaddleSubscription(
    { paddleSubscriptionId: sub.paddleSubscriptionId, config },
    deps,
  )
}

/**
 * Da de baja en Paddle y confirma. Con días pagos, al fin del período; en
 * `past_due` (Paddle no deja programarla) o sin días por delante, ya. Si la
 * llamada falla pero Paddle ya la tiene cancelada o programada, cuenta como
 * éxito. Si no, 502: una baja local que Paddle no hizo seguiría cobrando.
 */
export async function cancelPaddleConfirmed(sub, config, { immediately = false } = {}, deps = {}) {
  if (isPaddleMock(config) || !sub.paddleSubscriptionId) return
  const p = api(deps)
  try {
    let effective = immediately ? 'immediately' : 'next_billing_period'
    if (!immediately) {
      const ps = await p.getSubscription(config, sub.paddleSubscriptionId)
      if (ps?.status === 'canceled' || ps?.scheduled_change?.action === 'cancel') return
      if (ps?.status === 'past_due') effective = 'immediately'
    }
    await p.cancelSubscription(config, sub.paddleSubscriptionId, effective)
  } catch (err) {
    const ps = await p.getSubscription(config, sub.paddleSubscriptionId).catch(() => null)
    if (ps?.status === 'canceled' || ps?.scheduled_change?.action === 'cancel') return
    console.error(
      `subs cancel FALLÓ en Paddle sub=${subId(sub)} paddle=${sub.paddleSubscriptionId}`,
      err?.message || err,
    )
    throw new HttpError(
      502,
      'No pudimos dar de baja la suscripción en Paddle. Probá de nuevo en unos minutos.',
      { expose: true },
    )
  }
}

/**
 * Alta a medio hacer: se cancela la transacción del checkout antes de abrir
 * otra (un checkout viejo abierto no puede terminar en un segundo cobro). Si
 * resulta que sí se pagó, se activa y devuelve 'activated'.
 */
export async function retirePendingPaddle(sub, config, deps = {}) {
  if (!isPaddleMock(config) && sub.paddleTransactionId) {
    const p = api(deps)
    let txn = null
    try {
      txn = await p.getTransaction(config, sub.paddleTransactionId)
    } catch (err) {
      // 404: Paddle no la conoce (otro entorno) → no hay nada que completar.
      // Cualquier otro error: no sabemos si se pagó, no abrimos otra.
      if (err?.status !== 404) throw err
    }
    if (txn && ['draft', 'ready'].includes(txn.status)) {
      try {
        await p.cancelTransaction(config, sub.paddleTransactionId)
        txn = null
      } catch (err) {
        // Se pagó entre la consulta y la baja: la volvemos a mirar.
        txn = await p.getTransaction(config, sub.paddleTransactionId)
        if (!PADDLE_PAID_STATUSES.has(txn?.status)) throw err
      }
    }
    if (txn && PADDLE_PAID_STATUSES.has(txn.status) && txn.subscription_id) {
      sub.paddleSubscriptionId = String(txn.subscription_id)
      await sub.save()
      const out = await syncPaddleSubscription(
        { paddleSubscriptionId: sub.paddleSubscriptionId, config },
        deps,
      )
      if (out.status === 'authorized' || out.status === 'paused') return 'activated'
    }
  }
  sub.abandonedAt = new Date()
  await sub.save()
  return 'retired'
}

/**
 * Cambio de plan en Paddle (mismo ciclo). Subir con días pagos: Paddle cobra
 * la diferencia prorrateada a la tarjeta guardada y, si la rechaza, no aplica
 * nada (`prevent_change` → 402). Bajar, en la prueba o por una diferencia
 * mínima: sin cobro, la próxima cuota sale con el precio nuevo.
 * @param {{ sub: any, targetPlan: string, bill: boolean, config: any }} args
 */
export async function changePaddlePlan({ sub, targetPlan, bill, config }, deps = {}) {
  if (isPaddleMock(config) || !sub.paddleSubscriptionId) return { charged: bill }
  try {
    await api(deps).updateSubscription(config, sub.paddleSubscriptionId, {
      items: [labItem(targetPlan, sub.cycle, config)],
      proration_billing_mode: bill ? 'prorated_immediately' : 'do_not_bill',
      on_payment_failure: 'prevent_change',
    })
    return { charged: bill }
  } catch (err) {
    console.error(
      `subs paddle cambio de plan FALLÓ sub=${subId(sub)} paddle=${sub.paddleSubscriptionId} plan=${targetPlan}`,
      err?.message || err,
    )
    if (err instanceof PaddleError && err.status < 500) {
      throw new HttpError(
        402,
        'Tu tarjeta rechazó el cobro de la diferencia. Actualizá el medio de pago y probá de nuevo.',
        { expose: true },
      )
    }
    throw new HttpError(
      502,
      'Paddle no respondió al cambiar de plan. Probá de nuevo en unos minutos.',
      { expose: true },
    )
  }
}

/**
 * Lo que Paddle cobraría hoy por subir a `targetPlan` (con impuestos, USD).
 * `null` si no se pudo cotizar: la UI usa la cuenta local.
 */
export async function previewPaddlePlanChange({ sub, targetPlan, config }, deps = {}) {
  if (isPaddleMock(config) || !sub.paddleSubscriptionId) return null
  try {
    const preview = await api(deps).previewSubscriptionUpdate(config, sub.paddleSubscriptionId, {
      items: [labItem(targetPlan, sub.cycle, config)],
      proration_billing_mode: 'prorated_immediately',
    })
    const cents = Number(preview?.immediate_transaction?.details?.totals?.grand_total)
    return Number.isFinite(cents) ? centsToUsd(cents) : 0
  } catch (err) {
    console.error(`subs paddle preview sub=${subId(sub)}`, err?.message)
    return null
  }
}


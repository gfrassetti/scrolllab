import crypto from 'node:crypto'
import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import {
  HOSTED_PLANS,
  hostedPlanQuota,
  hostedPlanPrice,
  hostedPlanPriceIn,
  isHostedPlanId,
} from '../../catalog.js'
import { isPaddleSub, changePaddlePlan } from './paddleSync.js'
import {
  updatePreapprovalAmount,
  createUpgradePreference,
} from '../mercadoPago.js'
import {
  DAY_MS,
  MIN_UPGRADE_CHARGE,
  MIN_UPGRADE_CHARGE_USD,
  UPGRADE_QUOTE_TTL_MS,
  UPGRADE_REF_PREFIX,
  toMs,
  subId,
  isMock,
  paidWindow,
} from './billing.js'

/**
 * Cambio de plan: cotización del upgrade (MP no prorratea, la diferencia se
 * cobra aparte), la preference de ese pago, aplicarlo cuando MP confirma y el
 * mock de desarrollo. Bajar de plan no cobra.
 */

/** Plan más caro que otro (el orden de los tiers es el de su precio). */
export function isHigherPlan(a, b) {
  return hostedPlanPrice(a, 'monthly') > hostedPlanPrice(b, 'monthly')
}

const planReason = (plan, cycle) =>
  `ScrollLab LAB — ${HOSTED_PLANS[plan].tier} (${cycle === 'yearly' ? 'anual' : 'mensual'})`

/**
 * Cuánto cuesta pasar a `targetPlan` hoy. MP no prorratea, así que la
 * diferencia por los días que quedan del período pago se cobra aparte (pago
 * único); los cobros siguientes ya salen con el precio nuevo.
 * - Sin nada pago (prueba): 0, el primer cobro ya sale con el precio nuevo.
 * - Plan pagado igual o más caro que el destino (bajar de plan, o volver al
 *   que ya pagó después de bajar): 0.
 * - Menos de `MIN_UPGRADE_CHARGE`: 0 (no vale un cobro por los últimos días).
 */
export function quoteUpgrade(sub, targetPlan, now = Date.now()) {
  // En la moneda de la suscripción: ARS (MP) o USD con centavos (Paddle).
  const usd = sub.currency_id === 'USD'
  const priceOf = (plan, cycle) => hostedPlanPriceIn(plan, cycle, usd ? 'USD' : 'ARS')
  const base = { amount: 0, newPrice: priceOf(targetPlan, sub.cycle) }
  const w = paidWindow(sub, now)
  if (!w) return { ...base, reason: 'unpaid' }
  const periodEnd = new Date(w.end)
  const days = Math.ceil((w.end - now) / DAY_MS)
  const diff = priceOf(targetPlan, w.cycle) - priceOf(w.plan, w.cycle)
  if (diff <= 0) return { ...base, reason: 'covered', periodEnd, days }
  const fraction = Math.min(1, Math.max(0, (w.end - now) / (w.end - w.start)))
  const amount = usd ? Math.ceil(diff * fraction * 100) / 100 : Math.ceil(diff * fraction)
  if (amount < (usd ? MIN_UPGRADE_CHARGE_USD : MIN_UPGRADE_CHARGE)) {
    return { ...base, reason: 'minimal', periodEnd, days }
  }
  return { ...base, amount, reason: 'prorated', periodEnd, days }
}

/** `external_reference` del pago de la diferencia: lo armamos nosotros. */
export function upgradeReference({ subscriptionId, plan, amount, nonce }) {
  return `${UPGRADE_REF_PREFIX}:${subscriptionId}:${plan}:${amount}:${nonce}`
}

export function parseUpgradeReference(ref) {
  const parts = String(ref || '').split(':')
  if (parts.length !== 5 || parts[0] !== UPGRADE_REF_PREFIX) return null
  const [, subscriptionId, plan, raw] = parts
  const amount = Number(raw)
  if (!subscriptionId || !isHostedPlanId(plan)) return null
  if (!Number.isInteger(amount) || amount <= 0) return null
  return { subscriptionId, plan, amount }
}

export const isUpgradeReference = (ref) =>
  String(ref || '').startsWith(`${UPGRADE_REF_PREFIX}:`)

/**
 * Validaciones comunes a cotizar y a cambiar de plan. Solo entre tiers del
 * MISMO ciclo: MP no deja mutar la frecuencia de un preapproval, así que
 * mensual↔anual sigue por cancelar + re-suscribir (lo maneja la UI). Bajar de
 * plan se bloquea si el usuario ya publicó más de lo que el plan nuevo permite.
 */
async function loadChangeableSubscription(userId, targetPlan) {
  if (!isHostedPlanId(targetPlan)) throw new HttpError(400, 'Plan inválido')

  const sub = await db.findActiveSubscriptionByUser(userId)
  const gateway = sub?.provider === 'paddle' ? 'Paddle' : 'Mercado Pago'
  if (sub?.status === 'paused') {
    throw new HttpError(
      409,
      `Tu suscripción está en pausa en ${gateway}. Reactivala ahí o cancelala para suscribirte de nuevo.`,
      { expose: true },
    )
  }
  if (!sub || sub.status !== 'authorized') {
    throw new HttpError(404, 'No tenés una suscripción activa', { expose: true })
  }
  if (sub.canceledAt) {
    throw new HttpError(
      409,
      'Tu suscripción está dada de baja. Volvé a suscribirte al plan que quieras.',
      { expose: true },
    )
  }
  const end = toMs(sub.currentPeriodEnd)
  if (end != null && end <= Date.now()) {
    // En gracia: subir de plan acá regalaría la cuota nueva sin cobro.
    throw new HttpError(
      409,
      `Tenés un cobro pendiente en ${gateway}. Cuando se acredite, vas a poder cambiar de plan.`,
      { expose: true },
    )
  }
  if (sub.plan === targetPlan) {
    throw new HttpError(409, 'Ya estás en ese plan', { expose: true })
  }

  const used = await db.countPublishedHosted(userId, null)
  const targetQuota = hostedPlanQuota(targetPlan)
  if (used > targetQuota) {
    throw new HttpError(
      402,
      `Ese plan permite ${targetQuota} secciones publicadas y tenés ${used}. Despublicá ${used - targetQuota} antes de bajar de plan.`,
      { expose: true },
    )
  }
  return { sub, targetQuota }
}

function changeSummary(sub, targetPlan, quote) {
  return {
    plan: targetPlan,
    currentPlan: sub.plan,
    cycle: sub.cycle,
    direction: isHigherPlan(targetPlan, sub.plan) ? 'upgrade' : 'downgrade',
    provider: sub.provider || 'mercadopago',
    currency_id: sub.currency_id || 'ARS',
    amount: quote.amount,
    days: quote.days ?? null,
    newPrice: quote.newPrice,
    // Desde cuándo MP cobra el precio nuevo (el próximo cobro).
    priceEffectiveAt: sub.currentPeriodEnd || null,
    trialing: quote.reason === 'unpaid',
  }
}

/**
 * Qué pasaría al cambiar a `plan`, sin tocar nada (la UI lo muestra antes). La
 * misma cuenta en las dos pasarelas: es exactamente lo que se cobra.
 */
export async function previewPlanChange({ userId, plan: targetPlan }) {
  const { sub } = await loadChangeableSubscription(userId, targetPlan)
  return changeSummary(sub, targetPlan, quoteUpgrade(sub, targetPlan))
}

/**
 * Cambio de plan sin dar de baja.
 * - Subir con días pagos por delante: se cobra la diferencia prorrateada con
 *   un pago único (Checkout Pro). El plan nuevo rige cuando ese pago se
 *   aprueba (`applyUpgradePayment`, por webhook o al volver de MP).
 * - Bajar, subir durante la prueba o por una diferencia mínima: rige ya.
 * En los dos casos los cobros siguientes de MP salen con el precio nuevo (PUT
 * de monto sobre el mismo preapproval: no se abre otra suscripción).
 * `deps.updateAmount` / `deps.createUpgradePreference` son seams para tests.
 */
export async function changeSubscriptionPlan(
  { userId, plan: targetPlan, config },
  deps = {},
) {
  const { sub, targetQuota } = await loadChangeableSubscription(userId, targetPlan)
  const quote = quoteUpgrade(sub, targetPlan)
  if (isPaddleSub(sub)) {
    return changePaddleSubscriptionPlan({ sub, targetPlan, targetQuota, quote, config }, deps)
  }
  if (quote.amount > 0) {
    return startUpgradePayment({ sub, targetPlan, quote, config }, deps)
  }

  const previousPlan = sub.plan
  let mpUpdated = false
  if (!isMock(config) && sub.mpPreapprovalId) {
    const update = deps.updateAmount || updatePreapprovalAmount
    await update(config.mpSubs.accessToken, sub.mpPreapprovalId, {
      amount: hostedPlanPrice(targetPlan, sub.cycle),
      currencyId: HOSTED_PLANS[targetPlan].currency_id,
      reason: planReason(targetPlan, sub.cycle),
    })
    mpUpdated = true
  }

  // Lo pagado del período no cambia al bajar: si vuelve a subir antes del
  // próximo cobro, no paga dos veces. Filas viejas: se fija acá.
  const window = paidWindow(sub)
  if (window && !sub.paidPlan) {
    sub.paidPlan = window.plan
    sub.paidCycle = window.cycle
  }
  // Diferencia mínima: se regala, cuenta como pago.
  if (quote.reason === 'minimal') sub.paidPlan = targetPlan
  sub.plan = targetPlan
  try {
    await sub.save()
  } catch (err) {
    // MP ya tiene el monto nuevo pero la fila local no. Reintentar el endpoint
    // arregla (el PUT de MP es idempotente). Log greppable para reconciliar a
    // mano si el reintento no llega.
    if (mpUpdated) {
      console.error(
        `subs change RECONCILE: MP en ${targetPlan} pero local sigue en ` +
          `${previousPlan} sub=${subId(sub)} preapproval=${sub.mpPreapprovalId}`,
        err?.message,
      )
    }
    throw err
  }

  return {
    requiresPayment: false,
    plan: sub.plan,
    previousPlan,
    quota: targetQuota,
    cycle: sub.cycle,
    // El monto nuevo lo cobra MP recién en el próximo ciclo.
    priceEffectiveAt: sub.currentPeriodEnd || null,
  }
}

/**
 * Paddle: la misma diferencia que Mercado Pago, pero se cobra a la tarjeta
 * guardada al instante (cargo único, sin checkout); si la rechaza, no cambia
 * nada. El plan nuevo rige apenas Paddle cobra.
 */
async function changePaddleSubscriptionPlan({ sub, targetPlan, targetQuota, quote, config }, deps) {
  const bill = quote.amount > 0
  await changePaddlePlan(
    { sub, targetPlan, amountUsd: quote.amount, days: quote.days ?? null, config },
    deps,
  )
  const previousPlan = sub.plan
  const window = paidWindow(sub)
  if (window && !sub.paidPlan) {
    sub.paidPlan = window.plan
    sub.paidCycle = window.cycle
  }
  // Pagó la diferencia (o era mínima y se regala): el período ya es del plan nuevo.
  if (bill || quote.reason === 'minimal') sub.paidPlan = targetPlan
  sub.plan = targetPlan
  try {
    await sub.save()
  } catch (err) {
    console.error(
      `subs change RECONCILE: Paddle en ${targetPlan} pero local sigue en ` +
        `${previousPlan} sub=${subId(sub)} paddle=${sub.paddleSubscriptionId}`,
      err?.message,
    )
    throw err
  }
  return {
    requiresPayment: false,
    charged: bill,
    plan: sub.plan,
    previousPlan,
    quota: targetQuota,
    cycle: sub.cycle,
    currency_id: sub.currency_id || 'USD',
    priceEffectiveAt: sub.currentPeriodEnd || null,
  }
}

/**
 * Arma (o reusa) el checkout de la diferencia. Dos clicks no abren dos
 * checkouts: mientras el anterior siga vigente para el mismo plan, se devuelve
 * ese.
 */
async function startUpgradePayment({ sub, targetPlan, quote, config }, deps) {
  const now = Date.now()
  const summary = changeSummary(sub, targetPlan, quote)
  const open = sub.pendingUpgrade
  if (
    open?.plan === targetPlan &&
    (toMs(open.expiresAt) ?? 0) > now + 10 * 60 * 1000 &&
    (open.initPoint || isMock(config))
  ) {
    return upgradeCheckout(summary, open)
  }

  const expiresAt = new Date(
    Math.min(now + UPGRADE_QUOTE_TTL_MS, quote.periodEnd.getTime()),
  )
  const reference = upgradeReference({
    subscriptionId: subId(sub),
    plan: targetPlan,
    amount: quote.amount,
    nonce: crypto.randomBytes(4).toString('hex'),
  })
  const pending = {
    plan: targetPlan,
    amount: quote.amount,
    reference,
    expiresAt,
    createdAt: new Date(now),
  }
  if (!isMock(config)) {
    const create = deps.createUpgradePreference || createUpgradePreference
    const pref = await create({
      accessToken: config.mpSubs.accessToken,
      reference,
      title: `ScrollLab LAB — pasar a ${HOSTED_PLANS[targetPlan].tier} (${quote.days} ${
        quote.days === 1 ? 'día' : 'días'
      })`,
      amount: quote.amount,
      expiresAt,
      clientUrl: config.clientUrl,
      apiPublicUrl: config.apiPublicUrl,
    })
    pending.preferenceId = String(pref.id)
    pending.initPoint = pref.init_point
  }
  sub.pendingUpgrade = pending
  await sub.save()
  return upgradeCheckout(summary, pending)
}

function upgradeCheckout(summary, pending) {
  return {
    ...summary,
    requiresPayment: true,
    amount: pending.amount,
    expiresAt: pending.expiresAt,
    ...(pending.initPoint
      ? { init_point: pending.initPoint }
      : { mock: true, payUrl: '/api/subscriptions/upgrade/mock-pay' }),
  }
}

/**
 * Aplica el pago de la diferencia: webhook `payment` o confirm al volver de
 * MP (con credenciales de prueba MP no manda webhooks). Idempotente por id de
 * pago. Monto y moneda se validan contra la referencia, que armamos nosotros.
 * Un pago que ya no se puede aplicar (suscripción dada de baja, o ya tiene ese
 * plan o uno mayor) queda registrado y logueado para reembolsar a mano.
 */
export async function applyUpgradePayment(
  { payment, config, expectedUserId = null },
  deps = {},
) {
  if (payment.status !== 'approved') {
    const processing = ['pending', 'in_process', 'authorized'].includes(
      payment.status,
    )
    throw new HttpError(
      processing ? 409 : 400,
      processing
        ? 'Mercado Pago todavía está procesando el pago'
        : 'El pago no fue aprobado',
      { expose: true },
    )
  }
  const ref = parseUpgradeReference(payment.external_reference)
  if (!ref) throw new HttpError(400, 'El pago no corresponde a un cambio de plan')

  let sub = null
  try {
    sub = await db.findSubscriptionById(ref.subscriptionId)
  } catch (err) {
    if (err?.name !== 'CastError') throw err
  }
  if (!sub) throw new HttpError(404, 'No encontramos la suscripción de ese pago')
  if (expectedUserId && String(sub.userId) !== String(expectedUserId)) {
    throw new HttpError(
      403,
      'Ese pago pertenece a otra cuenta. Entrá con la cuenta con la que pagaste.',
      { expose: true },
    )
  }
  const paymentId = String(payment.id)
  if (
    payment.currency_id !== 'ARS' ||
    Number(payment.transaction_amount) !== ref.amount
  ) {
    console.error(
      `subs upgrade MONTO NO COINCIDE sub=${subId(sub)} payment=${paymentId} ` +
        `cobrado=${payment.transaction_amount} ${payment.currency_id} esperado=${ref.amount} ARS`,
    )
    throw new HttpError(400, 'El monto del pago no coincide con el cambio de plan')
  }
  if ((sub.upgradePayments || []).some((p) => p.paymentId === paymentId)) {
    return { plan: sub.plan, alreadyApplied: true }
  }

  const record = (outcome) => {
    sub.upgradePayments = [
      ...(sub.upgradePayments || []),
      { paymentId, plan: ref.plan, amount: ref.amount, at: new Date(), outcome },
    ]
  }
  const end = toMs(sub.currentPeriodEnd)
  const live =
    sub.status === 'authorized' && !sub.canceledAt && end != null && end > Date.now()
  if (!live || !isHigherPlan(ref.plan, sub.plan)) {
    console.error(
      `subs upgrade PAGO SIN APLICAR sub=${subId(sub)} payment=${paymentId} ` +
        `plan=${ref.plan} actual=${sub.plan} estado=${sub.status}` +
        `${sub.canceledAt ? ' (baja)' : ''} — reembolsar ${ref.amount} ARS`,
    )
    record('refund')
    await sub.save()
    // Pagó dos veces el mismo cambio: ya tiene el plan.
    if (live && sub.plan === ref.plan) return { plan: sub.plan, alreadyApplied: true }
    throw new HttpError(
      409,
      'No pudimos aplicar el cambio de plan con ese pago. Escribinos y te lo devolvemos.',
      { expose: true },
    )
  }

  // Primero MP: los cobros siguientes con el precio nuevo. Si falla, 502 y no
  // se marca nada (el webhook se reintenta; el PUT es idempotente).
  if (!isMock(config) && sub.mpPreapprovalId) {
    const update = deps.updateAmount || updatePreapprovalAmount
    try {
      await update(config.mpSubs.accessToken, sub.mpPreapprovalId, {
        amount: hostedPlanPrice(ref.plan, sub.cycle),
        currencyId: HOSTED_PLANS[ref.plan].currency_id,
        reason: planReason(ref.plan, sub.cycle),
      })
    } catch (err) {
      console.error(
        `subs upgrade PUT FALLÓ sub=${subId(sub)} payment=${paymentId} plan=${ref.plan}`,
        err?.message || err,
      )
      throw new HttpError(
        502,
        'Recibimos tu pago, pero Mercado Pago no respondió al actualizar tu suscripción. Probá de nuevo en unos minutos.',
        { expose: true },
      )
    }
  }

  const window = paidWindow(sub)
  sub.paidCycle = sub.paidCycle || window?.cycle || sub.cycle
  sub.paidPlan = ref.plan
  sub.plan = ref.plan
  if (sub.pendingUpgrade?.plan === ref.plan) sub.pendingUpgrade = undefined
  record('applied')
  await sub.save()
  return { plan: sub.plan, alreadyApplied: false }
}

/** Modo mock: paga el checkout de la diferencia que quedó abierto. */
export async function applyMockUpgrade({ userId, config }) {
  const sub = await db.findActiveSubscriptionByUser(userId)
  const pending = sub?.pendingUpgrade
  if (!pending || (toMs(pending.expiresAt) ?? 0) <= Date.now()) {
    throw new HttpError(404, 'No hay un cambio de plan esperando pago', {
      expose: true,
    })
  }
  return applyUpgradePayment({
    payment: {
      id: `mock-${Date.now()}`,
      status: 'approved',
      currency_id: 'ARS',
      transaction_amount: pending.amount,
      external_reference: pending.reference,
    },
    config,
    expectedUserId: userId,
  })
}

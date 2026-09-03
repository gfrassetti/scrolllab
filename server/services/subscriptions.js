import { db } from '../db.js'
import { HttpError } from '../validation.js'
import {
  HOSTED_PLANS,
  hostedPlanQuota,
  hostedPlanPrice,
  isHostedPlanId,
} from '../catalog.js'
import {
  fetchPreapproval,
  fetchAuthorizedPayment,
  updatePreapprovalAmount,
} from './mercadoPago.js'
import { sendSubscriptionWelcomeOnce } from './email.js'

/** Mail de bienvenida al activarse — fire-and-forget, idempotente por el claim. */
function fireWelcome(sub, config) {
  if (sub?.status !== 'authorized') return
  sendSubscriptionWelcomeOnce({ subscription: sub, config }).catch((err) =>
    console.error('subs welcome email', err?.message),
  )
}

const FREE = (config, extra = {}) => ({
  plan: 'free',
  cycle: null,
  quota: config.hostedFreeQuota,
  subscriptionStatus: null,
  subscriptionId: null,
  currentPeriodEnd: null,
  canceledAt: null,
  createdAt: null,
  trialEndsAt: null,
  trialing: false,
  ...extra,
})

/**
 * Qué puede hacer un usuario hoy: su plan efectivo y su cuota de instancias
 * publicadas. Sin suscripción activa → tier "free" con `config.hostedFreeQuota`.
 *
 * Una suscripción cancelada sigue dando acceso hasta `currentPeriodEnd` (ya
 * pagó el período). Cuando ese día pasa, la marcamos `cancelled` acá mismo
 * (barrido perezoso) y devolvemos free.
 */
export async function resolveEntitlement(userId, config, { persist = true } = {}) {
  const sub = await db.findActiveSubscriptionByUser(userId)
  if (!sub || !HOSTED_PLANS[sub.plan]) return FREE(config)

  const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
  if (end && end.getTime() <= Date.now()) {
    // `persist:false` desde el path público del embed: no escribimos la fila
    // en cada request anónima (el flip a `cancelled` lo hace el próximo
    // /api/subscriptions/me o assertCanPublish del dueño).
    if (persist && sub.status !== 'cancelled') {
      sub.status = 'cancelled'
      await sub.save()
    }
    return FREE(config)
  }

  const trialing =
    !!sub.trialEndsAt &&
    new Date(sub.trialEndsAt).getTime() > Date.now() &&
    !sub.canceledAt

  return {
    plan: sub.plan,
    cycle: sub.cycle,
    quota: hostedPlanQuota(sub.plan),
    subscriptionStatus: sub.status,
    subscriptionId: db.uid(sub) || sub.id,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    canceledAt: sub.canceledAt || null,
    createdAt: sub.createdAt || null,
    trialEndsAt: sub.trialEndsAt || null,
    trialing,
  }
}

/**
 * Bloquea publicar si el usuario ya llegó a su cuota. `instanceId` se excluye
 * del conteo (re-publicar una que ya estaba publicada no suma).
 */
export async function assertCanPublish({ userId, instanceId, config }) {
  const ent = await resolveEntitlement(userId, config)
  const used = await db.countPublishedHosted(userId, instanceId)
  if (used >= ent.quota) {
    throw new HttpError(
      402,
      ent.plan === 'free'
        ? 'Llegaste al límite gratis. Suscribite para publicar más secciones.'
        : 'Llegaste al límite de tu plan. Subí de plan para publicar más.',
      { expose: true },
    )
  }
}

/**
 * Cambio de plan sin dar de baja. Solo entre tiers del MISMO ciclo: MP no deja
 * mutar la frecuencia de un preapproval, así que mensual↔anual sigue por
 * cancelar + re-suscribir (lo maneja la UI). Semántica:
 *   - la cuota nueva rige YA (deja publicar de una al subir de plan)
 *   - el precio nuevo rige desde el próximo cobro (MP no prorratea)
 *   - bajar de plan se bloquea si el usuario ya publicó más de lo que el
 *     plan nuevo permite — primero despublica.
 * `deps.updateAmount` es el seam para tests.
 */
export async function changeSubscriptionPlan(
  { userId, plan: targetPlan, config },
  deps = {},
) {
  if (!isHostedPlanId(targetPlan)) throw new HttpError(400, 'Plan inválido')

  const sub = await db.findActiveSubscriptionByUser(userId)
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

  const mock = !config.mpSubs?.accessToken || config.mpMock
  if (!mock && sub.mpPreapprovalId) {
    const update = deps.updateAmount || updatePreapprovalAmount
    const tierMeta = HOSTED_PLANS[targetPlan]
    await update(config.mpSubs.accessToken, sub.mpPreapprovalId, {
      amount: hostedPlanPrice(targetPlan, sub.cycle),
      currencyId: tierMeta.currency_id,
      reason: `ScrollLab LAB — ${tierMeta.tier} (${
        sub.cycle === 'yearly' ? 'anual' : 'mensual'
      })`,
    })
  }

  const previousPlan = sub.plan
  sub.plan = targetPlan
  await sub.save()

  return {
    plan: sub.plan,
    previousPlan,
    quota: targetQuota,
    cycle: sub.cycle,
    // El monto nuevo lo cobra MP recién en el próximo ciclo.
    priceEffectiveAt: sub.currentPeriodEnd || null,
  }
}

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

/**
 * Trae el preapproval de MP y baja su estado a la fila local. Compartido por el
 * webhook y por el sync manual (`POST /api/subscriptions/sync`), que hace lo
 * mismo pero disparado por el usuario — sirve para probar el flujo real de MP
 * sin exponer el webhook con un túnel.
 */
// `deps.fetchPreapproval` es un seam para los tests: en prod usa el SDK de MP,
// en los tests se inyecta un doble sin pegarle a la red.
async function applyPreapprovalState(sub, config, deps = {}) {
  const fetchPre = deps.fetchPreapproval || fetchPreapproval
  const mp = await fetchPre(config.mpSubs.accessToken, sub.mpPreapprovalId)
  const next = mapMpStatus(mp.status)
  if (next) {
    sub.status = next
    const end = mp.next_payment_date || mp?.auto_recurring?.end_date
    if (end) sub.currentPeriodEnd = new Date(end)
    await sub.save()
  }
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
 * `mpPreapprovalId` y no esté cancelada.
 */
export async function syncSubscriptionForUser({ userId, config }, deps) {
  // `findSubscriptionsByUser` ya viene ordenada por createdAt desc (file + mongo).
  const rows = await db.findSubscriptionsByUser(userId)
  const sub = rows.find((s) => s.mpPreapprovalId && s.status !== 'cancelled')
  if (!sub) throw new HttpError(404, 'No hay suscripción para sincronizar')
  return applyPreapprovalState(sub, config, deps)
}

/**
 * Webhook `subscription_authorized_payment`: se cobró (o falló) una cuota de una
 * suscripción. `data.id` es el id del authorized_payment (NO del preapproval),
 * así que lo traemos de MP para saber a qué suscripción pertenece y si se cobró.
 * Si se cobró, extendemos `currentPeriodEnd` — sin esto la renovación no mueve
 * el período y `resolveEntitlement` da de baja a un usuario que sigue pagando.
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

  const approved =
    ap.status === 'processed' || ap?.payment?.status === 'approved'
  if (approved) {
    const now = new Date()
    const base =
      sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now
        ? new Date(sub.currentPeriodEnd)
        : now
    const period = sub.cycle === 'yearly' ? 365 : 31
    base.setDate(base.getDate() + period)
    sub.currentPeriodEnd = base
    if (sub.status !== 'authorized') sub.status = 'authorized'
    await sub.save()
  }
  fireWelcome(sub, config)
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
}

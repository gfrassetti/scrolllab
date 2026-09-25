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
  cancelPreapproval,
} from './mercadoPago.js'
import {
  sendSubscriptionWelcomeOnce,
  sendSubscriptionCanceledOnce,
} from './email.js'

const DAY_MS = 24 * 60 * 60 * 1000
// MP acredita el primer cobro (fin de la prueba) en ~1 h: un día cubre esa
// demora y la del webhook sin estirarle la prueba a una tarjeta que no paga.
const FIRST_CHARGE_GRACE_DAYS = 1

const toMs = (d) => (d ? new Date(d).getTime() : null)
const subId = (sub) => String(db.uid(sub) || sub.id)
const isMock = (config) => !config.mpSubs?.accessToken || !!config.mpMock

/** Mail de bienvenida al activarse — fire-and-forget, idempotente por el claim. */
function fireWelcome(sub, config) {
  if (sub?.status !== 'authorized') return
  sendSubscriptionWelcomeOnce({ subscription: sub, config }).catch((err) =>
    console.error('subs welcome email', err?.message),
  )
}

function fireCanceled(sub, config) {
  if (!sub?.canceledAt) return
  sendSubscriptionCanceledOnce({ subscription: sub, config }).catch((err) =>
    console.error('subs canceled email', err?.message),
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
  pastDue: false,
  graceEndsAt: null,
  paymentFailed: false,
  lapsedPlan: null,
  ...extra,
})

/** Un ciclo de facturación después de `date`: mes calendario o año. */
export function addBillingCycle(date, cycle) {
  const d = new Date(date)
  if (cycle === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() + 1)
    return d
  }
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + 1)
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d
}

/**
 * La prueba es una por usuario: se pierde apenas una suscripción llegó a
 * activarse. Un alta abandonada no cuenta. Filas viejas sin `activatedAt`:
 * cuenta cualquier estado ≠ pending (la regla anterior).
 */
export function trialEligible(rows) {
  return !rows.some(
    (s) => s.activatedAt || (s.status !== 'pending' && !s.abandonedAt),
  )
}

/**
 * Gracia tras `currentPeriodEnd` sin cobro confirmado. Solo para una
 * suscripción viva (ni cancelada ni en pausa: esas no se cobran solas).
 */
function graceMs(sub, config) {
  if (sub.status !== 'authorized' || sub.canceledAt) return 0
  const days = Math.max(0, Number(config.hostedGraceDays) || 0)
  return (
    (sub.lastPaidAt ? days : Math.min(days, FIRST_CHARGE_GRACE_DAYS)) * DAY_MS
  )
}

/**
 * Qué puede hacer un usuario hoy: su plan efectivo y su cuota de instancias
 * publicadas. Sin suscripción vigente → tier "free" con `config.hostedFreeQuota`.
 *
 * - Cancelada o en pausa: sigue con acceso hasta `currentPeriodEnd` (ya pagó
 *   el período). Al vencer una cancelada la cerramos acá (barrido perezoso).
 * - Viva y vencida sin cobro confirmado (webhook demorado o MP reintentando):
 *   sigue con acceso durante la gracia (`pastDue`). Pasada la gracia → free
 *   con `lapsedPlan`; la suscripción sigue abierta en MP y si un reintento
 *   cobra, vuelve sola.
 */
export async function resolveEntitlement(userId, config, { persist = true } = {}) {
  const sub = await db.findActiveSubscriptionByUser(userId)
  if (!sub || !HOSTED_PLANS[sub.plan]) return FREE(config)

  const now = Date.now()
  const end = toMs(sub.currentPeriodEnd)
  const paymentFailed = !!sub.paymentFailedAt
  let graceEndsAt = null

  if (end != null && end <= now) {
    const grace = graceMs(sub, config)
    if (now >= end + grace) {
      if (sub.canceledAt) {
        // `persist:false` desde el path público del embed: no escribimos la
        // fila en cada request anónima (el cierre lo hace el próximo
        // /api/subscriptions/me o assertCanPublish del dueño).
        if (persist && sub.status !== 'cancelled') {
          sub.status = 'cancelled'
          await sub.save()
        }
        return FREE(config)
      }
      return FREE(config, {
        subscriptionStatus: sub.status,
        subscriptionId: subId(sub),
        paymentFailed,
        lapsedPlan: sub.plan,
      })
    }
    graceEndsAt = new Date(end + grace)
  }

  const trialing =
    !!sub.trialEndsAt && toMs(sub.trialEndsAt) > now && !sub.canceledAt

  return {
    plan: sub.plan,
    cycle: sub.cycle,
    quota: hostedPlanQuota(sub.plan),
    subscriptionStatus: sub.status,
    subscriptionId: subId(sub),
    currentPeriodEnd: sub.currentPeriodEnd || null,
    canceledAt: sub.canceledAt || null,
    createdAt: sub.createdAt || null,
    trialEndsAt: sub.trialEndsAt || null,
    trialing,
    pastDue: graceEndsAt != null,
    graceEndsAt,
    paymentFailed,
    lapsedPlan: null,
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
  if (sub?.status === 'paused') {
    throw new HttpError(
      409,
      'Tu suscripción está en pausa en Mercado Pago. Reactivala ahí o cancelala para suscribirte de nuevo.',
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
      'Tenés un cobro pendiente en Mercado Pago. Cuando se acredite, vas a poder cambiar de plan.',
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

  const previousPlan = sub.plan
  let mpUpdated = false
  if (!isMock(config) && sub.mpPreapprovalId) {
    const update = deps.updateAmount || updatePreapprovalAmount
    const tierMeta = HOSTED_PLANS[targetPlan]
    await update(config.mpSubs.accessToken, sub.mpPreapprovalId, {
      amount: hostedPlanPrice(targetPlan, sub.cycle),
      currencyId: tierMeta.currency_id,
      reason: `ScrollLab LAB — ${tierMeta.tier} (${
        sub.cycle === 'yearly' ? 'anual' : 'mensual'
      })`,
    })
    mpUpdated = true
  }

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

function markActivated(sub) {
  sub.status = 'authorized'
  if (!sub.activatedAt) sub.activatedAt = new Date()
  if (sub.abandonedAt) sub.abandonedAt = undefined
}

/**
 * Al activarse una suscripción nueva, las anteriores del usuario que seguían
 * vigentes por días ya pagados (canceladas) se cierran: la nueva cubre ese
 * período (el primer cobro es cuando terminaba la vieja).
 */
async function closeSupersededSubscriptions(sub) {
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
          `preapproval=${other.mpPreapprovalId || '-'} — revisar y dar de baja una`,
      )
    }
  }
}

async function hasOtherActiveSubscription(sub) {
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

  if (approved) {
    warnIfSuspiciousAmount(ap, sub)
    const debit = ap.debit_date ? new Date(ap.debit_date) : new Date()
    const paidThrough = addBillingCycle(debit, sub.cycle)
    if (!sub.currentPeriodEnd || paidThrough > new Date(sub.currentPeriodEnd)) {
      sub.currentPeriodEnd = paidThrough
    }
    if (!sub.lastPaidAt || debit > new Date(sub.lastPaidAt)) sub.lastPaidAt = debit
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
    sub.currentPeriodEnd = addBillingCycle(now, sub.cycle)
  }
  await sub.save()
  await closeSupersededSubscriptions(sub)
  fireWelcome(sub, config)
  return sub
}

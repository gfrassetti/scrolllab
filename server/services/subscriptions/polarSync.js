import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { HOSTED_PLANS, hostedPlanPriceIn } from '../../catalog.js'
import {
  createCheckout,
  buildSubscriptionCheckoutBody,
  resolveLabProduct,
  labPlanOfProduct,
  getSubscription,
  updateSubscription,
  listSubscriptionsByUser,
  customerPortalUrl,
  parsePolarSubscription,
  parsePolarOrder,
  PolarError,
} from '../polar.js'
import { toMs, subId, fireWelcome, fireCanceled, fireCharge, firePaymentFailed } from './billing.js'
import { markActivated, closeSupersededSubscriptions, hasOtherActiveSubscription } from './lifecycle.js'
import { alertAdmin } from '../orders.js'
import { handleLabRefund } from './labRefund.js'

/**
 * LAB cobrado por Polar (USD, ver docs/polar.md): alta, estados de la suscripción,
 * cuotas cobradas o rechazadas, baja, alta abandonada, cambio de plan y devoluciones.
 * Mismas reglas de acceso que con Mercado Pago (entitlement.js no sabe
 * de pasarelas): `currentPeriodEnd` lo extiende solo un cobro, la baja respeta los
 * días pagos y una suscripción nueva cierra la vieja.
 *
 * Cada plan y ciclo es un producto recurrente con su precio de lista. La prueba gratis
 * (o los días ya pagos de una baja) la pone el checkout: `trial_interval: day`.
 * Un cobro es una orden con `subscription_id`: `subscription_create` (el alta sin
 * prueba), `subscription_cycle` (el primer cobro después de la prueba y cada
 * renovación) o `subscription_update` (la diferencia de un cambio de plan).
 *
 * `deps.*` son seams para los tests (en prod, la API de Polar por fetch).
 */

export const isPolarSub = (sub) => sub?.provider === 'polar'

const tierOf = (plan) => HOSTED_PLANS[plan]?.tier || plan
const DAY_MS = 24 * 60 * 60 * 1000

const api = (deps) => ({
  createCheckout: deps.createCheckout || createCheckout,
  resolveLabProduct: deps.resolveLabProduct || resolveLabProduct,
  labPlanOfProduct: deps.labPlanOfProduct || labPlanOfProduct,
  getSubscription: deps.getSubscription || getSubscription,
  updateSubscription: deps.updateSubscription || updateSubscription,
  listSubscriptionsByUser: deps.listSubscriptionsByUser || listSubscriptionsByUser,
  customerPortalUrl: deps.customerPortalUrl || customerPortalUrl,
})

function alertLab({ key, reason, lines, config }) {
  alertAdmin({ kind: 'lab-charge', key: `polar-${key}`, title: `LAB (Polar) ${reason} — revisar`, lines, config })
}

/**
 * Abre el checkout del alta. Con `firstChargeAt` (fin de la prueba o de los días ya
 * pagos) el checkout pone esos días de prueba: guarda la tarjeta sin cobrar.
 * @param {{ sub: any, user: any, firstChargeAt: Date | null, qa?: boolean, locale?: string, config: any }} args
 */
export async function startPolarSubscription({ sub, user, firstChargeAt, qa = false, locale, config }, deps = {}) {
  const p = api(deps)
  const product = await p.resolveLabProduct(config, tierOf(sub.plan), sub.cycle, hostedPlanPriceIn(sub.plan, sub.cycle, 'USD'))
  const trialDays = firstChargeAt ? Math.max(1, Math.ceil((new Date(firstChargeAt).getTime() - Date.now()) / DAY_MS)) : 0
  const checkout = await p.createCheckout(
    config,
    buildSubscriptionCheckoutBody({
      productId: product.id,
      subscriptionId: subId(sub),
      userId: String(sub.userId),
      email: user.email,
      name: user.name,
      successUrl: `${config.clientUrl}/${qa ? 'lab-test' : 'lab'}?suscripcion=volver`,
      trialDays,
      locale,
    }),
  )
  sub.polarCheckoutId = checkout.id
  await sub.save()
  return { init_point: checkout.url }
}

/** Estado de Polar → nuestro enum. `past_due` / `unpaid` siguen vivas: corre la gracia. */
function mapStatus(ps) {
  switch (ps.status) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'unpaid':
      return 'authorized'
    case 'canceled':
      return 'cancelled'
    case 'incomplete_expired':
      return 'expired'
    default:
      return null
  }
}

/** ¿Lo que Polar va a cobrar es el plan que vendimos? (producto del plan y ciclo; sandbox solo para filas de prueba) */
async function mismatch(sub, ps, config, deps) {
  if (config.polar?.testMode && !sub.qa) return 'suscripción del sandbox sobre una fila real'
  const plan = await api(deps).labPlanOfProduct(config, ps.productId).catch(() => null)
  if (!plan) return `producto ${ps.productId || '—'} no es de LAB`
  if (plan.tier !== tierOf(sub.plan) || plan.cycle !== sub.cycle) return `producto ${plan.tier}/${plan.cycle} ≠ ${tierOf(sub.plan)}/${sub.cycle}`
  return null
}

/**
 * Baja el estado de una suscripción de Polar a la fila local. Compartido por los
 * webhooks `subscription.*`, la vuelta del checkout y el sync manual.
 */
export async function applyPolarSubscriptionState(sub, ps, config, deps = {}) {
  const next = mapStatus(ps)
  let activated = false
  let canceledNow = false
  if (ps.id && !sub.polarSubscriptionId) sub.polarSubscriptionId = ps.id
  if (ps.customerId && !sub.polarCustomerId) sub.polarCustomerId = ps.customerId

  if (next === 'cancelled' || next === 'expired') {
    if (sub.status === 'pending') {
      sub.status = 'cancelled'
      if (!sub.abandonedAt) sub.abandonedAt = new Date()
    } else {
      sub.status = 'cancelled'
      if (!sub.canceledAt) {
        sub.canceledAt = new Date()
        canceledNow = true
      }
    }
  } else if (next === 'authorized') {
    if (sub.status !== 'authorized') {
      const wrong = await mismatch(sub, ps, config, deps)
      if (wrong) {
        console.error(`subs POLAR NO COINCIDE CON EL PLAN sub=${subId(sub)} polar=${ps.id}: ${wrong}`)
        alertLab({
          key: `sub-${ps.id}-mismatch`,
          reason: 'NO COINCIDE CON EL PLAN — no se activó, revisar o reembolsar',
          lines: [`suscripción Polar ${ps.id} · fila ${subId(sub)}`, `motivo: ${wrong}`],
          config,
        })
        await sub.save()
        return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
      }
      if ((sub.status === 'cancelled' || sub.abandonedAt) && (await hasOtherActiveSubscription(sub))) {
        alertLab({
          key: `sub-${ps.id}-reemplazada`,
          reason: 'ACTIVA SOBRE UNA SUSCRIPCIÓN REEMPLAZADA — dar de baja una',
          lines: [`suscripción Polar ${ps.id} · fila ${subId(sub)}`],
          config,
        })
        await sub.save()
        return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
      }
      markActivated(sub)
      activated = true
    }
    // Baja pedida en Polar (o desde acá): deja de cobrar, el acceso sigue hasta el fin del período.
    if (ps.cancelAtPeriodEnd && !sub.canceledAt) {
      sub.canceledAt = new Date()
      canceledNow = true
    }
    if (!ps.cancelAtPeriodEnd && sub.canceledAt && sub.status === 'authorized' && !activated) {
      // Reactivada en Polar antes del fin del período.
      sub.canceledAt = undefined
    }
    const periodEnd = ps.status === 'trialing' ? ps.trialEnd || ps.currentPeriodEnd : ps.currentPeriodEnd
    if (!sub.currentPeriodEnd && periodEnd) sub.currentPeriodEnd = periodEnd
    // `trialing` en Polar también cubre los días ya pagados que se arrastran de otra
    // suscripción: no es una prueba gratis. La prueba real la marca el alta (start.js).
    if ((ps.status === 'past_due' || ps.status === 'unpaid') && !sub.paymentFailedAt) sub.paymentFailedAt = new Date()
  }

  await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  if (canceledNow) fireCanceled(sub, config)
  fireWelcome(sub, config)
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
}

/** Una fila nuestra referida por la metadata del checkout, solo si es del mismo usuario y de Polar. */
async function subscriptionFromMetadata(meta) {
  if (meta?.kind !== 'lab' || !meta.subscriptionId) return null
  let sub = null
  try {
    sub = await db.findSubscriptionById(String(meta.subscriptionId))
  } catch (err) {
    if (err?.name !== 'CastError') throw err
  }
  if (!sub || !isPolarSub(sub)) return null
  if (meta.userId && String(sub.userId) !== String(meta.userId)) return null
  return sub
}

/** La fila de una suscripción de Polar: por su id; si es nueva, por la metadata. */
async function findPolarSubscription(polarSubscriptionId, meta) {
  const byId = polarSubscriptionId ? await db.findSubscriptionByPolar(polarSubscriptionId) : null
  if (byId) return byId
  const hinted = await subscriptionFromMetadata(meta)
  if (hinted && (!hinted.polarSubscriptionId || hinted.polarSubscriptionId === String(polarSubscriptionId))) return hinted
  return null
}

/**
 * Webhook `subscription.*`: trae la suscripción de Polar (el estado de ahora, no el del
 * evento: pueden llegar desordenados) y la aplica. `past_due` además manda el mail del
 * cobro rechazado con el link para cambiar la tarjeta.
 */
export async function syncPolarSubscriptionEvent({ type, data, config }, deps = {}) {
  const fromEvent = parsePolarSubscription(data)
  if (!fromEvent.id) return { skipped: 'sin id' }
  const sub = await findPolarSubscription(fromEvent.id, fromEvent.metadata)
  if (!sub) {
    alertLab({
      key: `sub-${fromEvent.id}-sin-fila`,
      reason: 'SIN SUSCRIPCIÓN LOCAL',
      lines: [`suscripción Polar ${fromEvent.id} · ${fromEvent.status} · ${fromEvent.email || '-'}`],
      config,
    })
    return { skipped: 'sin suscripción local' }
  }
  const fresh = await api(deps)
    .getSubscription(config, fromEvent.id)
    .then(parsePolarSubscription)
    .catch(() => fromEvent)
  const ps = fresh.id ? fresh : fromEvent
  const hadFailure = Boolean(sub.paymentFailedAt)
  const out = await applyPolarSubscriptionState(sub, ps, config, deps)
  if ((type === 'subscription.past_due' || ps.status === 'past_due') && !hadFailure && sub.status === 'authorized') {
    const url = ps.customerId ? await api(deps).customerPortalUrl(config, ps.customerId).catch(() => null) : null
    firePaymentFailed(sub, config, { ref: `polar-${ps.id}-${toMs(ps.currentPeriodEnd) || 0}`, updateUrl: url })
  }
  return out
}

/**
 * Una orden de suscripción cobrada (`order.paid` con `subscription_id`): el alta sin
 * prueba, el primer cobro después de la prueba, una renovación o la diferencia de un
 * cambio de plan.
 * @param {{ data: any, config: any }} args
 */
export async function handlePolarLabOrder({ data, config }, deps = {}) {
  const order = parsePolarOrder(data)
  const sub = await findPolarSubscription(order.subscriptionId, order.metadata)
  if (!sub) {
    alertLab({
      key: `ord-${order.id}-sin-fila`,
      reason: 'COBRO SIN SUSCRIPCIÓN — revisar o reembolsar',
      lines: [`orden ${order.id} · ${order.totalCents == null ? '—' : order.totalCents / 100} ${order.currency} · suscripción ${order.subscriptionId}`],
      config,
    })
    return { skipped: 'sin suscripción local' }
  }
  if (!order.paid) return { skipped: `orden ${order.status}` }
  if (config.polar?.testMode && !sub.qa) {
    alertLab({ key: `ord-${order.id}-modo`, reason: 'COBRO DEL SANDBOX SOBRE UNA FILA REAL — no se aplicó', lines: [`orden ${order.id} · fila ${subId(sub)}`], config })
    return { skipped: 'modo distinto' }
  }
  if (order.subscriptionId && !sub.polarSubscriptionId) sub.polarSubscriptionId = order.subscriptionId

  const p = api(deps)
  const ps = order.subscriptionId
    ? await p.getSubscription(config, order.subscriptionId).then(parsePolarSubscription).catch(() => null)
    : null
  // Antes de impuestos: lo que cobramos como precio (el impuesto es del MoR).
  const charged = Number(order.netCents ?? order.subtotalCents ?? 0)
  if (!(charged > 0)) {
    await sub.save()
    return ps ? applyPolarSubscriptionState(sub, ps, config, deps) : { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
  }
  if (order.discountCents) {
    alertLab({ key: `ord-${order.id}-descuento`, reason: 'COBRO CON UN DESCUENTO HECHO EN POLAR', lines: [`orden ${order.id} · fila ${subId(sub)}`], config })
  }
  const paidAt = new Date()

  // La diferencia de un cambio de plan no es una cuota: no mueve el período ni el último
  // cobro (el arrepentimiento la tomaría por una renovación). Se anota aparte.
  if (order.billingReason === 'subscription_update') {
    const list = [...(sub.upgradePayments || [])]
    if (!list.some((x) => x.paymentId === order.id)) {
      list.push({ paymentId: order.id, plan: sub.plan, amount: charged / 100, at: paidAt, outcome: 'applied' })
    }
    sub.upgradePayments = list
    sub.paymentFailedAt = undefined
    await sub.save()
    fireCharge(sub, config, { ref: `polar-${order.id}`, firstCharge: false, amount: charged / 100, currency: order.currency || 'USD', paidAt })
    return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null, approved: true, upgrade: true }
  }

  // El mismo cobro dos veces no regala días ni repite el mail.
  if (sub.lastChargeId === order.id) return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null, approved: true }

  const firstCharge = !sub.lastPaidAt
  let activated = false
  const periodEnd = ps?.currentPeriodEnd || null
  if (periodEnd && (!sub.currentPeriodEnd || periodEnd > new Date(sub.currentPeriodEnd))) sub.currentPeriodEnd = periodEnd
  sub.lastPaidAt = paidAt
  sub.lastChargeId = order.id
  if (firstCharge && !sub.firstPaidAt) {
    sub.firstPaidAt = paidAt
    sub.firstChargeId = order.id
    sub.firstChargeAmount = charged / 100
  }
  if (sub.trialEndsAt && paidAt < new Date(sub.trialEndsAt)) sub.trialEndsAt = paidAt
  sub.paidPlan = sub.plan
  sub.paidCycle = sub.cycle
  sub.paymentFailedAt = undefined
  if (sub.canceledAt && !ps?.cancelAtPeriodEnd && sub.status === 'cancelled') {
    alertLab({ key: `ord-${order.id}-sobre-baja`, reason: 'COBRO SOBRE UNA BAJA — revisar y reembolsar', lines: [`orden ${order.id} · fila ${subId(sub)}`], config })
  }
  if (sub.status !== 'authorized') {
    if ((sub.status === 'cancelled' || sub.abandonedAt) && (await hasOtherActiveSubscription(sub))) {
      alertLab({ key: `ord-${order.id}-reemplazada`, reason: 'COBRO SOBRE UNA SUSCRIPCIÓN REEMPLAZADA — revisar y reembolsar', lines: [`orden ${order.id} · fila ${subId(sub)}`], config })
    } else {
      markActivated(sub)
      activated = true
    }
  }
  await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  fireWelcome(sub, config)
  fireCharge(sub, config, { ref: `polar-${order.id}`, firstCharge, amount: charged / 100, currency: order.currency || 'USD', paidAt })
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null, approved: true }
}

/**
 * Una cuota de LAB devuelta (`order.refunded` / `order.updated` con `refunded_amount`).
 * El primer cobro devuelto da de baja en el momento (handleLabRefund); una diferencia
 * de plan queda marcada; una renovación devuelta a mano se anota y la suscripción sigue.
 */
export async function handlePolarLabRefund({ data, config }) {
  const order = parsePolarOrder(data)
  if (!(order.refundedCents > 0)) return { skipped: 'sin reembolso' }
  const sub = await findPolarSubscription(order.subscriptionId, order.metadata)
  const amount = order.refundedCents / 100
  if (!sub) {
    alertAdmin({
      kind: 'reversed',
      key: `polar-ord-${order.id}-refund`,
      title: 'REEMBOLSO DE LAB EN POLAR — sin suscripción local, revisar',
      lines: [`orden ${order.id} · ${amount} ${order.currency} · suscripción ${order.subscriptionId}`],
      config,
    })
    return { skipped: 'sin suscripción local' }
  }
  const out = await handleLabRefund({
    sub,
    provider: 'polar',
    externalId: `polar-${order.id}-${order.refundedCents}`,
    chargeId: order.id,
    amount,
    currency: order.currency || 'USD',
    partial: order.status !== 'refunded',
    reason: 'refunded',
    config,
  })
  const upgrade = (sub.upgradePayments || []).find((x) => String(x.paymentId) === String(order.id))
  if (upgrade && !upgrade.refundedAt) {
    upgrade.refundedAt = new Date()
    sub.markModified?.('upgradePayments')
    await sub.save()
  }
  return out
}

/** El link del portal de Polar para cambiar la tarjeta (null si no hay). */
export async function polarUpdatePaymentUrl(sub, config, deps = {}) {
  if (!sub?.polarCustomerId) return null
  return api(deps).customerPortalUrl(config, sub.polarCustomerId)
}

/**
 * Sync manual (la vuelta del checkout, sin esperar al webhook): la fila más nueva de
 * Polar que no esté cerrada. Sin suscripción todavía, la busca entre las del usuario
 * en Polar (por `external_customer_id`) con la metadata de esa fila.
 */
export async function syncPolarForUser({ userId, config }, deps = {}) {
  const rows = await db.findSubscriptionsByUser(userId)
  const sub = rows.find((s) => isPolarSub(s) && s.status !== 'cancelled' && !s.abandonedAt)
  if (!sub) throw new HttpError(404, 'No hay suscripción para sincronizar')
  const p = api(deps)
  if (!sub.polarSubscriptionId) {
    const found = await p.listSubscriptionsByUser(config, String(userId)).catch(() => [])
    const mine = found.map(parsePolarSubscription).find((ps) => ps.metadata?.subscriptionId === subId(sub))
    if (mine) return applyPolarSubscriptionState(sub, mine, config, deps)
    return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
  }
  const ps = await p.getSubscription(config, sub.polarSubscriptionId).then(parsePolarSubscription)
  return applyPolarSubscriptionState(sub, ps, config, deps)
}

/**
 * Baja en Polar y confirmación. `immediately`: termina ya (devolución del primer cobro,
 * renovación caída); si no, deja de cobrar al fin del período. Si la llamada falla pero
 * ya está dada de baja, cuenta como éxito; si no, 502.
 */
export async function cancelPolarConfirmed(sub, config, { immediately = false } = {}, deps = {}) {
  if (!sub.polarSubscriptionId) return
  const p = api(deps)
  try {
    await p.updateSubscription(config, sub.polarSubscriptionId, immediately ? { revoke: true } : { cancel_at_period_end: true })
  } catch (err) {
    const ps = await p.getSubscription(config, sub.polarSubscriptionId).then(parsePolarSubscription).catch(() => null)
    if (ps && (ps.status === 'canceled' || (!immediately && ps.cancelAtPeriodEnd))) return
    console.error(`subs cancel FALLÓ en Polar sub=${subId(sub)} polar=${sub.polarSubscriptionId}`, err?.message || err)
    throw new HttpError(502, 'No pudimos dar de baja la suscripción. Probá de nuevo en unos minutos.', { expose: true })
  }
}

/** Alta a medio hacer: si ya tiene suscripción en Polar y se pagó, 'activated'; si no, se retira. */
export async function retirePendingPolar(sub, config, deps = {}) {
  if (sub.polarSubscriptionId) {
    const ps = await api(deps).getSubscription(config, sub.polarSubscriptionId).then(parsePolarSubscription).catch(() => null)
    if (ps) {
      const out = await applyPolarSubscriptionState(sub, ps, config, deps)
      if (out.status === 'authorized' || out.status === 'paused') return 'activated'
    }
  }
  sub.abandonedAt = new Date()
  await sub.save()
  return 'retired'
}

/**
 * Cambio de plan (mismo ciclo): cambia el producto. Subir con días pagos: Polar cobra
 * ya el prorrateo (`invoice`). Bajar, en la prueba o por una diferencia mínima: sin
 * cobro ni crédito (`next_period`): la próxima cuota sale con el precio nuevo.
 * @param {{ sub: any, targetPlan: string, quote: { amount: number }, config: any }} args
 */
export async function changePolarPlan({ sub, targetPlan, quote, config }, deps = {}) {
  const bill = quote.amount > 0
  if (!sub.polarSubscriptionId) throw new HttpError(409, 'La suscripción todavía no está lista. Probá de nuevo en un rato.', { expose: true })
  const p = api(deps)
  const product = await p.resolveLabProduct(config, tierOf(targetPlan), sub.cycle, hostedPlanPriceIn(targetPlan, sub.cycle, 'USD'))
  try {
    await p.updateSubscription(config, sub.polarSubscriptionId, {
      product_id: product.id,
      proration_behavior: bill ? 'invoice' : 'next_period',
    })
  } catch (err) {
    console.error(`subs polar cambio de plan FALLÓ sub=${subId(sub)} polar=${sub.polarSubscriptionId} plan=${targetPlan}`, err?.message || err)
    throw new HttpError(502, 'No pudimos cambiar de plan. Probá de nuevo en unos minutos.', { expose: true })
  }
  return { charged: bill }
}

export { PolarError }

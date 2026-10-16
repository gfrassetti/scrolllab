import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { HOSTED_PLANS, hostedPlanPriceIn } from '../../catalog.js'
import {
  createCheckout,
  buildSubscriptionCheckoutBody,
  resolveLabVariant,
  labPlanOfVariant,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  listSubscriptionsByEmail,
  parseLemonSubscription,
  LemonError,
} from '../lemonsqueezy.js'
import { toMs, subId, fireWelcome, fireCanceled, fireCharge, firePaymentFailed } from './billing.js'
import { markActivated, closeSupersededSubscriptions, hasOtherActiveSubscription } from './lifecycle.js'
import { alertAdmin } from '../orders.js'

/**
 * LAB cobrado por Lemon Squeezy (USD, ver docs/lemonsqueezy.md): alta, estados de la
 * suscripción, cuotas cobradas o rechazadas, baja, alta abandonada y cambio de plan.
 * Las reglas de acceso son las de siempre (entitlement.js no sabe de pasarelas):
 * `currentPeriodEnd` lo extiende solo un cobro, la baja respeta los días pagos y una
 * suscripción nueva cierra la vieja.
 *
 * Cada plan y ciclo es una variante de catálogo de «ScrollLab LAB» con su precio de
 * lista y 7 días de prueba. Sin prueba (no le corresponde) el checkout la saltea; los
 * días ya pagos de una baja se ponen como fin de la prueba (`trial_ends_at`) apenas
 * se crea la suscripción, igual que `start_date` en Mercado Pago.
 *
 * `deps.*` son seams para los tests (en prod, la API de Lemon Squeezy por fetch).
 */

export const isLemonSub = (sub) => sub?.provider === 'lemonsqueezy'

const tierOf = (plan) => HOSTED_PLANS[plan]?.tier || plan
const HOUR_MS = 60 * 60 * 1000

const api = (deps) => ({
  createCheckout: deps.createCheckout || createCheckout,
  resolveLabVariant: deps.resolveLabVariant || resolveLabVariant,
  labPlanOfVariant: deps.labPlanOfVariant || labPlanOfVariant,
  getSubscription: deps.getSubscription || getSubscription,
  updateSubscription: deps.updateSubscription || updateSubscription,
  cancelSubscription: deps.cancelSubscription || cancelSubscription,
  listSubscriptionsByEmail: deps.listSubscriptionsByEmail || listSubscriptionsByEmail,
})

/** Un cobro o una suscripción de LAB que no se pudo asociar a un acceso: aviso (uno por motivo). */
function alertLab({ key, reason, lines, config }) {
  alertAdmin({ kind: 'lab-charge', key: `lemon-${key}`, title: `LAB (Lemon Squeezy) ${reason} — revisar`, lines, config })
}

/**
 * Abre el checkout del alta. `firstChargeAt` (fin de la prueba o de los días ya pagos)
 * necesita que la variante tenga prueba: es lo que guarda la tarjeta sin cobrar.
 * @param {{ sub: any, user: any, firstChargeAt: Date | null, qa?: boolean, config: any }} args
 */
export async function startLemonSubscription({ sub, user, firstChargeAt, qa = false, config }, deps = {}) {
  const p = api(deps)
  const variant = await p.resolveLabVariant(config, tierOf(sub.plan), sub.cycle, hostedPlanPriceIn(sub.plan, sub.cycle, 'USD'))
  if (firstChargeAt && !(variant.trialDays > 0)) {
    throw new LemonError(`La variante de LAB ${variant.tier}/${variant.cycle} no tiene prueba gratis`, { status: 503 })
  }
  const redirectUrl = `${config.clientUrl}/${qa ? 'lab-test' : 'lab'}?suscripcion=volver`
  const checkout = await p.createCheckout(
    config,
    buildSubscriptionCheckoutBody({
      storeId: config.lemon.storeId,
      variantId: variant.id,
      subscriptionId: subId(sub),
      userId: String(sub.userId),
      email: user.email,
      name: user.name,
      redirectUrl,
      skipTrial: !firstChargeAt,
      testMode: config.lemon.testMode,
    }),
  )
  sub.lemonCheckoutId = checkout.id
  await sub.save()
  return { init_point: checkout.url }
}

/** Estado de Lemon Squeezy → nuestro enum. `past_due` / `unpaid` siguen vivas: corre la gracia. */
function mapStatus(status) {
  switch (status) {
    case 'on_trial':
    case 'active':
    case 'past_due':
    case 'unpaid':
      return 'authorized'
    case 'paused':
      return 'paused'
    case 'cancelled':
      return 'cancelled'
    case 'expired':
      return 'expired'
    default:
      return null
  }
}

/**
 * ¿Lo que Lemon Squeezy va a cobrar es el plan que vendimos? Variante del plan y
 * ciclo, y el modo (prueba / real) del servidor; una suscripción de prueba solo
 * vale para una fila de prueba. Se mira al activar: si no coincide no da acceso.
 * @returns {Promise<string | null>} el motivo, o null si coincide
 */
async function mismatch(sub, ls, config, deps) {
  if (ls.testMode !== Boolean(config.lemon?.testMode)) return `modo ${ls.testMode ? 'prueba' : 'real'} distinto del servidor`
  if (ls.testMode && !sub.qa) return 'suscripción de prueba sobre una fila real'
  const v = await api(deps).labPlanOfVariant(config, ls.variantId).catch(() => null)
  if (!v) return `variante ${ls.variantId || '—'} no es de LAB`
  if (v.tier !== tierOf(sub.plan) || v.cycle !== sub.cycle) return `variante ${v.tier}/${v.cycle} ≠ ${tierOf(sub.plan)}/${sub.cycle}`
  return null
}

/**
 * Baja el estado de una suscripción de Lemon Squeezy a la fila local. Compartido por
 * los webhooks `subscription_*`, la vuelta del checkout y el sync manual.
 */
export async function applyLemonSubscriptionState(sub, ls, config, deps = {}) {
  const next = mapStatus(ls.status)
  let activated = false
  let canceledNow = false
  if (ls.id && !sub.lemonSubscriptionId) sub.lemonSubscriptionId = ls.id
  if (ls.customerId && !sub.lemonCustomerId) sub.lemonCustomerId = ls.customerId

  if (next === 'cancelled' || next === 'expired') {
    // `cancelled`: dada de baja, con acceso hasta `ends_at`. `expired`: terminó.
    const paidAhead =
      next === 'cancelled' &&
      (sub.status === 'authorized' || sub.status === 'paused') &&
      Math.max(toMs(sub.currentPeriodEnd) ?? 0, ls.endsAt?.getTime() ?? 0) > Date.now()
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
      const wrong = await mismatch(sub, ls, config, deps)
      if (wrong) {
        console.error(`subs LEMON NO COINCIDE CON EL PLAN sub=${subId(sub)} lemon=${ls.id}: ${wrong}`)
        alertLab({
          key: `sub-${ls.id}-mismatch`,
          reason: 'NO COINCIDE CON EL PLAN — no se activó, revisar o reembolsar',
          lines: [`suscripción Lemon Squeezy ${ls.id} · fila ${subId(sub)}`, `motivo: ${wrong}`],
          config,
        })
        await sub.save()
        return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
      }
      if ((sub.status === 'cancelled' || sub.abandonedAt) && (await hasOtherActiveSubscription(sub))) {
        console.error(`subs LEMON ACTIVA SOBRE SUSCRIPCIÓN REEMPLAZADA sub=${subId(sub)} lemon=${ls.id} — revisar y dar de baja una`)
        alertLab({
          key: `sub-${ls.id}-reemplazada`,
          reason: 'ACTIVA SOBRE UNA SUSCRIPCIÓN REEMPLAZADA — dar de baja una',
          lines: [`suscripción Lemon Squeezy ${ls.id} · fila ${subId(sub)}`],
          config,
        })
        await sub.save()
        return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
      }
      markActivated(sub)
      activated = true
    }
    // Los días ya pagos de una baja (o la prueba que fijamos nosotros): el primer
    // cobro es `firstChargeAt`, no el fin de la prueba de la variante.
    if (ls.status === 'on_trial' && sub.firstChargeAt && !sub.lastPaidAt) {
      const want = new Date(sub.firstChargeAt)
      if (!ls.trialEndsAt || Math.abs(ls.trialEndsAt.getTime() - want.getTime()) > HOUR_MS) {
        try {
          await api(deps).updateSubscription(config, ls.id, { trial_ends_at: want.toISOString() })
          ls = { ...ls, trialEndsAt: want }
        } catch (err) {
          console.error(`subs lemon trial_ends_at FALLÓ sub=${subId(sub)} lemon=${ls.id}`, err?.message)
          alertLab({
            key: `sub-${ls.id}-trial`,
            reason: 'NO SE PUDO FIJAR EL PRIMER COBRO — corregir el fin de la prueba en el panel',
            lines: [`suscripción Lemon Squeezy ${ls.id} · primer cobro debería ser ${want.toISOString()}`],
            config,
          })
        }
      }
    }
    const periodEnd = ls.status === 'on_trial' ? ls.trialEndsAt : ls.renewsAt
    if (!sub.currentPeriodEnd && periodEnd) sub.currentPeriodEnd = periodEnd
    if (ls.status === 'on_trial' && !sub.trialEndsAt && ls.trialEndsAt) sub.trialEndsAt = ls.trialEndsAt
    if ((ls.status === 'past_due' || ls.status === 'unpaid') && !sub.paymentFailedAt) sub.paymentFailedAt = new Date()
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

/** Una fila nuestra referida por los datos del checkout, solo si es del mismo usuario y de Lemon Squeezy. */
async function subscriptionFromCustom(custom) {
  if (custom?.kind !== 'lab' || !custom.subscriptionId) return null
  let sub = null
  try {
    sub = await db.findSubscriptionById(String(custom.subscriptionId))
  } catch (err) {
    if (err?.name !== 'CastError') throw err
  }
  if (!sub || !isLemonSub(sub)) return null
  if (custom.userId && String(sub.userId) !== String(custom.userId)) return null
  // Una fila que ya tiene otra suscripción de Lemon Squeezy no se pisa.
  return sub
}

/** La fila de una suscripción de Lemon Squeezy: por su id; si es nueva, por los datos del checkout. */
async function findLemonSubscription(lemonSubscriptionId, custom) {
  const byId = lemonSubscriptionId ? await db.findSubscriptionByLemon(lemonSubscriptionId) : null
  if (byId) return byId
  const hinted = await subscriptionFromCustom(custom)
  if (hinted && (!hinted.lemonSubscriptionId || hinted.lemonSubscriptionId === String(lemonSubscriptionId))) return hinted
  return null
}

/**
 * Webhook `subscription_*`: trae la suscripción de Lemon Squeezy (el estado de ahora,
 * no el del evento: pueden llegar desordenados) y la aplica. Si la API no responde,
 * usa la del evento.
 * @param {{ data: any, custom?: any, config: any }} args
 */
export async function syncLemonSubscriptionEvent({ data, custom, config }, deps = {}) {
  const fromEvent = parseLemonSubscription(data)
  if (!fromEvent.id) return { skipped: 'sin id' }
  const sub = await findLemonSubscription(fromEvent.id, custom)
  if (!sub) {
    alertLab({
      key: `sub-${fromEvent.id}-sin-fila`,
      reason: 'SIN SUSCRIPCIÓN LOCAL',
      lines: [`suscripción Lemon Squeezy ${fromEvent.id} · ${fromEvent.status} · ${fromEvent.email || '-'}`],
      config,
    })
    return { skipped: 'sin suscripción local' }
  }
  const fresh = await api(deps)
    .getSubscription(config, fromEvent.id)
    .then(parseLemonSubscription)
    .catch(() => fromEvent)
  return applyLemonSubscriptionState(sub, fresh.id ? fresh : fromEvent, config, deps)
}

/**
 * Webhook `subscription_payment_success` / `_recovered`: el cobro del alta, una
 * renovación o la diferencia de un cambio de plan.
 * - Con monto: extiende el período hasta la próxima renovación (valor absoluto: el
 *   mismo evento dos veces no regala días), anota el cobro y limpia el rechazo.
 * - En cero: el estado lo da la suscripción.
 * @param {{ invoice: ReturnType<import('../lemonsqueezy.js').parseLemonInvoice>, custom?: any, config: any }} args
 */
export async function handleLemonLabInvoice({ invoice, custom, config }, deps = {}) {
  const sub = await findLemonSubscription(invoice.subscriptionId, custom)
  if (!sub) {
    console.error(`subs lemon COBRO SIN SUSCRIPCIÓN invoice=${invoice.id} lemonSub=${invoice.subscriptionId} — revisar`)
    alertLab({
      key: `inv-${invoice.id}-sin-fila`,
      reason: 'COBRO SIN SUSCRIPCIÓN — revisar o reembolsar',
      lines: [`factura ${invoice.id} · ${invoice.totalCents == null ? '—' : invoice.totalCents / 100} ${invoice.currency} · suscripción ${invoice.subscriptionId}`],
      config,
    })
    return { skipped: 'sin suscripción local' }
  }
  if (invoice.status !== 'paid') return { skipped: `factura ${invoice.status}` }
  if (invoice.testMode !== Boolean(config.lemon?.testMode) || (invoice.testMode && !sub.qa)) {
    alertLab({
      key: `inv-${invoice.id}-modo`,
      reason: 'COBRO EN OTRO MODO (prueba / real) — no se aplicó',
      lines: [`factura ${invoice.id} · fila ${subId(sub)}`],
      config,
    })
    return { skipped: 'modo distinto' }
  }
  if (invoice.subscriptionId && !sub.lemonSubscriptionId) sub.lemonSubscriptionId = invoice.subscriptionId

  const p = api(deps)
  const ls = invoice.subscriptionId
    ? await p.getSubscription(config, invoice.subscriptionId).then(parseLemonSubscription).catch(() => null)
    : null
  const charged = Number(invoice.totalCents || 0)
  if (!(charged > 0)) {
    await sub.save()
    return ls ? applyLemonSubscriptionState(sub, ls, config, deps) : { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
  }
  if (invoice.discountCents) {
    alertLab({
      key: `inv-${invoice.id}-descuento`,
      reason: 'COBRO CON UN DESCUENTO HECHO EN LEMON SQUEEZY',
      lines: [`factura ${invoice.id} · fila ${subId(sub)}`],
      config,
    })
  }
  const firstCharge = !sub.lastPaidAt
  let activated = false
  const periodEnd = ls?.renewsAt || null
  if (periodEnd && (!sub.currentPeriodEnd || periodEnd > new Date(sub.currentPeriodEnd))) sub.currentPeriodEnd = periodEnd
  const paidAt = invoice.createdAt
  if (!sub.lastPaidAt || paidAt > new Date(sub.lastPaidAt)) sub.lastPaidAt = paidAt
  // El primer cobro (el único que se puede devolver por arrepentimiento): la factura
  // queda anotada para poder reembolsarla por la API.
  if (firstCharge && !sub.firstPaidAt) {
    sub.firstPaidAt = paidAt
    sub.firstChargeId = invoice.id
    sub.firstChargeAmount = charged / 100
  }
  if (sub.trialEndsAt && paidAt < new Date(sub.trialEndsAt)) sub.trialEndsAt = paidAt
  sub.paidPlan = sub.plan
  sub.paidCycle = sub.cycle
  sub.paymentFailedAt = undefined
  if (sub.canceledAt && invoice.billingReason !== 'updated') {
    console.error(`subs lemon COBRO SOBRE BAJA sub=${subId(sub)} invoice=${invoice.id} — revisar y reembolsar`)
    alertLab({
      key: `inv-${invoice.id}-sobre-baja`,
      reason: 'COBRO SOBRE UNA BAJA — revisar y reembolsar',
      lines: [`factura ${invoice.id} · fila ${subId(sub)}`],
      config,
    })
  }
  if (sub.status !== 'authorized') {
    if ((sub.status === 'cancelled' || sub.abandonedAt) && (await hasOtherActiveSubscription(sub))) {
      alertLab({
        key: `inv-${invoice.id}-reemplazada`,
        reason: 'COBRO SOBRE UNA SUSCRIPCIÓN REEMPLAZADA — revisar y reembolsar',
        lines: [`factura ${invoice.id} · fila ${subId(sub)}`],
        config,
      })
    } else {
      markActivated(sub)
      activated = true
    }
  }
  await sub.save()
  if (activated) await closeSupersededSubscriptions(sub)
  fireWelcome(sub, config)
  fireCharge(sub, config, {
    ref: `lemon-${invoice.id}`,
    firstCharge,
    amount: charged / 100,
    currency: invoice.currency || 'USD',
    paidAt,
  })
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null, approved: true }
}

/**
 * Webhook `subscription_payment_failed`.
 * - En el alta (fila `pending`): se anota (el barrido manda el mail si no se pagó).
 * - En una renovación: `paymentFailedAt` y mail ya, con el link para cambiar la
 *   tarjeta. Lemon Squeezy reintenta; un cobro posterior lo limpia.
 */
export async function handleLemonLabPaymentFailed({ invoice, custom, config }, deps = {}) {
  const sub = await findLemonSubscription(invoice.subscriptionId, custom)
  if (!sub) return { skipped: 'sin suscripción local' }
  if (sub.status === 'pending') {
    sub.paymentFailedAt = new Date()
    await sub.save()
    return { failed: true, stage: 'checkout' }
  }
  if (!sub.paymentFailedAt) sub.paymentFailedAt = new Date()
  await sub.save()
  const ls = await api(deps)
    .getSubscription(config, invoice.subscriptionId)
    .then(parseLemonSubscription)
    .catch(() => null)
  firePaymentFailed(sub, config, { ref: `lemon-${invoice.id}`, updateUrl: ls?.updatePaymentUrl || null })
  return { failed: true, stage: 'renewal' }
}

/** El link firmado para cambiar la tarjeta (null si no hay). */
export async function lemonUpdatePaymentUrl(sub, config, deps = {}) {
  if (!sub?.lemonSubscriptionId) return null
  const ls = await api(deps).getSubscription(config, sub.lemonSubscriptionId).then(parseLemonSubscription)
  return ls.updatePaymentUrl
}

/**
 * Sync manual (la vuelta del checkout, sin esperar al webhook): la fila más nueva de
 * Lemon Squeezy que no esté cerrada. Sin suscripción todavía, la busca por el mail
 * del usuario (la más nueva creada después del alta, de un plan de LAB).
 */
export async function syncLemonForUser({ userId, email, config }, deps = {}) {
  const rows = await db.findSubscriptionsByUser(userId)
  const sub = rows.find((s) => isLemonSub(s) && s.status !== 'cancelled' && !s.abandonedAt)
  if (!sub) throw new HttpError(404, 'No hay suscripción para sincronizar')
  const p = api(deps)
  if (!sub.lemonSubscriptionId && email) {
    const since = toMs(sub.createdAt) ?? 0
    const found = await p.listSubscriptionsByEmail(config, email).catch(() => [])
    const candidates = []
    for (const raw of found) {
      const ls = parseLemonSubscription(raw)
      const created = toMs(raw?.attributes?.created_at) ?? 0
      if (created + 5 * 60 * 1000 < since) continue
      if (await db.findSubscriptionByLemon(ls.id)) continue
      candidates.push({ ls, created })
    }
    candidates.sort((a, b) => b.created - a.created)
    if (candidates[0]) return applyLemonSubscriptionState(sub, candidates[0].ls, config, deps)
  }
  if (!sub.lemonSubscriptionId) return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd || null }
  const ls = await p.getSubscription(config, sub.lemonSubscriptionId).then(parseLemonSubscription)
  return applyLemonSubscriptionState(sub, ls, config, deps)
}

/**
 * Da de baja en Lemon Squeezy y confirma (deja de cobrar; el acceso sigue hasta el fin
 * del período). Si la llamada falla pero ya está cancelada, cuenta como éxito. Si no,
 * 502: una baja local que Lemon Squeezy no hizo seguiría cobrando.
 */
export async function cancelLemonConfirmed(sub, config, deps = {}) {
  if (!sub.lemonSubscriptionId) return
  const p = api(deps)
  try {
    await p.cancelSubscription(config, sub.lemonSubscriptionId)
  } catch (err) {
    const ls = await p.getSubscription(config, sub.lemonSubscriptionId).then(parseLemonSubscription).catch(() => null)
    if (ls && (ls.cancelled || ls.status === 'cancelled' || ls.status === 'expired')) return
    console.error(`subs cancel FALLÓ en Lemon Squeezy sub=${subId(sub)} lemon=${sub.lemonSubscriptionId}`, err?.message || err)
    throw new HttpError(502, 'No pudimos dar de baja la suscripción. Probá de nuevo en unos minutos.', { expose: true })
  }
}

/**
 * Alta a medio hacer: si ya tiene suscripción en Lemon Squeezy, se mira (si se pagó,
 * 'activated'); si no, la fila se retira. Un checkout viejo que se pague después lo
 * ordena el webhook (avisa si choca con otra suscripción).
 */
export async function retirePendingLemon(sub, config, deps = {}) {
  if (sub.lemonSubscriptionId) {
    const ls = await api(deps).getSubscription(config, sub.lemonSubscriptionId).then(parseLemonSubscription).catch(() => null)
    if (ls) {
      const out = await applyLemonSubscriptionState(sub, ls, config, deps)
      if (out.status === 'authorized' || out.status === 'paused') return 'activated'
    }
  }
  sub.abandonedAt = new Date()
  await sub.save()
  return 'retired'
}

/**
 * Cambio de plan (mismo ciclo): cambia la variante. Subir con días pagos: Lemon
 * Squeezy cobra ya el prorrateo (`invoice_immediately`), que es la misma diferencia
 * que cotizamos (precio nuevo − el de ahora, por lo que queda del período). Bajar,
 * en la prueba o por una diferencia mínima: sin cobro (`disable_prorations`), la
 * próxima cuota sale con el precio nuevo.
 * @param {{ sub: any, targetPlan: string, quote: { amount: number }, config: any }} args
 */
export async function changeLemonPlan({ sub, targetPlan, quote, config }, deps = {}) {
  const bill = quote.amount > 0
  if (!sub.lemonSubscriptionId) throw new HttpError(409, 'La suscripción todavía no está lista. Probá de nuevo en un rato.', { expose: true })
  const p = api(deps)
  const variant = await p.resolveLabVariant(config, tierOf(targetPlan), sub.cycle, hostedPlanPriceIn(targetPlan, sub.cycle, 'USD'))
  try {
    await p.updateSubscription(config, sub.lemonSubscriptionId, {
      variant_id: Number(variant.id),
      ...(bill ? { invoice_immediately: true } : { disable_prorations: true }),
    })
  } catch (err) {
    console.error(`subs lemon cambio de plan FALLÓ sub=${subId(sub)} lemon=${sub.lemonSubscriptionId} plan=${targetPlan}`, err?.message || err)
    throw new HttpError(502, 'No pudimos cambiar de plan. Probá de nuevo en unos minutos.', { expose: true })
  }
  return { charged: bill }
}

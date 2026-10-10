import { db } from '../../db.js'
import { HttpError } from '../../errors.js'
import { HOSTED_PLANS, isHostedPlanId, subscriptionPlanPrice } from '../../catalog.js'
import { assertQaBuyer } from '../../qa.js'
import { createPreapproval, billingFrequency } from '../mercadoPago.js'
import { paddleClientInfo } from '../paddle.js'
import { isMock, trialEligible } from './billing.js'
import { isHigherPlan } from './planChange.js'
import { retirePendingSubscription, closeLapsedSubscription } from './mpSync.js'
import {
  isPaddleSub,
  startPaddleSubscription,
  cancelPaddleConfirmed,
  retirePendingPaddle,
} from './paddleSync.js'

/**
 * @typedef {Object} StartedSubscription
 * @property {string} subscriptionId
 * @property {string | null} trialEndsAt ISO
 * @property {string | null} firstChargeAt ISO
 * @property {string} [init_point] Mercado Pago: a dónde manda el comprador
 * @property {'paddle'} [provider] Paddle (y su mock)
 * @property {string} [transactionId] Paddle: la transacción que abre el overlay
 * @property {string} [customerEmail] Paddle
 * @property {{ environment: string, clientToken: string }} [paddle] Paddle.js
 * @property {boolean} [mock] Atajo de desarrollo: sin pasarela real
 */

/**
 * Altas a medio hacer y renovaciones caídas, cada una con su pasarela.
 */
const retirePending = (sub, config) =>
  isPaddleSub(sub) ? retirePendingPaddle(sub, config) : retirePendingSubscription(sub, config)

async function closeLapsed(sub, config) {
  if (isPaddleSub(sub)) {
    await cancelPaddleConfirmed(sub, config, { immediately: true })
    sub.canceledAt = new Date()
    sub.status = 'cancelled'
    await sub.save()
    return
  }
  await closeLapsedSubscription(sub, config)
}

/**
 * Caso de uso: dar de alta una suscripción de LAB (con prueba gratis si
 * corresponde) y abrir el cobro en la pasarela elegida.
 *
 * Una sola suscripción vigente: si ya canceló (le quedan días pagos) o la
 * renovación se cayó, puede abrir otra y la nueva reemplaza. Las altas a medio
 * hacer se retiran antes de abrir otra, y si la pasarela no puede iniciar el
 * cobro la fila se borra para que no bloquee el próximo intento.
 *
 * Devuelve lo que responde `POST /api/subscriptions`, salvo `activateUrl`, que
 * es una ruta HTTP y la agrega el router cuando `mock` es true:
 *  - `mercadopago`: `{ subscriptionId, trialEndsAt, firstChargeAt, init_point }`.
 *  - `paddle`: `{ …, provider: 'paddle', transactionId, customerEmail, paddle }`.
 *  - mock de dev (de la pasarela elegida): `{ …, [provider], mock: true }`.
 * `qa`: la suscripción de prueba (src/domain/qa.js) — solo cuentas de
 * QA_BUYER_EMAILS, solo Mercado Pago y a QA_LAB_PRICES_ARS; sin prueba gratis
 * salvo `qaTrial` (para probar la baja en la prueba).
 * @param {{ user: any, plan: string, cycle: 'monthly' | 'yearly', provider?: 'mercadopago' | 'paddle', locale: 'es' | 'en', qa?: boolean, qaTrial?: boolean, config: any }} args
 * @returns {Promise<StartedSubscription>}
 */
export async function startSubscription({
  user,
  plan,
  cycle,
  provider = 'mercadopago',
  locale,
  qa = false,
  qaTrial = false,
  config,
}) {
  if (!isHostedPlanId(plan)) throw new HttpError(400, 'Plan inválido')
  const paddle = provider === 'paddle'
  if (qa) {
    assertQaBuyer(user, config, 'Plan inválido')
    if (paddle) {
      throw new HttpError(400, 'La suscripción de prueba se cobra solo con Mercado Pago', { expose: true })
    }
  }
  if (paddle && !config.paddle?.enabled) {
    throw new HttpError(400, 'El pago internacional no está disponible', { expose: true })
  }

  const userId = db.uid(user)
  const now = Date.now()

  const current = await db.findActiveSubscriptionByUser(userId)
  const currentEnd = current?.currentPeriodEnd
    ? new Date(current.currentPeriodEnd).getTime()
    : null
  const currentLapsed = currentEnd != null && currentEnd <= now
  if (current && !current.canceledAt && !currentLapsed) {
    throw new HttpError(409, 'Ya tenés una suscripción activa', {
      expose: true,
    })
  }
  // Re-suscripción con días pagos: el primer cobro de la nueva es cuando
  // terminan, y lo pagado viaja a la nueva (con eso se cotiza una subida
  // antes de ese cobro). Un plan MÁS CARO no puede arrancar sobre días
  // pagados con uno más barato: sería la cuota nueva sin pagar la
  // diferencia. Para subir ya: reactivar y cambiar de plan.
  const carryOver =
    current?.canceledAt && currentEnd != null && currentEnd > now
      ? new Date(currentEnd)
      : null
  const carriedPaidPlan = carryOver
    ? current.paidPlan || (current.lastPaidAt ? current.plan : null)
    : null
  if (carriedPaidPlan && isHigherPlan(plan, carriedPaidPlan)) {
    throw new HttpError(
      409,
      'Tu plan actual está pago hasta el fin del período. Para subir ya, reactivalo y cambiá de plan: pagás solo la diferencia por los días que quedan.',
      { expose: true },
    )
  }

  // Altas a medio hacer: se dan de baja en la pasarela antes de abrir otra (un
  // checkout viejo abierto no puede terminar en un segundo cobro). Si una
  // se había completado sin que nos enteráramos, se activa y listo.
  const priorSubs = await db.findSubscriptionsByUser(userId)
  for (const s of priorSubs) {
    if (s.status !== 'pending' || s.abandonedAt) continue
    if ((await retirePending(s, config)) === 'activated') {
      throw new HttpError(409, 'Ya tenés una suscripción activa', {
        expose: true,
      })
    }
  }
  if (current && !current.canceledAt && currentLapsed) {
    await closeLapsed(current, config)
  }

  // Prueba gratis solo si nunca tuvo una suscripción activa (cancelar y
  // volver NO la reabre). Los días ya pagados de una suscripción cancelada
  // se respetan: el primer cobro de la nueva es cuando termina la vieja.
  const trialDays = qa
    ? qaTrial ? config.hostedTrialDays : 0
    : trialEligible(priorSubs) ? config.hostedTrialDays : 0
  const trialEndsAt =
    trialDays > 0 ? new Date(now + trialDays * 24 * 60 * 60 * 1000) : null
  const firstChargeAt = trialEndsAt || carryOver

  const sub = await db.createSubscription({
    userId,
    plan,
    cycle,
    status: 'pending',
    provider: paddle ? 'paddle' : 'mercadopago',
    currency_id: paddle ? 'USD' : 'ARS',
    locale,
    ...(qa ? { qa: true } : {}),
    ...(trialEndsAt ? { trialEndsAt } : {}),
    ...(firstChargeAt ? { firstChargeAt } : {}),
    ...(carriedPaidPlan
      ? {
          paidPlan: carriedPaidPlan,
          paidCycle: current.paidCycle || current.cycle,
        }
      : {}),
  })
  const subscriptionId = db.uid(sub) || sub.id
  const out = {
    subscriptionId,
    trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
    firstChargeAt: firstChargeAt ? firstChargeAt.toISOString() : null,
  }

  if (paddle ? Boolean(config.paddle.mock) : isMock(config)) {
    return {
      ...out,
      ...(paddle ? { provider: 'paddle' } : {}),
      mock: true,
    }
  }

  if (paddle) {
    let started
    try {
      started = await startPaddleSubscription({ sub, user, firstChargeAt, config })
    } catch (err) {
      // Sin transacción en Paddle no hay nada que pagar: la fila no puede
      // bloquear el próximo intento.
      await db.deleteSubscription(subscriptionId)
      console.error(`subs alta FALLÓ en Paddle user=${userId}`, err?.message || err)
      throw new HttpError(
        502,
        'No pudimos iniciar la suscripción internacional. Probá de nuevo en unos minutos.',
        { expose: true },
      )
    }
    return {
      ...out,
      provider: 'paddle',
      transactionId: started.transactionId,
      customerEmail: started.email,
      paddle: paddleClientInfo(config),
    }
  }

  const plof = HOSTED_PLANS[plan]
  let pre
  try {
    pre = await createPreapproval({
      accessToken: config.mpSubs.accessToken,
      reason: `ScrollLab LAB${qa ? ' PRUEBA' : ''} — ${plof.tier} (${cycle === 'yearly' ? 'anual' : 'mensual'})`,
      amount: subscriptionPlanPrice(sub, plan, cycle, 'ARS'),
      currencyId: plof.currency_id,
      ...billingFrequency(cycle),
      payerEmail: user.email,
      externalReference: subscriptionId,
      // `?suscripcion=volver`: la UI sincroniza sola al volver de MP.
      backUrl: `${config.clientUrl}/${qa ? 'lab-test' : 'lab'}?suscripcion=volver`,
      startDate: firstChargeAt,
    })
  } catch (err) {
    // Sin preapproval en MP no hay nada que completar: la fila no puede
    // bloquear el próximo intento.
    await db.deleteSubscription(subscriptionId)
    console.error(
      `subs alta FALLÓ en MP user=${userId}`,
      err?.message || JSON.stringify(err)?.slice(0, 300),
    )
    throw new HttpError(
      502,
      'No pudimos iniciar la suscripción en Mercado Pago. Probá de nuevo en unos minutos.',
      { expose: true },
    )
  }
  sub.mpPreapprovalId = String(pre.id)
  await sub.save()
  return { ...out, init_point: pre.init_point }
}

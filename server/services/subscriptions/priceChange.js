import { db } from '../../db.js'
import {
  HOSTED_PRICE_CHANGES,
  PRICE_NOTICE_DAYS,
  affectedBy,
  applyDecision,
  priceChangeKind,
} from '../../../src/domain/priceChanges.js'
import { sendSubscriptionPriceChange } from '../email.js'
import { fetchPreapproval, updatePreapprovalAmount } from '../mercadoPago.js'
import { alertAdmin } from '../orders.js'
import { addBillingCycle, isMock, subId } from './billing.js'

/**
 * Cambios de precio de LAB para los que ya están suscriptos (reglas en
 * src/domain/priceChanges.js; avisos en el repo priceChangeNotices). Corre en
 * el barrido de pagos (paymentFailedSweep.runSweeps), en tres pasos:
 *
 *  1. Inscribir: por cada cambio declarado (el último de cada cadena
 *     plan/ciclo/moneda), las suscripciones que pagan otro monto según el
 *     PROVEEDOR (no la lista) quedan con su aviso (`ensurePriceChangeNotice`).
 *  2. Avisar: el mail sale con la fecha del primer cobro con el precio nuevo,
 *     calculada desde la fecha REAL del próximo cobro del proveedor (suba: el
 *     primero ≥ 15 días después de ahora; baja: el próximo). La fecha se fija
 *     cuando el mail sale (`claimPriceChangeEmail`).
 *  3. Aplicar: después del último cobro a precio viejo (`applyDecision`), el
 *     monto nuevo va al proveedor y el aviso queda aplicado (una sola vez; el
 *     repo no deja aplicar un aviso cuyo mail no salió).
 *
 * Seguro por defecto:
 * - Simulación salvo `PRICE_CHANGES_LIVE=1` (o `config.priceChanges.live`):
 *   cuenta a quién inscribiría, avisaría y aplicaría, sin escribir, mandar ni
 *   tocar el proveedor. Una lista vacía no hace nada.
 * - Tope de mails por barrido (`maxEmails`, 50).
 * - Solo Mercado Pago. Paddle queda esperando (decisión del dueño, 2026-10-12:
 *   hasta que se apruebe la revisión de Paddle no se toca su flujo; tampoco
 *   está el monto recurrente guardado en la fila, el paso (0) del plan).
 * - Un resumen al dueño cuando algo pasó (alertAdmin, una vez por corrida).
 * Pendiente: el recordatorio del anual (falta el claim en el repo).
 */

const DAY = 86400000

/** Margen para aplicar: lo que esté por cobrarse en estos días entra en esta corrida. */
export const PRICE_APPLY_WINDOW_DAYS = 3

const isLive = (config) => config.priceChanges?.live ?? process.env.PRICE_CHANGES_LIVE === '1'

/** El último cambio de cada cadena plan/ciclo/moneda: el que rige hoy. */
export function currentChanges(changes) {
  const last = new Map()
  for (const c of changes) last.set(`${c.plan}|${c.cycle}|${c.currency}`, c)
  return [...last.values()]
}

/**
 * Lo que el proveedor le cobra hoy a la suscripción y la fecha real del próximo
 * cobro. `skip` explica por qué no se puede saber (y entonces no se toca).
 */
async function providerState(sub, config, deps) {
  if (sub.provider === 'paddle') return { skip: 'paddle-pendiente' }
  if (!sub.mpPreapprovalId) return { skip: 'sin-preapproval' }
  const fetch = deps.fetchPreapproval || (isMock(config) ? null : fetchPreapproval)
  if (!fetch) return { skip: 'mp-simulado' }
  const pa = await fetch(config.mpSubs?.accessToken, sub.mpPreapprovalId)
  const amount = Number(pa?.auto_recurring?.transaction_amount)
  const next = pa?.next_payment_date ? new Date(pa.next_payment_date) : null
  return { amount: Number.isFinite(amount) ? amount : null, nextChargeAt: next && Number.isFinite(next.getTime()) ? next : null }
}

/**
 * La fecha del primer cobro con el precio nuevo, desde el próximo cobro real:
 * suba, el primero que cae a PRICE_NOTICE_DAYS o más de ahora; baja, el próximo.
 */
export function effectiveDateFor(change, nextChargeAt, cycle, now) {
  if (!nextChargeAt) return null
  let d = new Date(nextChargeAt)
  if (priceChangeKind(change) === 'decrease') return d
  const earliest = now.getTime() + PRICE_NOTICE_DAYS * DAY
  for (let i = 0; i < 36 && d.getTime() < earliest; i++) d = addBillingCycle(d, cycle)
  return d
}

const bump = (o, k) => {
  o[k] = (o[k] || 0) + 1
}

/**
 * @param {{ config: any, client?: any, now?: Date, changes?: ReadonlyArray<any>, deps?: any, maxEmails?: number }} args
 */
export async function runPriceChanges({
  config,
  client,
  now = new Date(),
  changes = HOSTED_PRICE_CHANGES,
  deps = {},
  maxEmails = 50,
}) {
  const live = isLive(config)
  const summary = { mode: live ? 'live' : 'simulación', enrolled: 0, announced: 0, applied: 0, waiting: 0, skipped: {}, errors: 0 }
  const active = currentChanges(changes)
  if (!active.length) return summary
  const byId = new Map(changes.map((c) => [c.id, c]))

  // 1. Inscribir.
  for (const sub of await db.listSubscriptions()) {
    const change = active.find((c) => c.plan === sub.plan && c.cycle === sub.cycle && c.currency === (sub.currency_id || 'ARS'))
    if (!change || sub.qa || sub.canceledAt) continue
    try {
      if (live && (await db.findPriceChangeNotice(subId(sub), change.id))) continue
      const state = await providerState(sub, config, deps)
      if (state.skip) {
        bump(summary.skipped, state.skip)
        continue
      }
      if (!affectedBy(change, sub, state.amount)) continue
      if (live) {
        const { created } = await db.ensurePriceChangeNotice({
          subscriptionId: subId(sub),
          changeId: change.id,
          plan: change.plan,
          cycle: change.cycle,
          currency: change.currency,
          from: state.amount,
          to: change.to,
        })
        if (created) summary.enrolled += 1
      } else {
        summary.enrolled += 1
      }
    } catch (err) {
      summary.errors += 1
      console.error('price-change enroll', subId(sub), err?.message)
    }
  }
  if (!live) return report(summary, config)

  // 2. Avisar.
  let sent = 0
  for (const notice of await db.listPriceChangeNoticesToAnnounce({ limit: maxEmails })) {
    if (sent >= maxEmails) break
    const change = byId.get(notice.changeId)
    const sub = await db.findSubscriptionById(notice.subscriptionId).catch(() => null)
    try {
      if (!change || !sub || sub.canceledAt || sub.plan !== notice.plan || sub.cycle !== notice.cycle) {
        await db.skipPriceChangeNotice(notice.id, !change ? 'el cambio ya no está en la lista' : 'la suscripción cambió de plan o se canceló')
        bump(summary.skipped, 'descartado')
        continue
      }
      const state = await providerState(sub, config, deps)
      if (state.skip) {
        bump(summary.skipped, state.skip)
        continue
      }
      if (!affectedBy(change, sub, state.amount)) {
        await db.skipPriceChangeNotice(notice.id, `ya paga ${state.amount}`)
        bump(summary.skipped, 'ya-paga')
        continue
      }
      const effectiveAt = effectiveDateFor(change, state.nextChargeAt, sub.cycle, now)
      if (!effectiveAt) {
        summary.waiting += 1
        continue
      }
      const claimed = await db.claimPriceChangeEmail(notice.id, { effectiveAt })
      if (!claimed) continue
      const user = await db.findUserById(String(sub.userId))
      if (!user?.email) {
        await db.releasePriceChangeEmail(notice.id, 'el usuario no tiene email')
        continue
      }
      try {
        const out = await (deps.send || sendSubscriptionPriceChange)({
          subscription: sub,
          user,
          ref: notice.id,
          notice: { kind: priceChangeKind(change), from: notice.from, to: notice.to, effectiveAt },
          config,
          client,
        })
        if (out?.skipped) {
          // Con el mail apagado no hay aviso, y sin aviso no hay precio nuevo.
          await db.releasePriceChangeEmail(notice.id, `mail ${out.skipped}`)
          continue
        }
        await db.completePriceChangeEmail(notice.id, out?.id || null)
        summary.announced += 1
        sent += 1
      } catch (err) {
        await db.releasePriceChangeEmail(notice.id, String(err?.message || err).slice(0, 200))
        summary.errors += 1
      }
    } catch (err) {
      summary.errors += 1
      console.error('price-change announce', notice.id, err?.message)
    }
  }

  // 3. Aplicar.
  const before = new Date(now.getTime() + PRICE_APPLY_WINDOW_DAYS * DAY)
  for (const notice of await db.listPriceChangeNoticesDue({ before })) {
    const change = byId.get(notice.changeId)
    const sub = await db.findSubscriptionById(notice.subscriptionId).catch(() => null)
    try {
      if (!change || !sub || sub.canceledAt) {
        await db.skipPriceChangeNotice(notice.id, 'la suscripción se canceló o el cambio ya no está')
        bump(summary.skipped, 'descartado')
        continue
      }
      const state = await providerState(sub, config, deps)
      if (state.skip) {
        bump(summary.skipped, state.skip)
        continue
      }
      const decision = applyDecision({ change, emailSentAt: notice.emailSentAt, nextChargeAt: state.nextChargeAt, appliedAt: notice.appliedAt })
      if (decision !== 'apply') {
        summary.waiting += 1
        continue
      }
      await (deps.updateAmount || updatePreapprovalAmount)(config.mpSubs?.accessToken, sub.mpPreapprovalId, {
        amount: change.to,
        currencyId: change.currency,
      })
      if (await db.markPriceChangeApplied(notice.id)) summary.applied += 1
    } catch (err) {
      summary.errors += 1
      console.error('price-change apply', notice.id, err?.message)
    }
  }
  return report(summary, config)
}

/** Un resumen al dueño cuando algo pasó (una vez por corrida y por contenido). */
function report(summary, config) {
  const happened = summary.enrolled || summary.announced || summary.applied || summary.errors
  if (happened) {
    const lines = [
      `Modo: ${summary.mode}`,
      `Inscriptas: ${summary.enrolled} · avisadas: ${summary.announced} · aplicadas: ${summary.applied} · esperando: ${summary.waiting} · errores: ${summary.errors}`,
      `Salteadas: ${Object.entries(summary.skipped).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}`,
    ]
    try {
      alertAdmin({
        kind: 'price-change',
        key: `price-change-${summary.mode}-${summary.enrolled}-${summary.announced}-${summary.applied}-${summary.errors}`,
        title: `LAB — cambio de precio (${summary.mode})`,
        lines,
        config,
      })
    } catch {
      /* el resumen nunca frena el barrido */
    }
  }
  return summary
}

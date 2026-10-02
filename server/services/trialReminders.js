import { db } from '../db.js'
import { sendSubscriptionTrialReminderOnce } from './email.js'

const DAY_MS = 86_400_000
const HOUR_MS = 60 * 60 * 1000

/**
 * Avisa por mail, unos días antes del primer cobro, a quien está en la prueba
 * gratis de LAB: cuándo se cobra, cuánto, y que cancelando antes no paga nada.
 *
 * Cada pasada busca las pruebas que terminan dentro de `hostedTrialReminderDays`
 * y le manda el mail a cada una una sola vez: el claim en la base evita
 * duplicados aunque haya dos instancias del server o se reinicie en el medio.
 * Si Resend falla, el claim se suelta y la próxima pasada lo reintenta.
 */
export async function sendDueTrialReminders({ config, client, now = new Date() }) {
  const days = config.hostedTrialReminderDays
  if (!config.email?.enabled || !(days > 0)) {
    return { skipped: 'disabled', checked: 0, sent: 0, failed: 0 }
  }

  const withinMs = days * DAY_MS
  const due = await db.listTrialReminderCandidates({ now, withinMs })
  let sent = 0
  let failed = 0
  for (const subscription of due) {
    // Una prueba que dura lo mismo que el aviso (o menos) no lo necesita: el
    // mail de bienvenida, que sale al activarse, ya trae la fecha del cobro.
    const trialMs =
      new Date(subscription.trialEndsAt) - new Date(subscription.createdAt)
    if (!(trialMs > withinMs)) continue
    try {
      const out = await sendSubscriptionTrialReminderOnce({
        subscription,
        config,
        client,
        withinMs,
        now,
      })
      if (out.sent) sent += 1
    } catch (err) {
      failed += 1
      console.error('subs trial reminder', err?.message)
    }
  }
  return { checked: due.length, sent, failed }
}

/**
 * Corre `sendDueTrialReminders` cada hora dentro del proceso de la API (arranca
 * 30 s después de levantar). No arranca si el mail está apagado o el aviso está
 * en 0 días. Devuelve `stop()` para el shutdown; los timers no mantienen vivo el
 * proceso. `run`, `intervalMs` e `initialDelayMs` existen para los tests.
 */
export function startTrialReminders({
  config,
  intervalMs = HOUR_MS,
  initialDelayMs = 30_000,
  run = sendDueTrialReminders,
}) {
  if (!config.email?.enabled || !(config.hostedTrialReminderDays > 0)) {
    return () => {}
  }

  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      await run({ config })
    } catch (err) {
      console.error('trial reminders', err?.message)
    } finally {
      busy = false
    }
  }

  const first = setTimeout(tick, initialDelayMs)
  const timer = setInterval(tick, intervalMs)
  first.unref()
  timer.unref()
  return () => {
    clearTimeout(first)
    clearInterval(timer)
  }
}

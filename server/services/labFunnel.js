/**
 * Embudo de LAB para /admin: de la visita a /lab al cobro, y el estado de las
 * suscripciones. Función pura sobre lo que ya se guarda (eventos anónimos de
 * página, widgets y suscripciones): no agrega tracking nuevo.
 *
 * Cada paso cuenta personas distintas dentro de la ventana (`since`):
 *  1. visitantes de /lab (navegador anónimo, `vid`)
 *  2. cuentas que crearon un widget
 *  3. cuentas que publicaron uno
 *  4. cuentas que empezaron la prueba (suscripción autorizada con prueba)
 *  5. cuentas con un primer cobro
 * Visitantes y cuentas no se pueden cruzar (el tracking es anónimo): el paso 1
 * es una referencia de tráfico, no el denominador exacto del 2.
 */

const DAY = 86400000

const t = (d) => (d ? new Date(d).getTime() : NaN)
const inWindow = (d, since) => t(d) >= since
const idOf = (v) => (v == null ? '' : String(v))

/**
 * @param {{ events?: any[], hosted?: any[], subscriptions?: any[], since: Date, now?: Date }} input
 */
export function buildLabFunnel({ events = [], hosted = [], subscriptions = [], since, now = new Date() }) {
  const from = since.getTime()
  const at = now.getTime()

  const labVisitors = new Set(
    events
      .filter((e) => e.type === 'view' && /^\/lab(\/|$)/.test(String(e.path || '')) && inWindow(e.createdAt, from))
      .map((e) => e.vid),
  )

  const created = hosted.filter((h) => inWindow(h.createdAt, from))
  const publishedNow = hosted.filter((h) => h.status === 'published')
  const publishedInWindow = hosted.filter((h) => h.publishedAt && inWindow(h.publishedAt, from))

  const usersCreated = new Set(created.map((h) => idOf(h.userId)))
  const usersPublished = new Set(publishedInWindow.map((h) => idOf(h.userId)))

  const trials = subscriptions.filter((s) => s.trialEndsAt && s.activatedAt && inWindow(s.activatedAt, from))
  const firstCharges = subscriptions.filter((s) => s.firstPaidAt && inWindow(s.firstPaidAt, from))
  const cancels = subscriptions.filter((s) => s.canceledAt && inWindow(s.canceledAt, from))

  const active = subscriptions.filter((s) => s.status === 'authorized' && t(s.currentPeriodEnd) > at)
  const inTrial = active.filter((s) => t(s.trialEndsAt) > at && !s.firstPaidAt)
  const paying = active.filter((s) => !inTrial.includes(s))

  const byPlan = {}
  for (const s of paying) {
    const key = `${String(s.plan || '').replace('hosted_', '')} · ${s.cycle === 'yearly' ? 'anual' : 'mensual'}`
    byPlan[key] = (byPlan[key] || 0) + 1
  }

  const sectionCount = new Map()
  for (const h of publishedNow) sectionCount.set(h.sectionId, (sectionCount.get(h.sectionId) || 0) + 1)
  const topSections = [...sectionCount.entries()]
    .map(([sectionId, count]) => ({ sectionId, count }))
    .sort((a, b) => b.count - a.count || a.sectionId.localeCompare(b.sectionId))
    .slice(0, 10)

  const funnel = [
    { step: 'Visitaron /lab', count: labVisitors.size, unit: 'visitantes' },
    { step: 'Crearon un widget', count: usersCreated.size, unit: 'cuentas' },
    { step: 'Publicaron', count: usersPublished.size, unit: 'cuentas' },
    { step: 'Empezaron la prueba', count: new Set(trials.map((s) => idOf(s.userId))).size, unit: 'cuentas' },
    { step: 'Pagaron', count: new Set(firstCharges.map((s) => idOf(s.userId))).size, unit: 'cuentas' },
  ]
  // % respecto del paso anterior (desde el 2: el 1 es tráfico anónimo).
  for (let i = 2; i < funnel.length; i += 1) {
    const prev = funnel[i - 1].count
    funnel[i].pctOfPrev = prev ? Math.round((100 * funnel[i].count) / prev) : null
  }

  return {
    funnel,
    widgets: {
      createdInWindow: created.length,
      publishedNow: publishedNow.length,
      embedViews: publishedNow.reduce((n, h) => n + (Number(h.views) || 0), 0),
      topSections,
    },
    subscriptions: {
      inTrial: inTrial.length,
      paying: paying.length,
      byPlan,
      cancelledInWindow: cancels.length,
      // Pruebas que terminan en los próximos 7 días: las que hay que mirar.
      trialsEndingSoon: inTrial.filter((s) => t(s.trialEndsAt) - at <= 7 * DAY).length,
    },
  }
}

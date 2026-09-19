/**
 * Resumen de leads por canal: cuántos mails trajo cada uno y cuántos cupones se
 * canjearon. Los que llegaron sin utm_source cuentan como "directo".
 */
export function summarizeLeads(leads) {
  const group = (keyOf) => {
    const rows = new Map()
    for (const lead of leads) {
      const key = keyOf(lead)
      const row = rows.get(key) || { key, leads: 0, redeemed: 0 }
      row.leads += 1
      if (lead.couponRedeemedAt) row.redeemed += 1
      rows.set(key, row)
    }
    return [...rows.values()].sort(
      (a, b) => b.leads - a.leads || b.redeemed - a.redeemed || a.key.localeCompare(b.key),
    )
  }
  const redeemed = leads.filter((lead) => lead.couponRedeemedAt).length
  return {
    total: leads.length,
    redeemed,
    redeemRate: leads.length ? redeemed / leads.length : 0,
    byChannel: group((lead) => lead.utmSource || 'directo'),
    byCampaign: group((lead) => lead.utmCampaign || '—'),
  }
}

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1).replace('.', ',')}%` : '—')

/** Texto para la terminal (`npm run leads:stats`). */
export function formatSummary(summary) {
  const table = (title, rows) => [
    '',
    title,
    ...(rows.length
      ? rows.map(
          (r) =>
            `  ${r.key.padEnd(18)} ${String(r.leads).padStart(4)} mails  ${String(r.redeemed).padStart(3)} cupones canjeados  ${pct(r.redeemed, r.leads).padStart(6)}`,
        )
      : ['  (todavía no hay)']),
  ]
  return [
    `Mails: ${summary.total} · cupones canjeados: ${summary.redeemed} (${pct(summary.redeemed, summary.total)})`,
    ...table('Por canal (utm_source)', summary.byChannel),
    ...table('Por campaña (utm_campaign)', summary.byCampaign),
  ].join('\n')
}

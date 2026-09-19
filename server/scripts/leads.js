/**
 * Leads del formulario de novedades (POST /api/leads).
 *
 *   npm run leads:export > leads.csv   CSV por stdout, para importar en cualquier herramienta
 *   npm run leads:sync                 sube a Brevo los que todavía no están sincronizados
 *
 * Usa la misma base que el server (STORE / MONGODB_URI) y BREVO_API_KEY /
 * BREVO_LIST_ID. Sirve para el día que se configure Brevo: los mails que se
 * juntaron antes suben de una.
 */
import '../loadEnv.js'
import { loadConfig } from '../config.js'
import { connectDb, db } from '../db.js'
import { crmEnabled, syncLeadSafely } from '../services/crm.js'
import { formatSummary, summarizeLeads } from '../services/leadStats.js'

const command = process.argv[2]
if (!['export', 'sync', 'stats'].includes(command)) {
  console.error('Uso: node server/scripts/leads.js <export|sync|stats>')
  process.exit(1)
}

const config = loadConfig()

// connectDb avisa por stdout; el CSV tiene que salir limpio.
const log = console.log
console.log = console.error
await connectDb(config)
console.log = log

const csvCell = (value) => {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
const iso = (date) => (date ? new Date(date).toISOString() : '')

try {
  if (command === 'export') {
    const leads = await db.listLeads()
    console.log(
      'email,source,utmSource,utmMedium,utmCampaign,locale,consentAt,createdAt,couponCode,couponExpiresAt,couponRedeemedAt,crmSyncedAt',
    )
    for (const lead of leads) {
      console.log(
        [
          lead.email,
          lead.source,
          lead.utmSource,
          lead.utmMedium,
          lead.utmCampaign,
          lead.locale,
          iso(lead.consentAt),
          iso(lead.createdAt),
          lead.couponCode,
          iso(lead.couponExpiresAt),
          iso(lead.couponRedeemedAt),
          iso(lead.crmSyncedAt),
        ]
          .map(csvCell)
          .join(','),
      )
    }
    console.error(`${leads.length} leads`)
  } else if (command === 'stats') {
    console.log(formatSummary(summarizeLeads(await db.listLeads())))
  } else if (!crmEnabled(config)) {
    console.error('Falta BREVO_API_KEY: no hay a dónde sincronizar.')
    process.exitCode = 1
  } else {
    const pending = await db.listLeads({ unsyncedOnly: true })
    let synced = 0
    for (const lead of pending) {
      const out = await syncLeadSafely({ lead, config })
      if (out.synced) synced += 1
    }
    const failed = pending.length - synced
    console.log(
      `Sincronizados ${synced} de ${pending.length}${failed ? ` — ${failed} con error (ver crmError)` : ''}`,
    )
    if (failed) process.exitCode = 1
  }
} finally {
  await db.disconnect()
}

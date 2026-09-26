/**
 * CRM de marketing (Brevo). La lista de leads vive en nuestra base; Brevo es una
 * copia para mandar campañas. Sin BREVO_API_KEY no hace nada: los leads quedan
 * guardados y `npm run leads:sync` los sube cuando se configure.
 * Docs: https://developers.brevo.com/reference/createcontact
 */
const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts'

export function crmEnabled(config) {
  return Boolean(config?.crm?.brevoApiKey)
}

/**
 * Sube un lead a Brevo. `updateEnabled` hace idempotente el reintento (un
 * contacto que ya existe se actualiza en vez de dar 400). No mandamos
 * `attributes`: los custom tienen que existir de antemano en la cuenta.
 */
export async function syncLeadToCrm({
  lead,
  config,
  fetchImpl = globalThis.fetch,
  timeoutMs = 5000,
}) {
  if (!crmEnabled(config)) return { synced: false, skipped: true }

  const body = { email: lead.email, updateEnabled: true }
  if (config.crm.brevoListId) body.listIds = [config.crm.brevoListId]

  const res = await fetchImpl(BREVO_CONTACTS_URL, {
    method: 'POST',
    headers: {
      'api-key': config.crm.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (res.ok) return { synced: true }

  let detail = ''
  try {
    detail = (await res.json())?.message || ''
  } catch {
    /* sin cuerpo JSON */
  }
  throw new Error(`Brevo ${res.status}${detail ? `: ${detail}` : ''}`)
}

/**
 * Sync + registro del resultado en el lead. Nunca tira: un fallo del CRM no
 * puede perder el alta, que ya está guardada.
 */
export async function syncLeadSafely({ lead, config, fetchImpl }) {
  try {
    const out = await syncLeadToCrm({ lead, config, fetchImpl })
    if (out.synced) {
      lead.crmSyncedAt = new Date()
      lead.crmError = undefined
      await lead.save()
    }
    return out
  } catch (err) {
    console.error('Lead CRM sync failed', err.message)
    lead.crmError = String(err.message).slice(0, 200)
    try {
      await lead.save()
    } catch (saveErr) {
      console.error('Lead save failed', saveErr)
    }
    return { synced: false, error: true }
  }
}

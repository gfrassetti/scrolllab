import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

import { normalizeLeadEmail, cleanUtm } from '../validation.js'
import { crmEnabled, syncLeadToCrm } from '../services/crm.js'

describe('validación de leads', () => {
  it('normaliza el email: minúsculas y sin espacios en los bordes', () => {
    assert.equal(normalizeLeadEmail('  Ana@Estudio.COM '), 'ana@estudio.com')
  })

  it('rechaza lo que no tiene forma de mail', () => {
    for (const bad of ['', 'ana', 'ana@estudio', 'a b@c.com', '<x>@y.com', 'ana@y.c', null, undefined]) {
      assert.throws(() => normalizeLeadEmail(bad), (err) => err.status === 400, String(bad))
    }
  })

  it('limita el largo', () => {
    assert.throws(() => normalizeLeadEmail(`${'a'.repeat(120)}@estudio.com`), (err) => err.status === 400)
  })

  it('cleanUtm deja slugs cortos y descarta el resto', () => {
    assert.deepEqual(cleanUtm({ source: 'Instagram', medium: 'reels', campaign: 'Nocturne!!' }), {
      utmSource: 'instagram',
      utmMedium: 'reels',
      utmCampaign: 'nocturne',
    })
    assert.deepEqual(cleanUtm({ source: 'x', medium: '', campaign: '   ' }), { utmSource: 'x' })
    assert.deepEqual(cleanUtm({ source: 'a'.repeat(80) }), { utmSource: 'a'.repeat(32) })
    assert.deepEqual(cleanUtm({ source: 'Mail de prueba' }), { utmSource: 'mail-de-prueba' })
  })

  it('cleanUtm ignora lo que no es un objeto de textos', () => {
    for (const junk of [null, undefined, 'instagram', 42, ['instagram'], { source: { a: 1 } }, { source: 5 }]) {
      assert.deepEqual(cleanUtm(junk), {}, JSON.stringify(junk))
    }
  })
})

describe('syncLeadToCrm (Brevo)', () => {
  const lead = { email: 'ana@estudio.com' }

  it('sin API key no llama a nadie', async () => {
    let called = false
    const out = await syncLeadToCrm({
      lead,
      config: { crm: { brevoApiKey: '' } },
      fetchImpl: async () => {
        called = true
      },
    })
    assert.deepEqual(out, { synced: false, skipped: true })
    assert.equal(called, false)
    assert.equal(crmEnabled({ crm: { brevoApiKey: '' } }), false)
  })

  it('arma el request de Brevo: api-key, updateEnabled y lista', async () => {
    let seen
    const out = await syncLeadToCrm({
      lead,
      config: { crm: { brevoApiKey: 'k_123', brevoListId: 7 } },
      fetchImpl: async (url, init) => {
        seen = { url, init }
        return { ok: true, status: 201 }
      },
    })
    assert.equal(out.synced, true)
    assert.equal(seen.url, 'https://api.brevo.com/v3/contacts')
    assert.equal(seen.init.method, 'POST')
    assert.equal(seen.init.headers['api-key'], 'k_123')
    assert.deepEqual(JSON.parse(seen.init.body), {
      email: 'ana@estudio.com',
      updateEnabled: true,
      listIds: [7],
    })
  })

  it('sin lista configurada no manda listIds', async () => {
    let body
    await syncLeadToCrm({
      lead,
      config: { crm: { brevoApiKey: 'k', brevoListId: null } },
      fetchImpl: async (_url, init) => {
        body = JSON.parse(init.body)
        return { ok: true, status: 204 }
      },
    })
    assert.equal('listIds' in body, false)
  })

  it('un no-2xx tira con el mensaje de Brevo', async () => {
    await assert.rejects(
      () =>
        syncLeadToCrm({
          lead,
          config: { crm: { brevoApiKey: 'k' } },
          fetchImpl: async () => ({
            ok: false,
            status: 400,
            json: async () => ({ message: 'Invalid email' }),
          }),
        }),
      /Brevo 400: Invalid email/,
    )
  })
})

describe('leads (file store)', () => {
  // El alta por HTTP es `POST /api/coupons/welcome` y se prueba en coupons.test.js
  // (necesita sesión). Acá solo la base: alta idempotente y lista para el CRM.
  let dir
  let dbDir
  let db

  const leadsFile = () => path.join(dbDir, 'leads.json')

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-leads-'))
    dbDir = path.join(dir, 'db')
    process.env.STORAGE_DIR = dir
    process.env.FILE_DB_DIR = dbDir
    db = (await import('../db.js')).db
  })

  after(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  beforeEach(() => {
    fs.rmSync(leadsFile(), { force: true })
  })

  it('upsertLead guarda el mail en minúsculas, con origen, idioma y fecha, y avisa que es el primer alta', async () => {
    const { lead, created } = await db.upsertLead({ email: 'Ana@Estudio.COM', source: 'account', locale: 'en' })
    assert.equal(created, true)
    assert.equal(lead.email, 'ana@estudio.com')
    assert.equal(lead.source, 'account')
    assert.equal(lead.locale, 'en')
    assert.ok(lead.consentAt)
  })

  it('el mismo mail dos veces devuelve la misma fila, sin duplicar', async () => {
    const first = await db.upsertLead({ email: 'ana@estudio.com', source: 'account' })
    const again = await db.upsertLead({ email: 'ANA@estudio.com', source: 'home' })
    assert.equal(again.created, false)
    assert.equal(again.lead.id, first.lead.id)
    assert.equal(again.lead.source, 'account')
    assert.equal((await db.listLeads()).length, 1)
  })

  it('listLeads({ unsyncedOnly }) devuelve solo los que faltan subir al CRM', async () => {
    await db.upsertLead({ email: 'uno@estudio.com' })
    await db.upsertLead({ email: 'dos@estudio.com' })
    const all = await db.listLeads()
    const first = all.find((l) => l.email === 'uno@estudio.com')
    first.crmSyncedAt = new Date()
    await first.save()

    const pending = await db.listLeads({ unsyncedOnly: true })
    assert.deepEqual(pending.map((l) => l.email), ['dos@estudio.com'])
  })
})

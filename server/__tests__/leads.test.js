import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

import { normalizeLeadEmail, cleanLeadSource, cleanUtm } from '../validation.js'
import { crmEnabled, syncLeadToCrm } from '../services/crm.js'

const ORIGIN = 'http://localhost:5173'

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

  it('cleanLeadSource acepta slugs cortos y cae en home', () => {
    assert.equal(cleanLeadSource('Builder'), 'builder')
    assert.equal(cleanLeadSource('lab-footer'), 'lab-footer')
    assert.equal(cleanLeadSource('<script>'), 'home')
    assert.equal(cleanLeadSource('x'.repeat(40)), 'home')
    assert.equal(cleanLeadSource(undefined), 'home')
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

describe('POST /api/leads (file store)', () => {
  let app
  let config
  let dir
  let dbDir
  let realFetch
  let db

  const leadsFile = () => path.join(dbDir, 'leads.json')
  const rows = () =>
    fs.existsSync(leadsFile()) ? JSON.parse(fs.readFileSync(leadsFile(), 'utf8')) : []
  const post = (body) => request(app).post('/api/leads').set('Origin', ORIGIN).send(body)

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.CLIENT_URL = ORIGIN
    process.env.API_PUBLIC_URL = 'http://localhost:8787'
    process.env.FX_OFFLINE = 'true'
    process.env.RATE_LIMIT_DISABLED = 'true'
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-leads-'))
    dbDir = path.join(dir, 'db')
    process.env.STORAGE_DIR = dir
    process.env.FILE_DB_DIR = dbDir

    const { loadConfig } = await import('../config.js')
    config = loadConfig()
    config.storageDir = dir
    config.store = 'file'

    const { createApp } = await import('../app.js')
    app = await createApp(config)
    db = (await import('../db.js')).db
    realFetch = globalThis.fetch
  })

  after(() => {
    globalThis.fetch = realFetch
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  beforeEach(() => {
    fs.rmSync(leadsFile(), { force: true })
    config.crm = { brevoApiKey: '', brevoListId: null }
    globalThis.fetch = realFetch
  })

  it('guarda el lead con mail normalizado, origen, idioma y consentimiento', async () => {
    const res = await post({ email: '  Ana@Estudio.COM ', source: 'builder', locale: 'en' })
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)
    assert.match(res.body.coupon.code, /^SL-[A-Z2-9]{6}$/)

    const [lead] = rows()
    assert.equal(rows().length, 1)
    assert.equal(lead.email, 'ana@estudio.com')
    assert.equal(lead.source, 'builder')
    assert.equal(lead.locale, 'en')
    assert.ok(lead.consentAt)
  })

  it('el mismo mail dos veces responde igual y queda una sola fila', async () => {
    const first = await post({ email: 'ana@estudio.com' })
    const again = await post({ email: 'ANA@estudio.com' })
    assert.equal(again.status, first.status)
    assert.deepEqual(again.body, first.body)
    assert.equal(rows().length, 1)
  })

  it('rechaza un mail inválido con 400 y no guarda nada', async () => {
    const res = await post({ email: 'no-es-un-mail' })
    assert.equal(res.status, 400)
    assert.equal(rows().length, 0)
  })

  it('honeypot: un bot que completa `website` recibe ok y no se guarda', async () => {
    const res = await post({ email: 'bot@spam.com', website: 'https://spam.example' })
    assert.equal(res.status, 200)
    assert.equal(rows().length, 0)
  })

  it('un source raro cae en home y el idioma en es', async () => {
    await post({ email: 'ana@estudio.com', source: '<script>', locale: 'fr' })
    assert.equal(rows()[0].source, 'home')
    assert.equal(rows()[0].locale, 'es')
  })

  it('guarda de qué canal llegó (utm), saneado', async () => {
    await post({
      email: 'canal@estudio.com',
      utm: { source: 'Instagram', medium: 'reels', campaign: 'Nocturne!!' },
    })
    const [lead] = rows()
    assert.equal(lead.utmSource, 'instagram')
    assert.equal(lead.utmMedium, 'reels')
    assert.equal(lead.utmCampaign, 'nocturne')
  })

  it('un utm mal formado no rompe el alta ni deja basura', async () => {
    const res = await post({ email: 'raro@estudio.com', utm: 'instagram' })
    assert.equal(res.status, 200)
    const [lead] = rows()
    assert.equal(lead.utmSource, undefined)
    assert.equal('utmMedium' in lead, false)
  })

  it('la primera visita gana: volver a anotarse desde otro canal no pisa el original', async () => {
    await post({ email: 'primero@estudio.com', utm: { source: 'tiktok' } })
    await post({ email: 'primero@estudio.com', utm: { source: 'reddit' } })
    assert.equal(rows().length, 1)
    assert.equal(rows()[0].utmSource, 'tiktok')
  })

  it('rechaza Origin ajeno', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Origin', 'https://evil.example')
      .send({ email: 'ana@estudio.com' })
    assert.equal(res.status, 403)
    assert.equal(rows().length, 0)
  })

  it('sin key de CRM guarda sin llamar a Brevo', async () => {
    globalThis.fetch = async () => {
      throw new Error('no debería llamar al CRM sin key')
    }
    const res = await post({ email: 'ana@estudio.com' })
    assert.equal(res.status, 200)
    assert.equal(rows()[0].crmSyncedAt, undefined)
  })

  it('con key de CRM sincroniza una vez y no repite si ya está sincronizado', async () => {
    config.crm = { brevoApiKey: 'k_123', brevoListId: 9 }
    const calls = []
    globalThis.fetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) })
      return { ok: true, status: 201 }
    }
    await post({ email: 'ana@estudio.com' })
    await post({ email: 'ana@estudio.com' })

    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].body, { email: 'ana@estudio.com', updateEnabled: true, listIds: [9] })
    assert.ok(rows()[0].crmSyncedAt)
  })

  it('si el CRM falla el alta igual queda guardada, y se reintenta al volver a anotarse', async () => {
    config.crm = { brevoApiKey: 'k_123', brevoListId: null }
    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'boom' }),
    })
    const failed = await post({ email: 'ana@estudio.com' })
    assert.equal(failed.status, 200)
    assert.match(rows()[0].crmError, /Brevo 400: boom/)
    assert.equal(rows()[0].crmSyncedAt, undefined)

    globalThis.fetch = async () => ({ ok: true, status: 201 })
    await post({ email: 'ana@estudio.com' })
    assert.ok(rows()[0].crmSyncedAt)
    assert.equal(rows()[0].crmError, undefined)
  })

  it('listLeads({ unsyncedOnly }) devuelve solo los que faltan subir al CRM', async () => {
    await post({ email: 'uno@estudio.com' })
    await post({ email: 'dos@estudio.com' })
    const all = await db.listLeads()
    const first = all.find((l) => l.email === 'uno@estudio.com')
    first.crmSyncedAt = new Date()
    await first.save()

    const pending = await db.listLeads({ unsyncedOnly: true })
    assert.deepEqual(pending.map((l) => l.email), ['dos@estudio.com'])
  })
})

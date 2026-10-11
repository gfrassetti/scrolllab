import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

import { cleanLabFormMessage, LAB_FORM_SECTIONS } from '../../src/domain/labForms.js'
import { HOSTABLE_SECTIONS } from '../sections.js'

// Los mails (y lo que importan: db.js) se cargan después de apuntar
// STORE/FILE_DB_DIR a una carpeta temporal: un import de arriba abría la base
// de desarrollo (storage/db) antes y los tests le escribían widgets.
let buildLabFormMessage

// Base y almacenamiento en una carpeta temporal ANTES de cualquier import que
// abra db.js (los de arriba son puros; los demás van con import() más abajo).
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-lab-forms-'))
Object.assign(process.env, {
  NODE_ENV: 'development',
  STORE: 'file',
  AUTH_DEV_ENABLED: 'true',
  MP_MOCK_ENABLED: 'true',
  SESSION_SECRET: 'test-session-secret-min-24-chars',
  DOWNLOAD_SECRET: 'test-download-secret-min-24-chars',
  CLIENT_URL: 'http://localhost:5173',
  API_PUBLIC_URL: 'http://localhost:8787',
  FX_OFFLINE: 'true',
  FX_FALLBACK_RATE: '1560',
  HOSTED_FREE_QUOTA: '50',
  RATE_LIMIT_DISABLED: 'true',
  STORAGE_DIR: storageDir,
  FILE_DB_DIR: path.join(storageDir, 'db'),
})

describe('cleanLabFormMessage', () => {
  it('etiqueta las claves fijas, deja las extra con su etiqueta y saca lo que no es respuesta', () => {
    const out = cleanLabFormMessage({
      formType: 'quote',
      name: '  Ana ',
      email: 'ana@example.com',
      budget: 'Más de $1.000',
      'Presupuesto aprobado': 'Sí',
      message: 'Hola\r\nquiero un sitio',
      website_hp: '',
      vacío: '   ',
      raro: { a: 1 },
    })
    assert.equal(out.formType, 'quote')
    assert.equal(out.replyTo, 'ana@example.com')
    assert.deepEqual(out.fields, [
      ['Nombre', 'Ana'],
      ['Email', 'ana@example.com'],
      ['Presupuesto', 'Más de $1.000'],
      ['Presupuesto aprobado', 'Sí'],
      ['Mensaje', 'Hola\nquiero un sitio'],
    ])
  })

  it('en inglés usa las etiquetas en inglés', () => {
    const out = cleanLabFormMessage({ name: 'Ann', message: 'Hi there, a site' }, 'en')
    assert.deepEqual(out.fields.map(([k]) => k), ['Name', 'Message'])
  })

  it('el campo trampa lleno es spam; vacío, mal formado o enorme no se manda', () => {
    assert.deepEqual(cleanLabFormMessage({ name: 'Bot', website_hp: 'http://x' }), { spam: true })
    assert.equal(cleanLabFormMessage({}), null)
    assert.equal(cleanLabFormMessage({ name: '  ' }), null)
    assert.equal(cleanLabFormMessage([]), null)
    assert.equal(cleanLabFormMessage('hola'), null)
    assert.equal(cleanLabFormMessage({ message: 'x'.repeat(5001) }), null)
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`c${i}`, 'v']))
    assert.equal(cleanLabFormMessage(many), null)
  })

  it('un email inválido no es reply-to; un tipo desconocido es contacto', () => {
    const out = cleanLabFormMessage({ formType: 'hack', email: 'no-es-mail', message: 'Hola, una consulta' })
    assert.equal(out.replyTo, null)
    assert.equal(out.formType, 'contact')
  })
})

describe('buildLabFormMessage', () => {
  before(async () => {
    ;({ buildLabFormMessage } = await import('../services/emailTemplatesLab.js'))
  })

  const message = {
    formType: 'quote',
    replyTo: 'ana@example.com',
    fields: [
      ['Nombre', 'Ana <b>'],
      ['Mensaje', 'Línea uno\nLínea dos <script>alert(1)</script>'],
    ],
  }

  it('asunto por tipo y dominio, reply al visitante, texto escapado', () => {
    const m = buildLabFormMessage({ message, host: 'cliente.com', locale: 'es', labUrl: 'https://x/lab/1', logoUrl: 'https://x/l.svg' })
    assert.equal(m.subject, 'Pedido de presupuesto desde cliente.com')
    assert.match(m.html, /Te escribió Ana &lt;b&gt;/)
    assert.match(m.html, /le contestás directo a ana@example\.com/)
    assert.ok(!m.html.includes('<script>'), 'el mensaje sale escapado')
    assert.match(m.html, /white-space:pre-wrap;">Línea uno\nLínea dos/)
    assert.match(m.text, /Mensaje:\nLínea uno\nLínea dos/)
  })

  it('en inglés, y sin email del visitante lo dice', () => {
    const m = buildLabFormMessage({
      message: { formType: 'newsletter', replyTo: null, fields: [['Email', 'nope']] },
      host: null,
      locale: 'en',
      labUrl: 'https://x/lab/1',
      logoUrl: 'https://x/l.svg',
    })
    assert.equal(m.subject, 'New subscriber from your site')
    assert.match(m.text, /They left no email/)
  })
})

describe('Formularios de LAB (API)', () => {
  let app
  let config

  before(async () => {
    const { loadConfig } = await import('../config.js')
    config = loadConfig()
    config.storageDir = storageDir
    config.store = 'file'
    config.authDev = true
    config.mpMock = true
    const { createApp } = await import('../app.js')
    app = await createApp(config)
  })

  after(() => {
    fs.rmSync(storageDir, { recursive: true, force: true })
  })

  async function publish(sectionId, props = {}, domains = []) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email: 'duena@test.com', name: 'Dueña' })
    const created = await agent.post('/api/hosted').send({ sectionId })
    assert.equal(created.status, 201)
    const { id } = created.body.instance
    const res = await agent.put(`/api/hosted/${id}`).send({ draftProps: props, domains, publish: true })
    assert.equal(res.status, 200)
    return res.body.instance
  }

  it('los tres formularios del catálogo son widgets de LAB', () => {
    for (const id of LAB_FORM_SECTIONS) assert.ok(HOSTABLE_SECTIONS.includes(id), id)
  })

  it('LAB no guarda un endpoint propio: el envío lo pone el frame', async () => {
    const inst = await publish('contact/ContactForm', { endpoint: 'https://otro.com/x', title: 'Escribinos' })
    assert.equal(inst.publishedProps.title, 'Escribinos')
    assert.equal(inst.publishedProps.endpoint, undefined)
  })

  it('el preflight desde cualquier origen pasa; el POST desde el frame entrega', async () => {
    const inst = await publish('contact/ContactForm')
    const pre = await request(app)
      .options(`/api/embed/${inst.key}/form`)
      .set('Origin', 'https://embed.scrolllab.com.ar')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
    assert.equal(pre.status, 204)
    assert.equal(pre.headers['access-control-allow-origin'], '*')

    const res = await request(app)
      .post(`/api/embed/${inst.key}/form?host=cliente.com`)
      .set('Origin', 'https://embed.scrolllab.com.ar')
      .send({ formType: 'contact', name: 'Ana', email: 'ana@example.com', message: 'Hola, quiero un sitio.' })
    assert.equal(res.status, 200)
    assert.equal(res.headers['access-control-allow-origin'], '*')
    // En los tests el mail está apagado: sale bien pero sin entregar.
    assert.deepEqual(res.body, { ok: true, delivered: false })
  })

  it('un widget que no es formulario, un borrador o un dominio no autorizado no reciben', async () => {
    const footer = await publish('chapters/FooterCTA')
    const notForm = await request(app).post(`/api/embed/${footer.key}/form`).send({ name: 'Ana' })
    assert.equal(notForm.status, 404)

    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email: 'duena@test.com' })
    const draft = (await agent.post('/api/hosted').send({ sectionId: 'meridian/Contact' })).body.instance
    const early = await request(app).post(`/api/embed/${draft.key}/form`).send({ name: 'Ana' })
    assert.equal(early.status, 409)

    const locked = await publish('fizz/ContactSteps', {}, ['cliente.com'])
    const wrong = await request(app).post(`/api/embed/${locked.key}/form?host=otro.com`).send({ name: 'Ana' })
    assert.equal(wrong.status, 403)
    const ok = await request(app).post(`/api/embed/${locked.key}/form?host=cliente.com`).send({ name: 'Ana' })
    assert.equal(ok.status, 200)

    const bad = await request(app).post('/api/embed/no-es-key/form').send({ name: 'Ana' })
    assert.equal(bad.status, 404)
  })

  it('vacío → 400; el campo trampa lleno → OK sin mandar nada', async () => {
    const inst = await publish('contact/ContactForm')
    const empty = await request(app).post(`/api/embed/${inst.key}/form`).send({ formType: 'contact' })
    assert.equal(empty.status, 400)
    const spam = await request(app)
      .post(`/api/embed/${inst.key}/form`)
      .send({ name: 'Bot', website_hp: 'http://spam' })
    assert.deepEqual(spam.body, { ok: true, delivered: false })
  })

  it('manda el mail al dueño, con reply-to al visitante; un tope por día por widget', async () => {
    const { deliverLabForm, resetLabFormCaps, LAB_FORM_DAILY_CAP } = await import('../services/hosted/forms.js')
    const inst = await publish('contact/ContactForm')
    const sent = []
    const client = {
      emails: {
        send: async (msg, opts) => {
          sent.push({ msg, opts })
          return { data: { id: `m${sent.length}` } }
        },
      },
    }
    const mailConfig = { ...config, email: { enabled: true, apiKey: 'k', from: 'Scroll Lab <hola@x.com>', replyTo: 'hola@x.com' } }
    resetLabFormCaps()
    const out = await deliverLabForm({
      key: inst.key,
      host: 'cliente.com',
      body: { formType: 'booking', name: 'Ana', email: 'ana@example.com', date: '2026-12-01', people: '2' },
      config: mailConfig,
      client,
    })
    assert.deepEqual(out, { ok: true, delivered: true })
    assert.equal(sent.length, 1)
    assert.deepEqual(sent[0].msg.to, ['duena@test.com'])
    assert.equal(sent[0].msg.replyTo, 'ana@example.com')
    assert.equal(sent[0].msg.subject, 'Nueva reserva desde cliente.com')
    assert.match(sent[0].msg.text, /Personas: 2/)
    assert.match(sent[0].msg.text, new RegExp(`/lab/${inst.id}`))
    assert.match(sent[0].opts.idempotencyKey, /^scrolllab-lab-form-/)

    // Dos mensajes iguales son dos mails (cada envío es su propio evento).
    await deliverLabForm({ key: inst.key, host: null, body: { name: 'Ana', message: 'Otra vez, hola' }, config: mailConfig, client })
    assert.notEqual(sent[1].opts.idempotencyKey, sent[0].opts.idempotencyKey)

    for (let i = 2; i < LAB_FORM_DAILY_CAP; i++) {
      await deliverLabForm({ key: inst.key, host: null, body: { name: `N${i}` }, config: mailConfig, client })
    }
    await assert.rejects(
      deliverLabForm({ key: inst.key, host: null, body: { name: 'Uno más' }, config: mailConfig, client }),
      (err) => err.status === 429,
    )
    assert.equal(sent.length, LAB_FORM_DAILY_CAP)
    resetLabFormCaps()
  })
})

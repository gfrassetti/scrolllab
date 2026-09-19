import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LeadError, submitLead } from '../leads.js'
import { isValidEmail } from '../contactForm.js'

const payload = { email: 'ana@estudio.com', source: 'home', locale: 'es' }
const apiError = (status) => Object.assign(new Error(`Error ${status}`), { status })

describe('submitLead', () => {
  it('manda el mail con origen, idioma y el honeypot vacío', async () => {
    let sent
    await submitLead(payload, async (body) => {
      sent = body
      return { ok: true }
    })
    assert.deepEqual(sent, { ...payload, website: '' })
  })

  it('manda de qué canal llegó solo si lo hay', async () => {
    let sent
    const post = async (body) => {
      sent = body
    }
    await submitLead({ ...payload, utm: { source: 'instagram', campaign: 'nocturne' } }, post)
    assert.deepEqual(sent.utm, { source: 'instagram', campaign: 'nocturne' })

    await submitLead({ ...payload, utm: null }, post)
    assert.equal('utm' in sent, false)
  })

  it('devuelve lo que responde la API (el cupón)', async () => {
    const reply = { ok: true, coupon: { code: 'SL-ABC234', percent: 10 }, couponStatus: 'active' }
    assert.deepEqual(await submitLead(payload, async () => reply), reply)
  })

  it('reenvía el honeypot tal cual llega', async () => {
    let sent
    await submitLead({ ...payload, website: 'https://spam.example' }, async (body) => {
      sent = body
    })
    assert.equal(sent.website, 'https://spam.example')
  })

  it('traduce el status de la API al tipo de error', async () => {
    for (const [status, kind] of [
      [400, 'invalid'],
      [429, 'rate'],
      [500, 'server'],
      [502, 'server'],
    ]) {
      await assert.rejects(
        () =>
          submitLead(payload, async () => {
            throw apiError(status)
          }),
        (err) => err instanceof LeadError && err.kind === kind,
        `status ${status}`,
      )
    }
  })

  it('sin respuesta del servidor es un error de red', async () => {
    await assert.rejects(
      () =>
        submitLead(payload, async () => {
          throw new TypeError('Failed to fetch')
        }),
      (err) => err instanceof LeadError && err.kind === 'network',
    )
  })
})

describe('isValidEmail', () => {
  it('acepta mails con forma normal', () => {
    for (const ok of ['ana@estudio.com', 'a.b+c@sub.dominio.com.ar']) {
      assert.equal(isValidEmail(ok), true, ok)
    }
  })

  it('rechaza lo que no lo es', () => {
    for (const bad of ['', 'ana', 'ana@', '@estudio.com', 'ana@estudio', 'ana @estudio.com', null, undefined]) {
      assert.equal(isValidEmail(bad), false, String(bad))
    }
  })
})

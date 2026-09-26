import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const { captureUtmFromUrl, cleanUtmValue, loadUtm } = await import('../utm.js')

const loc = (search) => ({ search })
const DAY = 24 * 60 * 60 * 1000

describe('cleanUtmValue', () => {
  it('deja minúsculas y slugs de hasta 32 caracteres', () => {
    assert.equal(cleanUtmValue('Instagram'), 'instagram')
    assert.equal(cleanUtmValue('  Mail de prueba '), 'mail-de-prueba')
    assert.equal(cleanUtmValue('nocturne!!'), 'nocturne')
    assert.equal(cleanUtmValue('a'.repeat(80)), 'a'.repeat(32))
  })

  it('devuelve null si no queda nada', () => {
    for (const empty of ['', '   ', '!!!', null, undefined]) {
      assert.equal(cleanUtmValue(empty), null, String(empty))
    }
  })
})

describe('captureUtmFromUrl / loadUtm', () => {
  beforeEach(() => localStorage.clear())

  it('guarda los utm_* del link y los devuelve', () => {
    const found = captureUtmFromUrl(loc('?utm_source=Instagram&utm_medium=reels&utm_campaign=nocturne'))
    assert.deepEqual(found, { source: 'instagram', medium: 'reels', campaign: 'nocturne' })
    assert.deepEqual(loadUtm(), { source: 'instagram', medium: 'reels', campaign: 'nocturne' })
  })

  it('con solo algunos campos guarda esos', () => {
    captureUtmFromUrl(loc('?utm_source=x'))
    assert.deepEqual(loadUtm(), { source: 'x' })
  })

  it('sin utm_* no guarda nada', () => {
    assert.equal(captureUtmFromUrl(loc('?cupon=SL-ABC234&foo=bar')), null)
    assert.equal(captureUtmFromUrl(loc('')), null)
    assert.equal(loadUtm(), null)
  })

  it('gana la primera visita: otra llegada desde otro canal no la pisa', () => {
    captureUtmFromUrl(loc('?utm_source=tiktok'))
    assert.equal(captureUtmFromUrl(loc('?utm_source=reddit')), null)
    assert.deepEqual(loadUtm(), { source: 'tiktok' })
  })

  it('a los 30 días vence y se puede guardar uno nuevo', () => {
    const start = Date.now()
    captureUtmFromUrl(loc('?utm_source=tiktok'), start)
    assert.deepEqual(loadUtm(start + 29 * DAY), { source: 'tiktok' })
    assert.equal(loadUtm(start + 31 * DAY), null)
    assert.deepEqual(captureUtmFromUrl(loc('?utm_source=reddit'), start + 31 * DAY), { source: 'reddit' })
  })

  it('tolera basura en el storage', () => {
    localStorage.setItem('scrolllab-utm', '{no es json')
    assert.equal(loadUtm(), null)
    localStorage.setItem('scrolllab-utm', JSON.stringify({ at: Date.now() }))
    assert.equal(loadUtm(), null)
  })
})

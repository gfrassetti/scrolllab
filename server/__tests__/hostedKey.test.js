import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isHostedKey,
  newHostedKey,
  requestHost,
  cleanDomains,
  domainAllowed,
} from '../hostedKey.js'

describe('isHostedKey / newHostedKey', () => {
  it('newHostedKey pasa isHostedKey', () => {
    assert.equal(isHostedKey(newHostedKey()), true)
  })
  it('rechaza formatos raros', () => {
    assert.equal(isHostedKey('pub_'), false)
    assert.equal(isHostedKey('pub_XYZ'), false)
    assert.equal(isHostedKey('pub_' + 'a'.repeat(23)), false)
    assert.equal(isHostedKey(123), false)
  })
})

describe('requestHost', () => {
  it('saca el hostname del Origin, en minúsculas y sin puerto', () => {
    assert.equal(
      requestHost({ headers: { origin: 'https://Cliente.COM:8443' } }),
      'cliente.com',
    )
  })
  it('cae al Referer si no hay Origin', () => {
    assert.equal(
      requestHost({ headers: { referer: 'https://www.cliente.com/una/pagina' } }),
      'www.cliente.com',
    )
  })
  it('sin nada → null; basura → null', () => {
    assert.equal(requestHost({ headers: {} }), null)
    assert.equal(requestHost({ headers: { origin: 'no-es-una-url' } }), null)
  })
})

describe('cleanDomains', () => {
  it('normaliza (trim, minúsculas, saca www y esquema/path)', () => {
    assert.deepEqual(
      cleanDomains(['  WWW.Cliente.com  ', 'https://otro.com/landing']),
      ['cliente.com', 'otro.com'],
    )
  })
  it('descarta lo que no es hostname válido y deduplica', () => {
    assert.deepEqual(
      cleanDomains(['cliente.com', 'cliente.com', 'localhost', '', 42, 'a b']),
      ['cliente.com'],
    )
  })
  it('no es array → []', () => {
    assert.deepEqual(cleanDomains('cliente.com'), [])
  })
  it('corta a 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => `d${i}.com`)
    assert.equal(cleanDomains(many).length, 10)
  })
})

describe('domainAllowed', () => {
  it('lista vacía o no-array = sin lock (todo permitido)', () => {
    assert.equal(domainAllowed([], 'cualquiera.com'), true)
    assert.equal(domainAllowed(undefined, 'cualquiera.com'), true)
  })
  it('con lista pero sin host → denegado', () => {
    assert.equal(domainAllowed(['cliente.com'], null), false)
  })
  it('match exacto y por base sin www', () => {
    assert.equal(domainAllowed(['cliente.com'], 'cliente.com'), true)
    assert.equal(domainAllowed(['cliente.com'], 'www.cliente.com'), true)
    assert.equal(domainAllowed(['cliente.com'], 'otro.com'), false)
    assert.equal(domainAllowed(['cliente.com'], 'evil-cliente.com'), false)
  })
})

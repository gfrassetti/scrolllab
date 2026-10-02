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

  // El config lo pide el iframe (nuestro origen): el sitio del cliente llega en
  // `?host=`, no en el Origin, que ahí es siempre el del embed.
  it('prefiere el host que manda el frame por sobre el Origin del iframe', () => {
    const req = (host) => ({
      query: { host },
      headers: { origin: 'https://embed.scrolllab.com.ar' },
    })
    assert.equal(requestHost(req('Cliente.com')), 'cliente.com')
    assert.equal(requestHost(req('www.cliente.com')), 'www.cliente.com')
    assert.equal(requestHost(req('localhost')), 'localhost')
    // Algo que no es un hostname no se usa ni cae al Origin del frame.
    assert.equal(requestHost(req('cliente.com/evil')), null)
    assert.equal(requestHost(req('a b.com')), null)
    assert.equal(requestHost(req('x'.repeat(260) + '.com')), null)
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
      cleanDomains(['cliente.com', 'cliente.com', 'intranet', '', 42, 'a b', '10.0.0.1']),
      ['cliente.com'],
    )
  })
  // Para probar el embed en la máquina con el lock puesto (Vite, Next, etc.).
  it('acepta localhost y 127.0.0.1 (con o sin puerto/esquema)', () => {
    assert.deepEqual(
      cleanDomains(['localhost:3000', 'http://localhost:5173/', '127.0.0.1', 'cliente.com:8080']),
      ['localhost', '127.0.0.1', 'cliente.com'],
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

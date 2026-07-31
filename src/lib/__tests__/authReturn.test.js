import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()

const {
  sanitizeAuthReturn,
  stashAuthReturn,
  takeAuthReturn,
} = await import('../authReturn.js')

describe('authReturn (cliente)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sanitizeAuthReturn permite builder/cart y bloquea open redirect', () => {
    assert.equal(sanitizeAuthReturn('/builder'), '/builder')
    assert.equal(sanitizeAuthReturn('/cart'), '/cart')
    assert.equal(sanitizeAuthReturn('https://evil.test'), null)
    assert.equal(sanitizeAuthReturn('//evil.test'), null)
    assert.equal(sanitizeAuthReturn('/login'), null)
  })

  it('stash + take restauran next y limpian sessionStorage', () => {
    assert.equal(stashAuthReturn('/builder'), '/builder')
    assert.equal(sessionStorage.getItem('scrolllab-auth-next'), '/builder')
    assert.equal(takeAuthReturn('/account'), '/builder')
    assert.equal(sessionStorage.getItem('scrolllab-auth-next'), null)
  })

  it('take cae al fallback si no hay stash (o es inválido)', () => {
    assert.equal(takeAuthReturn('/cart'), '/cart')
    stashAuthReturn('https://evil.test')
    assert.equal(takeAuthReturn('/account'), '/account')
  })
})

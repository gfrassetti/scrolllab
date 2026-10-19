import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fromOurSite, issuePass, passIsValid, sealedAssetPath } from '../services/showcase/vesperAssets.js'

// VESPER, la vitrina del Estudio: las piezas selladas se bajan solo con un pase vigente y desde el sitio.
describe('vitrina VESPER: pases y piezas selladas', () => {
  const secret = 'test-secret-for-the-showcase'
  const now = 1_760_000_000_000

  it('un pase recién emitido vale', () => {
    const { pass, expiresAt } = issuePass(secret, now)
    assert.ok(expiresAt > now)
    assert.equal(passIsValid(secret, pass, now), true)
  })

  it('un pase vencido no vale', () => {
    const { pass } = issuePass(secret, now)
    assert.equal(passIsValid(secret, pass, now + 16 * 60 * 1000), false)
  })

  it('un pase firmado con otro secreto o retocado no vale', () => {
    const { pass } = issuePass(secret, now)
    assert.equal(passIsValid('otro', pass, now), false)
    const [exp, sig] = pass.split('.')
    assert.equal(passIsValid(secret, `${Number(exp) + 60000}.${sig}`, now), false)
    assert.equal(passIsValid(secret, '', now), false)
    assert.equal(passIsValid(secret, 'basura', now), false)
  })

  it('un vencimiento puesto a mano muy lejos no vale aunque la firma cierre', () => {
    const { pass } = issuePass(secret, now + 24 * 60 * 60 * 1000)
    assert.equal(passIsValid(secret, pass, now), false)
  })

  it('solo ids de 20 hex: nada de rutas relativas', () => {
    assert.equal(sealedAssetPath('../../app'), null)
    assert.equal(sealedAssetPath('..%2F..%2Fapp'), null)
    assert.equal(sealedAssetPath('0123456789abcdef0123'), null) // con forma de id, pero no existe
  })

  it('el pedido tiene que venir del propio sitio', () => {
    const allowed = new Set(['https://www.scrolllab.com.ar', 'https://scrolllab.com.ar'])
    assert.equal(fromOurSite({ 'sec-fetch-site': 'same-origin' }, allowed), true)
    assert.equal(fromOurSite({ 'sec-fetch-site': 'cross-site' }, allowed), false)
    assert.equal(fromOurSite({ 'sec-fetch-site': 'none' }, allowed), false) // pegar el link en la barra
    assert.equal(fromOurSite({ origin: 'https://www.scrolllab.com.ar' }, allowed), true)
    assert.equal(fromOurSite({ referer: 'https://copia.example/vesper' }, allowed), false)
    assert.equal(fromOurSite({}, allowed), false)
  })
})

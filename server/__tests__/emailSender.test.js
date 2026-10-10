import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { brandedFrom } from '../config.js'

// Lo que ve el cliente en la bandeja: «Scroll Lab», no «SCROLLLAB», venga
// como venga cargada EMAIL_FROM en el entorno.
describe('brandedFrom — remitente de los mails', () => {
  it('reemplaza el nombre que traiga la variable', () => {
    assert.equal(brandedFrom('SCROLLLAB <compras@scrolllab.com.ar>'), 'Scroll Lab <compras@scrolllab.com.ar>')
  })
  it('acepta la dirección sola', () => {
    assert.equal(brandedFrom(' compras@scrolllab.com.ar '), 'Scroll Lab <compras@scrolllab.com.ar>')
  })
})

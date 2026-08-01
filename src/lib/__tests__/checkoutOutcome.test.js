import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { outcomeForStatus, shouldClearCart } from '../checkoutOutcome.js'

describe('outcomeForStatus', () => {
  it('aprueba cuando Mercado Pago dice approved', () => {
    assert.equal(outcomeForStatus('approved'), 'approved')
    assert.equal(outcomeForStatus('APPROVED'), 'approved')
  })

  it('sin status deja que el confirm decida', () => {
    assert.equal(outcomeForStatus(''), 'approved')
    assert.equal(outcomeForStatus(null), 'approved')
    assert.equal(outcomeForStatus(undefined), 'approved')
  })

  it('el efectivo y las revisiones son pago en proceso, no fallo', () => {
    assert.equal(outcomeForStatus('pending'), 'processing')
    assert.equal(outcomeForStatus('in_process'), 'processing')
    assert.equal(outcomeForStatus('in_mediation'), 'processing')
    assert.equal(outcomeForStatus('authorized'), 'processing')
  })

  it('el resto es rechazo', () => {
    assert.equal(outcomeForStatus('rejected'), 'not-approved')
    assert.equal(outcomeForStatus('cancelled'), 'not-approved')
    assert.equal(outcomeForStatus('charged_back'), 'not-approved')
    assert.equal(outcomeForStatus('cualquier_cosa'), 'not-approved')
  })
})

/**
 * Vaciar el carrito de un pago rechazado obliga a rearmar la compra entera
 * justo cuando el comprador quiere reintentar.
 */
describe('shouldClearCart', () => {
  it('no lo toca mientras el pago no se resolvió', () => {
    assert.equal(shouldClearCart('idle'), false)
    assert.equal(shouldClearCart('busy'), false)
  })

  it('lo conserva si el pago fue rechazado', () => {
    assert.equal(shouldClearCart('not-approved'), false)
  })

  it('lo vacía en cuanto el pago existe', () => {
    assert.equal(shouldClearCart('processing'), true)
    assert.equal(shouldClearCart('received'), true)
    assert.equal(shouldClearCart('error'), true)
    assert.equal(shouldClearCart('needs-login'), true)
  })
})

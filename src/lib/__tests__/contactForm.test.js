import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  sanitizePlainText,
  sanitizeContactPayload,
  validateContactPayload,
} from '../contactForm.js'

const labels = {
  nameRequired: 'name',
  emailInvalid: 'email',
  messageShort: 'message',
}

describe('contactForm sanitize', () => {
  it('strips tags and script-ish fragments', () => {
    const out = sanitizePlainText(
      '<script>alert(1)</script>Hola onclick=x javascript:void(0)',
      200,
    )
    assert.equal(out.includes('<'), false)
    assert.equal(out.includes('>'), false)
    assert.match(out, /Hola/)
    assert.equal(/javascript\s*:/i.test(out), false)
    assert.equal(/onclick\s*=/i.test(out), false)
  })

  it('caps length', () => {
    assert.equal(sanitizePlainText('a'.repeat(100), 10).length, 10)
  })

  it('validates a clean payload', () => {
    const result = validateContactPayload(
      {
        name: 'Guido',
        email: 'hola@scrolllab.com.ar',
        message: 'Necesito una página a medida para un cliente.',
      },
      labels,
    )
    assert.equal(result.ok, true)
    assert.equal(result.data.email, 'hola@scrolllab.com.ar')
  })

  it('rejects invalid email and short message', () => {
    const result = validateContactPayload(
      { name: 'A', email: 'nope', message: 'corto' },
      labels,
    )
    assert.equal(result.ok, false)
    assert.ok(result.errors.name)
    assert.ok(result.errors.email)
    assert.ok(result.errors.message)
  })

  it('sanitizes before validating', () => {
    const result = sanitizeContactPayload({
      name: '  <b>Ana</b>  ',
      email: ' ANA@Mail.COM ',
      message: '<img src=x onerror=alert(1)>Necesito algo custom please',
    })
    assert.equal(result.name, 'Ana')
    assert.equal(result.email, 'ana@mail.com')
    assert.equal(result.message.includes('<'), false)
    assert.equal(/onerror\s*=/i.test(result.message), false)
  })
})

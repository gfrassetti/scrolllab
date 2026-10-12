import test from 'node:test'
import assert from 'node:assert/strict'
import { createMailClient } from '../services/mailClient.js'
import { brandedFrom } from '../config.js'

const smtpConfig = {
  email: { apiKey: 're_x', smtp: { host: 'smtp.gmail.com', port: 465, user: 'estudio@gmail.com', pass: 'abcdabcdabcdabcd' } },
}

function fakeTransport(fail = false) {
  const sent = []
  return {
    sent,
    async sendMail(mail) {
      if (fail) throw new Error('535 credenciales')
      sent.push(mail)
      return { messageId: `<id-${sent.length}@gmail.com>` }
    },
  }
}

const payload = {
  from: brandedFrom('estudio@gmail.com'),
  to: ['cliente@example.com'],
  replyTo: 'hola@scrolllab.com.ar',
  subject: 'Tu compra',
  html: '<p>hola</p>',
  text: 'hola',
  tags: [{ name: 'type', value: 'receipt' }],
}

test('sin SMTP devuelve el cliente de Resend', () => {
  const client = createMailClient({ email: { apiKey: 're_x', smtp: null } })
  assert.equal(typeof client.emails.send, 'function')
  assert.notEqual(client.constructor.name, 'Object')
})

test('con SMTP manda el mail con el remitente y el reply-to', async () => {
  const transport = fakeTransport()
  const client = createMailClient(smtpConfig, { transport })
  const res = await client.emails.send(payload, { idempotencyKey: 'k-1' })
  assert.equal(res.error, null)
  assert.match(res.data.id, /^<id-1@/)
  assert.equal(transport.sent.length, 1)
  assert.equal(transport.sent[0].from, 'Scroll Lab <estudio@gmail.com>')
  assert.deepEqual(transport.sent[0].to, ['cliente@example.com'])
  assert.equal(transport.sent[0].replyTo, 'hola@scrolllab.com.ar')
  assert.equal(transport.sent[0].tags, undefined)
})

test('la misma clave de idempotencia no manda dos veces', async () => {
  const transport = fakeTransport()
  const client = createMailClient(smtpConfig, { transport })
  await client.emails.send(payload, { idempotencyKey: 'k-dup' })
  const again = await client.emails.send(payload, { idempotencyKey: 'k-dup' })
  assert.equal(again.error, null)
  assert.equal(transport.sent.length, 1)
})

test('si SMTP falla devuelve error y el reintento puede salir', async () => {
  const bad = createMailClient(smtpConfig, { transport: fakeTransport(true) })
  const res = await bad.emails.send(payload, { idempotencyKey: 'k-retry' })
  assert.match(res.error.message, /535/)
  const transport = fakeTransport()
  const good = createMailClient(smtpConfig, { transport })
  const retry = await good.emails.send(payload, { idempotencyKey: 'k-retry' })
  assert.equal(retry.error, null)
  assert.equal(transport.sent.length, 1)
})

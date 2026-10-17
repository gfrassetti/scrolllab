import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createFakeMercadoPago, startAppAgainstFakeMp } from './helpers/fakeMercadoPago.js'

/**
 * Entrar con un link por mail (server/services/emailLogin.js): el pedido, el
 * mail, el canje de un solo uso, la cuenta (la misma que con Google si comparte
 * el mail) y lo que nunca se puede: averiguar si un mail tiene cuenta, usar un
 * link dos veces o volver a un sitio ajeno.
 */
describe('Entrar con un link por mail', () => {
  const mp = createFakeMercadoPago()
  let app
  let fileDb
  let cleanup

  before(async () => {
    ;({ app, fileDb, cleanup } = await startAppAgainstFakeMp(mp))
  })
  after(() => cleanup())

  const tokenFrom = (email) => {
    const mail = mp.mailsTo(email).at(-1)
    assert.ok(mail, `sin mail para ${email}`)
    const m = mail.body.text.match(/\/login\/email\?token=([A-Za-z0-9_-]+)/)
    assert.ok(m, 'el mail no trae el link')
    return m[1]
  }

  it('pide el link: siempre responde igual y el mail trae el link al sitio', async () => {
    const res = await request(app).post('/api/auth/email').send({ email: '  Nueva@Test.com ', next: '/lab' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { ok: true })
    const mail = mp.mailsTo('nueva@test.com').at(-1)
    assert.match(mail.body.subject, /entrar/i)
    assert.ok(tokenFrom('nueva@test.com').length >= 40)
  })

  it('el link entra una sola vez, crea la cuenta y vuelve adonde estaba', async () => {
    await request(app).post('/api/auth/email').send({ email: 'canje@test.com', next: '/lab' })
    const token = tokenFrom('canje@test.com')
    const agent = request.agent(app)
    const res = await agent.post('/api/auth/email/verify').send({ token })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.user.email, 'canje@test.com')
    assert.equal(res.body.next, '/lab')
    assert.equal((await agent.get('/api/auth/me')).body.user.email, 'canje@test.com')
    // Segunda vez: gastado.
    const again = await request(app).post('/api/auth/email/verify').send({ token })
    assert.equal(again.status, 410)
  })

  it('con el mail de una cuenta de Google entra a esa misma cuenta', async () => {
    const google = await fileDb.createUser({ email: 'google@test.com', name: 'G', googleId: 'g-123' })
    await request(app).post('/api/auth/email').send({ email: 'google@test.com' })
    const res = await request(app).post('/api/auth/email/verify').send({ token: tokenFrom('google@test.com') })
    assert.equal(res.body.user.id, google.id)
    assert.equal(res.body.next, '/account')
  })

  it('un token inventado o un next a un sitio ajeno no sirven', async () => {
    assert.equal((await request(app).post('/api/auth/email/verify').send({ token: 'x'.repeat(43) })).status, 410)
    assert.equal((await request(app).post('/api/auth/email/verify').send({ token: '../' })).status, 400)
    await request(app).post('/api/auth/email').send({ email: 'ajeno@test.com', next: 'https://evil.example/' })
    const res = await request(app).post('/api/auth/email/verify').send({ token: tokenFrom('ajeno@test.com') })
    assert.equal(res.body.next, '/account')
  })

  it('un mail inválido avisa; más de 3 pedidos seguidos no mandan más mails (y responden igual)', async () => {
    assert.equal((await request(app).post('/api/auth/email').send({ email: 'no-es-mail' })).status, 400)
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/email').send({ email: 'insiste@test.com' })
      assert.equal(res.status, 200)
    }
    assert.equal(mp.mailsTo('insiste@test.com').length, 3)
  })

  it('un link vencido no entra', async () => {
    await request(app).post('/api/auth/email').send({ email: 'vencido@test.com' })
    const token = tokenFrom('vencido@test.com')
    const rows = JSON.parse(JSON.stringify(await fileDb.countLoginLinksSince('vencido@test.com', new Date(0))))
    assert.equal(rows, 1)
    const realNow = Date.now
    Date.now = () => realNow() + 16 * 60 * 1000
    try {
      const res = await request(app).post('/api/auth/email/verify').send({ token })
      assert.equal(res.status, 410)
    } finally {
      Date.now = realNow
    }
  })
})

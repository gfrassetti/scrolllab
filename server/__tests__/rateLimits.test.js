import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { rateLimits } from '../middleware.js'

/**
 * El techo de checkout cuenta por usuario: detrás de Vercel → Railway muchos
 * compradores pueden llegar con la misma IP y no se tienen que cortar entre sí.
 */
describe('límite de checkout', () => {
  it('cuenta por usuario, no por IP', async () => {
    const before = process.env.RATE_LIMIT_DISABLED
    process.env.RATE_LIMIT_DISABLED = ''
    let limits
    try {
      limits = rateLimits()
    } finally {
      process.env.RATE_LIMIT_DISABLED = before
    }
    const app = express()
    app.use((req, _res, next) => {
      req.user = { id: req.get('x-user') }
      next()
    })
    app.post('/pay', limits.checkout, (_req, res) => res.sendStatus(200))

    const hit = (user) => request(app).post('/pay').set('x-user', user)
    let last
    for (let i = 0; i < 60; i++) last = await hit('ana')
    assert.equal(last.status, 200)
    const over = await hit('ana')
    assert.equal(over.status, 429)
    assert.match(over.body.error, /Demasiados intentos de pago/)
    // Otro comprador, misma IP: sigue pudiendo pagar.
    assert.equal((await hit('beto')).status, 200)
  })
})

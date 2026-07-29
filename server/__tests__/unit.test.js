import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  validateCheckoutItems,
  validateRecipe,
  HttpError,
} from '../validation.js'
import {
  signDownloadToken,
  verifyDownloadToken,
} from '../packaging.js'
import { assertPaymentMatchesOrder } from '../services/mercadoPago.js'
import { verifyMpWebhookSignature } from '../services/mercadoPago.js'
import { PRODUCTS } from '../catalog.js'
import { buildOrderReceipt } from '../services/email.js'

describe('validateRecipe', () => {
  it('acepta secciones de la allowlist', () => {
    const recipe = validateRecipe(['chapters/HeroKinetic', 'nocturne/OutroCTA'])
    assert.equal(recipe.length, 2)
  })

  it('rechaza path traversal / secciones inventadas', () => {
    assert.throws(
      () => validateRecipe(['chapters/../../etc/passwd']),
      (err) => err instanceof HttpError && err.status === 400,
    )
    assert.throws(
      () => validateRecipe(['evil/Hack']),
      (err) => err instanceof HttpError && err.status === 400,
    )
  })
})

describe('validateCheckoutItems', () => {
  const opts = { maxCartItems: 5, maxRecipeSections: 30 }

  it('usa precio del servidor, no del cliente', () => {
    const lines = validateCheckoutItems(
      [{ sku: 'chapters', unit_price: 1, title: 'Hacked' }],
      opts,
    )
    assert.equal(lines[0].unit_price, PRODUCTS.chapters.unit_price)
    assert.equal(lines[0].title, PRODUCTS.chapters.title)
  })

  it('rechaza carrito vacío y SKU inválido', () => {
    assert.throws(() => validateCheckoutItems([], opts), HttpError)
    assert.throws(
      () => validateCheckoutItems([{ sku: 'nope' }], opts),
      HttpError,
    )
  })

  it('valida receta custom', () => {
    const lines = validateCheckoutItems(
      [
        {
          sku: 'custom:x',
          recipe: ['chapters/VelocityMarquee', 'monolith/SkewScroller'],
          title: 'Cliente miente',
        },
      ],
      opts,
    )
    assert.equal(lines[0].title, PRODUCTS.custom.title)
    assert.equal(lines[0].unit_price, PRODUCTS.custom.unit_price)
    assert.deepEqual(lines[0].recipe, [
      'chapters/VelocityMarquee',
      'monolith/SkewScroller',
    ])
  })
})

describe('download tokens', () => {
  const secret = 'test-download-secret-min-24-chars!!'

  it('firma y verifica', () => {
    const token = signDownloadToken({
      orderId: 'abc123abc123abc123abc123',
      userId: 'user1',
      secret,
      ttlSeconds: 60,
    })
    const data = verifyDownloadToken(token, secret)
    assert.equal(data.orderId, 'abc123abc123abc123abc123')
    assert.equal(data.userId, 'user1')
  })

  it('rechaza token adulterado o vencido', () => {
    const token = signDownloadToken({
      orderId: 'abc123abc123abc123abc123',
      userId: 'user1',
      secret,
      ttlSeconds: -10,
    })
    assert.equal(verifyDownloadToken(token, secret), null)
    assert.equal(verifyDownloadToken('nope.bad', secret), null)
  })
})

describe('assertPaymentMatchesOrder', () => {
  const order = {
    id: 'ord1',
    total: 49000,
    currency_id: 'ARS',
  }

  it('acepta pago aprobado coincidente', () => {
    assert.doesNotThrow(() =>
      assertPaymentMatchesOrder(
        {
          status: 'approved',
          transaction_amount: 49000,
          currency_id: 'ARS',
          external_reference: 'ord1',
        },
        order,
      ),
    )
  })

  it('rechaza monto o moneda incorrectos', () => {
    assert.throws(
      () =>
        assertPaymentMatchesOrder(
          {
            status: 'approved',
            transaction_amount: 1,
            currency_id: 'ARS',
            external_reference: 'ord1',
          },
          order,
        ),
      HttpError,
    )
    assert.throws(
      () =>
        assertPaymentMatchesOrder(
          {
            status: 'approved',
            transaction_amount: 49000,
            currency_id: 'USD',
            external_reference: 'ord1',
          },
          order,
        ),
      HttpError,
    )
  })
})

describe('verifyMpWebhookSignature', () => {
  const secret = 'whsec_test_secret_for_unit_tests'

  function sign(dataId, requestId, ts) {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return `ts=${ts},v1=${v1}`
  }

  it('acepta firma válida', () => {
    const dataId = '123456789'
    const requestId = 'req-abc'
    const ts = String(Math.floor(Date.now() / 1000))
    assert.doesNotThrow(() =>
      verifyMpWebhookSignature({
        secret,
        xSignature: sign(dataId, requestId, ts),
        xRequestId: requestId,
        dataId,
      }),
    )
  })

  it('rechaza firma inválida', () => {
    assert.throws(
      () =>
        verifyMpWebhookSignature({
          secret,
          xSignature: 'ts=1,v1=deadbeef',
          xRequestId: 'req-abc',
          dataId: '123',
        }),
      HttpError,
    )
  })
})

describe('order receipt email', () => {
  it('incluye orden, ítems y CTA sin permitir HTML del usuario', () => {
    const message = buildOrderReceipt({
      order: {
        id: 'abc123abc123abc123abc123',
        items: [
          {
            sku: 'chapters',
            title: 'CHAPTERS <script>alert(1)</script>',
            unit_price: 49000,
            currency_id: 'ARS',
          },
        ],
        total: 49000,
        currency_id: 'ARS',
      },
      user: {
        email: 'buyer@example.com',
        name: '<b>Buyer</b>',
      },
      accountUrl: 'https://scrolllab.com/account',
      logoUrl: 'https://scrolllab.com/logo.svg',
    })

    assert.match(message.subject, /abc123/)
    assert.match(message.html, /Ingresar y descargar/)
    assert.match(message.html, /https:\/\/scrolllab\.com\/account/)
    assert.doesNotMatch(message.html, /<script>/)
    assert.doesNotMatch(message.html, /<b>Buyer<\/b>/)
    assert.match(message.text, /CHAPTERS/)
  })
})

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
import {
  assertPaymentMatchesOrder,
  mpPaymentError,
  buildPreferenceBody,
  absoluteClientAsset,
  MP_STATEMENT_DESCRIPTOR,
  MP_DEFAULT_ITEM_PICTURE,
} from '../services/mercadoPago.js'
import { verifyMpWebhookSignature } from '../services/mercadoPago.js'
import {
  PRODUCTS,
  COMMERCE_PACK_SURCHARGE_USD,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
  BUNDLE_MODELS,
  arsFromUsd,
  priceCustomRecipeUsd,
} from '../catalog.js'
import {
  extractRate,
  getUsdArsRate,
  clearFxCache,
  setFxCacheForTests,
} from '../fx.js'
import { buildOrderReceipt, buildOrderAdminNotify } from '../services/email.js'
import { sanitizeAuthReturn } from '../authReturn.js'
import { allowedOrigins, errorHandler, requireSameOrigin } from '../middleware.js'
import {
  PENDING_RETENTION_MS,
  PENDING_VISIBLE_MS,
  isStalePending,
  pendingExpiresAt,
  visibleOrders,
} from '../orderRetention.js'

describe('validateRecipe', () => {
  it('acepta secciones de la allowlist (legacy string[])', () => {
    const recipe = validateRecipe(['chapters/HeroKinetic', 'nocturne/OutroCTA'])
    assert.equal(recipe.length, 2)
    assert.deepEqual(recipe[0], { id: 'chapters/HeroKinetic' })
  })

  it('acepta recipe con props allowlisted', () => {
    const recipe = validateRecipe([
      { id: 'chapters/HeroKinetic', props: { lineOne: 'HELLO', evil: 'nope' } },
    ])
    assert.deepEqual(recipe[0], {
      id: 'chapters/HeroKinetic',
      props: { lineOne: 'HELLO' },
    })
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

  it('persiste textos fizz y descarta blob: de assets', () => {
    const recipe = validateRecipe([
      {
        id: 'fizz/HeroBubbles',
        props: {
          title: 'MY TITLE',
          modelUrl: 'blob:http://localhost/abc',
          flavor: 'mint',
        },
      },
      {
        id: 'fizz/CanCarousel',
        props: {
          can1Name: 'Custom',
          can1Image: '/can-1.svg',
          can2Image: 'blob:http://localhost/x',
        },
      },
    ])
    assert.deepEqual(recipe[0].props, {
      title: 'MY TITLE',
      flavor: 'mint',
    })
    assert.deepEqual(recipe[1].props, {
      can1Name: 'Custom',
      can1Image: '/can-1.svg',
    })
  })

  it('acepta secciones atelier y velocity', () => {
    const recipe = validateRecipe([
      { id: 'atelier/HeroMeaning', props: { line1: 'Hello' } },
      { id: 'velocity/NavVelocity', props: { brand: 'BRAND' } },
    ])
    assert.equal(recipe.length, 2)
    assert.equal(recipe[0].props.line1, 'Hello')
    assert.equal(recipe[1].props.brand, 'BRAND')
  })

  it('rechaza secciones de modelos ocultos en el builder', () => {
    assert.throws(() => validateRecipe(['ratio/HeroTools']), HttpError)
  })

  it('contact form: valida theme y endpoint', () => {
    const recipe = validateRecipe([
      {
        id: 'contact/ContactForm',
        props: {
          theme: 'nocturne',
          title: 'Say hello',
          endpoint: 'https://api.example.com/contact',
        },
      },
      {
        id: 'contact/ContactForm',
        props: { theme: 'hacker', endpoint: 'javascript:alert(1)' },
      },
    ])
    assert.deepEqual(recipe[0].props, {
      theme: 'nocturne',
      title: 'Say hello',
      endpoint: 'https://api.example.com/contact',
    })
    assert.equal(recipe[1].props, undefined)
  })
})

describe('validateCheckoutItems', () => {
  const RATE = 1560
  const opts = { maxCartItems: 5, maxRecipeSections: 30, rate: RATE }

  it('usa precio del servidor, no del cliente', () => {
    const lines = validateCheckoutItems(
      [{ sku: 'chapters', unit_price: 1, title: 'Hacked' }],
      opts,
    )
    assert.equal(lines[0].unit_price_usd, PRODUCTS.chapters.unit_price_usd)
    assert.equal(
      lines[0].unit_price,
      arsFromUsd(PRODUCTS.chapters.unit_price_usd, RATE),
    )
    assert.equal(lines[0].title, PRODUCTS.chapters.title)
  })

  it('falla sin cotización válida', () => {
    assert.throws(
      () =>
        validateCheckoutItems([{ sku: 'chapters' }], {
          ...opts,
          rate: 0,
        }),
      HttpError,
    )
  })

  it('convierte a pesos redondeando al millar de arriba', () => {
    // 129 USD * 1560 = 201.240 → 202.000
    assert.equal(arsFromUsd(129, RATE), 202000)
    assert.equal(arsFromUsd(1, 1000), 1000)
  })


  it('rechaza carrito vacío y SKU inválido', () => {
    assert.throws(() => validateCheckoutItems([], opts), HttpError)
    assert.throws(
      () => validateCheckoutItems([{ sku: 'nope' }], opts),
      HttpError,
    )
  })

  it('rechaza SKUs en próximamente', () => {
    assert.throws(
      () => validateCheckoutItems([{ sku: 'ratio' }], opts),
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
    assert.equal(lines[0].unit_price_usd, PRODUCTS.custom.unit_price_usd)
    assert.deepEqual(lines[0].recipe, [
      { id: 'chapters/VelocityMarquee' },
      { id: 'monolith/SkewScroller' },
    ])
  })

  it('suma recargo commerce al custom', () => {
    const lines = validateCheckoutItems(
      [
        {
          sku: 'custom:x',
          recipe: [
            'chapters/HeroKinetic',
            'commerce/ProductGrid',
          ],
        },
      ],
      opts,
    )
    assert.equal(
      lines[0].unit_price_usd,
      PRODUCTS.custom.unit_price_usd + COMMERCE_PACK_SURCHARGE_USD,
    )
  })

  it('resuelve el bundle con precio de servidor', () => {
    const lines = validateCheckoutItems(
      [{ sku: 'bundle', unit_price: 1, title: 'Cliente miente' }],
      opts,
    )
    assert.equal(lines[0].sku, 'bundle')
    assert.equal(lines[0].unit_price_usd, PRODUCTS.bundle.unit_price_usd)
    assert.equal(lines[0].title, PRODUCTS.bundle.title)
    assert.equal(lines[0].recipe, undefined)
  })

  it('el bundle cuesta menos que los modelos por separado', () => {
    const singles = BUNDLE_MODELS.reduce(
      (sum, model) => sum + PRODUCTS[model].unit_price_usd,
      0,
    )
    assert.ok(PRODUCTS.bundle.unit_price_usd < singles)
  })
})

/**
 * El precio de una composición sale de la receta, no del cliente: base con
 * secciones incluidas + adicional por cada sección extra.
 */
describe('precio por tramos de la composición', () => {
  const BASE = PRODUCTS.custom.unit_price_usd
  const recipeOf = (n, extra = []) => [
    ...Array.from({ length: n }, () => 'chapters/HeroKinetic'),
    ...extra,
  ]

  it('la base cubre hasta las secciones incluidas', () => {
    assert.equal(priceCustomRecipeUsd([]), BASE)
    assert.equal(priceCustomRecipeUsd(recipeOf(1)), BASE)
    assert.equal(priceCustomRecipeUsd(recipeOf(CUSTOM_BASE_SECTIONS)), BASE)
  })

  it('cada sección extra suma el adicional', () => {
    assert.equal(
      priceCustomRecipeUsd(recipeOf(CUSTOM_BASE_SECTIONS + 1)),
      BASE + CUSTOM_EXTRA_SECTION_USD,
    )
    assert.equal(
      priceCustomRecipeUsd(recipeOf(30)),
      BASE + (30 - CUSTOM_BASE_SECTIONS) * CUSTOM_EXTRA_SECTION_USD,
    )
  })

  it('el recargo de commerce sigue siendo aditivo', () => {
    const recipe = recipeOf(9, ['commerce/ProductGrid'])
    assert.equal(
      priceCustomRecipeUsd(recipe),
      BASE + 2 * CUSTOM_EXTRA_SECTION_USD + COMMERCE_PACK_SURCHARGE_USD,
    )
  })

  it('el checkout cobra por la receta real, no por lo que manda el cliente', () => {
    const opts = { maxCartItems: 5, maxRecipeSections: 30, rate: 1560 }
    const lines = validateCheckoutItems(
      [
        {
          sku: 'custom:mentira',
          unit_price: 1,
          unit_price_usd: 1,
          recipe: recipeOf(12),
        },
      ],
      opts,
    )
    const expectedUsd = BASE + 4 * CUSTOM_EXTRA_SECTION_USD
    assert.equal(lines[0].unit_price_usd, expectedUsd)
    assert.equal(lines[0].unit_price, arsFromUsd(expectedUsd, 1560))
    assert.equal(lines[0].recipe.length, 12)
  })

  it('una composición grande cuesta más que una chica', () => {
    const opts = { maxCartItems: 5, maxRecipeSections: 30, rate: 1560 }
    const small = validateCheckoutItems(
      [{ sku: 'custom', recipe: recipeOf(3) }],
      opts,
    )
    const big = validateCheckoutItems(
      [{ sku: 'custom', recipe: recipeOf(30) }],
      opts,
    )
    assert.ok(big[0].unit_price_usd > small[0].unit_price_usd)
  })

  it('pasarse del tope se rechaza antes de cobrar', () => {
    assert.throws(
      () =>
        validateCheckoutItems([{ sku: 'custom', recipe: recipeOf(31) }], {
          maxCartItems: 5,
          maxRecipeSections: 30,
          rate: 1560,
        }),
      HttpError,
    )
  })
})

describe('cotización USD→ARS', () => {
  it('lee el shape de dolarapi y de bluelytics', () => {
    assert.equal(extractRate({ venta: 1565, compra: 1545 }), 1565)
    assert.equal(extractRate({ blue: { value_sell: 1560 } }), 1560)
    assert.equal(extractRate({ nada: 1 }), null)
    assert.equal(extractRate({ venta: 0 }), null)
  })

  it('usa el fallback cuando no hay red y aplica el spread', async () => {
    clearFxCache()
    const prev = { ...process.env }
    process.env.FX_OFFLINE = 'true'
    process.env.FX_FALLBACK_RATE = '2000'
    process.env.FX_SPREAD_PCT = '5'
    try {
      const fx = await getUsdArsRate()
      assert.equal(fx.base, 2000)
      assert.equal(fx.rate, 2100)
      assert.equal(fx.source, 'fallback')
      assert.equal(fx.stale, true)
    } finally {
      process.env = prev
      clearFxCache()
    }
  })

  it('prefiere la cotización cacheada', async () => {
    clearFxCache()
    const prev = { ...process.env }
    process.env.FX_OFFLINE = 'true'
    process.env.FX_SPREAD_PCT = '0'
    try {
      setFxCacheForTests(1700)
      const fx = await getUsdArsRate()
      assert.equal(fx.rate, 1700)
      assert.equal(fx.source, 'test')
    } finally {
      process.env = prev
      clearFxCache()
    }
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

describe('config de descargas', () => {
  async function withEnv(patch, fn) {
    const prev = process.env
    process.env = { ...prev, NODE_ENV: 'development', ...patch }
    try {
      const { loadConfig } = await import('../config.js')
      return fn(loadConfig())
    } finally {
      process.env = prev
    }
  }

  it('por default: link de 15 minutos y sin tope de descargas', async () => {
    await withEnv(
      { DOWNLOAD_TTL_SECONDS: '', MAX_DOWNLOADS: '' },
      (config) => {
        assert.equal(config.downloadTtl, 900)
        assert.equal(config.maxDownloads, 0)
      },
    )
  })

  it('MAX_DOWNLOADS > 0 reactiva el tope duro', async () => {
    await withEnv({ MAX_DOWNLOADS: '3' }, (config) => {
      assert.equal(config.maxDownloads, 3)
    })
  })

  it('en development sin STORE usa file', async () => {
    await withEnv({ STORE: '', NODE_ENV: 'development' }, (config) => {
      assert.equal(config.store, 'file')
    })
  })
})

describe('assertPaymentMatchesOrder', () => {
  const order = {
    id: 'ord1',
    total: 200000,
    currency_id: 'ARS',
  }

  it('acepta pago aprobado coincidente', () => {
    assert.doesNotThrow(() =>
      assertPaymentMatchesOrder(
        {
          status: 'approved',
          transaction_amount: 200000,
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
            transaction_amount: 200000,
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
            unit_price: 200000,
            currency_id: 'ARS',
          },
        ],
        total: 200000,
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

  it('aviso admin incluye comprador, sku y total escapados', () => {
    const message = buildOrderAdminNotify({
      order: {
        id: 'abc123abc123abc123abc123',
        items: [
          {
            sku: 'custom:chapters',
            title: 'Builder <script>',
            unit_price: 350000,
            currency_id: 'ARS',
          },
        ],
        total: 350000,
        currency_id: 'ARS',
      },
      user: {
        email: 'buyer@example.com',
        name: 'Buyer',
      },
    })

    assert.match(message.subject, /\[SCROLLLAB\] Venta/)
    assert.match(message.subject, /buyer@example.com/)
    assert.match(message.text, /custom:chapters/)
    assert.match(message.text, /User ID:/)
    assert.match(message.text, /Pago confirmado:/)
    assert.match(message.text, /Qué compró:/)
    assert.doesNotMatch(message.html, /<script>/)
  })
})

describe('sanitizeAuthReturn', () => {
  it('acepta rutas internas allowlisteadas', () => {
    assert.equal(sanitizeAuthReturn('/builder'), '/builder')
    assert.equal(sanitizeAuthReturn('/cart'), '/cart')
    assert.equal(sanitizeAuthReturn('/account'), '/account')
  })

  it('rechaza open redirects', () => {
    assert.equal(sanitizeAuthReturn('https://evil.com'), null)
    assert.equal(sanitizeAuthReturn('//evil.com'), null)
    assert.equal(sanitizeAuthReturn('/login'), null)
    assert.equal(sanitizeAuthReturn('/templates/fizz'), null)
  })
})

describe('allowedOrigins', () => {
  it('agrega el apex cuando CLIENT_URL es www', () => {
    assert.deepEqual(allowedOrigins({ clientUrl: 'https://www.scrolllab.com.ar' }), [
      'https://www.scrolllab.com.ar',
      'https://scrolllab.com.ar',
    ])
  })

  it('agrega el www cuando CLIENT_URL es apex', () => {
    assert.deepEqual(allowedOrigins({ clientUrl: 'https://scrolllab.com.ar' }), [
      'https://scrolllab.com.ar',
      'https://www.scrolllab.com.ar',
    ])
  })

  it('no inventa variantes para localhost ni IPs', () => {
    assert.deepEqual(allowedOrigins({ clientUrl: 'http://localhost:5173' }), [
      'http://localhost:5173',
    ])
    assert.deepEqual(allowedOrigins({ clientUrl: 'http://127.0.0.1:5173' }), [
      'http://127.0.0.1:5173',
    ])
  })
})

describe('errorHandler', () => {
  function send(err, { isProd = true } = {}) {
    const out = {}
    const res = {
      status(code) {
        out.status = code
        return res
      },
      json(body) {
        out.body = body
        return res
      },
    }
    const silence = console.error
    console.error = () => {}
    try {
      errorHandler({ isProd })(err, { requestId: 'rid-1' }, res, () => {})
    } finally {
      console.error = silence
    }
    return out
  }

  it('enmascara el 5xx crudo pero devuelve el requestId para reportarlo', () => {
    const out = send(new TypeError('Invalid URL'))
    assert.equal(out.status, 500)
    assert.equal(out.body.error, 'Error interno')
    assert.equal(out.body.requestId, 'rid-1')
  })

  it('deja pasar el mensaje de un 5xx marcado expose', () => {
    const out = send(new HttpError(503, 'Mercado Pago no responde', { expose: true }))
    assert.equal(out.status, 503)
    assert.equal(out.body.error, 'Mercado Pago no responde')
  })

  it('los 4xx muestran su mensaje', () => {
    const out = send(new HttpError(409, 'Todavía se está procesando'))
    assert.equal(out.status, 409)
    assert.equal(out.body.error, 'Todavía se está procesando')
    assert.equal(out.body.requestId, 'rid-1')
  })
})

describe('buildPreferenceBody', () => {
  const base = {
    orderId: 'ord-1',
    userId: 'user-1',
    clientUrl: 'https://www.scrolllab.com.ar/',
    apiPublicUrl: 'https://api.example.com',
  }

  it('manda picture_url absoluto y statement_descriptor SCROLLLAB', () => {
    const body = buildPreferenceBody({
      ...base,
      items: [
        {
          sku: 'velocity',
          title: 'VELOCITY — template',
          unit_price: 1000,
          currency_id: 'ARS',
        },
      ],
    })
    assert.equal(body.statement_descriptor, MP_STATEMENT_DESCRIPTOR)
    assert.ok(body.statement_descriptor.length <= 13)
    assert.equal(
      body.items[0].picture_url,
      `https://www.scrolllab.com.ar${MP_DEFAULT_ITEM_PICTURE}`,
    )
    assert.equal(body.items[0].title, 'VELOCITY — template')
    assert.equal(
      body.notification_url,
      'https://api.example.com/api/webhooks/mercadopago',
    )
  })

  it('respeta picture override del ítem', () => {
    const body = buildPreferenceBody({
      ...base,
      items: [
        {
          sku: 'custom:abc',
          title: 'Composición',
          unit_price: 311000,
          currency_id: 'ARS',
          picture: '/og.png',
        },
      ],
    })
    assert.equal(
      body.items[0].picture_url,
      'https://www.scrolllab.com.ar/og.png',
    )
  })

  it('absoluteClientAsset normaliza barra final y path relativo', () => {
    assert.equal(
      absoluteClientAsset('https://www.scrolllab.com.ar/', 'icon-512.png'),
      'https://www.scrolllab.com.ar/icon-512.png',
    )
  })
})

describe('mpPaymentError', () => {
  // El SDK de MP tira el body JSON del error, sin ser un Error.
  const mapped = (raw) => mpPaymentError(raw, '123')

  it('traduce 404 (pago de otro entorno) a 404 y no a 500', () => {
    const err = mapped({ message: 'Payment not found', error: 'not_found', status: 404 })
    assert.ok(err instanceof HttpError)
    assert.equal(err.status, 404)
    assert.equal(err.expose, true)
  })

  it('credenciales rechazadas → 502 con mensaje visible', () => {
    const err = mapped({ message: 'invalid access token', status: 401 })
    assert.equal(err.status, 502)
    assert.equal(err.expose, true)
    assert.doesNotMatch(err.message, /access token/i, 'no filtra el detalle de MP')
  })

  it('rate limit y 5xx de MP → 503 reintentable', () => {
    assert.equal(mapped({ status: 429 }).status, 503)
    assert.equal(mapped({ status: 503 }).status, 503)
  })

  it('un fallo de red sin status → 504', () => {
    const err = mapped(new TypeError('fetch failed'))
    assert.equal(err.status, 504)
    assert.equal(err.expose, true)
  })
})

describe('requireSameOrigin', () => {
  const config = { clientUrl: 'https://www.scrolllab.com.ar', isProd: true }

  function run(headers, { method = 'POST', path = '/api/checkout/confirm' } = {}) {
    const result = { status: null, body: null, nexted: false }
    const res = {
      status(code) {
        result.status = code
        return res
      },
      json(body) {
        result.body = body
        return res
      },
    }
    requireSameOrigin(config)({ method, path, headers }, res, () => {
      result.nexted = true
    })
    return result
  }

  it('acepta el origin canónico', () => {
    assert.equal(run({ origin: 'https://www.scrolllab.com.ar' }).nexted, true)
  })

  it('acepta el apex del mismo dominio (retorno de Mercado Pago)', () => {
    assert.equal(run({ origin: 'https://scrolllab.com.ar' }).nexted, true)
    assert.equal(run({ referer: 'https://scrolllab.com.ar/checkout/success' }).nexted, true)
  })

  it('rechaza otros dominios y subdominios ajenos', () => {
    assert.equal(run({ origin: 'https://evil.example' }).status, 403)
    assert.equal(run({ origin: 'https://scrolllab.com.ar.evil.example' }).status, 403)
    assert.equal(run({ origin: 'http://www.scrolllab.com.ar' }).status, 403)
    assert.equal(run({ referer: 'https://evil.example/x' }).status, 403)
  })

  it('rechaza mutaciones sin Origin ni Referer en producción', () => {
    assert.equal(run({}).status, 403)
  })

  it('deja pasar GET y el webhook de MP', () => {
    assert.equal(run({ origin: 'https://evil.example' }, { method: 'GET' }).nexted, true)
    assert.equal(
      run({ origin: 'https://api.mercadopago.com' }, { path: '/api/webhooks/mercadopago' })
        .nexted,
      true,
    )
  })
})

/**
 * Un checkout abandonado no puede quedarse para siempre en Mis compras, pero
 * tampoco se puede tirar una compra: el efectivo se acredita días después.
 */
describe('retención de órdenes pendientes', () => {
  const NOW = Date.parse('2026-07-31T20:00:00Z')
  const agedHours = (h) => ({
    status: 'pending',
    createdAt: new Date(NOW - h * 3600_000).toISOString(),
  })

  it('muestra la pendiente recién creada', () => {
    assert.equal(isStalePending(agedHours(0), NOW), false)
    assert.equal(isStalePending(agedHours(1), NOW), false)
  })

  it('esconde la pendiente vencida', () => {
    assert.equal(isStalePending(agedHours(3), NOW), true)
    assert.equal(isStalePending(agedHours(72), NOW), true)
  })

  it('nunca esconde una compra paga, por vieja que sea', () => {
    const paid = { ...agedHours(24 * 365), status: 'paid' }
    assert.equal(isStalePending(paid, NOW), false)
  })

  it('ante una fecha ilegible prefiere mostrar', () => {
    assert.equal(isStalePending({ status: 'pending' }, NOW), false)
    assert.equal(isStalePending({ status: 'pending', createdAt: 'ayer' }, NOW), false)
  })

  it('filtra la lista dejando pagas y pendientes recientes', () => {
    const orders = [
      { id: 'a', ...agedHours(0) },
      { id: 'b', ...agedHours(48) },
      { id: 'c', ...agedHours(48), status: 'paid' },
    ]
    assert.deepEqual(
      visibleOrders(orders, NOW).map((o) => o.id),
      ['a', 'c'],
    )
  })

  it('el TTL sobrevive a los pagos en efectivo, que tardan días', () => {
    assert.ok(PENDING_RETENTION_MS > PENDING_VISIBLE_MS)
    assert.ok(PENDING_RETENTION_MS >= 3 * 24 * 3600_000)
    assert.equal(
      pendingExpiresAt(NOW).getTime(),
      NOW + PENDING_RETENTION_MS,
    )
  })
})

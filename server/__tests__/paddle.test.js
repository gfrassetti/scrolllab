import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  verifyPaddleSignature,
  buildOrderTransactionBody,
  buildSubscriptionTransactionBody,
  labPrice,
  transactionItemsCents,
  daysUntil,
  usdCents,
  centsToUsd,
  paddleRequest,
  PaddleError,
} from '../services/paddle.js'
import { loadPaddleConfig } from '../config.js'
import { requestCountry } from '../http/routes/checkout.js'
import { discountedUsdOrNull } from '../../src/domain/catalog.js'
import {
  buildOrderPaymentFailed,
  buildOrderReceiptEn,
  buildSubscriptionCharge,
  buildSubscriptionPaymentFailed,
  money,
} from '../services/emailTemplatesBilling.js'
import {
  buildOrderReceipt,
  buildSubscriptionWelcome,
  buildSubscriptionTrialReminder,
} from '../services/emailTemplates.js'
import { hostedPlanPriceIn, HOSTED_PLANS } from '../catalog.js'

/**
 * Paddle sin red ni base: la firma de los webhooks, cómo se arman las
 * transacciones (montos en centavos, moneda, custom_data, prueba), la
 * configuración por entorno, el mapeo de errores de la API y los mails de
 * cobro en los dos idiomas. Los recorridos completos están en
 * paddleCheckout.test.js y paddleSubscriptions.test.js.
 */

const SECRET = 'pdl_ntfset_unit_secret'
const sign = (body, ts = Math.floor(Date.now() / 1000), secret = SECRET) =>
  `ts=${ts};h1=${crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex')}`

describe('verifyPaddleSignature', () => {
  const body = JSON.stringify({ event_type: 'transaction.completed', data: { id: 'txn_1' } })

  it('acepta la firma de Paddle sobre el body crudo (string o Buffer)', () => {
    verifyPaddleSignature({ rawBody: body, header: sign(body), secret: SECRET })
    verifyPaddleSignature({ rawBody: Buffer.from(body), header: sign(body), secret: SECRET })
  })

  it('rechaza un body tocado, aunque sea un espacio', () => {
    assert.throws(
      () => verifyPaddleSignature({ rawBody: `${body} `, header: sign(body), secret: SECRET }),
      (err) => err.status === 401,
    )
  })

  it('rechaza otro secreto', () => {
    assert.throws(
      () => verifyPaddleSignature({ rawBody: body, header: sign(body, undefined, 'otro'), secret: SECRET }),
      (err) => err.status === 401,
    )
  })

  it('rechaza una firma vieja (repetición) y una del futuro', () => {
    const now = Date.now()
    const old = Math.floor(now / 1000) - 600
    assert.throws(
      () => verifyPaddleSignature({ rawBody: body, header: sign(body, old), secret: SECRET, now }),
      (err) => err.status === 401 && /vencida/.test(err.message),
    )
    const future = Math.floor(now / 1000) + 600
    assert.throws(
      () => verifyPaddleSignature({ rawBody: body, header: sign(body, future), secret: SECRET, now }),
      (err) => err.status === 401,
    )
  })

  it('con dos h1 (rotación de secreto) alcanza con que uno valga', () => {
    const ts = Math.floor(Date.now() / 1000)
    const good = sign(body, ts).split('h1=')[1]
    const header = `ts=${ts};h1=${'0'.repeat(64)};h1=${good}`
    verifyPaddleSignature({ rawBody: body, header, secret: SECRET })
  })

  it('header ausente o mal formado → 401; sin secreto configurado → 500', () => {
    for (const header of [undefined, '', 'h1=abc', 'ts=abc;h1=00', 'ts=1;h1=zz']) {
      assert.throws(
        () => verifyPaddleSignature({ rawBody: body, header, secret: SECRET }),
        (err) => err.status === 401,
        String(header),
      )
    }
    assert.throws(
      () => verifyPaddleSignature({ rawBody: body, header: sign(body), secret: '' }),
      (err) => err.status === 500,
    )
  })
})

describe('transacciones de Paddle', () => {
  it('una orden: un ítem non-catalog por línea, centavos como string, USD y custom_data', () => {
    const body = buildOrderTransactionBody({
      orderId: 'a'.repeat(24),
      userId: 'u1',
      lines: [
        { sku: 'chapters', title: 'CHAPTERS', description: 'Editorial', unit_price: 149, picture: '/p/chapters.png' },
        { sku: 'custom:x', title: 'Composición', unit_price: 134.1 },
      ],
      taxCategory: 'standard',
      clientUrl: 'https://www.scrolllab.com.ar',
    })
    assert.equal(body.currency_code, 'USD')
    assert.deepEqual(body.custom_data, { kind: 'order', orderId: 'a'.repeat(24), userId: 'u1' })
    assert.equal(body.items.length, 2)
    assert.deepEqual(body.items[0].price.unit_price, { amount: '14900', currency_code: 'USD' })
    assert.equal(body.items[1].price.unit_price.amount, '13410')
    assert.equal(body.items[0].price.product.tax_category, 'standard')
    assert.equal(body.items[0].price.product.image_url, 'https://www.scrolllab.com.ar/p/chapters.png')
    assert.deepEqual(body.items[0].price.quantity, { minimum: 1, maximum: 1 })
  })

  it('sin https (dev) no manda imagen: Paddle la rechazaría', () => {
    const body = buildOrderTransactionBody({
      orderId: 'o',
      userId: 'u',
      lines: [{ sku: 'chapters', title: 'CHAPTERS', unit_price: 149, picture: '/p.png' }],
      taxCategory: 'standard',
      clientUrl: 'http://localhost:5173',
    })
    assert.equal(JSON.parse(JSON.stringify(body)).items[0].price.product.image_url, undefined)
  })

  it('LAB: precio recurrente mensual / anual, con prueba solo si hay días', () => {
    const monthly = labPrice({ tier: 'pro', cycle: 'monthly', amountUsd: 79, taxCategory: 'saas' })
    assert.deepEqual(monthly.billing_cycle, { interval: 'month', frequency: 1 })
    assert.equal(monthly.trial_period, undefined)
    assert.equal(monthly.unit_price.amount, '7900')
    const yearly = labPrice({ tier: 'pro', cycle: 'yearly', amountUsd: 790, taxCategory: 'saas', trialDays: 7 })
    assert.deepEqual(yearly.billing_cycle, { interval: 'year', frequency: 1 })
    assert.deepEqual(yearly.trial_period, { interval: 'day', frequency: 7 })
    assert.equal(yearly.product.tax_category, 'saas')

    const body = buildSubscriptionTransactionBody({
      subscriptionId: 's1',
      userId: 'u1',
      plan: 'hosted_pro',
      tier: 'pro',
      cycle: 'monthly',
      amountUsd: 79,
      trialDays: 7,
      taxCategory: 'saas',
    })
    assert.deepEqual(body.custom_data, {
      kind: 'lab',
      subscriptionId: 's1',
      userId: 'u1',
      plan: 'hosted_pro',
      cycle: 'monthly',
    })
    assert.equal(body.items[0].price.trial_period.frequency, 7)
  })

  it('suma de precios en centavos y días hasta una fecha', () => {
    const txn = {
      items: [
        { quantity: 1, price: { unit_price: { amount: '14900' } } },
        { quantity: 2, price: { unit_price: { amount: '100' } } },
      ],
    }
    assert.equal(transactionItemsCents(txn), 15100)
    assert.ok(Number.isNaN(transactionItemsCents({ items: [{ price: {} }] })))
    const now = Date.parse('2026-10-01T00:00:00Z')
    assert.equal(daysUntil('2026-10-08T00:00:00Z', now), 7)
    assert.equal(daysUntil('2026-10-08T00:00:01Z', now), 8)
    assert.equal(daysUntil('2026-09-01T00:00:00Z', now), 0)
    assert.equal(daysUntil(null, now), 0)
    assert.equal(usdCents(134.1), 13410)
    assert.equal(usdCents(0.1 + 0.2), 30)
    assert.equal(centsToUsd(13410), 134.1)
  })

  it('cupón en USD: descuenta en centavos (lo mismo en el carrito y en el servidor)', () => {
    assert.equal(discountedUsdOrNull(149, 10), 134.1)
    assert.equal(discountedUsdOrNull(389, 10), 350.1)
    assert.equal(discountedUsdOrNull(149, 100), null)
    assert.equal(discountedUsdOrNull(Number.NaN, 10), null)
  })
})

describe('loadPaddleConfig', () => {
  const sandbox = {
    PADDLE_API_KEY: 'pdl_sdbx_apikey_x',
    PADDLE_CLIENT_TOKEN: 'test_x',
    PADDLE_WEBHOOK_SECRET: 'whsec',
  }

  it('sin key está apagado (y el mock solo en dev)', () => {
    assert.equal(loadPaddleConfig({}, false).enabled, false)
    const mock = loadPaddleConfig({ PADDLE_MOCK_ENABLED: 'true' }, false)
    assert.equal(mock.enabled, true)
    assert.equal(mock.mock, true)
    assert.throws(() => loadPaddleConfig({ PADDLE_MOCK_ENABLED: 'true' }, true), /producción/)
  })

  it('sandbox por defecto, con su API', () => {
    const c = loadPaddleConfig(sandbox, false)
    assert.equal(c.enabled, true)
    assert.equal(c.mock, false)
    assert.equal(c.environment, 'sandbox')
    assert.equal(c.apiBase, 'https://sandbox-api.paddle.com')
    assert.deepEqual(c.taxCategory, { template: 'standard', lab: 'saas' })
  })

  it('una key o un token del otro entorno no arranca', () => {
    assert.throws(() => loadPaddleConfig({ ...sandbox, PADDLE_API_KEY: 'pdl_live_apikey_x' }, false), /sandbox/)
    assert.throws(() => loadPaddleConfig({ ...sandbox, PADDLE_CLIENT_TOKEN: 'live_x' }, false), /sandbox/)
    assert.throws(
      () => loadPaddleConfig({ ...sandbox, PADDLE_ENV: 'production' }, false),
      /production/,
    )
    assert.throws(() => loadPaddleConfig({ PADDLE_ENV: 'staging' }, false), /PADDLE_ENV/)
  })

  it('en producción exige live, token y secreto', () => {
    assert.throws(() => loadPaddleConfig(sandbox, true), /production/)
    const live = {
      PADDLE_ENV: 'production',
      PADDLE_API_KEY: 'pdl_live_apikey_x',
      PADDLE_CLIENT_TOKEN: 'live_x',
      PADDLE_WEBHOOK_SECRET: 'whsec',
    }
    assert.equal(loadPaddleConfig(live, true).apiBase, 'https://api.paddle.com')
    assert.throws(() => loadPaddleConfig({ ...live, PADDLE_WEBHOOK_SECRET: '' }, true), /WEBHOOK/)
    assert.throws(() => loadPaddleConfig({ ...live, PADDLE_CLIENT_TOKEN: '' }, true), /CLIENT_TOKEN/)
  })
})

describe('paddleRequest', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
  })
  const config = { paddle: { apiBase: 'https://sandbox-api.paddle.com', apiKey: 'pdl_sdbx_apikey_k' } }

  it('manda la key y la versión, y devuelve `data`', async () => {
    let seen
    globalThis.fetch = async (url, init) => {
      seen = { url, headers: new Headers(init.headers), body: init.body }
      return new Response(JSON.stringify({ data: { id: 'txn_1' } }), { status: 201 })
    }
    const data = await paddleRequest(config, 'POST', '/transactions', { a: 1 })
    assert.deepEqual(data, { id: 'txn_1' })
    assert.equal(seen.url, 'https://sandbox-api.paddle.com/transactions')
    assert.equal(seen.headers.get('authorization'), 'Bearer pdl_sdbx_apikey_k')
    assert.equal(seen.headers.get('paddle-version'), '1')
    assert.equal(seen.body, '{"a":1}')
  })

  it('un 4xx sale con su status y su code; un 5xx o la red caída, 502', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error: { code: 'bad_request', detail: 'x', errors: [{ field: 'items', message: 'vacío' }] } }),
        { status: 400 },
      )
    await assert.rejects(paddleRequest(config, 'POST', '/transactions', {}), (err) => {
      assert.ok(err instanceof PaddleError)
      assert.equal(err.status, 400)
      assert.equal(err.code, 'bad_request')
      assert.match(err.message, /items: vacío/)
      return true
    })
    globalThis.fetch = async () => new Response('oops', { status: 503 })
    await assert.rejects(paddleRequest(config, 'GET', '/x'), (err) => err.status === 502)
    globalThis.fetch = async () => {
      throw new Error('ECONNRESET')
    }
    await assert.rejects(paddleRequest(config, 'GET', '/x'), (err) => err.status === 502)
  })

  it('sin key no llama a nada (503)', async () => {
    await assert.rejects(
      paddleRequest({ paddle: { apiBase: 'x', apiKey: '' } }, 'GET', '/x'),
      (err) => err.status === 503,
    )
  })
})

describe('país del request', () => {
  const req = (headers) => ({ headers })
  it('lee Vercel o Cloudflare y descarta lo que no es un país', () => {
    assert.equal(requestCountry(req({ 'x-vercel-ip-country': 'es' })), 'ES')
    assert.equal(requestCountry(req({ 'cf-ipcountry': 'AR' })), 'AR')
    assert.equal(requestCountry(req({ 'cf-ipcountry': 'XX' })), null)
    assert.equal(requestCountry(req({ 'x-vercel-ip-country': 'ESP' })), null)
    assert.equal(requestCountry(req({})), null)
  })
})

describe('mails de cobro', () => {
  const user = { name: 'Ana <b>', email: 'ana@test.com' }
  const order = {
    id: 'b'.repeat(24),
    provider: 'paddle',
    currency_id: 'USD',
    locale: 'en',
    total: 134.1,
    items: [{ sku: 'chapters', title: 'CHAPTERS', unit_price: 134.1, currency_id: 'USD' }],
  }

  it('USD con centavos solo si los hay; ARS sin decimales', () => {
    assert.equal(money(149, 'USD', 'en'), '$149')
    assert.equal(money(134.1, 'USD', 'en'), '$134.10')
    assert.match(money(232000, 'ARS', 'es'), /232\.000/)
  })

  it('pago rechazado en inglés: no se cobró, el carrito sigue, botón al carrito; HTML escapado', () => {
    const m = buildOrderPaymentFailed({ order, user, retryUrl: 'https://x/cart', logoUrl: 'https://x/l.svg' })
    assert.match(m.subject, /couldn’t process your payment/)
    assert.match(m.text, /haven’t been charged/)
    assert.match(m.text, /\$134\.10/)
    assert.match(m.html, /href="https:\/\/x\/cart"/)
    assert.match(m.html, /<html lang="en">/)
    assert.ok(!m.html.includes('Ana <b>'))
    assert.ok(m.html.includes('Ana &lt;b&gt;'))
  })

  it('pago rechazado en español nombra a Mercado Pago si fue MP', () => {
    const m = buildOrderPaymentFailed({
      order: { ...order, provider: 'mercadopago', currency_id: 'ARS', locale: 'es', total: 232000, items: [] },
      user,
      retryUrl: 'https://x/cart',
      logoUrl: 'l',
    })
    assert.match(m.subject, /No pudimos procesar tu pago/)
    assert.match(m.text, /Mercado Pago rechazó/)
    assert.match(m.text, /no se te cobró nada/)
  })

  it('recibo: inglés con la nota de Paddle; español con la nota si cobró Paddle', () => {
    const en = buildOrderReceipt({ order, user, accountUrl: 'https://x/account', logoUrl: 'l' })
    assert.match(en.subject, /Your SCROLLLAB purchase/)
    assert.match(en.text, /Paddle\.com/)
    assert.match(en.text, /\$134\.10/)
    assert.deepEqual(en, buildOrderReceiptEn({ order, user, accountUrl: 'https://x/account', logoUrl: 'l' }))

    const es = buildOrderReceipt({ order: { ...order, locale: 'es' }, user, accountUrl: 'a', logoUrl: 'l' })
    assert.match(es.subject, /Tu compra en SCROLLLAB/)
    assert.match(es.text, /Paddle\.com, nuestro revendedor autorizado/)
    assert.match(es.text, /US\$\s?134,10/)

    const mp = buildOrderReceipt({
      order: { ...order, locale: 'es', provider: 'mercadopago', currency_id: 'ARS', total: 232000 },
      user,
      accountUrl: 'a',
      logoUrl: 'l',
    })
    assert.ok(!mp.text.includes('Paddle'))
  })

  const sub = {
    id: 'c'.repeat(24),
    plan: 'hosted_pro',
    cycle: 'monthly',
    provider: 'paddle',
    currency_id: 'USD',
    locale: 'es',
    status: 'authorized',
    currentPeriodEnd: '2026-12-08T15:00:00.000Z',
  }

  it('LAB en USD: la bienvenida y el aviso de prueba muestran el precio de Paddle', () => {
    assert.equal(hostedPlanPriceIn('hosted_pro', 'monthly', 'USD'), HOSTED_PLANS.hosted_pro.priceMonthlyUsd)
    assert.equal(hostedPlanPriceIn('hosted_pro', 'yearly', 'ARS'), HOSTED_PLANS.hosted_pro.priceYearly)
    const welcome = buildSubscriptionWelcome({ subscription: sub, user, accountUrl: 'a', logoUrl: 'l' })
    assert.match(welcome.text, /US\$\s?79/)
    const reminder = buildSubscriptionTrialReminder({
      subscription: { ...sub, trialEndsAt: '2026-10-08T15:00:00.000Z', locale: 'en' },
      user,
      accountUrl: 'a',
      logoUrl: 'l',
    })
    assert.match(reminder.subject, /free trial ends/)
    assert.match(reminder.text, /\$79/)
  })

  it('cuota cobrada y cuota rechazada, con la gracia y el link de la tarjeta', () => {
    const charge = buildSubscriptionCharge({
      subscription: { ...sub, locale: 'en' },
      user,
      accountUrl: 'https://x/lab',
      logoUrl: 'l',
      charge: { amount: 95.59, currency: 'USD', paidAt: '2026-11-08T15:00:00.000Z' },
    })
    assert.match(charge.subject, /We received your ScrollLab LAB payment · Pro/)
    assert.match(charge.text, /\$95\.59/)
    assert.match(charge.text, /Next charge: December 8, 2026/)
    assert.match(charge.text, /Paddle\.com/)

    const failed = buildSubscriptionPaymentFailed({
      subscription: sub,
      user,
      accountUrl: 'https://x/lab',
      logoUrl: 'l',
      stage: 'renewal',
      updateUrl: 'https://portal/update',
      graceEndsAt: '2026-12-15T15:00:00.000Z',
    })
    assert.match(failed.subject, /No pudimos cobrar tu plan Pro/)
    assert.match(failed.text, /hasta el 15 de diciembre de 2026/)
    assert.match(failed.html, /href="https:\/\/portal\/update"/)

    const checkout = buildSubscriptionPaymentFailed({
      subscription: { ...sub, status: 'pending', locale: 'en' },
      user,
      accountUrl: 'https://x/lab',
      logoUrl: 'l',
      stage: 'checkout',
    })
    assert.match(checkout.subject, /didn’t start/)
    assert.match(checkout.html, /href="https:\/\/x\/lab"/)
  })
})

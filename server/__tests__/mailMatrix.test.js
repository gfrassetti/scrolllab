import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildOrderReceipt,
  buildSubscriptionWelcome,
  buildSubscriptionCanceled,
  buildSubscriptionTrialReminder,
  buildCouponEmail,
} from '../services/emailTemplates.js'
import {
  buildOrderPaymentFailed,
  buildWithdrawalReceived,
  buildSubscriptionCharge,
  buildSubscriptionPaymentFailed,
  buildRefundIssued,
  buildWithdrawalConfirm,
  buildSubscriptionSuspended,
  buildSubscriptionPlanChanged,
} from '../services/emailTemplatesBilling.js'
import { HOSTED_PLANS } from '../catalog.js'

/**
 * La matriz de mails al cliente: cada evento, en español e inglés, cobrado por
 * Mercado Pago (ARS) y por Paddle (USD). Cada mail tiene que salir completo
 * (asunto, html y texto), sin nada roto («undefined», «NaN», «Invalid Date»,
 * «null», una llave `{{…}}` sin reemplazar), en el idioma que corresponde y con
 * el monto en su moneda. Los tests de cada flujo verifican CUÁNDO sale cada uno
 * y que sale una sola vez; este, que lo que sale está bien escrito.
 */

const DAY = 86_400_000
const urls = { accountUrl: 'https://www.scrolllab.com.ar/account', logoUrl: 'https://www.scrolllab.com.ar/logo.svg' }
const user = { name: 'Ana Pérez', email: 'ana@test.com' }

// Cómo se escribe el monto en cada idioma: «$ 210.000» / «ARS 210,000»,
// «US$ 134,10» / «$134.10».
const PROVIDERS = [
  { provider: 'mercadopago', currency: 'ARS', amount: 210000, money: { es: /\$\s?210\.000/, en: /ARS\s?210,000/ } },
  { provider: 'paddle', currency: 'USD', amount: 134.1, money: { es: /US\$\s?134,10/, en: /\$134\.10/ } },
]
const LANGS = [
  { locale: 'es', word: /tu|Tu/ },
  { locale: 'en', word: /your|Your/ },
]

function assertClean(mail, label) {
  assert.ok(mail.subject && mail.html && mail.text, `${label}: falta asunto, html o texto`)
  for (const part of [mail.subject, mail.text, mail.html]) {
    assert.doesNotMatch(part, /\bundefined\b|\bNaN\b|Invalid Date|\{\{|\}\}|>null<| null\b/, `${label}: ${part.slice(0, 160)}`)
  }
}

const order = (p, locale) => ({
  id: 'o1234567890abcdef12345678',
  locale,
  provider: p.provider,
  currency_id: p.currency,
  total: p.amount,
  discountPct: 10,
  fxRate: 1560,
  items: [{ sku: 'chapters', title: 'CHAPTERS — template', unit_price: p.amount, unit_price_usd: 149 }],
})
const sub = (p, locale, extra = {}) => ({
  id: 's1',
  locale,
  provider: p.provider,
  currency_id: p.currency,
  plan: 'hosted_pro',
  cycle: 'monthly',
  status: 'authorized',
  activatedAt: new Date(Date.now() - 10 * DAY),
  currentPeriodEnd: new Date(Date.now() + 20 * DAY),
  ...extra,
})

describe('matriz de mails al cliente (es/en · Mercado Pago/Paddle)', () => {
  for (const p of PROVIDERS) {
    for (const l of LANGS) {
      const tag = `${p.provider}/${l.locale}`
      const plan = HOSTED_PLANS.hosted_pro
      const planPrice = p.currency === 'USD' ? /79/ : new RegExp(String(plan.priceMonthly).slice(0, 2))

      it(`${tag}: compra — recibo con el monto y el descuento`, () => {
        const mail = buildOrderReceipt({ order: order(p, l.locale), user, ...urls })
        assertClean(mail, 'recibo')
        assert.match(mail.text, p.money[l.locale])
        assert.match(mail.text, l.locale === 'en' ? /First-purchase discount/ : /Descuento de primera compra/)
      })

      it(`${tag}: compra — pago rechazado`, () => {
        const mail = buildOrderPaymentFailed({ order: order(p, l.locale), user, retryUrl: 'https://x/cart', logoUrl: urls.logoUrl })
        assertClean(mail, 'rechazo')
        assert.match(mail.text, p.money[l.locale])
      })

      it(`${tag}: devolución total y parcial, de compra y de LAB`, () => {
        for (const [kind, partial] of [['order', false], ['order', true], ['lab', false]]) {
          const mail = buildRefundIssued({ name: 'Ana', locale: l.locale, amount: p.amount, currency: p.currency, provider: p.provider, what: 'CHAPTERS', kind, partial, ...urls })
          assertClean(mail, `devolución ${kind}${partial ? ' parcial' : ''}`)
          assert.match(mail.text, p.money[l.locale])
          assert.match(mail.text, p.provider === 'paddle' ? /Paddle/ : /Mercado Pago/)
        }
      })

      it(`${tag}: arrepentimiento — código y link de confirmación`, () => {
        const received = buildWithdrawalReceived({ code: 'ARR-ABCDEF', name: 'Ana', locale: l.locale, order: order(p, l.locale), refundsUrl: 'https://x/legal/refunds', logoUrl: urls.logoUrl })
        assertClean(received, 'arrepentimiento recibido')
        assert.match(received.text, /ARR-ABCDEF/)
        const confirm = buildWithdrawalConfirm({ code: 'ARR-ABCDEF', name: 'Ana', locale: l.locale, what: 'CHAPTERS', amount: p.amount, currency: p.currency, kind: 'order', confirmUrl: 'https://x/arrepentimiento?confirmar=t', logoUrl: urls.logoUrl })
        assertClean(confirm, 'confirmar devolución')
        assert.match(confirm.text, p.money[l.locale])
        assert.match(confirm.text, /confirmar=t/)
      })

      it(`${tag}: LAB — bienvenida, aviso de fin de prueba, cobro, rechazo, suspensión, cambio de plan y baja`, () => {
        const trial = sub(p, l.locale, { trialEndsAt: new Date(Date.now() + 2 * DAY), currentPeriodEnd: new Date(Date.now() + 2 * DAY) })
        const mails = {
          bienvenida: buildSubscriptionWelcome({ subscription: trial, user, ...urls }),
          'fin de prueba': buildSubscriptionTrialReminder({ subscription: trial, user, ...urls }),
          cobro: buildSubscriptionCharge({ subscription: sub(p, l.locale), user, ...urls, charge: { amount: p.amount, currency: p.currency, paidAt: new Date() } }),
          'cuota rechazada': buildSubscriptionPaymentFailed({ subscription: sub(p, l.locale), user, ...urls, graceEndsAt: new Date(Date.now() + 7 * DAY) }),
          suspensión: buildSubscriptionSuspended({ subscription: sub(p, l.locale), user, ...urls }),
          'cambio de plan': buildSubscriptionPlanChanged({ subscription: sub(p, l.locale), user, ...urls, change: { from: 'hosted_starter', charged: p.amount } }),
          baja: buildSubscriptionCanceled({ subscription: sub(p, l.locale, { canceledAt: new Date() }), user, ...urls }),
        }
        for (const [label, mail] of Object.entries(mails)) {
          assertClean(mail, label)
          assert.match(mail.subject + mail.text, l.word, `${label}: idioma`)
        }
        assert.match(mails.cobro.text, p.money[l.locale])
        assert.match(mails['cambio de plan'].text, p.money[l.locale])
        assert.match(mails['cambio de plan'].text, planPrice)
      })
    }
  }

  it('cupón de bienvenida, en los dos idiomas', () => {
    for (const locale of ['es', 'en']) {
      const mail = buildCouponEmail({ code: 'SL-ABCDEF', percent: 10, expiresAt: null, email: 'ana@test.com', locale, shopUrl: 'https://x', logoUrl: urls.logoUrl })
      assertClean(mail, `cupón ${locale}`)
      assert.match(mail.text, /10%/)
    }
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PRICE_NOTICE_DAYS,
  YEARLY_REMINDER_DAYS,
  HOSTED_PRICE_CHANGES,
  affectedBy,
  applyDecision,
  earliestEffectiveAt,
  needsYearlyReminder,
  priceChangeKind,
  validatePriceChanges,
} from '../../src/domain/priceChanges.js'
import { HOSTED_PLANS, hostedPlanPriceIn } from '../catalog.js'

const DAY = 86400000
const up = { id: 'pro-m-ars', plan: 'hosted_pro', cycle: 'monthly', currency: 'ARS', from: 99900, to: 129900, announcedOn: '2026-11-01' }
const down = { ...up, id: 'pro-m-ars-down', from: 129900, to: 89900 }
const yearly = { ...up, id: 'pro-y-ars', cycle: 'yearly', from: 999000, to: 1299000 }
const sub = { plan: 'hosted_pro', cycle: 'monthly', currency_id: 'ARS', status: 'authorized' }
const sent = '2026-11-02T12:00:00.000Z'

describe('priceChanges — a quién le toca', () => {
  it('suba: a quien paga menos que el precio nuevo, mismo plan, ciclo y moneda', () => {
    assert.equal(priceChangeKind(up), 'increase')
    assert.equal(affectedBy(up, sub, 99900), true)
    assert.equal(affectedBy(up, sub, 129900), false, 'ya paga el nuevo: entró después')
    assert.equal(affectedBy(up, sub, 150000), false, 'una suba nunca baja a quien paga más')
    assert.equal(affectedBy(up, { ...sub, cycle: 'yearly' }, 99900), false)
    assert.equal(affectedBy(up, { ...sub, plan: 'hosted_starter' }, 99900), false)
    assert.equal(affectedBy(up, { ...sub, currency_id: 'USD' }, 99900), false)
  })
  it('baja: a quien paga más que el precio nuevo', () => {
    assert.equal(priceChangeKind(down), 'decrease')
    assert.equal(affectedBy(down, sub, 129900), true)
    assert.equal(affectedBy(down, sub, 89900), false)
  })
  it('no a canceladas, pendientes, de prueba (qa) ni sin monto conocido', () => {
    assert.equal(affectedBy(up, { ...sub, canceledAt: new Date() }, 99900), false)
    assert.equal(affectedBy(up, { ...sub, status: 'pending' }, 99900), false)
    assert.equal(affectedBy(up, { ...sub, qa: true }, 99900), false)
    assert.equal(affectedBy(up, sub, null), false)
    assert.equal(affectedBy(up, { ...sub, status: 'paused' }, 99900), true, 'pausada: al reanudar pagaría el nuevo')
  })
})

describe('priceChanges — cuándo rige', () => {
  it(`suba: ${PRICE_NOTICE_DAYS} días después de que SALIÓ el mail; baja: ya`, () => {
    assert.equal(earliestEffectiveAt(up, sent).getTime(), Date.parse(sent) + PRICE_NOTICE_DAYS * DAY)
    assert.equal(earliestEffectiveAt(down, sent).getTime(), Date.parse(sent))
  })
  it('sin mail enviado no hay precio nuevo', () => {
    assert.equal(earliestEffectiveAt(up, null), null)
    assert.equal(applyDecision({ change: up, emailSentAt: null, nextChargeAt: '2027-01-01' }), 'no-email')
  })
  it('se aplica después del último cobro a precio viejo: si el próximo cae antes de los 15 días, espera', () => {
    const before = new Date(Date.parse(sent) + 10 * DAY)
    const after = new Date(Date.parse(sent) + 20 * DAY)
    assert.equal(applyDecision({ change: up, emailSentAt: sent, nextChargeAt: before }), 'wait')
    assert.equal(applyDecision({ change: up, emailSentAt: sent, nextChargeAt: after }), 'apply')
    assert.equal(applyDecision({ change: up, emailSentAt: sent, nextChargeAt: after, appliedAt: new Date() }), 'wait')
  })
  it('baja: el próximo cobro ya va con el precio nuevo', () => {
    const tomorrow = new Date(Date.parse(sent) + DAY)
    assert.equal(applyDecision({ change: down, emailSentAt: sent, nextChargeAt: tomorrow }), 'apply')
  })
  it('prueba gratis que termina antes de los 15 días: el primer cobro va al precio que le mostraron', () => {
    const trialEnd = new Date(Date.parse(sent) + 5 * DAY)
    assert.equal(applyDecision({ change: up, emailSentAt: sent, nextChargeAt: trialEnd }), 'wait')
  })
  it('sin fecha del proveedor, espera (no adivina)', () => {
    assert.equal(applyDecision({ change: up, emailSentAt: sent, nextChargeAt: null }), 'wait')
  })
})

describe('priceChanges — recordatorio del anual', () => {
  const nextCharge = '2027-09-01T12:00:00.000Z'
  const inWindow = new Date(Date.parse(nextCharge) - (YEARLY_REMINDER_DAYS - 5) * DAY)
  it('sale una vez, dentro de la ventana antes del cobro con el precio nuevo', () => {
    assert.equal(needsYearlyReminder({ change: yearly, emailSentAt: sent, nextChargeAt: nextCharge, now: inWindow }), true)
    assert.equal(
      needsYearlyReminder({ change: yearly, emailSentAt: sent, reminderSentAt: inWindow, nextChargeAt: nextCharge, now: inWindow }),
      false,
    )
  })
  it('no antes de la ventana, no si el aviso ya fue reciente, no en mensual ni en bajas', () => {
    const early = new Date(Date.parse(nextCharge) - 90 * DAY)
    assert.equal(needsYearlyReminder({ change: yearly, emailSentAt: sent, nextChargeAt: nextCharge, now: early }), false)
    const recentSent = new Date(Date.parse(nextCharge) - 30 * DAY)
    assert.equal(needsYearlyReminder({ change: yearly, emailSentAt: recentSent, nextChargeAt: nextCharge, now: inWindow }), false)
    assert.equal(needsYearlyReminder({ change: up, emailSentAt: sent, nextChargeAt: nextCharge, now: inWindow }), false)
    assert.equal(needsYearlyReminder({ change: { ...yearly, to: 900000 }, emailSentAt: sent, nextChargeAt: nextCharge, now: inWindow }), false)
  })
})

describe('priceChanges — la lista declarada', () => {
  const listPriceOf = (plan, cycle, currency) => (HOSTED_PLANS[plan] ? hostedPlanPriceIn(plan, cycle, currency) : null)
  it('la lista del repo es coherente con los precios de lista vigentes', () => {
    assert.deepEqual(validatePriceChanges(HOSTED_PRICE_CHANGES, listPriceOf), [])
  })
  it('detecta ids repetidos, cadenas rotas, to distinto de la lista y orden', () => {
    const p = HOSTED_PLANS.hosted_pro
    const a = { id: 'a', plan: 'hosted_pro', cycle: 'monthly', currency: 'ARS', from: 50000, to: 70000, announcedOn: '2026-11-01' }
    const b = { id: 'b', plan: 'hosted_pro', cycle: 'monthly', currency: 'ARS', from: 60000, to: p.priceMonthly, announcedOn: '2026-10-01' }
    const problems = validatePriceChanges([a, b, { ...a }], listPriceOf)
    assert.ok(problems.some((x) => /id repetido/.test(x)))
    assert.ok(problems.some((x) => /no es el to del anterior/.test(x)))
    assert.ok(problems.some((x) => /anunciado antes/.test(x)))
    assert.deepEqual(
      validatePriceChanges([{ ...a, to: 1 }], listPriceOf).filter((x) => /precio de lista vigente/.test(x)).length,
      1,
    )
  })
  it('una lista vacía no es un problema (no-op)', () => {
    assert.deepEqual(validatePriceChanges([], listPriceOf), [])
  })
})

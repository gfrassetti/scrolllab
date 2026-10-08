import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildLabFunnel } from '../services/labFunnel.js'

const NOW = new Date('2026-10-08T12:00:00Z')
const day = (n) => new Date(NOW.getTime() + n * 86400000)
const since = day(-30)

describe('buildLabFunnel — embudo de LAB para /admin', () => {
  const events = [
    { type: 'view', path: '/lab', vid: 'a', createdAt: day(-2) },
    { type: 'view', path: '/lab', vid: 'a', createdAt: day(-1) }, // mismo visitante
    { type: 'view', path: '/lab/edit/x', vid: 'b', createdAt: day(-1) },
    { type: 'view', path: '/laboratorio', vid: 'c', createdAt: day(-1) }, // no es /lab
    { type: 'click', path: '/lab', vid: 'd', createdAt: day(-1) }, // click, no visita
    { type: 'view', path: '/lab', vid: 'e', createdAt: day(-60) }, // fuera del rango
  ]
  const hosted = [
    { userId: 'u1', sectionId: 'kin/Rooms', status: 'published', createdAt: day(-5), publishedAt: day(-4), views: 10 },
    { userId: 'u1', sectionId: 'kin/Footer', status: 'draft', createdAt: day(-3) },
    { userId: 'u2', sectionId: 'kin/Rooms', status: 'published', createdAt: day(-90), publishedAt: day(-80), views: 5 },
    { userId: 'u3', sectionId: 'meridian/Footer', status: 'draft', createdAt: day(-1) },
  ]
  const subscriptions = [
    // u1: en prueba, termina en 3 días
    { userId: 'u1', plan: 'hosted_starter', cycle: 'monthly', status: 'authorized', activatedAt: day(-4), trialEndsAt: day(3), currentPeriodEnd: day(3) },
    // u2: pagó dentro del rango, plan pro anual
    { userId: 'u2', plan: 'hosted_pro', cycle: 'yearly', status: 'authorized', activatedAt: day(-20), trialEndsAt: day(-13), firstPaidAt: day(-13), currentPeriodEnd: day(300) },
    // u4: canceló dentro del rango y ya venció
    { userId: 'u4', plan: 'hosted_starter', cycle: 'monthly', status: 'cancelled', activatedAt: day(-100), firstPaidAt: day(-90), canceledAt: day(-10), currentPeriodEnd: day(-5) },
  ]
  const r = buildLabFunnel({ events, hosted, subscriptions, since, now: NOW })

  it('cuenta visitantes distintos de /lab (y sus subrutas) en el rango', () => {
    assert.equal(r.funnel[0].count, 2)
  })

  it('cuenta cuentas distintas por paso, no filas', () => {
    assert.deepEqual(
      r.funnel.map((f) => f.count),
      // pruebas: u1 y u2 (las dos activaron dentro del rango); pago: u2
      [2, 2, 1, 2, 1],
    )
  })

  it('el % de cada paso es respecto del anterior (desde el segundo)', () => {
    assert.equal(r.funnel[1].pctOfPrev, undefined)
    assert.equal(r.funnel[2].pctOfPrev, 50)
    assert.equal(r.funnel[4].pctOfPrev, 50)
  })

  it('separa prueba de pago y cuenta las pruebas que terminan pronto', () => {
    assert.equal(r.subscriptions.inTrial, 1)
    assert.equal(r.subscriptions.trialsEndingSoon, 1)
    assert.equal(r.subscriptions.paying, 1)
    assert.deepEqual(r.subscriptions.byPlan, { 'pro · anual': 1 })
    assert.equal(r.subscriptions.cancelledInWindow, 1)
  })

  it('widgets: publicados hoy, vistas de embed y los más usados', () => {
    assert.equal(r.widgets.publishedNow, 2)
    assert.equal(r.widgets.embedViews, 15)
    assert.equal(r.widgets.createdInWindow, 3)
    assert.deepEqual(r.widgets.topSections[0], { sectionId: 'kin/Rooms', count: 2 })
  })

  it('sin datos no rompe y da ceros', () => {
    const empty = buildLabFunnel({ since, now: NOW })
    assert.deepEqual(
      empty.funnel.map((f) => f.count),
      [0, 0, 0, 0, 0],
    )
    assert.equal(empty.funnel[2].pctOfPrev, null)
  })
})

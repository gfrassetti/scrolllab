import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSummary, summarizeLeads } from '../services/leadStats.js'

const leads = [
  { email: 'a@x.com', utmSource: 'instagram', utmCampaign: 'nocturne', couponRedeemedAt: '2026-09-20T00:00:00Z' },
  { email: 'b@x.com', utmSource: 'instagram', utmCampaign: 'nocturne' },
  { email: 'c@x.com', utmSource: 'instagram', utmCampaign: 'fizz' },
  { email: 'd@x.com', utmSource: 'tiktok', utmCampaign: 'fizz', couponRedeemedAt: '2026-09-21T00:00:00Z' },
  { email: 'e@x.com' },
]

describe('summarizeLeads', () => {
  const summary = summarizeLeads(leads)

  it('cuenta el total y los cupones canjeados', () => {
    assert.equal(summary.total, 5)
    assert.equal(summary.redeemed, 2)
    assert.equal(summary.redeemRate, 0.4)
  })

  it('agrupa por canal (más mails primero; a igual cantidad, el que más canjeó) y cuenta los que llegaron sin utm como "directo"', () => {
    assert.deepEqual(summary.byChannel, [
      { key: 'instagram', leads: 3, redeemed: 1 },
      { key: 'tiktok', leads: 1, redeemed: 1 },
      { key: 'directo', leads: 1, redeemed: 0 },
    ])
  })

  it('agrupa por campaña', () => {
    assert.deepEqual(
      summary.byCampaign.map((r) => [r.key, r.leads, r.redeemed]),
      [
        ['fizz', 2, 1],
        ['nocturne', 2, 1],
        ['—', 1, 0],
      ],
    )
  })

  it('sin leads no divide por cero', () => {
    const empty = summarizeLeads([])
    assert.equal(empty.total, 0)
    assert.equal(empty.redeemRate, 0)
    assert.deepEqual(empty.byChannel, [])
  })
})

describe('formatSummary', () => {
  it('arma el texto con porcentajes en formato es-AR', () => {
    const text = formatSummary(summarizeLeads(leads))
    assert.match(text, /Mails: 5 · cupones canjeados: 2 \(40,0%\)/)
    assert.match(text, /instagram\s+3 mails\s+1 cupones canjeados\s+33,3%/)
    assert.match(text, /Por campaña/)
  })

  it('avisa cuando todavía no hay nada', () => {
    assert.match(formatSummary(summarizeLeads([])), /todavía no hay/)
  })
})

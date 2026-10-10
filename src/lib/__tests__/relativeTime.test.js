import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatRelativeTime } from '../relativeTime.js'

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-10-10T12:00:00Z')

  it('menos de un minuto: el texto de «recién» de quien llama', () => {
    assert.equal(formatRelativeTime('2026-10-10T11:59:30Z', 'es', 'recién', now), 'recién')
  })

  it('minutos, horas y días en el idioma pedido', () => {
    assert.match(formatRelativeTime('2026-10-10T11:55:00Z', 'es', 'recién', now), /hace 5 minutos/)
    assert.match(formatRelativeTime('2026-10-10T09:00:00Z', 'en', 'just now', now), /3 hours ago/)
    assert.match(formatRelativeTime('2026-10-09T12:00:00Z', 'es', 'recién', now), /ayer/)
  })

  it('una fecha inválida no rompe', () => {
    assert.equal(formatRelativeTime('nope', 'es', 'recién', now), '')
  })
})

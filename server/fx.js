/**
 * Cotización USD → ARS para el checkout.
 *
 * Los precios del catálogo están en dólares (ver catalog.js) y se convierten
 * a pesos recién al crear la orden, porque Mercado Pago Argentina siempre
 * procesa en moneda local: mandar `currency_id: "USD"` solo delega la
 * conversión a una cotización de MP que no controlamos ni podemos auditar.
 *
 * La cotización se cachea, se le puede aplicar un spread y siempre hay un
 * valor de respaldo: una caída de la API externa no puede tumbar el checkout.
 */

const DEFAULT_URL = 'https://dolarapi.com/v1/dolares/blue'
const DEFAULT_FALLBACK_RATE = 1560
const DEFAULT_TTL_SECONDS = 900
const DEFAULT_TIMEOUT_MS = 5000

/** Rango sano para descartar respuestas corruptas de la API. */
const MIN_RATE = 100
const MAX_RATE = 10_000_000

let cache = null // { base, source, updatedAt, fetchedAt }

function num(raw, fallback) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

export function fxConfig() {
  return {
    url: process.env.FX_RATE_URL ?? DEFAULT_URL,
    spreadPct: num(process.env.FX_SPREAD_PCT, 0),
    fallbackRate: num(process.env.FX_FALLBACK_RATE, DEFAULT_FALLBACK_RATE),
    ttlMs: num(process.env.FX_CACHE_TTL_SECONDS, DEFAULT_TTL_SECONDS) * 1000,
    offline: process.env.FX_OFFLINE === 'true' || process.env.FX_OFFLINE === '1',
  }
}

/** Acepta el shape de dolarapi (`venta`) y de bluelytics (`value_sell`). */
export function extractRate(payload) {
  if (typeof payload === 'number') return payload
  if (!payload || typeof payload !== 'object') return null
  const candidates = [
    payload.venta,
    payload.value_sell,
    payload.blue?.value_sell,
    payload.oficial?.value_sell,
    payload.rate,
  ]
  for (const candidate of candidates) {
    const value = Number(candidate)
    if (Number.isFinite(value) && value >= MIN_RATE && value <= MAX_RATE) {
      return value
    }
  }
  return null
}

export function clearFxCache() {
  cache = null
}

/** Solo para tests: fija la cotización sin tocar la red. */
export function setFxCacheForTests(base, source = 'test') {
  cache = { base, source, updatedAt: new Date().toISOString(), fetchedAt: Date.now() }
}

async function fetchRate(url, timeoutMs) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`)
  const rate = extractRate(await res.json())
  if (rate == null) throw new Error('FX respuesta sin cotización usable')
  return rate
}

/**
 * Devuelve { rate, base, spreadPct, source, updatedAt, stale }.
 * `rate` ya tiene el spread aplicado y es el que se usa para cobrar.
 */
export async function getUsdArsRate() {
  const cfg = fxConfig()
  const fresh = cache && Date.now() - cache.fetchedAt < cfg.ttlMs

  if (!fresh && !cfg.offline && cfg.url) {
    try {
      const base = await fetchRate(cfg.url, DEFAULT_TIMEOUT_MS)
      cache = {
        base,
        source: cfg.url,
        updatedAt: new Date().toISOString(),
        fetchedAt: Date.now(),
      }
    } catch (err) {
      // Se sigue con el último valor conocido, o con el fallback.
      if (!cache) {
        console.error('FX rate fetch failed, usando fallback:', err.message)
      }
    }
  }

  const source = cache || {
    base: cfg.fallbackRate,
    source: 'fallback',
    updatedAt: null,
    fetchedAt: 0,
  }

  return {
    base: source.base,
    rate: source.base * (1 + cfg.spreadPct / 100),
    spreadPct: cfg.spreadPct,
    source: source.source,
    updatedAt: source.updatedAt,
    stale: !cache || Date.now() - cache.fetchedAt >= cfg.ttlMs,
  }
}

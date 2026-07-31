import { useEffect, useState } from 'react'
import { api } from './api'
import { FALLBACK_USD_ARS } from './pricing'

/**
 * Cotización USD→ARS que usa el servidor para cobrar. Se pide una sola vez por
 * sesión de página y se comparte entre componentes: el catálogo la necesita
 * para mostrar pesos, pero el precio real lo fija el checkout.
 */
let cached = null
let inFlight = null

function readRate(data) {
  const rate = Number(data?.fx?.rate)
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

export function fetchUsdArsRate() {
  if (cached != null) return Promise.resolve(cached)
  if (!inFlight) {
    inFlight = api
      .catalog()
      .then((data) => {
        cached = readRate(data) ?? FALLBACK_USD_ARS
        return cached
      })
      .catch(() => FALLBACK_USD_ARS)
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

/**
 * Devuelve { rate, ready }. Antes de la respuesta usa FALLBACK_USD_ARS para no
 * renderizar precios vacíos; `ready` permite atenuar el valor mientras carga.
 */
export function useFxRate() {
  const [rate, setRate] = useState(cached ?? FALLBACK_USD_ARS)
  const [ready, setReady] = useState(cached != null)

  useEffect(() => {
    if (cached != null) return
    let alive = true
    fetchUsdArsRate().then((value) => {
      if (!alive) return
      setRate(value)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  return { rate, ready }
}

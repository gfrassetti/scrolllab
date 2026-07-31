import { useEffect, useState } from 'react'

/**
 * Devuelve `value` recién cuando dejó de cambiar durante `delay` ms.
 *
 * Comparación por identidad: si el valor es derivado, pasá algo estable
 * (un string, no un objeto nuevo en cada render).
 */
export function useDebouncedValue(value, delay = 300) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    if (value === settled) return undefined
    const id = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(id)
  }, [value, settled, delay])

  return settled
}

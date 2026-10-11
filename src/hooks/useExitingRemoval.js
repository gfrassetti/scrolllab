import { useCallback, useEffect, useRef, useState } from 'react'

/** Lo que dura el cierre de una fila (igual que `.ui-collapse`). */
const EXIT_MS = 260

/**
 * Quitar una fila sin que desaparezca de golpe: la fila se marca como
 * «saliendo» (el que renderiza la cierra con <Collapse>) y recién cuando
 * terminó de cerrarse se saca del carrito. `leaving` son las claves en salida.
 */
export function useExitingRemoval(removeItem) {
  const [leaving, setLeaving] = useState(() => new Set())
  const timers = useRef(new Map())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  const remove = useCallback(
    (key) => {
      if (timers.current.has(key)) return
      setLeaving((prev) => new Set(prev).add(key))
      const id = window.setTimeout(() => {
        timers.current.delete(key)
        removeItem(key)
        setLeaving((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }, EXIT_MS)
      timers.current.set(key, id)
    },
    [removeItem],
  )

  return { leaving, remove }
}

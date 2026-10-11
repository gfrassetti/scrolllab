import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const CLOSE_MS = 260

/**
 * Abre y cierra su contenido con alto + opacidad (.ui-collapse en index.css):
 * nada aparece ni desaparece de golpe. Monta el contenido al abrir y lo
 * desmonta después de cerrar (no deja árboles ocultos, como un snippet o una
 * vista previa, corriendo de fondo).
 *
 * Para que la entrada anime, el navegador tiene que calcular primero el estado
 * cerrado: se monta cerrado, se fuerza ese cálculo (getBoundingClientRect) y
 * recién ahí se abre. No depende de requestAnimationFrame (que no corre en
 * pestañas en segundo plano).
 */
export default function Collapse({ open, children, className = '', innerClassName = '' }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)
  const ref = useRef(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return undefined
    }
    setShown(false)
    const timer = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useLayoutEffect(() => {
    if (open && mounted && !shown) {
      ref.current?.getBoundingClientRect()
      setShown(true)
    }
  }, [open, mounted, shown])

  if (!mounted) return null
  return (
    <div
      ref={ref}
      className={`ui-collapse ${className}`}
      data-open={shown ? 'true' : 'false'}
      aria-hidden={!open || undefined}
    >
      <div className={`ui-collapse-inner ${innerClassName}`}>{children}</div>
    </div>
  )
}

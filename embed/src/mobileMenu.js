import { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * `hooks/useMobileMenu` dentro del embed. Misma API (open, close, toggle,
 * triggerProps, panelProps), sin lo que no corresponde a un widget: ni Lenis
 * ni el scroll táctil normalizado (el scroll es del sitio del cliente, y el
 * hook real los arrastra al bundle del frame, con una segunda copia de GSAP).
 * Sí mantiene Escape y el foco, que son del menú y no de la página.
 */
export function useMobileMenu() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const panel = panelRef.current
    const trigger = triggerRef.current
    const target = panel?.querySelector('a[href], button:not([disabled])') || panel
    target?.focus?.()
    return () => trigger?.focus?.()
  }, [open])

  return {
    open,
    close,
    toggle,
    panelRef,
    triggerProps: {
      ref: triggerRef,
      type: 'button',
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: toggle,
    },
    panelProps: {
      ref: panelRef,
      id: panelId,
      role: 'dialog',
      'aria-modal': true,
      tabIndex: -1,
    },
  }
}

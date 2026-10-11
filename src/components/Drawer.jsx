import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ENTER_MS = 320
const EXIT_MS = 200
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Panel lateral (derecha, o izquierda con `side="left"`) reutilizable: fondo que cierra, Escape, foco
 * atrapado adentro y devuelto al botón que lo abrió, scroll de la página
 * quieto mientras está abierto.
 *
 * Motion (Emil): entra con --ease-drawer en ~320ms y sale más rápido (200ms);
 * con «reducir movimiento» solo aparece, sin desplazarse.
 */
export default function Drawer({
  open,
  onClose,
  title,
  aside = null,
  children,
  footer = null,
  closeLabel = 'Cerrar',
  side = 'right',
  className = '',
}) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef(null)
  const returnFocus = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement
      setMounted(true)
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  // Foco adentro al abrir; de vuelta al disparador al cerrar.
  useEffect(() => {
    if (!mounted) return undefined
    const panel = panelRef.current
    const first = panel?.querySelector('[data-autofocus]') || panel
    first?.focus({ preventScroll: true })
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prevOverflow
      const target = returnFocus.current
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus({ preventScroll: true })
      }
    }
  }, [mounted])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (nodes.length === 0) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (e.shiftKey && (document.activeElement === firstNode || document.activeElement === panelRef.current)) {
        e.preventDefault()
        lastNode.focus()
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault()
        firstNode.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!mounted || typeof document === 'undefined') return null

  const duration = shown ? ENTER_MS : EXIT_MS
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 transition-opacity ease-out-strong ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: `${duration}ms` }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 flex w-full flex-col border-ink/15 bg-bone text-ink shadow-[0_0_60px_rgba(0,0,0,0.18)] outline-none transition-transform ease-drawer motion-reduce:transition-none sm:w-[min(30rem,100vw)] ${
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
        } ${
          shown
            ? 'translate-x-0'
            : `${side === 'left' ? '-translate-x-full' : 'translate-x-full'} motion-reduce:translate-x-0`
        } ${className}`}
        style={{ transitionDuration: `${duration}ms` }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/15 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title-sm font-medium tracking-[-0.01em]">
              {title}
            </h2>
            {aside ? <p className="mt-1 text-body-sm text-ink/55">{aside}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ui-press -mr-2 grid size-11 shrink-0 place-items-center text-ink/60 hover:text-accent"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
        {footer ? <footer className="border-t border-ink/15 px-5 py-4 sm:px-6">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

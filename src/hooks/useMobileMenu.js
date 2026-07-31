import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { getLenis } from './useLenis'

/**
 * Everything a header overlay needs except the looks: open state, Escape,
 * scroll lock and focus handling. Each nav supplies its own markup so the
 * menu opens in the visual language of its model.
 *
 * Spread `triggerProps` on the hamburger button and `panelProps` on the
 * overlay; the wiring and ARIA stay consistent across templates.
 */
export function useMobileMenu({ breakpoint = '(min-width: 768px)' } = {}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((value) => !value), [])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Lenis keeps scrolling behind a fixed overlay unless it is stopped, and
  // the body lock covers the reduced-motion case where Lenis never booted.
  useEffect(() => {
    if (!open) return undefined
    const lenis = getLenis()
    lenis?.stop()

    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
      lenis?.start()
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const panel = panelRef.current
    const trigger = triggerRef.current
    const target =
      panel?.querySelector('a[href], button:not([disabled])') || panel
    target?.focus?.()
    return () => trigger?.focus?.()
  }, [open])

  // Resizing past the breakpoint reveals the desktop nav; a panel left open
  // underneath would trap scroll with no visible way out. Navs that keep the
  // overlay at every width pass `breakpoint: null` and opt out.
  useEffect(() => {
    if (!open || !breakpoint) return undefined
    const mql = window.matchMedia(breakpoint)
    const onChange = (event) => {
      if (event.matches) setOpen(false)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [open, breakpoint])

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

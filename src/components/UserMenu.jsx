import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'

/**
 * Botón de cuenta del header: nombre + badge del plan (solo si tiene uno) y
 * un desplegable con Mis compras / Plan / Cerrar sesión. Mismo patrón de
 * apertura que CartPopover (click afuera + Escape + cierre al navegar).
 */
export default function UserMenu({ user, onLogout, loggingOut }) {
  const { plan, loading: planLoading } = usePlan()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [panelIn, setPanelIn] = useState(false)
  const rootRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!open) {
      setPanelIn(false)
      return undefined
    }
    const id = requestAnimationFrame(() => setPanelIn(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const hasPlan = !planLoading && plan && plan !== 'free'
  const planLabel = hasPlan ? t(`lab.tier.${plan.replace('hosted_', '')}`) : null
  const name = user.name || user.email

  const itemClass =
    'block w-full px-4 py-3 text-left text-[11px] uppercase tracking-[0.22em] transition-colors hover:bg-ink hover:text-bone focus-visible:bg-ink focus-visible:text-bone'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`ui-press flex min-h-11 items-center gap-1.5 px-2 text-[11px] uppercase tracking-[0.25em] hover:text-accent md:px-0 md:text-xs ${
          open ? 'text-accent' : ''
        }`}
      >
        <span className="max-w-[14ch] truncate">{name}</span>
        <span aria-hidden="true" className="text-[8px]">
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={`fixed inset-x-5 top-16 z-50 border border-ink/15 bg-bone shadow-[0_16px_40px_rgba(0,0,0,0.12)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-56 ui-enter ${
            panelIn ? 'ui-enter-to' : 'ui-enter-from'
          }`}
        >
          <Link to="/account#compras" role="menuitem" className={itemClass}>
            {t('nav.account')}
          </Link>
          <Link
            to="/account#suscripcion"
            role="menuitem"
            className={`${itemClass} border-t border-ink/10`}
          >
            {t('nav.plan')}
            {hasPlan && (
              <span className="ml-2 text-accent normal-case tracking-normal">
                {planLabel}
              </span>
            )}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={loggingOut}
            className={`${itemClass} border-t border-ink/10 text-ink/55 disabled:opacity-50`}
          >
            {loggingOut ? t('nav.loggingOut') : t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

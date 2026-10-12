import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useCurrency } from '../lib/currency'
import LanguageSelector from './LanguageSelector'
import CurrencySelector from './CurrencySelector'
import ThemeToggle from './ThemeToggle'

/**
 * Idioma, moneda y tema en un solo lugar del header. Antes eran cuatro
 * controles sueltos (ES EN · ARS USD · ◐) que competían con la navegación. El
 * botón muestra lo elegido («ES · ARS»); adentro se cambia cada cosa.
 *
 * Mismo comportamiento que el popover del carrito: abre con ease-drawer,
 * cierra con click afuera, Escape o al navegar.
 */
export default function PreferencesMenu({ align = 'right' }) {
  const { t, locale } = useI18n()
  const { currency, canChoose } = useCurrency()
  const [open, setOpen] = useState(false)
  const [panelIn, setPanelIn] = useState(false)
  const rootRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

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

  const summary = [locale.toUpperCase(), canChoose ? currency : null].filter(Boolean).join(' · ')

  return (
    <div ref={rootRef} className="relative" data-preferences>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('prefs.label', { current: summary })}
        className={`ui-press flex min-h-11 items-center gap-1.5 px-2 text-[11px] uppercase tracking-[0.2em] hover:text-accent md:text-xs ${
          open ? 'text-accent' : 'text-ink/70'
        }`}
      >
        {summary}
        <span aria-hidden="true" className="text-[8px]">
          ▼
        </span>
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-3 w-64 border border-ink/15 bg-bone p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ui-enter ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${panelIn ? 'ui-enter-to' : 'ui-enter-from'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-ink/60">{t('nav.langLabel')}</span>
            <LanguageSelector />
          </div>
          {canChoose && (
            <div className="mt-2 border-t border-ink/10 pt-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-ink/60">{t('nav.currencyLabel')}</span>
                <CurrencySelector />
              </div>
              <p className="text-[12px] leading-snug text-ink/50">{t('prefs.currencyNote')}</p>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink/10 pt-2">
            <span className="text-body-sm text-ink/60">{t('prefs.theme')}</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useCart } from '../lib/cart'
import { useI18n } from '../i18n'
import ProductThumbnail from './ProductThumbnail'

/**
 * Botón "Carrito (n)" del header con popup desplegable.
 * Muestra los items, permite quitarlos y linkea a /cart para pagar.
 */
export default function CartPopover() {
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const { t, locale } = useI18n()
  const numberLocale = locale === 'en' ? 'en-US' : 'es-AR'
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState(null)
  const rootRef = useRef(null)
  const location = useLocation()

  // Cierra al navegar a otra página.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Cierra con click afuera o Escape.
  useEffect(() => {
    if (!open) return
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

  // Precios del servidor cada vez que se abre (evita cachear montos viejos).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    api
      .catalog()
      .then((data) => {
        if (cancelled) return
        const map = {}
        for (const p of data.products || []) map[p.sku] = p
        setCatalog(map)
      })
      .catch(() => {
        if (!cancelled) setCatalog({})
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const priceFor = (item) => {
    if (!catalog) return null
    const base =
      item.sku === 'custom' || String(item.sku).startsWith('custom:')
        ? catalog.custom
        : catalog[item.sku]
    return base?.unit_price ?? null
  }

  const total = items.reduce((sum, item) => sum + (priceFor(item) || 0), 0)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`min-h-11 px-2 text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:px-0 md:text-xs ${
          open ? 'text-accent' : ''
        }`}
      >
        {t('nav.cart')}
        {items.length > 0 ? ` (${items.length})` : ''}
      </button>

      {open && (
        <div className="fixed inset-x-5 top-16 z-50 border border-ink/15 bg-bone shadow-[0_16px_40px_rgba(0,0,0,0.12)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(20rem,calc(100vw-2.5rem))]">
          {items.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-ink/50">{t('common.cartEmpty')}</p>
              <Link
                to="/#templates"
                className="mt-3 inline-block text-[11px] uppercase tracking-[0.25em] hover:text-accent"
              >
                {t('common.seeTemplates')}
              </Link>
            </div>
          ) : (
            <>
              <ul className="max-h-72 overflow-y-auto">
                {items.map((item) => {
                  const price = priceFor(item)
                  return (
                    <li
                      key={item.sku}
                      className="flex items-center gap-3 border-b border-ink/10 px-4 py-3"
                    >
                      <ProductThumbnail
                        sku={item.sku}
                        title={item.title}
                        className="h-12 w-14"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink/60">
                          {price != null
                            ? `${price.toLocaleString(numberLocale)} ARS`
                            : '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.sku)}
                        aria-label={`${t('common.remove')} ${item.title}`}
                        className="min-h-11 shrink-0 px-2 text-xs text-ink/40 transition-colors hover:text-accent"
                      >
                        {t('common.remove')}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-ink/60">{t('common.estimatedTotal')}</span>
                <strong>{total.toLocaleString(numberLocale)} ARS</strong>
              </div>
              <div className="p-3 pt-0">
                <Link
                  to="/cart"
                  className="block border-2 border-ink bg-ink px-4 py-3 text-center text-[11px] uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent"
                >
                  {t('common.goToCart')}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

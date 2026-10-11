import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { cartItemKey, cartLineTitle, priceCartLines, useCart } from '../lib/cart'
import { cartItemPreviewHref } from '../lib/orderPreview'
import { useFxRate } from '../lib/fx'
import { formatArs, formatUsd } from '../lib/pricing'
import { useI18n } from '../i18n'
import { useCurrency } from '../lib/currency'
import { useWelcomeCoupon } from '../lib/welcomeCoupon'
import { useExitingRemoval } from '../hooks/useExitingRemoval'
import ProductThumbnail from './ProductThumbnail'
import Skeleton from './Skeleton'
import Collapse from './Collapse'
import ClearCartControl from './ClearCartControl'

/** Lo que dura el cierre del panel (un poco menos que la entrada). */
const CLOSE_MS = 160

/**
 * Botón "Carrito (n)" del header con popup desplegable.
 * Muestra los items, permite quitarlos y linkea a /cart para pagar. Los montos
 * son los mismos que en /cart (con el cupón de primera compra si hay).
 */
export default function CartPopover() {
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const clearCart = useCart((s) => s.clear)
  const { user } = useAuth()
  const welcome = useWelcomeCoupon((s) => s.coupon)
  const coupon = user ? welcome : null
  const { t } = useI18n()
  const { rate } = useFxRate()
  const { showUsd } = useCurrency()
  const [open, setOpen] = useState(false)
  // El panel sigue montado mientras se cierra: nada desaparece de golpe.
  const [mounted, setMounted] = useState(false)
  const [panelIn, setPanelIn] = useState(false)
  const [catalog, setCatalog] = useState(null)
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const location = useLocation()
  const { leaving, remove: removeLine } = useExitingRemoval(removeItem)

  // Cierra al navegar a otra página.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Entrada y salida (Emil: popover desde el botón, ease-drawer ~200ms). La
  // entrada se fuerza con un reflow para no depender de requestAnimationFrame.
  useEffect(() => {
    if (open) {
      setMounted(true)
      return undefined
    }
    setPanelIn(false)
    const id = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [open])

  useLayoutEffect(() => {
    if (open && mounted && !panelIn) {
      panelRef.current?.getBoundingClientRect()
      setPanelIn(true)
    }
  }, [open, mounted, panelIn])

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

  const { lines } = priceCartLines({ items, catalog: catalog || {}, rate, showUsd, coupon })
  const live = lines.filter((line) => !leaving.has(cartItemKey(line)))
  const total = live.reduce((sum, l) => sum + (l.unit_price || 0), 0)
  const payable = live.reduce((sum, l) => sum + ((l.discounted_price ?? l.unit_price) || 0), 0)
  const discount = total - payable

  const formatLine = (amount) => {
    // Mientras llegan los precios del servidor: skeleton, no un guion.
    if (amount == null) return catalog ? '—' : <Skeleton className="inline-block h-[0.9em] w-16 align-middle" />
    return showUsd ? formatUsd(amount) : formatArs(amount)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`ui-press min-h-11 px-2 text-[11px] uppercase tracking-[0.25em] hover:text-accent md:px-0 md:text-xs ${
          open ? 'text-accent' : ''
        }`}
      >
        {t('nav.cart')}
        {items.length > 0 ? ` (${items.length})` : ''}
      </button>

      {mounted && (
        <div
          ref={panelRef}
          className={`fixed inset-x-5 top-16 z-50 border border-ink/15 bg-bone shadow-[0_16px_40px_rgba(0,0,0,0.12)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(22rem,calc(100vw-2.5rem))] ui-enter ${
            panelIn ? 'ui-enter-to' : 'ui-enter-from'
          }`}
        >
          {items.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-body-sm text-ink/60">{t('common.cartEmpty')}</p>
              <Link to="/#templates" className="btn btn-ghost btn-sm mt-4">
                {t('cart.emptyTemplates')}
              </Link>
            </div>
          ) : (
            <>
              <ul className="max-h-72 overflow-y-auto">
                {lines.map((line) => {
                  const key = cartItemKey(line)
                  const previewHref = cartItemPreviewHref(line)
                  const title = cartLineTitle(line, items, t)
                  return (
                    <li key={key}>
                      <Collapse open={!leaving.has(key)}>
                        <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
                          <ProductThumbnail sku={line.sku} title={line.title} className="h-12 w-14 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body-sm font-medium">{title}</p>
                            <p className="mt-0.5 text-body-sm tabular-nums text-ink/70">
                              {line.discounted_price != null ? (
                                <>
                                  <span className="text-ink/40 line-through">{formatLine(line.unit_price)}</span>{' '}
                                  <span className="text-ink">{formatLine(line.discounted_price)}</span>
                                </>
                              ) : (
                                formatLine(line.unit_price)
                              )}
                            </p>
                            {previewHref && (
                              <Link
                                to={previewHref}
                                className="mt-0.5 inline-block text-xs text-accent-ink underline underline-offset-4 hover:text-accent"
                              >
                                {t('cart.preview')} ↗
                              </Link>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(key)}
                            aria-label={`${t('common.remove')} ${title}`}
                            className="action action-danger shrink-0 px-1"
                          >
                            {t('common.remove')}
                          </button>
                        </div>
                      </Collapse>
                    </li>
                  )
                })}
              </ul>
              <div className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-4 text-body-sm">
                  <span className="text-ink/60">{t('common.estimatedTotal')}</span>
                  <strong className="text-body tabular-nums">{formatLine(catalog ? payable : null)}</strong>
                </div>
                {coupon && discount > 0 ? (
                  <p className="mt-1 text-xs text-accent-ink">
                    {t('cart.couponIncluded', { percent: coupon.percent })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 px-3 pb-3">
                <Link to="/cart" className="btn btn-primary w-full">
                  {t('common.goToCart')}
                </Link>
                <ClearCartControl
                  className="px-1"
                  onClear={() => clearCart()}
                  label={t('common.clearCart')}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

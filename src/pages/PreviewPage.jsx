import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fontFromRecipe,
  loadComposition,
  readFont,
  recipeHasCommerce,
  recipeToComposition,
} from '../lib/composition'
import { resolveSectionTheme } from '../lib/sectionTheme'
import { commerceThemeFromItems } from '../lib/shop/theme'
import { checkoutPropsFromItems } from '../lib/shop/checkoutProps'
import { productsFromItems } from '../lib/shop/catalog'
import { useCart } from '../lib/cart'
import { api } from '../lib/api'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import CompositionCanvas from '../components/CompositionCanvas'
import CompositionShopShell from '../components/CompositionShopShell'
import { useT } from '../i18n'
import ScrollProgress from '../components/ScrollProgress'

/**
 * Reconstruye la composición de una compra desde la receta que quedó guardada
 * en la orden. Es la misma lista de secciones (y props) con la que se arma el
 * ZIP, así que el preview muestra exactamente lo vendido.
 */
function useOrderComposition(orderId, itemIndex) {
  const [state, setState] = useState({
    status: orderId ? 'loading' : 'idle',
    items: [],
    font: null,
  })

  useEffect(() => {
    if (!orderId) {
      setState({ status: 'idle', items: [], font: null })
      return undefined
    }
    let cancelled = false
    setState({ status: 'loading', items: [], font: null })
    api
      .orders()
      .then((data) => {
        if (cancelled) return
        const order = (data.orders || []).find((o) => o.id === orderId)
        const recipe = order?.items?.[itemIndex]?.recipe
        const items = recipeToComposition(recipe)
        setState(
          items.length
            ? { status: 'ready', items, font: fontFromRecipe(recipe) }
            : { status: 'missing', items: [], font: null },
        )
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          status: err?.status === 401 ? 'unauthorized' : 'missing',
          items: [],
          font: null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [orderId, itemIndex])

  return state
}

function PreviewNotice({ message, to, cta }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bone px-5 text-center text-ink">
      <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
        Preview
      </p>
      <p className="max-w-[36ch] text-lg text-ink/70">{message}</p>
      <Link
        to={to}
        className="border-2 border-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors duration-300 hover:bg-ink hover:text-bone"
      >
        {cta}
      </Link>
    </div>
  )
}

/**
 * PreviewPage — renderiza en una pestaña propia una página armada con el
 * builder, con las animaciones reales.
 *
 * - sin query: composición en curso (localStorage)
 * - `?order=<id>&item=<n>`: compra en Mis compras
 * - `?cart=1&composition=<id>`: una composición del carrito (sin id, la primera)
 */
export default function PreviewPage() {
  const [params] = useSearchParams()
  const orderId = params.get('order')
  const fromCart = params.get('cart') === '1'
  const itemIndex = Number.parseInt(params.get('item') || '0', 10) || 0
  const t = useT()
  const cartItems = useCart((s) => s.items)

  const order = useOrderComposition(orderId, itemIndex)
  const [localItems] = useState(() =>
    orderId || fromCart ? [] : loadComposition(),
  )

  const compositionId = params.get('composition')
  const cartCustoms = cartItems.filter((item) => item.sku === 'custom' || String(item.sku).startsWith('custom:'))
  const cartRecipe = fromCart
    ? (cartCustoms.find((item) => compositionId && item.compositionId === compositionId) || cartCustoms[0])
        ?.recipe
    : undefined
  const cartComposition = fromCart ? recipeToComposition(cartRecipe) : []
  const [localFont] = useState(() => (orderId || fromCart ? null : readFont()))

  const fromOrder = Boolean(orderId)
  const items = fromOrder
    ? order.items
    : fromCart
      ? cartComposition
      : localItems
  const font = fromOrder ? order.font : fromCart ? fontFromRecipe(cartRecipe) : localFont
  const backTo = fromOrder ? '/account' : fromCart ? '/cart' : '/builder'
  const backLabel = fromOrder
    ? t('preview.backToAccount')
    : fromCart
      ? t('preview.backToCart')
      : t('builder.backToBuilder')

  if (fromOrder && order.status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bone text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {t('common.loading')}
      </div>
    )
  }

  if (fromOrder && order.status === 'unauthorized') {
    return (
      <PreviewNotice
        message={t('preview.needsLogin')}
        to={`/login?next=${encodeURIComponent(`/preview?order=${orderId}&item=${itemIndex}`)}`}
        cta={t('preview.loginCta')}
      />
    )
  }

  if (items.length === 0) {
    return (
      <PreviewNotice
        message={
          fromOrder
            ? t('preview.notFound')
            : fromCart
              ? t('preview.cartEmpty')
              : t('builder.emptyPreview')
        }
        to={backTo}
        cta={backLabel}
      />
    )
  }

  const hasCommerce = recipeHasCommerce(items.map((i) => i.sectionId))
  const shopTheme = commerceThemeFromItems(items, resolveSectionTheme)
  const checkoutProps = checkoutPropsFromItems(items)

  const home = (
    <SmoothScrollProvider>
      <CompositionCanvas items={items} font={font} />
    </SmoothScrollProvider>
  )

  return (
    <>
      <ScrollProgress />
      {hasCommerce ? (
        <CompositionShopShell
          font={font}
          home={home}
          theme={shopTheme}
          checkoutProps={checkoutProps}
          items={items}
          products={productsFromItems(items)}
        />
      ) : (
        home
      )}

      <Link
        to={backTo}
        data-native-cursor
        className={`fixed left-1/2 z-9999 -translate-x-1/2 border-2 border-ink bg-bone px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] text-ink shadow-lg transition-colors duration-300 hover:bg-ink hover:text-bone ${
          hasCommerce ? 'bottom-20 sm:bottom-5' : 'bottom-5'
        }`}
      >
        {backLabel} ({items.length})
      </Link>
    </>
  )
}

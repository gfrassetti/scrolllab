import { useEffect, useMemo, useRef } from 'react'
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom'
import ProductDetail from './sections/commerce/ProductDetail'
import Checkout from './sections/commerce/Checkout'
import ShopChrome from './sections/commerce/ShopChrome'
import { ShopThemeProvider } from '../lib/shop/ShopTheme'
import { ShopCatalogProvider } from '../lib/shop/ShopCatalog'
import { fontChoiceById } from '../domain/design'
import {
  cartPropsFromItems,
  detailPropsFromItems,
  shopColorsFromItems,
  shopCurrencyFromItems,
  shopifyConfigFromItems,
} from '../lib/shop/checkoutProps'

/**
 * El shop del preview corre en su propio MemoryRouter, pero la app ya vive
 * dentro de un BrowserRouter y react-router prohíbe anidar routers. Cortamos
 * los contextos del router padre para que el interno arranque limpio.
 */
function IsolatedRouterBoundary({ children }) {
  return (
    <UNSAFE_NavigationContext.Provider value={null}>
      <UNSAFE_LocationContext.Provider value={null}>
        <UNSAFE_RouteContext.Provider
          value={{ outlet: null, matches: [], isDataRoute: false }}
        >
          {children}
        </UNSAFE_RouteContext.Provider>
      </UNSAFE_LocationContext.Provider>
    </UNSAFE_NavigationContext.Provider>
  )
}

/**
 * Avisa en qué pantalla de la tienda está el preview (`onRoute`) y, en el
 * builder (`syncHistory`), la une al historial del navegador: abrir la ficha o
 * el checkout suma una entrada y «atrás» (el botón del navegador o el del
 * preview) vuelve a la pantalla anterior de la tienda, sin salir del preview.
 * `shopDepth` en el state de cada entrada dice cuántas pantallas hay abiertas.
 */
function ShopRouteSync({ syncHistory, onRoute }) {
  const location = useLocation()
  const navType = useNavigationType()
  const navigate = useNavigate()
  const depth = useRef(0)

  useEffect(() => {
    onRoute?.(location.pathname)
  }, [location.pathname, onRoute])

  useEffect(() => {
    if (!syncHistory || navType !== 'PUSH') return
    depth.current += 1
    try {
      window.history.pushState({ ...window.history.state, slPreview: true, shopDepth: depth.current }, '')
    } catch {
      /* sin historial: la navegación de la tienda sigue andando */
    }
    // Solo cuando cambia la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => {
    if (!syncHistory) return undefined
    const onPop = (event) => {
      if (!event.state?.slPreview) return
      const target = event.state.shopDepth || 0
      const delta = target - depth.current
      if (!delta) return
      depth.current = target
      navigate(delta)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [syncHistory, navigate])

  return null
}

/**
 * Nested shop routes for builder /preview when the composition includes
 * commerce/ProductGrid. Packaged ZIPs use BrowserRouter instead (see packaging).
 */
export default function CompositionShopShell({
  home,
  theme = 'auto',
  checkoutProps,
  products,
  items,
  /** Tipografía global (src/domain/design.js): también la ficha, el carrito y el checkout. */
  font = null,
  /** Builder: une la navegación de la tienda al historial del navegador. */
  syncHistory = false,
  /** Builder: se llama con la ruta de la tienda cada vez que cambia. */
  onRoute = null,
  /** Builder: lo que se suma en la ficha y el checkout (el botón «Editar tienda»). */
  routeChrome = null,
}) {
  const fontChoice = fontChoiceById(font)
  // Lo que la tienda toma del ProductGrid: colores, moneda y los textos del
  // carrito y de la ficha (el mismo cálculo que el App del ZIP).
  const shop = useMemo(
    () => ({
      colors: shopColorsFromItems(items),
      currency: shopCurrencyFromItems(items),
      cart: cartPropsFromItems(items),
      detail: detailPropsFromItems(items),
      shopify: shopifyConfigFromItems(items),
    }),
    [items],
  )
  return (
    <IsolatedRouterBoundary>
      {/* En el ZIP la fuente va en <html> y alcanza a toda la tienda; acá, a todo el shell. */}
      <div
        {...(fontChoice ? { 'data-user-font': '' } : {})}
        style={fontChoice ? { '--user-font': fontChoice.stack } : undefined}
      >
        <ShopThemeProvider theme={theme} colors={shop.colors} className="min-h-svh bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)]">
          {/* Los productos editados en el builder: grilla, ficha, carrito y checkout. */}
          <ShopCatalogProvider products={products} currency={shop.currency} shopify={shop.shopify}>
            <MemoryRouter initialEntries={['/']}>
              <ShopRouteSync syncHistory={syncHistory} onRoute={onRoute} />
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      {home}
                      <ShopChrome {...shop.cart} />
                    </>
                  }
                />
                <Route
                  path="/product/:productId"
                  element={
                    <div className="xl:pr-[var(--builder-panel,0px)]">
                      <ProductDetail {...shop.detail} />
                      <ShopChrome {...shop.cart} />
                      {routeChrome}
                    </div>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <div className="xl:pr-[var(--builder-panel,0px)]">
                      <Checkout {...(checkoutProps || {})} />
                      <ShopChrome {...shop.cart} />
                      {routeChrome}
                    </div>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MemoryRouter>
          </ShopCatalogProvider>
        </ShopThemeProvider>
      </div>
    </IsolatedRouterBoundary>
  )
}

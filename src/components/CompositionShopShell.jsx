import { useMemo } from 'react'
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
} from 'react-router-dom'
import ProductDetail from './sections/commerce/ProductDetail'
import Checkout from './sections/commerce/Checkout'
import ShopChrome from './sections/commerce/ShopChrome'
import { ShopThemeProvider } from '../lib/shop/ShopTheme'
import { ShopCatalogProvider } from '../lib/shop/ShopCatalog'
import {
  cartPropsFromItems,
  detailPropsFromItems,
  shopColorsFromItems,
  shopCurrencyFromItems,
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
 * Nested shop routes for builder /preview when the composition includes
 * commerce/ProductGrid. Packaged ZIPs use BrowserRouter instead (see packaging).
 */
export default function CompositionShopShell({
  home,
  theme = 'auto',
  checkoutProps,
  products,
  items,
}) {
  // Lo que la tienda toma del ProductGrid: colores, moneda y los textos del
  // carrito y de la ficha (el mismo cálculo que el App del ZIP).
  const shop = useMemo(
    () => ({
      colors: shopColorsFromItems(items),
      currency: shopCurrencyFromItems(items),
      cart: cartPropsFromItems(items),
      detail: detailPropsFromItems(items),
    }),
    [items],
  )
  return (
    <IsolatedRouterBoundary>
      <ShopThemeProvider theme={theme} colors={shop.colors} className="min-h-svh bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)]">
        {/* Los productos editados en el builder: grilla, ficha, carrito y checkout. */}
        <ShopCatalogProvider products={products} currency={shop.currency}>
          <MemoryRouter initialEntries={['/']}>
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
                  <>
                    <ProductDetail {...shop.detail} />
                    <ShopChrome {...shop.cart} />
                  </>
                }
              />
              <Route
                path="/checkout"
                element={
                  <>
                    <Checkout {...(checkoutProps || {})} />
                    <ShopChrome {...shop.cart} />
                  </>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MemoryRouter>
        </ShopCatalogProvider>
      </ShopThemeProvider>
    </IsolatedRouterBoundary>
  )
}

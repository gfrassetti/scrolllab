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
}) {
  return (
    <IsolatedRouterBoundary>
      <ShopThemeProvider theme={theme} className="min-h-svh bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)]">
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  {home}
                  <ShopChrome />
                </>
              }
            />
            <Route
              path="/product/:productId"
              element={
                <>
                  <ProductDetail />
                  <ShopChrome />
                </>
              }
            />
            <Route
              path="/checkout"
              element={
                <>
                  <Checkout {...(checkoutProps || {})} />
                  <ShopChrome />
                </>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MemoryRouter>
      </ShopThemeProvider>
    </IsolatedRouterBoundary>
  )
}

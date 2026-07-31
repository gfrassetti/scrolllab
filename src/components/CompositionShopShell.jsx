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
export default function CompositionShopShell({ home }) {
  return (
    <IsolatedRouterBoundary>
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
              <div className="min-h-svh bg-bone text-ink">
                <ProductDetail />
                <ShopChrome />
              </div>
            }
          />
          <Route
            path="/checkout"
            element={
              <div className="min-h-svh bg-bone text-ink">
                <Checkout />
                <ShopChrome />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>
    </IsolatedRouterBoundary>
  )
}

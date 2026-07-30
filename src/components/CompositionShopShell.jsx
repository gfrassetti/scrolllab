import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProductDetail from './sections/commerce/ProductDetail'
import Checkout from './sections/commerce/Checkout'
import ShopChrome from './sections/commerce/ShopChrome'

/**
 * Nested shop routes for builder /preview when the composition includes
 * commerce/ProductGrid. Packaged ZIPs use BrowserRouter instead (see packaging).
 */
export default function CompositionShopShell({ home }) {
  return (
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
  )
}

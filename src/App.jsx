import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TemplatesIndex from './pages/TemplatesIndex'
import LicensePage from './pages/LicensePage'
import { PrivacyPage, TermsPage } from './pages/LegalDocumentPage'
import { AuthProvider } from './lib/auth'
import { I18nProvider, useT } from './i18n'
import CustomCursor from './components/CustomCursor'
import CartToast from './components/CartToast'
import DocumentHead from './components/DocumentHead'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'
import './lib/theme'

const ChaptersPage = lazy(() => import('./pages/ChaptersPage'))
const NocturnePage = lazy(() => import('./pages/NocturnePage'))
const MonolithPage = lazy(() => import('./pages/MonolithPage'))
const FizzPage = lazy(() => import('./pages/FizzPage'))
const VelocityPage = lazy(() => import('./pages/VelocityPage'))
const AtelierPage = lazy(() => import('./pages/AtelierPage'))
const ComicPage = lazy(() => import('./pages/ComicPage'))
const UnityPage = lazy(() => import('./pages/UnityPage'))
const RatioPage = lazy(() => import('./pages/RatioPage'))
const VantaPage = lazy(() => import('./pages/VantaPage'))
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
const PreviewPage = lazy(() => import('./pages/PreviewPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutSuccessPage = lazy(() =>
  import('./pages/CheckoutPages').then((m) => ({ default: m.default })),
)
const CheckoutFailurePage = lazy(() =>
  import('./pages/CheckoutPages').then((m) => ({ default: m.CheckoutFailurePage })),
)
const CheckoutMockPage = lazy(() =>
  import('./pages/CheckoutPages').then((m) => ({ default: m.CheckoutMockPage })),
)
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function HomeCursor() {
  const { pathname } = useLocation()
  if (pathname !== '/') return null
  return <CustomCursor />
}

function Loader() {
  const t = useT()
  return (
    <div className="flex min-h-svh items-center justify-center bg-bone">
      <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {t('common.loading')}
      </p>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <HomeCursor />
          <DocumentHead />
          <ScrollToTop />
          <CartToast />
          <ChunkErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<TemplatesIndex />} />
                <Route path="/templates/chapters" element={<ChaptersPage />} />
                <Route path="/templates/nocturne" element={<NocturnePage />} />
                <Route path="/templates/monolith" element={<MonolithPage />} />
                <Route path="/templates/fizz" element={<FizzPage />} />
                <Route path="/templates/velocity" element={<VelocityPage />} />
                <Route path="/templates/atelier" element={<AtelierPage />} />
                <Route path="/templates/comic" element={<ComicPage />} />
                <Route path="/templates/unity" element={<UnityPage />} />
                <Route path="/templates/ratio" element={<RatioPage />} />
                <Route
                  path="/templates/vanta"
                  element={
                    import.meta.env.DEV ? (
                      <VantaPage />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route path="/builder" element={<BuilderPage />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route path="/legal/license" element={<LicensePage />} />
                <Route path="/legal/privacy" element={<PrivacyPage />} />
                <Route path="/legal/terms" element={<TermsPage />} />
                <Route
                  path="/license"
                  element={<Navigate to="/legal/license" replace />}
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/checkout/failure" element={<CheckoutFailurePage />} />
                <Route path="/checkout/mock" element={<CheckoutMockPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ChunkErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

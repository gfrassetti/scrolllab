import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import TemplatesIndex from './pages/TemplatesIndex'
import { AuthProvider } from './lib/auth'
import { I18nProvider, useT } from './i18n'
import CustomCursor from './components/CustomCursor'
import './lib/theme'

const ChaptersPage = lazy(() => import('./pages/ChaptersPage'))
const NocturnePage = lazy(() => import('./pages/NocturnePage'))
const MonolithPage = lazy(() => import('./pages/MonolithPage'))
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
const PreviewPage = lazy(() => import('./pages/PreviewPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))
const PrivacyPage = lazy(() =>
  import('./pages/LegalDocumentPage').then((m) => ({ default: m.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('./pages/LegalDocumentPage').then((m) => ({ default: m.TermsPage })),
)
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
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
        <CustomCursor />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<TemplatesIndex />} />
              <Route path="/templates/chapters" element={<ChaptersPage />} />
              <Route path="/templates/nocturne" element={<NocturnePage />} />
              <Route path="/templates/monolith" element={<MonolithPage />} />
              <Route path="/builder" element={<BuilderPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/legal/license" element={<LicensePage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
              <Route path="/checkout/failure" element={<CheckoutFailurePage />} />
              <Route path="/checkout/mock" element={<CheckoutMockPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TemplatesIndex from './pages/TemplatesIndex'
import LicensePage from './pages/LicensePage'
import { PrivacyPage, TermsPage, RefundsPage } from './pages/LegalDocumentPage'
import { usePayRegion } from './lib/payRegion'
import { AuthProvider } from './lib/auth'
import { PlanProvider } from './lib/plan'
import { captureUtmFromUrl } from './lib/utm'
import { installTracker } from './lib/track'
import { I18nProvider, useT } from './i18n'
import CustomCursor from './components/CustomCursor'
import CartToast from './components/CartToast'
import MotionNotice from './components/MotionNotice'
import { bootMotionOverride } from './lib/motionOverride'
import DocumentHead from './components/DocumentHead'
import WelcomeCouponSync from './components/WelcomeCouponSync'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'
import './lib/theme'

const ChaptersPage = lazy(() => import('./pages/ChaptersPage'))
const NocturnePage = lazy(() => import('./pages/NocturnePage'))
const MonolithPage = lazy(() => import('./pages/MonolithPage'))
const FizzPage = lazy(() => import('./pages/FizzPage'))
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'))
const VelocityPage = lazy(() => import('./pages/VelocityPage'))
const AtelierPage = lazy(() => import('./pages/AtelierPage'))
const ComicPage = lazy(() => import('./pages/ComicPage'))
const UnityPage = lazy(() => import('./pages/UnityPage'))
const RatioPage = lazy(() => import('./pages/RatioPage'))
const AtriumPage = lazy(() => import('./pages/AtriumPage'))
const PlumPage = lazy(() => import('./pages/PlumPage'))
const SignalPage = lazy(() => import('./pages/SignalPage'))
const MeridianPage = lazy(() => import('./pages/MeridianPage'))
const KinPage = lazy(() => import('./pages/KinPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
const LabPage = lazy(() => import('./pages/LabPage'))
const WithdrawalPage = lazy(() => import('./pages/WithdrawalPage'))
const LabEditorPage = lazy(() => import('./pages/LabEditorPage'))
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
const CheckoutPayPage = lazy(() =>
  import('./pages/CheckoutPages').then((m) => ({ default: m.CheckoutPayPage })),
)
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
// Diagnóstico para mirar en un teléfono real (`?motion-debug`): carga diferida,
// solo existe si se lo pide. Dura la pestaña (`?motion-debug=0` lo apaga).
const MotionDebug = lazy(() => import('./components/MotionDebug'))
const SHOW_MOTION_DEBUG = (() => {
  try {
    const flag = new URLSearchParams(window.location.search).get('motion-debug')
    if (flag === '0') sessionStorage.removeItem('scrolllab-motion-debug')
    else if (flag !== null) sessionStorage.setItem('scrolllab-motion-debug', '1')
    return sessionStorage.getItem('scrolllab-motion-debug') === '1'
  } catch {
    return false
  }
})()

// «Ver con animaciones» (MotionNotice / MotionToggle) queda guardado en el
// navegador y vale para todo ScrollLab: se aplica antes del primer render para
// que las secciones arranquen ya con ese modo.
bootMotionOverride()

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
  // Los utm_* de un video o un post se guardan para saber qué canal trae cuentas
  // (viajan con el cupón de bienvenida cuando alguien entra).
  useEffect(() => {
    captureUtmFromUrl()
    // Analítica propia: acá y no en main.jsx, porque main.jsx viaja en el ZIP.
    installTracker()
    // Medio de pago por ubicación: cargado de entrada para que los «Comprar»
    // rápidos (que no pasan por el carrito) ya sepan por dónde cobrar.
    usePayRegion.getState().load()
  }, [])

  return (
    <I18nProvider>
      <AuthProvider>
        <PlanProvider>
          <BrowserRouter>
            <HomeCursor />
            <DocumentHead />
            <WelcomeCouponSync />
            <ScrollToTop />
            <CartToast />
            <MotionNotice />
            {SHOW_MOTION_DEBUG ? (
              <Suspense fallback={null}>
                <MotionDebug />
              </Suspense>
            ) : null}
            <ChunkErrorBoundary>
              <Suspense fallback={<Loader />}>
                <Routes>
                  <Route path="/" element={<TemplatesIndex />} />
                  {/* Panel de métricas: solo con `npm run dev` (en producción redirige
                      a la home y el endpoint ni existe). */}
                  <Route
                    path="/admin"
                    element={import.meta.env.DEV ? <AdminAnalytics /> : <Navigate to="/" replace />}
                  />
                  <Route path="/templates/chapters" element={<ChaptersPage />} />
                  <Route path="/templates/nocturne" element={<NocturnePage />} />
                  <Route path="/templates/monolith" element={<MonolithPage />} />
                  <Route path="/templates/fizz" element={<FizzPage />} />
                  <Route path="/templates/velocity" element={<VelocityPage />} />
                  <Route path="/templates/atelier" element={<AtelierPage />} />
                  <Route path="/templates/comic" element={<ComicPage />} />
                  <Route path="/templates/unity" element={<UnityPage />} />
                  <Route
                    path="/templates/ratio"
                    element={
                      import.meta.env.DEV ? (
                        <RatioPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route path="/templates/atrium" element={<AtriumPage />} />
                  <Route
                    path="/templates/plum"
                    element={
                      import.meta.env.DEV ? (
                        <PlumPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  {/* SIGNAL y PLUM no se van a terminar: solo en local, en
                      producción redirigen a la home (como RATIO). */}
                  <Route
                    path="/templates/signal"
                    element={
                      import.meta.env.DEV ? (
                        <SignalPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route path="/templates/meridian" element={<MeridianPage />} />
                  <Route path="/templates/kin" element={<KinPage />} />
                  {/* Páginas de producto para Google (src/lib/productPages.js). */}
                  <Route
                    path="/plantillas"
                    element={<Navigate to="/#templates" replace />}
                  />
                  <Route path="/plantillas/:sku" element={<ProductPage />} />
                  <Route path="/builder" element={<BuilderPage />} />
                  <Route path="/lab" element={<LabPage />} />
                  <Route path="/lab/:id" element={<LabEditorPage />} />
                  <Route path="/preview" element={<PreviewPage />} />
                  <Route path="/legal/license" element={<LicensePage />} />
                  <Route path="/legal/privacy" element={<PrivacyPage />} />
                  <Route path="/legal/terms" element={<TermsPage />} />
                  <Route path="/legal/refunds" element={<RefundsPage />} />
                  {/* Botón de arrepentimiento (Res. 424/2020), enlazado desde el home. */}
                  <Route path="/arrepentimiento" element={<WithdrawalPage />} />
                  <Route
                    path="/withdrawal"
                    element={<Navigate to="/arrepentimiento" replace />}
                  />
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
                  <Route path="/checkout/pay" element={<CheckoutPayPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ChunkErrorBoundary>
          </BrowserRouter>
        </PlanProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

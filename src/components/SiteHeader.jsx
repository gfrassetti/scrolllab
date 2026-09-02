import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SITE_NAME } from '../lib/site'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useCompositionCount } from '../hooks/useCompositionCount'
import { useT } from '../i18n'
import { resetBrandSplash } from './BrandSplash'
import CartPopover from './CartPopover'
import UserMenu from './UserMenu'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import LanguageSelector from './LanguageSelector'

/**
 * Chrome compartido del market (home, cart, account, login…).
 * En <md los links colapsan en un menú desplegable; carrito queda visible.
 */
export default function SiteHeader({ solid = true }) {
  const { user, loading, hadSession, logout } = useAuth()
  const { plan, used, quota, loading: planLoading } = usePlan()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)
  const location = useLocation()
  const t = useT()
  const builderCount = useCompositionCount()

  // Durante la carga usamos la pista de sesión previa para no invertir
  // el menú a mitad de camino. Al salir lo mantenemos hasta que la recarga
  // reemplace el documento: si no, el botón "Saliendo…" se convierte en
  // "Entrar" antes de irse y vuelve el parpadeo que queremos evitar.
  const showAccount = loggingOut || (user ? true : loading ? hadSession : false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const linkClass =
    'text-[11px] uppercase tracking-[0.25em] transition-colors ease-out-strong hover:text-accent md:text-xs'

  // Recarga dura al home: `navigate('/')` desde la home no remonta la página,
  // así que el splash no se vería, y el reload deja el estado en memoria limpio.
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutFailed(false)
    try {
      await logout()
    } catch {
      setLoggingOut(false)
      setLogoutFailed(true)
      setMenuOpen(false)
      return
    }
    resetBrandSplash()
    window.location.assign('/')
  }

  const logoutBusy = loggingOut || (loading && !user)
  const logoutLabel = loggingOut ? t('nav.loggingOut') : t('nav.logout')

  const builderBadge = builderCount > 0 && (
    <span className="ml-1.5 text-accent tabular-nums">({builderCount})</span>
  )
  const builderLabel = builderCount > 0
    ? t('nav.builderWithCount', { count: builderCount })
    : undefined

  // Estado del plan de LAB — visible acá porque es la única señal de "cuánto
  // me queda" que el usuario ve fuera de /lab. Viene del contexto compartido
  // (src/lib/plan.jsx), no de un fetch propio: mismo dato que HostedPlans.
  const showPlanBadge = user && !planLoading
  const planTierKey = plan === 'free' ? 'free' : plan.replace('hosted_', '')
  const planLabel = t(`lab.tier.${planTierKey}`)
  // El server manda `null` para "sin tope" (Infinity no es JSON válido).
  const planQuotaLabel = Number.isFinite(quota) ? quota : '∞'
  const planTitle =
    plan === 'free'
      ? t('lab.planFreeState', { used, quota: planQuotaLabel })
      : t('lab.planActiveState', { plan: planLabel, used, quota: planQuotaLabel })

  return (
    <header
      className={`sticky top-0 z-50 border-b border-ink/15 ${
        solid ? 'bg-bone/90 backdrop-blur-sm' : ''
      }`}
    >
      <nav className="flex items-center justify-between gap-3 px-5 py-3 md:px-10 md:py-5">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 text-sm font-medium uppercase tracking-[0.2em] transition-colors hover:text-accent md:tracking-[0.25em]"
        >
          <Logo className="size-5 shrink-0" />
          <span className="truncate">{SITE_NAME}</span>
        </Link>

        {/* Desktop / tablet */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/#templates" className={linkClass}>
            {t('nav.templates')}
          </Link>
          <Link to="/#como-funciona" className={linkClass}>
            {t('nav.howItWorks')}
          </Link>
          <Link to="/builder" className={linkClass} aria-label={builderLabel}>
            {t('nav.builder')}
            {builderBadge}
          </Link>
          <Link
            to="/lab"
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-accent transition-colors ease-out-strong hover:text-ink md:text-xs"
          >
            {t('nav.lab')}
            {showPlanBadge && (
              <span
                title={planTitle}
                className={`rounded-sm border px-1.5 py-0.5 text-[9px] tracking-[0.14em] ${
                  plan !== 'free'
                    ? 'border-accent text-accent'
                    : 'border-ink/25 text-ink/45'
                }`}
              >
                {planLabel}
              </span>
            )}
          </Link>
          <CartPopover />
          {showAccount ? (
            user ? (
              <UserMenu
                user={user}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            ) : (
              <span className={`${linkClass} text-ink/50`} aria-busy="true">
                {logoutLabel}
              </span>
            )
          ) : (
            <Link to="/login" className={linkClass}>
              {t('nav.login')}
            </Link>
          )}
          <LanguageSelector />
          <ThemeToggle />
        </div>

        {/* Mobile: carrito siempre a mano + hamburguesa */}
        <div className="flex items-center gap-1 md:hidden">
          <CartPopover />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={t('nav.menu')}
            className="ui-press grid size-11 place-items-center text-ink hover:text-accent"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M4 4l12 12M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              ) : (
                <path
                  d="M2.5 5.5h15M2.5 10h15M2.5 14.5h15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {logoutFailed && (
        <p
          role="alert"
          className="border-t border-ink/15 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-danger md:px-10"
        >
          {t('nav.logoutError')}
        </p>
      )}

      {menuOpen && (
        <div className="border-t border-ink/15 bg-bone px-5 pb-6 pt-2 md:hidden">
          <ul className="divide-y divide-ink/10 text-[12px] uppercase tracking-[0.22em]">
            <li>
              <Link to="/#templates" className="block py-3.5 hover:text-accent">
                {t('nav.templates')}
              </Link>
            </li>
            <li>
              <Link
                to="/#como-funciona"
                className="block py-3.5 hover:text-accent"
              >
                {t('nav.howItWorks')}
              </Link>
            </li>
            <li>
              <Link
                to="/builder"
                className="block py-3.5 hover:text-accent"
                aria-label={builderLabel}
              >
                {t('nav.builder')}
                {builderBadge}
              </Link>
            </li>
            <li>
              <Link
                to="/lab"
                className="flex items-center justify-between py-3.5 text-accent hover:text-ink"
              >
                {t('nav.lab')}
                {showPlanBadge && (
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 text-[10px] tracking-[0.14em] normal-case ${
                      plan !== 'free'
                        ? 'border-accent text-accent'
                        : 'border-ink/25 text-ink/45'
                    }`}
                  >
                    {planLabel}
                    {' · '}
                    {used}/{planQuotaLabel}
                  </span>
                )}
              </Link>
            </li>
            {showAccount ? (
              <>
                <li>
                  <Link to="/account" className="block py-3.5 hover:text-accent">
                    {t('nav.account')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account#suscripcion"
                    className="block py-3.5 hover:text-accent"
                  >
                    {t('nav.plan')}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logoutBusy}
                    aria-busy={loggingOut}
                    className="block w-full py-3.5 text-left text-ink/50 hover:text-accent disabled:opacity-50"
                  >
                    {logoutLabel}
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link to="/login" className="block py-3.5 hover:text-accent">
                  {t('nav.login')}
                </Link>
              </li>
            )}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  )
}

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SITE_NAME } from '../lib/site'
import { useAuth } from '../lib/auth'
import { useT } from '../i18n'
import CartPopover from './CartPopover'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import LanguageSelector from './LanguageSelector'

/**
 * Chrome compartido del market (home, cart, account, login…).
 * En <md los links colapsan en un menú desplegable; carrito queda visible.
 */
export default function SiteHeader({ solid = true }) {
  const { user, loading, hadSession, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const t = useT()

  // Durante la carga usamos la pista de sesión previa para no invertir
  // el menú a mitad de camino.
  const showAccount = user ? true : loading ? hadSession : false

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
    'text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:text-xs'

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
          <Link to="/builder" className={linkClass}>
            {t('nav.builder')}
          </Link>
          <CartPopover />
          {showAccount ? (
            <>
              <Link to="/account" className={linkClass}>
                {t('nav.account')}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                disabled={loading && !user}
                className={`${linkClass} text-ink/50 disabled:opacity-50`}
              >
                {t('nav.logout')}
              </button>
            </>
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
            className="grid size-11 place-items-center text-ink transition-colors hover:text-accent"
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
              <Link to="/builder" className="block py-3.5 hover:text-accent">
                {t('nav.builder')}
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
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    disabled={loading && !user}
                    className="block w-full py-3.5 text-left text-ink/50 hover:text-accent disabled:opacity-50"
                  >
                    {t('nav.logout')}
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

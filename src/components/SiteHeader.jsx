import { Link } from 'react-router-dom'
import { SITE_NAME } from '../lib/site'
import { useAuth } from '../lib/auth'
import { useT } from '../i18n'
import CartPopover from './CartPopover'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import LanguageSelector from './LanguageSelector'

/**
 * Chrome compartido del market (home, cart, account, login…).
 */
export default function SiteHeader({ solid = true }) {
  const { user, loading, hadSession, logout } = useAuth()
  const t = useT()

  // Durante la carga usamos la pista de sesión previa para no invertir
  // el menú a mitad de camino.
  const showAccount = user ? true : loading ? hadSession : false

  return (
    <header
      className={`sticky top-0 z-50 border-b border-ink/15 ${
        solid ? 'bg-bone/90 backdrop-blur-sm' : ''
      }`}
    >
      <nav className="flex items-center justify-between px-5 py-4 md:px-10 md:py-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-sm font-medium uppercase tracking-[0.25em] transition-colors hover:text-accent"
        >
          <Logo className="size-5 shrink-0" />
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-3 md:gap-6">
          <Link
            to="/#templates"
            className="hidden text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:inline md:text-xs"
          >
            {t('nav.templates')}
          </Link>
          <Link
            to="/#como-funciona"
            className="hidden text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:inline md:text-xs"
          >
            {t('nav.howItWorks')}
          </Link>
          <Link
            to="/builder"
            className="text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:text-xs"
          >
            {t('nav.builder')}
          </Link>
          <CartPopover />
          {showAccount ? (
            <>
              <Link
                to="/account"
                className="text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:text-xs"
              >
                {t('nav.account')}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                disabled={loading && !user}
                className="text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors hover:text-accent disabled:opacity-50 md:text-xs"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-[11px] uppercase tracking-[0.25em] transition-colors hover:text-accent md:text-xs"
            >
              {t('nav.login')}
            </Link>
          )}
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}

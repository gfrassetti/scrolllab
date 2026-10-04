import { Link } from 'react-router-dom'
import CartPopover from '../../components/CartPopover'
import LanguageSelector from '../../components/LanguageSelector'
import ThemeToggle from '../../components/ThemeToggle'

/**
 * Header del builder: navegación, vaciar, vista previa, cuenta, carrito, idioma y tema.
 */
export default function BuilderHeader({ t, clearItems, items, openPreview, looksLoggedIn }) {
  return (
    <>
      {/* Sticky solo en desktop: en mobile son tres filas (~170px) fijas
          encima de una paleta larga; ahí manda la barra de abajo. */}
      <header className="z-30 -mx-5 mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/15 bg-bone/95 px-5 py-4 backdrop-blur-sm md:-mx-10 md:px-10 lg:sticky lg:top-0">
        <nav className="flex items-baseline gap-5">
          <Link
            to="/"
            className="text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
          >
            {t('builder.back')}
          </Link>
          <Link
            to="/lab"
            className="text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
          >
            {t('nav.lab')}
          </Link>
          <p
            aria-current="page"
            className="text-body-sm font-medium uppercase tracking-[0.15em] text-ink"
          >
            {t('builder.title')}
          </p>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearItems}
            disabled={items.length === 0}
            className="btn btn-ghost disabled:opacity-30"
          >
            {t('builder.clear')}
          </button>
          <button
            type="button"
            onClick={openPreview}
            disabled={items.length === 0}
            className="btn btn-primary disabled:opacity-30"
          >
            {t('builder.preview')}
          </button>
          {looksLoggedIn && (
            <Link
              to="/account"
              className="text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
            >
              {t('nav.account')}
            </Link>
          )}
          <CartPopover />
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>
    </>
  )
}

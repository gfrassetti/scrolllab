import { Link } from 'react-router-dom'
import CartPopover from '../../components/CartPopover'
import PreferencesMenu from '../../components/PreferencesMenu'
import MotionToggle from '../../components/MotionToggle'

/**
 * Header del builder en una fila: volver y dónde estás a la izquierda; la
 * acción principal (Preview), el carrito, tu cuenta y las preferencias a la
 * derecha. «Vaciar» vive en «Tu página» (actúa sobre ella) y LAB está en la
 * nota de la paleta: acá eran tres filas en el teléfono.
 */
export default function BuilderHeader({ t, items, openPreview, looksLoggedIn }) {
  return (
    <header className="z-30 -mx-5 mb-6 flex items-center justify-between gap-3 border-b border-ink/15 bg-bone/95 px-5 py-3 backdrop-blur-sm md:-mx-10 md:px-10 lg:sticky lg:top-0">
      <nav className="flex min-w-0 items-center gap-4">
        <Link
          to="/"
          aria-label={t('builder.back')}
          className="tpl-hit relative text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline"> {t('builder.backShort')}</span>
        </Link>
        <p aria-current="page" className="hidden truncate text-body-sm font-medium uppercase tracking-[0.15em] text-ink sm:block">
          {t('builder.title')}
        </p>
      </nav>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          onClick={openPreview}
          disabled={items.length === 0}
          className="btn btn-primary px-4 disabled:opacity-30 sm:px-5"
        >
          {t('builder.preview')}
        </button>
        <CartPopover />
        {looksLoggedIn && (
          <Link
            to="/account"
            className="hidden text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent md:inline"
          >
            {t('nav.myAccount')}
          </Link>
        )}
        <MotionToggle />
        <PreferencesMenu />
      </div>
    </header>
  )
}

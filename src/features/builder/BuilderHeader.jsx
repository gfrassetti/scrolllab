import { Link } from 'react-router-dom'
import CartPopover from '../../components/CartPopover'
import PreferencesMenu from '../../components/PreferencesMenu'
import { PanelIcon } from './BuilderSidebar.jsx'
import Logo from '../../components/Logo'
import { SITE_NAME } from '../../lib/site'
import ScrollProgress from '../../components/ScrollProgress'

/**
 * Header del builder en una fila: volver y dónde estás a la izquierda; la
 * acción principal (Preview), el carrito, tu cuenta y las preferencias a la
 * derecha. «Vaciar» vive en «Tu página» (actúa sobre ella) y LAB está en la
 * nota de la paleta: acá eran tres filas en el teléfono.
 */
export default function BuilderHeader({ t, items, openPreview, looksLoggedIn, onToggleSidebar = null, projectName = '' }) {
  return (
    <>
      <ScrollProgress />
      <header className="z-30 -mx-5 mb-6 flex h-[3.75rem] items-center justify-between gap-2 border-b border-ink/10 bg-bone/95 px-5 backdrop-blur-sm sm:gap-3 md:-mx-10 md:px-10 lg:sticky lg:top-0">
        <nav className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={t('builder.sidebar.toggle')}
              title={`${t('builder.sidebar.toggle')} (Ctrl+B)`}
              className="ui-press -ml-2 grid size-11 place-items-center text-ink/60 transition-colors hover:text-accent"
            >
              <PanelIcon />
            </button>
          )}
          {/* La marca vuelve al inicio, como en el resto del sitio. */}
          <Link
            to="/"
            aria-label={t('builder.homeLabel')}
            className="tpl-hit relative flex shrink-0 items-center gap-2 text-ink transition-colors hover:text-accent"
          >
            <Logo className="size-5 shrink-0" />
            <span className="hidden font-brico text-xs font-bold uppercase tracking-[0.14em] sm:inline">{SITE_NAME}</span>
          </Link>
          <span aria-hidden="true" className="hidden text-ink/25 sm:inline">
            /
          </span>
          {/* Debajo de 375 px no entra entero: mejor nada que «B…» (la marca ya vuelve al inicio). */}
          <p aria-current="page" className="hidden truncate min-[375px]:block text-[13px] font-medium uppercase tracking-[0.03em] text-ink sm:text-body-sm sm:tracking-[0.15em]">
            {t('builder.title')}
          </p>
          {projectName ? (
            <p className="hidden min-w-0 truncate text-body-sm text-ink/55 md:block">· {projectName}</p>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <button
            type="button"
            onClick={openPreview}
            disabled={items.length === 0}
            className="btn btn-primary tpl-hit relative min-h-9 px-3 py-1.5 text-[13px] disabled:opacity-30 sm:min-h-11 sm:px-5 sm:py-3 sm:text-body-sm"
          >
            {t('builder.preview')}
            <span aria-hidden="true" className="hidden sm:inline">→</span>
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
          <PreferencesMenu />
        </div>
      </header>
    </>
  )
}

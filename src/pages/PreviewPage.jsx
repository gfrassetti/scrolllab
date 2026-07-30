import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSection } from '../lib/sectionRegistry'
import { loadComposition, recipeHasCommerce } from '../lib/composition'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import CompositionShopShell from '../components/CompositionShopShell'
import { useT } from '../i18n'

/**
 * PreviewPage — renderiza en una pestaña propia la página que el
 * usuario armó en el builder (leída de localStorage), con las
 * animaciones reales. Pensada para abrirse con "Pestaña nueva ↗".
 */
export default function PreviewPage() {
  const [items] = useState(loadComposition)
  const t = useT()
  const hasCommerce = recipeHasCommerce(items.map((i) => i.sectionId))

  if (items.length === 0) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bone px-5 text-center text-ink">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
          Preview
        </p>
        <p className="max-w-[36ch] text-lg text-ink/70">
          Todavía no hay nada armado. Componé tu página en el builder y volvé
          a abrir el preview.
        </p>
        <Link
          to="/builder"
          className="border-2 border-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition-colors duration-300 hover:bg-ink hover:text-bone"
        >
          {t('builder.backToBuilder')}
        </Link>
      </div>
    )
  }

  const home = (
    <SmoothScrollProvider>
      <div id="top">
        {items.map((item) => {
          const section = getSection(item.sectionId)
          const Component = section.component
          return (
            <div key={item.uid} className={section.model.wrapperClass}>
              <Component {...(item.props || {})} />
            </div>
          )
        })}
      </div>
    </SmoothScrollProvider>
  )

  return (
    <>
      {hasCommerce ? <CompositionShopShell home={home} /> : home}

      <Link
        to="/builder"
        className="fixed bottom-5 left-1/2 z-9999 -translate-x-1/2 border-2 border-ink bg-bone px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] text-ink shadow-lg transition-colors duration-300 hover:bg-ink hover:text-bone"
      >
        {t('builder.backToBuilder')} ({items.length})
      </Link>
    </>
  )
}

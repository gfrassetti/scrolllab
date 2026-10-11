import { useState } from 'react'
import Collapse from '../../components/Collapse'
import FontPicker from '../../components/FontPicker'
import { fontChoiceById } from '../../domain/design'



/**
 * Cabecera del panel de composición: título, estructura (nav / hero / secciones
 * / footer) y la tipografía global de la página.
 */
export default function CompositionHeader({
  t,
  items,
  structure,
  onClear = null,
  font = null,
  onFontChange = null,
}) {
  const [fontOpen, setFontOpen] = useState(false)
  const fontChoice = fontChoiceById(font)
  return (
    <>
      <div className="shrink-0">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <p className="text-title-sm font-medium tracking-[-0.01em]">
            {t('builder.canvasTitle')} ({items.length}{' '}
            {items.length === 1
              ? t('builder.sectionCountOne')
              : t('builder.sectionCountMany')})
          </p>
          {/* Vaciar = empezar otra página: la de ahora queda en el carrito / su proyecto. */}
          {onClear && items.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="tpl-hit relative shrink-0 text-body-sm text-ink/55 underline decoration-ink/25 underline-offset-4 transition-colors hover:text-accent"
            >
              {t('builder.clear')}
            </button>
          ) : null}
        </div>

        <ol className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-eyebrow text-ink/45">
          {[
            { key: 'nav', label: t('builder.emptyStepNav'), count: structure.nav },
            { key: 'hero', label: t('builder.emptyStepHero'), count: structure.hero },
            {
              key: 'section',
              label: t('builder.emptyStepSections'),
              count: structure.section,
            },
            {
              key: 'footer',
              label: t('builder.emptyStepFooter'),
              count: structure.footer,
            },
          ].map((step) => (
            <li
              key={step.key}
              className={`flex items-center gap-1.5 uppercase ${
                    step.count > 0 ? 'text-accent' : ''
                  }`}
            >
              <span aria-hidden="true">{step.count > 0 ? '✓' : '○'}</span>
              <span>
                {step.label}
                {step.count > 0 ? ` · ${step.count}` : ''}
              </span>
            </li>
          ))}
        </ol>

        {/* Tipografía global: una familia para todas las secciones. */}
        {onFontChange && items.length > 0 ? (
          <div className="mb-4 border-t border-ink/10 pt-3" data-builder-font>
            <button
              type="button"
              aria-expanded={fontOpen}
              onClick={() => setFontOpen((v) => !v)}
              className="tpl-hit relative flex min-h-11 w-full items-center justify-between gap-3 text-left text-body-sm"
            >
              <span className="font-medium">{t('builder.fontTitle')}</span>
              <span className="flex items-center gap-2 text-ink/55">
                <span style={fontChoice ? { fontFamily: fontChoice.stack } : undefined}>
                  {fontChoice ? fontChoice.label : t('builder.fontOriginal')}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 10 6"
                  className={`h-1.5 w-2.5 transition-transform duration-200 ${fontOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M1 1l4 4 4-4" />
                </svg>
              </span>
            </button>
            <Collapse open={fontOpen}>
              <p className="mt-1 mb-3 max-w-[56ch] text-body-sm text-ink/55">{t('builder.fontHint')}</p>
              <FontPicker value={font} onChange={onFontChange} t={t} />
            </Collapse>
          </div>
        ) : null}
      </div>
    </>
  )
}

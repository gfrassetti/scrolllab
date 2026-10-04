

/**
 * Cabecera del panel de composición: título y estructura (nav / hero / secciones / footer).
 */
export default function CompositionHeader({ t, items, structure }) {
  return (
    <>
      <div className="shrink-0">
        <p className="mb-3 text-title-sm font-medium tracking-[-0.01em]">
          {t('builder.canvasTitle')} ({items.length}{' '}
          {items.length === 1
            ? t('builder.sectionCountOne')
            : t('builder.sectionCountMany')})
        </p>

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
      </div>
    </>
  )
}

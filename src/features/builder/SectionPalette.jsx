import { models } from '../../lib/sectionRegistry'
import { sectionCopyKey, kindLabelKeys } from './sectionCopy.js'
import { MAX_CUSTOM_SECTIONS } from '../../lib/pricing'

/**
 * Paleta: las secciones de cada modelo para agregar (click o arrastrar), con los topes de cantidad.
 */
export default function SectionPalette({ t, commerceSurcharge, isKindBlocked, atMaxSections, sectionCounts, startPaletteDrag, setDragOver, handleAddSection }) {
  return (
    <>
      <div className="min-w-0 lg:col-span-5">
        <p className="mb-6 text-title-sm font-medium tracking-[-0.01em]">
          {t('builder.paletteTitle')}
        </p>

        <div className="space-y-10">
          {models.map((model) => (
            <div key={model.id}>
              <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-ink/15 pb-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: model.accent }}
                />
                <p className="text-body-sm font-semibold tracking-[0.08em]">
                  {model.name}
                </p>
              </div>
              {model.id === 'commerce' && (
                <p className="mb-3 text-body-sm text-ink/55">
                  {t('builder.commerceHint', {
                    price: commerceSurcharge,
                  })}
                </p>
              )}
              {model.sections.some((s) => s.beat) && (
                <p className="mb-3 text-body-sm text-ink/55">
                  {t('builder.beatHint')}
                </p>
              )}

              <ul>
                {model.sections.map((section) => {
                  const kindBlocked = isKindBlocked(section.id)
                  const blocked = kindBlocked || atMaxSections
                  const count = sectionCounts.get(section.id) || 0
                  const added = count > 0
                  const name = t(sectionCopyKey(section.id, 'name'))
                  return (
                    <li
                      key={section.id}
                      draggable={!blocked}
                      onDragStart={(e) => {
                        if (blocked) {
                          e.preventDefault()
                          return
                        }
                        startPaletteDrag(e, section.id)
                      }}
                      onDragEnd={() => setDragOver(null)}
                      className={`flex items-center justify-between gap-4 border-b border-ink/10 py-2.5 ${
                          blocked
                            ? 'cursor-not-allowed opacity-40'
                            : 'cursor-grab active:cursor-grabbing'
                        } ${added ? 'bg-ink/[0.03]' : ''}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`grid size-5 shrink-0 place-items-center text-[11px] ${
                              added
                                ? 'border border-accent/50 text-accent'
                                : 'text-ink/30'
                            }`}
                        >
                          {added ? '✓' : '⠿'}
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body font-medium">
                            {name}
                            <span className="text-eyebrow text-ink/40">
                              {t(kindLabelKeys[section.kind])}
                            </span>
                            {section.beat && (
                              <span className="border border-accent/50 px-1.5 py-0.5 text-eyebrow text-accent">
                                {t('builder.beatBadge')}
                              </span>
                            )}
                            {added && (
                              <span className="text-eyebrow text-accent">
                                {t('builder.addedCount', { count })}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-body-sm text-ink/55">
                            {kindBlocked
                              ? t('builder.uniqueKindShort', {
                                  kind: t(kindLabelKeys[section.kind]),
                                })
                              : atMaxSections
                                ? t('builder.maxSectionsShort', {
                                    max: MAX_CUSTOM_SECTIONS,
                                  })
                                : t(sectionCopyKey(section.id, 'blurb'))}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSection(section.id)}
                        disabled={blocked}
                        aria-label={
                          added
                            ? t('builder.addedAria', { name, count })
                            : t('builder.addAria', { name })
                        }
                        className={`min-h-10 shrink-0 border px-3 py-2 text-body-sm transition-colors duration-200 disabled:opacity-40 ${
                            added
                              ? 'border-accent/60 text-accent not-disabled:hover:border-accent not-disabled:hover:bg-accent not-disabled:hover:text-ink'
                              : 'border-ink/30 not-disabled:hover:border-ink not-disabled:hover:bg-ink not-disabled:hover:text-bone'
                          }`}
                      >
                        {added ? `✓ ${count}` : t('builder.add')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { models } from '../../lib/sectionRegistry'
import { sectionCopyKey, kindLabelKeys } from './sectionCopy.js'
import { MAX_CUSTOM_SECTIONS } from '../../lib/pricing'
import Collapse from '../../components/Collapse'

const KINDS = ['nav', 'hero', 'section', 'footer']

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Paleta: las secciones de cada modelo para agregar (click o arrastrar), con
 * los topes de cantidad. Eran 86 filas seguidas: ahora se busca por nombre o
 * descripción, se filtra por tipo (Nav / Hero / Sección / Footer) y cada
 * modelo se pliega. Buscar o filtrar abre solo los modelos con resultados.
 */
export default function SectionPalette({
  t,
  commerceSurcharge,
  isKindBlocked,
  atMaxSections,
  sectionCounts,
  startPaletteDrag,
  setDragOver,
  handleAddSection,
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  // Abiertos a mano. Sin búsqueda ni filtro, arranca abierto el primero.
  const [open, setOpen] = useState(() => new Set([models[0]?.id]))
  const searching = query.trim() !== '' || kind !== 'all'

  const groups = useMemo(() => {
    const q = normalize(query.trim())
    return models
      .map((model) => {
        const sections = model.sections.filter((section) => {
          if (kind !== 'all' && section.kind !== kind) return false
          if (!q) return true
          const hay = normalize(
            `${t(sectionCopyKey(section.id, 'name'))} ${t(sectionCopyKey(section.id, 'blurb'))} ${model.name} ${t(kindLabelKeys[section.kind])}`,
          )
          return hay.includes(q)
        })
        return { model, sections }
      })
      .filter((g) => g.sections.length > 0)
  }, [query, kind, t])

  const total = groups.reduce((n, g) => n + g.sections.length, 0)

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className={`min-w-0 lg:col-span-5 ${className}`}>
      <p className="text-title-sm font-medium tracking-[-0.01em]">{t('builder.paletteTitle')}</p>
      <p className="mt-2 max-w-[52ch] text-body-sm text-ink/55">
        {t('builder.labNote')}{' '}
        <Link
          to="/lab"
          className="tpl-hit relative whitespace-nowrap underline decoration-ink/30 underline-offset-2 hover:text-accent"
        >
          {t('builder.labNoteLink')}
        </Link>
      </p>

      {/* Buscar y filtrar */}
      <div className="mt-5 space-y-3" data-builder-palette-tools>
        <label className="block">
          <span className="sr-only">{t('builder.palette.search')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('builder.palette.search')}
            className="min-h-11 w-full border border-ink/25 bg-transparent px-3 text-body outline-none placeholder:text-ink/40 focus:border-ink"
          />
        </label>
        <div role="group" aria-label={t('builder.palette.kindLabel')} className="flex flex-wrap gap-2">
          {['all', ...KINDS].map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`ui-press min-h-11 border px-3 text-body-sm transition-colors ${
                kind === k ? 'border-ink bg-ink text-bone' : 'border-ink/20 text-ink/65 hover:border-ink/50'
              }`}
            >
              {k === 'all' ? t('builder.palette.all') : t(`builder.palette.kind.${k}`)}
            </button>
          ))}
        </div>
        {searching && (
          <p className="text-body-sm text-ink/55" aria-live="polite">
            {total === 0
              ? t('builder.palette.noResults')
              : t(total === 1 ? 'builder.palette.resultsOne' : 'builder.palette.results', { n: total })}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {groups.map(({ model, sections }) => {
          const isOpen = searching || open.has(model.id)
          const addedHere = model.sections.reduce((n, s) => n + (sectionCounts.get(s.id) ? 1 : 0), 0)
          const panelId = `palette-${model.id}`
          return (
            <div key={model.id} className="border-b border-ink/15">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(model.id)}
                disabled={searching}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left disabled:cursor-default"
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: model.accent }}
                />
                <span className="text-body-sm font-semibold tracking-[0.08em]">{model.name}</span>
                <span className="text-body-sm tabular-nums text-ink/45">
                  {sections.length}
                  {addedHere > 0 ? ` · ${t('builder.palette.addedInModel', { n: addedHere })}` : ''}
                </span>
                {!searching && (
                  <span
                    aria-hidden="true"
                    className={`ml-auto text-ink/45 transition-transform duration-200 ease-out-strong motion-reduce:transition-none ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ▾
                  </span>
                )}
              </button>

              <Collapse open={isOpen}>
                <div id={panelId} className="pb-4">
                  {model.id === 'commerce' && (
                    <p className="mb-3 text-body-sm text-ink/55">
                      {t('builder.commerceHint', { price: commerceSurcharge })}
                    </p>
                  )}
                  {model.sections.some((s) => s.beat) && (
                    <p className="mb-3 text-body-sm text-ink/55">{t('builder.beatHint')}</p>
                  )}
                  <ul>
                    {sections.map((section) => {
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
                          className={`flex items-center justify-between gap-4 border-t border-ink/10 py-2.5 ${
                            blocked ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'
                          } ${added ? 'bg-ink/[0.03]' : ''}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={`grid size-5 shrink-0 place-items-center text-[11px] ${
                                added ? 'border border-accent/50 text-accent' : 'text-ink/30'
                              }`}
                            >
                              {added ? '✓' : '⠿'}
                            </span>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body font-medium">
                                {name}
                                <span className="text-eyebrow text-ink/40">{t(kindLabelKeys[section.kind])}</span>
                                {section.beat && (
                                  <span className="border border-accent/50 px-1.5 py-0.5 text-eyebrow text-accent">
                                    {t('builder.beatBadge')}
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-body-sm text-ink/55">
                                {kindBlocked
                                  ? t('builder.uniqueKindShort', { kind: t(kindLabelKeys[section.kind]) })
                                  : atMaxSections
                                    ? t('builder.maxSectionsShort', { max: MAX_CUSTOM_SECTIONS })
                                    : t(sectionCopyKey(section.id, 'blurb'))}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSection(section.id)}
                            disabled={blocked}
                            aria-label={added ? t('builder.addedAria', { name, count }) : t('builder.addAria', { name })}
                            className={`min-h-11 shrink-0 border px-3 py-2 text-body-sm transition-colors duration-200 disabled:opacity-40 ${
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
              </Collapse>
            </div>
          )
        })}
      </div>
    </div>
  )
}

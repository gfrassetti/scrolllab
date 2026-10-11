import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SnippetBox from '../../components/SnippetBox'

const PAGE_SIZE = 10

const STATUS_TONE = {
  published: 'text-success border-success/40 bg-success/10',
  draft: 'text-ink/60 border-ink/25 bg-ink/5',
  suspended: 'text-danger border-danger/40 bg-danger/10',
}
// Congelada por el plan: no es un estado guardado, es derivado (el server
// manda `frozen`). Naranja, no rojo — es reversible: vuelve al re-suscribirse.
const FROZEN_TONE = 'text-accent border-accent/40 bg-accent/10'

const statusOf = (inst) => (inst.frozen ? 'frozen' : inst.status)

/**
 * Los widgets de LAB en tabla: filtros por estado (con contador), selección
 * múltiple con acciones en bloque (despublicar, borrar — con confirmación en
 * el lugar), el código de cada publicado desplegable en su fila y páginas de
 * 10. Antes eran tarjetas apiladas, borradores y publicados mezclados.
 *
 * Las acciones las hace LabPage (`onRemoveMany`, `onUnpublishMany`): la tabla
 * solo elige qué.
 */
export default function WidgetTable({
  t,
  instances,
  sectionLabel,
  loaderInfo,
  busy,
  planStopsAt = null,
  fmtDate,
  onRemoveMany,
  onUnpublishMany,
}) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(() => new Set())
  const [openCode, setOpenCode] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const headerBox = useRef(null)

  const counts = useMemo(() => {
    const c = { all: instances.length, published: 0, draft: 0, frozen: 0 }
    for (const inst of instances) {
      const s = statusOf(inst)
      if (s in c) c[s] += 1
    }
    return c
  }, [instances])

  const filters = [
    { id: 'all', label: t('lab.table.filterAll') },
    { id: 'published', label: t('lab.table.filterPublished') },
    { id: 'draft', label: t('lab.table.filterDraft') },
    ...(counts.frozen > 0 ? [{ id: 'frozen', label: t('lab.table.filterFrozen') }] : []),
  ]

  const rows = useMemo(
    () => (filter === 'all' ? instances : instances.filter((i) => statusOf(i) === filter)),
    [instances, filter],
  )
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pages - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  // Lo seleccionado que sigue existiendo (después de borrar, de recargar).
  const ids = useMemo(() => new Set(instances.map((i) => i.id)), [instances])
  const chosen = [...selected].filter((id) => ids.has(id))
  const chosenPublished = chosen.filter((id) => instances.find((i) => i.id === id)?.status === 'published')

  const pageIds = pageRows.map((r) => r.id)
  const pageAll = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const pageSome = pageIds.some((id) => selected.has(id))

  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = pageSome && !pageAll
  }, [pageSome, pageAll])

  const changeFilter = (id) => {
    setFilter(id)
    setPage(0)
    setSelected(new Set())
    setConfirm(null)
  }

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (pageAll) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })

  const clear = () => {
    setSelected(new Set())
    setConfirm(null)
  }

  const run = async (action) => {
    const list = action === 'unpublish' ? chosenPublished : chosen
    await (action === 'unpublish' ? onUnpublishMany : onRemoveMany)(list)
    clear()
  }

  return (
    <div className="mt-6" data-lab-widgets>
      {/* Filtros por estado */}
      <div role="group" aria-label={t('lab.table.filterLabel')} className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => changeFilter(f.id)}
            className={`ui-press min-h-11 border px-3 text-body-sm transition-colors ${
              filter === f.id ? 'border-ink bg-ink text-bone' : 'border-ink/20 text-ink/65 hover:border-ink/50'
            }`}
          >
            {f.label}
            <span className={`ml-2 font-mono tabular-nums ${filter === f.id ? 'text-bone/70' : 'text-ink/40'}`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Barra de selección: acciones en bloque */}
      {chosen.length > 0 && (
        <div
          className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border border-ink/20 bg-ink/[0.04] px-4 py-3 text-body-sm"
          data-lab-bulk
        >
          {confirm ? (
            <>
              <span role="alert" className="text-ink/80">
                {confirm === 'delete'
                  ? t(chosen.length === 1 ? 'lab.table.confirmDeleteOne' : 'lab.table.confirmDelete', {
                      n: chosen.length,
                    })
                  : t(chosenPublished.length === 1 ? 'lab.table.confirmUnpublishOne' : 'lab.table.confirmUnpublish', {
                      n: chosenPublished.length,
                    })}
              </span>
              <button
                type="button"
                onClick={() => run(confirm)}
                disabled={busy}
                className={`btn btn-sm disabled:opacity-40 ${confirm === 'delete' ? 'btn-danger' : 'btn-primary'}`}
              >
                {busy
                  ? t('lab.table.working')
                  : confirm === 'delete'
                    ? t('lab.table.yesDelete')
                    : t('lab.table.yesUnpublish')}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="action"
              >
                {t('lab.cancel')}
              </button>
            </>
          ) : (
            <>
              <span className="font-medium">
                {t(chosen.length === 1 ? 'lab.table.selectedOne' : 'lab.table.selected', { n: chosen.length })}
              </span>
              {chosenPublished.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirm('unpublish')}
                  disabled={busy}
                  className="action"
                >
                  {t('lab.table.unpublish')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm('delete')}
                disabled={busy}
                className="action action-danger"
              >
                {t('lab.table.delete')}
              </button>
              <button
                type="button"
                onClick={clear}
                className="action ml-auto text-ink/50"
              >
                {t('lab.table.clear')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Toda la página elegida: ofrecer todo el filtro (como un mail). */}
      {pageAll && rows.length > pageRows.length && chosen.length < rows.length && !confirm && (
        <p className="mt-2 text-body-sm text-ink/60">
          {t('lab.table.pageSelected', { n: pageRows.length })}{' '}
          <button
            type="button"
            onClick={() => setSelected(new Set(rows.map((r) => r.id)))}
            className="tpl-hit relative underline underline-offset-4 hover:text-accent"
          >
            {t('lab.table.selectAllFiltered', { n: rows.length })}
          </button>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 text-body text-ink/55">{t('lab.table.emptyFilter')}</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/15 text-eyebrow uppercase text-ink/45">
              <th scope="col" className="w-12 py-2 pr-2">
                <label className="grid size-11 place-items-center">
                  <span className="sr-only">{t('lab.table.selectPage')}</span>
                  <input
                    ref={headerBox}
                    type="checkbox"
                    checked={pageAll}
                    onChange={togglePage}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                </label>
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('lab.table.colWidget')}</th>
              <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">{t('lab.table.colStatus')}</th>
              <th scope="col" className="hidden py-2 pr-4 text-right font-medium md:table-cell">
                {t('lab.table.colViews')}
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                <span className="sr-only">{t('lab.table.colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((inst) => {
              const name = sectionLabel(inst.sectionId)
              const status = statusOf(inst)
              const pill = (
                <span
                  className={`inline-block border px-2 py-0.5 text-eyebrow uppercase ${
                    status === 'frozen' ? FROZEN_TONE : STATUS_TONE[inst.status] || STATUS_TONE.draft
                  }`}
                >
                  {status === 'frozen' ? t('lab.status.frozen') : t(`lab.status.${inst.status}`)}
                </span>
              )
              const codeOpen = openCode === inst.id
              return [
                <tr
                  key={inst.id}
                  className={`border-b border-ink/10 align-middle ${selected.has(inst.id) ? 'bg-ink/[0.04]' : ''}`}
                  data-lab-widget
                >
                  <td className="py-2 pr-2">
                    <label className="grid size-11 place-items-center">
                      <span className="sr-only">{t('lab.table.selectRow', { name })}</span>
                      <input
                        type="checkbox"
                        checked={selected.has(inst.id)}
                        onChange={() => toggle(inst.id)}
                        className="size-4 accent-[var(--color-accent)]"
                      />
                    </label>
                  </td>
                  <td className="min-w-0 py-3 pr-4">
                    <span className="block font-medium">{name}</span>
                    <span className="block font-mono text-[11px] text-ink/40">{inst.sectionId}</span>
                    <span className="mt-1 block sm:hidden">{pill}</span>
                    {status === 'published' && inst.stopsOnPlanEnd && planStopsAt && (
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-accent/90">
                        {t('lab.stopsOn', { date: fmtDate(planStopsAt) })}
                      </span>
                    )}
                  </td>
                  <td className="hidden py-3 pr-4 sm:table-cell">{pill}</td>
                  <td className="hidden py-3 pr-4 text-right font-mono text-body-sm tabular-nums text-ink/55 md:table-cell">
                    {inst.status === 'published' ? inst.views || 0 : '—'}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-4">
                      {inst.status === 'published' && (
                        <button
                          type="button"
                          aria-expanded={codeOpen}
                          onClick={() => setOpenCode(codeOpen ? null : inst.id)}
                          className="action"
                        >
                          {codeOpen ? t('lab.table.hideCode') : t('lab.table.code')}
                        </button>
                      )}
                      <Link to={`/lab/${inst.id}`} className="action">
                        {t('lab.edit')}
                      </Link>
                    </span>
                  </td>
                </tr>,
                codeOpen ? (
                  <tr key={`${inst.id}-code`} className="border-b border-ink/10">
                    <td colSpan={5} className="pb-5 pt-1">
                      {status === 'frozen' && (
                        <p className="mb-3 border border-accent/40 bg-accent/10 px-3 py-2 text-body-sm text-ink/75">
                          {t('lab.frozenHint')}
                        </p>
                      )}
                      <SnippetBox embedKey={inst.key} loaderInfo={loaderInfo} />
                    </td>
                  </tr>
                ) : null,
              ]
            })}
          </tbody>
        </table>
      )}

      {pages > 1 && (
        <nav aria-label={t('lab.table.pagination')} className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="ui-press min-h-11 px-2 text-[11px] uppercase tracking-[0.25em] text-ink/60 hover:text-accent disabled:opacity-30"
          >
            {t('account.prevPage')}
          </button>
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40">
            {t('account.pageOf', { page: safePage + 1, total: pages })}
          </p>
          <button
            type="button"
            disabled={safePage >= pages - 1}
            onClick={() => setPage(safePage + 1)}
            className="ui-press min-h-11 px-2 text-[11px] uppercase tracking-[0.25em] text-ink/60 hover:text-accent disabled:opacity-30"
          >
            {t('account.nextPage')}
          </button>
        </nav>
      )}
    </div>
  )
}

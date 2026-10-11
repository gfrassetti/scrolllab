import { useState } from 'react'
import { formatRelativeTime } from '../../lib/relativeTime'

/**
 * Lista de proyectos guardados del builder. La usan el panel del builder y
 * «Mi cuenta»: cada una pasa solo las acciones que ofrece (abrir, duplicar,
 * borrar). Las acciones que no se deshacen piden confirmación en la misma fila.
 *
 * `draftCount`: secciones del borrador sin guardar que hay en el lienzo; si es
 * más de 0, abrir otro proyecto avisa que lo reemplaza. `askOpenId`: ese
 * aviso ya abierto en una fila. `onAddToCart` + `inCartIds`: mandar un
 * proyecto al carrito sin abrirlo (o mostrar que ya está).
 */
export default function ProjectList({
  t,
  locale,
  projects,
  currentId = null,
  draftCount = 0,
  askOpenId = null,
  onOpen,
  onDuplicate = null,
  onRemove = null,
  onAddToCart = null,
  inCartIds = null,
}) {
  // Un proyecto pedido desde afuera (la URL) que pisaría el borrador: ya pregunta.
  const [confirm, setConfirm] = useState(askOpenId ? { id: askOpenId, kind: 'open' } : null)
  const [busy, setBusy] = useState(null)
  const [failed, setFailed] = useState(null)

  const run = async (key, fn) => {
    setBusy(key)
    setFailed(null)
    try {
      await fn()
      setConfirm(null)
    } catch (err) {
      setFailed({ key, message: err?.message || t('builder.projects.errorGeneric') })
    } finally {
      setBusy(null)
    }
  }

  const requestOpen = (project) => {
    if (draftCount > 0) setConfirm({ id: project.id, kind: 'open' })
    else run(`open:${project.id}`, () => onOpen(project.id))
  }

  return (
    <ul className="border-t border-ink/10" data-builder-projects>
      {projects.map((project) => {
        const isCurrent = project.id === currentId
        const name = project.name || t('builder.projects.untitled')
        const asking = confirm?.id === project.id ? confirm.kind : null
        const error = failed?.key?.endsWith(`:${project.id}`) ? failed.message : ''
        return (
          <li key={project.id} className="border-b border-ink/10 py-4" data-project-id={project.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{name}</span>
                  {isCurrent ? (
                    <span className="shrink-0 border border-accent/50 px-1.5 py-0.5 text-[11px] uppercase tracking-[0.15em] text-accent-ink">
                      {t('builder.projects.current')}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-body-sm text-ink/55">
                  {project.sections === 1
                    ? t('builder.projects.sectionsOne')
                    : t('builder.projects.sections', { count: project.sections })}
                  {' · '}
                  {t('builder.projects.edited', {
                    when: formatRelativeTime(project.updatedAt, locale, t('builder.projects.justNow')),
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
              {onAddToCart ? (
                inCartIds?.has(project.id) ? (
                  <span className="text-body-sm font-medium text-accent-ink">
                    ✓ {t('builder.projects.inCart')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(`cart:${project.id}`, () => onAddToCart(project))}
                    disabled={busy !== null || !project.sections}
                    title={!project.sections ? t('builder.projects.emptyCantBuy') : undefined}
                    className="action shrink-0"
                  >
                    {busy === `cart:${project.id}` ? t('builder.projects.adding') : t('builder.projects.addToCart')}
                  </button>
                )
              ) : null}
              {isCurrent ? null : (
                <button
                  type="button"
                  onClick={() => requestOpen(project)}
                  disabled={busy !== null}
                  className="btn btn-sm btn-ghost shrink-0 disabled:opacity-40"
                >
                  {busy === `open:${project.id}` ? t('builder.projects.opening') : t('builder.projects.open')}
                </button>
              )}
              </div>
            </div>

            {onDuplicate || onRemove ? (
              <div className="mt-1 flex gap-5">
                {onDuplicate ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run(`dup:${project.id}`, () => onDuplicate(project))}
                    className="action"
                  >
                    {busy === `dup:${project.id}` ? t('builder.projects.duplicating') : t('builder.projects.duplicate')}
                  </button>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setConfirm({ id: project.id, kind: 'delete' })}
                    className="action action-danger"
                  >
                    {t('builder.projects.delete')}
                  </button>
                ) : null}
              </div>
            ) : null}

            {asking ? (
              <div role="alert" className="mt-3 border border-ink/15 bg-ink/[0.03] px-3 py-3 text-body-sm">
                <p>
                  {asking === 'delete'
                    ? t('builder.projects.deleteConfirm', { name })
                    : draftCount === 1
                      ? t('builder.projects.replaceDraftOne')
                      : t('builder.projects.replaceDraft', { count: draftCount })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-autofocus
                    disabled={busy !== null}
                    onClick={() =>
                      asking === 'delete'
                        ? run(`del:${project.id}`, () => onRemove(project.id))
                        : run(`open:${project.id}`, () => onOpen(project.id))
                    }
                    className={`btn btn-sm disabled:opacity-40 ${asking === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                  >
                    {asking === 'delete' ? t('builder.projects.deleteYes') : t('builder.projects.openAnyway')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="action"
                  >
                    {t('builder.projects.cancel')}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-2 text-body-sm text-danger">
                {error}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

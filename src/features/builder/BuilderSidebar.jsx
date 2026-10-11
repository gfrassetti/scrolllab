import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Drawer from '../../components/Drawer'
import Collapse from '../../components/Collapse'
import Spinner from '../../components/Spinner'
import Skeleton, { SkeletonRows } from '../../components/Skeleton'
import { formatRelativeTime } from '../../lib/relativeTime'
import { ProjectNameInput, SaveAsForm, SaveStatus } from './ProjectFields.jsx'
import { addProjectToCart, useProjectsInCart } from './projectCart.js'

/**
 * Sidebar de proyectos del builder (patrón del sidebar de shadcn, armado con
 * nuestras piezas): el proyecto abierto o el borrador, «＋ Nuevo» y tus
 * proyectos, siempre a mano. Reemplaza la barra de arriba + el panel aparte.
 *
 * - Desktop: columna fija a la izquierda, plegable a una barra de íconos
 *   (Ctrl/⌘+B o el botón del header). Se recuerda plegado o no.
 * - Teléfono/tablet: el mismo contenido en un panel desde la izquierda.
 * - Sin sesión: el borrador vive en este navegador y se invita a entrar.
 *
 * `projects`: el objeto de useBuilderProjects. `openRequest`: /builder?project=ID.
 */
export default function BuilderSidebar({
  t,
  locale,
  loggedIn,
  authPending = false,
  itemsCount,
  projects,
  openRequest,
  onOpenRequestHandled,
  collapsed,
  onExpand,
  onCollapse,
  mobileOpen,
  onMobileClose,
}) {
  const { project, status, projects: list } = projects
  const draftCount = project ? 0 : itemsCount
  const [askOpenId, setAskOpenId] = useState(null)
  const [notice, setNotice] = useState('')

  // Abrir un proyecto pedido por URL: si pisaría un borrador sin guardar, se
  // pregunta en la lista (y el sidebar se abre para mostrarlo).
  useEffect(() => {
    if (!openRequest || !loggedIn) return
    onOpenRequestHandled()
    if (project?.id === openRequest) return
    if (draftCount > 0) {
      setAskOpenId(openRequest)
      onExpand()
      return
    }
    projects.open(openRequest).catch(() => setNotice(t('builder.projects.errorOpen')))
  }, [openRequest, loggedIn, project?.id, draftCount, projects, onOpenRequestHandled, onExpand, t])

  useEffect(() => {
    if (!notice) return undefined
    const id = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(id)
  }, [notice])

  const content = (
    <SidebarContent
      t={t}
      locale={locale}
      loggedIn={loggedIn}
      authPending={authPending}
      itemsCount={itemsCount}
      projects={projects}
      openRequest={openRequest}
      askOpenId={askOpenId}
      clearAsk={() => setAskOpenId(null)}
      notice={notice}
      onDone={onMobileClose}
    />
  )

  return (
    <>
      {/* Desktop */}
      <aside
        aria-label={t('builder.sidebar.label')}
        className={`sticky top-0 hidden h-svh shrink-0 flex-col border-r border-ink/15 bg-bone transition-[width] duration-200 ease-out-strong motion-reduce:transition-none lg:flex ${
          collapsed ? 'w-14' : 'w-72'
        }`}
        data-builder-sidebar={collapsed ? 'collapsed' : 'open'}
      >
        {collapsed ? (
          <div className="ui-fade-in flex flex-col items-center gap-2 py-3">
            <IconButton label={t('builder.sidebar.expand')} onClick={onExpand}>
              <PanelIcon />
            </IconButton>
            {project && (
              <span
                title={t(`builder.projects.status.${status === 'idle' ? 'saved' : status}`)}
                className="mt-2 grid size-11 place-items-center text-ink/60"
              >
                {status === 'saving' ? (
                  <Spinner />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${status === 'error' ? 'bg-danger' : status === 'pending' ? 'bg-ink/30' : 'bg-success'}`}
                  />
                )}
              </span>
            )}
            {loggedIn && list?.length ? (
              <span className="mt-auto text-[11px] tabular-nums text-ink/40" title={t('builder.projects.myProjects')}>
                {list.length}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="ui-fade-in flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-2">
              <p className="text-eyebrow uppercase text-ink/50">{t('builder.sidebar.title')}</p>
              <IconButton label={t('builder.sidebar.collapse')} onClick={onCollapse}>
                <PanelIcon />
              </IconButton>
            </div>
            {content}
          </div>
        )}
      </aside>

      {/* Teléfono y tablet */}
      <Drawer
        side="left"
        open={mobileOpen}
        onClose={onMobileClose}
        closeLabel={t('builder.projects.close')}
        title={t('builder.sidebar.title')}
        className="lg:hidden"
      >
        <div className="-mx-5 -my-4 flex min-h-full flex-col sm:-mx-6">{content}</div>
      </Drawer>
    </>
  )
}

/** Lo de adentro del sidebar (el mismo en la columna y en el panel del teléfono). */
function SidebarContent({ t, locale, loggedIn, authPending, itemsCount, projects, openRequest, askOpenId, clearAsk, notice, onDone }) {
  const { project, status, error, projects: list, max } = projects
  const [naming, setNaming] = useState(false)
  const [confirmBlank, setConfirmBlank] = useState(false)
  const draftCount = project ? 0 : itemsCount
  const atCap = Boolean(max && list && list.length >= max)
  const inCartIds = useProjectsInCart()

  if (!loggedIn && authPending) {
    return (
      <div className="space-y-3 px-4 py-4" aria-hidden="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10" />
        <Skeleton className="h-3 w-40" />
      </div>
    )
  }

  if (!loggedIn) {
    const next = openRequest ? `/builder?project=${encodeURIComponent(openRequest)}` : '/builder'
    return (
      <div className="px-4 py-4">
        <p className="text-body-sm text-ink/70">{t('builder.projects.draftLocal')}</p>
        <p className="mt-1 text-body-sm text-ink/50">{t('builder.sidebar.loggedOutHint')}</p>
        <Link to={`/login?next=${encodeURIComponent(next)}`} className="btn btn-sm btn-primary mt-4 w-full">
          {t('builder.projects.loginToSave')}
        </Link>
      </div>
    )
  }

  const startBlank = async () => {
    setConfirmBlank(false)
    await projects.startNew()
    onDone?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* El proyecto abierto o el borrador */}
      <section className="border-b border-ink/10 px-4 py-4" aria-label={t('builder.sidebar.current')}>
        <p className="text-eyebrow uppercase text-ink/45">
          {project ? t('builder.sidebar.open') : t('builder.sidebar.draft')}
        </p>
        {project ? (
          <div className="mt-1">
            <ProjectNameInput key={`${project.id}:${project.name}`} t={t} project={project} onRename={projects.rename} />
            <div className="mt-1 min-h-6">
              <SaveStatus t={t} status={status} error={error} onRetry={projects.retry} />
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-body-sm text-ink/70">
              {status === 'missing' ? t('builder.projects.status.missing') : t('builder.projects.draftUnsaved')}
            </p>
            <Collapse open={!naming}>
              <button
                type="button"
                onClick={() => setNaming(true)}
                disabled={itemsCount === 0 || atCap}
                title={atCap ? t('builder.projects.capNote', { max }) : itemsCount === 0 ? t('builder.sidebar.addFirst') : undefined}
                className="btn btn-sm btn-primary mt-3 w-full disabled:opacity-30"
              >
                {t('builder.projects.saveAs')}
              </button>
            </Collapse>
            <Collapse open={naming}>
              <div className="pt-3">
                <SaveAsForm
                  t={t}
                  locale={locale}
                  onCancel={() => setNaming(false)}
                  onSave={async (name) => {
                    await projects.saveAs(name)
                    setNaming(false)
                  }}
                />
              </div>
            </Collapse>
          </div>
        )}
        <Collapse open={Boolean(notice)}>
          <p role="alert" className="pt-2 text-body-sm text-danger">
            {notice}
          </p>
        </Collapse>
      </section>

      {/* ＋ Nuevo */}
      <div className="border-b border-ink/10 px-4 py-2">
        <button
          type="button"
          onClick={() => (draftCount > 0 ? setConfirmBlank(true) : startBlank())}
          disabled={!project && itemsCount === 0}
          className="action w-full disabled:opacity-30"
        >
          ＋ {t('builder.sidebar.newProject')}
        </button>
        <Collapse open={confirmBlank}>
          <div role="alert" className="pb-2 text-body-sm">
            <p className="text-ink/75">
              {draftCount === 1
                ? t('builder.projects.replaceDraftOne')
                : t('builder.projects.replaceDraft', { count: draftCount })}
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={startBlank} className="btn btn-sm btn-primary">
                {t('builder.projects.newBlankConfirm')}
              </button>
              <button type="button" onClick={() => setConfirmBlank(false)} className="action">
                {t('builder.projects.cancel')}
              </button>
            </div>
          </div>
        </Collapse>
      </div>

      {/* Tus proyectos */}
      <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
        <p className="text-eyebrow uppercase text-ink/45">{t('builder.projects.myProjects')}</p>
        {list && max ? (
          <span className="text-[11px] tabular-nums text-ink/40">
            {t('builder.projects.countOf', { count: list.length, max })}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 [scrollbar-width:thin]">
        {list === null ? (
          <div className="px-2">
            <SkeletonRows rows={4} label={t('builder.projects.loading')} />
          </div>
        ) : list.length === 0 ? (
          <p className="ui-fade-in px-2 py-3 text-body-sm text-ink/55">{t('builder.projects.empty')}</p>
        ) : (
          <SidebarProjectList
            t={t}
            locale={locale}
            list={list}
            currentId={project?.id}
            draftCount={draftCount}
            askOpenId={askOpenId}
            clearAsk={clearAsk}
            atCap={atCap}
            inCartIds={inCartIds}
            projects={projects}
            onDone={onDone}
          />
        )}
      </div>
      <p className="border-t border-ink/10 px-4 py-3 text-[12px] leading-snug text-ink/45">
        {t('builder.projects.autosaveHint')}
      </p>
    </div>
  )
}

/**
 * Lista compacta: cada proyecto se abre con un clic; «⋯» despliega Duplicar,
 * Al carrito y Borrar. Abrir sobre un borrador sin guardar y borrar piden
 * confirmación en la misma fila.
 */
function SidebarProjectList({ t, locale, list, currentId, draftCount, askOpenId, clearAsk, atCap, inCartIds, projects, onDone }) {
  const [menuFor, setMenuFor] = useState(null)
  const [confirm, setConfirm] = useState(askOpenId ? { id: askOpenId, kind: 'open' } : null)
  const [busy, setBusy] = useState(null)
  const [failed, setFailed] = useState(null)
  const lastConfirm = useRef(confirm)
  if (confirm) lastConfirm.current = confirm

  useEffect(() => {
    if (askOpenId) setConfirm({ id: askOpenId, kind: 'open' })
  }, [askOpenId])

  const run = async (key, fn) => {
    setBusy(key)
    setFailed(null)
    try {
      await fn()
      setConfirm(null)
      clearAsk()
    } catch (err) {
      setFailed({ key, message: err?.message || t('builder.projects.errorGeneric') })
    } finally {
      setBusy(null)
    }
  }

  const open = (p) => {
    if (p.id === currentId) return
    if (draftCount > 0) setConfirm({ id: p.id, kind: 'open' })
    else
      run(`open:${p.id}`, async () => {
        await projects.open(p.id)
        onDone?.()
      })
  }

  return (
    <ul className="space-y-0.5" data-builder-projects>
      {list.map((p) => {
        const isCurrent = p.id === currentId
        const name = p.name || t('builder.projects.untitled')
        const asking = confirm?.id === p.id ? confirm.kind : null
        const shownAsk = asking || (lastConfirm.current?.id === p.id ? lastConfirm.current.kind : null)
        const menuOpen = menuFor === p.id
        const error = failed?.key?.endsWith(`:${p.id}`) ? failed.message : ''
        return (
          <li key={p.id} data-project-id={p.id}>
            <div
              className={`group relative flex items-start gap-1 transition-colors ${
                isCurrent ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.04]'
              }`}
            >
              {isCurrent && <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 bg-accent" />}
              <button
                type="button"
                onClick={() => open(p)}
                aria-current={isCurrent ? 'true' : undefined}
                disabled={busy !== null}
                className="min-h-12 min-w-0 flex-1 px-3 py-2 text-left disabled:cursor-wait"
              >
                <span className="flex items-center gap-2">
                  <span className="truncate text-body-sm font-medium">{name}</span>
                  {busy === `open:${p.id}` && <Spinner className="text-ink/50" />}
                  {inCartIds.has(p.id) && (
                    <span className="shrink-0 text-[11px] text-accent-ink" title={t('builder.projects.inCart')}>
                      ●
                    </span>
                  )}
                </span>
                <span className="block truncate text-[12px] text-ink/50">
                  {p.sections === 1
                    ? t('builder.projects.sectionsOne')
                    : t('builder.projects.sections', { count: p.sections })}
                  {' · '}
                  {formatRelativeTime(p.updatedAt, locale, t('builder.projects.justNow'))}
                </span>
              </button>
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-label={t('builder.sidebar.moreFor', { name })}
                onClick={() => setMenuFor(menuOpen ? null : p.id)}
                className={`grid size-11 shrink-0 place-items-center text-ink/45 transition-opacity hover:text-ink ${
                  menuOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100'
                }`}
              >
                <span aria-hidden="true">⋯</span>
              </button>
            </div>

            {/* Acciones de la fila */}
            <Collapse open={menuOpen}>
              <div className="flex flex-wrap gap-x-4 px-3 pb-2">
                {!atCap && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`dup:${p.id}`, () =>
                        projects.duplicate(p.id, t('builder.projects.copyName', { name })),
                      )
                    }
                    className="action"
                  >
                    {busy === `dup:${p.id}` ? <Spinner className="mr-2" /> : null}
                    {t('builder.projects.duplicate')}
                  </button>
                )}
                {inCartIds.has(p.id) ? (
                  <span className="inline-flex min-h-11 items-center text-body-sm font-medium text-accent-ink">
                    ✓ {t('builder.projects.inCart')}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null || !p.sections}
                    title={!p.sections ? t('builder.projects.emptyCantBuy') : undefined}
                    onClick={() =>
                      run(`cart:${p.id}`, async () => {
                        if (isCurrent) await projects.retry()
                        await addProjectToCart(p, t('builder.compositionTitle'))
                      })
                    }
                    className="action"
                  >
                    {busy === `cart:${p.id}` ? <Spinner className="mr-2" /> : null}
                    {t('builder.projects.addToCart')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirm({ id: p.id, kind: 'delete' })}
                  className="action action-danger"
                >
                  {t('builder.projects.delete')}
                </button>
              </div>
            </Collapse>

            {/* Confirmación: abrir sobre un borrador sin guardar, o borrar */}
            <Collapse open={Boolean(asking)}>
              <div role="alert" className="mx-2 mb-2 border border-ink/15 bg-ink/[0.03] px-3 py-3 text-body-sm">
                <p>
                  {shownAsk === 'delete'
                    ? t('builder.projects.deleteConfirm', { name })
                    : draftCount === 1
                      ? t('builder.projects.replaceDraftOne')
                      : t('builder.projects.replaceDraft', { count: draftCount })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      shownAsk === 'delete'
                        ? run(`del:${p.id}`, async () => {
                            await projects.remove(p.id)
                            setMenuFor(null)
                          })
                        : run(`open:${p.id}`, async () => {
                            await projects.open(p.id)
                            onDone?.()
                          })
                    }
                    className={`btn btn-sm disabled:opacity-40 ${shownAsk === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                  >
                    {busy === `del:${p.id}` || busy === `open:${p.id}` ? <Spinner /> : null}
                    {shownAsk === 'delete' ? t('builder.projects.deleteYes') : t('builder.projects.openAnyway')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirm(null)
                      clearAsk()
                    }}
                    className="action"
                  >
                    {t('builder.projects.cancel')}
                  </button>
                </div>
              </div>
            </Collapse>

            <Collapse open={Boolean(error)}>
              <p role="alert" className="px-3 pb-2 text-body-sm text-danger">
                {error}
              </p>
            </Collapse>
          </li>
        )
      })}
    </ul>
  )
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="ui-press grid size-11 place-items-center text-ink/60 transition-colors hover:text-accent"
    >
      {children}
    </button>
  )
}

/** Ícono «panel lateral» (el del sidebar de shadcn: un rectángulo con su columna). */
export function PanelIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" />
      <path d="M6 2.5v11" />
    </svg>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Drawer from '../../components/Drawer'
import ProjectList from './ProjectList.jsx'

/**
 * Barra de proyecto del builder: qué composición está abierta, si está
 * guardada, y el acceso a «Mis proyectos». Sin sesión, el borrador vive en
 * este navegador y la barra invita a entrar para guardarlo en la cuenta.
 *
 * `projects` es el objeto de useBuilderProjects. `openRequest`: id de un
 * proyecto a abrir (viene de /builder?project=ID, por ejemplo desde la cuenta).
 */
export default function ProjectBar({
  t,
  locale,
  loggedIn,
  authPending = false,
  itemsCount,
  projects,
  openRequest,
  onOpenRequestHandled,
}) {
  const { project, status, error, projects: list, max } = projects
  const [drawer, setDrawer] = useState(false)
  const [naming, setNaming] = useState(false)
  const [askOpenId, setAskOpenId] = useState(null)
  const [confirmBlank, setConfirmBlank] = useState(false)
  const [notice, setNotice] = useState('')
  const draftCount = project ? 0 : itemsCount
  const atCap = Boolean(max && list && list.length >= max)

  // Abrir un proyecto pedido por URL: si pisaría un borrador sin guardar, se
  // pregunta en el panel en vez de reemplazarlo de una.
  useEffect(() => {
    if (!openRequest || !loggedIn) return
    onOpenRequestHandled()
    if (project?.id === openRequest) return
    if (draftCount > 0) {
      setAskOpenId(openRequest)
      setDrawer(true)
      return
    }
    projects.open(openRequest).catch(() => setNotice(t('builder.projects.errorOpen')))
  }, [openRequest, loggedIn, project?.id, draftCount, projects, onOpenRequestHandled, t])

  useEffect(() => {
    if (!notice) return undefined
    const id = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(id)
  }, [notice])

  const closeDrawer = () => {
    setDrawer(false)
    setAskOpenId(null)
    setConfirmBlank(false)
  }

  const openProject = async (id) => {
    await projects.open(id)
    closeDrawer()
  }

  const duplicateProject = (source) =>
    projects.duplicate(source.id, t('builder.projects.copyName', { name: source.name || t('builder.projects.untitled') }))

  const startBlank = async () => {
    await projects.startNew()
    closeDrawer()
  }

  if (!loggedIn && authPending) {
    // Mientras se confirma la sesión: el mismo alto, sin parpadear «Entrá».
    return (
      <div data-project-bar className={barClass} aria-hidden="true">
        <span className="min-h-11 text-eyebrow uppercase leading-[2.75rem] text-ink/45">{t('builder.projects.eyebrow')}</span>
      </div>
    )
  }

  if (!loggedIn) {
    const next = openRequest ? `/builder?project=${encodeURIComponent(openRequest)}` : '/builder'
    return (
      <div data-project-bar className={barClass}>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-eyebrow uppercase text-ink/45">{t('builder.projects.eyebrow')}</span>
          <span className="text-body-sm text-ink/70">{t('builder.projects.draftLocal')}</span>
        </div>
        <Link to={`/login?next=${encodeURIComponent(next)}`} className="btn btn-ghost">
          {t('builder.projects.loginToSave')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div data-project-bar className={barClass}>
        {/* En el teléfono el nombre va en su fila: con los botones al lado no entraba. */}
        <div className="flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-1 sm:basis-auto sm:flex-1">
          <span className="text-eyebrow uppercase text-ink/45">{t('builder.projects.eyebrow')}</span>
          {naming ? (
            <SaveAsForm
              t={t}
              locale={locale}
              onCancel={() => setNaming(false)}
              onSave={async (name) => {
                await projects.saveAs(name)
                setNaming(false)
              }}
            />
          ) : project ? (
            <>
              <ProjectNameInput key={`${project.id}:${project.name}`} t={t} project={project} onRename={projects.rename} />
              <SaveStatus t={t} status={status} error={error} onRetry={projects.retry} />
            </>
          ) : (
            <>
              <span className="text-body-sm text-ink/70">
                {status === 'missing' ? t('builder.projects.status.missing') : t('builder.projects.draftUnsaved')}
              </span>
              {itemsCount > 0 && status !== 'missing' ? (
                <span className="text-body-sm text-ink/45">{t('builder.projects.draftHint')}</span>
              ) : null}
            </>
          )}
          {notice ? (
            <span role="alert" className="text-body-sm text-danger">
              {notice}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!project && !naming ? (
            <button
              type="button"
              onClick={() => setNaming(true)}
              disabled={itemsCount === 0 || atCap}
              title={atCap ? t('builder.projects.capNote', { max }) : undefined}
              className="btn btn-primary disabled:opacity-30"
            >
              {t('builder.projects.saveAs')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              projects.refresh()
              setDrawer(true)
            }}
            className="btn btn-ghost"
            aria-haspopup="dialog"
          >
            {list?.length
              ? t('builder.projects.myProjectsCount', { count: list.length })
              : t('builder.projects.myProjects')}
          </button>
          {project ? (
            <button type="button" onClick={() => projects.startNew()} className="btn btn-ghost">
              {t('builder.projects.new')}
            </button>
          ) : null}
        </div>
      </div>

      <Drawer
        open={drawer}
        onClose={closeDrawer}
        closeLabel={t('builder.projects.close')}
        title={t('builder.projects.drawerTitle')}
        aside={
          list && max
            ? `${t('builder.projects.countOf', { count: list.length, max })} · ${t('builder.projects.autosaveHint')}`
            : t('builder.projects.autosaveHint')
        }
        footer={
          confirmBlank ? (
            <div role="alert" className="text-body-sm">
              <p>
                {draftCount === 1
                  ? t('builder.projects.replaceDraftOne')
                  : t('builder.projects.replaceDraft', { count: draftCount })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" data-autofocus onClick={startBlank} className="btn btn-primary">
                  {t('builder.projects.newBlankConfirm')}
                </button>
                <button type="button" onClick={() => setConfirmBlank(false)} className="btn btn-ghost">
                  {t('builder.projects.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (draftCount > 0 ? setConfirmBlank(true) : startBlank())}
              disabled={!project && itemsCount === 0}
              className="btn btn-ghost w-full disabled:opacity-30"
            >
              {t('builder.projects.newBlank')}
            </button>
          )
        }
      >
        {draftCount > 0 && !atCap ? (
          <div className="mb-4 border border-accent/40 bg-accent/[0.06] px-4 py-3 text-body-sm">
            <p>
              {draftCount === 1
                ? t('builder.projects.draftNoticeOne')
                : t('builder.projects.draftNotice', { count: draftCount })}
            </p>
            <button
              type="button"
              onClick={() => {
                closeDrawer()
                setNaming(true)
              }}
              className="tpl-hit relative mt-2 text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-accent"
            >
              {t('builder.projects.saveAs')}
            </button>
          </div>
        ) : null}
        {atCap ? <p className="mb-4 text-body-sm text-ink/60">{t('builder.projects.capNote', { max })}</p> : null}

        {list === null ? (
          <p className="py-6 text-body-sm text-ink/50">{t('builder.projects.loading')}</p>
        ) : list.length === 0 ? (
          <div className="border border-dashed border-ink/25 px-5 py-8 text-center">
            <p className="text-body-sm text-ink/60">{t('builder.projects.empty')}</p>
          </div>
        ) : (
          <ProjectList
            key={askOpenId || 'list'}
            t={t}
            locale={locale}
            projects={list}
            currentId={project?.id}
            draftCount={draftCount}
            askOpenId={askOpenId}
            onOpen={openProject}
            onDuplicate={atCap ? null : duplicateProject}
            onRemove={projects.remove}
          />
        )}
      </Drawer>
    </>
  )
}

const barClass =
  '-mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ink/15 pb-4'

/** Nombre del proyecto abierto, editable en el lugar (Enter / al salir guarda, Escape vuelve). */
function ProjectNameInput({ t, project, onRename }) {
  const [value, setValue] = useState(project.name)
  const [failed, setFailed] = useState(false)

  const commit = async () => {
    const next = value.replace(/\s+/g, ' ').trim()
    if (next === project.name) return
    if (!next) {
      setValue(project.name)
      return
    }
    try {
      await onRename(project.id, next)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }

  return (
    <label className="min-w-0 flex-1 sm:flex-none">
      <span className="sr-only">{t('builder.projects.nameLabel')}</span>
      <input
        value={value}
        maxLength={80}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setValue(project.name)
            e.currentTarget.blur()
          }
        }}
        size={Math.min(Math.max(value.length, 8), 40)}
        className={`min-h-11 w-full max-w-full border-b bg-transparent text-body font-medium outline-none sm:w-auto transition-colors focus:border-ink ${
          failed ? 'border-danger' : 'border-transparent hover:border-ink/25'
        }`}
      />
    </label>
  )
}

function SaveStatus({ t, status, error, onRetry }) {
  if (status === 'idle') return null
  return (
    <span aria-live="polite" className="flex items-center gap-2 text-body-sm text-ink/55" data-save-status={status}>
      {status === 'saved' ? (
        <>
          <span aria-hidden="true" className="text-accent">
            ✓
          </span>
          {t('builder.projects.status.saved')}
        </>
      ) : status === 'error' ? (
        <>
          <span className="text-danger" title={error || undefined}>
            {t('builder.projects.status.error')}
          </span>
          <button type="button" onClick={onRetry} className="tpl-hit relative underline underline-offset-4 hover:text-accent">
            {t('builder.projects.retry')}
          </button>
        </>
      ) : (
        t(`builder.projects.status.${status}`)
      )}
    </span>
  )
}

function SaveAsForm({ t, locale, onSave, onCancel }) {
  const [name, setName] = useState(() =>
    t('builder.projects.defaultName', {
      // Con la hora: dos guardados del mismo día no quedan con el mismo nombre.
      date: new Date().toLocaleString(locale === 'en' ? 'en' : 'es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    }),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  return (
    <form
      className="flex min-w-0 flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
          await onSave(name)
        } catch (err) {
          setError(err?.message || t('builder.projects.errorGeneric'))
          setSaving(false)
        }
      }}
    >
      <label className="min-w-0">
        <span className="sr-only">{t('builder.projects.nameLabel')}</span>
        <input
          autoFocus
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
          className="min-h-11 w-[min(18rem,70vw)] border border-ink/30 bg-transparent px-3 text-body outline-none focus:border-ink"
        />
      </label>
      <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary disabled:opacity-40">
        {saving ? t('builder.projects.status.saving') : t('builder.projects.save')}
      </button>
      <button type="button" onClick={onCancel} className="btn btn-ghost">
        {t('builder.projects.cancel')}
      </button>
      {error ? (
        <span role="alert" className="basis-full text-body-sm text-danger">
          {error}
        </span>
      ) : null}
    </form>
  )
}

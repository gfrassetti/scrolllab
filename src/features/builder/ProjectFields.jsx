import { useState } from 'react'
import Spinner from '../../components/Spinner'

/*
 * Piezas del proyecto abierto en el builder (las usa BuilderSidebar):
 * nombre editable en el lugar, estado del guardado y el formulario de
 * «Guardar como proyecto».
 */

/** Nombre del proyecto abierto, editable en el lugar (Enter / al salir guarda, Escape vuelve). */
export function ProjectNameInput({ t, project, onRename }) {
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
    <label className="block min-w-0">
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
        className={`min-h-11 w-full border-b bg-transparent text-body font-medium outline-none transition-colors focus:border-ink ${
          failed ? 'border-danger' : 'border-transparent hover:border-ink/25'
        }`}
      />
    </label>
  )
}

export function SaveStatus({ t, status, error, onRetry }) {
  if (status === 'idle') return null
  return (
    <span
      key={status}
      aria-live="polite"
      className="ui-fade-in flex items-center gap-2 text-body-sm text-ink/55"
      data-save-status={status}
    >
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
      ) : status === 'saving' ? (
        <>
          <Spinner /> {t('builder.projects.status.saving')}
        </>
      ) : (
        t(`builder.projects.status.${status}`)
      )}
    </span>
  )
}

export function SaveAsForm({ t, locale, onSave, onCancel }) {
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
      className="ui-fade-in flex min-w-0 flex-col gap-2"
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
      <label className="block min-w-0">
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
          className="min-h-11 w-full border border-ink/30 bg-transparent px-3 text-body outline-none focus:border-ink"
        />
      </label>
      <div className="flex gap-2">
      <button type="submit" disabled={saving || !name.trim()} className="btn btn-sm btn-primary flex-1 disabled:opacity-40">
        {saving ? (
          <>
            <Spinner /> {t('builder.projects.status.saving')}
          </>
        ) : (
          t('builder.projects.save')
        )}
      </button>
      <button type="button" onClick={onCancel} className="btn btn-sm btn-ghost">
        {t('builder.projects.cancel')}
      </button>
      </div>
      {error ? (
        <span role="alert" className="text-body-sm text-danger">
          {error}
        </span>
      ) : null}
    </form>
  )
}

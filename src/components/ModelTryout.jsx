import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { MODEL_STATUS_EVENT, modelFileSlug, useLocalModel } from '../lib/localModel'
import Spinner from './Spinner'

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`

/**
 * Debajo del campo «modelo propio (.glb)»: probar un archivo de la computadora
 * en la vista previa (sin hostearlo) y saber si el modelo cargó. La ruta que
 * viaja al ZIP sigue siendo la que se escribe en el campo; esto solo cambia lo
 * que se ve acá.
 */
export default function ModelTryout({ uid, value, onUseRoute }) {
  const { t } = useI18n()
  const local = useLocalModel((s) => s.byUid[uid])
  const setFile = useLocalModel((s) => s.setFile)
  const clear = useLocalModel((s) => s.clear)
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(null)

  // Lo que se está viendo en la vista previa: el archivo probado o la URL.
  const shownUrl = local?.url || String(value || '')

  useEffect(() => {
    setStatus(null)
  }, [shownUrl])

  useEffect(() => {
    const onStatus = (e) => {
      if (e.detail?.url === shownUrl) setStatus(e.detail.ok ? 'ok' : 'failed')
    }
    window.addEventListener(MODEL_STATUS_EVENT, onStatus)
    return () => window.removeEventListener(MODEL_STATUS_EVENT, onStatus)
  }, [shownUrl])

  const onPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const code = setFile(uid, file)
    setError(code ? t(`builder.model3d.${code}`, { size: mb(file.size) }) : '')
  }

  const route = local ? `/${modelFileSlug(local.name)}` : ''
  const routeIsSet = Boolean(local) && String(value || '') === route
  const typed = String(value || '').trim()
  const isProjectPath = typed.startsWith('/')

  let message = null
  if (!local && typed && status === 'failed') {
    message = isProjectPath ? t('builder.model3d.pathOnly') : t('builder.model3d.failed')
  } else if (status === 'ok') {
    message = t('builder.model3d.ok')
  }

  return (
    <div className="ui-fade-in rounded-sm border border-ink/15 bg-ink/[0.03] p-3 text-xs" data-model-tryout>
      <input
        ref={inputRef}
        type="file"
        accept=".glb,model/gltf-binary"
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {!local ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn btn-ghost btn-sm w-full"
          >
            {t('builder.model3d.pick')}
          </button>
          <p className="mt-2 leading-relaxed text-ink/55">{t('builder.model3d.pickHint')}</p>
        </>
      ) : (
        <div className="space-y-2">
          <p className="leading-relaxed text-ink/80">
            {t('builder.model3d.trying', { name: local.name, size: mb(local.size) })}
          </p>
          {status === null && (
            <p className="flex items-center gap-2 text-ink/55">
              <Spinner /> {t('builder.model3d.loading')}
            </p>
          )}
          {routeIsSet ? (
            <p className="leading-relaxed text-ink/60">
              {t('builder.model3d.zipNote', { file: `public${route}`, route })}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onUseRoute(route)}
              className="btn btn-ghost btn-sm w-full"
            >
              {t('builder.model3d.useRoute', { route })}
            </button>
          )}
          <div className="flex flex-wrap gap-x-4">
            <button type="button" onClick={() => inputRef.current?.click()} className="action">
              {t('builder.model3d.change')}
            </button>
            <button
              type="button"
              onClick={() => {
                clear(uid)
                setError('')
              }}
              className="action"
            >
              {t('builder.model3d.stop')}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={`mt-2 leading-relaxed ${status === 'failed' ? 'text-danger' : 'text-ink/60'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

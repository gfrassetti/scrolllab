import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import SnippetBox from '../components/SnippetBox'
import SectionFieldRow from '../components/SectionFieldRow'
import LabFramePreview from '../components/LabFramePreview'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'
import { getSection } from '../lib/sectionRegistry'
import {
  getSectionFields,
  sanitizeHostedProps,
  withoutEmptyRows,
} from '../lib/sectionFields'

const fieldClass =
  'mt-2 w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink'

const DEVICES = ['desktop', 'tablet', 'mobile']
const DEVICE_LABEL = {
  desktop: 'lab.previewDesktop',
  tablet: 'lab.previewTablet',
  mobile: 'lab.previewMobile',
}

/** JSON con las claves ordenadas: para comparar props sin falsos «cambió». */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/** Lo que el server guarda de esos props (sin filas vacías, `{}` si nada). */
const persisted = (props) => withoutEmptyRows(props || {}) || {}

/** Dominio tal como lo normaliza el server (para avisar los que descartó). */
function roughDomain(line) {
  const s = line.trim().toLowerCase()
  try {
    return new URL(s.includes('://') ? s : `https://${s}`).hostname.replace(/^www\./, '')
  } catch {
    return s
  }
}

export default function LabEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { refresh: refreshPlan } = usePlan()
  const { t } = useI18n()

  const [inst, setInst] = useState(null)
  const [loaderInfo, setLoaderInfo] = useState(null)
  const [props, setProps] = useState({})
  const [domainsText, setDomainsText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  // Varias secciones corren SplitText/GSAP una sola vez al montar, así que un
  // cambio de texto no se refleja. Remontamos el preview con debounce.
  const [previewKey, setPreviewKey] = useState(0)
  const [fullPreview, setFullPreview] = useState(false)
  // En un teléfono el preview de desktop quedaría diminuto: arranca en su ancho.
  const [device, setDevice] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280
    return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
  })
  // El frame real del embed no respondió: preview en React como antes.
  const [frameFailed, setFrameFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const [{ instance }, loader] = await Promise.all([
        api.hostedGet(id),
        api.embedLoader().catch(() => null),
      ])
      setInst(instance)
      setLoaderInfo(loader)
      setProps(instance.draftProps || {})
      setDomainsText((instance.domains || []).join('\n'))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const fields = useMemo(
    () => (inst ? getSectionFields(inst.sectionId) : []),
    [inst],
  )
  const section = inst ? getSection(inst.sectionId) : null
  const Preview = section?.component
  // Canvas del modelo (fondo y color de texto), como en el frame del embed.
  const canvasClass = section?.model?.wrapperClass || ''
  // El frame vive al lado del loader: …/v1/loader.js → …/v1/frame/index.html
  const frameSrc = loaderInfo?.url
    ? `${loaderInfo.url.replace(/\/loader\.js(?:[?#].*)?$/, '')}/frame/index.html#preview=1`
    : ''
  const useFrame = Boolean(frameSrc) && !frameFailed
  const previewProps = useMemo(() => persisted(props), [props])
  // Publicada pero con cambios (guardados o no) que el sitio todavía no ve.
  const unpublished =
    inst?.status === 'published' &&
    stableJson(previewProps) !== stableJson(persisted(inst.publishedProps))
  const firstAssetKey = fields.find(
    (f) => f.type === 'image' || (f.type === 'list' && f.item?.some((sub) => sub.type === 'image')),
  )?.key

  useEffect(() => {
    const t = setTimeout(() => setPreviewKey((k) => k + 1), 350)
    return () => clearTimeout(t)
  }, [props])

  // Pantalla completa: Escape cierra, se bloquea el scroll del body.
  useEffect(() => {
    if (!fullPreview) return undefined
    const onKey = (e) => e.key === 'Escape' && setFullPreview(false)
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [fullPreview])

  const setField = (key, value) => {
    setProps((prev) => sanitizeHostedProps(inst.sectionId, { ...prev, [key]: value }) || {})
  }

  const domains = () =>
    domainsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

  const save = async (publish) => {
    if (busy) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const { instance } = await api.hostedUpdate(id, {
        draftProps: props,
        domains: domains(),
        ...(publish ? { publish: true } : {}),
      })
      setInst(instance)
      setProps(instance.draftProps || {})
      setDomainsText((instance.domains || []).join('\n'))
      const saved = instance.domains || []
      const dropped = domains().filter((d) => !saved.includes(roughDomain(d)))
      if (dropped.length) setError(t('lab.domainsDropped', { list: dropped.join(', ') }))
      // Publicar consume cuota — el nav y HostedPlans leen del mismo estado
      // compartido, así que se enteran sin volver a montar. Y volvemos a la
      // lista, que ahí se ve el snippet y el estado (salvo que haya un aviso
      // de dominios descartados que leer acá).
      if (publish) {
        await refreshPlan()
        if (!dropped.length) {
          navigate('/lab')
          return
        }
      }
      setNotice(t(publish ? 'lab.published' : 'lab.saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const unpublish = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { instance } = await api.hostedUpdate(id, { unpublish: true })
      setInst(instance)
      setNotice('')
      await refreshPlan()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // El embed real (frame) si responde; si no, la sección de React con el canvas
  // del modelo. Las dos con los props tal como se guardan (sin filas vacías).
  const renderPreview = () =>
    useFrame ? (
      <LabFramePreview
        frameSrc={frameSrc}
        sectionId={inst.sectionId}
        props={previewProps}
        device={device}
        onFail={() => setFrameFailed(true)}
      />
    ) : (
      <div className={canvasClass}>
        <Preview key={previewKey} {...previewProps} />
      </div>
    )

  // Ancho del preview: el frame responde a su propio ancho (vw, breakpoints).
  const deviceToggle = useFrame ? (
    <div role="group" aria-label={t('lab.previewWidth')} className="flex gap-1">
      {DEVICES.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={device === d}
          onClick={() => setDevice(d)}
          className={`ui-press border-b px-1.5 py-1 text-[11px] uppercase tracking-[0.2em] ${
            device === d ? 'border-ink text-ink' : 'border-transparent text-ink/45 hover:text-ink'
          }`}
        >
          {t(DEVICE_LABEL[d])}
        </button>
      ))}
    </div>
  ) : null

  if (!loading && !user) return <Navigate to={`/login?next=/lab/${id}`} replace />

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="px-5 py-10 md:px-10">
        <Link
          to="/lab"
          className="text-[11px] uppercase tracking-[0.25em] text-ink/50 hover:text-accent"
        >
          {t('lab.back')}
        </Link>

        {/* Sin instancia (no cargó): arriba. Con instancia, el error va al lado
            de los botones — el tope del plan al publicar salía acá, fuera de
            pantalla, y parecía que «Publicar» no hacía nada. */}
        {error && !inst && (
          <p role="alert" className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!inst ? (
          <p className="mt-8 text-sm text-ink/50">…</p>
        ) : (
          <>
            <h1 className="mt-3 text-[clamp(1.6rem,4vw,2.6rem)] font-medium tracking-[-0.02em]">
              {section?.name || inst.sectionId}
            </h1>
            <p className="mt-1 font-mono text-xs text-ink/50">{inst.sectionId}</p>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,360px)_1fr]">
              {/* form — min-w-0: el <pre> del snippet ensanchaba la columna y la
                  página scrolleaba de costado en mobile */}
              <div className="min-w-0">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                  {t('lab.fields')}
                </h2>
                <div className="mt-4 space-y-4">
                  {fields.length === 0 && (
                    <p className="text-sm text-ink/50">{t('lab.noFields')}</p>
                  )}
                  {fields.map((field) => (
                    <SectionFieldRow
                      key={field.key}
                      field={field}
                      value={
                        props[field.key] ??
                        (field.type === 'select'
                          ? field.options?.[0]?.value
                          : undefined)
                      }
                      onChange={(next) => setField(field.key, next)}
                      absoluteUrls
                      hint={field.key === firstAssetKey ? t('lab.assetHint') : undefined}
                    />
                  ))}

                  <label className="block border-t border-ink/15 pt-4">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
                      {t('lab.domains')}
                    </span>
                    <textarea
                      rows={3}
                      value={domainsText}
                      onChange={(e) => setDomainsText(e.target.value)}
                      placeholder="cliente.com&#10;www.otrocliente.com"
                      className={fieldClass}
                    />
                    <span className="mt-1 block text-xs text-ink/45">
                      {t('lab.domainsHint')}
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => save(false)}
                    disabled={busy}
                    className="ui-press border border-ink/40 px-4 py-2 text-[11px] uppercase tracking-[0.25em] hover:border-ink disabled:opacity-40"
                  >
                    {t('lab.saveDraft')}
                  </button>
                  <button
                    type="button"
                    onClick={() => save(true)}
                    disabled={busy}
                    className="ui-press border border-ink bg-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-bone hover:opacity-90 disabled:opacity-40"
                  >
                    {t('lab.publish')}
                  </button>
                  {inst.status === 'published' && (
                    <button
                      type="button"
                      onClick={unpublish}
                      disabled={busy}
                      className="ui-press px-2 py-2 text-[11px] uppercase tracking-[0.2em] text-ink/40 hover:text-danger disabled:opacity-40"
                    >
                      {t('lab.unpublish')}
                    </button>
                  )}
                  {notice && (
                    <span className="self-center text-[11px] uppercase tracking-[0.2em] text-success">
                      {notice}
                    </span>
                  )}
                </div>
                {error && (
                  <p
                    role="alert"
                    className="mt-3 border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
                  >
                    {error}
                  </p>
                )}
                {unpublished && (
                  <p role="status" className="mt-3 text-xs text-ink/60">
                    {t('lab.unpublished')}
                  </p>
                )}

                <div className="mt-8">
                  <SnippetBox embedKey={inst.key} loaderInfo={loaderInfo} />
                  {inst.status !== 'published' && (
                    <p className="mt-2 text-xs text-ink/45">{t('lab.publishFirst')}</p>
                  )}
                </div>
              </div>

              {/* preview — en mobile va primero (si no, quedaba debajo de todo el
                  formulario); en desktop acompaña al scroll mientras se edita */}
              <div className="order-first min-w-0 lg:sticky lg:top-6 lg:order-none lg:self-start">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                    {t('lab.preview')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4">
                    {deviceToggle}
                    {Preview && (
                      <button
                        type="button"
                        onClick={() => setFullPreview(true)}
                        className="ui-press text-[11px] uppercase tracking-[0.2em] text-ink/50 hover:text-accent"
                      >
                        {t('lab.previewFull')} ⤢
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 max-h-[70vh] overflow-y-auto border border-ink/15 bg-bone">
                  {!Preview ? null : fullPreview ? (
                    <p className="p-6 text-sm text-ink/45">
                      {t('lab.previewInFull')}
                    </p>
                  ) : (
                    renderPreview()
                  )}
                </div>
                {useFrame && (
                  <p className="mt-2 text-xs text-ink/45">{t('lab.previewNote')}</p>
                )}
              </div>
            </div>

            {fullPreview && Preview && (
              <div className="fixed inset-0 z-[60] flex flex-col bg-bone">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
                  <span className="font-mono text-xs text-ink/60">
                    {section?.name || inst.sectionId}
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    {deviceToggle}
                    <button
                      type="button"
                      onClick={() => setFullPreview(false)}
                      className="ui-press text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
                    >
                      {t('lab.previewExit')} ✕
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">{renderPreview()}</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

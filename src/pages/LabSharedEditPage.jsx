import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import SectionFieldRow from '../components/SectionFieldRow'
import LabFramePreview from '../components/LabFramePreview'
import { useI18n } from '../i18n'
import { SITE_NAME } from '../lib/site'
import { getSection } from '../lib/sectionRegistry'
import { getSectionFields, sanitizeHostedProps, withoutEmptyRows } from '../lib/sectionFields'
import { LAB_HIDDEN_FIELDS, isLabFormSection } from '../domain/labForms'

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

const persisted = (props) => withoutEmptyRows(props || {}) || {}

/**
 * /lab/editar/:token — el cliente del dueño edita un widget SIN cuenta, con el
 * link secreto que le dio el dueño (Fase J). Solo contenido: textos, fotos y
 * colores, y republicar si el widget ya está publicado. No hay dominios, plan,
 * cuenta ni borrar. Sin SiteHeader a propósito: no tiene sesión que mostrar.
 */
export default function LabSharedEditPage() {
  const { token } = useParams()
  const { t } = useI18n()

  const [inst, setInst] = useState(null)
  const [loaderInfo, setLoaderInfo] = useState(null)
  const [props, setProps] = useState({})
  const [error, setError] = useState('')
  const [dead, setDead] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [device, setDevice] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280
    return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
  })
  const [frameFailed, setFrameFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const [{ instance }, loader] = await Promise.all([
        api.sharedEditGet(token),
        api.embedLoader().catch(() => null),
      ])
      setInst(instance)
      setLoaderInfo(loader)
      setProps(instance.draftProps || {})
      setError('')
    } catch (err) {
      setDead(true)
      setError(err.status === 403 ? t('lab.share.suspended') : t('lab.share.invalid'))
    }
  }, [token, t])

  useEffect(() => {
    load()
  }, [load])

  const fields = useMemo(
    () => (inst ? getSectionFields(inst.sectionId).filter((f) => !LAB_HIDDEN_FIELDS.includes(f.key)) : []),
    [inst],
  )
  const section = inst ? getSection(inst.sectionId) : null
  const Preview = section?.component
  const canvasClass = section?.model?.wrapperClass || ''
  const frameSrc = loaderInfo?.url
    ? `${loaderInfo.url.replace(/\/loader\.js(?:[?#].*)?$/, '')}/frame/index.html#preview=1`
    : ''
  const useFrame = Boolean(frameSrc) && !frameFailed
  const previewProps = useMemo(() => persisted(props), [props])
  const published = inst?.status === 'published'
  const unpublished = published && stableJson(previewProps) !== stableJson(persisted(inst.publishedProps))
  const firstAssetKey = fields.find(
    (f) => f.type === 'image' || (f.type === 'list' && f.item?.some((sub) => sub.type === 'image')),
  )?.key

  useEffect(() => {
    const id = setTimeout(() => setPreviewKey((k) => k + 1), 350)
    return () => clearTimeout(id)
  }, [props])

  const setField = (key, value) => {
    setProps((prev) => sanitizeHostedProps(inst.sectionId, { ...prev, [key]: value }) || {})
  }

  const save = async (publish) => {
    if (busy) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const { instance } = await api.sharedEditUpdate(token, {
        draftProps: props,
        ...(publish ? { publish: true } : {}),
      })
      setInst(instance)
      setProps(instance.draftProps || {})
      setNotice(t(publish ? 'lab.published' : 'lab.saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const renderPreview = () =>
    useFrame ? (
      <LabFramePreview
        frameSrc={frameSrc}
        sectionId={inst.sectionId}
        props={previewProps}
        device={device}
        freeBadge={inst.freeBadge}
        onFail={() => setFrameFailed(true)}
      />
    ) : (
      <div className={canvasClass}>
        <Preview key={previewKey} {...previewProps} />
      </div>
    )

  return (
    <div className="min-h-svh bg-bone text-ink">
      <header className="flex items-center justify-between border-b border-ink/15 px-5 py-4 md:px-10">
        <Link to="/lab" className="text-sm font-medium tracking-[0.2em] uppercase">
          {SITE_NAME}
        </Link>
      </header>
      <main className="px-5 py-10 md:px-10">
        {dead ? (
          <p role="alert" className="max-w-[60ch] border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        ) : !inst ? (
          <p className="text-sm text-ink/50">…</p>
        ) : (
          <>
            <h1 className="text-[clamp(1.6rem,4vw,2.6rem)] font-medium tracking-[-0.02em]">
              {section?.name || inst.sectionId}
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink/65">{t('lab.share.editing')}</p>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,360px)_1fr]">
              <div className="min-w-0">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">{t('lab.fields')}</h2>
                <div className="mt-4 space-y-4">
                  {isLabFormSection(inst.sectionId) && (
                    <p className="border-l-2 border-ink/30 pl-3 text-sm leading-relaxed text-ink/70">
                      {t('lab.share.formNote')}
                    </p>
                  )}
                  {fields.length === 0 && <p className="text-sm text-ink/50">{t('lab.noFields')}</p>}
                  {fields.map((field) => (
                    <SectionFieldRow
                      key={field.key}
                      field={field}
                      value={
                        props[field.key] ?? (field.type === 'select' ? field.options?.[0]?.value : undefined)
                      }
                      onChange={(next) => setField(field.key, next)}
                      absoluteUrls
                      hint={field.key === firstAssetKey ? t('lab.assetHint') : undefined}
                    />
                  ))}
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
                  {published && (
                    <button
                      type="button"
                      onClick={() => save(true)}
                      disabled={busy}
                      className="ui-press border border-ink bg-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-bone hover:opacity-90 disabled:opacity-40"
                    >
                      {t('lab.share.publish')}
                    </button>
                  )}
                  {notice && (
                    <span className="self-center text-[11px] uppercase tracking-[0.2em] text-success">{notice}</span>
                  )}
                </div>
                {!published && (
                  <p role="status" className="mt-3 text-xs text-ink/60">
                    {t('lab.share.notPublished')}
                  </p>
                )}
                {error && (
                  <p role="alert" className="mt-3 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
                    {error}
                  </p>
                )}
                {unpublished && (
                  <p role="status" className="mt-3 text-xs text-ink/60">
                    {t('lab.unpublished')}
                  </p>
                )}
              </div>

              <div className="order-first min-w-0 lg:sticky lg:top-6 lg:order-none lg:self-start">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">{t('lab.preview')}</h2>
                  {useFrame && (
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
                  )}
                </div>
                <div className="mt-4 max-h-[70vh] overflow-y-auto border border-ink/15 bg-bone">
                  {Preview ? renderPreview() : null}
                </div>
                {useFrame && <p className="mt-2 text-xs text-ink/45">{t('lab.previewNote')}</p>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

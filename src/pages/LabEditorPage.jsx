import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { embedSnippet } from '../lib/embed'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'
import { getSection } from '../lib/sectionRegistry'
import { getSectionFields, sanitizeProps } from '../lib/sectionFields'

const fieldClass =
  'mt-2 w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink'

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

  useEffect(() => {
    const t = setTimeout(() => setPreviewKey((k) => k + 1), 350)
    return () => clearTimeout(t)
  }, [props])

  const setField = (key, value) => {
    setProps((prev) => sanitizeProps(inst.sectionId, { ...prev, [key]: value }) || {})
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
    try {
      const { instance } = await api.hostedUpdate(id, {
        draftProps: props,
        domains: domains(),
        ...(publish ? { publish: true } : {}),
      })
      setInst(instance)
      setProps(instance.draftProps || {})
      setDomainsText((instance.domains || []).join('\n'))
      // Publicar consume cuota — el nav y HostedPlans leen del mismo estado
      // compartido, así que se enteran sin volver a montar. Y volvemos a la
      // lista, que ahí se ve el snippet y el estado.
      if (publish) {
        await refreshPlan()
        navigate('/lab')
        return
      }
      setNotice(t('lab.saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const unpublish = async () => {
    if (busy) return
    setBusy(true)
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

        {error && (
          <p className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
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
              {/* form */}
              <div>
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                  {t('lab.fields')}
                </h2>
                <div className="mt-4 space-y-4">
                  {fields.length === 0 && (
                    <p className="text-sm text-ink/50">{t('lab.noFields')}</p>
                  )}
                  {fields.map((field) => {
                    const value =
                      props[field.key] ??
                      (field.type === 'select'
                        ? field.options?.[0]?.value
                        : '') ??
                      ''
                    return (
                      <label key={field.key} className="block">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
                          {field.label}
                        </span>
                        {field.type === 'select' ? (
                          <select
                            value={value}
                            onChange={(e) => setField(field.key, e.target.value)}
                            className="mt-2 w-full border border-ink/20 bg-[#f2efe9] px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-ink"
                            style={{ colorScheme: 'light' }}
                          >
                            {(field.options || []).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={4}
                            value={value}
                            onChange={(e) => setField(field.key, e.target.value)}
                            className={fieldClass}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setField(field.key, e.target.value)}
                            className={fieldClass}
                          />
                        )}
                      </label>
                    )
                  })}

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

                <div className="mt-8">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-ink/50">
                    {t('lab.snippet')}
                  </p>
                  <pre className="overflow-x-auto border border-ink/15 bg-ink/[0.03] p-3 text-xs">
                    {embedSnippet(inst.key, loaderInfo)}
                  </pre>
                  {inst.status !== 'published' && (
                    <p className="mt-2 text-xs text-ink/45">{t('lab.publishFirst')}</p>
                  )}
                </div>
              </div>

              {/* preview */}
              <div>
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                  {t('lab.preview')}
                </h2>
                <div className="mt-4 max-h-[70vh] overflow-y-auto border border-ink/15 bg-bone">
                  {Preview ? <Preview key={previewKey} {...props} /> : null}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

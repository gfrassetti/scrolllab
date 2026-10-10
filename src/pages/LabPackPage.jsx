import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import SnippetBox from '../components/SnippetBox'
import LabFramePreview from '../components/LabFramePreview'
import { useAuth } from '../lib/auth'
import { useI18n } from '../i18n'
import { getSection } from '../lib/sectionRegistry'

const fieldClass =
  'mt-2 w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink'
const labelClass = 'text-[11px] uppercase tracking-[0.2em] text-ink/50'

/** Dominio tal como lo normaliza el server (para avisar los que descartó). */
function roughDomain(line) {
  const s = line.trim().toLowerCase()
  try {
    return new URL(s.includes('://') ? s : `https://${s}`).hostname.replace(/^www\./, '')
  } catch {
    return s
  }
}

const splitDomains = (text) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

/** Por qué un widget del pack no se muestra en el sitio, o null si se muestra. */
function hiddenReason(inst) {
  if (!inst) return 'draft'
  if (inst.status === 'suspended') return 'suspended'
  if (inst.status !== 'published') return 'draft'
  if (inst.frozen) return 'frozen'
  return null
}

/**
 * Editor de un pack de LAB: qué widgets van, en qué orden, en qué dominios.
 * El contenido de cada widget se edita en su editor; acá solo se arma la
 * página. La vista previa apila los frames reales con lo PUBLICADO de cada
 * uno, que es lo que muestra el snippet.
 */
export default function LabPackPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { t } = useI18n()

  const [pack, setPack] = useState(null)
  const [instances, setInstances] = useState([])
  const [loaderInfo, setLoaderInfo] = useState(null)
  const [maxItems, setMaxItems] = useState(30)
  const [name, setName] = useState('')
  const [items, setItems] = useState([])
  const [domainsText, setDomainsText] = useState('')
  const [adding, setAdding] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)

  const fill = (p) => {
    setPack(p)
    setName(p.name || '')
    setItems(p.items || [])
    setDomainsText((p.domains || []).join('\n'))
  }

  const load = useCallback(async () => {
    try {
      const [packRes, list, loader] = await Promise.all([
        api.packGet(id),
        api.hostedList(),
        api.embedLoader().catch(() => null),
      ])
      fill(packRes.pack)
      setMaxItems(packRes.maxItems || 30)
      setInstances(list.instances || [])
      setLoaderInfo(loader)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const byId = useMemo(() => new Map(instances.map((i) => [i.id, i])), [instances])
  const available = instances.filter((i) => !items.includes(i.id))
  const pick = adding && available.some((i) => i.id === adding) ? adding : available[0]?.id || ''

  const dirty =
    !!pack &&
    (name.trim() !== (pack.name || '') ||
      items.join(',') !== (pack.items || []).join(',') ||
      splitDomains(domainsText).join('\n') !== (pack.domains || []).join('\n'))

  const shown = items.map((i) => byId.get(i)).filter((inst) => inst && !hiddenReason(inst))

  // El frame vive al lado del loader: …/v1/loader.js → …/v1/frame/index.html
  const frameSrc = loaderInfo?.url
    ? `${loaderInfo.url.replace(/\/loader\.js(?:[?#].*)?$/, '')}/frame/index.html#preview=1`
    : ''

  const move = (index, delta) => {
    setItems((prev) => {
      const next = [...prev]
      const to = index + delta
      if (to < 0 || to >= next.length) return prev
      ;[next[index], next[to]] = [next[to], next[index]]
      return next
    })
    setNotice('')
  }

  const remove = (instId) => {
    setItems((prev) => prev.filter((i) => i !== instId))
    setNotice('')
  }

  const add = () => {
    if (!pick || items.length >= maxItems) return
    setItems((prev) => [...prev, pick])
    setAdding('')
    setNotice('')
  }

  const save = async () => {
    if (busy) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const wanted = splitDomains(domainsText)
      const { pack: saved } = await api.packUpdate(id, { name, items, domains: wanted })
      fill(saved)
      const dropped = wanted.filter((d) => !(saved.domains || []).includes(roughDomain(d)))
      if (dropped.length) setError(t('lab.domainsDropped', { list: dropped.join(', ') }))
      setNotice(t('lab.pack.saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const destroy = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api.packDelete(id)
      navigate('/lab')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!loading && !user) return <Navigate to={`/login?next=/lab/pack/${id}`} replace />

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

        {error && !pack && (
          <p role="alert" className="mt-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!pack ? (
          <p className="mt-8 text-sm text-ink/50">…</p>
        ) : (
          <>
            <h1 className="mt-3 text-[clamp(1.6rem,4vw,2.6rem)] font-medium tracking-[-0.02em]">
              {name.trim() || t('lab.pack.defaultName')}
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              {items.length === shown.length
                ? t(items.length === 1 ? 'lab.pack.countOne' : 'lab.pack.countMany', {
                    n: items.length,
                  })
                : t('lab.pack.countShown', { shown: shown.length, total: items.length })}
            </p>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
              <div className="min-w-0">
                <label className="block">
                  <span className={labelClass}>{t('lab.pack.name')}</span>
                  <input
                    type="text"
                    value={name}
                    maxLength={60}
                    onChange={(e) => {
                      setName(e.target.value)
                      setNotice('')
                    }}
                    placeholder={t('lab.pack.namePlaceholder')}
                    className={fieldClass}
                  />
                </label>

                <h2 className={`mt-8 ${labelClass}`}>{t('lab.pack.items')}</h2>
                {items.length === 0 ? (
                  <p className="mt-3 border border-dashed border-ink/25 px-4 py-5 text-sm text-ink/60">
                    {t('lab.pack.itemsEmpty')}
                  </p>
                ) : (
                  <ol className="mt-3 divide-y divide-ink/10 border border-ink/15">
                    {items.map((instId, i) => {
                      const inst = byId.get(instId)
                      const why = hiddenReason(inst)
                      return (
                        <li key={instId} className="flex items-start gap-3 px-3 py-3">
                          <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs tabular-nums text-ink/40">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${why ? 'text-ink/50' : 'text-ink'}`}>
                              {getSection(inst?.sectionId)?.name || inst?.sectionId || '—'}
                            </p>
                            {why ? (
                              <p className="mt-0.5 text-xs text-accent-ink">
                                {t(`lab.pack.hidden.${why}`)}
                              </p>
                            ) : (
                              <p className="mt-0.5 break-all font-mono text-xs text-ink/40">
                                {inst.sectionId}
                              </p>
                            )}
                            {inst && (
                              <Link
                                to={`/lab/${inst.id}`}
                                className="tpl-hit relative mt-1 inline-block text-[11px] uppercase tracking-[0.16em] text-ink/50 hover:text-accent"
                              >
                                {t('lab.pack.openWidget')}
                              </Link>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => move(i, -1)}
                              disabled={i === 0}
                              aria-label={t('lab.pack.up')}
                              title={t('lab.pack.up')}
                              className="ui-press grid h-11 w-9 place-items-center text-ink/55 hover:text-ink disabled:opacity-25"
                            >
                              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 8l4-4 4 4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => move(i, 1)}
                              disabled={i === items.length - 1}
                              aria-label={t('lab.pack.down')}
                              title={t('lab.pack.down')}
                              className="ui-press grid h-11 w-9 place-items-center text-ink/55 hover:text-ink disabled:opacity-25"
                            >
                              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 4l4 4 4-4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(instId)}
                              className="ui-press min-h-11 px-2 text-[11px] uppercase tracking-[0.16em] text-ink/45 hover:text-danger"
                            >
                              {t('lab.pack.remove')}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}

                <div className="mt-3 flex gap-2">
                  {available.length === 0 ? (
                    <p className="text-sm text-ink/50">
                      {instances.length === 0 ? t('lab.pack.needWidgets') : t('lab.pack.allAdded')}
                    </p>
                  ) : (
                    <>
                      <select
                        value={pick}
                        onChange={(e) => setAdding(e.target.value)}
                        aria-label={t('lab.pack.addPick')}
                        className="min-h-11 min-w-0 flex-1 border border-ink/20 bg-[#f2efe9] px-3 text-sm text-[#1a1a1a] outline-none focus:border-ink"
                        style={{ colorScheme: 'light' }}
                      >
                        {available.map((inst) => {
                          const why = hiddenReason(inst)
                          return (
                            <option key={inst.id} value={inst.id}>
                              {getSection(inst.sectionId)?.name || inst.sectionId}
                              {why ? ` — ${t(`lab.status.${why}`)}` : ''}
                            </option>
                          )
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={add}
                        disabled={items.length >= maxItems}
                        className="ui-press min-h-11 border border-ink/40 px-4 text-[11px] uppercase tracking-[0.25em] hover:border-ink disabled:opacity-40"
                      >
                        {t('lab.pack.add')}
                      </button>
                    </>
                  )}
                </div>

                <label className="mt-8 block border-t border-ink/15 pt-4">
                  <span className={labelClass}>{t('lab.domains')}</span>
                  <textarea
                    rows={3}
                    value={domainsText}
                    onChange={(e) => {
                      setDomainsText(e.target.value)
                      setNotice('')
                    }}
                    placeholder="cliente.com&#10;www.otrocliente.com"
                    className={fieldClass}
                  />
                  <span className="mt-1 block text-xs text-ink/45">{t('lab.pack.domainsHint')}</span>
                </label>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy || !dirty}
                    className="ui-press min-h-11 border border-ink bg-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-bone hover:opacity-90 disabled:opacity-40"
                  >
                    {t('lab.pack.save')}
                  </button>
                  {notice && !dirty && (
                    <span role="status" className="text-[11px] uppercase tracking-[0.2em] text-success">
                      {notice}
                    </span>
                  )}
                </div>
                {dirty && (
                  <p role="status" className="mt-3 text-xs text-ink/60">
                    {t('lab.pack.unsaved')}
                  </p>
                )}
                {error && (
                  <p role="alert" className="mt-3 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
                    {error}
                  </p>
                )}

                <div className="mt-8">
                  <SnippetBox embedKey={pack.key} loaderInfo={loaderInfo} />
                  <p className="mt-2 text-xs text-ink/45">{t('lab.pack.snippetNote')}</p>
                  <p className="mt-1 text-xs text-ink/45">{t('lab.pack.npmNote')}</p>
                </div>

                <div className="mt-10 border-t border-ink/15 pt-4">
                  {confirmDelete ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="w-full text-sm text-ink/70">{t('lab.pack.deleteConfirm')}</p>
                      <button
                        type="button"
                        onClick={destroy}
                        disabled={busy}
                        className="ui-press border border-danger px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-danger hover:bg-danger/10 disabled:opacity-40"
                      >
                        {t('lab.pack.deleteYes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="ui-press px-2 py-2 text-[11px] uppercase tracking-[0.2em] text-ink/55 hover:text-ink"
                      >
                        {t('lab.pack.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="ui-press min-h-11 text-[11px] uppercase tracking-[0.2em] text-ink/45 hover:text-danger"
                    >
                      {t('lab.pack.delete')}
                    </button>
                  )}
                </div>
              </div>

              {/* La página armada: los frames reales, uno debajo del otro, con lo
                  publicado de cada widget (lo que muestra el snippet). */}
              <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                <h2 className={labelClass}>{t('lab.pack.preview')}</h2>
                <div className="mt-4 max-h-[75vh] overflow-y-auto border border-ink/15 bg-bone">
                  {shown.length === 0 || !frameSrc ? (
                    <p className="p-6 text-sm text-ink/50">{t('lab.pack.previewEmpty')}</p>
                  ) : previewFailed ? (
                    <p className="p-6 text-sm text-ink/50">{t('lab.pack.previewFailed')}</p>
                  ) : (
                    shown.map((inst) => (
                      <LabFramePreview
                        key={inst.id}
                        frameSrc={frameSrc}
                        sectionId={inst.sectionId}
                        props={inst.publishedProps || {}}
                        device="desktop"
                        onFail={() => setPreviewFailed(true)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

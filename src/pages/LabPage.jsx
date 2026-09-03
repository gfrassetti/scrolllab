import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import LabSplash from '../components/LabSplash'
import LabDemo from '../components/LabDemo'
import LabDemoSync from '../components/LabDemoSync'
import FaqAccordion from '../components/FaqAccordion'
import HostedPlans from '../components/HostedPlans'
import { api } from '../lib/api'
import { embedSnippet } from '../lib/embed'
import { getSection } from '../lib/sectionRegistry'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'

const STATUS_TONE = {
  published: 'text-success border-success/40 bg-success/10',
  draft: 'text-ink/60 border-ink/25 bg-ink/5',
  suspended: 'text-danger border-danger/40 bg-danger/10',
}
// Congelada por el plan: no es un estado guardado, es derivado (el server
// manda `frozen`). Naranja, no rojo — es reversible: vuelve al re-suscribirse.
const FROZEN_TONE = 'text-accent border-accent/40 bg-accent/10'

export default function LabPage() {
  const { user, loading } = useAuth()
  const {
    plan,
    quota,
    canceledAt,
    currentPeriodEnd,
    trialAvailable,
    trialDays,
    loading: planLoading,
    refresh: refreshPlan,
  } = usePlan()
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  const goToPlanes = (e) => {
    e?.preventDefault?.()
    if (window.location.hash !== '#planes') {
      window.location.hash = 'planes'
    } else {
      document
        .getElementById('planes')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR') : ''

  const [instances, setInstances] = useState([])
  const [sections, setSections] = useState([])
  const [picked, setPicked] = useState('')
  const [loaderInfo, setLoaderInfo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  const faq = t('lab.faq')

  // LAB es de pago: un usuario free solo llega hasta `hostedFreeQuota`
  // instancias (0 = ninguna). Sobre eso, "＋ Nueva" queda bloqueada. Las que
  // ya tenía siguen guardadas (y se ven, congeladas). El server enforce esto.
  const labLocked =
    !!user &&
    !planLoading &&
    plan === 'free' &&
    instances.length >= (quota ?? 0)

  const load = useCallback(async () => {
    try {
      const [list, secs, loader] = await Promise.all([
        api.hostedList(),
        api.hostedSections(),
        api.embedLoader().catch(() => null),
      ])
      setInstances(list.instances || [])
      const secList = secs.sections || []
      setSections(secList)
      setPicked((p) => p || secList[0] || '')
      setLoaderInfo(loader)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const create = async () => {
    if (labLocked) {
      goToPlanes()
      return
    }
    const sectionId = picked || sections[0]
    if (!sectionId || busy) return
    setBusy(true)
    try {
      const { instance } = await api.hostedCreate(sectionId)
      navigate(`/lab/${instance.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const sectionLabel = (id) => getSection(id)?.name || id

  const remove = async (id) => {
    if (busy) return
    setBusy(true)
    try {
      await api.hostedDelete(id)
      await Promise.all([load(), refreshPlan()])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (key) => {
    try {
      await navigator.clipboard.writeText(embedSnippet(key, loaderInfo))
      setCopied(key)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      /* clipboard bloqueado */
    }
  }

  return (
    <div className="min-h-svh bg-bone text-ink">
      <LabSplash />
      <SiteHeader />
      <main className="px-5 py-12 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">
          {t('lab.eyebrow')}
        </p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em]">
          LAB
        </h1>
        <p className="mt-4 max-w-[56ch] text-sm leading-relaxed text-ink/70">
          {t('lab.body')}
        </p>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">
            Cómo funciona
          </p>
          <h2 className="mt-2 text-[clamp(1.4rem,3.5vw,2.2rem)] font-medium tracking-[-0.02em]">
            De una sección del catálogo a un{' '}
            <code className="font-mono">&lt;script&gt;</code> en cualquier sitio
          </h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <LabDemo key={locale} />
            <LabDemoSync key={locale} />
          </div>
          <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-ink/40">
            Prototipo. <strong className="font-medium text-ink/60">Izquierda</strong>:
            configurás la sección en LAB y pegás el{' '}
            <code className="font-mono">&lt;script&gt;</code> en el sitio.{' '}
            <strong className="font-medium text-ink/60">Derecha</strong>: cambiás
            el texto una vez y se actualiza en todos los sitios donde esté
            pegado. El mismo flujo real vive acá abajo.
          </p>
        </div>

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!user ? (
          loading ? null : (
            <div className="mt-10 border border-ink/15 p-6">
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('lab.yours')}
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm text-ink/60">
                {t('lab.loginPrompt')}
              </p>
              <Link
                to="/login?next=/lab"
                className="ui-press mt-4 inline-block border border-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] hover:bg-ink hover:text-bone"
              >
                {t('nav.login')}
              </Link>
            </div>
          )
        ) : (
          <>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('lab.yours')}
                {instances.length > 0 && (
                  <span className="ml-3 normal-case tracking-normal text-ink/40">
                    {t('lab.publishedCount', {
                      n: instances.filter((i) => i.status === 'published').length,
                      total: instances.length,
                    })}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={picked}
                  onChange={(e) => setPicked(e.target.value)}
                  disabled={sections.length === 0 || labLocked}
                  aria-label={t('lab.pickSection')}
                  className="border border-ink/20 bg-[#f2efe9] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#1a1a1a] outline-none focus:border-ink disabled:opacity-40"
                  style={{ colorScheme: 'light' }}
                >
                  {sections.map((id) => (
                    <option key={id} value={id}>
                      {sectionLabel(id)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={create}
                  disabled={busy || sections.length === 0 || labLocked}
                  title={labLocked ? t('lab.lockedTip') : undefined}
                  className="ui-press border border-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] hover:bg-ink hover:text-bone disabled:opacity-40"
                >
                  {t('lab.new')}
                </button>
              </div>
            </div>

            {labLocked && (
              <div className="mt-6 border border-accent/40 bg-accent/[0.06] p-5">
                <p className="text-sm leading-relaxed text-ink/75">
                  {trialAvailable
                    ? t(
                        quota > 0
                          ? 'lab.lockedMoreTrial'
                          : 'lab.lockedPaidTrial',
                        { n: trialDays || 7 },
                      )
                    : t(
                        quota > 0 ? 'lab.lockedMoreSub' : 'lab.lockedPaidSub',
                      )}
                  {instances.length > 0 && ` ${t('lab.lockedSaved')}`}
                </p>
                <a
                  href="#planes"
                  onClick={goToPlanes}
                  className="ui-press mt-3 inline-block border border-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] hover:bg-ink hover:text-bone"
                >
                  {trialAvailable
                    ? t('lab.planTrialCta', { n: trialDays || 7 })
                    : t('lab.viewOtherPlans')}
                </a>
              </div>
            )}

            {instances.length === 0 ? (
              labLocked ? null : (
                <p className="mt-6 text-sm text-ink/50">{t('lab.empty')}</p>
              )
            ) : (
              <ul className="mt-6 space-y-4">
                {instances.map((inst) => (
              <li
                key={inst.id}
                className="border border-ink/15 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm">{inst.sectionId}</span>
                  <span
                    className={`border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      inst.frozen
                        ? FROZEN_TONE
                        : STATUS_TONE[inst.status] || STATUS_TONE.draft
                    }`}
                  >
                    {inst.frozen
                      ? t('lab.status.frozen')
                      : t(`lab.status.${inst.status}`)}
                  </span>
                  {inst.status === 'published' && !inst.frozen && inst.views > 0 && (
                    <span className="text-[11px] tabular-nums text-ink/40">
                      {t('lab.views', { n: inst.views })}
                    </span>
                  )}
                  {inst.status === 'published' &&
                    !inst.frozen &&
                    inst.stopsOnPlanEnd &&
                    canceledAt &&
                    currentPeriodEnd && (
                      <span className="text-[11px] uppercase tracking-[0.2em] text-accent/90">
                        {t('lab.stopsOn', { date: fmtDate(currentPeriodEnd) })}
                      </span>
                    )}
                  <Link
                    to={`/lab/${inst.id}`}
                    className="ml-auto text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
                  >
                    {t('lab.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(inst.id)}
                    disabled={busy}
                    className="text-[11px] uppercase tracking-[0.2em] text-ink/40 hover:text-danger disabled:opacity-40"
                  >
                    {t('lab.delete')}
                  </button>
                </div>

                {inst.status === 'published' ? (
                  <div className="mt-4">
                    {inst.frozen && (
                      <p className="mb-3 border border-accent/40 bg-accent/10 px-3 py-2 text-xs leading-relaxed text-ink/70">
                        {t('lab.frozenHint')}
                      </p>
                    )}
                    <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-ink/50">
                      {t('lab.snippet')}
                    </p>
                    <pre className="overflow-x-auto border border-ink/15 bg-ink/[0.03] p-3 text-xs">
                      {embedSnippet(inst.key, loaderInfo)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copy(inst.key)}
                      className="ui-press mt-2 text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
                    >
                      {copied === inst.key ? t('lab.copied') : t('lab.copy')}
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-ink/50">{t('lab.draftHint')}</p>
                )}
              </li>
                ))}
              </ul>
            )}
          </>
        )}

        <HostedPlans />

        <section className="mt-16 border-t border-ink/15 pt-10">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
            {t('lab.guideTitle')}
          </h2>
          <ol className="mt-4 max-w-[60ch] space-y-3 text-sm leading-relaxed text-ink/70">
            <li>
              <span className="mr-2 font-mono text-ink/40">1</span>
              {t('lab.guide1')}
            </li>
            <li>
              <span className="mr-2 font-mono text-ink/40">2</span>
              {t('lab.guide2')}
            </li>
            <li>
              <span className="mr-2 font-mono text-ink/40">3</span>
              {t('lab.guide3')}
            </li>
          </ol>
        </section>

        <section className="mt-14 border-t border-ink/15 pt-10">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
            {t('lab.faqTitle')}
          </h2>
          <div className="mt-4 max-w-[68ch]">
            <FaqAccordion items={Array.isArray(faq) ? faq : []} />
          </div>
        </section>

        <p className="mt-14 max-w-[56ch] text-xs leading-relaxed text-ink/40">
          {t('lab.footnote')}{' '}
          <Link
            to="/builder"
            className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
          >
            {t('nav.builder')}
          </Link>
          .
        </p>
      </main>
    </div>
  )
}

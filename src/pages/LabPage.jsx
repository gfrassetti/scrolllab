import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap, useGSAP, SplitText } from '../lib/gsap'
import SiteHeader from '../components/SiteHeader'
import LabSplash from '../components/LabSplash'
import LabDemo from '../components/LabDemo'
import LabDemoCopy from '../components/LabDemoCopy'
import LabDemoPaste from '../components/LabDemoPaste'
import FaqAccordion from '../components/FaqAccordion'
import HostedPlans from '../components/HostedPlans'
import { api } from '../lib/api'
import SnippetBox from '../components/SnippetBox'
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
  const root = useRef(null)
  const demoPin = useRef(null)

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

  const steps = [t('lab.guide1'), t('lab.guide2'), t('lab.guide3')]

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // Mismo lenguaje que el wordmark del home: máscara + chars, LAB es la
      // marca de este producto puntual.
      const split = new SplitText('[data-lab-title]', {
        type: 'chars',
        mask: 'chars',
      })

      gsap.from(split.chars, {
        yPercent: 115,
        duration: 1,
        ease: 'power4.out',
        stagger: { each: 0.05 },
        delay: 0.1,
      })

      gsap.from('[data-lab-hero-meta]', {
        opacity: 0,
        y: 14,
        duration: 0.9,
        ease: 'power2.out',
        stagger: 0.12,
        delay: 0.5,
      })

      // Las 3 columnas de "cómo funciona": P1 de la bitácora de efectos
      // (docs/motion-cookbook.md) — pin + scrub, mismo método que
      // HorizontalPanels. La fila se fija y el scroll destapa cada demo en
      // cascada; volver para arriba las vuelve a tapar porque el scrub ata
      // el progreso del timeline directo a la posición de scroll (no hace
      // falta reverse manual). En mobile no pinea: reveal normal por
      // ScrollTrigger, con la misma regla play/reverse.
      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px)', () => {
        const cols = gsap.utils.toArray('[data-demo-col]', demoPin.current)
        gsap.set(cols, { opacity: 0, y: 28 })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: demoPin.current,
            start: 'top top',
            end: '+=120%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })

        cols.forEach((col, i) => {
          tl.to(col, { opacity: 1, y: 0, ease: 'none', duration: 1 }, i)
        })

        return () => gsap.set(cols, { clearProps: 'all' })
      })

      mm.add('(max-width: 767px)', () => {
        gsap.utils.toArray('[data-demo-col]', demoPin.current).forEach((col, i) => {
          gsap.from(col, {
            opacity: 0,
            y: 28,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: col,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          })
        })
      })

      // El revert del contexto no deshace el DOM que crea SplitText.
      return () => {
        mm.revert()
        split.revert()
      }
    },
    { scope: root, dependencies: [locale], revertOnUpdate: true },
  )

  return (
    <div ref={root} className="min-h-svh bg-bone text-ink">
      <LabSplash />
      <SiteHeader />
      <main className="px-5 py-16 md:px-10 md:py-24">
        {/* Hero — bloque centrado (el "momento"). Todo lo de abajo va alineado
            a la izquierda dentro del mismo contenedor. */}
        <div className="mx-auto max-w-2xl text-center">
          <p
            data-lab-hero-meta
            className="text-eyebrow uppercase text-ink/45"
          >
            {t('lab.eyebrow')}
          </p>
          <h1
            data-lab-title
            className="mt-3 font-brico text-display font-semibold text-accent-ink"
          >
            LAB
          </h1>
          <p
            data-lab-hero-meta
            className="mx-auto mt-5 max-w-[52ch] text-body-lg text-ink/80"
          >
            {t('lab.body')}
          </p>
        </div>

        {/* Cómo funciona — 3 pasos + un prototipo del cambio en vivo. */}
        <section className="mt-20 md:mt-28">
          <p className="text-eyebrow uppercase text-ink/45">Cómo funciona</p>
          <h2 className="mt-3 max-w-[22ch] text-title font-medium">
            De una sección del catálogo a un{' '}
            <code className="font-mono text-[0.8em]">&lt;script&gt;</code> en
            cualquier sitio
          </h2>

          <div
            ref={demoPin}
            className="relative mt-10 md:flex md:h-svh md:items-center"
          >
            <ol className="grid w-full gap-10 sm:grid-cols-3 sm:gap-8">
              {[LabDemo, LabDemoCopy, LabDemoPaste].map((Demo, i) => (
                <li key={i} className="border-t border-ink/20 pt-4">
                  <span className="font-mono text-body-sm text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-2 text-body text-ink/80">{steps[i]}</p>
                  <div data-demo-col className="mt-6">
                    <Demo key={locale} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-8 max-w-[72ch] text-body-sm text-ink/60">
            Prototipo. El flujo real vive más abajo.
          </p>
        </section>

        {/* Planes — la decisión. Subido acá, antes de "tus secciones". */}
        <div className="mt-20 md:mt-28">
          <HostedPlans />
        </div>

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm">
            {error}
          </p>
        )}

        {/* Tus secciones / login. */}
        <section className="mt-20 md:mt-28">
          {!user ? (
            loading ? null : (
              <div className="border border-ink/15 p-6 md:p-8">
                <h2 className="text-eyebrow uppercase text-ink/50">
                  {t('lab.yours')}
                </h2>
                <p className="mt-3 max-w-[48ch] text-body text-ink/70">
                  {t('lab.loginPrompt')}
                </p>
                <Link to="/login?next=/lab" className="btn btn-primary mt-5">
                  {t('nav.login')}
                </Link>
              </div>
            )
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-eyebrow uppercase text-ink/50">
                  {t('lab.yours')}
                  {instances.length > 0 && (
                    <span className="ml-3 normal-case tracking-normal text-ink/40">
                      {t('lab.publishedCount', {
                        n: instances.filter((i) => i.status === 'published')
                          .length,
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
                    className="min-h-11 border border-ink/20 bg-[#f2efe9] px-3 text-body-sm uppercase tracking-[0.12em] text-[#1a1a1a] outline-none focus:border-ink disabled:opacity-40"
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
                    className="btn btn-ghost disabled:opacity-40"
                  >
                    {t('lab.new')}
                  </button>
                </div>
              </div>

              {labLocked && (
                <div className="mt-6 border border-accent/40 bg-accent/[0.06] p-5 md:p-6">
                  <p className="text-body text-ink/80">
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
                    className="btn btn-primary mt-4"
                  >
                    {trialAvailable
                      ? t('lab.planTrialCta', { n: trialDays || 7 })
                      : t('lab.viewOtherPlans')}
                  </a>
                </div>
              )}

              {instances.length === 0 ? (
                labLocked ? null : (
                  <p className="mt-6 text-body text-ink/55">{t('lab.empty')}</p>
                )
              ) : (
                <ul className="mt-6 space-y-4">
                  {instances.map((inst) => (
                    <li
                      key={inst.id}
                      className="border border-ink/15 p-4 md:p-5"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-body-sm">
                          {inst.sectionId}
                        </span>
                        <span
                          className={`border px-2 py-0.5 text-eyebrow uppercase ${
                            inst.frozen
                              ? FROZEN_TONE
                              : STATUS_TONE[inst.status] || STATUS_TONE.draft
                          }`}
                        >
                          {inst.frozen
                            ? t('lab.status.frozen')
                            : t(`lab.status.${inst.status}`)}
                        </span>
                        {inst.status === 'published' &&
                          !inst.frozen &&
                          inst.views > 0 && (
                            <span className="text-body-sm tabular-nums text-ink/45">
                              {t('lab.views', { n: inst.views })}
                            </span>
                          )}
                        {inst.status === 'published' &&
                          !inst.frozen &&
                          inst.stopsOnPlanEnd &&
                          canceledAt &&
                          currentPeriodEnd && (
                            <span className="text-body-sm uppercase tracking-[0.14em] text-accent/90">
                              {t('lab.stopsOn', {
                                date: fmtDate(currentPeriodEnd),
                              })}
                            </span>
                          )}
                        <Link
                          to={`/lab/${inst.id}`}
                          className="ml-auto text-body-sm uppercase tracking-[0.14em] text-ink/60 hover:text-accent"
                        >
                          {t('lab.edit')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(inst.id)}
                          disabled={busy}
                          className="text-body-sm uppercase tracking-[0.14em] text-ink/45 hover:text-danger disabled:opacity-40"
                        >
                          {t('lab.delete')}
                        </button>
                      </div>

                      {inst.status === 'published' ? (
                        <div className="mt-4">
                          {inst.frozen && (
                            <p className="mb-3 border border-accent/40 bg-accent/10 px-3 py-2 text-body-sm text-ink/75">
                              {t('lab.frozenHint')}
                            </p>
                          )}
                          <SnippetBox
                            embedKey={inst.key}
                            loaderInfo={loaderInfo}
                          />
                        </div>
                      ) : (
                        <p className="mt-4 text-body-sm text-ink/55">
                          {t('lab.draftHint')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* FAQ. */}
        <section className="mt-20 border-t border-ink/15 pt-12 md:mt-28">
          <h2 className="text-title-sm font-medium">{t('lab.faqTitle')}</h2>
          <div className="mt-6 max-w-[68ch]">
            <FaqAccordion items={Array.isArray(faq) ? faq : []} />
          </div>
        </section>

        <p className="mt-16 max-w-[56ch] text-body-sm text-ink/60">
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

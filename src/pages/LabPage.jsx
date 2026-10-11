import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import Tabs, { TabPanel } from '../components/Tabs'
import WidgetTable from '../features/lab/WidgetTable.jsx'
import { getSection } from '../lib/sectionRegistry'
import { useAuth } from '../lib/auth'
import { usePlan } from '../lib/plan'
import { useI18n } from '../i18n'
import { prefersReducedMotion } from '../lib/motion'


/** `qa`: /lab-test — los planes de prueba (src/domain/qa.js). */
export default function LabPage({ qa = false }) {
  const { user, loading, hadSession } = useAuth()
  // Logueado, /lab es tu herramienta, no la página de venta: abre en tu zona de
  // trabajo (Widgets | Packs | Plan), sin intro, hero ni demo arriba. Mientras
  // se confirma la sesión, se decide con la pista de la última visita.
  const appMode = user ? true : loading ? hadSession : false
  const {
    plan,
    quota,
    canceledAt,
    currentPeriodEnd,
    pastDue,
    graceEndsAt,
    trialAvailable,
    trialDays,
    loading: planLoading,
    refresh: refreshPlan,
  } = usePlan()
  // Cuándo se apagan las publicadas por encima del tope free si el plan no
  // sigue: fin de lo pagado (baja) o fin de la gracia (cobro pendiente).
  const planStopsAt = canceledAt ? currentPeriodEnd : pastDue ? graceEndsAt : null
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const root = useRef(null)
  const demoPin = useRef(null)

  const goToPlanes = (e) => {
    e?.preventDefault?.()
    if (appMode) {
      setTab('plan')
      requestAnimationFrame(() =>
        document.getElementById('tus-widgets')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
      return
    }
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
  const [packs, setPacks] = useState([])
  // Los packs son de los planes pagos (el servidor lo decide; la UI lo explica).
  const [packsAllowed, setPacksAllowed] = useState(true)
  const [sections, setSections] = useState([])
  const [picked, setPicked] = useState('')
  // Widgets sueltos o packs: la pestaña vive en la URL (?tab=packs) para que
  // volver del editor de un pack deje en Packs.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  // Llegar por los planes (/lab#planes, links viejos y mails) o volver de una
  // pasarela (?suscripcion=volver, ?upgrade=volver) abre la pestaña Plan: ahí
  // vive el componente que termina ese flujo.
  const wantsPlan =
    (typeof window !== 'undefined' && window.location.hash === '#planes') ||
    !!searchParams.get('suscripcion') ||
    !!searchParams.get('upgrade')
  const tab =
    tabParam === 'packs' || tabParam === 'plan' ? tabParam : wantsPlan && appMode ? 'plan' : 'widgets'
  const setTab = (next) =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'widgets') p.delete('tab')
        else p.set('tab', next)
        return p
      },
      { replace: true },
    )
  useEffect(() => {
    if (appMode && wantsPlan && tabParam !== 'plan') {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', 'plan')
          return p
        },
        { replace: true },
      )
    }
  }, [appMode, wantsPlan, tabParam, setSearchParams])
  const [loaderInfo, setLoaderInfo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const faq = t('lab.faq')
  const platforms = t('lab.platforms')

  // Plan gratis publicable (HOSTED_FREE_QUOTA, 0 = LAB 100% de pago): el hero
  // solo promete "empezá gratis" si de verdad existe.
  const [freeQuota, setFreeQuota] = useState(0)
  useEffect(() => {
    let alive = true
    api
      .subscriptionPlans()
      .then((p) => alive && setFreeQuota(Number(p.freeQuota) || 0))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

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
      const [list, secs, loader, packRes] = await Promise.all([
        api.hostedList(),
        api.hostedSections(),
        api.embedLoader().catch(() => null),
        api.packList().catch(() => ({ packs: [] })),
      ])
      setInstances(list.instances || [])
      setPacks(packRes.packs || [])
      setPacksAllowed(packRes.allowed !== false)
      const secList = secs.sections || []
      setSections(secList)
      setPicked((p) => p || secList[0] || '')
      setLoaderInfo(loader)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // Volver del editor de un pack (/lab?tab=packs): directo a la zona de
  // trabajo, no al hero. Una vez, cuando ya cargó la lista.
  const jumpedToWorkspace = useRef(false)
  useEffect(() => {
    if (user) {
      load().then(() => {
        if (jumpedToWorkspace.current || !new URLSearchParams(window.location.search).get('tab')) return
        jumpedToWorkspace.current = true
        requestAnimationFrame(() =>
          document.getElementById('tus-widgets')?.scrollIntoView({ block: 'start' }),
        )
      })
    }
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

  const createPack = async () => {
    if (busy || instances.length === 0) return
    setBusy(true)
    try {
      const { pack } = await api.packCreate({})
      navigate(`/lab/pack/${pack.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  // Cuántos widgets de un pack se ven hoy en el sitio (publicados y cubiertos).
  const packShown = (pack) =>
    pack.items.filter((id) => {
      const inst = instances.find((i) => i.id === id)
      return inst && inst.status === 'published' && !inst.frozen
    }).length

  // Acciones en bloque de la tabla de widgets (uno por uno en el servidor; si
  // uno falla, se recarga igual para mostrar lo que sí se hizo).
  const bulk = async (ids, action) => {
    if (busy || ids.length === 0) return
    setBusy(true)
    try {
      for (const id of ids) {
        if (action === 'delete') await api.hostedDelete(id)
        else await api.hostedUpdate(id, { unpublish: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      await Promise.all([load(), refreshPlan()]).catch(() => {})
      setBusy(false)
    }
  }
  const removeMany = (ids) => bulk(ids, 'delete')
  const unpublishMany = (ids) => bulk(ids, 'unpublish')

  // Publicados contra el cupo del plan (no contra los creados: «5 de 6» se leía
  // como un cupo de 6). Las publicadas por encima del cupo están congeladas.
  const widgetsCountLine = (() => {
    if (instances.length === 0) return null
    const published = instances.filter((i) => i.status === 'published').length
    if (!Number.isFinite(quota)) {
      return t('lab.publishedCountUnlimited', { n: published, total: instances.length })
    }
    const frozen = Math.max(0, published - quota)
    return t(frozen ? 'lab.publishedCountFrozen' : 'lab.publishedCount', {
      n: published - frozen,
      quota,
      frozen,
      total: instances.length,
    })
  })()

  const steps = [t('lab.guide1'), t('lab.guide2'), t('lab.guide3')]

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current?.querySelector('[data-lab-title]')) return

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
    { scope: root, dependencies: [locale, appMode], revertOnUpdate: true },
  )

  return (
    <div ref={root} className="min-h-svh bg-bone text-ink">
      {appMode ? null : <LabSplash />}
      <SiteHeader />
      <main className={`px-5 md:px-10 ${appMode ? 'py-10 md:py-14' : 'py-16 md:py-24'}`}>
        {appMode ? (
          // Cabecera de la herramienta: dónde estás y con qué plan; la ayuda,
          // abajo. La venta (hero, demo, cuadro) no se repite en cada visita.
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-eyebrow uppercase text-ink/45">LAB</p>
              <h1 className="mt-2 text-title font-medium">{t('lab.app.title')}</h1>
              {!planLoading && (
                <p className="mt-2 text-body-sm text-ink/60" data-lab-plan-line>
                  {t('lab.app.planLine', { plan: t(`lab.tier.${String(plan || 'free').replace('hosted_', '')}`) })}{' '}
                  <button
                    type="button"
                    onClick={goToPlanes}
                    className="tpl-hit relative underline decoration-ink/30 underline-offset-2 hover:text-accent"
                  >
                    {t('lab.app.changePlan')}
                  </button>
                </p>
              )}
            </div>
            <a
              href="#ayuda"
              className="tpl-hit relative text-body-sm text-ink/60 underline decoration-ink/30 underline-offset-2 hover:text-accent"
            >
              {t('lab.app.help')}
            </a>
          </div>
        ) : (
          <>
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
            {/* La acción primaria del hero: a los planes (ahí se entra y se elige). */}
            <div data-lab-hero-meta className="mt-7 flex flex-col items-center gap-2">
              <a href="#planes" onClick={goToPlanes} className="btn btn-primary">
                {t(freeQuota > 0 ? 'lab.heroCtaFree' : 'lab.heroCtaPlans')}
              </a>
              {freeQuota > 0 && (
                <p className="text-body-sm text-ink/60">
                  {t(freeQuota === 1 ? 'lab.freeLineOne' : 'lab.freeLineMany', { n: freeQuota })}
                </p>
              )}
            </div>
            {/* LAB vs Builder en una línea: ¿ya tenés sitio o vas a hacer uno? */}
            <p data-lab-hero-meta className="mx-auto mt-3 max-w-[52ch] text-body-sm text-ink/60">
              {t('lab.siteSplit')}{' '}
              <Link
                to="/builder"
                className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
              >
                {t('nav.builder')}
              </Link>
              {t('lab.siteSplitAfter')}
            </p>
          </div>

          {/* Cómo funciona — 3 pasos, cada uno con su demo animada. */}
          <section className="mt-20 md:mt-28">
            <p className="text-eyebrow uppercase text-ink/45">{t('lab.howEyebrow')}</p>
            <h2 className="mt-3 max-w-[22ch] text-title font-medium">{t('lab.howTitle')}</h2>

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
          </section>

          {/* LAB o Builder: las mismas secciones, dos formas de usarlas. Corto a
              propósito: para qué sitio es, cómo se usa y cómo se paga. */}
          <section className="mt-20 md:mt-28" aria-labelledby="lab-vs-builder">
            <h2 id="lab-vs-builder" className="text-title-sm font-medium">
              {t('lab.compare.title')}
            </h2>
            <p className="mt-2 max-w-[60ch] text-body-sm text-ink/60">{t('lab.compare.lead')}</p>
            <div role="table" aria-labelledby="lab-vs-builder" className="mt-8 max-w-5xl">
              <div
                role="row"
                className="grid grid-cols-2 gap-x-6 pb-3 md:grid-cols-[minmax(0,13rem)_1fr_1fr]"
              >
                <span role="columnheader" className="sr-only md:not-sr-only" />
                <span role="columnheader" className="text-body font-medium text-accent-ink">
                  LAB
                </span>
                <span role="columnheader" className="text-body font-medium">
                  {t('nav.builder')}
                </span>
              </div>
              {(Array.isArray(t('lab.compare.rows')) ? t('lab.compare.rows') : []).map((row) => (
                <div
                  key={row.label}
                  role="row"
                  className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-ink/15 py-4 md:grid-cols-[minmax(0,13rem)_1fr_1fr]"
                >
                  <span
                    role="rowheader"
                    className="col-span-2 text-[11px] uppercase tracking-[0.2em] text-ink/50 md:col-span-1 md:pt-0.5"
                  >
                    {row.label}
                  </span>
                  <span role="cell" className="text-body-sm text-ink/85">
                    {row.lab}
                  </span>
                  <span role="cell" className="text-body-sm text-ink/60">
                    {row.builder}
                  </span>
                </div>
              ))}
              <div
                role="row"
                className="grid grid-cols-2 gap-x-6 border-t border-ink/15 pt-4 md:grid-cols-[minmax(0,13rem)_1fr_1fr]"
              >
                <span role="cell" className="hidden md:block" />
                <span role="cell">
                  <a
                    href="#planes"
                    onClick={goToPlanes}
                    className="tpl-hit relative text-body-sm underline decoration-ink/30 underline-offset-2 hover:text-accent"
                  >
                    {t('lab.compare.labCta')}
                  </a>
                </span>
                <span role="cell">
                  <Link
                    to="/builder"
                    className="tpl-hit relative text-body-sm underline decoration-ink/30 underline-offset-2 hover:text-accent"
                  >
                    {t('lab.compare.builderCta')}
                  </Link>
                </span>
              </div>
            </div>
          </section>

          {/* Planes — la decisión. Subido acá, antes de "tus secciones". */}
          <div className="mt-20 md:mt-28">
            <HostedPlans qa={qa} />
          </div>
          </>
        )}

        {error && (
          <p className="mt-6 border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm">
            {error}
          </p>
        )}

        {/* Tu espacio de LAB: widgets sueltos y packs, en dos pestañas. */}
        <section id="tus-widgets" className={`scroll-mt-24 ${appMode ? 'mt-10' : 'mt-20 md:mt-28'}`}>
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
              <h2 className="sr-only">{t('lab.yours')}</h2>
              <Tabs
                idBase="lab-ws"
                label={t('lab.yours')}
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'widgets', label: t('lab.tabs.widgets'), count: instances.length },
                  { id: 'packs', label: t('lab.tabs.packs'), count: packs.length },
                  { id: 'plan', label: t('lab.tabs.plan') },
                ]}
              />

              <TabPanel idBase="lab-ws" id="widgets" value={tab} className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-body-sm text-ink/55" data-lab-count>
                    {widgetsCountLine}
                  </p>
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
                  <WidgetTable
                    t={t}
                    instances={instances}
                    sectionLabel={sectionLabel}
                    loaderInfo={loaderInfo}
                    busy={busy}
                    planStopsAt={planStopsAt}
                    fmtDate={fmtDate}
                    onRemoveMany={removeMany}
                    onUnpublishMany={unpublishMany}
                  />
                )}
              </TabPanel>

              {/* Packs: varios widgets en una página, un solo snippet. */}
              <TabPanel idBase="lab-ws" id="packs" value={tab} className="pt-6">
                {packsAllowed ? (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-[64ch] text-body-sm text-ink/60">{t('lab.pack.intro')}</p>
                    <button
                      type="button"
                      onClick={createPack}
                      disabled={busy || instances.length === 0}
                      title={instances.length === 0 ? t('lab.pack.needWidgets') : undefined}
                      className="btn btn-ghost disabled:opacity-40"
                    >
                      {t('lab.pack.new')}
                    </button>
                  </div>
                ) : (
                  <div className="border border-accent/40 bg-accent/[0.06] p-5 md:p-6" data-lab-packs-locked>
                    <p className="max-w-[60ch] text-body text-ink/80">{t('lab.pack.paidOnly')}</p>
                    <a href="#planes" onClick={goToPlanes} className="btn btn-primary mt-4">
                      {t('lab.compare.labCta')}
                    </a>
                  </div>
                )}

                {!packsAllowed && packs.length === 0 ? null : packs.length === 0 ? (
                  <div className="mt-6 border border-dashed border-ink/20 px-5 py-8 text-center">
                    <p className="text-body text-ink/55">
                      {instances.length === 0 ? t('lab.pack.needWidgets') : t('lab.pack.empty')}
                    </p>
                  </div>
                ) : (
                  <ul className="mt-6 space-y-3">
                    {packs.map((pack) => {
                      const shownCount = packShown(pack)
                      const total = pack.items.length
                      return (
                        <li key={pack.id} className="border border-ink/15 p-4 md:p-5" data-lab-pack>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-body font-medium">{pack.name || t('lab.pack.defaultName')}</span>
                            <span className="text-body-sm tabular-nums text-ink/50">
                              {shownCount === total
                                ? t(total === 1 ? 'lab.pack.countOne' : 'lab.pack.countMany', { n: total })
                                : t('lab.pack.countShown', { shown: shownCount, total })}
                            </span>
                            <Link
                              to={`/lab/pack/${pack.id}`}
                              className="action ml-auto"
                            >
                              {t('lab.edit')}
                            </Link>
                          </div>
                          <div className="mt-4">
                            {!packsAllowed ? (
                              <p className="text-body-sm text-ink/55">{t('lab.pack.pausedNote')}</p>
                            ) : shownCount > 0 ? (
                              <SnippetBox embedKey={pack.key} loaderInfo={loaderInfo} />
                            ) : (
                              <p className="text-body-sm text-ink/55">
                                {total === 0 ? t('lab.pack.itemsEmpty') : t('lab.pack.nothingShown')}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </TabPanel>

              {/* El plan: los mismos planes de la página de venta, acá adentro. */}
              <TabPanel idBase="lab-ws" id="plan" value={tab} className="pt-2">
                <HostedPlans qa={qa} />
              </TabPanel>
            </>
          )}
        </section>

        {/* Guías por plataforma: dónde se pega el mismo snippet en cada una. */}
        <section id="ayuda" className="mt-20 scroll-mt-24 border-t border-ink/15 pt-12 md:mt-28">
          <h2 className="text-title-sm font-medium">{t('lab.platformsTitle')}</h2>
          <p className="mt-2 max-w-[60ch] text-body-sm text-ink/60">{t('lab.platformsNote')}</p>
          <div className="mt-6 max-w-[68ch]">
            <FaqAccordion items={Array.isArray(platforms) ? platforms : []} />
          </div>
        </section>

        {/* FAQ. */}
        <section className="mt-20 border-t border-ink/15 pt-12 md:mt-28">
          <h2 className="text-title-sm font-medium">{t('lab.faqTitle')}</h2>
          <div className="mt-6 max-w-[68ch]">
            <FaqAccordion items={Array.isArray(faq) ? faq : []} />
          </div>
        </section>

        <p className={`mt-16 max-w-[56ch] text-body-sm text-ink/60 ${appMode ? 'hidden' : ''}`}>
          {t('lab.footnote')}{' '}
          <Link
            to="/builder"
            className="underline decoration-ink/30 underline-offset-2 hover:text-accent"
          >
            {t('nav.builder')}
          </Link>
          {t('lab.footnoteAfter')}
        </p>
      </main>
    </div>
  )
}

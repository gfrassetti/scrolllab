import { useRef, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap, useGSAP, SplitText } from '../lib/gsap'
import { SITE_NAME, SUPPORT_EMAIL } from '../lib/site'
import SiteHeader from '../components/SiteHeader'
import { useCart } from '../lib/cart'
import { useI18n } from '../i18n'

const TEMPLATE_META = [
  {
    id: '01',
    sku: 'chapters',
    name: 'CHAPTERS',
    path: '/templates/chapters',
    palette: ['#f2efe9', '#161412', '#ff4b00'],
  },
  {
    id: '02',
    sku: 'nocturne',
    name: 'NOCTURNE',
    path: '/templates/nocturne',
    palette: ['#0e0e11', '#ece9e2', '#d9ff3f'],
  },
  {
    id: '03',
    sku: 'monolith',
    name: 'MONOLITH',
    path: '/templates/monolith',
    palette: ['#cdcbc4', '#101010', '#2b3cff'],
  },
]

/**
 * Home del catálogo. Header fijo, hero editorial, lista de modelos,
 * cómo funciona y footer.
 */
export default function TemplatesIndex() {
  const root = useRef(null)
  const addItem = useCart((s) => s.addItem)
  const { hash } = useLocation()
  const { t, locale } = useI18n()

  const templates = useMemo(
    () =>
      TEMPLATE_META.map((meta) => ({
        ...meta,
        vibe: t(`templates.${meta.sku}.vibe`),
        tags: t(`templates.${meta.sku}.tags`),
        description: t(`templates.${meta.sku}.description`),
      })),
    [t],
  )

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [hash])

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-hero-line]', {
        type: 'chars',
        mask: 'chars',
      })

      gsap.from(split.chars, {
        yPercent: 115,
        duration: 1.2,
        ease: 'power4.out',
        stagger: { each: 0.025 },
        delay: 0.15,
      })

      gsap.from('[data-hero-meta]', {
        opacity: 0,
        y: 14,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.12,
        delay: 0.9,
      })
    },
    { scope: root, dependencies: [locale] },
  )

  const steps = [
    { n: '01', title: t('home.step1Title'), body: t('home.step1Body') },
    { n: '02', title: t('home.step2Title'), body: t('home.step2Body') },
    { n: '03', title: t('home.step3Title'), body: t('home.step3Body') },
    { n: '04', title: t('home.step4Title'), body: t('home.step4Body') },
  ]

  return (
    <div ref={root} id="top" className="min-h-svh bg-bone text-ink">
      <SiteHeader />

      <main className="px-5 md:px-10">
        <section className="flex min-h-[90svh] flex-col justify-between overflow-hidden pt-16 pb-6 md:pt-24 md:pb-10">
          <p
            data-hero-meta
            className="max-w-[36ch] text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
          >
            {t('meta.tagline')}
          </p>

          <h1 className="select-none leading-[0.85] font-medium tracking-[-0.03em]">
            <span data-hero-line className="block text-[13vw] uppercase">
              {t('home.heroLine1')}
            </span>
            <span
              data-hero-line
              className="block pl-[10vw] font-display text-[13vw] font-normal italic tracking-normal text-accent"
            >
              {t('home.heroLine2')}
            </span>
            <span data-hero-line className="block text-[13vw] uppercase">
              {t('home.heroLine3')}
            </span>
          </h1>

          <div className="border-t border-ink/15 pt-4">
            <p
              data-hero-meta
              className="max-w-[52ch] text-sm leading-relaxed text-ink/70 md:text-base"
            >
              {t('home.heroBody')}
            </p>
            <div className="mt-6 flex items-end justify-between gap-4 text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
              <p data-hero-meta>©2026 — {SITE_NAME}</p>
              <p data-hero-meta className="text-ink">
                {t('home.scrollDown')} <span aria-hidden="true">↓</span>
              </p>
            </div>
          </div>
        </section>

        <section id="templates" className="scroll-mt-20">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
            {t('home.modelsLabel')}
          </p>

          <ul className="mt-4 border-t border-ink/15">
            {templates.map((template) => (
              <li key={template.id} className="border-b border-ink/15">
                <Link
                  to={template.path}
                  className="group grid gap-4 py-8 transition-colors duration-300 md:grid-cols-12 md:items-baseline md:gap-6 md:py-10"
                >
                  <span className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:col-span-1 md:text-xs">
                    {template.id}
                  </span>

                  <span className="text-[clamp(2rem,5vw,4.5rem)] leading-none font-medium tracking-[-0.02em] transition-colors duration-300 group-hover:text-accent md:col-span-4">
                    {template.name}
                  </span>

                  <span className="flex items-center gap-2 md:col-span-2">
                    {template.palette.map((color) => (
                      <span
                        key={color}
                        aria-hidden="true"
                        className="inline-block size-4 rounded-full border border-ink/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>

                  <span className="max-w-[44ch] text-sm leading-relaxed text-ink/70 md:col-span-4">
                    <span className="mb-1 block text-[11px] uppercase tracking-[0.25em] text-ink/50">
                      {template.vibe}
                    </span>
                    {template.description}
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-2xl transition-transform duration-300 group-hover:translate-x-2 md:col-span-1 md:justify-self-end"
                  >
                    →
                  </span>
                </Link>

                <p className="flex flex-wrap items-center gap-4 pb-6 text-[11px] uppercase tracking-[0.25em] text-ink/40 md:-mt-4">
                  <span>
                    {Array.isArray(template.tags)
                      ? template.tags.join(' · ')
                      : template.tags}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      addItem({
                        sku: template.sku,
                        title: `${template.name} — template`,
                      })
                    }
                    className="border border-ink/30 px-3 py-1.5 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-bone"
                  >
                    {t('common.addToCart')}
                  </button>
                  <Link
                    to="/cart"
                    className="text-ink transition-colors hover:text-accent"
                  >
                    {t('common.buy')}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="como-funciona"
          className="mt-20 scroll-mt-20 border-t border-ink/15 pt-14 md:mt-28 md:pt-20"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
            {t('nav.howItWorks')}
          </p>
          <h2 className="mt-3 max-w-[18ch] text-[clamp(1.8rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
            {t('home.howTitleBefore')}{' '}
            <em className="font-display font-normal italic text-accent">
              {t('home.howTitleZip')}
            </em>
            {t('home.howTitleAfter')}
          </h2>
          <p className="mt-5 max-w-[52ch] text-sm leading-relaxed text-ink/70 md:text-base">
            {t('home.howBodyBefore')}{' '}
            <strong className="font-medium text-ink">
              {t('home.howBodyStrong')}
            </strong>{' '}
            {t('home.howBodyAfter')}
          </p>

          <ol className="mt-12 grid gap-8 border-t border-ink/15 md:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {steps.map((step) => (
              <li
                key={step.n}
                className="border-ink/15 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-[11px] uppercase tracking-[0.25em] text-accent">
                  {step.n}
                </p>
                <p className="mt-3 text-base font-medium tracking-[-0.01em] md:text-lg">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-6 border border-ink/15 p-6 md:grid-cols-2 md:p-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('home.zipTitle')}
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
                <li>{t('home.zip1')}</li>
                <li>{t('home.zip2')}</li>
                <li>{t('home.zip3')}</li>
                <li>{t('home.zip4')}</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('home.reqTitle')}
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
                <li>{t('home.req1')}</li>
                <li>
                  {t('home.req2Before')}{' '}
                  <Link
                    to="/legal/license"
                    className="underline decoration-ink/30 underline-offset-2 transition-colors hover:text-accent"
                  >
                    {t('home.req2License')}
                  </Link>
                </li>
                <li>{t('home.req3')}</li>
                <li>{t('home.req4')}</li>
              </ul>
            </div>
          </div>
        </section>

        <Link
          to="/builder"
          className="group mt-16 block border-2 border-ink p-6 transition-colors duration-300 hover:bg-ink hover:text-bone md:mt-24 md:p-10"
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.25em] opacity-60 md:text-xs">
            {t('home.builderEyebrow')}
          </p>
          <p className="flex items-baseline justify-between gap-4">
            <span className="text-[clamp(1.8rem,4.5vw,4rem)] leading-none font-medium tracking-[-0.02em]">
              {t('home.builderTitleBefore')}{' '}
              <em className="font-display font-normal italic text-accent">
                {t('home.builderTitleEm')}
              </em>
            </span>
            <span
              aria-hidden="true"
              className="text-2xl transition-transform duration-300 group-hover:translate-x-2"
            >
              →
            </span>
          </p>
          <p className="mt-3 max-w-[52ch] text-sm leading-relaxed opacity-70">
            {t('home.builderBody')}
          </p>
        </Link>
      </main>

      <footer className="mt-20 border-t border-ink/15 px-5 pt-10 pb-8 md:mt-32 md:px-10 md:pt-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="text-[clamp(2rem,6vw,4.5rem)] leading-none font-medium tracking-[-0.02em]">
              {SITE_NAME}
            </p>
            <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-ink/70">
              {t('meta.tagline')}
            </p>
          </div>

          <nav className="md:col-span-2" aria-label={t('home.footerTemplates')}>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
              {t('home.footerTemplates')}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {templates.map((template) => (
                <li key={template.id}>
                  <Link
                    to={template.path}
                    className="transition-colors duration-300 hover:text-accent"
                  >
                    {template.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-label={t('home.footerBuilder')}>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
              {t('home.footerBuilder')}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  to="/builder"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerBuildPage')}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/license"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerLicense')}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/privacy"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerPrivacy')}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/terms"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerTerms')}
                </Link>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerHow')}
                </a>
              </li>
              <li>
                <Link
                  to="/account"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerAccount')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-label={t('home.footerContact')}>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
              {t('home.footerContact')}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ink/15 pt-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:flex-row md:items-baseline md:justify-between md:text-xs">
          <p>©2026 {SITE_NAME}</p>
          <a
            href="#top"
            className="transition-colors duration-300 hover:text-accent"
          >
            {t('home.backTop')} <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

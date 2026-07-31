import { useRef, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { gsap, useGSAP, SplitText, ScrollTrigger } from '../lib/gsap'
import { SITE_NAME, SUPPORT_EMAIL } from '../lib/site'
import SiteHeader from '../components/SiteHeader'
import Logo from '../components/Logo'
import BrandSplash from '../components/BrandSplash'
import { useCart } from '../lib/cart'
import {
  BUNDLE_PRICE_USD,
  CUSTOM_BASE_PRICE_USD,
  arsFromUsd,
  bundleDiscountPct,
  bundleListPriceUsd,
  estimateCustomPriceUsd,
  formatArs,
  templatePriceUsd,
} from '../lib/pricing'
import { useFxRate } from '../lib/fx'
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
  {
    id: '04',
    sku: 'velocity',
    name: 'VELOCITY',
    path: '/templates/velocity',
    palette: ['#0a1a12', '#ece9e2', '#d9ff3f'],
  },
  {
    id: '05',
    sku: 'fizz',
    name: 'FIZZ',
    path: '/templates/fizz',
    palette: ['#241352', '#fff3e2', '#ff3ea5'],
  },
  {
    id: '06',
    sku: 'atelier',
    name: 'ATELIER',
    path: '/templates/atelier',
    palette: ['#0b0c10', '#f2f2f2', '#c8d0dc'],
  },
]

function TemplatePoster({ template, index }) {
  const baseClass =
    'absolute inset-0 overflow-hidden border border-ink/15 transition-opacity'

  if (template.sku === 'chapters') {
    return (
      <div
        data-template-art
        className={`${baseClass} bg-[#f2efe9] text-[#161412]`}
        style={{ opacity: index === 0 ? 1 : 0 }}
      >
        <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em]">
          EDITORIAL / 01
        </span>
        <span className="absolute top-[22%] left-[-3%] text-[clamp(4rem,10vw,9rem)] leading-[0.75] font-semibold tracking-[-0.08em]">
          CHA
          <br />
          PTERS
        </span>
        <span className="absolute right-0 bottom-[18%] h-[13%] w-[72%] bg-accent" />
        <span className="absolute right-5 bottom-5 font-display text-3xl italic">
          kinetic stories
        </span>
      </div>
    )
  }

  if (template.sku === 'nocturne') {
    return (
      <div
        data-template-art
        className={`${baseClass} bg-noir text-salt`}
        style={{ opacity: 0 }}
      >
        <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] text-acid">
          CINEMA / 02
        </span>
        <span className="absolute top-[14%] right-[8%] aspect-square w-[56%] rounded-full border border-acid/70" />
        <span className="absolute top-[26%] right-[20%] aspect-square w-[32%] rounded-full bg-acid" />
        <span className="absolute bottom-[14%] left-5 text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.8] font-light tracking-[-0.07em]">
          NOC
          <br />
          TURNE
        </span>
        <span className="absolute right-5 bottom-5 text-[10px] tracking-[0.25em]">
          AFTER DARK
        </span>
      </div>
    )
  }

  if (template.sku === 'monolith') {
    return (
      <div
        data-template-art
        className={`${baseClass} bg-concrete text-carbon`}
        style={{ opacity: 0 }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(#101010 1px, transparent 1px), linear-gradient(90deg, #101010 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
        <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em]">
          SYSTEM / 03
        </span>
        <span className="absolute top-[18%] left-[18%] h-[56%] w-[54%] rotate-6 bg-klein shadow-[18px_18px_0_#101010]" />
        <span className="absolute right-5 bottom-[12%] text-right font-anton text-[clamp(3.2rem,8vw,7rem)] leading-[0.75] tracking-[-0.04em]">
          MONO
          <br />
          LITH
        </span>
      </div>
    )
  }

  if (template.sku === 'velocity') {
    return (
      <div
        data-template-art
        className={`${baseClass} bg-[#0a1a12] text-[#ece9e2]`}
        style={{ opacity: 0 }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-radial-gradient(circle at 40% 40%, transparent 0 16px, rgba(236,233,226,0.08) 16px 17px)`,
          }}
        />
        <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] text-acid">
          ATHLETE / 04
        </span>
        <span className="absolute top-[28%] left-5 h-1 w-[42%] -rotate-12 bg-acid" />
        <span className="absolute bottom-[16%] left-5 font-brico text-[clamp(3rem,8vw,7rem)] leading-[0.8] font-semibold tracking-[-0.05em]">
          VELO
          <br />
          CITY
        </span>
        <span className="absolute right-5 bottom-5 font-display text-2xl italic text-acid">
          full send
        </span>
      </div>
    )
  }

  if (template.sku === 'fizz') {
    return (
      <div
        data-template-art
        className={`${baseClass} bg-grape text-foam`}
        style={{ opacity: 0 }}
      >
        <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] text-fizz">
          POP / 05
        </span>
        <span className="absolute top-[12%] right-[10%] aspect-square w-[26%] rounded-full bg-[#ffb02e]" />
        <span className="absolute top-[38%] right-[28%] aspect-square w-[14%] rounded-full bg-[#3ddc97]" />
        <span className="absolute top-[24%] right-[38%] aspect-square w-[8%] rounded-full bg-fizz" />
        <span className="absolute bottom-[14%] left-5 font-brico text-[clamp(3rem,8vw,7rem)] leading-[0.8] font-extrabold tracking-[-0.04em]">
          FIZZ
          <span className="text-fizz">*</span>
        </span>
        <span className="absolute right-5 bottom-5 font-display text-2xl italic text-[#ffb02e]">
          drink the spark
        </span>
      </div>
    )
  }

  return (
    <div
      data-template-art
      className={`${baseClass} bg-[#0b0c10] text-[#f2f2f2]`}
      style={{ opacity: 0 }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 40%, rgba(200,208,220,0.18), transparent 55%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06), transparent 40%)',
        }}
      />
      <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] text-white/50">
        STUDIO / 06
      </span>
      <span className="absolute top-1/2 left-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 border border-white/25 bg-white/[0.04] shadow-[0_0_60px_rgba(200,208,220,0.12)]" />
      <span className="absolute bottom-[14%] left-5 font-brico text-[clamp(3rem,8vw,7rem)] leading-[0.8] font-semibold tracking-[-0.05em]">
        ATE
        <br />
        LIER
      </span>
      <span className="absolute right-5 bottom-5 text-[10px] tracking-[0.28em] text-white/45 uppercase">
        scroll the fog
      </span>
    </div>
  )
}

/**
 * Home del catálogo. Header fijo, hero editorial, lista de modelos,
 * cómo funciona y footer.
 */
export default function TemplatesIndex() {
  const root = useRef(null)
  const addItem = useCart((s) => s.addItem)
  const { hash } = useLocation()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { rate } = useFxRate()
  const [introReady, setIntroReady] = useState(false)

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
    if (!introReady) {
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
      }
    }
    return undefined
  }, [introReady])

  useEffect(() => {
    if (!hash || !introReady) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [hash, introReady])

  useGSAP(
    () => {
      if (!introReady) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // Logo del hero: barras caen de arriba y se apilan (alusión al scroll).
      const heroLogo = root.current?.querySelector('[data-hero-logo]')
      const bars = heroLogo
        ? gsap.utils.toArray(heroLogo.querySelectorAll('[data-logo-bar]'))
        : []
      const accent = heroLogo?.querySelector('[data-logo-accent]')
      if (bars.length) {
        gsap.set(bars, { transformOrigin: '50% 50%' })
        gsap.from(bars, {
          y: -28,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.12,
          delay: 0.05,
        })
      }
      if (accent) {
        gsap.from(accent, {
          scale: 0,
          opacity: 0,
          duration: 0.4,
          ease: 'back.out(2.2)',
          transformOrigin: '50% 50%',
          delay: 0.45,
        })
      }

      // Title + tagline: revelado por caracteres (como está).
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

      // El revert del contexto no deshace el DOM que crea SplitText.
      return () => split.revert()
    },
    { scope: root, dependencies: [locale, introReady], revertOnUpdate: true },
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const artworks = gsap.utils.toArray('[data-template-art]')
          const templateSteps = gsap.utils.toArray('[data-template-step]')

          const activateTemplate = (activeIndex) => {
            artworks.forEach((artwork, index) => {
              gsap.to(artwork, {
                autoAlpha: index === activeIndex ? 1 : 0,
                scale: index === activeIndex ? 1 : 1.035,
                duration: 0.65,
                ease: 'power2.out',
                overwrite: true,
              })
            })
          }

          templateSteps.forEach((step, index) => {
            ScrollTrigger.create({
              trigger: step,
              start: 'top 58%',
              end: 'bottom 58%',
              onEnter: () => activateTemplate(index),
              onEnterBack: () => activateTemplate(index),
            })
          })
        },
      )

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-how-heading]', {
          opacity: 0,
          y: 40,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '[data-how-heading]',
            start: 'top 82%',
          },
        })

        gsap.utils.toArray('[data-how-step]').forEach((step) => {
          gsap.from(step, {
            opacity: 0.2,
            y: 56,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: step,
              start: 'top 82%',
              end: 'top 52%',
              scrub: 0.7,
            },
          })
        })

        gsap.fromTo(
          '[data-how-progress]',
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-how-steps]',
              start: 'top 65%',
              end: 'bottom 65%',
              scrub: true,
            },
          },
        )
      })

      return () => mm.revert()
    },
    { scope: root, dependencies: [locale], revertOnUpdate: true },
  )

  const steps = [
    { n: '01', title: t('home.step1Title'), body: t('home.step1Body') },
    { n: '02', title: t('home.step2Title'), body: t('home.step2Body') },
    { n: '03', title: t('home.step3Title'), body: t('home.step3Body') },
    { n: '04', title: t('home.step4Title'), body: t('home.step4Body') },
  ]

  return (
    <div ref={root} id="top" className="min-h-svh bg-bone text-ink">
      <BrandSplash onDone={() => setIntroReady(true)} />
      <SiteHeader />

      <main className="px-5 md:px-10">
        <section className="flex min-h-[90svh] flex-col justify-between overflow-hidden pt-16 pb-6 md:pt-24 md:pb-10">
          <p
            data-hero-meta
            className="max-w-[36ch] text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
          >
            {t('meta.tagline')}
          </p>

          <div>
            <div className="flex items-center gap-3 md:gap-5">
              <span data-hero-logo className="shrink-0 self-center">
                <Logo className="size-[clamp(2.25rem,8vw,6.5rem)]" />
              </span>
              <h1
                data-hero-line
                className="min-w-0 select-none font-brico text-[clamp(2.75rem,14vw,11rem)] leading-[0.88] font-semibold tracking-[-0.04em] uppercase"
              >
                {SITE_NAME}
              </h1>
            </div>
            <p className="mt-6 max-w-[22ch] text-[clamp(1.4rem,3.5vw,2.6rem)] leading-[1.05] font-medium tracking-[-0.02em] text-ink/80 md:mt-8">
              <span data-hero-line>{t('home.heroLine1')} </span>
              <em
                data-hero-line
                className="font-display font-normal italic text-accent"
              >
                {t('home.heroLine2')}
              </em>
              <span data-hero-line> {t('home.heroLine3')}</span>
            </p>
          </div>

          <div className="border-t border-ink/15 pt-4">
            <p
              data-hero-meta
              className="max-w-[52ch] text-sm leading-relaxed text-ink/70 md:text-base"
            >
              {t('home.heroBody')}
            </p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-ink/60 md:text-xs md:tracking-[0.25em]">
              <p data-hero-meta>©2026 — {SITE_NAME}</p>
              <p data-hero-meta className="text-ink">
                {t('home.scrollDown')} <span aria-hidden="true">↓</span>
              </p>
            </div>
          </div>
        </section>

        <section id="templates" className="scroll-mt-20 border-t border-ink/15">
          <div className="flex items-baseline justify-between pt-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
              {t('home.modelsLabel')}
            </p>
            <p className="hidden text-[11px] uppercase tracking-[0.25em] text-ink/40 md:block md:text-xs">
              {t('home.modelsScrollHint')}
            </p>
          </div>

          <div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-20">
            <div className="hidden md:col-span-5 md:block">
              <div className="sticky top-0 flex h-svh items-center py-16">
                <div className="relative aspect-4/5 w-full overflow-hidden">
                  {templates.map((template, index) => (
                    <TemplatePoster
                      key={template.sku}
                      template={template}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-7">
              {templates.map((template) => (
                <article
                  key={template.id}
                  data-template-step
                  className="flex min-h-[82svh] flex-col justify-center border-b border-ink/15 py-14 first:border-t md:min-h-svh md:py-20"
                >
                  <div className="relative mb-8 aspect-4/3 overflow-hidden md:hidden">
                    <TemplatePoster template={template} index={0} />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-accent md:text-xs">
                      {template.id} / {String(templates.length).padStart(2, '0')}
                    </p>
                    <span className="flex items-center gap-2">
                      {template.palette.map((color) => (
                        <span
                          key={color}
                          aria-hidden="true"
                          className="inline-block size-3 rounded-full border border-ink/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </div>

                  <Link
                    to={template.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-5 flex items-end justify-between gap-2 md:gap-5"
                  >
                    <h2 className="min-w-0 text-[clamp(2.2rem,10vw,6.5rem)] leading-[0.86] font-medium tracking-[-0.055em] transition-colors group-hover:text-accent md:text-[clamp(2.6rem,7vw,6.5rem)]">
                      {template.name}
                    </h2>
                    <span
                      aria-hidden="true"
                      className="shrink-0 pb-1 text-3xl transition-transform group-hover:translate-x-2"
                    >
                      →
                    </span>
                  </Link>

                  <p className="mt-5 text-[11px] uppercase tracking-[0.25em] text-ink/50">
                    {template.vibe}
                  </p>
                  <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink/70 md:text-base">
                    {template.description}
                  </p>
                  <p className="mt-5 max-w-[56ch] text-[10px] leading-relaxed tracking-[0.16em] text-ink/40 uppercase">
                    {Array.isArray(template.tags)
                      ? template.tags.join(' · ')
                      : template.tags}
                  </p>

                  {templatePriceUsd(template.sku) != null && (
                    <p className="mt-6 text-[clamp(1.35rem,2.5vw,1.75rem)] font-medium tracking-[-0.02em]">
                      {formatArs(arsFromUsd(templatePriceUsd(template.sku), rate))}
                    </p>
                  )}

                  <div className="mt-8 flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.2em]">
                    <button
                      type="button"
                      onClick={() =>
                        addItem({
                          sku: template.sku,
                          title: t('common.cartItemTitle', {
                            name: template.name,
                          }),
                        })
                      }
                      className="min-h-11 border border-ink/30 px-5 py-2.5 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-bone"
                    >
                      {t('common.addToCart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addItem({
                          sku: template.sku,
                          title: t('common.cartItemTitle', {
                            name: template.name,
                          }),
                        })
                        navigate('/cart')
                      }}
                      className="min-h-11 px-1 text-ink transition-colors hover:text-accent"
                    >
                      {t('common.buy')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 border-2 border-ink p-6 md:mt-24 md:p-10">
          <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
            {t('home.bundleEyebrow')}
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[clamp(1.8rem,4.5vw,4rem)] leading-none font-medium tracking-[-0.02em]">
              {t('home.bundleTitleBefore')}{' '}
              <em className="font-display font-normal italic text-accent">
                {t('home.bundleTitleEm')}
              </em>
            </p>
            <p className="text-[clamp(1.35rem,2.5vw,1.75rem)] font-medium tracking-[-0.02em]">
              {formatArs(arsFromUsd(BUNDLE_PRICE_USD, rate))}
            </p>
          </div>
          <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-ink/70 md:text-base">
            {t('home.bundleBody')}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink/50">
            {t('home.bundleSaving', {
              list: formatArs(arsFromUsd(bundleListPriceUsd(), rate)),
              off: String(bundleDiscountPct()),
            })}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.2em]">
            <button
              type="button"
              onClick={() =>
                addItem({ sku: 'bundle', title: t('home.bundleCartTitle') })
              }
              className="min-h-11 border border-ink/30 px-5 py-2.5 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-bone"
            >
              {t('common.addToCart')}
            </button>
            <button
              type="button"
              onClick={() => {
                addItem({ sku: 'bundle', title: t('home.bundleCartTitle') })
                navigate('/cart')
              }}
              className="min-h-11 px-1 text-ink transition-colors hover:text-accent"
            >
              {t('common.buy')}
            </button>
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
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] opacity-60">
            {t('home.builderPrices', {
              base: formatArs(arsFromUsd(CUSTOM_BASE_PRICE_USD, rate)),
              withCommerce: formatArs(
                arsFromUsd(estimateCustomPriceUsd(true), rate),
              ),
            })}
          </p>
        </Link>

        <section
          id="como-funciona"
          className="mt-20 scroll-mt-20 border-t border-ink/15 pt-14 md:mt-28 md:pt-20"
        >
          <div className="grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-20">
            <div
              data-how-heading
              className="md:sticky md:top-24 md:col-span-5 md:self-start"
            >
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
                {t('nav.howItWorks')}
              </p>
              <h2 className="mt-3 max-w-[18ch] text-[clamp(2rem,4.5vw,4.2rem)] leading-[0.98] font-medium tracking-[-0.035em]">
                {t('home.howTitleBefore')}{' '}
                <em className="font-display font-normal italic text-accent">
                  {t('home.howTitleZip')}
                </em>
                {t('home.howTitleAfter')}
              </h2>
              <p className="mt-5 max-w-[44ch] text-sm leading-relaxed text-ink/70 md:text-base">
                {t('home.howBodyBefore')}{' '}
                <strong className="font-medium text-ink">
                  {t('home.howBodyStrong')}
                </strong>{' '}
                {t('home.howBodyAfter')}
              </p>
            </div>

            <div
              data-how-steps
              className="relative border-l border-ink/15 pl-6 md:col-span-7 md:pl-10"
            >
              <span
                data-how-progress
                aria-hidden="true"
                className="absolute top-0 bottom-0 -left-px w-px origin-top bg-accent"
              />
              <ol>
                {steps.map((step, index) => (
                  <li
                    key={step.n}
                    data-how-step
                    className="flex min-h-[42svh] flex-col justify-center border-b border-ink/15 py-12 first:border-t md:min-h-[50svh]"
                  >
                    <div className="flex items-baseline justify-between gap-5">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-accent">
                        {step.n}
                      </p>
                      <p className="font-display text-4xl leading-none italic text-ink/15 md:text-6xl">
                        {String(index + 1).padStart(2, '0')}
                      </p>
                    </div>
                    <h3 className="mt-5 text-[clamp(1.5rem,3.5vw,2.8rem)] leading-[1.02] font-medium tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-ink/60 md:text-base">
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 border-y border-ink/15 py-6 text-center md:flex-row md:gap-10">
            <div className="max-w-[42ch]">
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('home.paymentsTitle')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                {t('home.paymentsBody')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://www.mercadopago.com.ar/"
                target="_blank"
                rel="noreferrer"
                className="flex h-16 items-center rounded-sm border border-ink/15 bg-bone px-4 transition-colors hover:border-ink/40"
                aria-label="Mercado Pago"
              >
                <img
                  src="/payment/mercado-pago.svg"
                  alt="Mercado Pago"
                  className="h-12 w-32 object-contain dark:hidden"
                />
                <img
                  src="/payment/mercado-pago-white.svg"
                  alt="Mercado Pago"
                  className="hidden h-12 w-32 object-contain dark:block"
                />
              </a>
            </div>
          </div>

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
                    target="_blank"
                    rel="noopener noreferrer"
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

import { useRef, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { gsap, useGSAP, SplitText, ScrollTrigger } from '../lib/gsap'
import { SITE_NAME, SUPPORT_EMAIL } from '../lib/site'
import SiteHeader from '../components/SiteHeader'
import Logo from '../components/Logo'
import BrandSplash from '../components/BrandSplash'
import HomeContact from '../components/HomeContact'
import HorizontalPanels from '../components/sections/chapters/HorizontalPanels'
import ManifestoReveal from '../components/sections/chapters/ManifestoReveal'
import { useCart } from '../lib/cart'
import {
  BUNDLE_PRICE_USD,
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS,
  bundleDiscountPct,
  bundleListPriceUsd,
  formatPriceFromUsd,
  formatNextSectionPrice,
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
    category: 'EDITORIAL',
    tagline: 'kinetic stories',
    palette: ['#f2efe9', '#161412', '#ff4b00'],
  },
  {
    id: '02',
    sku: 'nocturne',
    name: 'NOCTURNE',
    path: '/templates/nocturne',
    category: 'CINEMA',
    tagline: 'AFTER DARK',
    palette: ['#0e0e11', '#ece9e2', '#d9ff3f'],
  },
  {
    id: '03',
    sku: 'monolith',
    name: 'MONOLITH',
    path: '/templates/monolith',
    category: 'SYSTEM',
    tagline: 'brutal form',
    palette: ['#cdcbc4', '#101010', '#2b3cff'],
  },
  {
    id: '04',
    sku: 'velocity',
    name: 'VELOCITY',
    path: '/templates/velocity',
    category: 'ATHLETE',
    tagline: 'full send',
    palette: ['#0a1a12', '#ece9e2', '#d9ff3f'],
  },
  {
    id: '05',
    sku: 'fizz',
    name: 'FIZZ',
    path: '/templates/fizz',
    category: 'POP',
    tagline: 'drink the spark',
    palette: ['#241352', '#fff3e2', '#ff3ea5'],
  },
  {
    id: '06',
    sku: 'atelier',
    name: 'ATELIER',
    path: '/templates/atelier',
    category: 'STUDIO',
    tagline: 'scroll the fog',
    palette: ['#0b0c10', '#f2f2f2', '#c8d0dc'],
  },
  {
    id: '07',
    sku: 'comic',
    name: 'COMIC',
    path: '/templates/comic',
    category: 'SCRAPBOOK',
    tagline: 'torn panels',
    palette: ['#d8d4cc', '#2a2622', '#e85a24'],
  },
  {
    id: '08',
    sku: 'unity',
    name: 'UNITY',
    path: '/templates/unity',
    category: 'EDITORIAL',
    tagline: 'one game',
    palette: ['#f3efe6', '#0a0a0a', '#f4c518'],
  },
]

function catalogCoverSrc(sku) {
  return `/catalog/${sku}.jpg`
}

function TemplatePoster({ template, index = 0 }) {
  return (
    <div
      data-template-art
      className="absolute inset-0 overflow-hidden border border-ink/15 bg-ink"
      style={{ opacity: index === 0 ? 1 : 0 }}
    >
      <img
        src={catalogCoverSrc(template.sku)}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30"
      />
      <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] text-white/90 uppercase drop-shadow-sm">
        {template.category} / {template.id}
      </span>
      <span className="absolute right-5 bottom-14 max-w-[85%] text-right font-brico text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.85] font-semibold tracking-[-0.05em] text-white drop-shadow-md">
        {template.name}
      </span>
      <span className="absolute right-5 bottom-5 font-display text-xl italic text-white/80 md:text-2xl">
        {template.tagline}
      </span>
    </div>
  )
}

/**
 * Home del catálogo.
 * Flujo: hero → manifiesto → modelos (editorial) → Bundle/Builder → cómo funciona → contacto.
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

  const howPanels = useMemo(
    () => [
      {
        index: '01',
        title: t('home.step1Title'),
        caption: t('home.step1Body'),
      },
      {
        index: '02',
        title: t('home.step2Title'),
        caption: t('home.step2Body'),
      },
      {
        index: '03',
        title: t('home.step3Title'),
        caption: t('home.step3Body'),
      },
      {
        index: '04',
        title: t('home.step4Title'),
        caption: t('home.step4Body'),
      },
    ],
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

      // Logo del hero: mismo ensamble que el contact (barras + accent).
      const heroLogo = root.current?.querySelector('[data-hero-logo]')
      const bars = heroLogo
        ? gsap.utils.toArray(heroLogo.querySelectorAll('[data-logo-bar]'))
        : []
      const accent = heroLogo?.querySelector('[data-logo-accent]')
      if (bars.length || accent) {
        const narrow = window.matchMedia('(max-width: 639px)').matches
        const dx = narrow ? 28 : 48
        const dy = narrow ? 24 : 40
        if (bars[0]) gsap.set(bars[0], { x: -dx, opacity: 0 })
        if (bars[1]) gsap.set(bars[1], { x: dx + 8, opacity: 0 })
        if (bars[2]) gsap.set(bars[2], { y: dy, opacity: 0 })
        if (accent) {
          gsap.set(accent, {
            y: narrow ? -20 : -36,
            x: narrow ? 16 : 28,
            scale: 0.5,
            opacity: 0,
            transformOrigin: '50% 50%',
          })
        }

        const logoTl = gsap.timeline({
          delay: 0.05,
          defaults: { ease: 'power3.out' },
        })
        if (bars[0]) logoTl.to(bars[0], { x: 0, opacity: 1, duration: 0.7 }, 0)
        if (bars[1])
          logoTl.to(bars[1], { x: 0, opacity: 1, duration: 0.7 }, 0.08)
        if (bars[2])
          logoTl.to(bars[2], { y: 0, opacity: 1, duration: 0.7 }, 0.16)
        if (accent) {
          logoTl.to(
            accent,
            { y: 0, x: 0, scale: 1, opacity: 1, duration: 0.55 },
            0.22,
          )
        }
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
          const stage = root.current?.querySelector('[data-template-stage]')
          const artworks = stage
            ? gsap.utils.toArray('[data-template-art]', stage)
            : []
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
        gsap.utils.toArray('[data-soft-fade]').forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 28,
            duration: 1.05,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              end: 'top 62%',
              scrub: 0.8,
            },
          })
        })

        // Bundle + builder CTAs: scrubbed card rise + staggered copy reveal.
        gsap.utils.toArray('[data-cta-card]').forEach((card) => {
          gsap.from(card, {
            opacity: 0.15,
            y: 72,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              end: 'top 55%',
              scrub: 0.65,
            },
          })

          const bits = gsap.utils.toArray('[data-cta-bit]', card)
          if (bits.length) {
            gsap.from(bits, {
              opacity: 0,
              y: 28,
              duration: 0.7,
              stagger: 0.07,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 78%',
                once: true,
              },
            })
          }

          const accent = card.querySelector('[data-cta-accent]')
          if (accent) {
            gsap.from(accent, {
              opacity: 0,
              yPercent: 40,
              duration: 0.85,
              ease: 'power4.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 78%',
                once: true,
              },
            })
          }

          const arrow = card.querySelector('[data-cta-arrow]')
          if (arrow) {
            gsap.from(arrow, {
              opacity: 0,
              x: -18,
              duration: 0.65,
              ease: 'power3.out',
              delay: 0.15,
              scrollTrigger: {
                trigger: card,
                start: 'top 78%',
                once: true,
              },
            })
          }
        })

        // Footer: columnas + logo apilado + wordmark por caracteres (estilo Chapters).
        const footer = root.current?.querySelector('[data-footer]')
        if (footer) {
          const footerSplits = []
          gsap.from(gsap.utils.toArray('[data-footer-bit]', footer), {
            opacity: 0,
            y: 28,
            duration: 0.75,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: footer,
              start: 'top 82%',
              once: true,
            },
          })

          const footerLogo = footer.querySelector('[data-footer-logo]')
          const footerBars = footerLogo
            ? gsap.utils.toArray(footerLogo.querySelectorAll('[data-logo-bar]'))
            : []
          const footerAccent = footerLogo?.querySelector('[data-logo-accent]')
          if (footerBars.length) {
            gsap.set(footerBars, { transformOrigin: '50% 50%' })
            gsap.from(footerBars, {
              y: -24,
              opacity: 0,
              duration: 0.55,
              ease: 'power3.out',
              stagger: 0.1,
              scrollTrigger: {
                trigger: '[data-footer-brand]',
                start: 'top 85%',
                once: true,
              },
            })
          }
          if (footerAccent) {
            gsap.from(footerAccent, {
              scale: 0,
              opacity: 0,
              duration: 0.4,
              ease: 'back.out(2.2)',
              transformOrigin: '50% 50%',
              delay: 0.28,
              scrollTrigger: {
                trigger: '[data-footer-brand]',
                start: 'top 85%',
                once: true,
              },
            })
          }

          const footerWord = footer.querySelector('[data-footer-word]')
          if (footerWord) {
            const split = new SplitText(footerWord, {
              type: 'chars',
              mask: 'chars',
            })
            footerSplits.push(split)
            gsap.from(split.chars, {
              yPercent: 115,
              stagger: 0.035,
              ease: 'power4.out',
              duration: 1,
              scrollTrigger: {
                trigger: '[data-footer-brand]',
                start: 'top 85%',
                once: true,
              },
            })
          }

          gsap.from('[data-footer-legal]', {
            opacity: 0,
            y: 12,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '[data-footer-legal]',
              start: 'top 95%',
              once: true,
            },
          })

          // SplitText deja nodos en el DOM; hay que revertirlos a mano.
          return () => {
            footerSplits.forEach((s) => s.revert())
          }
        }
      })

      return () => mm.revert()
    },
    { scope: root, dependencies: [locale], revertOnUpdate: true },
  )

  return (
    <div ref={root} id="top" className="min-h-svh bg-bone text-ink">
      <BrandSplash onDone={() => setIntroReady(true)} />
      <SiteHeader />

      <main className="px-5 md:px-10">
        <section className="flex min-h-[85svh] flex-col overflow-x-clip pt-20 pb-8 sm:min-h-[90svh] md:pt-24 md:pb-14">
          <p
            data-hero-meta
            className="max-w-[36ch] text-[11px] uppercase tracking-[0.2em] text-ink/60 sm:tracking-[0.25em] md:text-xs"
          >
            {t('meta.tagline')}
          </p>

          <div className="flex flex-1 flex-col justify-center py-6 sm:py-8">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-8">
              <span data-hero-logo className="shrink-0 self-center">
                <Logo className="size-[clamp(2rem,1.25rem+6vw,3.25rem)] md:size-[clamp(3.5rem,5vw+1.5rem,6.5rem)] xl:size-[clamp(5.5rem,6vw,8.5rem)]" />
              </span>
              <h1
                data-hero-line
                className="min-w-0 select-none font-brico text-[clamp(2.35rem,1.1rem+9vw,3.4rem)] leading-[0.9] font-semibold tracking-[-0.04em] uppercase sm:text-[clamp(2.75rem,1rem+8vw,4.25rem)] md:text-[clamp(4rem,2rem+7vw,8rem)] xl:text-[clamp(7rem,6rem+4vw,14rem)]"
              >
                {SITE_NAME}
              </h1>
            </div>
            <p className="mt-5 max-w-[20ch] text-[clamp(1.25rem,1rem+2vw,1.75rem)] leading-[1.1] font-medium tracking-[-0.02em] text-ink/80 sm:mt-6 sm:max-w-[22ch] sm:text-[clamp(1.4rem,1rem+2.2vw,2.2rem)] md:mt-10 md:text-[clamp(1.6rem,1rem+2vw,2.6rem)]">
              <span data-hero-line>{t('home.heroLine1')} </span>
              <em
                data-hero-line
                className="font-display font-normal italic text-accent"
              >
                {t('home.heroLine2')}
              </em>
              <span data-hero-line> {t('home.heroLine3')}</span>
            </p>
            <div
              data-hero-meta
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-10 md:mt-12"
            >
              <a
                href="#templates"
                className="ui-press inline-flex min-h-11 items-center border border-ink bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-bone hover:bg-accent hover:border-accent"
              >
                {t('home.heroCtaModels')}
              </a>
              <Link
                to="/templates/chapters"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.2em] text-ink/70 transition-colors hover:text-accent"
              >
                {t('home.heroCtaDemo')} →
              </Link>
              <Link
                to="/builder"
                className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.2em] text-ink/70 transition-colors hover:text-accent"
              >
                {t('home.heroCtaBuilder')} →
              </Link>
            </div>
          </div>
        </section>

        <div className="-mx-5 md:-mx-10">
          <ManifestoReveal
            chapter="00"
            total="00"
            label={SITE_NAME}
            className="!flex !min-h-0 !flex-col !justify-center !py-16 sm:!min-h-[55svh] sm:!py-24 md:!min-h-[70svh] md:!py-36 [&_[data-manifesto]]:mx-auto [&_[data-manifesto]]:max-w-[min(100%,16ch)] [&_[data-manifesto]]:text-left sm:[&_[data-manifesto]]:max-w-[18ch] sm:[&_[data-manifesto]]:text-center md:[&_[data-manifesto]]:text-[clamp(2.4rem,5vw,5.5rem)]"
          >
            <>
              {t('home.manifestoLead')}{' '}
              <em>{t('home.manifestoEm1')}</em>
              {t('home.manifestoMid')}{' '}
              <em>{t('home.manifestoEm2')}</em>
              {t('home.manifestoTail')}
            </>
          </ManifestoReveal>
        </div>

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
                <div
                  data-template-stage
                  className="relative aspect-4/5 w-full overflow-hidden"
                >
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
                      {template.id} /{' '}
                      {String(templates.length).padStart(2, '0')}
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
                      {formatPriceFromUsd(
                        templatePriceUsd(template.sku),
                        locale,
                        rate,
                      )}
                    </p>
                  )}

                  <div className="mt-8 flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.2em]">
                    <Link
                      to={template.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-press min-h-11 border border-ink bg-ink px-5 py-2.5 text-bone hover:border-accent hover:bg-accent"
                    >
                      {t('home.openDemo')} →
                    </Link>
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
                      className="ui-press min-h-11 border border-ink/30 px-5 py-2.5 text-ink hover:border-ink hover:bg-ink hover:text-bone"
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
                      className="ui-press min-h-11 px-1 text-ink hover:text-accent"
                    >
                      {t('common.buy')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Ofertas justo después del deseo (Bundle → Builder). */}
        <section
          id="ofertas"
          data-cta-card
          className="mt-16 scroll-mt-20 border-2 border-ink p-6 md:mt-20 md:grid md:grid-cols-12 md:gap-10 md:p-10"
        >
          <div className="md:col-span-8">
            <p
              data-cta-bit
              className="mb-3 text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
            >
              {t('home.bundleEyebrow')}
            </p>
            <p
              data-cta-bit
              className="text-[clamp(1.8rem,4.5vw,4rem)] leading-none font-medium tracking-[-0.02em]"
            >
              {t('home.bundleTitleBefore')}{' '}
              <em
                data-cta-accent
                className="inline-block font-display font-normal italic text-accent"
              >
                {t('home.bundleTitleEm')}
              </em>
            </p>
            <p
              data-cta-bit
              className="mt-3 max-w-[52ch] text-sm leading-relaxed text-ink/70 md:text-base"
            >
              {t('home.bundleBody')}
            </p>
            <p
              data-cta-bit
              className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink/50"
            >
              {t('home.bundleSaving', {
                list: formatPriceFromUsd(bundleListPriceUsd(), locale, rate),
                off: String(bundleDiscountPct()),
              })}
            </p>
            <div
              data-cta-bit
              className="mt-8 flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.2em]"
            >
              <button
                type="button"
                onClick={() =>
                  addItem({ sku: 'bundle', title: t('home.bundleCartTitle') })
                }
                className="ui-press min-h-11 border border-ink/30 px-5 py-2.5 text-ink hover:border-ink hover:bg-ink hover:text-bone"
              >
                {t('common.addToCart')}
              </button>
              <button
                type="button"
                onClick={() => {
                  addItem({ sku: 'bundle', title: t('home.bundleCartTitle') })
                  navigate('/cart')
                }}
                className="ui-press min-h-11 px-1 text-ink hover:text-accent"
              >
                {t('common.buy')}
              </button>
            </div>
          </div>
          <p
            data-cta-bit
            className="mt-8 self-end text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.03em] md:col-span-4 md:mt-0 md:text-right"
          >
            {formatPriceFromUsd(BUNDLE_PRICE_USD, locale, rate)}
          </p>
        </section>

        <Link
          to="/builder"
          data-cta-card
          className="group mt-10 -mx-5 block border-y border-ink bg-ink px-5 py-14 text-bone transition-colors duration-300 hover:bg-accent hover:text-bone md:mt-12 md:-mx-10 md:px-10 md:py-20"
        >
          <p
            data-cta-bit
            className="mb-4 text-[11px] uppercase tracking-[0.25em] text-bone/55 md:text-xs"
          >
            {t('home.builderEyebrow')}
          </p>
          <p className="flex items-end justify-between gap-6">
            <span
              data-cta-bit
              className="text-[clamp(2.2rem,6vw,5.5rem)] leading-[0.92] font-medium tracking-[-0.035em]"
            >
              {t('home.builderTitleBefore')}{' '}
              <em
                data-cta-accent
                className="inline-block font-display font-normal italic text-accent group-hover:text-bone"
              >
                {t('home.builderTitleEm')}
              </em>
            </span>
            <span
              data-cta-arrow
              aria-hidden="true"
              className="mb-1 shrink-0 text-3xl transition-transform duration-300 group-hover:translate-x-2 md:text-4xl"
            >
              →
            </span>
          </p>
          <p
            data-cta-bit
            className="mt-5 max-w-[48ch] text-sm leading-relaxed text-bone/65 md:text-base"
          >
            {t('home.builderBody')}
          </p>
          <p
            data-cta-bit
            className="mt-4 text-[11px] uppercase tracking-[0.2em] text-bone/45"
          >
            {t('home.builderPrices', {
              base: formatPriceFromUsd(CUSTOM_BASE_PRICE_USD, locale, rate),
              included: CUSTOM_BASE_SECTIONS,
              extra: formatNextSectionPrice(
                CUSTOM_BASE_SECTIONS,
                false,
                locale,
                rate,
              ),
            })}
          </p>
        </Link>

        {/* Confianza / proceso: después de las ofertas. */}
        <section
          id="como-funciona"
          className="mt-16 scroll-mt-20 -mx-5 md:mt-24 md:-mx-10"
        >
          <HorizontalPanels
            chapter="01"
            total="04"
            label={t('nav.howItWorks')}
            headingBefore={t('home.howTitleBefore')}
            headingEm={t('home.howTitleZip')}
            headingAfter={t('home.howTitleAfter')}
            panels={howPanels}
            variant="type"
            idleOpacity={0.48}
          />

          <div
            data-soft-fade
            className="mt-12 flex flex-col items-center justify-center gap-6 border-y border-ink/15 px-5 py-6 text-center md:flex-row md:gap-10 md:px-10"
          >
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

          <div
            data-soft-fade
            className="mt-12 mx-5 grid gap-6 border border-ink/15 p-6 md:mx-10 md:grid-cols-2 md:p-8"
          >
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

      <HomeContact />

      <footer
        data-footer
        className="border-t border-ink/15 px-5 pt-24 pb-6 md:px-10 md:pt-36"
      >
        <div className="mb-20 grid gap-12 md:mb-28 md:grid-cols-12">
          <p
            data-footer-bit
            className="max-w-[40ch] text-sm leading-relaxed text-ink/70 md:col-span-4 md:text-base"
          >
            {t('meta.tagline')}
          </p>

          <nav
            data-footer-bit
            className="md:col-span-2"
            aria-label={t('home.footerTemplates')}
          >
            <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
              {t('home.footerTemplates')}
            </p>
            <ul className="space-y-2 text-sm">
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

          <nav
            data-footer-bit
            className="md:col-span-3"
            aria-label={t('home.footerBuilder')}
          >
            <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
              {t('home.footerBuilder')}
            </p>
            <ul className="space-y-2 text-sm">
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

          <nav
            data-footer-bit
            className="md:col-span-3"
            aria-label={t('home.footerContact')}
          >
            <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
              {t('home.footerContact')}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#contacto"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerContactForm')}
                </a>
              </li>
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

        <a
          data-footer-brand
          href="#top"
          className="group flex items-end gap-[2.5vw] text-ink transition-colors duration-500 hover:text-accent"
          aria-label={`${SITE_NAME} — ${t('home.backTop')}`}
        >
          <span data-footer-logo className="mb-[0.08em] shrink-0">
            <Logo className="size-[clamp(2.75rem,9.5vw,8.5rem)]" />
          </span>
          <span
            data-footer-word
            className="min-w-0 select-none font-brico text-[clamp(2.75rem,13.5vw,11rem)] leading-[0.85] font-semibold tracking-[-0.04em] uppercase"
          >
            {SITE_NAME}
          </span>
        </a>

        <div
          data-footer-legal
          className="mt-10 flex flex-col gap-2 border-t border-ink/15 pt-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:flex-row md:items-baseline md:justify-between md:text-xs"
        >
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

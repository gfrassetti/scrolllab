import { useRef, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { gsap, useGSAP, SplitText, ScrollTrigger } from '../lib/gsap'
import { SITE_NAME, SUPPORT_EMAIL } from '../lib/site'
import SiteHeader from '../components/SiteHeader'
import Logo from '../components/Logo'
import LabMark from '../components/LabMark'
import BrandSplash from '../components/BrandSplash'
import PlayableHeadline from '../components/PlayableHeadline'
import TemplateBuyPill from '../components/TemplateBuyPill'
import HomeContact from '../components/HomeContact'
import HorizontalPanels from '../components/sections/chapters/HorizontalPanels'
import BuilderDemo from '../components/BuilderDemo'
import { useCart } from '../lib/cart'
import { startCheckout } from '../lib/startCheckout'
import { useAuth } from '../lib/auth'
import {
  BUNDLE_PRICE_USD,
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS,
  bundleDiscountPct,
  bundleListPriceUsd,
  formatPriceFromUsd,
  formatNextSectionPrice,
  isCatalogComingSoon,
  isComingSoonSku,
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
    tagline: 'shared field',
    palette: ['#e7e4dc', '#0a0a0a', '#2c4a42'],
  },
  {
    id: '09',
    sku: 'atrium',
    name: 'ATRIUM',
    path: '/templates/atrium',
    category: 'ARCHITECTURE',
    tagline: 'mass and measure',
    palette: ['#f4f1ea', '#111111', '#111111'],
  },
]

function catalogCoverSrc(sku) {
  return `/catalog/${sku}.jpg`
}

function TemplatePoster({ template, index = 0, soonLabel = 'Coming soon' }) {
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
        className={`absolute inset-0 h-full w-full object-cover object-top ${
          template.comingSoon || isCatalogComingSoon(template.sku) ? 'grayscale' : ''
        }`}
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
        {template.comingSoon ? '' : template.tagline}
      </span>
      {template.comingSoon ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
          <span className="border border-white/35 bg-black/50 px-4 py-2 text-[11px] tracking-[0.22em] text-white/85 uppercase">
          {soonLabel}
          </span>
        </span>
      ) : null}
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
  const { user, loading: authLoading } = useAuth()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { rate } = useFxRate()
  const [introReady, setIntroReady] = useState(false)
  const [buyingSku, setBuyingSku] = useState(null)

  /** Comprar → Mercado Pago (login si hace falta). Al carrito sigue aparte. */
  const buyNow = async (cartItem) => {
    if (buyingSku || authLoading) return
    addItem(cartItem)
    setBuyingSku(cartItem.sku)
    try {
      const result = await startCheckout({
        items: useCart.getState().items,
        user,
        navigate,
      })
      if (result !== 'redirect') setBuyingSku(null)
    } catch {
      navigate('/cart')
      setBuyingSku(null)
    }
  }

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

      // Brand wordmark: revelado por caracteres. El H1 jugable no usa SplitText.
      const split = new SplitText('[data-hero-brand]', {
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

      gsap.from('.playable-headline', {
        opacity: 0,
        y: 18,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.45,
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

        // Capa "demo": cada camino se arma solo al entrar, con la metáfora del
        // producto. Builder → las "secciones" del mark encastran desde los
        // lados. LAB → el <script> se dibuja en una sola pasada y el <LAB> de
        // fondo deriva. Scrub sobre la entrada, sin pin: el presupuesto de pin
        // de la home ya se gasta en HorizontalPanels ("cómo funciona").
        const builderBand = root.current?.querySelector('[data-cta-demo="builder"]')
        if (builderBand) {
          const wmBars = gsap.utils.toArray(
            builderBand.querySelectorAll('[data-logo-bar]'),
          )
          const wmAccent = builderBand.querySelector('[data-logo-accent]')
          if (wmBars.length) {
            gsap.set([...wmBars, wmAccent].filter(Boolean), {
              transformOrigin: '50% 50%',
            })
            gsap.from(wmBars, {
              xPercent: (i) => (i % 2 ? 70 : -70),
              opacity: 0,
              ease: 'power2.out',
              stagger: 0.12,
              scrollTrigger: {
                trigger: builderBand,
                start: 'top 82%',
                end: 'top 44%',
                scrub: 0.8,
              },
            })
            if (wmAccent) {
              gsap.from(wmAccent, {
                scale: 0,
                opacity: 0,
                ease: 'back.out(2)',
                scrollTrigger: {
                  trigger: builderBand,
                  start: 'top 66%',
                  end: 'top 44%',
                  scrub: 0.8,
                },
              })
            }
          }
        }

        const labBand = root.current?.querySelector('[data-cta-demo="lab"]')
        if (labBand) {
          const code = labBand.querySelector('[data-cta-code]')
          if (code) {
            gsap.fromTo(
              code,
              { clipPath: 'inset(0 100% 0 0)' },
              {
                clipPath: 'inset(0 0% 0 0)',
                ease: 'none',
                scrollTrigger: {
                  trigger: labBand,
                  start: 'top 80%',
                  end: 'top 46%',
                  scrub: 0.6,
                },
              },
            )
          }
          const labMark = labBand.querySelector('[data-cta-labmark]')
          if (labMark) {
            gsap.from(labMark, {
              xPercent: 18,
              opacity: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: labBand,
                start: 'top 88%',
                end: 'top 46%',
                scrub: 1,
              },
            })
          }
        }

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
              // Es lo último de la página (24px de padding abajo): con `top 95%`
              // el trigger caía por debajo del scroll máximo y el ©️ quedaba en
              // opacity 0 para siempre. `top bottom` dispara apenas asoma.
              trigger: '[data-footer-legal]',
              start: 'top bottom',
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
            className="max-w-[36ch] text-eyebrow uppercase text-ink/55"
          >
            {t('meta.tagline')}
          </p>

          <div className="flex flex-1 flex-col justify-center py-6 sm:py-8">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-8">
              <span data-hero-logo className="shrink-0 self-center">
                <Logo className="size-[clamp(2rem,1.25rem+6vw,3.25rem)] md:size-[clamp(3.5rem,5vw+1.5rem,6.5rem)] xl:size-[clamp(5.5rem,6vw,8.5rem)]" />
              </span>
              <p
                data-hero-brand
                className="min-w-0 select-none font-brico text-[clamp(2.35rem,1.1rem+9vw,3.4rem)] leading-[0.9] font-semibold tracking-[-0.04em] uppercase sm:text-[clamp(2.75rem,1rem+8vw,4.25rem)] md:text-[clamp(4rem,2rem+7vw,8rem)] xl:text-[clamp(7rem,6rem+4vw,14rem)]"
              >
                {SITE_NAME}
              </p>
            </div>

            {/* H1 jugable estilo Orionix: tocá → toolbar (no persiste) */}
            <div data-hero-playable className="mt-5 sm:mt-6 md:mt-10">
              <PlayableHeadline
                key={locale}
                className="max-w-[16ch] text-[clamp(1.75rem,1rem+3.5vw,3.25rem)] leading-[1.05] font-medium tracking-[-0.03em] sm:max-w-[18ch] md:text-[clamp(2.25rem,1.2rem+3vw,3.75rem)]"
                lines={[
                  t('home.heroLine1'),
                  {
                    text: t('home.heroLine2'),
                    className: 'font-display font-normal italic text-accent',
                  },
                ]}
                aria-label={t('playableHeadline.aria')}
              />
            </div>

            <p
              data-hero-meta
              className="mt-5 max-w-[52ch] text-body-lg leading-relaxed text-ink/80 sm:mt-6 md:mt-8"
            >
              {t('home.heroBody')}
            </p>
            <div
              data-hero-meta
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-10 md:mt-12"
            >
              <a href="#templates" className="btn btn-primary">
                {t('home.heroCtaModels')}
              </a>
              <Link
                to="/templates/chapters"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-body-sm text-ink/65 transition-colors hover:text-accent"
              >
                {t('home.heroCtaDemo')} →
              </Link>
              <Link
                to="/builder"
                className="inline-flex min-h-11 items-center text-body-sm text-ink/65 transition-colors hover:text-accent"
              >
                {t('home.heroCtaBuilder')} →
              </Link>
            </div>
          </div>
        </section>

        {/* Qué es esto, en 10 segundos: el modelo (elegís secciones → se arma →
            comprás → ZIP) antes del catálogo, para que el scroll de modelos se
            recorra con intención. El demo de LAB vive en /lab, no se repite acá. */}
        <div className="mx-auto mt-14 mb-16 max-w-[1300px] md:mt-24 md:mb-24">
          <p className="text-center text-eyebrow uppercase text-accent">
            En 10 segundos
          </p>
          <h2 className="mx-auto mt-3 max-w-[18ch] text-center text-[clamp(1.9rem,1rem+4.5vw,3.75rem)] leading-[1.03] font-medium tracking-[-0.03em]">
            Lo armás y te lo llevás
          </h2>
          <div className="mt-6">
            <BuilderDemo key={locale} />
          </div>
        </div>

        <section id="templates" className="scroll-mt-20 border-t border-ink/15">
          <div className="flex items-baseline justify-between pt-8 md:pt-10">
            <p className="text-eyebrow uppercase text-ink/50">
              {t('home.modelsLabel')}
            </p>
            <p className="hidden text-eyebrow uppercase text-ink/40 md:block">
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
                      soonLabel={t('home.comingSoon')}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-7">
              {templates.map((template) => {
                const soon = Boolean(
                  template.comingSoon || isCatalogComingSoon(template.sku),
                )
                const sellable = !isComingSoonSku(template.sku)
                return (
                <article
                  key={template.id}
                  data-template-step
                  aria-disabled={soon || undefined}
                  className={`flex min-h-[82svh] flex-col justify-center border-b border-ink/15 py-14 first:border-t md:min-h-svh md:py-20 ${
                    soon ? 'select-none' : ''
                  }`}
                >
                  <div
                    className={`relative mb-8 aspect-4/3 overflow-hidden md:hidden ${
                      soon ? 'opacity-45 grayscale' : ''
                    }`}
                  >
                    <TemplatePoster
                      template={template}
                      index={0}
                      soonLabel={t('home.comingSoon')}
                    />
                    {soon ? (
                      <span className="absolute inset-0 z-10 flex items-center justify-center bg-bone/50">
                        <span className="border border-ink/20 bg-bone px-4 py-2 text-eyebrow uppercase text-ink/50">
                          {t('home.comingSoon')}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={`flex items-center justify-between gap-4 ${
                      soon ? 'opacity-40' : ''
                    }`}
                  >
                    <p className="text-eyebrow uppercase text-accent">
                      {template.id} /{' '}
                      {String(templates.length).padStart(2, '0')}
                    </p>
                    <span className="flex items-center gap-2">
                      {template.palette.map((color, i) => (
                        <span
                          key={`${color}-${i}`}
                          aria-hidden="true"
                          className="inline-block size-3 rounded-full border border-ink/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </div>

                  {soon ? (
                    <div className="mt-5 flex items-end justify-between gap-2 opacity-40 md:gap-5">
                      <h2 className="min-w-0 text-[clamp(2.2rem,10vw,6.5rem)] leading-[0.86] font-medium tracking-[-0.055em] md:text-[clamp(2.6rem,7vw,6.5rem)]">
                        {template.name}
                      </h2>
                    </div>
                  ) : (
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
                  )}

                  <p
                    className={`mt-5 text-eyebrow uppercase ${
                      soon ? 'text-ink/30' : 'text-ink/50'
                    }`}
                  >
                    {soon ? t('home.comingSoon') : template.vibe}
                  </p>
                  {template.desktopOnly && !soon ? (
                    <p className="mt-2 text-eyebrow uppercase text-ink/45">
                      {t('home.desktopOnly')}
                    </p>
                  ) : null}
                  <p
                    className={`mt-3 max-w-[46ch] text-body leading-relaxed ${
                      soon ? 'text-ink/35' : 'text-ink/75'
                    }`}
                  >
                    {template.description}
                  </p>
                  <p
                    className={`mt-5 max-w-[56ch] text-eyebrow leading-relaxed uppercase ${
                      soon ? 'text-ink/25' : 'text-ink/40'
                    }`}
                  >
                    {Array.isArray(template.tags)
                      ? template.tags.join(' · ')
                      : template.tags}
                  </p>

                  {soon ? (
                    <p className="mt-8 text-eyebrow uppercase text-ink/40">
                      {t('home.comingSoon')}
                    </p>
                  ) : (
                    <>
                      {sellable && templatePriceUsd(template.sku) != null && (
                        <p className="mt-6 text-title-sm font-medium tracking-[-0.02em]">
                          {formatPriceFromUsd(
                            templatePriceUsd(template.sku),
                            locale,
                            rate,
                          )}
                        </p>
                      )}

                      <div className="mt-8 flex flex-wrap items-center gap-5">
                        <Link
                          to={template.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                        >
                          {t('home.openDemo')} →
                        </Link>
                        {sellable ? (
                          <>
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
                              className="btn btn-ghost"
                            >
                              {t('common.addToCart')}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(buyingSku) || authLoading}
                              onClick={() =>
                                buyNow({
                                  sku: template.sku,
                                  title: t('common.cartItemTitle', {
                                    name: template.name,
                                  }),
                                })
                              }
                              className="ui-press min-h-11 px-1 text-body-sm font-medium text-ink hover:text-accent disabled:opacity-40"
                            >
                              {buyingSku === template.sku
                                ? t('cart.redirecting')
                                : t('common.buy')}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </article>
                )
              })}
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
              className="mb-3 text-eyebrow uppercase text-ink/55"
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
              className="mt-3 max-w-[52ch] text-body leading-relaxed text-ink/75"
            >
              {t('home.bundleBody')}
            </p>
            <p
              data-cta-bit
              className="mt-4 text-eyebrow uppercase text-ink/50"
            >
              {t('home.bundleSaving', {
                list: formatPriceFromUsd(bundleListPriceUsd(), locale, rate),
                off: String(bundleDiscountPct()),
              })}
            </p>
            <div
              data-cta-bit
              className="mt-8 flex flex-wrap items-center gap-5"
            >
              <button
                type="button"
                onClick={() =>
                  addItem({ sku: 'bundle', title: t('home.bundleCartTitle') })
                }
                className="btn btn-ghost"
              >
                {t('common.addToCart')}
              </button>
              <button
                type="button"
                disabled={Boolean(buyingSku) || authLoading}
                onClick={() =>
                  buyNow({
                    sku: 'bundle',
                    title: t('home.bundleCartTitle'),
                  })
                }
                className="ui-press min-h-11 px-1 text-body-sm font-medium text-ink hover:text-accent disabled:opacity-40"
              >
                {buyingSku === 'bundle'
                  ? t('cart.redirecting')
                  : t('common.buy')}
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
          data-cta-demo="builder"
          className="group relative mt-10 -mx-5 block overflow-hidden border-y border-ink bg-ink px-5 py-14 text-bone transition-colors duration-300 hover:bg-accent hover:text-bone md:mt-12 md:-mx-10 md:px-10 md:py-20"
        >
          {/* Identidad de fondo: el logo de la marca es literalmente
              "secciones apiladas" — la misma metáfora que arma el builder.
              Opacity real en el wrapper (no un modificador de color), igual
              que el watermark de HomeContact — si no, el bloque accent del
              logo (fill fijo, no currentColor) queda naranja pleno.
              Solo desktop: en mobile el precio ya envuelve a 2 líneas y
              choca contra la marca — el título ya identifica la card ahí. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-6 bottom-6 hidden text-bone opacity-25 md:block"
            style={{ ['--color-accent']: 'currentColor' }}
          >
            <Logo className="h-40 w-40" />
          </div>
          <div className="relative z-10">
            <p
              data-cta-bit
              className="mb-4 text-eyebrow uppercase text-bone/55"
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
              className="mt-5 max-w-[48ch] text-body leading-relaxed text-bone/70"
            >
              {t('home.builderBody')}
            </p>
            <p
              data-cta-bit
              className="mt-4 text-eyebrow uppercase text-bone/50"
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
          </div>
        </Link>

        {/* LAB: el otro camino — no lo bajás, lo enchufás. */}
        <Link
          to="/lab"
          data-cta-card
          data-cta-demo="lab"
          className="group relative mt-4 -mx-5 block overflow-hidden border-b border-ink/20 px-5 py-14 transition-colors duration-300 hover:bg-ink hover:text-bone md:-mx-10 md:px-10 md:py-20"
        >
          {/* Identidad de fondo: el mark de LAB, mismo que el splash al
              entrar — sin esto la card no se distingue del builder. Solo
              desktop: en mobile choca con el snippet de código de abajo. */}
          <div
            data-cta-labmark
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 -bottom-12 hidden text-ink opacity-[0.14] group-hover:text-bone md:block"
          >
            <LabMark className="h-[17rem] w-auto" />
          </div>
          <div className="relative z-10">
            <p
              data-cta-bit
              className="mb-4 text-eyebrow uppercase text-ink/50 group-hover:text-bone/55"
            >
              {t('home.labEyebrow')}
            </p>
            <p className="flex items-end justify-between gap-6">
              <span
                data-cta-bit
                className="text-[clamp(2.2rem,6vw,5.5rem)] leading-[0.92] font-medium tracking-[-0.035em]"
              >
                {t('home.labTitleBefore')}{' '}
                <em
                  data-cta-accent
                  className="inline-block font-display font-normal italic text-accent"
                >
                  {t('home.labTitleEm')}
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
              className="mt-5 max-w-[52ch] text-body leading-relaxed text-ink/70 group-hover:text-bone/70"
            >
              {t('home.labBodyBefore')}
              <span className="text-accent">{t('home.labBodyLink')}</span>
              {t('home.labBodyAfter')}
            </p>
            <code
              data-cta-code
              className="mt-5 block overflow-x-auto whitespace-nowrap font-mono text-body-sm text-ink/40 group-hover:text-bone/45"
            >
              &lt;script src=&quot;.../embed/v1/loader.js&quot; data-key=&quot;pub_…&quot;
              async&gt;&lt;/script&gt;
            </code>
          </div>
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

          {/* Bifurcación, no un 5º paso: el hosted es otro producto (una
              sección suelta, suscripción). Solo un puntero a LAB. */}
          <p
            data-soft-fade
            className="mt-8 px-5 text-body leading-relaxed text-ink/60 md:px-10"
          >
            {t('home.howHostedNote')}{' '}
            <Link
              to="/lab"
              className="text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
            >
              {t('home.howHostedLink')}
            </Link>
          </p>

          <div
            data-soft-fade
            className="mt-12 flex flex-col items-center justify-center gap-8 border-y border-ink/15 px-5 py-14 text-center md:flex-row md:gap-16 md:px-10 md:py-20"
          >
            <div className="max-w-[42ch]">
              <p className="text-eyebrow uppercase text-ink/50">
                {t('home.paymentsTitle')}
              </p>
              <p className="mt-2 text-body leading-relaxed text-ink/65">
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
              <p className="text-eyebrow uppercase text-ink/50">
                {t('home.zipTitle')}
              </p>
              <ul className="mt-4 space-y-2 text-body leading-relaxed text-ink/75">
                <li>{t('home.zip1')}</li>
                <li>{t('home.zip2')}</li>
                <li>{t('home.zip3')}</li>
                <li>{t('home.zip4')}</li>
              </ul>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink/50">
                {t('home.reqTitle')}
              </p>
              <ul className="mt-4 space-y-2 text-body leading-relaxed text-ink/75">
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
        <div className="mb-20 grid grid-cols-3 gap-x-4 gap-y-10 md:mb-28 md:grid-cols-12 md:gap-12">
          <p
            data-footer-bit
            className="col-span-3 max-w-[40ch] text-body leading-relaxed text-ink/75 md:col-span-4"
          >
            {t('meta.tagline')}
          </p>

          <nav
            data-footer-bit
            className="min-w-0 md:col-span-2"
            aria-label={t('home.footerTemplates')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('home.footerTemplates')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
              {templates.map((template) => {
                const soon = Boolean(
                  template.comingSoon || isCatalogComingSoon(template.sku),
                )
                return (
                  <li key={template.id}>
                    {soon ? (
                      <span className="cursor-not-allowed text-ink/30">
                        {template.name}
                      </span>
                    ) : (
                      <Link
                        to={template.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors duration-300 hover:text-accent"
                      >
                        {template.name}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          <nav
            data-footer-bit
            className="min-w-0 md:col-span-3"
            aria-label={t('home.footerBuilder')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('home.footerBuilder')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
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
            className="min-w-0 md:col-span-3"
            aria-label={t('home.footerContact')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('home.footerContact')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
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
          className="mt-10 flex flex-col gap-2 border-t border-ink/15 pt-4 text-eyebrow uppercase text-ink/50 md:flex-row md:items-baseline md:justify-between"
        >
          <p>©{new Date().getFullYear()} {SITE_NAME}</p>
          <a
            href="#top"
            className="transition-colors duration-300 hover:text-accent"
          >
            {t('home.backTop')} <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>

      <TemplateBuyPill sku="chapters" name="CHAPTERS" placement="end" />
    </div>
  )
}

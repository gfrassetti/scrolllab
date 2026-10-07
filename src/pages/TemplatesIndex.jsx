import { useRef, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, useGSAP, SplitText, ScrollTrigger } from '../lib/gsap'
import SiteHeader from '../components/SiteHeader'
import BrandSplash from '../components/BrandSplash'
import TemplateBuyPill from '../components/TemplateBuyPill'
import HomeContact from '../components/HomeContact'
import { useCart } from '../lib/cart'
import { startCheckout } from '../lib/startCheckout'
import { useAuth } from '../lib/auth'
import {
  templatePriceUsd,
} from '../lib/pricing'
import { useFxRate } from '../lib/fx'
import { useI18n } from '../i18n'
import { useCurrency } from '../lib/currency'
import { fullMotionQuery, prefersReducedMotion } from '../lib/motion'
import { TEMPLATE_META } from '../features/home/templateMeta.js'
import HomeHero from '../features/home/HomeHero.jsx'
import TemplatesZone from '../features/home/TemplatesZone.jsx'
import BuilderZone from '../features/home/BuilderZone.jsx'
import LabZone from '../features/home/LabZone.jsx'
import HowItWorks from '../features/home/HowItWorks.jsx'
import StudioZone from '../features/home/StudioZone.jsx'
import HomeFooter from '../features/home/HomeFooter.jsx'





/**
 * Home del catálogo.
 * Flujo: hero → Templates (modelos) → Builder (demo, abrir el builder,
 * catálogo completo) → Lab → comparación → cómo funciona → contacto.
 */
export default function TemplatesIndex() {
  const root = useRef(null)
  const addItem = useCart((s) => s.addItem)
  const { user, loading: authLoading } = useAuth()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { currency } = useCurrency()
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

  // Ordered by list price, cheapest first (stable: ties keep their order
  // in TEMPLATE_META). The displayed "NN /" number follows the position, so
  // a price change reorders the catalog without anyone renumbering by hand.
  // To show the most expensive first, flip the comparison below.
  const templates = useMemo(
    () =>
      [...TEMPLATE_META]
        .map((meta, i) => ({ meta, i, price: templatePriceUsd(meta.sku) ?? Infinity }))
        .sort((a, b) => a.price - b.price || a.i - b.i)
        .map(({ meta }, pos) => ({ ...meta, id: String(pos + 1).padStart(2, '0') }))
        .map((meta) => ({
        ...meta,
        vibe: t(`templates.${meta.sku}.vibe`),
        tags: t(`templates.${meta.sku}.tags`),
        description: t(`templates.${meta.sku}.description`),
      })),
    [t],
  )

  // Comparación de las 3 formas de usarlo. Copy hardcodeada en ES por ahora
  // (los locale files están en edición por otra sesión); mover a i18n después.
  const ways = [
    {
      key: 'template',
      name: 'Template',
      kind: 'Compra única',
      rows: [
        ['Qué es', 'Un template entero, listo'],
        ['Te llevás', 'El código, en un ZIP'],
        ['Editás', 'Vos, el código'],
      ],
      to: '#templates',
      cta: 'Ver templates',
    },
    {
      key: 'builder',
      name: 'Builder',
      kind: 'Compra única',
      rows: [
        ['Qué es', 'Lo armás sección por sección'],
        ['Te llevás', 'El código, en un ZIP'],
        ['Editás', 'Vos, el código'],
      ],
      to: '/builder',
      cta: 'Abrir el builder',
    },
    {
      key: 'lab',
      name: 'LAB',
      kind: 'Suscripción',
      rows: [
        ['Qué es', 'Una sección suelta, en vivo'],
        ['Te llevás', 'Un <script>, sin bajar código'],
        ['Editás', 'Un panel, sin tocar código'],
      ],
      to: '/lab',
      cta: 'Ver LAB',
    },
  ]

  // Estudio: trabajo a medida por cotización (no pasa por checkout). Los
  // precios no se muestran acá — se hablan con el cliente (ver
  // docs/estudio-positioning.md, que sí tiene los anchors de referencia).
  const studioServices = [
    {
      key: 'custom',
      name: t('home.studioService1Name'),
      kind: t('home.studioService1Kind'),
      forWhom: t('home.studioService1For'),
      gets: t('home.studioService1Gets'),
    },
    {
      key: 'adapt',
      name: t('home.studioService2Name'),
      kind: t('home.studioService2Kind'),
      forWhom: t('home.studioService2For'),
      gets: t('home.studioService2Gets'),
    },
    // Mantenimiento/soporte no va como 3ra tarjeta: no es algo que se
    // contrate desde la UI (no hay una suscripción self-serve para esto,
    // a diferencia de LAB). Se ofrece caso por caso a quien ya contactó por
    // alguno de los dos servicios de arriba — ver docs/estudio-positioning.md.
  ]

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
      if (prefersReducedMotion()) return

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
        aria: 'none',
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
        fullMotionQuery('(min-width: 768px)'),
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

      // Teléfono: no hay escenario pegado que cambie de póster; cada fila trae el
      // suyo. El mismo gesto de PC con lo que hay: el póster de la fila se «enciende»
      // (zoom suave atado al scroll) y el texto sube al cruzar la fila.
      mm.add(fullMotionQuery('(max-width: 767px)'), () => {
        gsap.utils.toArray('[data-template-step]').forEach((step) => {
          const poster = step.querySelector('[data-template-art]')
          if (poster) {
            gsap.fromTo(
              poster,
              { scale: 1.12 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: step,
                  start: 'top 90%',
                  end: 'top 35%',
                  scrub: 0.6,
                },
              },
            )
          }
          gsap.from(Array.from(step.children).slice(1), {
            opacity: 0,
            y: 28,
            duration: 0.7,
            stagger: 0.07,
            ease: 'power3.out',
            scrollTrigger: { trigger: step, start: 'top 68%', once: true },
          })
        })
      })

      mm.add(fullMotionQuery(), () => {
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
        <HomeHero t={t} locale={locale} />

        <TemplatesZone
          t={t}
          templates={templates}
          currency={currency}
          rate={rate}
          addItem={addItem}
          buyingSku={buyingSku}
          authLoading={authLoading}
          buyNow={buyNow}
        />

        <BuilderZone
          t={t}
          locale={locale}
          currency={currency}
          rate={rate}
          addItem={addItem}
          buyingSku={buyingSku}
          authLoading={authLoading}
          buyNow={buyNow}
        />

        <LabZone t={t} ways={ways} />

        <HowItWorks t={t} howPanels={howPanels} />

        <StudioZone t={t} studioServices={studioServices} />

      </main>

      <HomeContact />

      <HomeFooter t={t} templates={templates} />

      <TemplateBuyPill sku="chapters" name="CHAPTERS" placement="end" />
    </div>
  )
}

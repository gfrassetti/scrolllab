import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { hero1, hero2, hero3, hero4, hero5, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultSlides = [
  { img: hero1, caption: 'Pine House, Surrey' },
  { img: hero2, caption: 'Courtyard House, Norfolk' },
  { img: hero3, caption: 'The Black Barn, Dorset' },
  { img: hero4, caption: 'Reflecting House, Wiltshire' },
  { img: hero5, caption: 'Garden Room, Kent' },
]

/**
 * HeroMeaning — the opening image carousel. Full-bleed photographs that wipe
 * into each other, a segmented progress bar (click a segment to jump) and the
 * studio's one-line introduction with a single button in the bottom-left.
 * Autoplay pauses when the hero is off-screen or the tab is hidden, and is off
 * when the device asks for less motion (the segments still work).
 */
export default function HeroMeaning({
  intro = 'Atelier Nove is an architecture studio for houses and the gardens around them. We design calm, well-made homes that belong to their place.',
  cta = 'View Projects',
  ctaHref = '#projects',
  slides = defaultSlides,
  interval = '6',
  /** Nombres para lectores de pantalla. */
  carouselLabel = 'Selected houses',
  slidesLabel = 'Slides',
  bg,
  fg,
  /** Degradado oscuro abajo para que el texto se lea sobre cualquier foto. */
  showShade = 'on',
  /** El carrusel avanza solo. */
  showAutoplay = 'on',
}) {
  const root = useRef(null)
  const list = (Array.isArray(slides) && slides.length ? slides : defaultSlides).slice(0, 8)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  // Las fotos de la demo (pesadas) bajan de a una: primero la que se ve, después las demás.
  const [firstReady, setFirstReady] = useState(false)
  const prev = useRef(0)
  const seconds = Math.min(15, Math.max(3, Number(interval) || 6))
  const auto = showAutoplay !== 'off' && !reduced && list.length > 1

  useEffect(() => {
    setReduced(prefersReducedMotion())
    const t = setTimeout(() => setFirstReady(true), 3500)
    return () => clearTimeout(t)
  }, [])

  // Pausa fuera de pantalla y con la pestaña oculta.
  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    let visible = true
    let tabVisible = !document.hidden
    const sync = () => setPaused(!(visible && tabVisible))
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(el)
    const onVis = () => {
      tabVisible = !document.hidden
      sync()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const go = useCallback(
    (n) => setIndex(((n % list.length) + list.length) % list.length),
    [list.length],
  )

  // La foto nueva entra con una cortina desde abajo y un zoom que se asienta.
  useGSAP(
    () => {
      const from = prev.current
      prev.current = index
      if (from === index) return
      const slidesEl = gsap.utils.toArray('[data-hero-slide]')
      const next = slidesEl[index]
      const old = slidesEl[from]
      if (!next) return
      slidesEl.forEach((el, i) => {
        if (i !== index && i !== from) gsap.set(el, { autoAlpha: 0 })
      })
      if (reduced) {
        gsap.set(next, { autoAlpha: 1, clipPath: 'none', zIndex: 2 })
        if (old) gsap.set(old, { autoAlpha: 0 })
        return
      }
      gsap.set(next, { autoAlpha: 1, zIndex: 2, clipPath: 'inset(100% 0% 0% 0%)' })
      if (old) gsap.set(old, { zIndex: 1 })
      gsap
        .timeline({ onComplete: () => old && gsap.set(old, { autoAlpha: 0 }) })
        .to(next, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' })
        .fromTo(
          next.querySelector('img'),
          { scale: 1.18 },
          { scale: 1, duration: 1.8, ease: 'power2.out' },
          0,
        )
        .fromTo('[data-hero-caption]', { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power3.out' }, 0.5)
    },
    { scope: root, dependencies: [index, reduced] },
  )

  return (
    <section
      ref={root}
      id="top-hero"
      data-tone="dark"
      aria-roledescription="carousel"
      aria-label={carouselLabel}
      className="relative h-svh min-h-[560px] w-full overflow-clip"
      style={{ backgroundColor: bg || '#111111', color: fg || '#ffffff' }}
    >
      <div className="absolute inset-0" aria-live="off">
        {list.map((slide, i) => (
          <div
            key={`${slide.img}-${i}`}
            data-hero-slide
            aria-hidden={i !== index}
            className="absolute inset-0"
            style={{ visibility: i === 0 ? 'visible' : 'hidden', zIndex: i === 0 ? 2 : 0 }}
          >
            {(i === 0 || firstReady || !variants[slide.img]) && (
              <img
              {...imgAttrs(slide.img, variants)}
              onLoad={i === 0 ? () => setFirstReady(true) : undefined}
              sizes="(max-width: 767px) 125vh, (max-aspect-ratio: 1/1) 178vh, 100vw"
              alt={slide.caption || ''}
              fetchPriority={i === 0 ? 'high' : 'low'}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover"
            />
            )}
          </div>
        ))}
      </div>

      {showShade !== 'off' && (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/60 via-black/10 to-black/25" />
      )}

      <div className="absolute inset-x-0 bottom-0 z-[4] px-5 pb-6 md:px-8 md:pb-8">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div className="max-w-[34rem]">
            <h1
              data-atelier-hero
              className="text-[clamp(1.05rem,1.9vw,1.5rem)] leading-[1.25] font-normal tracking-[-0.015em] text-balance"
            >
              {intro}
            </h1>
            <a
              href={ctaHref}
              className="tpl-hit mt-6 inline-flex items-center gap-3 rounded-full border border-current px-6 py-3 text-sm font-medium transition-[background-color,color] duration-300 hover:bg-white hover:text-black md:mt-8"
            >
              {cta}
              <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="hidden shrink-0 overflow-hidden text-right text-sm md:block" aria-live="polite">
            <span data-hero-caption className="block">
              {list[index]?.caption}
            </span>
          </p>
        </div>

        <ol className="flex gap-2" aria-label={slidesLabel}>
          {list.map((slide, i) => (
            <li key={i} className="flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1} / ${list.length}${slide.caption ? ` — ${slide.caption}` : ''}`}
                aria-current={i === index ? 'true' : undefined}
                className="tpl-hit group relative block h-6 w-full"
              >
                <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 bg-white/35 transition-[height] duration-300 group-hover:h-[3px]" />
                <span
                  key={i === index ? `on-${index}` : 'off'}
                  onAnimationEnd={auto && i === index ? () => go(index + 1) : undefined}
                  className="absolute inset-x-0 top-1/2 block h-px origin-left -translate-y-1/2 bg-white transition-[height] duration-300 group-hover:h-[3px]"
                  style={{
                    transform: i < index || (!auto && i === index) ? 'translateY(-50%) scaleX(1)' : 'translateY(-50%) scaleX(0)',
                    animationName: auto && i === index ? 'atelier-hero-bar' : undefined,
                    animationDuration: `${seconds}s`,
                    animationTimingFunction: 'linear',
                    animationFillMode: 'forwards',
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <style>{`@keyframes atelier-hero-bar { from { transform: translateY(-50%) scaleX(0) } to { transform: translateY(-50%) scaleX(1) } }`}</style>
    </section>
  )
}

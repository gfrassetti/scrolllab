import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import {
  trackA1,
  trackA2,
  trackA3,
  trackA4,
  trackB1,
  trackB2,
  trackB3,
  trackB4,
  trackB5,
  onTrack,
  offTrack,
  variants,
} from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'
import { mixHex, themeVars } from '../../../lib/themeVars'

const ROW_A = [
  {
    label: 'Pit bench',
    img: trackA1,
    w: 'w-[42vw] md:w-[18vw]',
  },
  {
    label: 'Quote',
    quote:
      '“I have crashed in three of their helmets and walked away from all three. That is my whole review.”',
    w: 'w-[70vw] md:w-[28vw]',
  },
  {
    label: 'Burnout',
    img: trackA2,
    w: 'w-[36vw] md:w-[14vw]',
  },
  {
    label: 'Dusk, Aragón',
    img: trackA3,
    w: 'w-[48vw] md:w-[20vw]',
  },
  {
    label: 'Wet kerb',
    img: trackA4,
    w: 'w-[40vw] md:w-[16vw]',
  },
]

const ROW_B = [
  {
    label: 'Race boots',
    img: trackB1,
    w: 'w-[44vw] md:w-[17vw]',
  },
  {
    label: 'Pass road',
    img: trackB2,
    w: 'w-[56vw] md:w-[24vw]',
  },
  {
    label: 'Carbon shop',
    img: trackB3,
    w: 'w-[44vw] md:w-[17vw]',
  },
  {
    label: 'Grip',
    img: trackB4,
    w: 'w-[40vw] md:w-[16vw]',
  },
  {
    label: 'Lights out',
    img: trackB5,
    w: 'w-[46vw] md:w-[19vw]',
  },
]

/**
 * Filas del builder: cada foto toma título y foto propios, y lo vacío cae a
 * la de la demo en esa posición. El ancho de cada tarjeta es parte del ritmo
 * de la fila: sigue el de la demo.
 */
function mergeRow(defaults, custom) {
  if (!Array.isArray(custom) || !custom.length) return defaults
  return custom.map((c, i) => {
    const d = defaults[i % defaults.length]
    return { ...d, label: c?.label || d.label, img: c?.img || d.img }
  })
}

const ROW_A_PHOTOS = ROW_A.filter((item) => !item.quote)
const ROW_A_QUOTE = ROW_A.find((item) => item.quote)

/**
 * TrackMerge — dual-row gallery with aggressive speed differential, then
 * PATH 1 / PATH 2 panels converge and hold before release.
 */
export default function TrackMerge({
  trackLabel = 'Track & trail',
  quote = ROW_A_QUOTE.quote,
  quoteCaption = '— Marta Vidal, endurance racer',
  rowA,
  rowB,
  pathLabelA = 'On track',
  pathLabelB = 'Off road',
  pathImgA = onTrack,
  pathImgB = offTrack,
  mergeTitleA = 'TRACK',
  mergeTitleB = 'TRAIL',
  mergeAccent = 'one shell,',
  /** Fondos de cada tramo (galería → cruce → salida) y sus textos. */
  bg = '#0a1a12',
  bg2 = '#e6e4dc',
  endBg = '#000000',
  fg = '#ece9e2',
  fg2 = '#161412',
  accent,
  /** La textura de anillos detrás de la galería. */
  showTexture = 'on',
  /** Ancla de la sección: el nav apunta acá. */
  id = 'track',
}) {
  // Los dos verdes intermedios del lavado: los de la demo, o el fondo aclarado.
  const demoBg = bg.toLowerCase() === '#0a1a12'
  const wash1 = demoBg ? '#12261c' : mixHex(bg, '#ffffff', 0.045)
  const wash2 = demoBg ? '#1a3328' : mixHex(bg, '#ffffff', 0.09)
  // La cita va segunda en la fila de arriba, como en la demo.
  const photosA = mergeRow(ROW_A_PHOTOS, rowA)
  const itemsA = [photosA[0], { ...ROW_A_QUOTE, quote }, ...photosA.slice(1)]
  const itemsB = mergeRow(ROW_B, rowB)
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Sin motion, galería y cruce quedaban visibles a la vez, una encima de
      // la otra. Queda el cruce (el remate de la sección) sobre su fondo
      // claro; la galería es una pieza de movimiento y sin scroll no se lee.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-tm-gallery]', { display: 'none' })
        gsap.set('[data-tm-bg]', { backgroundColor: bg2 })
        gsap.set('[data-tm-merge]', { opacity: 1 })
        gsap.set('[data-tm-on]', { y: 0, x: 0 })
        gsap.set('[data-tm-off]', { y: 0, x: 0 })
      })

      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=520%',
              pin: true,
              scrub: 0.65,
              anticipatePin: 1,
            },
          })

          // Act 1 — opposing rows: top races left, bottom crawls opposite
          tl.fromTo(
            '[data-tm-row-a]',
            { xPercent: 18 },
            { xPercent: -72, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-row-b]',
            { xPercent: -22 },
            { xPercent: 8, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-path-tag]',
            { opacity: 0 },
            { opacity: 1, duration: 0.15 },
            0.05,
          )

          // Continuous bg wash: forest → cream (merge) → black (HelmetGrid)
          tl.fromTo(
            '[data-tm-bg]',
            { backgroundColor: bg },
            { backgroundColor: wash1, ease: 'none', duration: 0.2 },
            0,
          )
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: wash2, ease: 'none', duration: 0.18 },
            0.2,
          )

          // Act 2 — gallery exits; merge stage fades in
          tl.to(
            '[data-tm-gallery]',
            { opacity: 0, scale: 0.94, ease: 'power1.in' },
            0.38,
          )
          tl.to('[data-tm-path-tag]', { opacity: 0, duration: 0.08 }, 0.36)

          tl.fromTo(
            '[data-tm-merge]',
            { opacity: 0 },
            { opacity: 1, duration: 0.1, ease: 'none' },
            0.36,
          )
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: bg2, ease: 'none', duration: 0.22 },
            0.34,
          )

          // Act 3 — panels slam together from opposite corners
          tl.fromTo(
            '[data-tm-on]',
            { yPercent: -70, xPercent: -18, opacity: 0.25, rotate: -4 },
            {
              yPercent: 0,
              xPercent: 0,
              opacity: 1,
              rotate: 0,
              ease: 'power3.out',
            },
            0.4,
          )
          tl.fromTo(
            '[data-tm-off]',
            { yPercent: 70, xPercent: 18, opacity: 0.25, rotate: 4 },
            {
              yPercent: 0,
              xPercent: 0,
              opacity: 1,
              rotate: 0,
              ease: 'power3.out',
            },
            0.4,
          )
          tl.fromTo(
            '[data-tm-title]',
            { opacity: 0, scale: 1.14, letterSpacing: '0.12em' },
            {
              opacity: 1,
              scale: 1,
              letterSpacing: '-0.04em',
              ease: 'power2.out',
            },
            0.52,
          )

          // Act 4 — long hold on the merge beat (storytelling pause)
          tl.to('[data-tm-merge]', { opacity: 1, duration: 0.22 }, 0.62)

          // Act 5 — release: wash to black to match HelmetGrid below
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: endBg, ease: 'none', duration: 0.2 },
            0.78,
          )
          tl.to(
            '[data-tm-merge]',
            { opacity: 0, y: -36, scale: 0.97, ease: 'power1.in' },
            0.84,
          )
        },
      )

      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=360%',
              pin: true,
              scrub: 0.7,
            },
          })
          tl.fromTo(
            '[data-tm-row-a]',
            { xPercent: 10 },
            { xPercent: -78, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-row-b]',
            { xPercent: -12 },
            { xPercent: 6, ease: 'none' },
            0,
          )
          tl.to('[data-tm-gallery]', { opacity: 0, scale: 0.96 }, 0.42)
          tl.fromTo(
            '[data-tm-merge]',
            { opacity: 0 },
            { opacity: 1 },
            0.4,
          )
          tl.fromTo(
            '[data-tm-bg]',
            { backgroundColor: bg },
            { backgroundColor: wash2, ease: 'none', duration: 0.35 },
            0,
          )
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: bg2, ease: 'none', duration: 0.2 },
            0.38,
          )
          tl.fromTo(
            '[data-tm-on]',
            { yPercent: -48, opacity: 0.3 },
            { yPercent: 0, opacity: 1, ease: 'power2.out' },
            0.44,
          )
          tl.fromTo(
            '[data-tm-off]',
            { yPercent: 48, opacity: 0.3 },
            { yPercent: 0, opacity: 1, ease: 'power2.out' },
            0.44,
          )
          tl.fromTo(
            '[data-tm-title]',
            { opacity: 0 },
            { opacity: 1 },
            0.55,
          )
          tl.to('[data-tm-merge]', { opacity: 1, duration: 0.18 }, 0.62)
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: endBg, ease: 'none', duration: 0.18 },
            0.78,
          )
          tl.to('[data-tm-merge]', { opacity: 0, y: -20 }, 0.84)
        },
      )
    },
    { scope: root, dependencies: [bg, bg2, endBg, wash1, wash2], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      id={id}
      className="relative"
      style={{ backgroundColor: bg, color: fg, '--tm-ink2': fg2, ...themeVars({ salt: fg, acid: accent }) }}
    >
      <div className="relative h-svh overflow-hidden">
        <div
          data-tm-bg
          className="absolute inset-0 transition-colors"
          style={{ backgroundColor: bg }}
        />

        <div
          data-tm-gallery
          className="absolute inset-0 z-10 flex flex-col justify-center gap-[4vh] overflow-hidden"
        >
          {showTexture !== 'off' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                `repeating-radial-gradient(circle at 40% 40%, transparent 0 16px, color-mix(in srgb, ${fg} 8%, transparent) 16px 17px)`,
            }}
          />
          )}

          <p
            data-tm-path-tag
            className="pointer-events-none absolute top-[12%] left-5 z-20 text-[11px] tracking-[0.3em] text-acid uppercase opacity-0 md:left-10"
          >
            {trackLabel}
          </p>

          <div
            data-tm-row-a
            className="flex items-end gap-4 px-5 will-change-transform md:gap-6 md:px-10"
          >
            {itemsA.map((item, i) =>
              item.quote ? (
                <figure
                  key={i}
                  className={`${item.w} shrink-0 pb-6 md:pb-10`}
                >
                  <blockquote className="font-display text-[clamp(1.35rem,3.2vw,2.4rem)] leading-[1.1] italic text-salt">
                    {item.quote}
                  </blockquote>
                  <p className="mt-4 text-[11px] tracking-[0.25em] text-acid uppercase">
                    {quoteCaption}
                  </p>
                </figure>
              ) : (
                <figure key={i} className={`${item.w} shrink-0`}>
                  <div className="aspect-3/4 overflow-hidden border border-white/15">
                    <img
                      {...imgAttrs(item.img, variants)}
                      sizes="(min-width: 768px) 24vw, 50vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 text-[11px] tracking-[0.2em] text-white/50 uppercase">
                    {item.label}
                  </figcaption>
                </figure>
              ),
            )}
          </div>

          <div
            data-tm-row-b
            className="flex items-start gap-4 px-5 will-change-transform md:gap-6 md:px-10"
          >
            {itemsB.map((item, i) => (
              <figure key={i} className={`${item.w} shrink-0`}>
                <div className="aspect-square overflow-hidden border border-white/15">
                  <img
                    {...imgAttrs(item.img, variants)}
                    sizes="(min-width: 768px) 24vw, 50vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-[11px] tracking-[0.2em] text-white/50 uppercase">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div
          data-tm-merge
          className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-0"
        >
          <div className="relative grid w-full max-w-6xl grid-cols-2 items-center gap-3 px-4 md:gap-8 md:px-10">
            <div data-tm-on className="will-change-transform">
              <div className="mx-auto aspect-square w-[78%] overflow-hidden md:w-[70%]">
                <img
                  {...imgAttrs(pathImgA, variants)}
                  sizes="(min-width: 768px) 420px, 40vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[11px] tracking-[0.25em] text-(color:--tm-ink2)/50 uppercase md:text-xs">
                {pathLabelA}
              </p>
            </div>
            <div data-tm-off className="will-change-transform">
              <div className="mx-auto aspect-3/4 w-[70%] overflow-hidden md:w-[58%]">
                <img
                  {...imgAttrs(pathImgB, variants)}
                  sizes="(min-width: 768px) 420px, 40vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[11px] tracking-[0.25em] text-(color:--tm-ink2)/50 uppercase md:text-xs">
                {pathLabelB}
              </p>
            </div>
          </div>

          <h2
            data-tm-title
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center font-brico text-[clamp(2.2rem,9vw,6.5rem)] leading-[0.85] font-semibold tracking-[-0.04em] text-(color:--tm-ink2) uppercase"
          >
            <span className="relative inline-block">
              <span className="absolute -top-2 left-0 font-display text-[0.55em] font-normal normal-case italic text-acid md:-top-3">
                {mergeAccent}
              </span>
              {mergeTitleA}
            </span>{' '}
            <span className="text-(color:--tm-ink2)/35">/</span> {mergeTitleB}
          </h2>
        </div>
      </div>
    </section>
  )
}

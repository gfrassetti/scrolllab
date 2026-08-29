import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import heroField from './assets/hero-field.jpg'

/**
 * HeroMassing — one full-bleed massing photograph, pinned. The picture
 * scales and drifts (P2) for the whole length of the manifesto that slides
 * over it; the chrome stays outside the transform. The bureau mark is
 * plate-size type in the corner, not the page H1.
 */
export default function HeroMassing({
  lineOne = 'Atrium',
  lineTwo = 'Architectural Bureau',
  hint = 'Index',
  img = heroField,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const media = root.current.querySelector('[data-hero-media]')
      // El wrapper que envuelve hero + manifiesto: el drift dura toda la
      // diapositiva blanca, no un h-svh.
      const stack = root.current.parentElement

      gsap.fromTo(
        media,
        { yPercent: -5, scale: 1.1 },
        {
          yPercent: 9,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: {
            trigger: stack,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.45,
          },
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="sticky top-0 z-0 h-svh overflow-hidden bg-atrium-ink">
      <img
        data-hero-media
        src={img}
        alt=""
        fetchPriority="high"
        decoding="sync"
        className="absolute inset-0 h-full w-full max-w-none object-cover will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

      <div className="relative flex h-full items-end justify-between gap-8 px-5 pb-8 md:px-10 md:pb-10">
        <p className="atrium-mid font-display text-white">
          <span className="block">{lineOne}</span>
          <span className="block pb-[0.08em] italic font-normal">{lineTwo}</span>
        </p>
        {hint ? (
          <p className="atrium-note hidden shrink-0 pb-[0.6em] tracking-[0.22em] text-white/70 uppercase md:block">
            {hint}
          </p>
        ) : null}
      </div>
    </section>
  )
}

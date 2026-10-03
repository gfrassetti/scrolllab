import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { parallax as parallaxImg, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

/**
 * ParallaxRise — generic band with a background that drifts upward
 * as you scroll (slower than the page).
 */
export default function ParallaxRise({
  eyebrow = 'Eyebrow',
  title = 'Title 1',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation.',
  cta = 'CTA label',
  img = parallaxImg,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set('[data-rise-bg]', { yPercent: -10 })
        return calmReveal('[data-rise-copy]', { y: 18, duration: 0.9 })
      }

      gsap.fromTo(
        '[data-rise-bg]',
        { yPercent: 22, scale: 1.1 },
        {
          yPercent: -28,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )

      gsap.fromTo(
        '[data-rise-veil]',
        { opacity: 0.4 },
        {
          opacity: 0.78,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )

      gsap.from('[data-rise-copy]', {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 68%',
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative min-h-[95svh] overflow-hidden border-t border-white/10 bg-black text-[#ece9e2]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          data-rise-bg
          {...imgAttrs(img, variants)}
          sizes="(max-aspect-ratio: 3/2) 210vh, 100vw"
          loading="lazy"
          decoding="async"
          alt=""
          className="absolute inset-x-0 -top-[18%] h-[145%] w-full origin-center object-cover will-change-transform"
        />
        <div
          data-rise-veil
          className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25"
        />
        {/* Fijo, debajo del texto: el velo de arriba se anima y a mitad de
            camino la foto (el tablero) competía con el cuerpo en mobile. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent md:from-black/55"
        />
      </div>

      <div
        data-rise-copy
        className="relative z-10 flex min-h-[95svh] flex-col justify-end px-5 py-16 md:px-10 md:py-24"
      >
        <p className="text-[11px] tracking-[0.25em] text-acid uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-[14ch] font-brico text-[clamp(2.4rem,7vw,5rem)] leading-[0.92] font-semibold tracking-[-0.04em]">
          {title}
        </h2>
        <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-white/80 md:text-base">
          {body}
        </p>
        <a
          href="#top"
          className="ui-press tpl-hit relative mt-8 inline-flex w-fit border border-acid bg-acid px-5 py-2.5 text-[11px] font-medium tracking-[0.22em] text-black uppercase transition-opacity hover:opacity-90"
        >
          {cta}
        </a>
      </div>
    </section>
  )
}

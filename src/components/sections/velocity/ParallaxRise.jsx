import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * ParallaxRise — generic band with a background that drifts upward
 * as you scroll (slower than the page).
 */
export default function ParallaxRise({
  eyebrow = 'Eyebrow',
  title = 'Title 1',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation.',
  cta = 'CTA label',
  img = 'https://picsum.photos/seed/vel-parallax/1920/1400',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('[data-rise-bg]', { yPercent: -10 })
        return
      }

      gsap.fromTo(
        '[data-rise-bg]',
        { yPercent: 18 },
        {
          yPercent: -22,
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
        y: 28,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative min-h-[85svh] overflow-hidden border-t border-white/10 bg-black text-[#ece9e2]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          data-rise-bg
          src={img}
          alt=""
          className="absolute inset-x-0 -top-[18%] h-[136%] w-full object-cover will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
      </div>

      <div
        data-rise-copy
        className="relative z-10 flex min-h-[85svh] flex-col justify-end px-5 py-16 md:px-10 md:py-24"
      >
        <p className="text-[11px] tracking-[0.25em] text-acid uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-[14ch] font-brico text-[clamp(2.4rem,7vw,5rem)] leading-[0.92] font-semibold tracking-[-0.04em]">
          {title}
        </h2>
        <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-white/70 md:text-base">
          {body}
        </p>
        <a
          href="#top"
          className="mt-8 inline-flex w-fit border border-acid bg-acid px-5 py-2.5 text-[10px] font-medium tracking-[0.22em] text-black uppercase transition-opacity hover:opacity-90"
        >
          {cta}
        </a>
      </div>
    </section>
  )
}

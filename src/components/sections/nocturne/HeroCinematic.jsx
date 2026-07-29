import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * HeroCinematic — full-bleed photographic hero. The image settles
 * with a slow zoom-out on load while the title rises out of a mask;
 * scrolling parallaxes the title away like an opening credit.
 */
export default function HeroCinematic({
  titleTop = 'NIGHT',
  titleBottom = 'SHIFT',
  kicker = 'A cinematic scrollytelling template',
  meta = 'Placeholder Films — ©2026',
  hint = 'Scroll',
  img = 'https://picsum.photos/seed/noct-hero/1920/1200',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-hero-img]', {
        scale: 1.25,
        duration: 2.4,
        ease: 'power2.out',
      })

      const split = new SplitText('[data-hero-title]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.from(split.chars, {
        yPercent: 115,
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.04,
        delay: 0.4,
      })

      gsap.from('[data-hero-fade]', {
        opacity: 0,
        y: 12,
        duration: 1,
        stagger: 0.12,
        delay: 1.2,
        ease: 'power2.out',
      })

      gsap.to('[data-hero-content]', {
        yPercent: 30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative h-svh overflow-hidden">
      <img
        data-hero-img
        src={img}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/20 to-noir/60" />

      <div
        data-hero-content
        className="relative flex h-full flex-col justify-between px-5 pt-24 pb-6 md:px-10 md:pb-10"
      >
        <p
          data-hero-fade
          className="max-w-60 text-[11px] uppercase tracking-[0.3em] text-salt/60 md:text-xs"
        >
          {kicker}
        </p>

        <h1 className="font-brico leading-[0.8] font-extrabold tracking-[-0.02em] select-none">
          <span data-hero-title className="block text-[18vw]">
            {titleTop}
          </span>
          <span data-hero-title className="block pl-[10vw] text-[18vw]">
            {titleBottom}
            <span aria-hidden="true" className="text-acid">
              .
            </span>
          </span>
        </h1>

        <div className="flex items-end justify-between border-t border-salt/20 pt-4">
          <p
            data-hero-fade
            className="text-[11px] uppercase tracking-[0.3em] text-salt/60 md:text-xs"
          >
            {meta}
          </p>
          <p
            data-hero-fade
            className="text-[11px] uppercase tracking-[0.3em] text-acid md:text-xs"
          >
            {hint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}

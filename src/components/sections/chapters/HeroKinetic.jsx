import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * HeroKinetic — full-viewport hero with oversized kinetic typography.
 * Characters rise out of a mask on load; the whole block drifts up
 * and fades as the user starts scrolling (cinematic exit).
 */
export default function HeroKinetic({
  lineOne = 'EVERY',
  lineTwo = 'story',
  lineThree = 'SCROLLS',
  kicker = 'A modular scrollytelling template',
  meta = '©2026 — Placeholder Studio',
  hint = 'Scroll to begin',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-hero-line]', {
        type: 'chars',
        mask: 'chars',
      })

      gsap.from(split.chars, {
        yPercent: 115,
        duration: 1.3,
        ease: 'power4.out',
        stagger: { each: 0.03 },
        delay: 0.2,
      })

      gsap.from('[data-hero-meta]', {
        opacity: 0,
        y: 14,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.12,
        delay: 1,
      })

      gsap.to('[data-hero-inner]', {
        yPercent: -14,
        opacity: 0.15,
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
    <section
      ref={root}
      className="relative flex h-svh flex-col justify-between overflow-hidden px-5 pt-24 pb-6 md:px-10 md:pb-10"
    >
      <div
        data-hero-inner
        className="flex h-full flex-col justify-between"
      >
        <p
          data-hero-meta
          className="max-w-55 text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
        >
          {kicker}
        </p>

        <h1 className="select-none leading-[0.82] font-medium tracking-[-0.03em]">
          <span data-hero-line className="block text-[17vw]">
            {lineOne}
          </span>
          <span
            data-hero-line
            className="block pl-[12vw] font-display text-[17vw] font-normal italic tracking-normal text-accent"
          >
            {lineTwo}
          </span>
          <span data-hero-line className="block text-[17vw]">
            {lineThree}
          </span>
        </h1>

        <div className="flex items-end justify-between border-t border-ink/15 pt-4">
          <p
            data-hero-meta
            className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
          >
            {meta}
          </p>
          <p
            data-hero-meta
            className="text-[11px] uppercase tracking-[0.25em] md:text-xs"
          >
            {hint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}

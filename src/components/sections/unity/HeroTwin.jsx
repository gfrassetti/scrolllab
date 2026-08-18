import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * HeroTwin — two stacked headlines with opposing scroll parallax.
 */
export default function HeroTwin({
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  headline = 'HEADLINE 1.\nHEADLINE 2.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.45,
        },
      })

      tl.to('[data-twin-body]', { yPercent: -28, opacity: 0.35 }, 0)
      tl.to('[data-twin-head]', { yPercent: 42 }, 0)
    },
    { scope: root },
  )

  const lines = String(headline)
    .split(/\n|\\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <section
      ref={root}
      id="start"
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#e7e4dc] px-5 pt-24 pb-20 text-[#0a0a0a] md:px-10"
    >
      <div className="relative mx-auto w-full max-w-5xl text-center">
        <p
          data-twin-body
          className="mx-auto max-w-[38ch] font-display text-[clamp(1.35rem,3.4vw,2.6rem)] leading-[1.25] tracking-[-0.01em] will-change-transform md:max-w-[42ch]"
        >
          {body}
        </p>

        <h1
          data-twin-head
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 font-anton text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.9] font-normal tracking-[-0.03em] text-[#2c4a42] uppercase will-change-transform"
        >
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
      </div>
    </section>
  )
}

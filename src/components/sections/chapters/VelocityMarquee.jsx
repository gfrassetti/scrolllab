import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'

/**
 * VelocityMarquee — infinite text ribbon that accelerates with
 * scroll velocity, framed by thin editorial rule lines.
 */
export default function VelocityMarquee({
  text = 'Placeholder ribbon',
  separator = '✺',
  repeat = 6,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const track = root.current.querySelector('[data-track]')

      const loop = gsap.to(track, {
        xPercent: -50,
        duration: 22,
        ease: 'none',
        repeat: -1,
      })

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const boost = Math.abs(
            gsap.utils.clamp(-4, 4, self.getVelocity() / 350),
          )
          gsap.to(loop, {
            timeScale: 1 + boost,
            duration: 0.5,
            overwrite: true,
          })
        },
      })
    },
    { scope: root },
  )

  const items = Array.from({ length: repeat }, (_, i) => (
    <span key={i} className="inline-flex items-baseline gap-[0.6em] pr-[0.6em]">
      <span>{text}</span>
      <span aria-hidden="true" className="text-accent">
        {separator}
      </span>
    </span>
  ))

  return (
    <section
      ref={root}
      aria-hidden="true"
      className="overflow-hidden border-y border-ink/15 py-4 md:py-6"
    >
      <div data-track className="flex w-max whitespace-nowrap will-change-transform">
        <div className="text-[9vw] leading-none font-medium uppercase tracking-[-0.02em] md:text-[5vw]">
          {items}
        </div>
        <div className="text-[9vw] leading-none font-medium uppercase tracking-[-0.02em] md:text-[5vw]">
          {items}
        </div>
      </div>
    </section>
  )
}

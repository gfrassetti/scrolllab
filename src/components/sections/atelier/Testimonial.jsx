import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

/**
 * Testimonial — one client sentence, set large. The quote rises into place when
 * it is reached; the attribution follows it.
 */
export default function Testimonial({
  eyebrow = 'Kind words',
  quote = 'They listened for months before they drew a line, and the house we moved into is the one we had been describing all along.',
  name = 'Helen & Marcus Ward',
  role = 'Pine House, Surrey',
  bg,
  fg,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-quote] > *', { y: 14, duration: 0.8 })
      gsap.from('[data-quote] > *', {
        autoAlpha: 0,
        y: 44,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.14,
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      })
      return undefined
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="testimonials"
      data-tone="light"
      className="px-5 py-28 md:px-8 md:py-44"
      style={{ backgroundColor: bg || '#f3f2ef', color: fg || '#111111' }}
    >
      <figure data-quote className="mx-auto grid max-w-[1500px] gap-8 md:grid-cols-12">
        <p className="text-sm font-medium md:col-span-2">{eyebrow}</p>
        <blockquote className="text-[clamp(1.8rem,4.2vw,3.8rem)] leading-[1.1] font-medium tracking-[-0.04em] text-balance md:col-span-9">
          “{quote}”
        </blockquote>
        <figcaption className="md:col-span-9 md:col-start-3">
          <span className="block text-base font-medium">{name}</span>
          <span className="block text-sm opacity-60">{role}</span>
        </figcaption>
      </figure>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

/**
 * AboutClarity — the studio statement. Two paragraphs on white paper; each word
 * starts pale and turns to ink as the reader moves down the page, so the text
 * is read at the pace of the scroll. Calm version: a short fade.
 */
export default function AboutClarity({
  eyebrow = 'Studio',
  lead = 'Every house we draw begins with the place: the light across the plot, the trees worth keeping, the way the ground falls away.',
  body = 'We are eleven architects and designers working from a converted printworks in Bristol. We build fewer houses than we are asked to, so that each one gets the whole studio and a long, careful site visit at every stage.',
  bg,
  fg,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const paras = gsap.utils.toArray('[data-about-p]')
      if (prefersReducedMotion()) return calmReveal(paras, { y: 16, duration: 0.9 })
      paras.forEach((p) => {
        const words = p.querySelectorAll('[data-w]')
        gsap.set(words, { opacity: 0.16 })
        gsap.to(words, {
          opacity: 1,
          ease: 'none',
          stagger: 0.5,
          scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 },
        })
      })
      return () => ScrollTrigger.refresh()
    },
    { scope: root },
  )

  const words = (text) =>
    String(text)
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => (
        <span key={i} data-w className="inline-block">
          {w}
          {' '}
        </span>
      ))

  return (
    <section
      ref={root}
      id="about"
      data-tone="light"
      className="px-5 py-28 md:px-8 md:py-44"
      style={{ backgroundColor: bg || '#ffffff', color: fg || '#111111' }}
    >
      <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-12">
        <p className="text-sm font-medium md:col-span-2">{eyebrow}</p>
        <div className="space-y-12 md:col-span-9 md:space-y-20">
          <p
            data-about-p
            className="text-[clamp(1.7rem,3.8vw,3.4rem)] leading-[1.12] font-medium tracking-[-0.035em]"
          >
            {words(lead)}
          </p>
          <p
            data-about-p
            className="max-w-[48rem] text-[clamp(1.1rem,1.9vw,1.6rem)] leading-[1.3] tracking-[-0.02em] md:ml-[16.66%]"
          >
            {words(body)}
          </p>
        </div>
      </div>
    </section>
  )
}

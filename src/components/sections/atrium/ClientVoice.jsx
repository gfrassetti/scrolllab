import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { material, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

/**
 * ClientVoice — one client sentence at headline size in the serif, with a
 * small photograph from the project on the right and the attribution under.
 * The quote rises line by line; the photograph drifts a little against it.
 */
export default function ClientVoice({
  kicker = '(8)',
  quote = 'They visited the site four times before drawing a line, and the house we moved into is the one we had been describing all along.',
  name = 'Helen and Marcus Ward',
  role = 'House in the Pines, Zug',
  img = material,
  bg,
  fg,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-voice] > *', { y: 16 })
      const split = new SplitText('[data-voice-quote]', { type: 'lines', mask: 'lines' })
      for (const mask of split.masks || []) {
        mask.style.paddingBottom = '0.22em'
        mask.style.marginBottom = '-0.22em'
      }
      gsap.from(split.lines, {
        yPercent: 130,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      })
      gsap.fromTo(
        '[data-voice-img]',
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      return undefined
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="clients"
      className="bg-atrium-paper px-5 py-[16svh] text-atrium-ink md:px-10 md:py-[22svh]"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div data-voice className="grid gap-12 md:grid-cols-12 md:gap-8">
        <p className="atrium-note tracking-[0.06em] uppercase opacity-60 md:col-span-12">{kicker}</p>
        <blockquote
          data-voice-quote
          className="font-display text-[clamp(1.9rem,4.6vw,5rem)] leading-[1.05] tracking-[-0.015em] text-balance md:col-span-8"
        >
          “{quote}”
        </blockquote>
        <div className="md:col-span-3 md:col-start-10 md:row-span-2">
          <div className="aspect-[4/5] overflow-hidden bg-current/10">
            <img
              data-voice-img
              {...imgAttrs(img, variants)}
              sizes="(min-width: 768px) 56vw, 158vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-[120%] w-full object-cover"
            />
          </div>
        </div>
        <p className="atrium-note tracking-[0.04em] uppercase md:col-span-6">
          <span className="block font-medium">{name}</span>
          <span className="block opacity-60">{role}</span>
        </p>
      </div>
    </section>
  )
}

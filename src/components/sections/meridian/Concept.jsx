import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'

/**
 * MERIDIAN — Concept
 *
 * Verified on the reference: a plain centred block (mono kicker + one big
 * light serif statement, 16rem of air above and below on desktop). It has
 * no motion of its own — the drama is the hero above it, which stops
 * sticking and slides up while its background parallaxes at 30% speed
 * (see Hero.jsx), so this section simply "arrives" from below.
 *
 * The statement reveals word by word on scroll (opacity + blur ramp), the
 * same vocabulary as the hero copy.
 */
export default function Concept({
  kicker = 'Concept',
  text = '[Describe your project in two or three sentences — where it is, the atmosphere, and what makes it different. Replace this copy with your own.]',
}) {
  const root = useRef(null)
  const textRef = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const split = new SplitText(textRef.current, { type: 'words' })
      gsap.set(split.words, { opacity: 0.12, filter: 'blur(4px)' })
      gsap.to(split.words, {
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top 82%',
          end: 'bottom 48%',
          scrub: true,
        },
      })
      ScrollTrigger.refresh()
    },
    { scope: root, dependencies: [text], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      id="concept"
      className="relative flex flex-col items-center justify-center gap-4 bg-[#dfd8cf] px-5 pt-32 pb-28 text-[#2a2622] md:py-64"
    >
      <p
        className="text-xs uppercase tracking-[0.12em]"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        {kicker}
      </p>
      <div
        ref={textRef}
        className="max-w-[58rem] text-center text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] tracking-[-0.02em] text-[#2a2622]/85"
        style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
      >
        {text}
      </div>
    </section>
  )
}

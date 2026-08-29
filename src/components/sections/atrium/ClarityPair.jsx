import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * ClarityPair — two oversized statements with small supporting copy.
 * Type rises from a mask; columns stagger in.
 */
export default function ClarityPair({
  kicker = '',
  left = 'Mass.',
  right = 'and measure.',
  bodyLeft = 'We begin with volume: how a building sits in weather, how it holds a street, how it lets light travel through a room.',
  bodyRight = 'Then we measure. Structure, envelope, and sequence are drawn until the idea can be built without losing its quiet.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-pair-line]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.from(split.chars, {
        yPercent: 110,
        duration: 1.05,
        ease: 'power4.out',
        stagger: 0.018,
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      })

      gsap.from('[data-pair-copy]', {
        opacity: 0,
        y: 18,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: 'top 68%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="border-t border-[#111]/12 px-5 py-24 md:px-10 md:py-36"
    >
      {kicker ? (
        <p
          data-pair-copy
          className="mb-14 text-[11px] tracking-[0.28em] text-[#111]/45 uppercase"
        >
          {kicker}
        </p>
      ) : null}
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h2
            data-pair-line
            className="font-display text-[clamp(3.2rem,8vw,7.5rem)] leading-[0.86] tracking-[-0.04em]"
          >
            {left}
          </h2>
          <p
            data-pair-copy
            className="mt-8 max-w-md text-[15px] leading-relaxed text-[#111]/65 md:text-base"
          >
            {bodyLeft}
          </p>
        </div>
        <div className="md:pt-24">
          <h2
            data-pair-line
            className="font-display text-[clamp(3.2rem,8vw,7.5rem)] pb-1 font-normal italic leading-[1.1] tracking-[-0.04em]"
          >
            {right}
          </h2>
          <p
            data-pair-copy
            className="mt-8 max-w-md text-[15px] leading-relaxed text-[#111]/65 md:text-base"
          >
            {bodyRight}
          </p>
        </div>
      </div>
    </section>
  )
}

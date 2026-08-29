import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * ScopeSerif — a single large editorial paragraph of practice scope.
 * Left-aligned on paper; the heading is the body.
 */
export default function ScopeSerif({
  body = 'Architectural concept, facade and planning solutions, sketch project, working documentation, visualizations.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-scope-line]', {
        type: 'lines',
        mask: 'lines',
      })
      gsap.from(split.lines, {
        yPercent: 108,
        duration: 1.15,
        ease: 'power4.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="bg-atrium-paper px-5 py-24 text-atrium-ink md:px-10 md:py-32"
    >
      <h2
        data-scope-line
        className="max-w-[16ch] font-display text-[clamp(2rem,6.4vw,5.6rem)] font-normal leading-[1.12] tracking-[-0.03em] md:max-w-[18ch]"
      >
        {body}
      </h2>
    </section>
  )
}

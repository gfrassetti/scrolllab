import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * ScopeSerif — the scope of the practice set as one serif paragraph at
 * headline size. Left column, first line indented, air on all sides.
 */
export default function ScopeSerif({
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
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
        scrollTrigger: { trigger: root.current, start: 'top 78%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="bg-atrium-paper px-5 pt-[14svh] pb-[26svh] text-atrium-ink md:px-10 md:pt-[18svh] md:pb-[32svh]"
    >
      <h2
        data-scope-line
        className="atrium-lead max-w-[23ch] indent-[1.15em]"
      >
        {body}
      </h2>
    </section>
  )
}

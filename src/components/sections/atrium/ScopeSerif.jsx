import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

/**
 * ScopeSerif — the scope of the practice set as one serif paragraph at
 * headline size. Left column, first line indented, air on all sides.
 */
export default function ScopeSerif({
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  bg,
  fg,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-scope-line]', { y: 16 })

      const split = new SplitText('[data-scope-line]', {
        type: 'lines',
        mask: 'lines',
      })
      // La máscara mide lo que la línea y con este interlineado cortaba los
      // descendentes (la «q» de «aliqua»): se la agranda hacia abajo sin mover
      // el layout, y el texto arranca más abajo para seguir escondido.
      for (const mask of split.masks || []) {
        mask.style.paddingBottom = '0.22em'
        mask.style.marginBottom = '-0.22em'
      }
      gsap.from(split.lines, {
        yPercent: 132,
        duration: 1.15,
        ease: 'power4.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 78%', once: true },
      })
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      className="bg-atrium-paper px-5 pt-[14svh] pb-[26svh] text-atrium-ink md:px-10 md:pt-[18svh] md:pb-[32svh]"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
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

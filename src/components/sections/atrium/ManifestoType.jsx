import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

/**
 * ManifestoType — the page H1 on paper. The paper slides over the pinned
 * hero while the type is still low in the frame, so the photograph is
 * visible behind the first line. Service columns sit far below it.
 */
export default function ManifestoType({
  lineOne = 'Your headline',
  lineTwo = 'goes right here',
  left = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.',
  right = 'Ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
  bg,
  fg,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-manifesto-head], [data-manifesto-col]', { y: 16, stagger: 0.12 })

      const split = new SplitText('[data-manifesto-line]', {
        type: 'chars',
        mask: 'chars',
      })
      // La máscara mide lo que la línea y con este interlineado cortaba los
      // descendentes (la «q» de «aliqua»): se la agranda hacia abajo sin mover
      // el layout, y el texto arranca más abajo para seguir escondido.
      for (const mask of split.masks || []) {
        mask.style.paddingBottom = '0.22em'
        mask.style.marginBottom = '-0.22em'
      }
      gsap.from(split.chars, {
        yPercent: 135,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.014,
        scrollTrigger: { trigger: '[data-manifesto-head]', start: 'top 92%', once: true },
      })

      gsap.from('[data-manifesto-col]', {
        yPercent: 24,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-manifesto-cols]', start: 'top 88%', once: true },
      })
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="bureau"
      className="relative z-10 bg-atrium-paper px-5 pt-[30svh] pb-[26svh] text-atrium-ink md:px-10 md:pt-[34svh] md:pb-[30svh]"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <h1
        data-manifesto-head
        className="atrium-display mx-auto max-w-[13ch] text-center text-balance"
      >
        <span data-manifesto-line className="block">
          {lineOne}
        </span>
        <span data-manifesto-line className="block">
          {lineTwo}
        </span>
      </h1>

      <div
        data-manifesto-cols
        className="atrium-note mx-auto mt-[26svh] grid w-full max-w-4xl gap-10 text-atrium-ink/65 md:mt-[34svh] md:grid-cols-2 md:gap-24"
      >
        <p data-manifesto-col className="md:max-w-[34ch]">
          {left}
        </p>
        <p data-manifesto-col className="md:max-w-[34ch] md:justify-self-end">
          {right}
        </p>
      </div>
    </section>
  )
}

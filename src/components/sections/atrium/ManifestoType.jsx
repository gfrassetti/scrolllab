import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * ManifestoType — the page H1 on bone paper. Slides over the sticky hero.
 * Two service columns sit lower in the same field.
 */
export default function ManifestoType({
  lineOne = 'Measured clarity',
  lineTwo = 'and invention.',
  left = 'Site strategy, material economy, passive systems, energy studies, lifecycle notes.',
  right = 'Concept, envelope, sketch set, working drawings, and stills for the room.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-manifesto-line]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.from(split.chars, {
        yPercent: 110,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.014,
        scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
      })

      gsap.from('[data-manifesto-col]', {
        yPercent: 18,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: 'top 40%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="bureau"
      className="relative z-10 bg-atrium-paper px-5 pt-[22svh] pb-28 text-atrium-ink md:px-10 md:pt-[26svh] md:pb-36"
    >
      <h1 className="mx-auto max-w-[16ch] text-center font-grotesk text-[clamp(2.8rem,8.6vw,8.25rem)] font-medium leading-[0.9] tracking-[-0.05em]">
        <span data-manifesto-line className="block">
          {lineOne}
        </span>
        <span data-manifesto-line className="block">
          {lineTwo}
        </span>
      </h1>
      <div className="mx-auto mt-24 grid w-full max-w-3xl gap-8 text-center text-[13px] leading-relaxed text-atrium-ink/55 md:mt-32 md:grid-cols-2 md:gap-16 md:text-left md:text-[15px]">
        <p data-manifesto-col>{left}</p>
        <p data-manifesto-col>{right}</p>
      </div>
    </section>
  )
}

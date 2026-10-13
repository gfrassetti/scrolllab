import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import ScrollFog from './ScrollFog'

export default function AboutClarity({
  eyebrow = 'About',
  title = 'We design rooms people want to stay in, and the objects that make them theirs.',
  body = 'Atelier Nove is eleven architects, makers and designers. We take a project from the first sketch to the last cushion: plan, materials, furniture, light and the name on the door.',
  tags = 'Interiors · Furniture · Identity',
  bg,
  fg,
  /** La niebla que se mueve con el scroll (sale del fondo y del texto). */
  showFog = 'on',
}) {
  const root = useRef(null)
  const fogBg = bg || '#0b0c10'
  const fogFg = fg || '#ffffff'

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-atelier-about]', { y: 16, duration: 0.9 })
      const split = new SplitText('[data-atelier-about]', {
        type: 'words',
        mask: 'words',
      })
      gsap.from(split.words, {
        yPercent: 110,
        opacity: 0,
        stagger: 0.02,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
        },
      })
      return () => split.revert()
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-t border-current/10 bg-[#0b0c10] px-5 py-24 text-white md:px-10 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      {showFog !== 'off' && <ScrollFog density={0.45} bg={fogBg} fg={fogFg} />}
      <div className="relative z-10 grid gap-10 md:grid-cols-12">
        <p className="text-[11px] tracking-[0.25em] text-white/40 uppercase md:col-span-3">
          {eyebrow}
        </p>
        <div className="md:col-span-9">
          <h2
            data-atelier-about
            className="max-w-[22ch] text-[clamp(1.6rem,3.5vw,2.8rem)] leading-[1.15] font-medium tracking-[-0.02em]"
          >
            {title}
          </h2>
          <p className="mt-8 max-w-[52ch] text-sm leading-relaxed text-white/55 md:text-base">
            {body}
          </p>
          <p className="mt-6 text-[11px] tracking-[0.22em] text-white/35 uppercase">
            {tags}
          </p>
        </div>
      </div>
    </section>
  )
}

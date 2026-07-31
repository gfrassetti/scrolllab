import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import ScrollFog from './ScrollFog'

const FACTS = [
  { value: '00+', label: 'Placeholder metric' },
  { value: '0K+', label: 'Placeholder metric' },
  { value: '00+', label: 'Placeholder metric' },
  { value: '00%', label: 'Placeholder metric' },
]

export default function KeyFacts({
  eyebrow = 'Section eyebrow',
  title = 'YOUR FACTS TITLE',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-fact]', {
        opacity: 0,
        y: 40,
        stagger: 0.1,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      id="facts"
      ref={root}
      className="relative overflow-hidden border-t border-white/10 bg-[#0b0c10] px-5 py-24 text-white md:px-10 md:py-32"
    >
      <ScrollFog density={0.4} />
      <div className="relative z-10">
        <p className="text-[11px] tracking-[0.25em] text-white/40 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-[18ch] text-[clamp(1.8rem,4vw,3rem)] font-medium tracking-[-0.03em]">
          {title}
        </h2>
        <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <li key={fact.label} data-fact>
              <p className="font-brico text-[clamp(2.8rem,6vw,4.5rem)] leading-none tracking-[-0.04em]">
                {fact.value}
              </p>
              <p className="mt-3 text-sm text-white/50">{fact.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

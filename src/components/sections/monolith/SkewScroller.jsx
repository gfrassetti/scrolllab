import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'

const defaultWords = ['RAW', 'CONCRETE', 'SYSTEM', 'GRID', 'FORCE', 'MASS']

/**
 * SkewScroller — a stack of giant condensed words that shears
 * (skews) with scroll velocity, snapping back when you stop.
 */
export default function SkewScroller({
  unit = '01',
  total = '05',
  label = 'The mantra',
  words,
  bg,
  fg,
}) {
  const root = useRef(null)
  const track = useRef(null)
  const rows =
    Array.isArray(words) && words.length
      ? words.map((w) => (typeof w === 'string' ? w : w.word || ''))
      : defaultWords

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const proxy = { skew: 0 }
      const setSkew = gsap.quickSetter(track.current, 'skewX', 'deg')

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const velocity = gsap.utils.clamp(-10, 10, self.getVelocity() / -400)
          if (Math.abs(velocity) > Math.abs(proxy.skew)) {
            proxy.skew = velocity
            gsap.to(proxy, {
              skew: 0,
              duration: 0.9,
              ease: 'power3.out',
              overwrite: true,
              onUpdate: () => setSkew(proxy.skew),
            })
          }
        },
      })

      gsap.from('[data-skew-row]', {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="overflow-hidden px-5 py-20 md:px-8 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          Unit {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <div ref={track} className="will-change-transform">
        {rows.map((word, i) => (
          <p
            key={i}
            data-skew-row
            className={`border-b-2 border-carbon font-anton text-[13vw] leading-[1.05] uppercase select-none md:text-[10vw] ${
              i % 2 === 1 ? 'text-right text-klein' : ''
            }`}
          >
            {word}
          </p>
        ))}
      </div>
    </section>
  )
}

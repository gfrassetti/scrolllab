import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'

const defaultStats = [
  { value: 40, suffix: '+', label: 'Brand films scored' },
  { value: 12, suffix: '', label: 'Industry nods' },
  { value: 6, suffix: 'yrs', label: 'In the room, not the brief' },
]

// A fixed, irregular silhouette — reads as a waveform, not a random noise gif.
const BAR_HEIGHTS = [28, 52, 78, 44, 92, 58, 34, 70, 100, 48, 24, 64, 84, 38, 74, 54, 96, 30, 60, 42, 80, 50, 68, 36]

function Waveform() {
  return (
    <div aria-hidden="true" className="flex h-12 items-end gap-[3px] opacity-80">
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="signal-eq-bar w-[3px] shrink-0 origin-bottom rounded-full bg-signal-accent motion-reduce:[animation:none]"
          style={{ height: `${h}%`, animationDelay: `${(i % 8) * 0.12}s` }}
        />
      ))}
    </div>
  )
}

/**
 * RecognitionStats — count-up figures on a dark field with a cyan waveform
 * motif (sound-studio identity, not a generic 3-column stat block). Same
 * count-up idiom as atrium/StatField (`data-counter` + ScrollTrigger once +
 * tweened proxy). Placeholder numbers for a fictional studio. See
 * docs/reference-analysis/signal.md.
 */
export default function RecognitionStats({
  eyebrow = 'Recognition',
  stats = defaultStats,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      gsap.utils.toArray('[data-counter]').forEach((el) => {
        const target = parseFloat(el.dataset.counter)
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          el.textContent = String(target)
          return
        }
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            const proxy = { value: 0 }
            gsap.to(proxy, {
              value: target,
              duration: 1.5,
              ease: 'power3.out',
              onUpdate: () => {
                el.textContent = String(Math.round(proxy.value))
              },
            })
          },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-signal-ink px-5 py-24 text-signal-paper md:px-10 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-end justify-between gap-6 border-t border-signal-paper/15 pt-5">
          <p className="text-[11px] tracking-[0.28em] text-signal-paper/45 uppercase">{eyebrow}</p>
          <Waveform />
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat, i) => (
            <div key={stat.label} className="border-l border-signal-paper/15 pl-5">
              <p className="font-mono text-[11px] tracking-[0.2em] text-signal-accent">
                SIG—{String(i + 1).padStart(2, '0')}
              </p>
              <p className="mt-3 font-grotesk text-[clamp(3.2rem,7.5vw,5.5rem)] leading-none font-medium tracking-[-0.03em] text-signal-accent">
                <span data-counter={stat.value}>0</span>
                {stat.suffix}
              </p>
              <p className="mt-3 max-w-[20ch] text-sm text-signal-paper/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * QuoteBreak — full-screen inverted interlude. The serif quote
 * reveals line by line out of a mask, scrubbed by the scroll.
 */
export default function QuoteBreak({
  chapter = '06',
  total = '06',
  label = 'Interlude',
  quote = '“Nobody remembers the page. Everybody remembers how it moved.”',
  attribution = 'Placeholder attribution — someone, somewhere',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-quote]', {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
      })

      gsap.from(split.lines, {
        yPercent: 110,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 60%',
          end: 'top 15%',
          scrub: true,
        },
      })

      gsap.from('[data-quote-meta]', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 30%',
          end: 'top 5%',
          scrub: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="flex min-h-svh flex-col justify-between bg-ink px-5 py-10 text-bone md:px-10"
    >
      <div className="flex items-baseline justify-between border-t border-bone/20 pt-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-bone/50 md:text-xs">
          Chapter {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <blockquote className="py-16">
        <p
          data-quote
          className="max-w-[20ch] font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[1.05] italic"
        >
          {quote}
        </p>
      </blockquote>

      <p
        data-quote-meta
        className="border-t border-bone/20 pt-4 text-[11px] uppercase tracking-[0.25em] text-bone/50 md:text-xs"
      >
        {attribution}
      </p>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'

const defaultTags = [
  'Sound design',
  'Motion graphics',
  'Brand film',
  'Sonic identity',
  'Title sequences',
  'Audio post',
]

/**
 * ManifestoMarquee — a blurred-word statement reveal (Dolsten's intro
 * heading) over a looping capability marquee (their client-logo marquee,
 * ported as text chips — no third-party trademarks). See
 * docs/reference-analysis/signal.md.
 */
export default function ManifestoMarquee({
  statement = 'We treat sound and motion as one instrument, tuned for brands that need to be felt, not just seen.',
  tags = defaultTags,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-manifesto]', { type: 'words', mask: 'words' })
      gsap.set(split.words, { yPercent: 110, opacity: 0, filter: 'blur(6px)' })
      gsap.to(split.words, {
        yPercent: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.03,
        scrollTrigger: { trigger: '[data-manifesto]', start: 'top 82%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-signal-ink px-5 py-24 text-signal-paper md:px-10 md:py-32">
      <p
        data-manifesto
        className="mx-auto max-w-[22ch] text-center font-grotesk text-[clamp(1.7rem,4.2vw,3rem)] leading-[1.15] font-medium tracking-[-0.02em] md:max-w-[26ch]"
      >
        {statement}
      </p>

      <div className="mt-20 overflow-hidden border-y border-signal-paper/15 py-5">
        <div className="signal-marquee flex w-max gap-10 motion-reduce:[animation:none]">
          {[...tags, ...tags].map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="shrink-0 text-[11px] tracking-[0.24em] text-signal-paper/50 uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

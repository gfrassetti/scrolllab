import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * ManifestoReveal — oversized statement paragraph whose words fade
 * from faint to full ink as the user scrolls through it (scrubbed).
 * Pass custom JSX as children to override the default copy;
 * <em> spans inside are rendered as accent serif italics.
 */
export default function ManifestoReveal({
  chapter = '01',
  total = '06',
  label = 'Manifesto',
  children,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-manifesto]', { type: 'words' })

      gsap.from(split.words, {
        opacity: 0.12,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          end: 'bottom 55%',
          scrub: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-5 py-28 md:px-10 md:py-44">
      <div className="mb-10 flex items-baseline justify-between border-t border-ink/15 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          Chapter {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <p
        data-manifesto
        className="max-w-[18ch] text-[clamp(2.2rem,6.5vw,6rem)] leading-[1.02] font-medium tracking-[-0.02em] [&_em]:font-display [&_em]:font-normal [&_em]:text-accent"
      >
        {children ?? (
          <>
            A page is not a poster — it is <em>a film</em>. This placeholder
            copy holds the rhythm until your own words arrive to{' '}
            <em>carry the story</em>.
          </>
        )}
      </p>
    </section>
  )
}

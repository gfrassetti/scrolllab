import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

/** `*así*` → <em>así</em>: lo que va entre asteriscos sale en cursiva y color. */
function withEmphasis(text) {
  return String(text)
    .split(/(\*[^*]+\*)/g)
    .map((part, i) =>
      /^\*[^*]+\*$/.test(part) ? <em key={i}>{part.slice(1, -1)}</em> : part,
    )
}

/**
 * ManifestoReveal — oversized statement paragraph whose words fade
 * from faint to full ink as the user scrolls through it (scrubbed).
 * Pass custom JSX as children to override the default copy;
 * <em> spans inside are rendered as accent serif italics. From the builder,
 * `text` does the same: words between *asterisks* become the <em>.
 *
 * Calma: el párrafo entra entero con un fundido (sin las palabras que se entintan).
 */
export default function ManifestoReveal({
  chapterLabel = 'Chapter',
  chapter = '01',
  total = '06',
  label = 'Manifesto',
  text,
  /** Ancla de la sección, si un link apunta acá. */
  id = 'manifesto',
  className = '',
  children,
  bg,
  fg,
  accent,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-manifesto]', { y: 18, duration: 1 })

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
    <section
      id={id}
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--market-ink': fg || undefined,
        '--market-bone': bg || undefined,
        '--color-accent': accent || undefined,
      }}
      ref={root}
      className={`px-5 py-28 md:px-10 md:py-44${className ? ` ${className}` : ''}`}
    >
      <div className="mb-10 flex items-baseline justify-between border-t border-ink/15 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          {chapterLabel} {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <p
        data-manifesto
        className="max-w-[18ch] text-[clamp(2.2rem,6.5vw,6rem)] leading-[1.02] font-medium tracking-[-0.02em] [&_em]:font-display [&_em]:font-normal [&_em]:text-accent"
      >
        {children ?? (text ? withEmphasis(text) : (
          <>
            We print <em>four issues a year</em>, each one a single story told
            by the people who lived it. No feeds, no ads, nothing to{' '}
            <em>scroll past</em>.
          </>
        ))}
      </p>
    </section>
  )
}

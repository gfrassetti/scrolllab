import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const defaultColumns = [
  { heading: 'Sitemap', items: ['Story', 'Index', 'About', 'Contact'] },
  { heading: 'Elsewhere', items: ['Instagram', 'Twitter / X', 'LinkedIn'] },
]

/**
 * FooterCTA — closing section with a giant call-to-action word,
 * link columns (or a flat `links` list) and a thin legal line.
 * `bg` / `fg` override the model canvas; `ctaHref` overrides the mailto.
 */
export default function FooterCTA({
  ctaWord = 'SAY HELLO',
  email = 'hello@placeholder.studio',
  ctaHref,
  columns = defaultColumns,
  links,
  bg,
  fg,
  legal = '©2026 Placeholder Studio — Template, not a promise',
}) {
  const root = useRef(null)
  const cta = ctaHref || `mailto:${email}`
  const flatLinks = Array.isArray(links) ? links.filter((l) => l && l.label) : []

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-cta-word]', {
        type: 'chars',
        mask: 'chars',
      })

      gsap.from(split.chars, {
        yPercent: 115,
        stagger: 0.04,
        ease: 'power4.out',
        duration: 1,
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          once: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <footer
      ref={root}
      className="px-5 pt-24 pb-6 md:px-10 md:pt-36"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="mb-20 grid gap-12 md:mb-32 md:grid-cols-12">
        <p className="max-w-[28ch] text-sm leading-relaxed text-ink/70 md:col-span-5 md:text-base">
          Placeholder closing note. Tell the reader what happens after the
          story ends — a form, a call, a door left open.
        </p>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-2 md:justify-items-end">
          {flatLinks.length > 0 ? (
            <nav aria-label="Links" className="col-span-2">
              <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
                {flatLinks.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.href || '#'}
                      className="text-sm transition-colors duration-300 hover:text-accent md:text-base"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            columns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
                  {column.heading}
                </p>
                <ul className="space-y-2">
                  {column.items.map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm transition-colors duration-300 hover:text-accent md:text-base"
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))
          )}
        </div>
      </div>

      <a href={cta} className="group block" aria-label={email}>
        <span
          data-cta-word
          className="block text-[13.5vw] leading-[0.85] font-medium tracking-[-0.03em] whitespace-nowrap uppercase transition-colors duration-500 group-hover:text-accent"
        >
          {ctaWord}
          <span aria-hidden="true" className="font-display italic">
            *
          </span>
        </span>
      </a>

      <div className="mt-10 flex flex-col gap-2 border-t border-ink/15 pt-4 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:flex-row md:items-baseline md:justify-between md:text-xs">
        <p>{legal}</p>
        <a href="#top" className="transition-colors duration-300 hover:text-accent">
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}

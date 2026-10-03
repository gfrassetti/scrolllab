import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

const defaultLinks = ['System', 'Units', 'Archive', 'Instagram', 'Contact']

/**
 * FooterBrutal — klein-blue closing block with a giant condensed
 * CTA word and a single mono link strip.
 */
export default function FooterBrutal({
  ctaWord = 'GET THE KIT',
  email = 'hello@placeholder.systems',
  ctaHref,
  links = defaultLinks,
  bg,
  fg,
  legal = '©2026 Placeholder Systems — Template, not a promise',
  backToTop = 'Back to top ↑',
}) {
  const root = useRef(null)
  const cta = ctaHref || `mailto:${email}`
  // `links` puede ser string[] (default) o {label, href}[] (editor).
  const linkItems = (Array.isArray(links) ? links : defaultLinks)
    .map((l) => (typeof l === 'string' ? { label: l, href: '#' } : l))
    .filter((l) => l && l.label)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-brutal-word]', { y: 16, duration: 0.9 })

      const split = new SplitText('[data-brutal-word]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.from(split.chars, {
        yPercent: 115,
        stagger: 0.035,
        duration: 0.9,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 75%',
          once: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <footer
      ref={root}
      className="border-t-2 border-carbon bg-klein text-concrete"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="px-5 pt-16 md:px-8 md:pt-24">
        <a href={cta} className="group tpl-hit relative block" aria-label={email}>
          <span
            data-brutal-word
            className="block font-anton text-[13vw] leading-[0.9] whitespace-nowrap uppercase transition-colors duration-300 group-hover:text-carbon"
          >
            {ctaWord}
          </span>
        </a>
      </div>

      <ul className="mt-12 flex flex-wrap border-t-2 border-carbon md:mt-20">
        {linkItems.map((link, i) => (
          <li key={i} className="border-r-2 border-carbon">
            <a
              href={link.href || '#'}
              className="block px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors duration-200 hover:bg-carbon md:px-8 md:text-xs lg:py-3"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t-2 border-carbon px-5 py-4 font-mono text-[11px] uppercase tracking-[0.1em] md:flex-row md:items-baseline md:justify-between md:px-8 md:text-xs">
        <p>{legal}</p>
        <a href="#top" className="tpl-hit relative self-start transition-colors duration-200 hover:text-carbon md:self-auto">
          {backToTop}
        </a>
      </div>
    </footer>
  )
}

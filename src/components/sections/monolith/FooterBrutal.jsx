import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const defaultLinks = ['System', 'Units', 'Archive', 'Instagram', 'Contact']

/**
 * FooterBrutal — klein-blue closing block with a giant condensed
 * CTA word and a single mono link strip.
 */
export default function FooterBrutal({
  ctaWord = 'GET THE KIT',
  email = 'hello@placeholder.systems',
  links = defaultLinks,
  legal = '©2026 Placeholder Systems — Template, not a promise',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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
    >
      <div className="px-5 pt-16 md:px-8 md:pt-24">
        <a href={`mailto:${email}`} className="group block" aria-label={email}>
          <span
            data-brutal-word
            className="block font-anton text-[13vw] leading-[0.9] whitespace-nowrap uppercase transition-colors duration-300 group-hover:text-carbon"
          >
            {ctaWord}
          </span>
        </a>
      </div>

      <ul className="mt-12 flex flex-wrap border-t-2 border-carbon md:mt-20">
        {links.map((link) => (
          <li key={link} className="border-r-2 border-carbon">
            <a
              href="#"
              className="block px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors duration-200 hover:bg-carbon md:px-8 md:text-xs"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t-2 border-carbon px-5 py-4 font-mono text-[10px] uppercase tracking-[0.1em] md:flex-row md:items-baseline md:justify-between md:px-8 md:text-[11px]">
        <p>{legal}</p>
        <a href="#top" className="transition-colors duration-200 hover:text-carbon">
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}

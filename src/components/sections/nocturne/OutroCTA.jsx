import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { pointerFx } from '../../../lib/interact'
import { themeVars } from '../../../lib/themeVars'
import { parseNavLinks } from '../../../lib/navLinks'
import { externalProps } from '../../../lib/contactLinks'

const defaultColumns = [
  {
    heading: 'Reel',
    items: [
      { label: 'Films', href: '#films' },
      { label: 'Frames', href: '#frames' },
      { label: 'Screening room', href: '#screening-room' },
    ],
  },
  {
    heading: 'Signal',
    items: [
      { label: 'Instagram', href: 'https://www.instagram.com/' },
      { label: 'Vimeo', href: 'https://vimeo.com/' },
      { label: 'Representation', href: 'mailto:agents@nocturnepictures.com' },
    ],
  },
]

/**
 * OutroCTA — closing credits. Giant CTA word rises out of a mask,
 * link columns above, thin legal line at the very bottom.
 *
 * Calma: la palabra entra con un fundido, sin la máscara por letra.
 */
export default function OutroCTA({
  ctaWord = 'ROLL CREDITS',
  email = 'night@nocturnepictures.com',
  ctaHref,
  columns = defaultColumns,
  links,
  bg,
  fg,
  accent,
  legal = '©2026 Nocturne Pictures B.V. — Rotterdam',
  note = 'Booking for autumn and winter shoots now. Tell us the story, the city and the hour: we will tell you if the night can carry it.',
  backToTop = 'Back to top ↑',
  /** Ancla de la sección: el nav apunta acá. */
  id = 'contact',
  /** Una insignia redonda sigue al cursor sobre la palabra gigante. */
  showHover = 'on',
}) {
  const root = useRef(null)
  const cta = ctaHref || `mailto:${email}`
  const flatLinks = Array.isArray(links) ? links.filter((l) => l && l.label) : []

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-outro-word]', { y: 24, duration: 1 })

      const split = new SplitText('[data-outro-word]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.from(split.chars, {
        yPercent: 115,
        stagger: 0.035,
        duration: 1,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          once: true,
        },
      })

      if (showHover === 'off') return
      const fx = pointerFx(root.current)
      fx.badge('[data-cursor]')
      fx.magnetic(root.current.querySelector('[data-outro-top]'), { pull: 0.35, reach: 60 })
      return fx.dispose
    },
    { scope: root, dependencies: [showHover] },
  )

  return (
    <footer
      ref={root}
      id={id}
      className="px-5 pt-24 pb-6 md:px-10 md:pt-36"
      style={{ backgroundColor: bg || undefined, color: fg || undefined, ...themeVars({ salt: fg, acid: accent, noir: bg }) }}
    >
      <div className="mb-20 grid gap-12 border-t border-salt/20 pt-10 md:mb-28 md:grid-cols-12">
        <p className="max-w-[30ch] text-sm leading-relaxed text-salt/60 md:col-span-5 md:text-base">
          {note}
        </p>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:justify-items-end">
          {flatLinks.length > 0 ? (
            <nav aria-label="Links" className="col-span-2">
              <ul className="grid grid-cols-2 gap-x-8 lg:gap-y-2">
                {flatLinks.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.href || '#top'}
                      {...externalProps(l.href)}
                      className="tpl-link tpl-hit relative inline-block py-3 text-sm transition-colors duration-300 hover:text-acid md:text-base lg:py-0"
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
                <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs lg:mb-4">
                  {column.heading}
                </p>
                <ul className="lg:space-y-2">
                  {parseNavLinks(column.items).map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        {...externalProps(item.href)}
                        className="tpl-link tpl-hit relative inline-block py-3 text-sm transition-colors duration-300 hover:text-acid md:text-base lg:py-0"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))
          )}
        </div>
      </div>

      <a href={cta} data-cursor="open" className="group tpl-hit relative block" aria-label={email}>
        <span
          data-outro-word
          className="block font-brico text-[11.5vw] leading-[0.85] font-extrabold tracking-[-0.02em] whitespace-nowrap uppercase transition-colors duration-500 group-hover:text-acid"
        >
          {ctaWord}
          <span
            aria-hidden="true"
            className="inline-block origin-bottom text-acid transition-transform duration-500 ease-out-strong group-hover:scale-150 motion-reduce:transition-none"
          >
            .
          </span>
        </span>
      </a>

      <div className="mt-10 flex flex-col gap-2 border-t border-salt/20 pt-4 text-[11px] uppercase tracking-[0.3em] text-salt/40 md:flex-row md:items-baseline md:justify-between md:text-xs">
        <p>{legal}</p>
        <a href="#top" data-outro-top className="tpl-link tpl-hit relative self-start transition-colors duration-300 hover:text-acid md:self-auto">
          {backToTop}
        </a>
      </div>
    </footer>
  )
}

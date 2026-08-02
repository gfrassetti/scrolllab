import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavAtelier — studio header. On scroll, brand fades; CTA + MENU pill
 * stay floating top-right (Trionn-style chrome, generic copy).
 */
export default function NavAtelier({
  brand = 'BRAND',
  cta = 'Your CTA',
  ctaHref = '#services',
  label = 'Placeholder label',
  links = ['Work | #work', 'Services | #services', 'Facts | #facts'],
  linksText,
  menuLabel = 'Menu',
  /** Section the header flips to dark type over. */
  lightSection = '#work',
  bandHeight = 80,
}) {
  const root = useRef(null)
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu({
    breakpoint: null,
  })

  useGSAP(
    () => {
      const header = root.current
      if (!header) return

      const section = document.querySelector(lightSection)

      const sync = () => {
        const scrolled = window.scrollY > 48
        if (scrolled) header.setAttribute('data-scrolled', 'true')
        else header.removeAttribute('data-scrolled')

        if (!section) return
        const { top, bottom } = section.getBoundingClientRect()
        const overlapping = top <= bandHeight && bottom > 0
        if (overlapping) header.setAttribute('data-on-light', 'true')
        else header.removeAttribute('data-on-light')
      }

      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: sync,
        onRefresh: sync,
      })

      sync()
    },
    { scope: root },
  )

  const onLight = (classes) => (open ? '' : classes)

  return (
    <header
      ref={root}
      className={`group fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-5 py-4 md:px-10 ${onLight('data-on-light:text-[#111214]')}`}
    >
      <a
        href="#top"
        className={`relative z-10 text-sm font-medium tracking-[0.2em] text-white uppercase transition-opacity duration-300 ${onLight('group-data-on-light:text-[#111214]')} group-data-scrolled:opacity-0 group-data-scrolled:pointer-events-none md:group-data-scrolled:opacity-100 md:group-data-scrolled:pointer-events-auto`}
      >
        {brand}
      </a>
      <p
        className={`hidden text-[10px] tracking-[0.25em] text-white/40 uppercase transition-opacity duration-300 md:block ${onLight('group-data-on-light:text-black/40')} group-data-scrolled:opacity-0`}
      >
        {label}
      </p>

      {/* Floating cluster — always above the overlay */}
      <div className="relative z-50 ml-auto flex items-center gap-2">
        <a
          href={ctaHref}
          className={`rounded-full bg-white px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-black uppercase shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform duration-300 group-data-scrolled:scale-[1.02] ${onLight('group-data-on-light:bg-[#111214] group-data-on-light:text-white')}`}
        >
          {cta}
        </a>
        <button
          {...triggerProps}
          aria-label={menuLabel}
          className={`relative inline-flex items-center gap-2.5 rounded-full border border-white/55 bg-black/25 px-4 py-2.5 text-[10px] font-medium tracking-[0.2em] text-white uppercase backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-[background-color,border-color,color] duration-300 ${onLight('group-data-on-light:border-black/35 group-data-on-light:bg-white/70 group-data-on-light:text-[#111214]')}`}
        >
          <span>{menuLabel}</span>
          <span aria-hidden="true" className="relative grid h-2.5 w-3.5 place-items-center">
            <span
              className={`absolute h-px w-full bg-current transition-transform duration-200 motion-reduce:transition-none ${
                open ? 'rotate-45' : '-translate-y-[3px]'
              }`}
            />
            <span
              className={`absolute h-px w-full bg-current transition-transform duration-200 motion-reduce:transition-none ${
                open ? '-rotate-45' : 'translate-y-[3px]'
              }`}
            />
          </span>
        </button>
      </div>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 z-40 bg-[#0b0c10] text-white transition-opacity duration-300 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-full flex-col justify-center px-5 md:px-10">
          <p className="mb-10 text-[10px] tracking-[0.25em] text-white/40 uppercase">
            {label}
          </p>
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={close}
                  style={{ transitionDelay: open ? `${100 + i * 70}ms` : '0ms' }}
                  className={`block py-3 text-[clamp(2rem,11vw,3.5rem)] leading-none font-medium tracking-[-0.03em] transition-all duration-500 motion-reduce:transition-none ${
                    open ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  )
}

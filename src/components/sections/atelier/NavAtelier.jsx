import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

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
  // No inline links at any width: the corner trigger is the only way in, so
  // the overlay stays available on desktop too.
  const { open, close, panelProps, triggerProps } = useMobileMenu({
    breakpoint: null,
  })

  useGSAP(
    () => {
      const header = root.current
      if (!header) return

      const section = document.querySelector(lightSection)
      if (!section) return

      // The band the header occupies, measured live on every update: a
      // start/end trigger gets its bounds from a first pass that runs before
      // images settle, and then stays stuck in light mode over a dark hero.
      const sync = () => {
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

  // The open panel is always dark, so the light-section treatment has to be
  // dropped while it covers the page or the bar turns black on black.
  const onLight = (classes) => (open ? '' : classes)

  return (
    <header
      ref={root}
      className={`group fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-5 py-4 md:px-10 ${onLight('data-on-light:text-[#111214]')}`}
    >
      <a
        href="#top"
        className={`relative z-10 text-sm font-medium tracking-[0.2em] text-white uppercase ${onLight('group-data-on-light:text-[#111214]')}`}
      >
        {brand}
      </a>
      <p className="hidden text-[10px] tracking-[0.25em] text-white/40 uppercase md:block group-data-on-light:text-black/40">
        {label}
      </p>
      <div className="relative z-10 flex items-center gap-2">
        <a
          href={ctaHref}
          className={`rounded-full bg-white px-4 py-2 text-[10px] font-medium tracking-[0.18em] text-black uppercase ${onLight('group-data-on-light:bg-[#111214] group-data-on-light:text-white')}`}
        >
          {cta}
        </a>
        <button
          {...triggerProps}
          aria-label={menuLabel}
          className={`relative grid size-9 place-items-center rounded-full border border-white/40 text-white ${onLight('group-data-on-light:border-black/30 group-data-on-light:text-[#111214]')}`}
        >
          <span
            aria-hidden="true"
            className={`absolute h-px w-3.5 bg-current transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'rotate-45' : '-translate-y-1'
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute h-px w-3.5 bg-current transition-transform duration-200 motion-reduce:transition-none ${
              open ? '-rotate-45' : 'translate-y-1'
            }`}
          />
        </button>
      </div>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 bg-[#0b0c10] text-white transition-opacity duration-300 motion-reduce:transition-none ${
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

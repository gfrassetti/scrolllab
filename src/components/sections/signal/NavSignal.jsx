import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavSignal — minimal fixed header: brand, one CTA, full-screen mobile menu.
 * Kept deliberately simple while SIGNAL is a single-scene WIP (see
 * BUILDER_HIDDEN_SKUS / LOCAL_ONLY_SKUS in src/lib/pricing.js).
 */
export default function NavSignal({
  brand = 'SIGNAL',
  cta = 'Start a project',
  ctaHref = '#contact',
  links = ['Work | #work', 'Studio | #studio'],
  linksText,
  menuLabel = 'Menu',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu({ breakpoint: null })

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 text-signal-paper md:px-10">
      <a href="#top" className="text-sm font-medium tracking-[0.2em] uppercase">
        {brand}
      </a>

      <div className="flex items-center gap-2">
        <a
          href={ctaHref}
          className="hidden rounded-full bg-signal-paper px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-signal-ink uppercase shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:inline-block"
        >
          {cta}
        </a>
        <button
          {...triggerProps}
          aria-label={menuLabel}
          className="relative inline-flex items-center gap-2.5 rounded-full border border-signal-paper/40 bg-signal-ink/40 px-4 py-2.5 text-[10px] font-medium tracking-[0.2em] text-signal-paper uppercase backdrop-blur-md"
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
        className={`fixed inset-0 z-40 bg-signal-ink text-signal-paper transition-opacity duration-300 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-full flex-col justify-center px-5 md:px-10">
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

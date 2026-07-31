import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavVelocity — fixed athlete header. Brand left, links center on desktop,
 * acid CTA always visible; on mobile the links move into a full-screen
 * overlay so the CTA never loses its slot.
 */
export default function NavVelocity({
  brand = 'BRAND',
  cta = 'CTA',
  ctaHref = '#hall',
  links = ['Hall', 'Gear', 'Contact'],
  linksText,
  menuLabel = 'Menu',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-5 py-4 md:px-10">
      <a
        href="#top"
        className="relative z-10 text-[11px] font-medium tracking-[0.28em] uppercase md:text-xs"
      >
        {brand}
      </a>

      <ul className="hidden items-center gap-8 md:flex">
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              className="text-[10px] tracking-[0.22em] uppercase transition-colors duration-200 hover:text-acid"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="relative z-10 flex items-center gap-2">
        <a
          href={ctaHref}
          className="border border-acid bg-acid px-4 py-2 text-[10px] font-medium tracking-[0.22em] text-[#0a1a12] uppercase transition-opacity hover:opacity-90"
        >
          {cta}
        </a>
        <button
          {...triggerProps}
          aria-label={menuLabel}
          className="relative grid size-9 place-items-center border border-salt/25 md:hidden"
        >
          <span
            aria-hidden="true"
            className={`absolute h-px w-4 bg-current transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'rotate-45' : '-translate-y-1'
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute h-px w-4 bg-current transition-transform duration-200 motion-reduce:transition-none ${
              open ? '-rotate-45' : 'translate-y-1'
            }`}
          />
        </button>
      </div>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 bg-[#0a1a12] transition-opacity duration-300 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ul className="flex h-full flex-col justify-center gap-1 px-5">
          {items.map((item, i) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={close}
                style={{ transitionDelay: open ? `${80 + i * 60}ms` : '0ms' }}
                className={`flex items-center gap-4 py-3 transition-all duration-300 motion-reduce:transition-none ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              >
                <span className="text-[10px] tracking-[0.3em] text-acid">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-anton text-[clamp(2.25rem,13vw,4.5rem)] leading-[0.9] uppercase">
                  {item.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}

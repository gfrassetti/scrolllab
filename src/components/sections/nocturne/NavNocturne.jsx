import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavNocturne — fixed header for the dark model. Brand left,
 * reel marker center (desktop), menu right.
 */
export default function NavNocturne({
  brand = 'NOCTURNE™',
  marker = 'Reel 02 — placeholder cut',
  links = ['Films', 'Index', 'Contact'],
  linksText,
  menuLabel = 'Menu',
  closeLabel = 'Close',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <header className="fixed inset-x-0 top-0 z-50 text-salt">
      <nav className="relative z-10 flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <a href="#top" className="text-sm font-medium uppercase tracking-[0.25em]">
          {brand}
        </a>

        <p className="hidden text-[11px] uppercase tracking-[0.3em] text-salt/40 lg:block">
          {marker}
        </p>

        <ul className="hidden items-center gap-10 md:flex">
          {items.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-xs uppercase tracking-[0.25em] transition-colors duration-300 hover:text-acid"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          {...triggerProps}
          className="text-xs uppercase tracking-[0.25em] transition-colors duration-300 hover:text-acid md:hidden"
        >
          {open ? closeLabel : menuLabel}
        </button>
      </nav>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 bg-noir/95 backdrop-blur-sm transition-opacity duration-500 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-full flex-col justify-center px-5">
          <p className="mb-8 text-[10px] uppercase tracking-[0.3em] text-salt/35">
            {marker}
          </p>
          <ul>
            {items.map((item, i) => (
              <li key={item.label} className="border-t border-salt/10 last:border-b">
                <a
                  href={item.href}
                  onClick={close}
                  style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
                  className={`flex items-baseline gap-4 py-5 transition-all duration-500 hover:text-acid motion-reduce:transition-none ${
                    open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                  }`}
                >
                  <span className="text-[10px] tracking-[0.3em] text-salt/35">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[clamp(1.9rem,10vw,3.25rem)] leading-none font-medium tracking-[-0.03em]">
                    {item.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  )
}

import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavMinimal — fixed header that inverts itself over any background
 * via mix-blend-difference. Drop it once at the top of the page.
 *
 * The overlay is a sibling of the header, not a child: mix-blend-difference
 * would invert the whole menu along with the bar.
 */
export default function NavMinimal({
  brand = 'CHAPTERS®',
  links = ['Story', 'Index', 'Contact'],
  linksText,
  menuLabel = 'Menu',
  closeLabel = 'Close',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 text-bone mix-blend-difference">
        <nav className="flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
          <a
            href="#top"
            className="text-sm font-medium uppercase tracking-[0.25em]"
          >
            {brand}
          </a>

          <ul className="hidden items-center gap-10 md:flex">
            {items.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-xs uppercase tracking-[0.25em] transition-opacity ease-out-strong hover:opacity-50"
                  style={{ transitionDuration: '180ms' }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            {...triggerProps}
            className="ui-press text-xs uppercase tracking-[0.25em] md:hidden"
          >
            {open ? closeLabel : menuLabel}
          </button>
        </nav>
      </header>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 z-40 bg-bone text-ink transition-opacity duration-500 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ul className="flex h-full flex-col justify-center gap-2 px-5">
          {items.map((item, i) => (
            <li key={item.label} className="overflow-hidden border-b border-ink/10">
              <a
                href={item.href}
                onClick={close}
                style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
                className={`block py-5 text-[clamp(2rem,11vw,3.5rem)] leading-none font-medium tracking-[-0.03em] transition-all duration-500 motion-reduce:transition-none ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

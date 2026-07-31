import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavBrutal — solid blocky header with hard borders. No blending,
 * no transparency: brutalist honesty. The menu drops as a stack of
 * full-width slabs instead of fading in.
 */
export default function NavBrutal({
  brand = 'MONOLITH™',
  links = ['System', 'Units', 'Contact'],
  linksText,
  menuLabel = 'Menu',
  closeLabel = 'Close',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-carbon bg-concrete text-carbon">
      <nav className="flex items-stretch justify-between">
        <a
          href="#top"
          className="flex items-center border-r-2 border-carbon px-5 py-4 font-mono text-sm font-bold uppercase tracking-[0.1em]"
        >
          {brand}
        </a>

        <ul className="hidden items-stretch md:flex">
          {items.map((item) => (
            <li key={item.label} className="flex border-l-2 border-carbon">
              <a
                href={item.href}
                className="flex items-center px-6 font-mono text-xs uppercase tracking-[0.15em] transition-colors duration-200 hover:bg-carbon hover:text-concrete"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          {...triggerProps}
          className={`border-l-2 border-carbon px-5 font-mono text-xs uppercase tracking-[0.15em] transition-colors duration-200 md:hidden ${
            open ? 'bg-carbon text-concrete' : ''
          }`}
        >
          {open ? closeLabel : menuLabel}
        </button>
      </nav>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`overflow-hidden border-carbon bg-concrete transition-[max-height] duration-300 ease-out md:hidden motion-reduce:transition-none ${
          open ? 'max-h-[70vh] border-b-2' : 'max-h-0'
        }`}
      >
        <ul>
          {items.map((item) => (
            <li key={item.label} className="border-t-2 border-carbon first:border-t-0">
              <a
                href={item.href}
                onClick={close}
                className="block px-5 py-5 font-mono text-lg font-bold uppercase tracking-[0.1em] transition-colors duration-200 hover:bg-carbon hover:text-concrete"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}

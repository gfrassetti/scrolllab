import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavComic — placeholder chrome for the comic template.
 */
export default function NavComic({
  brand = 'COMIC',
  tagline = 'Tagline 1',
  links = ['Link 1', 'Link 2', 'Link 3', 'Link 4'],
  linksText,
  cta = 'CTA',
  menuLabel = 'Menu',
  closeLabel = 'Close',
}) {
  const defaults = [
    { label: 'Link 1', href: '#chapter-dusty' },
    { label: 'Link 2', href: '#chapter-bond' },
    { label: 'Link 3', href: '#chapter-fork' },
    { label: 'Link 4', href: '#chapter-worlds' },
  ]
  const parsed = parseNavLinks(links, linksText)
  const items =
    parsed.length === defaults.length
      ? parsed.map((item, i) => ({ ...item, href: item.href || defaults[i].href }))
      : defaults
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 text-white">
      <nav className="pointer-events-auto relative z-10 flex items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-5">
        <div className="min-w-0">
          <a
            href="#top"
            className="block text-sm font-semibold tracking-[0.22em] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
          >
            {brand}
          </a>
          <p className="mt-0.5 hidden text-[10px] tracking-[0.18em] text-white/75 drop-shadow sm:block">
            {tagline}
          </p>
        </div>

        <ul className="hidden items-center gap-7 md:flex">
          {items.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-[11px] tracking-[0.2em] uppercase drop-shadow transition-opacity hover:opacity-70"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="rounded-md bg-comic-flare px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-white uppercase shadow-[0_8px_20px_rgba(232,90,36,0.45)] transition-transform hover:scale-[1.03]"
          >
            {cta}
          </a>
          <button
            {...triggerProps}
            className="text-[11px] tracking-[0.2em] uppercase drop-shadow md:hidden"
          >
            {open ? closeLabel : menuLabel}
          </button>
        </div>
      </nav>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`pointer-events-auto fixed inset-0 bg-[#1a1816]/96 text-white backdrop-blur-sm transition-opacity duration-500 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ul className="flex h-full flex-col justify-center px-6">
          {items.map((item, i) => (
            <li key={item.label} className="border-t border-white/15 last:border-b">
              <a
                href={item.href}
                onClick={close}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
                className={`block py-5 text-[clamp(1.6rem,8vw,2.6rem)] tracking-[-0.03em] transition-all duration-500 ${
                  open ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'
                }`}
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

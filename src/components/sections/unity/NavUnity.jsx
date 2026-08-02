import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavUnity — ref layout: phrase left · logo center · 3 links right.
 * Mobile: phrase + burger; links in full-screen overlay.
 */
export default function NavUnity({
  brand = 'HEADLINE 1',
  logo = '01',
  logoSrc = '',
  links = ['LINK 1', 'LINK 2', 'LINK 3'],
  linksText,
  menuLabel = 'MENU',
}) {
  const items = parseNavLinks(links, linksText).slice(0, 3)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-5 py-4 text-white mix-blend-difference md:px-10">
      <div className="relative flex items-center justify-between gap-3">
        <a
          href="#top"
          className="relative z-10 max-w-[36%] text-[10px] font-medium tracking-[0.22em] uppercase md:text-[11px]"
        >
          {brand}
        </a>

        <a
          href="#top"
          aria-label={logo}
          className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-auto object-contain md:h-11"
            />
          ) : (
            <span className="font-oswald text-[clamp(1.35rem,3vw,1.85rem)] leading-none font-semibold tracking-[-0.04em] uppercase">
              {logo}
            </span>
          )}
        </a>

        <div className="relative z-10 flex items-center gap-2">
          <ul className="hidden items-center gap-5 md:flex lg:gap-7">
            {items.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-55"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            {...triggerProps}
            aria-label={menuLabel}
            className="relative grid size-9 place-items-center border border-current/25 md:hidden"
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
      </div>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 bg-[#f3efe6] text-[#0a0a0a] mix-blend-normal transition-opacity duration-300 md:hidden motion-reduce:transition-none ${
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
                <span className="text-[10px] tracking-[0.3em] text-[#0a0a0a]/45">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-oswald text-[clamp(2.25rem,12vw,4rem)] leading-[0.9] font-semibold uppercase">
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

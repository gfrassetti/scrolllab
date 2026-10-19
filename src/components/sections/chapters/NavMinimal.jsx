import { useState } from 'react'
import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavMinimal — fixed header that inverts itself over any background
 * via mix-blend-difference. Drop it once at the top of the page.
 *
 * «Contents» opens the issue's table of contents over the whole page (on every
 * screen size): the page drops in from the top like a sheet of paper, each
 * entry carries its chapter number and a folio with a dotted leader, and the
 * entry under the pointer slides over while its number grows, huge and
 * outlined, behind the list.
 *
 * The overlay is a sibling of the header, not a child: mix-blend-difference
 * would invert the whole menu along with the bar.
 */
export default function NavMinimal({
  brand = 'CHAPTERS®',
  links = [
    { label: 'This issue', href: '#this-issue' },
    { label: 'Inside', href: '#inside' },
    { label: 'Archive', href: '#archive' },
    { label: 'Subscribe', href: '#subscribe' },
  ],
  linksText,
  menuLabel = 'Contents',
  closeLabel = 'Close',
  /** El índice: el rótulo de arriba y la primera página. */
  contentsTitle = 'In this issue',
  /** Menú (índice): fondo y texto. La barra se invierte sola (mix-blend). */
  bg,
  fg,
  /** La barra: se invierte sola sobre lo que tenga abajo (mix-blend). */
  barColor,
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu({ breakpoint: null })
  const [hover, setHover] = useState(0)

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 text-bone mix-blend-difference"
        style={barColor ? { color: barColor } : undefined}
      >
        <nav className="flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
          <a href="#top" className="tpl-hit relative text-sm font-medium uppercase tracking-[0.25em]">
            {brand}
          </a>

          <div className="flex items-center gap-10">
            <ul className="hidden items-center gap-10 lg:flex">
              {items.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="tpl-link tpl-hit relative text-xs uppercase tracking-[0.25em]">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <button
              {...triggerProps}
              className="ui-press tpl-hit group relative flex items-center gap-3 text-xs uppercase tracking-[0.25em]"
            >
              <span>{open ? closeLabel : menuLabel}</span>
              {/* dos líneas que se cruzan al abrir */}
              <span aria-hidden="true" className="relative block h-3 w-6">
                <span
                  className={`absolute left-0 h-px w-full bg-current transition-transform duration-500 ease-[cubic-bezier(.7,0,.2,1)] ${
                    open ? 'top-1/2 rotate-45' : 'top-0.5 group-hover:translate-x-1'
                  }`}
                />
                <span
                  className={`absolute left-0 h-px w-full bg-current transition-transform duration-500 ease-[cubic-bezier(.7,0,.2,1)] ${
                    open ? 'top-1/2 -rotate-45' : 'bottom-0.5 group-hover:-translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        style={{
          ...(bg || fg ? { backgroundColor: bg, color: fg } : {}),
          clipPath: open ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
        }}
        className={`fixed inset-0 z-40 overflow-hidden bg-bone text-ink transition-[clip-path] duration-[900ms] ease-[cubic-bezier(.7,0,.2,1)] motion-reduce:transition-none ${
          open ? '' : 'pointer-events-none'
        }`}
      >
        {/* el número del capítulo bajo el puntero, gigante y en contorno */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[3vw] bottom-0 font-display text-[40vw] leading-none italic text-transparent transition-opacity duration-500 select-none md:text-[26vw]"
          style={{ WebkitTextStroke: `1px color-mix(in srgb, ${fg || 'var(--color-ink)'} 22%, transparent)`, opacity: open ? 1 : 0 }}
        >
          {String(hover + 1).padStart(2, '0')}
        </span>

        <div className="relative flex h-full flex-col justify-center px-5 pt-20 pb-10 md:px-10">
          <p
            className={`mb-6 border-b border-current/15 pb-3 text-[11px] uppercase tracking-[0.25em] opacity-60 transition-opacity duration-500 md:mb-10 md:text-xs ${
              open ? 'opacity-60 delay-300' : 'opacity-0'
            }`}
          >
            {contentsTitle}
          </p>
          <ol>
            {items.map((item, i) => (
              <li key={item.label} className="overflow-hidden">
                <a
                  href={item.href}
                  onClick={close}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  style={{ transitionDelay: open ? `${280 + i * 70}ms` : '0ms' }}
                  className={`group flex items-baseline gap-4 py-2 transition-[transform,opacity] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none md:gap-8 md:py-3 ${
                    open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                  }`}
                >
                  <span className="w-8 shrink-0 text-[11px] tracking-[0.25em] opacity-50 md:text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[clamp(2.2rem,8vw,6.5rem)] leading-[0.95] font-medium tracking-[-0.03em] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-3 group-hover:italic md:group-hover:translate-x-6">
                    {item.label}
                  </span>
                  <span aria-hidden="true" className="mb-[0.6em] hidden flex-1 border-b border-dotted border-current/30 md:block" />
                  <span className="hidden text-xs tracking-[0.25em] opacity-50 md:block">
                    p. {String(4 + i * 14).padStart(2, '0')}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  )
}

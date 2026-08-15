import { parseNavLinks } from '../../../lib/navLinks'
import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { useRupture, setRupture } from './rupture'
import RuptureLayer from './RuptureLayer'

/**
 * NavRatio — hairline bar. Brand · links · Rupture switch.
 * Rupture is the page-wide crazy mode: objects spin harder, blocks lean.
 * No construction-grid overlay — the drawings live inside the chapters.
 */
export default function NavRatio({
  brand = 'RATIO',
  links = ['Intro', 'Systems', 'Notes'],
  linksText,
  ruptureLabel = 'Rupture',
  onLabel = 'On',
  offLabel = 'Off',
  credit = 'SCROLLLAB',
  menuLabel = 'MENU',
}) {
  const items = parseNavLinks(links, linksText).slice(0, 3)
  const ruptured = useRupture()
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <>
    <header
      data-ratio-nav
      className="fixed inset-x-0 top-0 z-50 border-b border-[#111] bg-[#f3f1eb] text-[#111]"
    >
      <div className="flex h-11 items-center justify-between gap-3 px-3 text-[10px] tracking-[0.18em] uppercase md:h-12 md:px-5 md:text-[11px]">
        <a href="#top" className="flex shrink-0 items-center gap-2 font-medium">
          <span aria-hidden="true" className="size-2 bg-[#111]" />
          {brand}
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {items.map((item, i) => (
            <li key={item.label} className="flex items-center gap-1">
              {i > 0 ? <span className="opacity-35">/</span> : null}
              <a href={item.href} className="transition-opacity hover:opacity-50">
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 md:gap-5">
          <fieldset className="flex items-center gap-1.5 border-0 p-0">
            <legend className="sr-only">{ruptureLabel}</legend>
            <span className="hidden opacity-55 sm:inline">{ruptureLabel}:</span>
            <span className="inline-flex items-center gap-0.5">
              <button
                type="button"
                aria-pressed={ruptured}
                onClick={() => setRupture(true)}
                className={`ui-press rounded-full px-2 py-0.5 ${
                  ruptured ? 'bg-[#111] text-[#ebe6dc]' : 'hover:opacity-55'
                }`}
              >
                {onLabel}
              </button>
              <button
                type="button"
                aria-pressed={!ruptured}
                onClick={() => setRupture(false)}
                className={`ui-press rounded-full px-2 py-0.5 ${
                  !ruptured ? 'bg-[#111] text-[#ebe6dc]' : 'hover:opacity-55'
                }`}
              >
                {offLabel}
              </button>
            </span>
          </fieldset>

          <span className="hidden opacity-45 lg:inline">{credit}</span>

          <button
            {...triggerProps}
            aria-label={menuLabel}
            className="relative grid size-8 place-items-center md:hidden"
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
        className={`fixed inset-0 bg-[#f3f1eb] text-[#111] transition-opacity duration-300 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ul className="flex h-full flex-col justify-center gap-1 px-5">
          {items.map((item, i) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={close}
                className={`flex items-center gap-4 py-3 transition-all duration-300 motion-reduce:transition-none ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: open ? `${80 + i * 60}ms` : '0ms' }}
              >
                <span className="text-[10px] tracking-[0.3em] opacity-40">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-anton text-[clamp(2.5rem,12vw,4.5rem)] leading-[0.85] uppercase">
                  {item.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
    <RuptureLayer />
    </>
  )
}

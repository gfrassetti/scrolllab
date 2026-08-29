import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavAtrium — stacked bureau mark, reference-style links (Index / Work /
 * About / Contact). A dark scrim + blur sits behind the bar instead of
 * `mix-blend-difference`: the blend mode read fine over a flat photo or a
 * flat colour field, but the moment a large headline (the manifesto H1, the
 * ring's centre copy) scrolled directly under it, the pixel-difference math
 * doubled-exposed the two sets of letterforms into an unreadable smear.
 * A fixed scrim behind fixed-colour type has no such failure mode — it reads
 * the same over a photo, paper, or ink, always.
 */
export default function NavAtrium({
  lineOne = 'Architectural',
  lineTwo = 'Bureau',
  links = [
    'Index | #top',
    'Work | #work',
    'About | #bureau',
    'Contact | #contact',
  ],
  linksText,
  menuLabel = 'Index',
  closeLabel = 'Close',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[90] bg-atrium-ink/70 text-atrium-paper backdrop-blur-md">
        <nav className="flex items-start justify-between px-5 py-5 md:px-10 md:py-6">
          <a href="#top" className="text-[11px] leading-[1.25] tracking-[0.08em] md:text-xs">
            <span className="block">{lineOne}</span>
            <span className="block">{lineTwo}</span>
          </a>

          <ul className="hidden items-center gap-6 pt-1 md:flex lg:gap-8">
            {items.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-[11px] tracking-[0.2em] uppercase transition-opacity duration-200 ease-out-strong hover:opacity-50 md:text-xs"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            {...triggerProps}
            className="ui-press pt-1 text-[11px] tracking-[0.2em] uppercase md:hidden"
          >
            {open ? closeLabel : menuLabel}
          </button>
        </nav>
      </header>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`fixed inset-0 z-[80] bg-atrium-paper text-atrium-ink transition-opacity duration-500 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ul className="flex h-full flex-col justify-center px-5">
          {items.map((item, i) => (
            <li key={item.label} className="overflow-hidden border-b border-[#111]/10">
              <a
                href={item.href}
                onClick={close}
                style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
                className={`block py-5 font-display text-[clamp(2.2rem,11vw,3.6rem)] leading-none tracking-[-0.03em] transition-all duration-500 motion-reduce:transition-none ${
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

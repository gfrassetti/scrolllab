import { useEffect, useState } from 'react'
import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'
import { readableInk } from '../../../lib/themeVars'

/**
 * NavAtelier — fixed header in the practice's own voice: the wordmark on the
 * left, three plain links in the middle, a hairline "Contact" button on the
 * right. It is drawn with `mix-blend-difference`, so it reads white over the
 * photographs and black over the paper without any scroll logic. On a phone
 * the links fold into a full-screen paper menu (a sibling of the header, so
 * the blend does not invert it).
 */
export default function NavAtelier({
  brand = 'Atelier',
  links = ['Projects | #projects', 'Studio | #studio', 'Journal | #journal'],
  linksText,
  cta = 'Contact',
  ctaHref = '#contact',
  menuLabel = 'Menu',
  closeLabel = 'Close',
  /** El menú del teléfono: fondo y texto (la barra se invierte sola). */
  bg,
  fg,
  /** Fondo de la barra. Vacío: transparente y su color sigue a lo que hay debajo. */
  barBg,
  /** Color del texto de la barra con fondo. */
  barColor,
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()
  // El color de la barra sigue a lo que hay debajo: blanco sobre fotos y fondos
  // oscuros, tinta sobre papel, y en la transición de columnas se invierte sola.
  const [tone, setTone] = useState('dark')
  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      const hit = document
        .elementsFromPoint(window.innerWidth / 2, 36)
        .map((el) => el.closest?.('[data-tone]'))
        .find(Boolean)
      setTone(hit?.dataset.tone || 'light')
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  // Con fondo propio la barra es sólida: sin mix-blend ni lectura de lo de abajo.
  const solid = Boolean(barBg) && !open
  const solidInk = solid ? barColor || readableInk(barBg) || '#f2efe9' : undefined
  const ink = solid ? /^#(0|1)/i.test(solidInk) : tone === 'light' && !open

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          open ? 'text-current' : solid || ink ? '' : 'text-white'
        } ${tone === 'mixed' && !open && !solid ? 'mix-blend-difference !text-white' : ''}`}
        style={
          solid
            ? { backgroundColor: barBg, color: solidInk }
            : open || ink
              ? { color: fg || '#111111' }
              : undefined
        }
      >
        <nav className="grid grid-cols-[1fr_auto] items-center px-5 py-5 md:grid-cols-[1fr_auto_1fr] md:px-8 md:py-6">
          <a href="#top" className="tpl-hit relative text-xl font-medium tracking-[-0.03em] md:text-2xl">
            {brand}
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {items.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="tpl-link tpl-hit relative text-sm font-medium tracking-[-0.01em]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-3">
            <a
              href={ctaHref}
              className={`hidden rounded-full border border-current px-5 py-2 text-sm font-medium transition-[background-color,color] duration-300 md:inline-flex ${
                ink ? 'hover:bg-[#111111] hover:text-white' : 'hover:bg-white hover:text-black'
              }`}
            >
              {cta}
            </a>
            <button
              {...triggerProps}
              className="ui-press tpl-hit relative text-sm font-medium tracking-[-0.01em] md:hidden"
            >
              {open ? closeLabel : menuLabel}
            </button>
          </div>
        </nav>
      </header>

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        style={{ backgroundColor: bg || '#ffffff', color: fg || '#111111' }}
        className={`fixed inset-0 z-40 transition-opacity duration-500 md:hidden motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ul className="flex h-full flex-col justify-center gap-1 px-5">
          {[...items, { label: cta, href: ctaHref }].map((item, i) => (
            <li key={item.label} className="overflow-hidden border-b border-current/15">
              <a
                href={item.href}
                onClick={close}
                style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
                className={`block py-5 text-[clamp(2.2rem,11vw,3.6rem)] leading-none font-medium tracking-[-0.04em] transition-all duration-500 motion-reduce:transition-none ${
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

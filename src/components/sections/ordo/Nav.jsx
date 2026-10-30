import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { getLenis, scrollToSection } from '../../../hooks/useLenis'
import { getRoute, navigate } from './router'
import { hidePaint } from './paint'
import { C, LABEL, OPEN_DELAY, OPEN_T as T, SITE } from './brand'
import Logo from './Logo'

/**
 * El marco del sitio, dibujado con líneas como un plano: el nav arriba y, abajo, el borde del bloque
 * de texto del hero (su alto es --band-h, en ordo.css).
 *
 * La apertura (después de que el boceto se pinta): dos líneas finas nacen en el centro de la
 * pantalla y se estiran hasta los bordes; una sube y queda como el borde del nav, la otra baja y
 * queda como el borde del bloque de abajo (esa la dibuja el hero, Hero.jsx, con los mismos tiempos:
 * es de su hoja). Después se trazan las divisiones del nav (de arriba
 * hacia abajo), los botones se pintan (paint.js) y entran la regla y las cruces de registro.
 *
 * El logo chico (`logoRef`) arranca invisible: el loader aterriza ahí y lo enciende (vía el hero).
 * Al pasar el mouse, el logo se vuelve a escribir: de la «e» a la «O», cada letra trazada en óxido y
 * después rellena, y al final cae la tapa de la T.
 *
 * Todas las celdas miden lo mismo (--mod, ordo.css) y las líneas de la regla, las columnas del hero y el
 * borde de su celda de texto se miden desde el borde derecho en múltiplos de ese módulo: las divisiones del nav
 * son el principio de las líneas que bajan por la página.
 *
 * Por ancho: en el teléfono, el logo y «Menú» (que abre las secciones y el contacto en una hoja
 * debajo del nav); desde 640, también «Contacto»; desde 768, las secciones en el nav, sin menú.
 */

const LINKS = [
  { id: 'studio', label: 'Studio' },
  { id: 'projects', label: 'Projects' },
  { id: 'services', label: 'Services' },
]
const MENU = [...LINKS, { id: 'contact', label: 'Contact', accent: true }]


export default function Nav({ logoRef, open, calm }) {
  const rootRef = useRef(null)

  // Antes de abrir, todo lo del marco está escondido (las líneas, en el centro y sin largo).
  useLayoutEffect(() => {
    const q = gsap.utils.selector(rootRef.current)
    const ctx = gsap.context(() => {
      if (calm) return
      // Cada línea arranca en el centro de la pantalla: se mide dónde queda y se la corre hasta ahí.
      const mid = window.innerHeight / 2
      gsap.set(q('[data-line]'), { scaleX: 0, y: (_i, el) => mid - el.getBoundingClientRect().top })
      gsap.set(q('[data-divider]'), { scaleY: 0 })
      hidePaint(q('[data-in]'))
      gsap.set(q('[data-ruler]'), { scaleX: 0 })
      gsap.set(q('[data-mark]'), { autoAlpha: 0, scale: 0.4 })
    }, rootRef)
    return () => ctx.revert()
  }, [calm])

  useEffect(() => {
    if (!open || calm) return undefined
    const q = gsap.utils.selector(rootRef.current)
    const tl = gsap.timeline({ delay: OPEN_DELAY })
    // Las dos líneas nacen juntas en el centro y se estiran hasta los bordes…
    tl.to(q('[data-line]'), { scaleX: 1, duration: 0.8 * T, ease: 'expo.inOut' })
      // …y se separan: una sube al nav, la otra baja a la franja.
      .to(q('[data-line]'), { y: 0, duration: 1 * T, ease: 'expo.inOut' }, `-=${0.05 * T}`)
      .to(q('[data-ruler]'), { scaleX: 1, duration: 0.9 * T, ease: 'expo.out' }, `-=${0.25 * T}`)
      // Se trazan las divisiones del nav, de arriba hacia abajo, y los botones se pintan.
      .to(q('[data-divider]'), { scaleY: 1, duration: 0.55 * T, ease: 'expo.out', stagger: 0.08 * T }, `-=${0.7 * T}`)
      .to(q('[data-in]'), { '--paint': 0, duration: 0.8 * T, ease: 'power2.inOut', stagger: 0.07 * T }, `-=${0.45 * T}`)
      .to(q('[data-mark]'), { autoAlpha: 1, scale: 1, duration: 0.5 * T, ease: 'back.out(2)', stagger: 0.05 * T }, `-=${0.5 * T}`)
    return () => tl.kill()
  }, [open, calm])

  // El logo se escribe de nuevo al pasar el mouse (una vez por pasada; con «reducir movimiento», nada).
  const writing = useRef(null)
  const writeLogo = () => {
    if (calm || writing.current?.isActive()) return
    const svg = logoRef.current?.querySelector('svg[data-part=row]')
    if (!svg) return
    const order = ['O1', 'R', 'D', 'O2', 'slab']
    const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' } })
    order.forEach((id, i) => {
      const fill = svg.querySelector(`[data-part=${id}] [data-fill]`)
      const strokes = [...svg.querySelectorAll(`[data-part=${id}] [data-stroke]`)]
      const trail = { p: 0 }
      const at = i * 0.075
      tl.set(fill, { opacity: 0 }, 0)
        .set(strokes, { opacity: 1 }, 0)
        .call(() => strokes.forEach((el) => el.setAttribute('stroke-dashoffset', '1')), null, 0)
        .to(trail, { p: 1, duration: 0.42, onUpdate: () => strokes.forEach((el) => el.setAttribute('stroke-dashoffset', String(1 - trail.p))) }, at)
        .to(fill, { opacity: 1, duration: 0.28, ease: 'power1.out' }, at + 0.3)
        .to(strokes, { opacity: 0, duration: 0.25 }, at + 0.42)
    })
    writing.current = tl
  }
  useEffect(() => () => writing.current?.kill(), [])

  const go = (id) => (e) => {
    e.preventDefault()
    setMenu(false)
    getLenis()?.start()
    // Desde la página de un proyecto, las secciones están en la portada.
    if (getRoute().name !== 'home') navigate({ name: 'home' }, { section: id })
    else scrollToSection(id)
  }

  // El menú del teléfono: mientras está abierto la página no se mueve; Escape lo cierra.
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)
  useEffect(() => {
    if (!menu) return undefined
    const lenis = getLenis()
    lenis?.stop()
    menuRef.current?.querySelector('a')?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setMenu(false)
      menuBtnRef.current?.focus()
    }
    const onWide = () => window.innerWidth >= 768 && setMenu(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onWide)
    return () => {
      lenis?.start()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onWide)
    }
  }, [menu])

  return (
    <div ref={rootRef} className="od-frame pointer-events-none fixed inset-0 z-40" style={{ color: C.ink }}>
      {/* El lomo del block: papel opaco detrás del nav y la regla. Al cambiar de lámina, la hoja que se
          va pasa por debajo. */}
      <span className="od-sheet od-frame__binding" aria-hidden="true" />
      {/* El nav. */}
      <header className="od-frame__nav absolute inset-x-0 top-0 flex items-stretch justify-between">
        <a
          ref={logoRef}
          href="#home"
          onClick={go('home')}
          onPointerEnter={(e) => e.pointerType !== 'touch' && writeLogo()}
          aria-label={`${SITE.name}, go to the top`}
          className="pointer-events-auto flex items-center px-4 sm:px-9"
          style={{ fontSize: 26, opacity: 0 }}
        >
          <Logo compact hairline />
        </a>
        <nav aria-label="Main" className="flex items-stretch">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={go(l.id)}
              className="od-cell pointer-events-auto relative hidden w-[var(--mod)] items-center px-4 text-[12px] tracking-[0.1em] uppercase md:flex"
              style={LABEL}
            >
              <span data-divider className="od-cell__divider" aria-hidden="true" />
              <span data-in className="od-paint">{l.label}</span>
            </a>
          ))}
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="od-menu"
            className="od-cell pointer-events-auto relative flex w-[var(--mod)] items-center px-4 text-[12px] tracking-[0.1em] uppercase md:hidden"
            style={LABEL}
          >
            <span data-divider className="od-cell__divider" aria-hidden="true" />
            <span data-in className="od-paint">{menu ? 'Close' : 'Menu'}</span>
            <span data-in className={`od-paint od-menu__burger${menu ? ' is-open' : ''}`} aria-hidden="true" />
          </button>
          <a
            href="#contact"
            onClick={go('contact')}
            className="od-cell pointer-events-auto relative hidden w-[var(--mod)] items-center px-4 text-[12px] tracking-[0.1em] uppercase sm:flex"
            style={{ ...LABEL, color: C.rust }}
            data-cursor="Get in touch"
          >
            <span data-divider className="od-cell__divider" aria-hidden="true" />
            <span data-in className="od-paint">Contact</span>
            <span data-in className="od-paint absolute right-3 bottom-2 text-[14px]" aria-hidden="true">
              →
            </span>
          </a>
        </nav>
      </header>

      {/* El menú del teléfono: una hoja que baja desde el nav. */}
      <nav
        id="od-menu"
        ref={menuRef}
        aria-label="Menu"
        className={`od-menu od-sheet${menu ? ' is-open pointer-events-auto' : ''}`}
        aria-hidden={!menu}
        inert={!menu}
      >
        <ul className="od-menu__list">
          {MENU.map((l, i) => (
            <li key={l.id} style={{ '--i': i }}>
              <a href={`#${l.id}`} onClick={go(l.id)} className="od-menu__link" style={l.accent ? { color: C.rust } : undefined}>
                <span className="od-menu__n" style={LABEL}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="od-menu__foot" style={LABEL}>
          <span>{SITE.places.join(' · ')}</span>
          <a href={SITE.instagram.href} target="_blank" rel="noreferrer" className="od-menu__ig">
            {SITE.instagram.handle}
          </a>
        </div>
      </nav>

      {/* La línea del marco y la regla bajo el nav (la de abajo es de la hoja del hero: se va con ella). */}
      <span data-line="top" className="od-frame__line od-frame__line--top" aria-hidden="true" />
      <span data-ruler className="od-frame__ruler" aria-hidden="true" />

      {/* Cruces de registro en las esquinas de arriba (las de abajo, también de la hoja). */}
      {['tl', 'tr'].map((k) => (
        <span key={k} data-mark className={`od-frame__mark od-frame__mark--${k}`} aria-hidden="true" />
      ))}

    </div>
  )
}

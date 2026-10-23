import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { scrollToSection } from '../../hooks/useLenis'
import { hidePaint } from './paint'
import { C, LABEL, OPEN_DELAY, SITE } from './brand'
import Logo from './Logo'

/**
 * El marco del sitio, dibujado con líneas como un plano: el nav arriba y, abajo, el borde del bloque
 * de texto del hero (su alto es --band-h, en elstudio.css).
 *
 * La apertura (después de que el boceto se pinta): dos líneas finas nacen en el centro de la
 * pantalla y se estiran hasta los bordes; una sube y queda como el borde del nav, la otra baja y
 * queda como el borde del bloque de abajo. Después se trazan las divisiones del nav (de arriba
 * hacia abajo), los botones se pintan (paint.js) y entran la regla y las cruces de registro.
 *
 * El logo chico (`logoRef`) arranca invisible: el loader aterriza ahí y lo enciende (vía el hero).
 * Al pasar el mouse, el logo se vuelve a escribir: de la «e» a la «O», cada letra trazada en óxido y
 * después rellena, y al final cae la tapa de la T.
 */

const LINKS = [
  { id: 'estudio', label: 'Estudio' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'servicios', label: 'Servicios' },
]


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
    tl.to(q('[data-line]'), { scaleX: 1, duration: 0.8, ease: 'expo.inOut' })
      // …y se separan: una sube al nav, la otra baja a la franja.
      .to(q('[data-line]'), { y: 0, duration: 1, ease: 'expo.inOut' }, '-=0.05')
      .to(q('[data-ruler]'), { scaleX: 1, duration: 0.9, ease: 'expo.out' }, '-=0.25')
      // Se trazan las divisiones del nav, de arriba hacia abajo, y los botones se pintan.
      .to(q('[data-divider]'), { scaleY: 1, duration: 0.55, ease: 'expo.out', stagger: 0.08 }, '-=0.7')
      .to(q('[data-in]'), { '--paint': 0, duration: 0.8, ease: 'power2.inOut', stagger: 0.07 }, '-=0.45')
      .to(q('[data-mark]'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.05 }, '-=0.5')
    return () => tl.kill()
  }, [open, calm])

  // El logo se escribe de nuevo al pasar el mouse (una vez por pasada; con «reducir movimiento», nada).
  const writing = useRef(null)
  const writeLogo = () => {
    if (calm || writing.current?.isActive()) return
    const svg = logoRef.current?.querySelector('svg[data-part=row]')
    if (!svg) return
    const order = ['e', 'l', 'S', 'T', 'U', 'D', 'I', 'O', 'slab']
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
    scrollToSection(id)
  }

  return (
    <div ref={rootRef} className="es-frame pointer-events-none fixed inset-0 z-40" style={{ color: C.ink }}>
      {/* El nav. */}
      <header className="es-frame__nav absolute inset-x-0 top-0 flex items-stretch justify-between">
        <a
          ref={logoRef}
          href="#inicio"
          onClick={go('inicio')}
          onPointerEnter={(e) => e.pointerType !== 'touch' && writeLogo()}
          aria-label={`${SITE.name}, ir al inicio`}
          className="pointer-events-auto flex items-center px-4 sm:px-9"
          style={{ fontSize: 26, opacity: 0 }}
        >
          <Logo compact hairline />
        </a>
        <nav aria-label="Principal" className="flex items-stretch">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={go(l.id)}
              className="es-cell pointer-events-auto relative hidden w-40 items-start px-4 pt-3 text-[12px] tracking-[0.1em] uppercase md:flex lg:w-48"
              style={LABEL}
            >
              <span data-divider className="es-cell__divider" aria-hidden="true" />
              <span data-in className="es-paint">{l.label}</span>
              <span data-in className="es-paint es-cell__corner" aria-hidden="true" />
            </a>
          ))}
          <a
            href="#contacto"
            onClick={go('contacto')}
            className="es-cell pointer-events-auto relative flex w-36 items-start px-4 pt-3 text-[12px] tracking-[0.1em] uppercase sm:w-44 lg:w-48"
            style={{ ...LABEL, color: C.rust }}
            data-cursor="Escribinos"
          >
            <span data-divider className="es-cell__divider" aria-hidden="true" />
            <span data-in className="es-paint">Contacto</span>
            <span data-in className="es-paint absolute right-3 bottom-2 text-[14px]" aria-hidden="true">
              →
            </span>
          </a>
        </nav>
      </header>

      {/* Las dos líneas del marco y la regla bajo el nav. */}
      <span data-line="top" className="es-frame__line es-frame__line--top" aria-hidden="true" />
      <span data-ruler className="es-frame__ruler" aria-hidden="true" />
      <span data-line="bottom" className="es-frame__line es-frame__line--bottom" aria-hidden="true" />

      {/* Cruces de registro en las cuatro esquinas del cuadro. */}
      {['tl', 'tr', 'bl', 'br'].map((k) => (
        <span key={k} data-mark className={`es-frame__mark es-frame__mark--${k}`} aria-hidden="true" />
      ))}

    </div>
  )
}

import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, SITE } from './brand'
import Logo from './Logo'
import { LOGO_VIEWBOX as VB } from './logoPaths'

/**
 * elStudio — el loader.
 *
 * Una hoja clara donde una mira de plano (cruz fina, un cuadradito en el centro y las coordenadas
 * `X 7.814 Y 2.983`) dibuja el logo a mano: primero recorre el contorno de la S de STUDIO, despacio,
 * y a su paso la letra se rellena; después hace lo mismo, con el mismo gesto, con T U D I O, «el» y
 * la tapa óxido de la T. Al terminar se escribe «Diseño e Interiorismo», la hoja se levanta como
 * una cortina y el logo viaja hasta su lugar en el encabezado (`bridge.current.target()`).
 * Abajo, una línea de tinta que sigue al dibujo. Con «reducir movimiento»: un fundido corto.
 * Sin sonido.
 */

// Qué se dibuja y en qué orden. La S va primero y sola; el resto de STUDIO la sigue, después «el»
// y por último la tapa de mesa.
const ORDER = ['S', 'T', 'U', 'D', 'I', 'O', 'e', 'l', 'slab']
const S_SECONDS = 1.6 // lo que tarda la mira en recorrer la S (la firma: despacio)
const REST_SPEED = 9 // el resto va más rápido, con el mismo gesto (× la velocidad de la S)
const HOP = 0.09 // lo que tarda la mira en pasar de una letra a la siguiente

export default function Loader({ ready, calm, bridge, onDone }) {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const logoRef = useRef(null)
  const footRef = useRef(null)
  const lineRef = useRef(null)
  const penRef = useRef(null)
  const coordsRef = useRef(null)
  const doneRef = useRef(false)
  const [drawn, setDrawn] = useState(calm)

  // El dibujo (una vez, al montar).
  useLayoutEffect(() => {
    const logo = logoRef.current
    const q = gsap.utils.selector(logo)
    if (calm) {
      gsap.set(logo, { autoAlpha: 0 })
      gsap.to(logo, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
      return undefined
    }
    const pen = penRef.current
    const coords = coordsRef.current
    const svg = logo.querySelector('svg[data-part=row]')
    const ctx = gsap.context(() => {
      const piece = (id) => {
        const strokes = q(`[data-part=${id}] [data-stroke]`)
        // La mira sigue el contorno más largo (el de afuera); los de adentro se dibujan a la par.
        const outer = strokes.reduce((a, b) => (b.getTotalLength() > a.getTotalLength() ? b : a))
        return { id, fill: q(`[data-part=${id}] [data-fill]`), strokes, outer, length: outer.getTotalLength() }
      }
      const pieces = ORDER.map(piece)
      gsap.set(pieces.flatMap((p) => p.fill), { opacity: 0 })
      // El desplazamiento de la raya se escribe como atributo (GSAP le agregaría «px» y con pathLength no rinde igual).
      const setTrail = (p, amount) => p.strokes.forEach((el) => el.setAttribute('stroke-dashoffset', String(1 - amount)))
      pieces.forEach((p) => setTrail(p, 0))
      gsap.set(pieces.flatMap((p) => p.strokes), { opacity: 1 })
      gsap.set(q('[data-part=sub]'), { autoAlpha: 0, letterSpacing: '0.7em' })
      gsap.set(footRef.current, { autoAlpha: 0, y: 10 })
      gsap.set(pen, { autoAlpha: 0 })

      // De un punto del dibujo (unidades del logo) a la pantalla.
      const toScreen = (x, y) => {
        const r = svg.getBoundingClientRect()
        return { x: r.left + ((x - VB.x) * r.width) / VB.w, y: r.top + ((y - VB.y) * r.height) / VB.h }
      }
      const place = (p, at) => {
        const point = p.outer.getPointAtLength(at * p.length)
        const s = toScreen(point.x, point.y)
        gsap.set(pen, { x: s.x, y: s.y })
        coords.textContent = `X ${(point.x / 100).toFixed(3)}   Y ${(-point.y / 100).toFixed(3)}`
      }

      const speed = pieces[0].length / S_SECONDS // unidades por segundo
      const tl = gsap.timeline({
        delay: 0.35,
        onUpdate: () => gsap.set(lineRef.current, { scaleX: tl.progress() }),
        onComplete: () => setDrawn(true),
      })
      tl.to(footRef.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0)
        .to(pen, { autoAlpha: 1, duration: 0.4 }, 0.2)

      let t = 0.35
      const trail = { p: 0 }
      pieces.forEach((p, i) => {
        const dur = i === 0 ? S_SECONDS : Math.min(0.6, Math.max(0.26, p.length / (speed * REST_SPEED)))
        // La mira llega al punto de arranque de la letra…
        tl.call(() => place(p, 0), null, t)
        // …y recorre su contorno (el trazo se dibuja detrás de ella).
        tl.fromTo(
          trail,
          { p: 0 },
          {
            p: 1,
            duration: dur,
            ease: 'power1.inOut',
            onUpdate: () => {
              setTrail(p, trail.p)
              place(p, trail.p)
            },
          },
          t,
        )
          // La letra se rellena a su paso y el trazo se apaga.
          .to(p.fill, { opacity: 1, duration: 0.55, ease: 'power1.out' }, t + dur * 0.72)
          .to(p.strokes, { opacity: 0, duration: 0.4, ease: 'power1.out' }, t + dur * 0.9)
        t += dur + HOP
      })
      tl.to(pen, { autoAlpha: 0, duration: 0.35 }, t - HOP + 0.1)
        .to(q('[data-part=sub]'), { autoAlpha: 1, letterSpacing: '0.34em', duration: 0.9, ease: 'expo.out' }, t - HOP)
        .to({}, { duration: 0.35 }) // un respiro antes de salir
    }, logo)
    return () => ctx.revert()
  }, [calm])

  // La salida: cuando el dibujo terminó y las fuentes están, la hoja sube y el logo viaja al encabezado.
  useEffect(() => {
    if (!ready || !drawn || doneRef.current) return undefined
    doneRef.current = true
    const root = rootRef.current
    const sheet = sheetRef.current
    const logo = logoRef.current
    const finish = () => {
      bridge?.current.show?.()
      gsap.set(root, { display: 'none' })
      onDone()
    }
    if (calm) {
      bridge?.current.show?.()
      const tween = gsap.to(root, { autoAlpha: 0, duration: 0.45, ease: 'power2.out', onComplete: finish })
      return () => tween.kill()
    }
    const ctx = gsap.context(() => {
      const row = logo.querySelector('svg[data-part=row]')
      const target = bridge?.current.target?.()
      const tl = gsap.timeline({ onComplete: finish })
      tl.to(footRef.current, { autoAlpha: 0, y: -8, duration: 0.35, ease: 'power2.out' }, 0)
        .to(logo.querySelector('[data-part=sub]'), { autoAlpha: 0, duration: 0.3, ease: 'power2.out' }, 0)
        .to(sheet, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'expo.inOut' }, 0.25)
      if (target && row) {
        const a = row.getBoundingClientRect()
        const b = target.getBoundingClientRect()
        tl.to(
          logo,
          {
            x: b.left - a.left,
            y: b.top - a.top,
            scale: b.width / a.width,
            transformOrigin: '0 0',
            duration: 1.15,
            ease: 'expo.inOut',
          },
          0.25,
        )
      } else {
        tl.to(logo, { autoAlpha: 0, duration: 0.5 }, 0.4)
      }
    }, root)
    return () => ctx.revert()
  }, [ready, drawn, calm, bridge, onDone])

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="status" aria-live="polite" aria-label="Cargando elStudio">
      <div ref={sheetRef} className="es-sheet absolute inset-0" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
        <div
          ref={footRef}
          className="absolute inset-x-0 bottom-0 px-5 pb-6 text-[11px] font-medium tracking-[0.16em] uppercase sm:px-9 sm:pb-8"
          style={{ ...DISPLAY, color: C.mute }}
        >
          <span className="block max-w-[70%] leading-relaxed">{SITE.places.join(' · ')}</span>
        </div>
        <div className="absolute inset-x-5 bottom-0 h-px sm:inset-x-9" style={{ background: C.hair }}>
          <div ref={lineRef} className="h-full origin-left" style={{ background: C.ink, transform: 'scaleX(0)' }} />
        </div>
      </div>
      {/* El logo va aparte de la hoja: cuando la hoja sube, él sigue a la vista y viaja. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div ref={logoRef} style={{ fontSize: 'clamp(64px, 12.5vw, 168px)', willChange: 'transform' }}>
          <Logo />
        </div>
      </div>
      {/* La mira que dibuja: dos ejes finos, un cuadradito en el centro y las coordenadas. */}
      <div ref={penRef} className="es-pen pointer-events-none absolute top-0 left-0" aria-hidden="true">
        <span className="es-pen__h" />
        <span className="es-pen__v" />
        <span className="es-pen__box" />
        <span ref={coordsRef} className="es-pen__coords" />
      </div>
    </div>
  )
}

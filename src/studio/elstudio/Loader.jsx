import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, SITE } from './brand'
import Logo from './Logo'

/**
 * elStudio — el loader.
 *
 * Una hoja clara con el logo en el centro que se dibuja a sí mismo: primero se traza la S de
 * STUDIO (el contorno y después el relleno), luego el resto de las letras con el mismo gesto, «el»,
 * la tapa óxido de la T y por último se escribe «Diseño e Interiorismo».
 * Abajo, un contador de 000 a 100 y una línea de tinta que se llena. Al llegar,
 * la hoja se levanta como una cortina y el logo viaja hasta su lugar en el
 * encabezado (`bridge.current.target()`), donde se enciende el de verdad.
 * Con «reducir movimiento»: un fundido corto. Sin sonido.
 */

// Orden y tiempos del dibujo: [pieza, segundo en que empieza, cuánto tarda el trazo].
// La S va sola; el resto de STUDIO la sigue de a una, después «el» y por último la tapa de mesa.
const DRAW_ORDER = [
  ['S', 0, 1.7],
  ['T', 1.85, 1.15],
  ['U', 2.01, 1.15],
  ['D', 2.17, 1.15],
  ['I', 2.33, 1.15],
  ['O', 2.49, 1.15],
  ['e', 2.8, 1],
  ['l', 2.96, 1],
  ['slab', 3.2, 0.8],
]

export default function Loader({ progress, ready, calm, bridge, onDone }) {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const logoRef = useRef(null)
  const footRef = useRef(null)
  const lineRef = useRef(null)
  const countRef = useRef(null)
  const doneRef = useRef(false)
  const pct = Math.round(progress * 100)

  // La armada del logo (una vez, al montar): cada pieza se dibuja con un contorno fino y después
  // se rellena. Primero la S de STUDIO, sola; después el resto de la palabra, «el» y, al final, la
  // tapa de mesa. Todas con el mismo gesto.
  useLayoutEffect(() => {
    const logo = logoRef.current
    const q = gsap.utils.selector(logo)
    if (calm) {
      gsap.set(logo, { autoAlpha: 0 })
      gsap.to(logo, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
      return undefined
    }
    const ctx = gsap.context(() => {
      const part = (id) => ({
        fill: q(`[data-part=${id}] [data-fill]`),
        strokes: q(`[data-part=${id}] [data-stroke]`),
      })
      const ids = [...DRAW_ORDER.map(([id]) => id)]
      ids.forEach((id) => gsap.set(part(id).fill, { opacity: 0 }))
      gsap.set(q('[data-part=sub]'), { autoAlpha: 0, letterSpacing: '0.7em' })
      gsap.set(footRef.current, { autoAlpha: 0, y: 10 })
      const tl = gsap.timeline({ delay: 0.25 })
      DRAW_ORDER.forEach(([id, at, dur]) => {
        const { fill, strokes } = part(id)
        // El contorno se traza, el relleno entra cuando va por la mitad y el trazo se apaga.
        tl.to(strokes, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut' }, at)
          .to(fill, { opacity: 1, duration: 0.6, ease: 'power1.out' }, at + dur * 0.78)
          .to(strokes, { opacity: 0, duration: 0.45, ease: 'power1.out' }, at + dur * 0.9)
      })
      tl.to(q('[data-part=sub]'), { autoAlpha: 1, letterSpacing: '0.34em', duration: 1.2, ease: 'expo.out' }, 3.6)
        .to(footRef.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.5)
    }, logo)
    return () => ctx.revert()
  }, [calm])

  // La línea de tinta sigue al progreso.
  useEffect(() => {
    gsap.to(lineRef.current, { scaleX: progress, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
  }, [progress])

  // La salida: la hoja sube, el logo viaja al encabezado.
  useEffect(() => {
    if (!ready || doneRef.current) return undefined
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
      const tl = gsap.timeline({ delay: 0.4, onComplete: finish })
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
  }, [ready, calm, bridge, onDone])

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="status" aria-live="polite" aria-label="Cargando elStudio">
      <div ref={sheetRef} className="es-sheet absolute inset-0" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
        <div
          ref={footRef}
          className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-6 text-[11px] font-medium tracking-[0.16em] uppercase sm:px-9 sm:pb-8"
          style={{ ...DISPLAY, color: C.mute }}
        >
          <span className="max-w-[55%] leading-relaxed">{SITE.places.join(' · ')}</span>
          <span ref={countRef} className="tabular-nums" style={{ color: C.ink, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, letterSpacing: '-0.02em' }}>
            {String(pct).padStart(3, '0')}
          </span>
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
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, SITE } from './brand'
import Logo from './Logo'

/**
 * elStudio — el loader.
 *
 * Una hoja clara con el logo en el centro que se arma pieza por pieza: las
 * letras de STUDIO suben desde una línea, «el» entra de costado, la tapa óxido
 * cae sobre la T y se apoya, y por último se escribe «Diseño e Interiorismo».
 * Abajo, un contador de 000 a 100 y una línea de tinta que se llena. Al llegar,
 * la hoja se levanta como una cortina y el logo viaja hasta su lugar en el
 * encabezado (`bridge.current.target()`), donde se enciende el de verdad.
 * Con «reducir movimiento»: un fundido corto. Sin sonido.
 */

export default function Loader({ progress, ready, calm, bridge, onDone }) {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const logoRef = useRef(null)
  const footRef = useRef(null)
  const lineRef = useRef(null)
  const countRef = useRef(null)
  const doneRef = useRef(false)
  const pct = Math.round(progress * 100)

  // La armada del logo (una vez, al montar).
  useLayoutEffect(() => {
    const logo = logoRef.current
    const q = gsap.utils.selector(logo)
    if (calm) {
      gsap.set(logo, { autoAlpha: 0 })
      gsap.to(logo, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
      return undefined
    }
    const ctx = gsap.context(() => {
      gsap.set(q('[data-part=ch]'), { yPercent: 112 })
      gsap.set(q('[data-part=el]'), { autoAlpha: 0, x: -18 })
      gsap.set(q('[data-part=slab]'), { autoAlpha: 0, y: -90, rotate: -6, transformOrigin: '20% 100%' })
      gsap.set(q('[data-part=sub]'), { autoAlpha: 0, letterSpacing: '0.7em' })
      gsap.set(footRef.current, { autoAlpha: 0, y: 10 })
      const tl = gsap.timeline({ delay: 0.25, defaults: { ease: 'expo.out' } })
      tl.to(q('[data-part=ch]'), { yPercent: 0, duration: 1.1, stagger: 0.07 }, 0)
        .to(q('[data-part=el]'), { autoAlpha: 1, x: 0, duration: 1 }, 0.45)
        // La tapa cae y se apoya: un golpe corto, sin rebote de dibujito.
        .to(q('[data-part=slab]'), { autoAlpha: 1, y: 0, rotate: 0, duration: 0.8, ease: 'power4.out' }, 0.95)
        .to(q('[data-part=sub]'), { autoAlpha: 1, letterSpacing: '0.34em', duration: 1.2 }, 1.35)
        .to(footRef.current, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.9)
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
      const row = logo.querySelector('[data-part=row]')
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

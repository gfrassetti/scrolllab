import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, SITE } from './brand'
import Logo from './Logo'
import { LOGO_VIEWBOX as VB } from './logoPaths'

/**
 * elStudio — el loader.
 *
 * Una hoja clara donde una mira de plano (cruz fina, un cuadradito en el centro y las coordenadas
 * `X 7.814 Y 2.983`) dibuja a mano la S de STUDIO: recorre su contorno, despacio, y a su paso la
 * letra se rellena. Después el resto del logo entra como siempre: T U D I O suben desde una línea,
 * «el» entra de costado y la tapa óxido cae sobre la T. Por último se escribe «Diseño e
 * Interiorismo», la hoja se levanta como una cortina y el logo viaja hasta su lugar en el
 * encabezado (`bridge.current.target()`).
 * Abajo, una línea de tinta que sigue al dibujo. Con «reducir movimiento»: un fundido corto.
 * Sin sonido.
 */

// La mira dibuja solo la S de STUDIO, despacio (la firma). El resto del logo entra después con
// el gesto de siempre: letras que suben desde una línea, «el» de costado, la tapa que cae.
const S_SECONDS = 2.4 // lo que tarda la mira en recorrer la S
const RISE = ['T', 'U', 'D', 'I', 'O']

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
      const strokes = q('[data-part=S] [data-stroke]')
      const fill = q('[data-part=S] [data-fill]')
      // La mira sigue el contorno de la S (es uno solo).
      const outer = strokes[0]
      const length = outer.getTotalLength()
      // El desplazamiento de la raya se escribe como atributo (GSAP le agregaría «px» y con pathLength no rinde igual).
      const setTrail = (amount) => strokes.forEach((el) => el.setAttribute('stroke-dashoffset', String(1 - amount)))
      setTrail(0)
      gsap.set(fill, { opacity: 0 })
      gsap.set(strokes, { opacity: 1 })
      // El resto del logo, escondido hasta que termine la S (las unidades son las del dibujo: 1000 = 1 em).
      gsap.set(RISE.map((id) => q(`[data-part=${id}]`)[0]), { y: 820 })
      gsap.set(q('[data-part=e]'), { autoAlpha: 0, x: -90 })
      gsap.set(q('[data-part=l]'), { autoAlpha: 0, x: -90 })
      gsap.set(q('[data-part=slab]'), { autoAlpha: 0, y: -520, rotation: -6, transformOrigin: '20% 100%' })
      gsap.set(q('[data-part=sub]'), { autoAlpha: 0, letterSpacing: '0.7em' })
      gsap.set(footRef.current, { autoAlpha: 0, y: 10 })
      gsap.set(pen, { autoAlpha: 0 })

      // Un punto de la S (unidades del logo) → pantalla.
      const place = (at) => {
        const point = outer.getPointAtLength(at * length)
        const r = svg.getBoundingClientRect()
        gsap.set(pen, { x: r.left + ((point.x - VB.x) * r.width) / VB.w, y: r.top + ((point.y - VB.y) * r.height) / VB.h })
        coords.textContent = `X ${(point.x / 100).toFixed(3)}   Y ${(-point.y / 100).toFixed(3)}`
      }

      const start = 0.35
      const end = start + S_SECONDS // la S termina y entra el resto
      const trail = { p: 0 }
      const tl = gsap.timeline({
        onUpdate: () => gsap.set(lineRef.current, { scaleX: tl.progress() }),
        onComplete: () => setDrawn(true),
      })
      tl.to(footRef.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.1)
        .call(() => place(0), null, start - 0.05)
        .to(pen, { autoAlpha: 1, duration: 0.4 }, start - 0.05)
        // La mira recorre el contorno de la S y el trazo se dibuja detrás de ella…
        .fromTo(
          trail,
          { p: 0 },
          {
            p: 1,
            duration: S_SECONDS,
            ease: 'power1.inOut',
            onUpdate: () => {
              setTrail(trail.p)
              place(trail.p)
            },
          },
          start,
        )
        // …la letra se rellena a su paso y el trazo se apaga.
        .to(fill, { opacity: 1, duration: 0.7, ease: 'power1.out' }, start + S_SECONDS * 0.7)
        .to(strokes, { opacity: 0, duration: 0.5, ease: 'power1.out' }, start + S_SECONDS * 0.88)
        .to(pen, { autoAlpha: 0, duration: 0.4 }, end)
        // El resto, como siempre.
        .to(RISE.map((id) => q(`[data-part=${id}]`)[0]), { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, end)
        .to(q('[data-part=e]'), { autoAlpha: 1, x: 0, duration: 1, ease: 'expo.out' }, end + 0.45)
        .to(q('[data-part=l]'), { autoAlpha: 1, x: 0, duration: 1, ease: 'expo.out' }, end + 0.5)
        .to(q('[data-part=slab]'), { autoAlpha: 1, y: 0, rotation: 0, duration: 0.8, ease: 'power4.out' }, end + 0.95)
        .to(q('[data-part=sub]'), { autoAlpha: 1, letterSpacing: '0.34em', duration: 1.2, ease: 'expo.out' }, end + 1.35)
        .to({}, { duration: 0.4 }) // un respiro antes de salir
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
        .to(sheet, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.95, ease: 'expo.inOut' }, 0.15)
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
            duration: 0.95,
            ease: 'expo.inOut',
          },
          0.15,
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

import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, MONO } from './brand'

/**
 * cāpsula33 — secuencia de abordaje (el loader).
 *
 * Cuenta lo que de verdad se está bajando (el modelo y su luz horneada) y lo
 * cuenta como una nave que se prepara. Al terminar ofrece «Abordar»: ese clic
 * abre las compuertas y es, además, el gesto que el navegador pide para dejar
 * sonar audio, así que el sonido del sitio va a arrancar desde acá.
 */

const CHECKS = [
  ['Sistema C33', 'en línea'],
  ['Presión de cabina', 'estable'],
  ['Cafetera', '93 °C'],
  ['Neón del pasillo', 'encendido'],
  ['Tripulación', 'a bordo'],
]

export default function Loader({ progress, ready, calm, onBoard }) {
  const rootRef = useRef(null)
  const contentRef = useRef(null)
  const doorsRef = useRef([])
  const seamRef = useRef(null)
  const buttonRef = useRef(null)
  const pct = Math.round(progress * 100)

  useEffect(() => {
    if (ready) buttonRef.current?.focus({ preventScroll: true })
  }, [ready])

  const board = () => {
    const root = rootRef.current
    if (!root) return
    if (calm) {
      gsap.to(root, { autoAlpha: 0, duration: 0.4, ease: 'power2.out', onComplete: onBoard })
      return
    }
    const [left, right] = doorsRef.current
    const tl = gsap.timeline()
    tl.to(contentRef.current, { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power2.out' })
    tl.fromTo(seamRef.current, { scaleY: 0, autoAlpha: 1 }, { scaleY: 1, duration: 0.45, ease: 'expo.out' }, '<0.1')
    tl.call(onBoard, null, '+=0.05')
    tl.to(seamRef.current, { autoAlpha: 0, duration: 0.3 }, '+=0.05')
    tl.to(left, { xPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '<')
    tl.to(right, { xPercent: 100, duration: 1.15, ease: 'expo.inOut' }, '<')
    tl.set(root, { display: 'none' })
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Secuencia de abordaje">
      {/* Las compuertas: dos hojas que se abren desde el centro. */}
      {[0, 1].map((i) => (
        <div
          key={i}
          ref={(el) => (doorsRef.current[i] = el)}
          aria-hidden="true"
          className={`absolute inset-y-0 w-1/2 ${i ? 'right-0' : 'left-0'}`}
          style={{ background: C.void, borderInline: i ? `1px solid #1c1c1f` : 'none' }}
        >
          <span
            className={`absolute top-1/2 h-[46svh] w-[clamp(4rem,9vw,7rem)] -translate-y-1/2 rounded-full border ${i ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'}`}
            style={{ borderColor: '#232327' }}
          />
        </div>
      ))}
      <span
        ref={seamRef}
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px origin-center opacity-0"
        style={{ background: C.neon, boxShadow: `0 0 24px 4px ${C.neon}` }}
      />

      <div ref={contentRef} className="relative flex h-full flex-col justify-between px-6 py-6 md:px-10 md:py-8" style={{ color: C.cream }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 md:inset-6">
          {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
            <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: C.orange }} />
          ))}
        </div>

        <header className="flex items-start justify-between text-[11px] tracking-[0.18em] uppercase" style={DISPLAY}>
          <span>C33 · Secuencia de abordaje</span>
          <span className="opacity-55">40°09′S 71°21′O</span>
        </header>

        <div className="mx-auto w-full max-w-[26rem]">
          <p className="text-[clamp(3rem,9vw,5rem)] leading-none font-light" style={MONO}>
            cāpsula<span style={{ color: C.orange }}>33</span>
          </p>
          <ul className="mt-10 grid gap-2 text-[12px] tracking-[0.14em] uppercase" style={MONO} aria-live="polite">
            {CHECKS.map(([label, value], i) => {
              const done = progress >= (i + 1) / CHECKS.length || ready
              return (
                <li
                  key={label}
                  className="flex items-baseline gap-3 transition-opacity duration-500"
                  style={{ opacity: progress >= i / CHECKS.length || ready ? 1 : 0.25 }}
                >
                  <span className="opacity-70">{label}</span>
                  <span aria-hidden="true" className="flex-1 translate-y-[-3px] border-b border-dotted opacity-30" />
                  <span style={{ color: done ? C.neon : 'inherit' }}>{done ? value : '···'}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-8 flex items-center gap-4">
            <span className="relative h-px flex-1 overflow-hidden" style={{ background: '#2a2a2e' }}>
              <span
                className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%`, background: C.orange }}
              />
            </span>
            <span className="w-[4ch] text-right text-[12px] tabular-nums" style={MONO}>
              {String(pct).padStart(3, '0')}
            </span>
          </div>
          <div className="mt-10 h-14">
            <button
              ref={buttonRef}
              type="button"
              onClick={board}
              disabled={!ready}
              className="c33-board group relative h-14 w-full overflow-hidden rounded-full border text-[13px] font-semibold tracking-[0.24em] uppercase transition-[opacity,transform] duration-500 active:scale-[0.98] disabled:pointer-events-none"
              style={{ ...DISPLAY, borderColor: C.orange, color: C.cream, opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(8px)' }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
                style={{ background: C.orange }}
              />
              <span className="relative transition-colors duration-300 group-hover:text-[#070708] group-focus-visible:text-[#070708]">
                Abordar
              </span>
            </button>
          </div>
        </div>

        <footer className="flex items-end justify-between text-[11px] tracking-[0.18em] uppercase opacity-55" style={DISPLAY}>
          <span>Café, cine y algo más</span>
          <span>San Martín de los Andes</span>
        </footer>
      </div>
    </div>
  )
}

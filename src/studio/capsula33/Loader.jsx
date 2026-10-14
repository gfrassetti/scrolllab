import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, MONO } from './brand'

/**
 * cāpsula33 — secuencia de abordaje (el loader).
 *
 * Naranja de la marca de punta a punta, sin estrellas. La carga es la
 * temperatura de la cafetera: un termómetro que sube de 20 °C a los 93 °C del
 * grupo (la temperatura a la que sale el espresso), con la marca gigante abajo
 * que se va llenando a la par. Al llegar a 93 °C se habilita «Abordar», y la
 * cortina naranja se levanta para dejar ver el pasillo. Sin sonido.
 */

const INK = '#0b0c0f'
const T_MIN = 20
const T_MAX = 95 // el fondo de escala del termómetro
const T_READY = 93 // la temperatura del grupo

const CHECKS = [
  ['Sistema C33', 'en línea'],
  ['Presión de cabina', 'estable'],
  ['Cafetera', `${T_READY} °C`],
  ['Neón del pasillo', 'encendido'],
  ['Tripulación', 'a bordo'],
]

const TICKS = Array.from({ length: (T_MAX - T_MIN) / 5 + 1 }, (_, i) => T_MIN + i * 5)

export default function Loader({ progress, ready, calm, onBoard }) {
  const rootRef = useRef(null)
  const contentRef = useRef(null)
  const buttonRef = useRef(null)
  const pct = Math.round(progress * 100)
  const temp = Math.round(T_MIN + progress * (T_READY - T_MIN))
  // Cuánto del tubo llena el mercurio (en el fondo de escala del termómetro).
  const fill = ((T_MIN + progress * (T_READY - T_MIN) - T_MIN) / (T_MAX - T_MIN)) * 100

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
    // La cortina naranja sube y deja ver el pasillo (que ya está debajo).
    const tl = gsap.timeline()
    tl.to(contentRef.current, { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' })
    tl.call(onBoard, null, 0.35)
    tl.to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, 0.35)
    tl.set(root, { display: 'none' })
  }

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Secuencia de abordaje"
      style={{ background: C.orange, color: INK, clipPath: 'inset(0% 0% 0% 0%)' }}
    >
      <div ref={contentRef} className="relative flex h-full flex-col justify-between px-6 py-6 md:px-10 md:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 md:inset-6">
          {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
            <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: INK }} />
          ))}
        </div>

        <header className="flex items-start justify-between gap-4 text-[11px] font-semibold tracking-[0.18em] uppercase" style={DISPLAY}>
          <span>C33 · Secuencia de abordaje</span>
          <span className="hidden opacity-60 sm:inline">40°09′S 71°21′O</span>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-7">
          {/* La temperatura, en grande, y el botón cuando llega. */}
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70" style={MONO}>
                Cafetera · temperatura del grupo
              </p>
              <p className="mt-2 leading-[0.85] font-semibold tabular-nums" style={{ ...DISPLAY, fontSize: 'clamp(4.2rem, 11vw, 9.5rem)', letterSpacing: '-0.02em' }}>
                {temp}
                <span style={{ fontSize: '0.5em', marginLeft: '0.08em' }}>°C</span>
              </p>
            </div>
            <div className="h-14 w-full sm:w-[17rem]">
              <button
                ref={buttonRef}
                type="button"
                onClick={board}
                disabled={!ready}
                className="c33-board group relative h-14 w-full overflow-hidden rounded-full text-[13px] font-semibold tracking-[0.24em] uppercase transition-[opacity,transform] duration-500 active:scale-[0.98] disabled:pointer-events-none"
                style={{ ...DISPLAY, background: INK, color: C.cream, opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(8px)' }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                  style={{ background: C.cream }}
                />
                <span className="relative transition-colors duration-300 group-hover:text-[#0b0c0f]">Abordar</span>
              </button>
            </div>
          </div>

          {/* El termómetro: bulbo, tubo con mercurio y escala hasta el fondo. */}
          <div
            role="progressbar"
            aria-label="Temperatura de la cafetera"
            aria-valuemin={T_MIN}
            aria-valuemax={T_READY}
            aria-valuenow={temp}
            aria-valuetext={`${temp} grados`}
          >
            <div className="flex items-center">
              <span
                aria-hidden="true"
                className="relative z-10 grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full"
                style={{ background: INK, boxShadow: `0 0 0 3px ${C.orange}, 0 0 0 5px ${INK}` }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: C.orange, opacity: 0.55 }} />
              </span>
              <div className="relative -ml-4 flex-1">
                <div className="h-6 overflow-hidden rounded-r-full border-[3px]" style={{ borderColor: INK, background: 'rgba(11,12,15,0.1)' }}>
                  <div className="h-full" style={{ width: `${fill}%`, background: INK }} />
                </div>
                {/* Escala. */}
                <div className="relative mt-2 h-8" aria-hidden="true">
                  {TICKS.map((t) => {
                    const major = t % 20 === 0
                    return (
                      <span key={t} className="absolute top-0" style={{ left: `${((t - T_MIN) / (T_MAX - T_MIN)) * 100}%` }}>
                        <span className="block w-px" style={{ height: major ? 12 : 7, background: INK, opacity: major ? 0.9 : 0.5 }} />
                        {major ? (
                          <span className="absolute top-[15px] -translate-x-1/2 text-[10px] font-semibold tabular-nums" style={MONO}>
                            {t}°
                          </span>
                        ) : null}
                      </span>
                    )
                  })}
                  {/* El tope: los 93 °C. */}
                  <span className="absolute top-0" style={{ left: `${((T_READY - T_MIN) / (T_MAX - T_MIN)) * 100}%` }}>
                    <span className="block h-[14px] w-[3px] -translate-x-1/2" style={{ background: C.cream }} />
                    <span className="absolute top-[15px] -translate-x-1/2 rounded-sm px-1 text-[10px] font-bold tabular-nums" style={{ ...MONO, background: C.cream, color: INK }}>
                      {T_READY}°
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-7 gap-y-2 text-[11px] font-semibold tracking-[0.14em] uppercase" style={MONO} aria-live="polite">
            {CHECKS.map(([label, value], i) => {
              const done = progress >= (i + 1) / CHECKS.length || ready
              return (
                <li key={label} className="flex items-baseline gap-2 transition-opacity duration-500" style={{ opacity: done ? 1 : 0.4 }}>
                  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: done ? INK : 'transparent', boxShadow: `inset 0 0 0 1.5px ${INK}` }} />
                  <span>{label}</span>
                  <span style={{ color: done ? C.cream : 'inherit' }}>{done ? value : '···'}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* La marca, a todo el ancho: se llena de tinta con la carga. */}
        <footer>
          <div className="mb-3 flex items-end justify-between gap-4 text-[11px] font-semibold tracking-[0.18em] uppercase" style={DISPLAY}>
            <span className="opacity-70">Café de especialidad · San Martín de los Andes</span>
            <span className="text-[12px] tabular-nums" style={MONO}>
              {pct}%
            </span>
          </div>
          {/* Pantalla angosta: en dos renglones, bien grande. */}
          <p className="sm:hidden leading-[0.84] font-light select-none" style={{ ...MONO, fontSize: 'min(21.5vw, 22svh)', letterSpacing: '-0.04em' }} aria-label="cāpsula33">
            {[
              ['cāpsula', Math.min(100, pct * 2), INK],
              ['33', Math.max(0, (pct - 50) * 2), C.cream],
            ].map(([text, p, color]) => (
              <span key={text} aria-hidden="true" className="relative block">
                <span style={{ color: 'transparent', WebkitTextStroke: `1.5px ${INK}`, opacity: 0.45 }}>{text}</span>
                <span className="absolute inset-0 transition-[clip-path] duration-300 ease-out" style={{ clipPath: `inset(0 ${100 - p}% 0 0)`, color }}>
                  {text}
                </span>
              </span>
            ))}
          </p>
          <p className="relative hidden leading-[0.82] font-light whitespace-nowrap select-none sm:block" style={{ ...MONO, fontSize: 'min(17.6vw, 34svh)', letterSpacing: '-0.04em', paddingBottom: '0.12em' }} aria-hidden="true">
            <span style={{ color: 'transparent', WebkitTextStroke: `1.5px ${INK}`, opacity: 0.45 }}>cāpsula33</span>
            <span className="absolute inset-0 transition-[clip-path] duration-300 ease-out" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, color: INK }}>
              cāpsula<span style={{ color: C.cream }}>33</span>
            </span>
          </p>
        </footer>
      </div>
      <style>{`.c33-board:focus-visible { outline: 3px solid ${C.cream}; outline-offset: 3px; }`}</style>
    </div>
  )
}

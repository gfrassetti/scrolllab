import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, MONO } from './brand'

/**
 * cāpsula33 — secuencia de abordaje (el loader).
 *
 * Naranja de la marca de punta a punta. La carga es la temperatura de la
 * cafetera: un termómetro que sube de 20 °C a los 93 °C del grupo, con la marca
 * gigante abajo que se llena a la par. Al abordar, esa misma marca se despega
 * del piso del loader y vuela hasta el cartel de la entrada del hero, donde se
 * apaga el DOM y se prende el cartel de luz de la escena, titilando.
 * Sin sonido.
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

export default function Loader({ progress, ready, calm, bridge, onBoard }) {
  const rootRef = useRef(null)
  const contentRef = useRef(null)
  const buttonRef = useRef(null)
  const deskRef = useRef(null) // la marca (una línea), en pantallas anchas
  const phoneRef = useRef(null) // la marca (dos renglones), en el teléfono
  const flyRef = useRef(null)
  const flyA = useRef(null)
  const flyB = useRef(null)
  const pct = Math.round(progress * 100)
  const temp = Math.round(T_MIN + progress * (T_READY - T_MIN))
  // Cuánto del tubo llena el mercurio (en el fondo de escala del termómetro).
  const fill = ((T_MIN + progress * (T_READY - T_MIN) - T_MIN) / (T_MAX - T_MIN)) * 100

  useEffect(() => {
    if (ready) buttonRef.current?.focus({ preventScroll: true })
  }, [ready])

  const wipe = (tl, at) => {
    // La cortina naranja sube y deja ver el pasillo (que ya está debajo).
    tl.to(rootRef.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, at)
    tl.set(rootRef.current, { display: 'none' })
  }

  const board = () => {
    const root = rootRef.current
    if (!root) return
    if (calm) {
      bridge?.current.show?.()
      gsap.to(root, { autoAlpha: 0, duration: 0.4, ease: 'power2.out', onComplete: onBoard })
      return
    }
    const fly = flyRef.current
    const sign = bridge?.current.signRect?.()
    const desk = deskRef.current && getComputedStyle(deskRef.current.parentElement).display !== 'none'
    const startEl = desk ? deskRef.current : phoneRef.current
    const tl = gsap.timeline()
    tl.to(contentRef.current, { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' })
    if (!sign || !startEl) {
      // Sin escena todavía (o sin dónde apoyarla): solo la cortina, y el cartel entra solo.
      tl.call(onBoard, null, 0.35)
      tl.call(() => bridge?.current.land?.(), null, 1.2)
      wipe(tl, 0.35)
      return
    }
    // Tamaño natural de la marca voladora y dónde empieza (donde está la del loader).
    gsap.set(fly, { x: 0, y: 0, scale: 1, opacity: 0 })
    const nat = fly.getBoundingClientRect()
    const from = startEl.getBoundingClientRect()
    const s0 = desk ? from.width / nat.width : from.width / (nat.width * (7 / 9))
    const x0 = from.left
    const y0 = from.top + from.height / 2 - (nat.height * s0) / 2
    // Dónde termina: el texto del cartel (86 % del ancho del plano, centrado a 55 % de su alto).
    const s1 = (sign.w * 0.86) / nat.width
    const x1 = sign.x + sign.w / 2 - (nat.width * s1) / 2
    const y1 = sign.y + sign.h * 0.55 - (nat.height * s1) / 2
    gsap.set(fly, { x: x0, y: y0, scale: s0, opacity: 1 })
    gsap.set(flyA.current, { color: INK })
    gsap.set(flyB.current, { color: C.cream })
    // La del loader se apaga en el mismo cuadro en que la voladora toma su lugar.
    gsap.set(startEl, { visibility: 'hidden' })
    tl.call(onBoard, null, 0.2)
    wipe(tl, 0.45)
    tl.to(fly, { x: x1, y: y1, scale: s1, duration: 1.35, ease: 'expo.inOut' }, 0.25)
    tl.to([flyA.current, flyB.current], { color: '#ffe9cc', duration: 1, ease: 'power2.inOut' }, 0.55)
    tl.to(fly, { textShadow: `0 0 6px #fff, 0 0 18px ${C.neon}, 0 0 38px ${C.neon}`, duration: 0.7, ease: 'power2.out' }, 1.0)
    // Llegó: se prende el cartel de la escena (titila) y la voladora se va.
    tl.call(() => bridge?.current.land?.(), null, 1.6)
    tl.to(fly, { opacity: 0, duration: 0.18, ease: 'none' }, 1.62)
  }

  return (
    <>
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

              {/* El botón de la nave: marco con franjas de advertencia, luces de estado y el pulso. */}
              <div
                className={`c33-launch-wrap w-full sm:w-[21rem] ${ready ? 'is-ready' : ''}`}
                style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(10px)', pointerEvents: ready ? 'auto' : 'none' }}
              >
                <button ref={buttonRef} type="button" onClick={board} disabled={!ready} className="c33-launch group relative block h-[4.25rem] w-full">
                  <span aria-hidden="true" className="c33-launch-frame absolute inset-0" />
                  <span aria-hidden="true" className="c33-launch-plate absolute inset-[7px] flex items-center justify-between px-5">
                    <span className="c33-led" />
                    <span className="c33-launch-label text-[14px] font-bold tracking-[0.32em] uppercase" style={DISPLAY}>
                      Abordar
                    </span>
                    <span className="c33-led c33-led-b" />
                  </span>
                  <span className="sr-only">Abordar</span>
                </button>
                <p className="mt-2 text-center text-[10px] font-semibold tracking-[0.22em] uppercase opacity-70" style={MONO}>
                  Cabina lista · presioná para despegar
                </p>
              </div>
            </div>

            {/* El termómetro: bulbo, tubo con mercurio y escala hasta el fondo. */}
            <div role="progressbar" aria-label="Temperatura de la cafetera" aria-valuemin={T_MIN} aria-valuemax={T_READY} aria-valuenow={temp} aria-valuetext={`${temp} grados`}>
              <div className="flex items-center">
                <span aria-hidden="true" className="relative z-10 grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full" style={{ background: INK, boxShadow: `0 0 0 3px ${C.orange}, 0 0 0 5px ${INK}` }}>
                  <span className="h-3 w-3 rounded-full" style={{ background: C.orange, opacity: 0.55 }} />
                </span>
                <div className="relative -ml-4 flex-1">
                  <div className="h-6 overflow-hidden rounded-r-full border-[3px]" style={{ borderColor: INK, background: 'rgba(11,12,15,0.1)' }}>
                    <div className="h-full" style={{ width: `${fill}%`, background: INK }} />
                  </div>
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
            <p ref={phoneRef} className="sm:hidden leading-[0.84] font-normal select-none" style={{ ...MONO, fontSize: 'min(21.5vw, 22svh)', letterSpacing: '-0.04em' }} aria-label="cāpsula33">
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
            <p className="hidden leading-[0.82] font-normal whitespace-nowrap select-none sm:block" style={{ ...MONO, fontSize: 'min(17.6vw, 34svh)', letterSpacing: '-0.04em', paddingBottom: '0.12em' }} aria-hidden="true">
              <span ref={deskRef} className="relative inline-block">
                <span style={{ color: 'transparent', WebkitTextStroke: `1.5px ${INK}`, opacity: 0.45 }}>cāpsula33</span>
                <span className="absolute inset-0 transition-[clip-path] duration-300 ease-out" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, color: INK }}>
                  cāpsula<span style={{ color: C.cream }}>33</span>
                </span>
              </span>
            </p>
          </footer>
        </div>
      </div>

      {/* La marca que vuela hasta el cartel del hero (aparece al abordar). */}
      <div
        ref={flyRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[60] leading-none font-normal whitespace-nowrap opacity-0"
        style={{ ...MONO, fontSize: 100, letterSpacing: '-0.04em', transformOrigin: '0 0', willChange: 'transform' }}
      >
        <span ref={flyA}>cāpsula</span>
        <span ref={flyB} style={{ color: C.cream }}>
          33
        </span>
      </div>

      <style>{`
        .c33-launch-wrap { transition: opacity 600ms ease-out, transform 600ms cubic-bezier(0.22,1,0.36,1); }
        .c33-launch-wrap.is-ready { animation: c33-launch-pulse 2.2s ease-in-out 600ms infinite; }
        @keyframes c33-launch-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(255,244,230,0.55)) drop-shadow(0 0 18px rgba(255,236,210,0.35)); }
          50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.95)) drop-shadow(0 0 34px rgba(255,244,230,0.7)); }
        }
        .c33-launch { cursor: pointer; transition: transform 140ms ease-out; -webkit-tap-highlight-color: transparent; }
        .c33-launch:active { transform: scale(0.975); }
        /* El marco: chaflanes y franjas de advertencia. */
        .c33-launch-frame {
          clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
          background: repeating-linear-gradient(-45deg, ${INK} 0 9px, ${C.cream} 9px 18px);
        }
        .c33-launch-plate {
          clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
          background: ${C.cream};
          color: ${INK};
          box-shadow: inset 0 -6px 0 rgba(11,12,15,0.08);
          transition: background-color 220ms ease-out, color 220ms ease-out;
        }
        .c33-launch-label { transition: letter-spacing 320ms cubic-bezier(0.22,1,0.36,1); }
        /* Luces de estado: alternan como en un tablero. */
        .c33-led { width: 10px; height: 10px; border-radius: 999px; background: ${C.orange}; box-shadow: 0 0 10px ${C.orange}; animation: c33-led 1.1s steps(1, end) infinite; }
        .c33-led-b { animation-delay: 0.55s; }
        @keyframes c33-led { 0% { opacity: 1; } 50% { opacity: 0.18; } }
        @media (hover: hover) {
          .c33-launch:hover .c33-launch-plate { background: ${INK}; color: ${C.cream}; }
          .c33-launch:hover .c33-launch-label { letter-spacing: 0.42em; }
          .c33-launch:hover .c33-led { background: #fff; box-shadow: 0 0 12px #fff; animation-duration: 0.45s; }
        }
        .c33-launch:focus-visible .c33-launch-plate { background: ${INK}; color: ${C.cream}; }
        .c33-launch:focus-visible { outline: none; }
      `}</style>
    </>
  )
}

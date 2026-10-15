import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, MONO } from './brand'
import { LangSwitch } from './i18n'
import { useLang } from './i18nCore'
import { enableTilt } from './tilt'

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
const CHECK_VALUE_IS_TEXT = (v) => !/°C$/.test(v)

const TICKS = Array.from({ length: (T_MAX - T_MIN) / 5 + 1 }, (_, i) => T_MIN + i * 5)

export default function Loader({ progress, ready, calm, bridge, onBoard }) {
  const { t } = useLang()
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

  // Enter / Espacio abordan sin tener que enfocar el botón (que se enfocara solo le ponía
  // un aro de foco encima del borde animado).
  useEffect(() => {
    if (!ready) return undefined
    const onKey = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) {
        e.preventDefault()
        buttonRef.current?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready])

  const wipe = (tl, at) => {
    // La cortina naranja sube y deja ver el pasillo (que ya está debajo).
    tl.to(rootRef.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, at)
    tl.set(rootRef.current, { display: 'none' })
  }

  const board = () => {
    // El giroscopio del teléfono (iOS solo da permiso dentro de este toque).
    enableTilt()
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
    gsap.set(flyB.current, { x: 0, y: 0 })
    const nat = fly.getBoundingClientRect()
    const from = startEl.getBoundingClientRect()
    // En el teléfono la marca del loader va en dos renglones («cāpsula» / «33»): la voladora arranca
    // igual (el «33» abajo, al principio del renglón) y se arma en uno solo mientras vuela.
    const wA = flyA.current.getBoundingClientRect().width
    const s0 = desk ? from.width / nat.width : from.width / wA
    const x0 = from.left
    const y0 = desk ? from.top + from.height / 2 - (nat.height * s0) / 2 : from.top - 0.08 * 100 * s0
    const b0 = desk ? { x: 0, y: 0 } : { x: -wA, y: 84 }
    // Dónde termina: el texto del cartel (86 % del ancho del plano, centrado a 55 % de su alto).
    // El cartel de la escena no tiene interletraje negativo: se mide la marca sin él.
    gsap.set(fly, { letterSpacing: '0em' })
    const nat1 = fly.getBoundingClientRect()
    gsap.set(fly, { letterSpacing: '-0.04em' })
    // El cartel se mueve con el parallax del puntero: el destino se relee en cada cuadro.
    const target = () => {
      const r = bridge?.current.signRect?.() || sign
      const sc = (r.w * 0.86) / nat1.width
      // Correcciones medidas cuadro a cuadro: el canvas del cartel centra el texto distinto que el DOM
      // (+0,4 % del ancho a la derecha y 0,1 em más arriba, con la fuente de 100 px de la voladora).
      return {
        s: sc,
        x: r.x + r.w / 2 - (nat1.width * sc) / 2 + nat1.width * sc * 0.004,
        y: r.y + r.h * 0.55 - (nat1.height * sc) / 2 - 10 * sc,
        w: r.w,
      }
    }
    const prog = { p: 0 }
    const follow = () => {
      const t = target()
      const k = prog.p
      gsap.set(fly, { x: x0 + (t.x - x0) * k, y: y0 + (t.y - y0) * k, scale: s0 + (t.s - s0) * k })
      gsap.set(flyB.current, { x: b0.x * (1 - k), y: b0.y * (1 - k) })
    }
    // El resplandor del cartel (canvas de 2048 px de ancho): mismo radio, en px locales de la voladora.
    const glow = (px) => ((px / 2048) * target().w) / target().s
    gsap.set(fly, { x: x0, y: y0, scale: s0, opacity: 1 })
    gsap.set(flyB.current, { x: b0.x, y: b0.y })
    gsap.set(flyA.current, { color: INK })
    gsap.set(flyB.current, { color: C.cream })
    // La del loader se apaga en el mismo cuadro en que la voladora toma su lugar.
    gsap.set(startEl, { visibility: 'hidden' })
    tl.call(onBoard, null, 0.2)
    wipe(tl, 0.45)
    tl.to(prog, { p: 1, duration: 1.35, ease: 'expo.inOut' }, 0.25)
    tl.to(fly, { letterSpacing: '0em', duration: 1.35, ease: 'expo.inOut' }, 0.25)
    tl.eventCallback('onUpdate', follow)
    tl.to([flyA.current, flyB.current], { color: '#fff7ec', duration: 1, ease: 'power2.inOut' }, 0.55)
    tl.to(
      fly,
      { textShadow: `0 0 ${glow(18)}px rgba(255,220,180,0.9), 0 0 ${glow(60)}px rgba(255,140,60,0.95)`, duration: 0.7, ease: 'power2.out' },
      1.0,
    )
    // Llegó: se prende el cartel de la escena y la voladora se va en el cuadro siguiente. Corte
    // seco y no fundido: están en el mismo lugar, y un fundido suma los dos resplandores.
    tl.call(
      () => {
        bridge?.current.land?.()
        requestAnimationFrame(() => requestAnimationFrame(() => gsap.set(fly, { opacity: 0 })))
      },
      null,
      1.62,
    )
  }

  return (
    <>
      <div
        ref={rootRef}
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label={t('C33 · Secuencia de abordaje')}
        style={{ background: C.orange, color: INK, clipPath: 'inset(0% 0% 0% 0%)' }}
      >
        <div ref={contentRef} className="relative flex h-full flex-col justify-between px-6 py-6 md:px-10 md:py-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-4 md:inset-6">
            {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
              <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: INK }} />
            ))}
          </div>

          <header className="flex items-start justify-between gap-4 text-[11px] font-semibold tracking-[0.18em] uppercase" style={DISPLAY}>
            <span>{t('C33 · Secuencia de abordaje')}</span>
            <span className="flex items-center gap-4">
              <span className="hidden opacity-60 sm:inline">{t('40°09′S 71°21′O')}</span>
              <LangSwitch color={INK} dim="rgba(11,12,15,0.5)" accent={INK} className="-mr-2 -my-2" />
            </span>
          </header>

          <div className="flex flex-1 flex-col justify-center gap-7">
            {/* La temperatura, en grande, y el botón cuando llega. */}
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70" style={MONO}>
                  {t('Cafetera · temperatura del grupo')}
                </p>
                <p className="mt-2 leading-[0.85] font-semibold tabular-nums" style={{ ...DISPLAY, fontSize: 'clamp(4.2rem, 11vw, 9.5rem)', letterSpacing: '-0.02em' }}>
                  {temp}
                  <span style={{ fontSize: '0.5em', marginLeft: '0.08em' }}>°C</span>
                </p>
              </div>

              <div className="h-14 w-full sm:w-[17rem]">
                {/* El borde es una luz que da vueltas alrededor del botón (y titila al encenderse). */}
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={board}
                  disabled={!ready}
                  className={`c33-board ${ready ? 'is-ready' : ''} group relative block h-14 w-full overflow-hidden rounded-full p-[3px] text-[13px] font-semibold tracking-[0.24em] uppercase transition-[opacity,transform] duration-500 active:scale-[0.98] disabled:pointer-events-none`}
                  style={{ ...DISPLAY, color: C.cream, opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(8px)', background: 'rgba(11,12,15,0.55)' }}
                >
                  <span aria-hidden="true" className="c33-board-ring pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2" />
                  <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full" style={{ background: INK }}>
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                      style={{ background: C.cream }}
                    />
                    <span className="relative transition-colors duration-300 group-hover:text-[#0b0c0f]">{t('Abordar')}</span>
                  </span>
                </button>
              </div>
            </div>

            {/* El termómetro: bulbo, tubo con mercurio y escala hasta el fondo. */}
            <div role="progressbar" aria-label={t('Temperatura de la cafetera')} aria-valuemin={T_MIN} aria-valuemax={T_READY} aria-valuenow={temp} aria-valuetext={t('{n} grados', { n: temp })}>
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
                    <span>{t(label)}</span>
                    <span style={{ color: done ? C.cream : 'inherit' }}>{done ? (CHECK_VALUE_IS_TEXT(value) ? t(value) : value) : '···'}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* La marca, a todo el ancho: se llena de tinta con la carga. */}
          <footer>
            <div className="mb-3 flex items-end justify-between gap-4 text-[11px] font-semibold tracking-[0.18em] uppercase" style={DISPLAY}>
              <span className="opacity-70">{t('Café de especialidad · San Martín de los Andes')}</span>
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
        <span ref={flyB} className="inline-block" style={{ color: C.cream }}>
          33
        </span>
      </div>

      <style>{`
        .c33-board:focus-visible { outline: 2px solid ${INK}; outline-offset: 4px; }
        /* El borde: un cometa de luz (cabeza crema, estela naranja) que gira; al encenderse, titila. */
        .c33-board-ring {
          background: conic-gradient(from 0deg, rgba(255,122,26,0) 0deg, rgba(255,122,26,0) 140deg, rgba(255,140,60,0.7) 260deg, ${C.neon} 320deg, #fff4e6 354deg, rgba(255,122,26,0) 360deg);
          opacity: 0;
        }
        .c33-board.is-ready .c33-board-ring {
          animation: c33-ring-spin 2.2s linear infinite, c33-ring-on 1.2s steps(1, end) 1 forwards;
        }
        @keyframes c33-ring-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes c33-ring-on {
          0% { opacity: 0.2; } 8% { opacity: 1; } 15% { opacity: 0.25; } 24% { opacity: 1; } 33% { opacity: 0.4; }
          42% { opacity: 1; } 62% { opacity: 0.7; } 70%, 100% { opacity: 1; }
        }
        @media (hover: hover) { .c33-board.is-ready:hover .c33-board-ring { animation-duration: 0.9s, 1.2s; } }
        @media (prefers-reduced-motion: reduce) { :where(:root:not([data-motion='full'])) .c33-board.is-ready .c33-board-ring { animation: c33-ring-on 1.2s steps(1, end) 1 forwards; background: ${C.neon}; } }
      `}</style>
    </>
  )
}

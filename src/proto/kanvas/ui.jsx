import { useEffect, useRef, useState } from 'react'

/**
 * Kanvas — la UI de encima del canvas: el HUD (esquinas, medidor de altura, barra de arriba), los
 * links que ruedan letra por letra y se enmarcan al pasar, la onda del sonido y el menú en cajón.
 */

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IO = 'cubic-bezier(0.65, 0, 0.35, 1)'
// Rótulos y UI: una condensada en mayúsculas espaciadas (como los menús de un juego de rol); texto
// corrido: la misma familia, en su corte normal.
export const LABEL = "'Barlow Semi Condensed', system-ui, sans-serif"
export const BODY = "'Barlow', system-ui, sans-serif"
export const AMBER = '#f3b04f'
export const INK = '#15111d'

/**
 * Titulares: Big Shoulders Display en negra, una condensada de arena / esports (elegida por el dueño
 * entre 12 opciones). `scale` es su tamaño relativo: como es angosta, va más grande que una de ancho
 * normal para el mismo renglón.
 */
export const DISPLAY = { family: "'Big Shoulders Display'", weight: 900, tracking: '0.005em', scale: 1.3 }
export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Barlow:wght@400;500&family=Barlow+Semi+Condensed:wght@500;600&display=block'

export const KANVAS_CSS = `
.kv { --pad: 20px; --bar: 56px; --rail: 0px; --radius: 4px; }
@media (max-width: 767px) { .kv { --pad: 12px; --bar: 52px; } }
.kv-frame { --fg: #fff; --fg-inv: ${INK}; --line: rgba(255,255,255,.55); --dim: rgba(255,255,255,.28); --accent: ${AMBER}; color: var(--fg); transition: color .5s ${EASE}; }
.kv-frame[data-theme='light'] { --fg: ${INK}; --fg-inv: #fff; --line: rgba(21,17,29,.6); --dim: rgba(21,17,29,.22); --accent: #d9480f; }
.kv-corner { position: absolute; width: 22px; height: 22px; border-color: var(--line); border-style: solid; border-width: 0; transition: border-color .5s ${EASE}; }
.kv-ruler { background: repeating-linear-gradient(to bottom, var(--dim) 0 1px, transparent 1px 12px); transition: background .5s; }
.kv-ruler::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 60px); width: 14px; }

/* Link: las letras ruedan hacia arriba una tras otra (la que entra ya viene en el color de acento) y dos
   esquinas cierran el link como una mira. */
.rl { position: relative; display: inline-flex; align-items: center; cursor: pointer; --rl-to: var(--accent); }
.rl-c { display: inline-block; overflow: hidden; height: 1.12em; line-height: 1.12; vertical-align: top; }
.rl-c > span { display: block; white-space: pre; text-shadow: 0 1.12em var(--rl-to); transition: transform .55s ${EASE}; transition-delay: calc(var(--i) * 16ms); }
.rl::before, .rl::after { content: ''; position: absolute; width: max(6px, .32em); height: max(6px, .32em); opacity: 0; transition: transform .45s ${EASE}, opacity .25s; pointer-events: none; }
.rl::before { left: max(-8px, -.3em); top: max(-5px, -.16em); border-left: max(1.5px, .05em) solid var(--rl-to); border-top: max(1.5px, .05em) solid var(--rl-to); transform: translate(-6px, -6px); }
.rl::after { right: max(-8px, -.3em); bottom: max(-5px, -.16em); border-right: max(1.5px, .05em) solid var(--rl-to); border-bottom: max(1.5px, .05em) solid var(--rl-to); transform: translate(6px, 6px); }
@media (hover: hover) { .rl:hover .rl-c > span { transform: translateY(-1.12em); } .rl:hover::before, .rl:hover::after { opacity: 1; transform: none; } }
.rl:focus-visible { outline: none; }
.rl:focus-visible .rl-c > span { transform: translateY(-1.12em); }
.rl:focus-visible::before, .rl:focus-visible::after { opacity: 1; transform: none; }
.rl[data-active] .rl-c > span { color: var(--rl-to); text-shadow: 0 1.12em var(--fg, #fff); }

.kv-wave i { display: block; width: 1.5px; height: 14px; margin: 0 1.5px; background: currentColor; transform: scaleY(.2); transition: transform .4s ${EASE}; }
.kv-wave[data-on] i { animation: kv-wave 1s ease-in-out infinite alternate; }
.kv-wave[data-on] i:nth-child(2) { animation-duration: .7s; animation-delay: -.3s; }
.kv-wave[data-on] i:nth-child(3) { animation-duration: 1.3s; animation-delay: -.6s; }
.kv-wave[data-on] i:nth-child(4) { animation-duration: .85s; animation-delay: -.1s; }
.kv-wave[data-on] i:nth-child(5) { animation-duration: 1.1s; animation-delay: -.45s; }
@keyframes kv-wave { from { transform: scaleY(.25); } to { transform: scaleY(1); } }
.kv-ring { animation: kv-spin 14s linear infinite; transform-origin: center; }
@keyframes kv-spin { to { transform: rotate(1turn); } }
/* la carga: una barra de segmentos inclinados, como una barra de energía */
.kv-segs i { flex: 1; height: 12px; transform: skewX(-24deg); background: rgba(21,17,29,.09); transition: background .3s; }
.kv-segs i[data-on='1'] { background: ${INK}; }
.kv-segs i[data-on='1']:has(+ i[data-on='0']) { background: ${AMBER}; }
/* la grilla que el HUD dibuja en la cordillera: las líneas se trazan desde un extremo */
.kv-grid i { position: absolute; background: rgba(255,255,255,.32); transition: transform 1.2s ${EASE}; }
.kv-grid i.h { left: 0; right: 0; height: 1px; transform: scaleX(0); transform-origin: left; }
.kv-grid i.v { top: 0; bottom: 0; width: 1px; transform: scaleY(0); transform-origin: top; }
.kv-grid[data-on='1'] i { transform: none; }
.kv-grid[data-on='1'] i:nth-child(2) { transition-delay: .12s; }
.kv-grid[data-on='1'] i:nth-child(3) { transition-delay: .2s; }
.kv-grid[data-on='1'] i:nth-child(4) { transition-delay: .3s; }
/* la ficha de la reliquia: filas con barra y pips que se llenan al entrar */
.kv-row { display: grid; grid-template-columns: 72px 1fr 44px; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid rgba(21,17,29,.16); }
.kv-row > dd:last-child { text-align: right; }
.kv-bar { position: relative; height: 6px; background: rgba(21,17,29,.12); }
.kv-bar i { position: absolute; inset: 0; background: ${INK}; transform-origin: left; transform: scaleX(0); transition: transform 1.3s ${EASE} .15s; }
.kv-stats[data-on='1'] .kv-bar i { transform: scaleX(var(--v)); }
.kv-pips { display: flex; gap: 4px; }
.kv-pips i { flex: 1; height: 6px; transform: skewX(-24deg); background: rgba(21,17,29,.12); transition: background .3s; }
.kv-stats[data-on='1'] .kv-pips i[data-full='1'] { background: ${AMBER}; transition-delay: var(--d); }
.kv-chamfer { clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px)); }
`

/**
 * Link de la casa: cada letra rueda hacia arriba, con un pequeño retraso entre una y otra, y la que
 * entra ya viene en el color de acento; dos esquinas se cierran alrededor como una mira.
 */
let hoverFx = null
/** El sonido corto que suena al pasar el mouse por un link (lo registra la página). */
export const setHoverFx = (fn) => {
  hoverFx = fn
}

export function RollLink({ text, onClick, className = '', style, active = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={(e) => e.pointerType === 'mouse' && hoverFx?.()}
      className={`rl pointer-events-auto ${className}`}
      style={style}
      data-active={active ? '' : undefined}
      aria-label={text}
    >
      {children}
      <span aria-hidden="true" className="inline-flex">
        {[...text].map((c, i) => (
          <span key={i} className="rl-c" style={{ '--i': i }}>
            <span>{c}</span>
          </span>
        ))}
      </span>
    </button>
  )
}

/** La onda del sonido: cinco líneas que laten con el audio prendido y quedan planas apagado. */
export function AudioWave({ on, onClick, className = '', icon = false, label = false }) {
  const bars = (
    <span aria-hidden="true" data-on={on ? '' : undefined} className="kv-wave flex items-center justify-center">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  )
  if (icon) return bars
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? 'Sound off' : 'Sound on'}
      aria-pressed={on}
      className={`pointer-events-auto flex h-11 min-w-11 cursor-pointer items-center justify-center gap-3 ${className}`}
    >
      {bars}
      {label && (
        <span className="text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
          Snd {on ? 'on' : 'off'}
        </span>
      )}
    </button>
  )
}

/**
 * El menú: un panel de esquinas cortadas que sale desde la esquina izquierda del HUD. Una línea de
 * acento barre de izquierda a derecha y descubre el panel quieto detrás; los ítems llegan de a uno.
 * Queda dentro del margen del HUD: no toca los bordes de la pantalla.
 */
export function Menu({ open, onClose, items, active, onGo, footer }) {
  const root = useRef(null)
  const under = useRef(null)
  const outer = useRef(null)
  const inner = useRef(null)
  const first = useRef(true)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const onClose = () => closeRef.current()
    if (first.current) {
      first.current = false
      return undefined
    }
    const r = root.current
    const its = [...r.querySelectorAll('[data-mi]')]
    const px = outer.current.offsetWidth
    if (open) {
      r.style.display = 'block'
      under.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'linear', fill: 'both' })
      outer.current.animate([{ transform: `translateX(${-px}px)` }, { transform: 'none' }], { duration: 820, easing: EASE, fill: 'both' })
      inner.current.animate([{ transform: `translateX(${px}px)` }, { transform: 'none' }], { duration: 820, easing: EASE, fill: 'both' })
      its.forEach((it, i) =>
        it.animate([{ transform: 'translateX(-120px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
          duration: 900,
          delay: 180 + i * 55,
          easing: EASE,
          fill: 'both',
        }),
      )
      const onKey = (e) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    outer.current.animate([{ transform: 'none' }, { transform: `translateX(${-px}px)` }], { duration: 560, easing: EASE_IO, fill: 'both' })
    inner.current.animate([{ transform: 'none' }, { transform: `translateX(${px}px)` }], { duration: 560, easing: EASE_IO, fill: 'both' })
    const a = under.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 260, easing: 'linear', fill: 'both' })
    a.finished.then(() => !root.current?.dataset.open && (r.style.display = 'none')).catch(() => {})
    return undefined
  }, [open])

  return (
    <div ref={root} data-open={open ? '' : undefined} className="fixed inset-0 z-50" style={{ display: 'none' }}>
      <div ref={under} className="absolute inset-0 bg-white/75" onClick={onClose} aria-hidden="true" />
      <div className="absolute overflow-hidden" style={{ left: 'var(--pad)', top: 'var(--pad)', bottom: 'var(--pad)', width: 'min(calc(100vw - var(--pad) * 2), 780px)' }}>
        <div ref={outer} className="relative h-full w-full text-white">
          {/* la línea de acento que barre: el borde del cajón */}
          <span className="absolute inset-y-0 right-0 z-10 w-[2px]" style={{ background: AMBER, boxShadow: `0 0 18px ${AMBER}` }} aria-hidden="true" />
          <div className="kv-chamfer h-full overflow-hidden" style={{ background: INK }}>
            <div ref={inner} className="flex h-full flex-col">
              <div className="flex items-center justify-between px-6 md:px-10" style={{ height: 'var(--bar)' }}>
                <span className="text-[11px] tracking-[0.16em] uppercase opacity-60" style={{ fontFamily: LABEL }}>
                  Index — {String(items.length).padStart(2, '0')} leaves
                </span>
                <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-11 w-11 cursor-pointer items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 18 18" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 2l14 14M16 2L2 16" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 px-6 pt-4 md:px-10 md:pt-8" aria-label="Menu">
                <ul className="flex flex-col gap-1">
                  {items.map((it, i) => (
                    <li key={it.id} data-mi="" className="flex items-baseline gap-4">
                      <span className="w-6 text-[11px] opacity-50" style={{ fontFamily: LABEL, color: it.id === active ? AMBER : undefined }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <RollLink
                        text={it.label}
                        active={it.id === active}
                        onClick={() => onGo(it)}
                        className="text-left text-[clamp(2.2rem,6.4vw,4.6rem)] uppercase"
                        style={{ fontFamily: DISPLAY.family, fontWeight: DISPLAY.weight, letterSpacing: DISPLAY.tracking, fontSize: `calc(clamp(2.2rem,6.4vw,4.6rem) * ${DISPLAY.scale})`, '--rl-to': AMBER, '--fg': '#fff' }}
                      />
                    </li>
                  ))}
                </ul>
              </nav>
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Suscripción a un objeto con `subscribe` (el audio). */
export function useSubscribed(src, initial) {
  const [v, setV] = useState(initial)
  useEffect(() => src?.subscribe(setV), [src])
  return v
}

import { useEffect, useRef, useState } from 'react'

/**
 * Kanvas — la UI de encima del canvas, como un cuaderno de expedición dibujado: la barra de arriba con
 * su raya de tinta, los links que se subrayan con un trazo de pincel, los botones de tinta que se hunden
 * al apretarlos, las cajas de narración de las viñetas, la onda del sonido y el menú como una hoja que
 * se despliega.
 */

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IO = 'cubic-bezier(0.65, 0, 0.35, 1)'
// El cajón del menú, medido en la referencia cuadro por cuadro (2026-10-18): espera ~90 ms, recorre en
// ~410 ms y arranca suave en vez de salir disparado (el dueño: «arranca lento y termina más rápido»).
// Ajuste a sus muestras: cubic-bezier(0.25, 0.2, 0.35, 1). Antes: 820 ms con EASE (sale de golpe y
// tarda en frenar).
const EASE_DRAWER = 'cubic-bezier(0.25, 0.2, 0.35, 1)'
// Rótulos, navegación y botones: una mono limpia en mayúsculas (la lectura de un HUD; la condensada
// anterior quedaba floja en la barra). Texto corrido: Barlow.
export const LABEL = "'Geist Mono', ui-monospace, monospace"
export const BODY = "'Barlow', system-ui, sans-serif"
export const AMBER = '#f3b04f'
export const INK = '#1f1810' // tinta cálida (antes violácea), como el contorno de las ilustraciones
const PAPER = '#efe6d3'
const PAPER_2 = '#f7efdd'
// el trazo de pincel de los links (un poco irregular, como hecho a mano)
const BRUSH = 'M2 6C20 3.2 44 8.4 62 5.4S90 3.6 98 4.6'

/**
 * Titulares: Big Shoulders Display en negra, una condensada de arena / esports (elegida por el dueño
 * entre 12 opciones). `scale` es su tamaño relativo: como es angosta, va más grande que una de ancho
 * normal para el mismo renglón.
 */
export const DISPLAY = { family: "'Big Shoulders Display'", weight: 900, tracking: '0.005em', scale: 1.3 }
export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Barlow:wght@400;500&family=Geist+Mono:wght@400;500&display=block'

export const KANVAS_CSS = `
.kv { --pad: 20px; --bar: 56px; --rail: 0px; --radius: 4px; }
@media (max-width: 767px) { .kv { --pad: 12px; --bar: 52px; } }
.kv-frame { --fg: #fff; --fg-inv: ${INK}; --line: rgba(255,255,255,.55); --dim: rgba(255,255,255,.28); --accent: ${AMBER}; color: var(--fg); transition: color .5s ${EASE}; }
.kv-frame[data-theme='light'] { --fg: ${INK}; --fg-inv: #fff; --line: rgba(31,24,16,.6); --dim: rgba(31,24,16,.22); --accent: #d9480f; }
/* El avance del scroll: se traza en ámbar sobre la raya de la barra (la página le pone el dashoffset). */
.kv-rule path:last-child { transition: stroke .5s; }

/* Link: un trazo de pincel lo subraya de izquierda a derecha al pasar (y queda en el activo). */
.rl { position: relative; display: inline-flex; align-items: center; line-height: 1.12; white-space: nowrap; cursor: pointer; --rl-to: var(--accent); }
.rl-u { position: absolute; left: -4%; bottom: max(-7px, -.34em); width: 108%; height: max(7px, .3em); overflow: visible; pointer-events: none; }
.rl-u path { fill: none; stroke: var(--rl-to); stroke-width: var(--rl-w, 4.5); stroke-linecap: round; stroke-dasharray: 1 2; stroke-dashoffset: 1.02; transition: stroke-dashoffset .5s ${EASE}; }
@media (hover: hover) { .rl:hover .rl-u path { stroke-dashoffset: 0; } }
.rl:focus-visible { outline: none; }
.rl:focus-visible .rl-u path, .rl[data-active] .rl-u path { stroke-dashoffset: 0; }

/* Botón de tinta: papel, borde de tinta y la sombra corrida; se hunde al apretarlo. */
.kv-btn { color: ${INK}; background: ${PAPER_2}; border: 2px solid ${INK}; border-radius: 8px; box-shadow: 4px 4px 0 ${INK}; transition: transform .16s ${EASE}, box-shadow .16s ${EASE}; }
@media (hover: hover) { .kv-btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 ${INK}; } }
.kv-btn:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 ${INK}; transition-duration: .08s; }
.kv-btn:focus-visible { outline: 2px solid ${AMBER}; outline-offset: 4px; }
/* Caja de narración de una viñeta (rectangular, como en un cómic) y el rótulo «en vivo». */
.kv-cap { z-index: 2; color: ${INK}; background: ${PAPER_2}; border: 2px solid ${INK}; border-radius: 3px; padding: 8px 11px; font-size: 15px; line-height: 1.3; }
.kv-cap-k { display: block; margin-bottom: 4px; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; opacity: .7; }
.kv-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 9px; border-radius: 3px; background: ${INK}; color: ${PAPER_2}; }
.kv-chip i { width: 7px; height: 7px; background: #7fd0b0; animation: kv-blink 1.6s steps(1) infinite; }
/* la cinta que pega el boceto */
.kv-tape { position: absolute; left: 50%; top: -10px; width: 64px; height: 20px; transform: translateX(-50%) rotate(5deg); background: rgba(232, 214, 170, .8); box-shadow: 0 1px 2px rgba(0,0,0,.1); }

/* La carga: el nombre en contorno se llena de tinta; con todo listo baja al pie mientras la escena se
   dibuja, y la línea de abajo pasa del porcentaje al rótulo de la hoja. */
.kv-load { pointer-events: none; color: ${INK}; transition: opacity .4s; }
.kv-load-in { position: absolute; left: 50%; top: 50%; display: flex; flex-direction: column; align-items: center; gap: 18px; transform: translate(-50%, -50%); transition: top 1.2s ${EASE}, transform 1.2s ${EASE}; }
.kv-load-word { font-size: clamp(72px, 17vw, 240px); line-height: .82; }
.kv-load-outline { color: transparent; -webkit-text-stroke: 1.5px ${INK}; }
.kv-load-fill { color: ${INK}; transition: clip-path .2s linear; }
.kv-load-note { position: relative; height: 1.6em; display: grid; place-items: center; }
.kv-load-note > span { grid-area: 1 / 1; white-space: nowrap; transition: opacity .4s, transform .5s ${EASE}; }
.kv-load-leaf { opacity: 0; transform: translateY(6px); background: ${PAPER_2}; border: 1.5px solid ${INK}; border-radius: 4px; padding: 5px 10px; }
.kv-load[data-stage='ink'] .kv-load-in { top: calc(100% - 7svh); transform: translate(-50%, -100%) scale(.42); transform-origin: 50% 100%; }
.kv-load[data-stage='ink'] .kv-load-count { opacity: 0; }
.kv-load[data-stage='ink'] .kv-load-leaf { opacity: 1; transform: none; transition-delay: .9s; }
.kv-load[data-stage='done'] { opacity: 0 !important; }
@media (max-width: 767px) { .kv-load[data-stage='ink'] .kv-load-in { transform: translate(-50%, -100%) scale(.55); } }

.kv-wave i { display: block; width: 1.5px; height: 14px; margin: 0 1.5px; background: currentColor; transform: scaleY(.2); transition: transform .4s ${EASE}; }
.kv-wave[data-on] i { animation: kv-wave 1s ease-in-out infinite alternate; }
.kv-wave[data-on] i:nth-child(2) { animation-duration: .7s; animation-delay: -.3s; }
.kv-wave[data-on] i:nth-child(3) { animation-duration: 1.3s; animation-delay: -.6s; }
.kv-wave[data-on] i:nth-child(4) { animation-duration: .85s; animation-delay: -.1s; }
.kv-wave[data-on] i:nth-child(5) { animation-duration: 1.1s; animation-delay: -.45s; }
@keyframes kv-wave { from { transform: scaleY(.25); } to { transform: scaleY(1); } }
.kv-ring { animation: kv-spin 14s linear infinite; transform-origin: center; }
@keyframes kv-spin { to { transform: rotate(1turn); } }
/* El HUD cambia en cada sección: todas las líneas existen y el modo del marco (data-hud) prende las
   suyas, que se trazan desde un extremo; al cambiar de sección las anteriores se recogen. */
.kv-l { position: absolute; background: var(--line); opacity: 0; transition: transform 1.1s ${EASE}, opacity .5s; }
.kv-l.h { left: 0; right: 0; height: 1px; transform: scaleX(0); transform-origin: left; }
.kv-l.v { top: 0; bottom: 0; width: 1px; transform: scaleY(0); transform-origin: top; }
.kv-cross { position: absolute; transform: translate(-50%, -50%) scale(.4) rotate(45deg); opacity: 0; color: var(--accent); transition: transform .9s ${EASE}, opacity .4s; }
.kv-quad { position: absolute; font-size: 10px; letter-spacing: .14em; opacity: 0; transition: opacity .5s .3s; }

.kv-frame[data-hud='ridge-grid'] :is(.l-r1, .l-r2, .l-r3, .l-r4),
.kv-frame[data-hud='relics'] :is(.l-c1, .l-c2),
.kv-frame[data-hud='keepers'] :is(.l-qv, .l-qh),
.kv-frame[data-hud='beacon'] :is(.l-b1, .l-b2) { opacity: .55; transform: none; }
.kv-frame[data-hud='oaths'] :is(.l-b1, .l-o1) { opacity: .55; transform: none; }
.kv-frame[data-hud='world'] :is(.l-b1, .l-w1),
.kv-frame[data-hud='end'] .l-e1 { opacity: .55; transform: none; }
.kv-frame[data-hold='1'] .l-qh { opacity: .35; transform: none; }
.kv-frame[data-hud][data-hold='1'] .l-b2 { opacity: 0; }
.kv-frame[data-hud='keepers'] .kv-cross { opacity: 1; transform: translate(-50%, -50%); }
.kv-frame[data-hud='keepers'] .kv-quad { opacity: .6; }
.kv-frame[data-hud='ridge-grid'] .l-r2, .kv-frame[data-hud='keepers'] .l-qh { transition-delay: .12s; }
.kv-frame[data-hud='ridge-grid'] .l-r3, .kv-frame[data-hud='relics'] .l-c2 { transition-delay: .2s; }
.kv-frame[data-hud='ridge-grid'] .l-r4 { transition-delay: .3s; }
/* la ficha de la reliquia: filas con barra y pips que se llenan al entrar */
.kv-row { display: grid; grid-template-columns: 72px 1fr 44px; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid rgba(21,17,29,.16); }
.kv-row > dd:last-child { text-align: right; }
.kv-bar { position: relative; height: 6px; background: rgba(21,17,29,.12); }
.kv-bar i { position: absolute; inset: 0; background: ${INK}; transform-origin: left; transform: scaleX(0); transition: transform 1.3s ${EASE} .15s; }
.kv-stats[data-on='1'] .kv-bar i { transform: scaleX(var(--v)); }
.kv-pips { display: flex; gap: 4px; }
.kv-pips i { flex: 1; height: 6px; transform: skewX(-24deg); background: rgba(21,17,29,.12); transition: background .3s; }
.kv-stats[data-on='1'] .kv-pips i[data-full='1'] { background: ${AMBER}; transition-delay: var(--d); }
/* Títulos verticales: blancos; al mantener HOLD, cada letra (de a una) se vuelve una pintura que sube */
.kv-paint-l { display: inline-block; color: #fff; background-repeat: no-repeat; background-size: 260% auto; background-position: 50% 160%; -webkit-background-clip: text; background-clip: text; transition: color .35s, background-position .7s ${EASE}; }
.kv-paint-l[data-on='1'] { color: transparent; background-position: 50% 50%; }
/* La película de HOLD: viñetas redondeadas sobre el mundo apagado. El marco se traza (--a), después
   entran el texto (--t) y la imagen; la barra de abajo carga (--load) mientras se mantiene apretado. */
.kv-fp { --a: 0; --t: 0; --load: 0; }
.kv-fp::before { content: ''; position: absolute; inset: 0; border-radius: 9px; background: rgba(31,24,16,.5); opacity: var(--a); }
.kv-fp-frame path { stroke: rgba(247,239,221,.9); stroke-width: 2; stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--a)); }
.kv-fp [data-slot] { opacity: var(--a); }
.kv-fp-txt { opacity: var(--t); transform: translateY(calc((1 - var(--t)) * 6px)); }
.kv-fp-bar { position: relative; display: block; flex: none; width: 56px; height: 4px; background: rgba(255,255,255,.18); }
.kv-fp-bar b { position: absolute; inset: 0; background: ${AMBER}; transform-origin: left; transform: scaleX(var(--load)); }
/* el anillo de HOLD: al centro (táctil) o pegado al cursor (mouse: la página le pone la posición) */
.kv-holdcur { display: flex; flex-direction: column; align-items: center; left: 50%; top: calc(50% + 15svh); transform: translate(-50%, -50%); }
.kv-holdcur[data-follow='1'] { left: 0; top: 0; }
.kv-holdcur[data-follow='1'] .kv-holdbtn { pointer-events: none; }
.kv-holdbtn { transition: transform .35s ${EASE}; }
.kv-holdcur[data-down='1'] .kv-holdbtn { transform: scale(.88); }
.kv-holdcur > p { transition: opacity .3s; }
.kv-holdcur[data-down='1'] > p { opacity: 0 !important; }
/* el cierre: el rótulo de cada carta aparece con el mouse encima (la carta la dibuja el canvas) */
.kv-etag { opacity: 0; transform: translateY(4px); transition: opacity .3s, transform .4s ${EASE}; }
.kv-ecard[data-hover='1'] .kv-etag, .kv-ecard:focus-visible .kv-etag { opacity: 1; transform: none; }
.kv-ecard:focus-visible { outline: 1px solid ${AMBER}; outline-offset: 6px; }
/* el footer: la marca de lado a lado (la condensada, bien grande) y el cursor del registro */
.kv-footword { font-size: 31vw; line-height: .8; letter-spacing: -.01em; margin: 6vw 0 4vw; white-space: nowrap; }
@media (min-width: 768px) { .kv-footword { font-size: 36vw; margin: 3vw 0 1.5vw; } }
.kv-caret { animation: kv-blink 1s steps(1) infinite; }
@keyframes kv-blink { 50% { opacity: 0; } }
.kv-dots { background-image: radial-gradient(rgba(255,255,255,.28) 1px, transparent 1px); background-size: 14px 14px; }
/* el menú: una hoja del cuaderno, rayada, con la raya roja del margen */
.kv-sheet { background-color: ${PAPER}; background-image: linear-gradient(90deg, transparent 31px, rgba(196,98,64,.42) 31px, rgba(196,98,64,.42) 32.5px, transparent 32.5px), repeating-linear-gradient(180deg, transparent 0 39px, rgba(31,24,16,.08) 39px 40px); border: 2px solid ${INK}; border-radius: 10px; box-shadow: 8px 8px 0 ${INK}; }
`

/**
 * Link de la casa: cada letra rueda hacia arriba, con un pequeño retraso entre una y otra, y la que
 * entra ya viene en el color de acento; dos esquinas se cierran alrededor como una mira.
 */
/**
 * Escribir al entrar, como una mano que anota en el cuaderno: cuando `root` aparece en pantalla, cada
 * elemento con `data-scramble` escribe su texto letra por letra (sin caracteres al azar en el medio).
 * Recorre los nodos de texto. Pensado para la mono: todos los caracteres miden lo mismo y el renglón no
 * salta. `data-delay` (ms) escalona; `data-speed` (ms por letra). Al salir de la pantalla se rearma, así
 * que se vuelve a ver la próxima vez. `triggerRef`: otro elemento que decide cuándo entra (una capa fija
 * siempre «está» en pantalla). Con «reducir movimiento», el texto queda.
 */
export function useScrambleIn(rootRef, triggerRef = rootRef) {
  useEffect(() => {
    const host = rootRef.current
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const items = [...host.querySelectorAll('[data-scramble]')].map((el) => {
      const nodes = []
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      while (walk.nextNode()) if (walk.currentNode.nodeValue.trim()) nodes.push(walk.currentNode)
      return { el, nodes, text: nodes.map((n) => n.nodeValue) }
    })
    let raf = 0
    const restore = () => items.forEach((it) => it.nodes.forEach((n, i) => (n.nodeValue = it.text[i])))
    const play = () => {
      cancelAnimationFrame(raf)
      const t0 = performance.now()
      const plan = items.map((it) => {
        const delay = Number(it.el.dataset.delay || 0)
        const speed = Number(it.el.dataset.speed || 22)
        let k = 0
        const chars = it.text.map((s) => [...s].map((c) => ({ c, at: c === ' ' ? -1 : delay + k++ * speed })))
        return { it, chars, end: delay + k * speed + 200 }
      })
      const end = Math.max(...plan.map((x) => x.end))
      const tick = (now) => {
        const t = now - t0
        plan.forEach(({ it, chars }) =>
          it.nodes.forEach((n, ni) => {
            n.nodeValue = chars[ni].map(({ c, at }) => (at < 0 || t >= at ? c : ' ')).join('')
          }),
        )
        if (t < end) raf = requestAnimationFrame(tick)
        else restore()
      }
      raf = requestAnimationFrame(tick)
    }
    let inside = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !inside) {
          inside = true
          play()
        } else if (!e.isIntersecting && inside) {
          inside = false
          cancelAnimationFrame(raf)
          restore()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(triggerRef.current || host)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      restore()
    }
  }, [rootRef, triggerRef])
}

export function RollLink({ text, onClick, className = '', style, active = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rl pointer-events-auto ${className}`}
      style={style}
      data-active={active ? '' : undefined}
      aria-label={text}
    >
      {children}
      <span aria-hidden="true">{text}</span>
      <svg className="rl-u" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength="1" d={BRUSH} />
      </svg>
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
      aria-label={on ? 'Music off' : 'Music on'}
      aria-pressed={on}
      className={`pointer-events-auto flex h-11 min-w-11 cursor-pointer items-center justify-center gap-3 ${className}`}
    >
      {bars}
      {label && (
        <span className="text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
          Music {on ? 'on' : 'off'}
        </span>
      )}
    </button>
  )
}

/**
 * El menú: una hoja del cuaderno (rayada, con margen, borde de tinta y sombra corrida) que se despliega
 * desde arriba, apenas torcida y enderezándose; los ítems se anotan de a uno. Queda dentro del margen
 * del marco: no toca los bordes de la pantalla.
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
    const shut = { clipPath: 'inset(0 0 100% 0 round 10px)', transform: 'rotate(-1.4deg)' }
    const shown = { clipPath: 'inset(0 0 -12px 0 round 10px)', transform: 'none' }
    if (open) {
      r.style.display = 'block'
      under.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'linear', fill: 'both' })
      outer.current.animate([shut, shown], { duration: 460, delay: 60, easing: EASE_DRAWER, fill: 'both' })
      its.forEach((it, i) =>
        it.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
          duration: 420,
          delay: 200 + i * 45,
          easing: EASE_DRAWER,
          fill: 'both',
        }),
      )
      const onKey = (e) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    outer.current.animate([{ clipPath: 'inset(0 0 -12px 0 round 10px)', transform: 'none' }, { clipPath: 'inset(0 0 100% 0 round 10px)', transform: 'rotate(-1.4deg)' }], { duration: 360, easing: EASE_IO, fill: 'both' })
    const a = under.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 140, easing: 'linear', fill: 'both' })
    a.finished.then(() => !root.current?.dataset.open && (r.style.display = 'none')).catch(() => {})
    return undefined
  }, [open])

  return (
    <div ref={root} data-open={open ? '' : undefined} className="fixed inset-0 z-50" style={{ display: 'none' }}>
      <div ref={under} className="absolute inset-0" style={{ background: 'rgba(31,24,16,.38)' }} onClick={onClose} aria-hidden="true" />
      <div className="absolute" style={{ left: 'var(--pad)', top: 'var(--pad)', bottom: 'calc(var(--pad) + 8px)', width: 'min(calc(100vw - var(--pad) * 2 - 8px), 780px)' }}>
        <div ref={outer} className="relative h-full w-full origin-top-left" style={{ color: INK }}>
          <div className="kv-sheet h-full overflow-hidden">
            <div ref={inner} className="flex h-full flex-col pl-4 md:pl-2">
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
                      <span className="w-6 text-[11px] opacity-60" style={{ fontFamily: LABEL, color: it.id === active ? '#c45a1e' : undefined }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <RollLink
                        text={it.label}
                        active={it.id === active}
                        onClick={() => onGo(it)}
                        className="text-left uppercase"
                        style={{ fontFamily: DISPLAY.family, fontWeight: DISPLAY.weight, letterSpacing: DISPLAY.tracking, fontSize: `calc(min(clamp(2rem,5.2vw,4rem), 5.6svh) * ${DISPLAY.scale})`, '--rl-to': AMBER, '--rl-w': 6 }}
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

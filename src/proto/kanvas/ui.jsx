import { useEffect, useRef, useState } from 'react'

/**
 * Kanvas — la UI de encima del canvas: el marco (riel izquierdo + barra de arriba), los links que se
 * pintan y se desordenan al pasar, la onda del sonido y el menú que sale del riel como un cajón.
 */

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IO = 'cubic-bezier(0.65, 0, 0.35, 1)'
export const MONO = "'JetBrains Mono', ui-monospace, monospace"
export const SERIF = "'Fraunces', Georgia, serif"

export const KANVAS_CSS = `
.kv { --pad: 20px; --rail: 67px; --bar: 51px; --radius: 10px; }
@media (max-width: 767px) { .kv { --pad: 10px; --rail: 0px; --bar: 52px; } }
.kv-frame { --fg: #fff; --fg-inv: #15111d; --line: rgba(255,255,255,.22); color: var(--fg); transition: color .5s ${EASE}; }
.kv-frame[data-theme='light'] { --fg: #15111d; --fg-inv: #fff; --line: rgba(21,17,29,.14); }
.kv-line { border-color: var(--line); transition: border-color .5s ${EASE}; }
.hk { position: relative; display: inline-block; overflow: hidden; vertical-align: top; }
.hk-bg { position: absolute; inset: 0; background: var(--hk-bg, var(--fg)); transform: translateX(-101%); }
.hk-t { position: relative; display: inline-block; transition: color .18s linear; }
.hk[data-on] .hk-t { color: var(--hk-on, var(--fg-inv)); transition: color .45s ${EASE}; }
.hk-a { position: absolute; left: 0; top: 0; white-space: pre; visibility: hidden; }
.kv-wave i { display: block; width: 1px; height: 13px; margin: 0 1px; background: currentColor; transform: scaleY(.2); transition: transform .4s ${EASE}; }
.kv-wave[data-on] i { animation: kv-wave 1s ease-in-out infinite alternate; }
.kv-wave[data-on] i:nth-child(2) { animation-duration: .7s; animation-delay: -.3s; }
.kv-wave[data-on] i:nth-child(3) { animation-duration: 1.3s; animation-delay: -.6s; }
.kv-wave[data-on] i:nth-child(4) { animation-duration: .85s; animation-delay: -.1s; }
.kv-wave[data-on] i:nth-child(5) { animation-duration: 1.1s; animation-delay: -.45s; }
@keyframes kv-wave { from { transform: scaleY(.25); } to { transform: scaleY(1); } }
.kv-ring { animation: kv-spin 14s linear infinite; transform-origin: center; }
@keyframes kv-spin { to { transform: rotate(1turn); } }
`

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>'

/**
 * Link con el efecto de la casa: al entrar, un bloque pinta el texto de izquierda a derecha mientras las
 * letras se desordenan y se acomodan en el mismo orden; al salir, el bloque sigue de largo hacia la derecha.
 * El texto real queda en su lugar (invisible mientras anima) para que el ancho no salte.
 */
export function HackLink({ text, onClick, className = '', style, children, ...rest }) {
  const root = useRef(null)
  const bg = useRef(null)
  const sp = useRef(null)
  const an = useRef(null)
  const raf = useRef(0)

  const scramble = () => {
    const el = an.current
    const spacer = sp.current
    if (!el || !spacer) return
    cancelAnimationFrame(raf.current)
    const chars = [...text]
    const t0 = performance.now()
    const dur = 380 + chars.length * 26
    let swap = 0
    let rand = chars
    spacer.style.visibility = 'hidden'
    el.style.visibility = 'visible'
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur)
      if (now - swap > 50) {
        rand = chars.map((c) => (c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        swap = now
      }
      const fixed = Math.floor((t * 1.3 - 0.3) * chars.length)
      el.textContent = chars.map((c, i) => (i < fixed ? c : rand[i])).join('')
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        el.textContent = text
        el.style.visibility = 'hidden'
        spacer.style.visibility = ''
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  const enter = () => {
    const b = bg.current
    root.current?.setAttribute('data-on', '')
    if (b.dataset.pos !== 'in') {
      b.style.transition = 'none'
      b.style.transform = 'translateX(-101%)'
      void b.offsetWidth
    }
    b.dataset.pos = 'in'
    b.style.transition = `transform .6s ${EASE}`
    b.style.transform = 'translateX(0)'
    scramble()
  }
  const leave = () => {
    const b = bg.current
    root.current?.removeAttribute('data-on')
    b.dataset.pos = 'out'
    b.style.transition = `transform .5s ${EASE}`
    b.style.transform = 'translateX(101%)'
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <button
      ref={root}
      type="button"
      className={`hk pointer-events-auto cursor-pointer ${className}`}
      style={style}
      onPointerEnter={(e) => e.pointerType === 'mouse' && enter()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}
      onFocus={enter}
      onBlur={leave}
      onClick={onClick}
      {...rest}
    >
      <span ref={bg} className="hk-bg" aria-hidden="true" />
      <span className="hk-t">
        {children}
        <span ref={sp}>{text}</span>
        <span ref={an} className="hk-a" aria-hidden="true">
          {text}
        </span>
      </span>
    </button>
  )
}

/** La onda del sonido: cinco líneas que laten con el audio prendido y quedan planas apagado. */
export function AudioWave({ on, onClick, className = '', icon = false }) {
  if (icon) {
    return (
      <span aria-hidden="true" data-on={on ? '' : undefined} className={`kv-wave flex items-center justify-center ${className}`}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? 'Sound off' : 'Sound on'}
      aria-pressed={on}
      data-on={on ? '' : undefined}
      className={`kv-wave pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center ${className}`}
    >
      <i />
      <i />
      <i />
      <i />
      <i />
    </button>
  )
}

/** La marca del riel: una estrella de rumbo con el farol en el centro. */
export function Mark({ className = '' }) {
  return (
    <svg viewBox="0 0 40 64" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M20 2v60M8 32h24" />
      <path d="M20 14l4 18-4 18-4-18z" fill="currentColor" stroke="none" />
      <circle cx="20" cy="32" r="6.5" />
    </svg>
  )
}

/**
 * El menú: sale del riel izquierdo como un cajón. El riel se desliza hacia la derecha llevando el panel
 * oscuro, que se descubre quieto detrás (la máscara se mueve, el contenido no); los ítems llegan de a
 * uno. Sin tocar los bordes de la pantalla: queda dentro del margen del marco.
 */
export function Menu({ open, onClose, items, active, onGo, audioOn, onAudio, footer }) {
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
    const w = () => outer.current.offsetWidth
    const its = [...r.querySelectorAll('[data-mi]')]
    if (open) {
      r.style.display = 'block'
      const px = w()
      under.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'linear', fill: 'both' })
      outer.current.animate([{ transform: `translateX(${-px}px)` }, { transform: 'none' }], { duration: 820, easing: EASE, fill: 'both' })
      inner.current.animate([{ transform: `translateX(${px}px)` }, { transform: 'none' }], { duration: 820, easing: EASE, fill: 'both' })
      its.forEach((it, i) =>
        it.animate([{ transform: 'translateX(-180px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
          duration: 900,
          delay: 160 + i * 55,
          easing: EASE,
          fill: 'both',
        }),
      )
      const onKey = (e) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    const px = w()
    outer.current.animate([{ transform: 'none' }, { transform: `translateX(${-px}px)` }], { duration: 560, easing: EASE_IO, fill: 'both' })
    inner.current.animate([{ transform: 'none' }, { transform: `translateX(${px}px)` }], { duration: 560, easing: EASE_IO, fill: 'both' })
    const a = under.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 260, easing: 'linear', fill: 'both' })
    a.finished.then(() => !root.current?.dataset.open && (r.style.display = 'none')).catch(() => {})
    return undefined
  }, [open])

  return (
    <div ref={root} data-open={open ? '' : undefined} className="fixed inset-0 z-50" style={{ display: 'none' }}>
      <div ref={under} className="absolute inset-0 bg-white/75" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute overflow-hidden"
        style={{ left: 'var(--pad)', top: 'var(--pad)', bottom: 'var(--pad)', borderRadius: 'var(--radius)', width: 'min(calc(100vw - var(--pad) * 2), 800px)' }}
      >
        <div ref={outer} className="flex h-full w-full text-white">
          {/* el panel: quieto mientras la máscara lo descubre */}
          <div className="relative min-w-0 flex-1 overflow-hidden" style={{ background: '#15111d', borderRadius: 'var(--radius) 0 0 var(--radius)' }}>
            <div ref={inner} className="flex h-full flex-col">
              <nav className="flex flex-1 items-start gap-6 px-6 pt-8 md:px-12 md:pt-12" aria-label="Menu">
                <p className="hidden w-32 shrink-0 pt-3 text-[11px] tracking-[0.12em] uppercase md:block" style={{ fontFamily: MONO }}>
                  <span className="mr-2 inline-block h-[5px] w-[5px] bg-current align-middle" />
                  Discover
                </p>
                <ul className="flex flex-col">
                  {items.map((it) => (
                    <li key={it.id} data-mi="" className="flex items-start gap-3">
                      <HackLink
                        text={it.label}
                        onClick={() => onGo(it)}
                        className="py-[2px] pr-2 pl-1 text-left text-[clamp(2.4rem,7.2vw,5.4rem)] leading-[0.92] uppercase"
                        style={{
                          fontFamily: SERIF,
                          fontWeight: 800,
                          letterSpacing: '-0.035em',
                          '--hk-bg': '#f3b04f',
                          '--hk-on': '#15111d',
                          ...(it.id === active ? { background: '#f3b04f', color: '#15111d', borderRadius: '0 0 0 14px' } : null),
                        }}
                      />
                      {it.id === active && (
                        <span className="pt-2 text-[10px] leading-tight tracking-[0.1em] text-[#f3b04f] uppercase" style={{ fontFamily: MONO }}>
                          Leaf
                          <br />
                          {it.leaf}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
              {footer}
            </div>
          </div>
          {/* el riel: el mismo del marco, que viaja con el borde del cajón */}
          <div className="flex w-14 shrink-0 flex-col items-center justify-between border-l border-white/15 md:w-[var(--rail)]" style={{ background: '#15111d', borderRadius: '0 var(--radius) var(--radius) 0' }}>
            <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-[var(--bar)] w-full cursor-pointer items-center justify-center border-b border-white/15">
              <svg width="18" height="18" viewBox="0 0 18 18" stroke="currentColor" strokeWidth="1.4">
                <path d="M2 2l14 14M16 2L2 16" />
              </svg>
            </button>
            <Mark className="h-16 w-10" />
            <AudioWave on={audioOn} onClick={onAudio} className="mb-3" />
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

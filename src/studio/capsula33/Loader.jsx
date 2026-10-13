import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { C, DISPLAY, MONO } from './brand'

/**
 * cāpsula33 — secuencia de abordaje (el loader).
 *
 * Atrás, un campo de estrellas que acelera con la descarga real (el modelo y
 * su luz horneada). «Abordar» salta al hiperespacio: las estrellas se estiran
 * en líneas, un destello, y del otro lado está el local. Sin sonido (pedido
 * del dueño).
 */

const CHECKS = [
  ['Sistema C33', 'en línea'],
  ['Presión de cabina', 'estable'],
  ['Cafetera', '93 °C'],
  ['Neón del pasillo', 'encendido'],
  ['Tripulación', 'a bordo'],
]

/** Estrellas que vienen hacia la cámara; `speed` las acelera, `warp` las estira. */
function createStarfield(canvas) {
  const ctx = canvas.getContext('2d')
  const stars = []
  const COUNT = 520
  let w = 0
  let h = 0
  let dpr = 1
  const state = { speed: 0.6, warp: 0 }
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
  }
  const spawn = (s, far = true) => {
    s.x = (Math.random() * 2 - 1) * 1.2
    s.y = (Math.random() * 2 - 1) * 1.2
    s.z = far ? 0.2 + Math.random() * 0.8 : Math.random()
    s.pz = s.z
    s.hue = Math.random()
  }
  for (let i = 0; i < COUNT; i += 1) {
    const s = {}
    spawn(s, false)
    stars.push(s)
  }
  let raf = 0
  let last = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(50, now - last) / 16.67
    last = now
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = `rgba(5,5,6,${0.55 - state.warp * 0.4})`
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const f = Math.max(w, h) * 0.55
    const v = (0.0016 + state.speed * 0.0024 + state.warp * 0.045) * dt
    for (const s of stars) {
      s.pz = s.z
      s.z -= v
      if (s.z <= 0.02) {
        spawn(s)
        continue
      }
      const x = cx + (s.x / s.z) * f
      const y = cy + (s.y / s.z) * f
      const px = cx + (s.x / (s.pz + state.warp * 0.12)) * f
      const py = cy + (s.y / (s.pz + state.warp * 0.12)) * f
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
        spawn(s)
        continue
      }
      const near = 1 - s.z
      const a = Math.min(1, near * 1.4)
      const warm = s.hue > 0.9
      ctx.strokeStyle = warm ? `rgba(255,140,60,${a})` : s.hue < 0.12 ? `rgba(160,200,255,${a})` : `rgba(242,233,220,${a})`
      ctx.lineWidth = 0.6 + near * 1.6
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(x + 0.01, y + 0.01)
      ctx.stroke()
    }
  }
  resize()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(frame)
  return {
    state,
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    },
  }
}

export default function Loader({ progress, ready, calm, onBoard }) {
  const rootRef = useRef(null)
  const contentRef = useRef(null)
  const canvasRef = useRef(null)
  const flashRef = useRef(null)
  const fieldRef = useRef(null)
  const buttonRef = useRef(null)
  const pct = Math.round(progress * 100)

  useEffect(() => {
    const field = createStarfield(canvasRef.current)
    fieldRef.current = field
    return () => field.dispose()
  }, [])

  // La descarga empuja la nave.
  useEffect(() => {
    if (fieldRef.current) gsap.to(fieldRef.current.state, { speed: 0.35 + progress * 0.9, duration: 0.8, ease: 'power2.out' })
  }, [progress])

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
    const field = fieldRef.current.state
    const tl = gsap.timeline()
    tl.to(contentRef.current, { autoAlpha: 0, scale: 0.96, duration: 0.45, ease: 'power2.in' })
    tl.to(field, { warp: 1, speed: 4, duration: 1.1, ease: 'expo.in' }, 0.1)
    tl.to(flashRef.current, { autoAlpha: 1, duration: 0.18, ease: 'power2.in' }, 1.05)
    tl.call(onBoard, null, 1.2)
    tl.to(root, { autoAlpha: 0, duration: 0.9, ease: 'power2.out' }, 1.3)
    tl.set(root, { display: 'none' })
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Secuencia de abordaje" style={{ background: '#050506' }}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {/* Viñeta: el centro limpio para leer, los bordes al espacio. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(5,5,6,0.82) 0%, rgba(5,5,6,0.55) 38%, rgba(5,5,6,0) 75%)' }} />
      <div ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" style={{ background: '#fff4ea', visibility: 'hidden' }} />

      <div ref={contentRef} className="relative flex h-full flex-col justify-between px-6 py-6 md:px-10 md:py-8" style={{ color: C.cream }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 md:inset-6">
          {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
            <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: C.orange }} />
          ))}
        </div>

        <header className="flex items-start justify-between gap-4 text-[11px] tracking-[0.18em] uppercase" style={DISPLAY}>
          <span>C33 · Secuencia de abordaje</span>
          <span className="hidden opacity-55 sm:inline">40°09′S 71°21′O</span>
        </header>

        <div className="flex flex-1 items-center justify-end">
          <div className="w-full max-w-[22rem]">
            <ul className="grid gap-2 text-[12px] tracking-[0.14em] uppercase" style={MONO} aria-live="polite">
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
            <div className="mt-8 h-14">
              <button
                ref={buttonRef}
                type="button"
                onClick={board}
                disabled={!ready}
                className="group relative h-14 w-full overflow-hidden rounded-full border text-[13px] font-semibold tracking-[0.24em] uppercase transition-[opacity,transform] duration-500 active:scale-[0.98] disabled:pointer-events-none"
                style={{ ...DISPLAY, borderColor: C.orange, color: C.cream, opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(8px)', background: 'rgba(5,5,6,0.6)' }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  style={{ background: C.orange }}
                />
                <span className="relative transition-colors duration-300 group-hover:text-[#070708] group-focus-visible:text-[#070708]">Abordar</span>
              </button>
            </div>
          </div>
        </div>

        {/* La marca, a todo el ancho: el contorno se llena de luz con la carga. */}
        <footer>
          <div className="mb-3 flex items-end justify-between gap-4 text-[11px] tracking-[0.18em] uppercase" style={DISPLAY}>
            <span className="opacity-55">Café de especialidad · San Martín de los Andes</span>
            <span className="text-[12px] tabular-nums" style={{ ...MONO, color: C.neon }}>
              {String(pct).padStart(3, '0')}
            </span>
          </div>
          <p className="relative leading-[0.82] font-light whitespace-nowrap select-none" style={{ ...MONO, fontSize: 'min(17.6vw, 40svh)', letterSpacing: '-0.04em' }} aria-label="cāpsula33">
            <span aria-hidden="true" style={{ color: 'transparent', WebkitTextStroke: '1px rgba(242,233,220,0.28)' }}>
              cāpsula33
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 transition-[clip-path] duration-500 ease-out"
              style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, color: C.cream, textShadow: '0 0 40px rgba(255,122,26,0.35)' }}
            >
              cāpsula<span style={{ color: C.orange }}>33</span>
            </span>
          </p>
        </footer>
      </div>
    </div>
  )
}

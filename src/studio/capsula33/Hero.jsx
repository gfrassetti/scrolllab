import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { prefersReducedMotion } from '../../lib/motion'
import { createCapsuleScene } from './capsuleScene'
import { MONO, DISPLAY, BODY, C, openStatus } from './brand'

/**
 * cāpsula33 — Hero.
 *
 * La fachada del local, flotando: una cápsula naranja que se gira con el
 * dedo. Sus ventanas son el menú del sitio: el ojo de buey «ā33» es un túnel
 * infinito y lleva a la experiencia; las ventanas pastilla muestran la barra,
 * la colección y el mapa, y tocarlas mete la cámara por el vidrio hasta esa
 * sección. Todo lo demás (texto, HUD) es DOM encima del canvas.
 */

const WINDOWS = [
  { id: 'experiencia', kind: 'round', x: -1.42, width: 0.86, label: 'La cápsula', note: 'Entrar' },
  { id: 'menu', kind: 'pill', x: -0.38, width: 0.5, height: 1.12, image: '/studio/capsula33/bar-neon-800.webp', label: 'Elegidos', note: 'El menú' },
  { id: 'coleccion', kind: 'pill', x: 0.3, width: 0.5, height: 1.12, image: '/studio/capsula33/droids-800.webp', label: 'La colección', note: 'Cine en vitrinas' },
  { id: 'mapa', kind: 'pill', x: 1.32, width: 0.5, height: 1.12, image: '/studio/capsula33/map-7lagos-800.webp', label: 'Base 7-Lagos', note: 'Cómo llegar' },
]

export default function Hero() {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const veilRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState(() => openStatus())

  useEffect(() => {
    const id = window.setInterval(() => setStatus(openStatus()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // La escena: espera la tipografía del nombre (se dibuja en un canvas).
  useEffect(() => {
    const canvas = canvasRef.current
    const mount = rootRef.current
    if (!canvas || !mount) return undefined
    let disposed = false
    let scene = null
    const calm = prefersReducedMotion()
    Promise.race([document.fonts.load(`300 64px ${MONO.fontFamily}`), new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (disposed) return
      scene = createCapsuleScene({
        canvas,
        mount,
        windows: WINDOWS,
        wordmark: 'cāpsula33',
        badge: 'ā33',
        fonts: { mono: MONO.fontFamily },
        calm,
        onHover: (win, screen) => setHover(win ? { win, screen } : null),
        onReady: () => setReady(true),
      })
      sceneRef.current = scene
    })
    return () => {
      disposed = true
      scene?.dispose()
      sceneRef.current = null
    }
  }, [])

  // Al salir del hero la cápsula sube y gira (scrub).
  useGSAP(
    () => {
      if (prefersReducedMotion()) return undefined
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => sceneRef.current?.setProgress(self.progress),
      })
      gsap.from('[data-c33-in]', { autoAlpha: 0, y: 18, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.35 })
      return () => st.kill()
    },
    { scope: rootRef },
  )

  // Tocar una ventana: la cámara entra por el vidrio, el velo se cierra y la
  // página ya está en esa sección cuando se vuelve a abrir.
  const go = (id) => {
    const target = document.getElementById(id)
    const scene = sceneRef.current
    if (!target) return
    const land = () => {
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true })
      else target.scrollIntoView()
      scene?.reset()
      gsap.to(veilRef.current, { autoAlpha: 0, duration: 0.6, ease: 'power2.out', delay: 0.05 })
    }
    if (!scene || prefersReducedMotion()) {
      land()
      return
    }
    gsap.fromTo(veilRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, delay: 0.62, ease: 'power2.in' })
    scene.enter(id, land)
  }

  const onClick = (e) => {
    const hit = sceneRef.current?.pick(e)
    if (hit) go(hit.win.id)
  }

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative h-svh min-h-[36rem] overflow-hidden"
      style={{ background: C.void, color: C.cream }}
    >
      <canvas
        ref={canvasRef}
        onClick={onClick}
        aria-label="La cápsula de cāpsula33: arrastrala para girarla y tocá una ventana para entrar"
        className={`absolute inset-0 h-full w-full touch-pan-y transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
        style={{ cursor: 'grab' }}
      />

      {/* HUD: esquinas y códigos, como sus piezas gráficas. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-4 md:inset-6">
        {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
          <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: C.orange }} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 pt-6 pb-7 md:px-10 md:pt-8 md:pb-9">
        <header data-c33-in className="pointer-events-auto flex items-start justify-between gap-6">
          <a href="#top" className="tpl-hit relative text-[20px] md:text-[24px]" style={{ ...MONO, fontWeight: 300 }}>
            cāpsula33
          </a>
          <nav className="hidden items-center gap-8 text-[13px] tracking-[0.12em] uppercase md:flex" style={DISPLAY} aria-label="Secciones">
            {[
              ['Menú', '#menu'],
              ['Colección', '#coleccion'],
              ['Base 7-Lagos', '#mapa'],
              ['Visitanos', '#visita'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="tpl-link tpl-hit relative">
                {label}
              </a>
            ))}
          </nav>
          <p className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase md:text-[12px]" style={DISPLAY}>
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: status.open ? '#7dffa8' : C.orange, boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }}
            />
            {status.label}
          </p>
        </header>

        <div className="grid items-end gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <h1 data-c33-in className="text-[clamp(2.6rem,7vw,6rem)] leading-[0.92] font-semibold tracking-[-0.02em] uppercase" style={DISPLAY}>
              Café, cine
              <br />
              <span style={{ color: C.orange }}>y algo más.</span>
            </h1>
            <p data-c33-in className="mt-5 max-w-[34ch] text-[15px] leading-[1.5] opacity-80" style={BODY}>
              No somos lo que razonamos, somos lo que imaginamos. Una cápsula para reunirnos, a cuadras del lago Lácar.
            </p>
          </div>
          <div data-c33-in className="flex flex-col items-start gap-2 text-[11px] tracking-[0.16em] uppercase md:col-span-4 md:col-start-9 md:items-end md:text-right" style={DISPLAY}>
            <span className="flex items-center gap-3" style={{ color: C.orange }}>
              <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: C.orange }} />
              Arrastrá la cápsula · tocá una ventana
            </span>
            <span className="opacity-55">C33.02 · San Martín de los Andes · 40°09′S 71°21′O</span>
          </div>
        </div>
      </div>

      {/* La etiqueta de la ventana bajo el puntero. */}
      {hover?.screen ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-[calc(100%+3.25rem)] rounded-full border px-5 py-2 text-center"
          style={{ left: hover.screen.x, top: hover.screen.y, background: 'rgba(7,7,8,0.88)', borderColor: C.orange }}
        >
          <p className="text-[18px] font-semibold tracking-[0.06em] uppercase" style={{ ...DISPLAY, color: C.cream }}>
            {hover.win.label}
          </p>
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ ...DISPLAY, color: C.orange }}>
            {hover.win.note} →
          </p>
        </div>
      ) : null}

      {/* Accesible sin 3D: las mismas cuatro puertas. */}
      <ul className="sr-only">
        {WINDOWS.map((w) => (
          <li key={w.id}>
            <a href={`#${w.id}`}>
              {w.label}: {w.note}
            </a>
          </li>
        ))}
      </ul>

      <div ref={veilRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 opacity-0" style={{ background: C.void, visibility: 'hidden' }} />
    </section>
  )
}

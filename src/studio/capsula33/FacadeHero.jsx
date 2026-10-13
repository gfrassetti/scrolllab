import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { trackPointer } from '../../lib/motion'
import { sfx } from './sfx'
import { C, MONO, BODY, openStatus } from './brand'

/**
 * cāpsula33 — Hero: la fachada de la cápsula, en capas.
 *
 * De atrás hacia adelante: la calle de noche con la cordillera, el interior
 * del café (solo se ve por el hueco de la puerta), las dos hojas de la puerta,
 * la cápsula (con el hueco recortado) y las plantas de la entrada. El scroll
 * abre las puertas (se esconden dentro de la pared), se acerca a la puerta y
 * entra: el interior termina llenando la pantalla. El puntero mueve las capas
 * a distinta velocidad; sobre la puerta, se entreabre; sobre el ojo de buey,
 * se enciende; sobre el cartel, titila.
 *
 * Las imágenes son generadas (Higgsfield) y las piezas de la puerta salen de
 * la misma imagen de la cápsula, así calzan exacto.
 */

const BASE = '/studio/capsula33/hero/'
// Dónde está cada cosa dentro de la imagen de la cápsula (2688 × 1520), en fracciones.
const IMG = { w: 2688, h: 1520 }
const DOOR = { left: 0.26116, top: 0.19408, width: 0.25967, height: 0.61184, split: 0.5043, radius: 84 / 2688 }
const PORT = { cx: 0.6875, cy: 0.4599, r: 0.112 }
const BASE_LINE = 0.871 // el borde de abajo del zócalo negro

const LAYERS = ['street', 'interior', 'facade', 'door-left', 'door-right', 'plant-left', 'plant-right']

function srcFor(name, big) {
  if (name === 'door-left') return `${BASE}door-left-352.webp`
  if (name === 'door-right') return `${BASE}door-right-346.webp`
  if (name.startsWith('plant')) return `${BASE}${name}-${big ? (name === 'plant-left' ? 640 : 800) : name === 'plant-left' ? 360 : 420}.webp`
  return `${BASE}${name}-${big ? 2688 : 1400}.webp`
}

/** Dónde va la cápsula en esta pantalla (px). La puerta queda cerca del centro. */
function layout(vw, vh) {
  const portrait = vw / vh < 0.9
  const W = portrait ? vw * 1.55 : Math.min(vw * 0.84, vh * 1.5)
  const H = (W * IMG.h) / IMG.w
  const doorCx = (DOOR.left + DOOR.width / 2) * W
  const left = portrait ? vw / 2 - doorCx : (vw - W) / 2
  const bottom = vh * (portrait ? 0.7 : 0.8)
  const top = bottom - BASE_LINE * H
  const door = { x: left + DOOR.left * W, y: top + DOOR.top * H, w: DOOR.width * W, h: DOOR.height * H }
  // Escala final: el hueco de la puerta pasa a tapar toda la pantalla.
  const S = Math.max((vw * 1.4) / door.w, (vh * 1.4) / door.h) // las esquinas redondeadas salen de cuadro
  return { W, H, left, top, door, S, portrait }
}

export default function FacadeHero({ boarded, onProgress = () => {}, onReady = () => {} }) {
  const rootRef = useRef(null)
  const R = useRef({})
  const [geo, setGeo] = useState(null)
  const [hover, setHover] = useState(null)
  const [status] = useState(() => openStatus())
  const progress = useRef(0)

  // Precarga de las capas: alimenta el loader.
  useEffect(() => {
    const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1600
    let done = 0
    const all = LAYERS.map(
      (n) =>
        new Promise((res) => {
          const im = new Image()
          im.onload = im.onerror = () => {
            done += 1
            onProgress(done / LAYERS.length)
            res()
          }
          im.src = srcFor(n, big)
        }),
    )
    R.current.big = big
    Promise.all(all).then(() => onReady())
    // El loader llama una vez; los callbacks son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Medidas por pantalla.
  useEffect(() => {
    const measure = () => setGeo(layout(window.innerWidth, window.innerHeight))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // El recorrido: abrir, acercarse, entrar.
  useGSAP(
    () => {
      if (!geo) return undefined
      const { door, S } = geo
      const vw = window.innerWidth
      const vh = window.innerHeight
      const r = R.current
      const dcx = door.x + door.w / 2
      const dcy = door.y + door.h / 2
      const state = { open: 0, zoom: 0 }
      gsap.set(r.rig, { transformOrigin: `${dcx}px ${dcy}px` })
      const apply = () => {
        const z = state.zoom
        const s = 1 + (S - 1) * z * z * (3 - 2 * z) // suave al llegar
        const tx = (vw / 2 - dcx) * z
        const ty = (vh / 2 - dcy) * z
        gsap.set(r.rig, { x: tx, y: ty, scale: s })
        // El interior solo se ve por el hueco (que crece con la escala).
        const cx = dcx + tx
        const cy = dcy + ty
        const hw = (door.w / 2) * s
        const hh = (door.h / 2) * s
        const rad = DOOR.radius * geo.W * s * (1 - z) // al entrar, el hueco se vuelve la pantalla entera
        const t = Math.max(0, cy - hh)
        const b = Math.max(0, vh - (cy + hh))
        const l = Math.max(0, cx - hw)
        const rr = Math.max(0, vw - (cx + hw))
        r.inside.style.clipPath = `inset(${t}px ${rr}px ${b}px ${l}px round ${rad}px)`
        gsap.set(r.insideImg, { scale: 1.35 - 0.35 * z })
        // Las hojas se deslizan dentro de la pared.
        gsap.set(r.leafL, { xPercent: -100 * state.open })
        gsap.set(r.leafR, { xPercent: 100 * state.open })
        gsap.set(r.spill, { opacity: state.open * (1 - z) })
        gsap.set(r.street, { scale: 1.06 + 0.25 * z })
        gsap.set(r.plants, { scale: 1 + 1.6 * z, opacity: 1 - z * 1.4 })
        gsap.set(r.copy, { autoAlpha: Math.max(0, 1 - state.open * 2.5) })
        gsap.set(r.inCopy, { autoAlpha: Math.max(0, (z - 0.82) / 0.18) })
      }
      apply()
      let opened = false
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (self) => {
            progress.current = self.progress
            if (!opened && self.progress > 0.08) {
              opened = true
              sfx.open()
            } else if (opened && self.progress < 0.04) opened = false
          },
        },
        onUpdate: apply,
      })
      tl.to(state, { open: 1, duration: 0.3, ease: 'power2.inOut' }, 0.02)
      tl.to(state, { zoom: 1, duration: 0.68, ease: 'power1.inOut' }, 0.3)
      // Al rearmarse (cambio de tamaño) arranca donde está el scroll, no en cero.
      tl.progress(tl.scrollTrigger?.progress ?? 0)
      apply()
      return () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    },
    { scope: rootRef, dependencies: [geo] },
  )

  // Entrada después del loader: la cápsula sube, las plantas entran de costado.
  useEffect(() => {
    if (!boarded || !geo) return
    const r = R.current
    gsap.fromTo(r.street, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, ease: 'power2.out' })
    gsap.fromTo(r.capsule, { y: 80, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.6, ease: 'expo.out', delay: 0.2 })
    gsap.fromTo(r.plantL, { xPercent: -60, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out', delay: 0.45 })
    gsap.fromTo(r.plantR, { xPercent: 60, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out', delay: 0.45 })
    gsap.fromTo(r.copy.querySelectorAll('[data-in]'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.9 })
  }, [boarded, geo])

  // Parallax con el puntero: cada capa a su velocidad.
  useEffect(() => {
    const pointer = trackPointer()
    let raf = 0
    const s = { x: 0, y: 0 }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      s.x += (pointer.x - s.x) * 0.06
      s.y += (pointer.y - s.y) * 0.06
      const r = R.current
      const k = 1 - Math.min(1, progress.current * 3) // se aquieta al entrar
      if (r.streetWrap) r.streetWrap.style.transform = `translate3d(${s.x * -14 * k}px, ${s.y * -8 * k}px, 0)`
      if (r.capsuleWrap) r.capsuleWrap.style.transform = `translate3d(${s.x * 10 * k}px, ${s.y * 6 * k}px, 0)`
      if (r.plantsWrap) r.plantsWrap.style.transform = `translate3d(${s.x * 34 * k}px, ${s.y * 14 * k}px, 0)`
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      pointer.dispose()
    }
  }, [])

  // Sobre la puerta se entreabre (solo antes de abrirla con el scroll).
  const peek = (on) => {
    const r = R.current
    if (progress.current > 0.03) {
      gsap.to([r.peekL, r.peekR], { xPercent: 0, duration: 0.3, overwrite: true })
      gsap.to(r.peekGlow, { opacity: 0, duration: 0.3, overwrite: true })
      return
    }
    gsap.to(r.peekL, { xPercent: on ? -9 : 0, duration: 0.6, ease: 'power3.out', overwrite: true })
    gsap.to(r.peekR, { xPercent: on ? 9 : 0, duration: 0.6, ease: 'power3.out', overwrite: true })
    gsap.to(r.peekGlow, { opacity: on ? 0.55 : 0, duration: 0.6, ease: 'power2.out', overwrite: true })
    if (on) sfx.hover()
  }
  const enter = () => {
    sfx.select()
    const root = rootRef.current
    const y = root.offsetTop + root.offsetHeight - window.innerHeight
    getLenis()?.scrollTo(y, { duration: 3.2 })
  }

  const big = R.current.big
  const set = (k) => (el) => (R.current[k] = el)
  const pct = (v) => `${v * 100}%`

  return (
    <section ref={rootRef} id="top" className="relative h-[360svh]" style={{ background: '#05070d', color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* 1. La calle y la cordillera. */}
        <div ref={set('streetWrap')} className="absolute -inset-[3%]">
          <img ref={set('street')} src={srcFor('street', big)} alt="" className="h-full w-full object-cover opacity-0" style={{ objectPosition: '50% 70%' }} />
        </div>

        {/* 2. El interior: solo por el hueco de la puerta. */}
        <div ref={set('inside')} className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(50%)' }}>
          <img ref={set('insideImg')} src={srcFor('interior', big)} alt="El interior de cāpsula33: el neón naranja, la barra plisada, las vitrinas y el jardín" className="h-full w-full object-cover" />
        </div>

        {/* 3–4. La cápsula: hojas de la puerta y la fachada con el hueco. */}
        {geo ? (
          <div ref={set('rig')} className="absolute inset-0 will-change-transform">
            <div ref={set('capsuleWrap')} className="absolute inset-0">
              <div ref={set('capsule')} className="absolute opacity-0" style={{ left: geo.left, top: geo.top, width: geo.W, height: geo.H }}>
                {/* Las hojas, dentro del hueco (se esconden bajo la pared al abrir). */}
                <div className="absolute overflow-hidden" style={{ left: pct(DOOR.left), top: pct(DOOR.top), width: pct(DOOR.width), height: pct(DOOR.height) }}>
                  {/* Cada hoja: el envoltorio se entreabre con el puntero, la imagen se abre con el scroll. */}
                  <div ref={set('peekL')} className="absolute top-0 left-0 h-full" style={{ width: pct(DOOR.split) }}>
                    <img ref={set('leafL')} src={srcFor('door-left')} alt="" className="h-full w-full" />
                  </div>
                  <div ref={set('peekR')} className="absolute top-0 right-0 h-full" style={{ width: pct(1 - DOOR.split) }}>
                    <img ref={set('leafR')} src={srcFor('door-right')} alt="" className="h-full w-full" />
                  </div>
                  <div ref={set('spill')} aria-hidden="true" className="absolute inset-0 opacity-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 55%, rgba(255,190,110,0.85), rgba(255,140,60,0.15) 70%, transparent)' }} />
                  <div ref={set('peekGlow')} aria-hidden="true" className="absolute inset-0 opacity-0" style={{ background: 'radial-gradient(ellipse 30% 60% at 50% 55%, rgba(255,190,110,0.9), transparent 70%)' }} />
                </div>
                <img ref={set('facade')} src={srcFor('facade', big)} alt="La fachada de cāpsula33: una cápsula espacial naranja con puertas en forma de pastilla y un ojo de buey" className="absolute inset-0 h-full w-full" draggable="false" />
                {/* El cartel. */}
                <p
                  className={`c33-sign absolute -translate-x-1/2 text-center leading-none font-light whitespace-nowrap ${hover === 'sign' ? 'is-flicker' : ''}`}
                  style={{ ...MONO, left: '68.5%', top: '15.4%', fontSize: geo.W * 0.03, color: '#fff3e6', textShadow: `0 0 6px #fff, 0 0 18px ${C.neon}, 0 0 38px ${C.neon}` }}
                  onMouseEnter={() => {
                    setHover('sign')
                    sfx.tick()
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  cāpsula33
                </p>
                {/* Zonas con efecto: la puerta y el ojo de buey. */}
                <button
                  type="button"
                  aria-label="Entrar a la cápsula"
                  onMouseEnter={() => peek(true)}
                  onMouseLeave={() => peek(false)}
                  onClick={enter}
                  className="absolute cursor-pointer rounded-[2vw]"
                  style={{ left: pct(DOOR.left), top: pct(DOOR.top), width: pct(DOOR.width), height: pct(DOOR.height) }}
                />
                <span
                  aria-hidden="true"
                  onMouseEnter={() => {
                    setHover('port')
                    sfx.lock()
                  }}
                  onMouseLeave={() => setHover(null)}
                  className="absolute rounded-full transition-[box-shadow,background] duration-700"
                  style={{
                    left: (PORT.cx - PORT.r) * geo.W,
                    top: PORT.cy * geo.H - PORT.r * geo.W,
                    width: PORT.r * 2 * geo.W,
                    height: PORT.r * 2 * geo.W,
                    background: hover === 'port' ? 'radial-gradient(circle, rgba(255,200,130,0.35), transparent 70%)' : 'transparent',
                    boxShadow: hover === 'port' ? `0 0 60px 10px rgba(255,150,70,0.45)` : 'none',
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* 5. Las plantas de la entrada, adelante. */}
        {geo ? (
          <div ref={set('plantsWrap')} className="pointer-events-none absolute inset-0">
            <div ref={set('plants')} className="absolute inset-0" style={{ transformOrigin: '50% 60%' }}>
              <img
                ref={set('plantL')}
                src={srcFor('plant-left', big)}
                alt=""
                className="absolute opacity-0"
                style={{ height: geo.H * 0.95, left: geo.left - geo.W * 0.07, top: geo.top + geo.H * BASE_LINE - geo.H * 0.95 + geo.H * 0.06 }}
              />
              <img
                ref={set('plantR')}
                src={srcFor('plant-right', big)}
                alt=""
                className="absolute opacity-0"
                style={{ height: geo.H * 0.9, left: geo.left + geo.W * 0.86, top: geo.top + geo.H * BASE_LINE - geo.H * 0.9 + geo.H * 0.06 }}
              />
            </div>
          </div>
        ) : null}

        {/* Viñeta y texto. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgba(5,7,13,0.75))' }} />
        <div ref={set('copy')} className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10">
          <header className="flex items-start justify-between gap-4">
            <p data-in className="text-[20px] font-light opacity-0 md:text-[22px]" style={MONO}>
              cāpsula<span style={{ color: C.orange }}>33</span>
            </p>
            <p data-in className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase opacity-0" style={MONO}>
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: status.open ? '#7dffa8' : C.orange, boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }} />
              {status.label}
            </p>
          </header>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[40rem]">
              <p data-in className="text-[11px] tracking-[0.2em] uppercase opacity-0" style={{ ...MONO, color: C.neon }}>
                Av. Gral. Roca 1120 · San Martín de los Andes
              </p>
              <h1 data-in className="mt-3 text-[clamp(1.9rem,3.4vw,3.2rem)] leading-[0.98] font-semibold uppercase opacity-0" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                Café de especialidad,
                <br />a bordo.
              </h1>
            </div>
            <button
              type="button"
              data-in
              onClick={enter}
              onMouseEnter={() => sfx.buttonHover()}
              className="pointer-events-auto flex items-center gap-3 rounded-full border px-6 py-3 text-[12px] font-semibold tracking-[0.2em] uppercase opacity-0 transition-colors duration-300 hover:border-[#e4601d] active:scale-[0.97]"
              style={{ ...MONO, borderColor: 'rgba(242,233,220,0.35)', background: 'rgba(5,7,13,0.45)', backdropFilter: 'blur(8px)' }}
            >
              <span aria-hidden="true" className="c33-scrollcue inline-block h-4 w-px" style={{ background: C.neon }} />
              Scroll para entrar
            </button>
          </div>
        </div>

        {/* Adentro. */}
        <div ref={set('inCopy')} className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-10 opacity-0 md:px-10" style={{ background: 'linear-gradient(to top, rgba(5,7,13,0.85), transparent)' }}>
          <p className="text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            Bienvenidos a bordo
          </p>
          <p className="mt-3 max-w-[40ch] text-[16px] leading-[1.55]" style={{ ...BODY, color: 'rgba(242,233,220,0.85)' }}>
            Café de especialidad, cocina de estación y la colección del dueño en vitrinas. A cuadras del lago Lácar.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes c33-flicker { 0%, 100% { opacity: 1; } 8% { opacity: 0.35; } 12% { opacity: 1; } 18% { opacity: 0.5; } 22% { opacity: 1; } 60% { opacity: 0.85; } }
        .c33-sign { transition: text-shadow 300ms; cursor: default; }
        .c33-sign.is-flicker { animation: c33-flicker 0.9s steps(1, end) 1; }
        @keyframes c33-cue { 0% { transform: scaleY(0); transform-origin: top; } 50% { transform: scaleY(1); transform-origin: top; } 51% { transform-origin: bottom; } 100% { transform: scaleY(0); transform-origin: bottom; } }
        .c33-scrollcue { animation: c33-cue 1.8s cubic-bezier(0.22,1,0.36,1) infinite; }
      `}</style>
    </section>
  )
}

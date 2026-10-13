import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { trackPointer } from '../../lib/motion'
import { sfx } from './sfx'
import { C, MONO, BODY, openStatus } from './brand'

/**
 * cāpsula33 — Hero: el café es un módulo de la nave.
 *
 * El loader salta al hiperespacio y del otro lado está el hangar: el ventanal
 * negro de la fachada real es el espacio (estrellas en tres profundidades y un
 * planeta), y la entrada naranja del local —el cartel, el ojo de buey, la
 * puerta de ventanas en pastilla, el ventanal con listones— está acoplada en
 * el piso mojado de la cubierta. Capas, de atrás hacia adelante: espacio,
 * hangar, interior (solo por el hueco de la puerta), módulo, el marco de la
 * escotilla desde la que miramos y el titular, que flota.
 *
 * Puntero: cada capa a su velocidad y el titular se inclina; las letras cerca
 * del puntero se levantan y se encienden. Scroll: el titular se desarma, las
 * hojas se esconden en la pared, nos acercamos y entramos al pasillo.
 *
 * Imágenes generadas (Higgsfield) a partir de las fotos del dueño, que no se
 * publican. Las hojas salen de la misma imagen del módulo: calzan exacto.
 */

const BASE = '/studio/capsula33/ship/'
const FRAME = { w: 2688, h: 1520 }
// Dentro de la imagen del módulo (2688 × 1520), en fracciones.
const DOOR = { left: 1018 / 2688, top: 422 / 1520, width: 574 / 2688, height: 801 / 1520, split: 285 / 574 }
const PORT = { cx: 538 / 2688, cy: 800 / 1520, r: 0.066 }
const SIGN = { left: 0.13, top: 0.21, width: 0.23, height: 0.08 }
const BASE_LINE = 1297 / 1520 // el borde de abajo del escalón
const MODULE_SCALE = 0.58 // el módulo, relativo al hangar

const LINES = ['Café de especialidad,', 'a bordo.']
// El reflejo es la imagen dada vuelta: la máscara va en sus coordenadas sin dar vuelta (lo cercano al zócalo, visible).
const REFLECTION_MASK = 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.9) 86%)'

const LAYERS = ['deck', 'module', 'interior', 'door-l', 'door-r']
function srcFor(name, big) {
  if (name === 'door-l') return `${BASE}door-l-285.webp`
  if (name === 'door-r') return `${BASE}door-r-289.webp`
  return `${BASE}${name}-${big ? 2688 : 1400}.webp`
}

/** El hangar cubre la pantalla; el módulo se apoya en el piso con la puerta al centro. */
function layout(vw, vh) {
  const Fw = Math.max(vw, (vh * FRAME.w) / FRAME.h)
  const Fh = (Fw * FRAME.h) / FRAME.w
  const frame = { left: (vw - Fw) / 2, top: (vh - Fh) / 2, w: Fw, h: Fh }
  const portrait = vw / vh < 0.9
  const W = portrait ? Math.min(MODULE_SCALE * Fw, vw * 1.3) : MODULE_SCALE * Fw
  const H = (W * FRAME.h) / FRAME.w
  const left = vw / 2 - (DOOR.left + DOOR.width / 2) * W
  const top = frame.top + Fh * (portrait ? 0.76 : 0.8) - BASE_LINE * H
  const door = { x: left + DOOR.left * W, y: top + DOOR.top * H, w: DOOR.width * W, h: DOOR.height * H }
  // Escala final: el hueco de la puerta tapa la pantalla con margen (las esquinas salen de cuadro).
  const S = Math.max((vw * 1.35) / door.w, (vh * 1.35) / door.h)
  return { frame, W, H, left, top, door, S, portrait }
}

/** El espacio detrás del ventanal: tres profundidades de estrellas que se corren con el puntero. */
function createSpace(canvas) {
  const ctx = canvas.getContext('2d')
  let w = 0
  let h = 0
  let dpr = 1
  let stars = []
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    const count = Math.round((w * h) / 2600)
    stars = Array.from({ length: count }, () => {
      const d = Math.random()
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        d, // 0 lejos · 1 cerca
        r: 0.35 + d * d * 1.5,
        a: 0.25 + Math.random() * 0.7,
        tw: Math.random() * Math.PI * 2,
        warm: Math.random() > 0.93,
      }
    })
  }
  const view = { x: 0, y: 0, drift: 0 }
  let raf = 0
  let last = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(50, now - last)
    last = now
    view.drift += dt * 0.004
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    for (const s of stars) {
      const k = 6 + s.d * 26
      let x = (s.x - view.x * k - view.drift * (0.2 + s.d)) % w
      if (x < 0) x += w
      const y = s.y - view.y * k * 0.6
      const tw = 0.75 + 0.25 * Math.sin(now * 0.0016 + s.tw)
      ctx.globalAlpha = s.a * tw
      ctx.fillStyle = s.warm ? '#ffb27a' : '#eef2ff'
      ctx.beginPath()
      ctx.arc(x, y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  resize()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(frame)
  return {
    view,
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    },
  }
}

export default function ShipHero({ boarded, onProgress = () => {}, onReady = () => {} }) {
  const rootRef = useRef(null)
  const R = useRef({ chars: [] })
  const [geo, setGeo] = useState(null)
  const [hover, setHover] = useState(null)
  const [status] = useState(() => openStatus())
  const scroll = useRef({ p: 0, fade: 0 })

  // Precarga de las capas: alimenta el loader.
  useEffect(() => {
    const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1600
    R.current.big = big
    let done = 0
    Promise.all(
      LAYERS.map(
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
      ),
    ).then(() => onReady())
    // El loader llama una vez; los callbacks son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const measure = () => setGeo(layout(window.innerWidth, window.innerHeight))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // El espacio.
  useEffect(() => {
    const space = createSpace(R.current.space)
    R.current.spaceView = space.view
    return () => space.dispose()
  }, [])

  // El recorrido: el titular se desarma, la puerta se abre, entramos.
  useGSAP(
    () => {
      if (!geo) return undefined
      const { door, S } = geo
      const vw = window.innerWidth
      const vh = window.innerHeight
      const r = R.current
      const dcx = door.x + door.w / 2
      const dcy = door.y + door.h / 2
      const state = { fade: 0, open: 0, zoom: 0 }
      gsap.set([r.rig, r.deck, r.spaceZoom], { transformOrigin: `${dcx}px ${dcy}px` })
      const apply = () => {
        const z = state.zoom
        const s = 1 + (S - 1) * z * z * (3 - 2 * z)
        const tx = (vw / 2 - dcx) * z
        const ty = (vh / 2 - dcy) * z
        gsap.set(r.rig, { x: tx, y: ty, scale: s })
        gsap.set(r.deck, { x: tx * 0.5, y: ty * 0.5, scale: 1 + 0.9 * z })
        gsap.set(r.spaceZoom, { scale: 1 + 0.15 * z })
        // El interior, solo por el hueco (que crece con la escala).
        const cx = dcx + tx
        const cy = dcy + ty
        const hw = (door.w / 2) * s
        const hh = (door.h / 2) * s
        const rad = 0.012 * geo.W * s * (1 - z)
        r.inside.style.clipPath = `inset(${Math.max(0, cy - hh)}px ${Math.max(0, vw - (cx + hw))}px ${Math.max(0, vh - (cy + hh))}px ${Math.max(0, cx - hw)}px round ${rad}px)`
        gsap.set(r.insideImg, { scale: 1.3 - 0.3 * z })
        gsap.set(r.leafL, { xPercent: -100 * state.open })
        gsap.set(r.leafR, { xPercent: 100 * state.open })
        gsap.set(r.spill, { opacity: state.open * (1 - z) })
        // La escotilla desde la que miramos: la cruzamos primero.
        gsap.set(r.hatch, { scale: 1 + 0.5 * state.fade + 0.6 * z, opacity: 1 - Math.min(1, z * 2.2) })
        gsap.set(r.chrome, { autoAlpha: 1 - Math.min(1, state.fade * 1.6) })
        gsap.set(r.inCopy, { autoAlpha: Math.max(0, (z - 0.82) / 0.18) })
        scroll.current.fade = state.fade
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
            scroll.current.p = self.progress
            if (!opened && self.progress > 0.12) {
              opened = true
              sfx.open()
            } else if (opened && self.progress < 0.06) opened = false
          },
        },
        onUpdate: apply,
      })
      tl.to(state, { fade: 1, duration: 0.16, ease: 'none' }, 0)
      tl.to(state, { open: 1, duration: 0.24, ease: 'power2.inOut' }, 0.1)
      tl.to(state, { zoom: 1, duration: 0.66, ease: 'power1.inOut' }, 0.32)
      tl.progress(tl.scrollTrigger?.progress ?? 0)
      apply()
      return () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    },
    { scope: rootRef, dependencies: [geo] },
  )

  // Entrada después del salto: el hangar se enciende, el módulo se asienta, el titular baja flotando.
  useEffect(() => {
    if (!boarded || !geo) return
    const r = R.current
    gsap.fromTo(r.deck, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6, ease: 'power2.out' })
    gsap.fromTo(r.module, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.8, ease: 'expo.out', delay: 0.25 })
    gsap.fromTo(r.hatch, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power2.out', delay: 0.1 })
    // Por palabra: las letras las maneja el loop del puntero.
    gsap.fromTo(r.title.querySelectorAll('[data-word]'), { autoAlpha: 0, yPercent: 70 }, { autoAlpha: 1, yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.7 })
    gsap.fromTo(r.chrome.querySelectorAll('[data-in]'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 1.2 })
  }, [boarded, geo])

  // Un solo loop: parallax de capas, el titular que flota y las letras que reaccionan al puntero.
  useEffect(() => {
    if (!geo) return undefined
    const pointer = trackPointer()
    const noHover = window.matchMedia('(hover: none)').matches
    const r = R.current
    // Centro de cada letra respecto del titular (sin transformar).
    const measure = () => {
      const box = r.title.getBoundingClientRect()
      r.titleBox = { w: box.width, h: box.height }
      r.charPos = r.chars.map((el) => {
        let x = 0
        let y = 0
        let n = el
        while (n && n !== r.title) {
          x += n.offsetLeft
          y += n.offsetTop
          n = n.offsetParent
        }
        return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2, seed: Math.random() }
      })
    }
    measure()
    document.fonts?.ready.then(measure)
    const s = { x: 0, y: 0, px: -9999, py: -9999 }
    const lift = r.chars.map(() => 0)
    let raf = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      s.x += (pointer.x - s.x) * 0.06
      s.y += (pointer.y - s.y) * 0.06
      const { p, fade } = scroll.current
      const k = 1 - Math.min(1, p * 2.5)
      if (r.spaceView) {
        r.spaceView.x = s.x
        r.spaceView.y = s.y
      }
      r.spaceWrap.style.transform = `translate3d(${s.x * -10 * k}px, ${s.y * -6 * k}px, 0)`
      r.deckWrap.style.transform = `translate3d(${s.x * -18 * k}px, ${s.y * -9 * k}px, 0)`
      r.moduleWrap.style.transform = `translate3d(${s.x * -30 * k}px, ${s.y * -12 * k}px, 0)`
      r.hatchWrap.style.transform = `translate3d(${s.x * -56 * k}px, ${s.y * -22 * k}px, 0)`
      // El titular flota (respira) y se inclina hacia el puntero.
      const bob = Math.sin(now * 0.0011) * 6
      r.titleWrap.style.transform = `translate3d(${s.x * 26}px, ${s.y * 14 + bob}px, 0) rotateX(${-s.y * 7}deg) rotateY(${s.x * 9}deg)`
      if (!r.charPos) return
      // Letras: cerca del puntero se levantan y encienden; con el scroll se desarman hacia arriba.
      const box = r.title.getBoundingClientRect()
      const mx = pointer.clientX - box.left
      const my = pointer.clientY - box.top
      const reach = Math.max(90, r.titleBox.h * 0.6)
      const sweep = ((now % 5200) / 2600 - 0.25) * r.titleBox.w * 1.4
      const n = r.chars.length
      for (let i = 0; i < n; i += 1) {
        const c = r.charPos[i]
        // Sin mouse (teléfono): una pasada de luz recorre el titular cada tanto.
        const d = fade > 0.02 ? 9e9 : noHover ? Math.abs(sweep - c.x) * 0.8 : pointer.touching ? 9e9 : Math.hypot(mx - c.x, my - c.y)
        const target = Math.max(0, 1 - d / reach)
        lift[i] += (target - lift[i]) * 0.12
        const l = lift[i]
        const order = Math.abs(i - n / 2) / (n / 2) // desde el centro hacia los costados
        const f = Math.max(0, Math.min(1, fade * 1.6 - order * 0.6))
        const el = r.chars[i]
        el.style.transform = `translate3d(0, ${-l * 0.16 - f * (0.6 + c.seed * 0.9)}em, ${l * 40}px) rotate(${(c.seed - 0.5) * 24 * f}deg)`
        el.style.opacity = String(1 - f)
        el.style.color = l > 0.02 ? `color-mix(in srgb, ${C.neon} ${Math.round(l * 100)}%, ${C.cream})` : ''
        el.style.textShadow = l > 0.02 ? `0 0 ${Math.round(l * 28)}px rgba(255,122,26,${(l * 0.8).toFixed(2)})` : ''
      }
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      pointer.dispose()
    }
  }, [geo])

  const peek = (on) => {
    const r = R.current
    if (scroll.current.p > 0.05) return
    gsap.to(r.peekL, { xPercent: on ? -9 : 0, duration: 0.6, ease: 'power3.out', overwrite: true })
    gsap.to(r.peekR, { xPercent: on ? 9 : 0, duration: 0.6, ease: 'power3.out', overwrite: true })
    gsap.to(r.peekGlow, { opacity: on ? 0.6 : 0, duration: 0.6, ease: 'power2.out', overwrite: true })
  }
  const enter = () => {
    const root = rootRef.current
    getLenis()?.scrollTo(root.offsetTop + root.offsetHeight - window.innerHeight, { duration: 3.2 })
  }

  const big = R.current.big
  const set = (k) => (el) => (R.current[k] = el)
  const pct = (v) => `${v * 100}%`
  R.current.chars = []
  let ci = 0
  const charRef = (el) => {
    if (el) R.current.chars.push(el)
  }

  return (
    <section ref={rootRef} id="top" className="relative h-[380svh]" style={{ background: '#03040a', color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden" style={{ perspective: '1100px' }}>
        {/* 1. El espacio, del otro lado del ventanal. */}
        <div ref={set('spaceWrap')} className="absolute -inset-[4%]">
          <div ref={set('spaceZoom')} className="absolute inset-0">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 45% 40% at 68% 30%, rgba(74,36,112,0.75), transparent 70%), radial-gradient(ellipse 40% 45% at 26% 50%, rgba(18,64,102,0.6), transparent 70%), #03040a' }} />
            <canvas ref={set('space')} aria-hidden="true" className="absolute inset-0 h-full w-full" />
            {/* Un planeta lejano, casi todo de noche: solo el borde que da al sol. */}
            <div aria-hidden="true" className="absolute" style={{ left: '68%', top: '13%', width: 'min(15vw, 27vh)', aspectRatio: '1' }}>
              <span className="absolute -inset-[18%] rounded-full" style={{ background: 'radial-gradient(circle at 62% 38%, rgba(255,140,70,0.28), transparent 62%)' }} />
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 78% 26%, #ffd2a0 0%, #e87a3a 9%, #7a2c14 24%, #1c0a08 46%, #050308 70%)',
                  boxShadow: 'inset 2px -2px 0 rgba(255,190,130,0.35), 6px -6px 28px rgba(255,120,50,0.22)',
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. El hangar (el ventanal recortado deja ver el espacio). */}
        {geo ? (
          <div ref={set('deckWrap')} className="absolute inset-0">
            <img
              ref={set('deck')}
              src={srcFor('deck', big)}
              alt=""
              className="absolute max-w-none opacity-0"
              style={{ left: geo.frame.left - geo.frame.w * 0.03, top: geo.frame.top - geo.frame.h * 0.03, width: geo.frame.w * 1.06, height: geo.frame.h * 1.06 }}
            />
          </div>
        ) : null}

        {/* 3. El interior: solo por el hueco de la puerta. */}
        <div ref={set('inside')} className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(50%)' }}>
          <img ref={set('insideImg')} src={srcFor('interior', big)} alt="El pasillo de cāpsula33: el neón naranja del techo, las vitrinas en la pared blanca, el jardín en arcos y la barra plisada al fondo" className="h-full w-full object-cover" />
        </div>

        {/* 4. El módulo: reflejo, hojas, la fachada con el hueco y sus zonas vivas. */}
        {geo ? (
          <div ref={set('rig')} className="absolute inset-0 will-change-transform">
            <div ref={set('moduleWrap')} className="absolute inset-0">
              <div ref={set('module')} className="absolute opacity-0" style={{ left: geo.left, top: geo.top, width: geo.W, height: geo.H }}>
                {/* Luz naranja sobre el piso mojado y el reflejo del módulo. */}
                <div aria-hidden="true" className="absolute" style={{ left: '4%', right: '4%', top: pct(BASE_LINE - 0.04), height: '42%', background: 'radial-gradient(ellipse 50% 40% at 50% 10%, rgba(255,122,26,0.32), transparent 72%)', mixBlendMode: 'screen' }} />
                <img
                  src={srcFor('module', big)}
                  alt=""
                  aria-hidden="true"
                  className="absolute left-0 w-full"
                  style={{ top: pct(BASE_LINE * 2 - 1), height: '100%', transform: 'scaleY(-1)', opacity: 0.3, filter: 'blur(3px)', maskImage: REFLECTION_MASK, WebkitMaskImage: REFLECTION_MASK }}
                />
                {/* Las hojas, dentro del hueco (se esconden bajo la pared al abrir). */}
                <div className="absolute overflow-hidden" style={{ left: pct(DOOR.left), top: pct(DOOR.top), width: pct(DOOR.width), height: pct(DOOR.height) }}>
                  <div ref={set('peekL')} className="absolute top-0 left-0 h-full" style={{ width: pct(DOOR.split) }}>
                    <img ref={set('leafL')} src={srcFor('door-l')} alt="" className="h-full w-full" />
                  </div>
                  <div ref={set('peekR')} className="absolute top-0 right-0 h-full" style={{ width: pct(1 - DOOR.split) }}>
                    <img ref={set('leafR')} src={srcFor('door-r')} alt="" className="h-full w-full" />
                  </div>
                  <div ref={set('spill')} aria-hidden="true" className="absolute inset-0 opacity-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 55%, rgba(255,190,110,0.8), rgba(255,140,60,0.12) 70%, transparent)' }} />
                  <div ref={set('peekGlow')} aria-hidden="true" className="absolute inset-0 opacity-0" style={{ background: 'radial-gradient(ellipse 22% 60% at 50% 55%, rgba(255,200,120,0.95), transparent 70%)' }} />
                </div>
                <img src={srcFor('module', big)} alt="La entrada de cāpsula33: un módulo naranja de bordes redondeados con el cartel iluminado, un ojo de buey, la puerta con dos ventanas en pastilla y un ventanal con listones" className="absolute inset-0 h-full w-full" draggable="false" />
                {/* El cartel: al pasar, titila el neón. */}
                <span
                  aria-hidden="true"
                  onMouseEnter={() => setHover('sign')}
                  onMouseLeave={() => setHover(null)}
                  className={`c33-signglow absolute ${hover === 'sign' ? 'is-flicker' : ''}`}
                  style={{ left: pct(SIGN.left), top: pct(SIGN.top), width: pct(SIGN.width), height: pct(SIGN.height) }}
                />
                {/* El ojo de buey: la pantalla late. */}
                <span
                  aria-hidden="true"
                  onMouseEnter={() => setHover('port')}
                  onMouseLeave={() => setHover(null)}
                  className="absolute rounded-full transition-[box-shadow,background] duration-700"
                  style={{
                    left: (PORT.cx - PORT.r) * geo.W,
                    top: PORT.cy * geo.H - PORT.r * geo.W,
                    width: PORT.r * 2 * geo.W,
                    height: PORT.r * 2 * geo.W,
                    background: hover === 'port' ? 'radial-gradient(circle, rgba(255,214,160,0.4), transparent 68%)' : 'transparent',
                    boxShadow: hover === 'port' ? '0 0 70px 14px rgba(255,140,60,0.45)' : 'none',
                    animation: hover === 'port' ? 'c33-pulse 1.4s ease-in-out infinite' : 'none',
                  }}
                />
                <button
                  type="button"
                  aria-label="Entrar al café"
                  onMouseEnter={() => peek(true)}
                  onMouseLeave={() => peek(false)}
                  onFocus={() => peek(true)}
                  onBlur={() => peek(false)}
                  onClick={enter}
                  className="absolute cursor-pointer rounded-[1vw] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7a1a]"
                  style={{ left: pct(DOOR.left), top: pct(DOOR.top), width: pct(DOOR.width), height: pct(DOOR.height) }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* 5. La escotilla desde la que miramos: marco oscuro con su luz azul, lo más cerca. */}
        <div ref={set('hatchWrap')} aria-hidden="true" className="pointer-events-none absolute -inset-[3%]">
          <div ref={set('hatch')} className="absolute inset-0 opacity-0" style={{ transformOrigin: '50% 55%' }}>
            <div className="absolute inset-y-0 left-0 w-[7vw] min-w-8" style={{ background: 'linear-gradient(to right, #020306 70%, rgba(2,3,6,0))' }}>
              <span className="absolute top-[18%] right-[30%] bottom-[18%] w-px" style={{ background: 'linear-gradient(to bottom, transparent, #6fa8ff 20%, #6fa8ff 80%, transparent)', boxShadow: '0 0 12px #3d7bff' }} />
            </div>
            <div className="absolute inset-y-0 right-0 w-[7vw] min-w-8" style={{ background: 'linear-gradient(to left, #020306 70%, rgba(2,3,6,0))' }}>
              <span className="absolute top-[18%] bottom-[18%] left-[30%] w-px" style={{ background: 'linear-gradient(to bottom, transparent, #6fa8ff 20%, #6fa8ff 80%, transparent)', boxShadow: '0 0 12px #3d7bff' }} />
            </div>
            <div className="absolute inset-x-0 top-0 h-[9vh]" style={{ background: 'linear-gradient(to bottom, #020306 55%, rgba(2,3,6,0))' }} />
            <div className="absolute inset-x-0 bottom-0 h-[16vh]" style={{ background: 'linear-gradient(to top, #020306 30%, rgba(2,3,6,0))' }} />
          </div>
        </div>

        {/* 6. El titular, flotando. */}
        <div className="pointer-events-none absolute inset-x-0 top-[13svh] flex justify-center px-6 sm:top-[11svh]" style={{ transformStyle: 'preserve-3d' }}>
          <div ref={set('titleWrap')} className="will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
            <h1
              ref={set('title')}
              className="text-center text-[clamp(1.9rem,4.8vw,4.9rem)] leading-[0.95] font-semibold tracking-[-0.01em] uppercase select-none"
              style={{ fontFamily: "'Archivo', sans-serif", fontVariationSettings: "'wdth' 118", transformStyle: 'preserve-3d', textShadow: '0 2px 30px rgba(3,4,10,0.6)' }}
              aria-label={LINES.join(' ')}
            >
              {LINES.map((line) => (
                <span key={line} aria-hidden="true" className="block sm:whitespace-nowrap">
                  {line.split(' ').map((word, wi, words) => (
                    <span key={wi} data-word className="inline-block whitespace-nowrap">
                      {[...word].map((ch) => (
                        <span key={ci++} ref={charRef} className="inline-block will-change-transform">
                          {ch}
                        </span>
                      ))}
                      {wi < words.length - 1 ? ' ' : null}
                    </span>
                  ))}
                </span>
              ))}
            </h1>
          </div>
        </div>

        {/* La interfaz de la nave: marca, estado, dirección y la llamada. */}
        <div ref={set('chrome')} className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10">
          <header className="flex items-start justify-between gap-4">
            <p data-in className="text-[20px] font-light opacity-0 md:text-[22px]" style={MONO}>
              cāpsula<span style={{ color: C.orange }}>33</span>
            </p>
            <p data-in className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase opacity-0" style={MONO}>
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: status.open ? '#7dffa8' : C.orange, boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }} />
              <span>
                {status.label.split(' · ')[0]}
                {status.label.includes(' · ') ? <span className="hidden sm:inline"> · {status.label.split(' · ').slice(1).join(' · ')}</span> : null}
              </span>
            </p>
          </header>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <p data-in className="max-w-[34rem] text-[11px] leading-[1.7] tracking-[0.18em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.7)' }}>
              <span style={{ color: C.neon }}>Módulo C33 · acoplado</span>
              <br />
              Av. Gral. Roca 1120 · San Martín de los Andes
            </p>
            <button
              type="button"
              data-in
              onClick={enter}
              className="c33-cta pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full border px-6 py-3 text-[12px] font-semibold tracking-[0.2em] uppercase opacity-0 active:scale-[0.97]"
              style={{ ...MONO, borderColor: 'rgba(242,233,220,0.35)', background: 'rgba(3,4,10,0.5)', backdropFilter: 'blur(8px)' }}
            >
              <span aria-hidden="true" className="c33-cta-fill absolute inset-0" style={{ background: C.orange }} />
              <span aria-hidden="true" className="c33-scrollcue relative inline-block h-4 w-px" style={{ background: C.neon }} />
              <span className="relative">Scroll para entrar</span>
            </button>
          </div>
        </div>

        {/* Adentro. */}
        <div ref={set('inCopy')} className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-10 opacity-0 md:px-10" style={{ background: 'linear-gradient(to top, rgba(3,4,10,0.85), transparent)' }}>
          <p className="text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            Bienvenidos, exploradores de universos
          </p>
          <p className="mt-3 max-w-[40ch] text-[16px] leading-[1.55]" style={{ ...BODY, color: 'rgba(242,233,220,0.85)' }}>
            Café de especialidad, cocina de estación y la colección del dueño en vitrinas. A cuadras del lago Lácar.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes c33-flicker { 0%, 100% { opacity: 0; } 6% { opacity: 1; } 10% { opacity: 0.1; } 16% { opacity: 0.9; } 22% { opacity: 0.2; } 30% { opacity: 1; } 70% { opacity: 0.7; } }
        .c33-signglow { cursor: default; mix-blend-mode: screen; opacity: 0; background: radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,236,210,0.55), rgba(255,140,60,0.25) 55%, transparent 75%); filter: blur(6px); }
        .c33-signglow.is-flicker { animation: c33-flicker 1.1s steps(1, end) 1 forwards; }
        @keyframes c33-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        @keyframes c33-cue { 0% { transform: scaleY(0); transform-origin: top; } 50% { transform: scaleY(1); transform-origin: top; } 51% { transform-origin: bottom; } 100% { transform: scaleY(0); transform-origin: bottom; } }
        .c33-scrollcue { animation: c33-cue 1.8s cubic-bezier(0.22,1,0.36,1) infinite; }
        .c33-cta { transition: border-color 300ms var(--ease-out, cubic-bezier(0.22,1,0.36,1)), color 300ms, transform 160ms var(--ease-out, ease-out); }
        .c33-cta-fill { transform: scaleX(0); transform-origin: left; transition: transform 500ms cubic-bezier(0.22,1,0.36,1); }
        @media (hover: hover) {
          .c33-cta:hover { border-color: ${C.orange}; color: #070708; }
          .c33-cta:hover .c33-cta-fill { transform: scaleX(1); }
          .c33-cta:hover .c33-scrollcue { background: #070708 !important; }
        }
        .c33-cta:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 3px; }
      `}</style>
    </section>
  )
}

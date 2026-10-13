import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { trackPointer } from '../../lib/motion'
import { sfx } from './sfx'
import { createCorridorScene } from './corridorScene'
import { C, MONO, BODY, openStatus } from './brand'

/**
 * cāpsula33 — Hero: el café es un módulo de la nave.
 *
 * Del otro lado del salto del loader hay un pasillo de nave (gris, costillas
 * octogonales, luces en pastilla) y, empotrada en la pared del fondo, la
 * entrada real del local: el cartel, el ojo de buey «c̄33», la puerta de
 * ventanas en pastilla y el ventanal con listones. El pasillo es 3D
 * (`corridorScene.js`): el puntero mueve la cámara con parallax real y el
 * scroll camina hasta la puerta, la abre y entra.
 *
 * Arriba, en DOM: el titular que flota (se inclina con el puntero, las letras
 * cercanas se encienden y al scrollear se desarma), la interfaz y las zonas
 * vivas de la entrada (cartel que titila, ojo de buey que late, puerta que se
 * entreabre), ubicadas cada cuadro donde las pone la cámara.
 *
 * Imágenes generadas (Higgsfield) con las fotos del dueño como referencia; las
 * fotos no se publican.
 */

const BASE = '/studio/capsula33/ship/'
const LINES = ['Café de especialidad,', 'a bordo.']

function sources() {
  const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1600
  const s = big ? 2688 : 1400
  return {
    corridor: `${BASE}corridor-${s}.webp`,
    module: `${BASE}module-${s}.webp`,
    interior: `${BASE}interior-${s}.webp`,
    doorL: `${BASE}door-l-285.webp`,
    doorR: `${BASE}door-r-289.webp`,
  }
}

export default function ShipHero({ boarded, onProgress = () => {}, onReady = () => {} }) {
  const rootRef = useRef(null)
  const R = useRef({ chars: [] })
  const [hover, setHover] = useState(null)
  const [status] = useState(() => openStatus())
  const scroll = useRef({ p: 0, fade: 0 })

  // El pasillo: carga las imágenes (alimenta el loader) y ubica las zonas vivas cada cuadro.
  // De layout: el recorrido de abajo (useGSAP, también de layout) ya necesita la escena.
  useLayoutEffect(() => {
    const r = R.current
    const place = (el, rect, pad = 0) => {
      if (!el || !rect) return
      el.style.transform = `translate3d(${rect.x - pad}px, ${rect.y - pad}px, 0)`
      el.style.width = `${rect.w + pad * 2}px`
      el.style.height = `${rect.h + pad * 2}px`
    }
    const scene = createCorridorScene(r.canvas, {
      srcs: sources(),
      onProgress,
      onReady,
      onFrame: () => {
        r.rects = { sign: scene.screenRect('sign'), port: scene.screenRect('port'), door: scene.screenRect('door') }
        place(r.sign, r.rects.sign, 8)
        place(r.port, r.rects.port)
        place(r.door, r.rects.door)
      },
    })
    r.scene = scene
    return () => scene.dispose()
    // El loader llama una vez; los callbacks son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El recorrido: el titular se desarma, caminamos, la puerta se abre, entramos.
  useGSAP(
    () => {
      const r = R.current
      const cam = r.scene.state
      const state = { fade: 0 }
      const apply = () => {
        scroll.current.fade = state.fade
        gsap.set(r.chrome, { autoAlpha: 1 - Math.min(1, state.fade * 1.6) })
        gsap.set(r.spots, { autoAlpha: 1 - Math.min(1, state.fade * 3) })
        // Cruzada la puerta, el interior pasa al DOM (en alta) y se abre hasta verse entero.
        const stop = r.scene.ENTER_STOP
        const k = Math.max(0, Math.min(1, (cam.enter - stop) / (1 - stop)))
        const s0 = r.scene.insideCover()
        const e = 1 - Math.pow(1 - k, 3)
        gsap.set(r.insideImg, { autoAlpha: cam.enter >= stop ? 1 : 0, scale: s0 + (1 - s0) * e })
        gsap.set(r.inCopy, { autoAlpha: Math.max(0, (k - 0.55) / 0.45) })
        gsap.set(r.vignette, { opacity: 1 - 0.7 * k })
      }
      let opened = false
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          onUpdate: (self) => {
            scroll.current.p = self.progress
            if (!opened && self.progress > 0.5) {
              opened = true
              sfx.open()
            } else if (opened && self.progress < 0.44) opened = false
          },
        },
        onUpdate: apply,
      })
      tl.to(state, { fade: 1, duration: 0.14, ease: 'none' }, 0)
      tl.to(cam, { walk: 1, duration: 0.52, ease: 'none' }, 0.06)
      tl.to(cam, { open: 1, duration: 0.18, ease: 'power2.inOut' }, 0.5)
      tl.to(cam, { enter: 1, duration: 0.34, ease: 'none' }, 0.62)
      tl.progress(tl.scrollTrigger?.progress ?? 0)
      apply()
      return () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    },
    { scope: rootRef },
  )

  // Entrada después del salto: el pasillo se enciende, el titular baja flotando.
  useEffect(() => {
    if (!boarded) return
    const r = R.current
    gsap.fromTo(r.canvas, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 2.2, ease: 'expo.out' })
    gsap.fromTo(r.title.querySelectorAll('[data-word]'), { autoAlpha: 0, yPercent: 70 }, { autoAlpha: 1, yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.6 })
    gsap.fromTo(r.chrome.querySelectorAll('[data-in]'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 1.1 })
  }, [boarded])

  // Un solo loop: la cámara sigue al puntero, el titular flota y sus letras reaccionan.
  useEffect(() => {
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
    const onMove = () => (r.moved = true)
    window.addEventListener('pointermove', onMove, { once: true })
    const s = { x: 0, y: 0 }
    const lift = r.chars.map(() => 0)
    let raf = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      s.x += (pointer.x - s.x) * 0.05
      s.y += (pointer.y - s.y) * 0.05
      const { fade } = scroll.current
      if (r.scene) {
        const st = r.scene.state
        st.px = s.x
        st.py = s.y
        // Zonas vivas por geometría (se mueven con la cámara: mouseenter/leave no alcanza).
        const P = pointer
        const inside = (q, pad = 0) => q && P.clientX >= q.x - pad && P.clientX <= q.x + q.w + pad && P.clientY >= q.y - pad && P.clientY <= q.y + q.h + pad
        const live = r.moved && !noHover && !P.touching && fade < 0.02 && r.rects
        const over = !live ? null : inside(r.rects.door) ? 'door' : inside(r.rects.sign, 8) ? 'sign' : inside(r.rects.port) ? 'port' : null
        if (over !== r.over) {
          r.over = over
          setHover(over)
        }
        const want = (over === 'door' || r.focusDoor) && fade < 0.02 ? 1 : 0
        st.peek += (want - st.peek) * 0.08
        st.glow += (want - st.glow) * 0.08
      }
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
      window.removeEventListener('pointermove', onMove)
      pointer.dispose()
    }
  }, [])

  const enter = () => {
    const root = rootRef.current
    getLenis()?.scrollTo(root.offsetTop + root.offsetHeight - window.innerHeight, { duration: 4 })
  }

  const set = (k) => (el) => (R.current[k] = el)
  R.current.chars = []
  let ci = 0
  const charRef = (el) => {
    if (el) R.current.chars.push(el)
  }

  return (
    <section ref={rootRef} id="top" className="relative h-[420svh]" style={{ background: '#05060a', color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden" style={{ perspective: '1100px' }}>
        <canvas ref={set('canvas')} className="absolute inset-0 h-full w-full opacity-0" role="img" aria-label="Un pasillo de nave espacial gris con luces blancas; al fondo, empotrada en la pared, la entrada naranja de cāpsula33: el cartel iluminado, un ojo de buey, la puerta con dos ventanas en pastilla y un ventanal con listones" />

        {/* Del otro lado de la puerta, en alta (toma la posta del 3D). */}
        <img ref={set('insideImg')} src={`${BASE}interior-2688.webp`} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0" style={{ visibility: 'hidden' }} />

        {/* Las zonas vivas de la entrada (las ubica la cámara cada cuadro). */}
        <div ref={set('spots')} className="pointer-events-none absolute inset-0">
          <span
            ref={set('sign')}
            aria-hidden="true"
            className={`c33-signglow pointer-events-none absolute top-0 left-0 ${hover === 'sign' ? 'is-flicker' : ''}`}
          />
          <span
            ref={set('port')}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 rounded-full transition-[box-shadow,background] duration-700"
            style={{
              background: hover === 'port' ? 'radial-gradient(circle, rgba(255,214,160,0.4), transparent 66%)' : 'transparent',
              boxShadow: hover === 'port' ? '0 0 60px 10px rgba(255,140,60,0.4)' : 'none',
              animation: hover === 'port' ? 'c33-pulse 1.4s ease-in-out infinite' : 'none',
            }}
          />
          <button
            ref={set('door')}
            type="button"
            aria-label="Entrar al café"
            onFocus={() => (R.current.focusDoor = true)}
            onBlur={() => (R.current.focusDoor = false)}
            onClick={enter}
            className="pointer-events-auto absolute top-0 left-0 cursor-pointer rounded-[0.6vw] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7a1a]"
          />
        </div>

        {/* Viñeta: más noche arriba, donde flota el titular. */}
        <div ref={set('vignette')} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,6,10,0.72), rgba(5,6,10,0.15) 34%, transparent 55%), radial-gradient(ellipse 90% 80% at 50% 55%, transparent 55%, rgba(5,6,10,0.6))' }} />

        {/* El titular, flotando. */}
        <div className="pointer-events-none absolute inset-x-0 top-[13svh] flex justify-center px-6 sm:top-[10svh]" style={{ transformStyle: 'preserve-3d' }}>
          <div ref={set('titleWrap')} className="will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
            <h1
              ref={set('title')}
              className="text-center text-[clamp(1.9rem,4.6vw,4.7rem)] leading-[0.95] font-semibold tracking-[-0.01em] uppercase select-none"
              style={{ fontFamily: "'Archivo', sans-serif", fontVariationSettings: "'wdth' 118", transformStyle: 'preserve-3d', textShadow: '0 2px 30px rgba(5,6,10,0.7)' }}
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
            <p data-in className="max-w-[34rem] text-[11px] leading-[1.7] tracking-[0.18em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.75)' }}>
              <span style={{ color: C.neon }}>Módulo C33 · acoplado</span>
              <br />
              Av. Gral. Roca 1120 · San Martín de los Andes
            </p>
            <button
              type="button"
              data-in
              onClick={enter}
              className="c33-cta pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full border px-6 py-3 text-[12px] font-semibold tracking-[0.2em] uppercase opacity-0 active:scale-[0.97]"
              style={{ ...MONO, borderColor: 'rgba(242,233,220,0.35)', background: 'rgba(5,6,10,0.5)', backdropFilter: 'blur(8px)' }}
            >
              <span aria-hidden="true" className="c33-cta-fill absolute inset-0" style={{ background: C.orange }} />
              <span aria-hidden="true" className="c33-scrollcue relative inline-block h-4 w-px" style={{ background: C.neon }} />
              <span className="relative">Scroll para entrar</span>
            </button>
          </div>
        </div>

        {/* Adentro. */}
        <div ref={set('inCopy')} className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-10 opacity-0 md:px-10" style={{ background: 'linear-gradient(to top, rgba(5,6,10,0.85), transparent)' }}>
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
        .c33-cta { transition: border-color 300ms cubic-bezier(0.22,1,0.36,1), color 300ms, transform 160ms ease-out; }
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

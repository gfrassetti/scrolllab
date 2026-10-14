import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { trackPointer } from '../../lib/motion'
import { createCorridorScene } from './corridorScene'
import { C, MONO, BODY, DISPLAY, openStatus } from './brand'

/**
 * cāpsula33 — Hero: el café es un módulo de la nave.
 *
 * Capas, de atrás hacia adelante: el pasillo de la nave (3D, `corridorScene.js`)
 * con la entrada real empotrada al fondo, el cartel «cāpsula33» que flota delante
 * de la pared con su sombra, polvo en el aire, notas que cuelgan en el pasillo a
 * distintas profundidades (pasan a los costados mientras caminamos), la
 * tripulante tomando café en primer plano y la viñeta.
 *
 * Scroll: la tripulante se va, caminamos (corto: arrancamos cerca), la puerta se
 * abre y entramos. Puntero: cada capa a su velocidad; el cartel titila, el ojo
 * de buey late y la puerta se entreabre.
 *
 * Imágenes generadas (Higgsfield) con las fotos del dueño como referencia; las
 * fotos no se publican.
 */

const BASE = '/studio/capsula33/ship/'
// Dónde parpadea la tripulante al scrollear (fracción del recorrido del hero).
const BLINK_MARKS = [0.012, 0.045, 0.085, 0.13, 0.17]
// Los ojos en la imagen de la tripulante (1360 × 2048) y cuánto más abajo está la piel que los tapa.
const EYES = [
  { cx: 580, cy: 533, rx: 52, ry: 26, rot: 4 },
  { cx: 770, cy: 516, rx: 54, ry: 26, rot: -6 },
]
const EYE_SKIN_DROP = 50
// Lo que dice la tripulante al primer movimiento del scroll (la primera frase es la de su revista).
const LINE = 'Bienvenidos, exploradores de universos. El café está del otro lado de esa puerta.'

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

// El titular grande, debajo de las coordenadas: se apaga palabra por palabra con el scroll
// (como el manifiesto de APEX o los capítulos de CHAPTERS). `*` marca el tramo en naranja.
const HEADLINE = 'Una cápsula naranja en medio de la ciudad: *café de especialidad*, la colección de cine del dueño y un lugar para reunirse.'
const HEADLINE_WORDS = (() => {
  let accent = false
  return HEADLINE.split(' ').map((raw) => {
    const starts = raw.startsWith('*')
    const ends = raw.replace(/[,.:]$/, '').endsWith('*')
    if (starts) accent = true
    const word = { text: raw.replace(/\*/g, ''), accent }
    if (ends) accent = false
    return word
  })
})()

/** Notas suspendidas en el pasillo (coordenadas del túnel: x a los lados, y arriba, z hacia la puerta). */
function notesFor(status) {
  return [
    {
      at: [1.85, -0.3, -5.4],
      side: 'right',
      kicker: 'Módulo C33',
      text: 'Café de especialidad',
    },
    {
      at: [-1.55, -0.55, -6.4],
      side: 'left',
      kicker: 'En la pared del local',
      text: '«No somos lo que razonamos, somos lo que imaginamos.»',
      quote: true,
    },
    {
      at: [1.6, 0.55, -7.4],
      side: 'right',
      kicker: status.label,
      text: 'Av. Gral. Roca 1120',
    },
  ]
}

export default function ShipHero({ boarded, bridge, onProgress = () => {}, onReady = () => {} }) {
  const rootRef = useRef(null)
  const R = useRef({ notes: [] })
  const [hover, setHover] = useState(null)
  const [talk, setTalk] = useState(false)
  const [typed, setTyped] = useState(0)
  const [status] = useState(() => openStatus())
  const [notes] = useState(() => notesFor(status))
  const scroll = useRef({ p: 0 })
  // Párpados (los refs los llena el marcado) y las marcas del scroll donde parpadea.
  if (!R.current.lids) R.current.lids = []

  // El pasillo: carga las imágenes (alimenta el loader) y ubica cada cuadro lo que depende de la cámara.
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
        r.rects = {
          sign: scene.screenRect('sign'),
          port: scene.screenRect('port'),
          door: scene.screenRect('door'),
        }
        place(r.port, r.rects.port)
        // Las notas: posición y tamaño según la distancia; aparecen de lejos y se van al pasar.
        const phone = window.innerWidth < 640
        notes.forEach((n, i) => {
          const el = r.notes[i]
          if (!el) return
          const q = scene.projectPoint(...n.at)
          const s = Math.max(0.3, Math.min(2.4, (phone ? 1.7 : 2.4) / q.depth))
          const near = Math.max(0, Math.min(1, (q.depth - 0.9) / 0.9))
          const far = Math.max(0, Math.min(1, (3.6 - q.depth) / 0.8)) // de a una: aparece cuando se acerca
          el.style.opacity = q.depth > 0 ? String(near * far * (r.intro ?? 0)) : '0'
          el.style.transform = `translate3d(${q.x}px, ${q.y}px, 0) translate(${n.side === 'left' ? '0' : '-100%'}, -50%) scale(${s})`
        })
      },
    })
    r.scene = scene
    // El loader pide dónde cae el cartel en pantalla y avisa cuando su marca llegó ahí.
    if (bridge) {
      bridge.current.signRect = () => (r.rects ? r.rects.sign : null)
      bridge.current.land = () => {
        // Aterriza sin saltos (la marca del DOM se funde con el cartel ya prendido, en el mismo
        // lugar); medio segundo después, un titileo corto de neón que se acomoda.
        scene.state.signOn = 1
        scene.state.landedAt = performance.now()
        setTimeout(() => {
          scene.state.flickerAmp = 0.5
          scene.state.flickerAt = performance.now()
        }, 550)
      }
      bridge.current.show = () => {
        scene.state.signOn = 1
        scene.state.landedAt = performance.now()
      }
    }
    return () => scene.dispose()
    // El loader llama una vez; los callbacks son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El recorrido: la tripulante se va, caminamos, la puerta se abre, entramos.
  useGSAP(
    () => {
      const r = R.current
      const cam = r.scene.state
      const apply = () => {
        const p = scroll.current.p
        gsap.set(r.chrome, { autoAlpha: 1 - Math.min(1, p * 9) })
        // La tripulante: la pasamos (se corre a la derecha, crece) y desaparece.
        const g = Math.min(1, cam.walk / 0.42)
        // El titular se apaga palabra por palabra en el primer tramo (de la primera a la última)
        // y el bloque se va cuando empezamos a caminar.
        gsap.set(r.lede, {
          autoAlpha: 1 - Math.max(0, Math.min(1, (p - 0.065) / 0.03)),
        })
        if (r.headline) {
          const words = r.hw || (r.hw = [...r.headline.querySelectorAll('[data-hw]')])
          const f = Math.min(1, p / 0.06) * (words.length + 3)
          words.forEach((el, i) => {
            const k = Math.max(0, Math.min(1, f - i))
            el.style.opacity = String(1 - 0.86 * k)
          })
        }
        // El cuadro de diálogo: aparece con el primer movimiento del scroll y se va antes de que ella se vaya.
        // Parpadea cada vez que el scroll cruza una de estas marcas (en cualquier dirección),
        // y el vapor sube mientras ella habla.
        const last = r.lastP ?? 0
        for (const m of BLINK_MARKS) if ((last < m) !== (p < m)) r.blink?.()
        r.lastP = p
        const steamTarget = p > 0.004 && p < 0.19 ? 1 : 0.55
        if (steamTarget !== r.steamTarget) {
          r.steamTarget = steamTarget
          gsap.to(r.girlIn, { '--steam': steamTarget, duration: 0.8, ease: 'power2.out', overwrite: 'auto' })
        }
        const show = p > 0.004 && p < 0.19 // unos cinco movimientos de la rueda
        if (show !== r.talk) {
          r.talk = show
          setTalk(show)
        }
        gsap.set(r.girlScroll, {
          xPercent: 80 * g * g,
          scale: 1 + 0.35 * g,
          autoAlpha: 1 - Math.max(0, (g - 0.55) / 0.45),
        })
        // Ya adentro (el salón y las mesas son capas del 3D): el texto de bienvenida.
        const k = Math.max(0, Math.min(1, (cam.enter - 0.8) / 0.2))
        gsap.set(r.inCopy, { autoAlpha: Math.max(0, (k - 0.55) / 0.45) })
        gsap.set(r.vignette, { opacity: 1 - 0.6 * k })
      }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          onUpdate: (self) => (scroll.current.p = self.progress),
        },
        onUpdate: apply,
      })
      // Un primer tramo quieto: la tripulante habla y recién después caminamos.
      tl.to(cam, { walk: 1, duration: 0.42, ease: 'none' }, 0.2)
      tl.to(cam, { open: 1, duration: 0.13, ease: 'power2.inOut' }, 0.54)
      tl.to(cam, { enter: 1, duration: 0.32, ease: 'none' }, 0.66)
      tl.progress(tl.scrollTrigger?.progress ?? 0)
      apply()
      return () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    },
    { scope: rootRef },
  )

  // Entrada después del salto: el pasillo se enciende, entra la tripulante, después las notas.
  useEffect(() => {
    if (!boarded) return
    const r = R.current
    gsap.fromTo(r.canvas, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 2.2, ease: 'expo.out' })
    gsap.fromTo(r.ledeIn, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', delay: 0.9 })
    gsap.fromTo(
      r.girlIn,
      { autoAlpha: 0, yPercent: 12 },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 1.6,
        ease: 'expo.out',
        delay: 0.5,
      },
    )
    const intro = { v: 0 }
    gsap.to(intro, {
      v: 1,
      duration: 1.4,
      ease: 'power2.out',
      delay: 1.1,
      onUpdate: () => (r.intro = intro.v),
    })
    gsap.fromTo(
      r.chrome.querySelectorAll('[data-in]'),
      { autoAlpha: 0, y: 12 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.08,
        delay: 1.3,
      },
    )
  }, [boarded])

  // Parpadeo: cierra rápido, abre un poco más lento; a veces doble. Además de los del scroll,
  // uno suelto cada tanto (si no, queda de estatua entre un movimiento y otro).
  useEffect(() => {
    const r = R.current
    const b = { v: 0 }
    const paint = () => r.lids.forEach((el) => el && (el.style.transform = `scaleY(${b.v})`))
    let alive = true
    let timer = 0
    const blink = (double = false) => {
      if (!alive) return
      r.blinkTl?.kill()
      const tl = gsap.timeline({ onUpdate: paint })
      r.blinkTl = tl
      tl.to(b, { v: 1, duration: 0.07, ease: 'power2.in' }).to(b, { v: 0, duration: 0.15, ease: 'power2.out' }, '+=0.04')
      if (double) tl.to(b, { v: 1, duration: 0.06, ease: 'power2.in' }, '+=0.12').to(b, { v: 0, duration: 0.14, ease: 'power2.out' }, '+=0.03')
    }
    r.blink = () => blink(Math.random() < 0.18)
    const idle = () => {
      timer = window.setTimeout(() => {
        if (scroll.current.p < 0.2) blink()
        idle()
      }, 3400 + Math.random() * 3200)
    }
    idle()
    return () => {
      alive = false
      window.clearTimeout(timer)
      r.blink = null
    }
  }, [])

  // Un solo loop: la cámara y la tripulante siguen al puntero; las zonas vivas por geometría.
  useEffect(() => {
    const pointer = trackPointer()
    const noHover = window.matchMedia('(hover: none)').matches
    const r = R.current
    const onMove = () => (r.moved = true)
    window.addEventListener('pointermove', onMove, { once: true })
    const s = { x: 0, y: 0 }
    let raf = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      s.x += (pointer.x - s.x) * 0.05
      s.y += (pointer.y - s.y) * 0.05
      const still = scroll.current.p < 0.02
      // La tripulante, lo más cerca: el parallax más grande y una respiración lenta.
      if (r.girlWrap) r.girlWrap.style.transform = `translate3d(${s.x * -34}px, ${s.y * -16 + Math.sin(now * 0.0013) * 4}px, 0)`
      if (!r.scene) return
      const st = r.scene.state
      st.px = s.x
      st.py = s.y
      // Zonas vivas por geometría (se mueven con la cámara: mouseenter/leave no alcanza).
      const P = pointer
      const inside = (q, pad = 0) => q && P.clientX >= q.x - pad && P.clientX <= q.x + q.w + pad && P.clientY >= q.y - pad && P.clientY <= q.y + q.h + pad
      const live = r.moved && !noHover && !P.touching && still && r.rects
      const over = !live ? null : inside(r.rects.sign, 10) ? 'sign' : inside(r.rects.port) ? 'port' : null
      if (over !== r.over) {
        if (over === 'sign') {
          st.flickerAmp = 1
          st.flickerAt = now
        }
        r.over = over
        setHover(over)
      }
      // La puerta no se entreabre ni se cliquea: se entra solo con el scroll.
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      pointer.dispose()
    }
  }, [])

  // La frase se escribe letra por letra la primera vez que aparece.
  useEffect(() => {
    if (!talk || typed >= LINE.length) return undefined
    const id = setInterval(() => setTyped((n) => Math.min(LINE.length, n + 1)), 24)
    return () => clearInterval(id)
  }, [talk, typed])

  const set = (k) => (el) => (R.current[k] = el)

  return (
    <section ref={rootRef} id="top" className="relative h-[420svh]" style={{ background: '#05060a', color: C.cream }}>
      <h1 className="sr-only">cāpsula33 — café de especialidad en San Martín de los Andes</h1>
      <p className="sr-only">{HEADLINE.replace(/\*/g, '')}</p>
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas
          ref={set('canvas')}
          className="absolute inset-0 h-full w-full opacity-0"
          role="img"
          aria-label="Un pasillo de nave espacial gris con luces blancas; al fondo, empotrada en la pared, la entrada naranja de cāpsula33 con su cartel de luz flotando, un ojo de buey, la puerta con dos ventanas en pastilla y un ventanal con listones"
        />

        {/* Notas suspendidas en el pasillo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {notes.map((n, i) => (
            <div
              key={n.text}
              ref={(el) => (R.current.notes[i] = el)}
              className="absolute top-0 left-0 opacity-0 will-change-transform"
              style={{
                transformOrigin: n.side === 'left' ? '0 50%' : '100% 50%',
              }}
            >
              <div
                className={`flex flex-col gap-1.5 ${n.side === 'left' ? 'items-start text-left' : 'items-end text-right'}`}
                style={{ width: n.quote ? 300 : 240 }}
              >
                <span className="flex items-center gap-2 text-[9px] tracking-[0.22em] uppercase" style={{ ...MONO, color: C.neon }}>
                  {n.side === 'left' ? <span className="h-px w-5" style={{ background: C.neon }} /> : null}
                  {n.kicker}
                  {n.side === 'right' ? <span className="h-px w-5" style={{ background: C.neon }} /> : null}
                </span>
                <span
                  className={n.quote ? 'text-[17px] leading-[1.25] font-light italic' : 'text-[15px] leading-[1.2] tracking-[0.04em] uppercase'}
                  style={{
                    ...(n.quote ? BODY : MONO),
                    color: C.cream,
                    textShadow: '0 1px 18px rgba(3,4,8,0.9)',
                  }}
                >
                  {n.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Las coordenadas y el titular grande, que se apaga palabra por palabra con el scroll. */}
        <div
          ref={set('lede')}
          aria-hidden="true"
          className="pointer-events-none absolute top-[13svh] left-6 z-10 w-[min(88vw,420px)] sm:top-auto sm:bottom-[15svh] sm:left-10 sm:w-[min(46vw,700px)]"
        >
          {/* Un poco de noche detrás, para que se lea sobre los reflejos del piso. */}
          <div
            aria-hidden="true"
            className="absolute -inset-x-16 -inset-y-12"
            style={{ background: 'radial-gradient(ellipse 60% 60% at 40% 55%, rgba(3,4,8,0.62), transparent 72%)' }}
          />
          <div ref={set('ledeIn')} className="relative opacity-0">
            <p className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase" style={{ ...MONO, color: C.neon }}>
              <span className="h-px w-6" style={{ background: C.neon }} />
              40°09′S · 71°21′O
            </p>
            <p className="mt-1.5 text-[12px] tracking-[0.18em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.8)' }}>
              San Martín de los Andes
            </p>
            <p
              ref={set('headline')}
              className="mt-4 text-[1.45rem] leading-[1.05] font-semibold tracking-[-0.01em] uppercase sm:text-[clamp(1.5rem,2.3vw,2.4rem)]"
              style={{
                ...DISPLAY,
                color: C.cream,
                textShadow: '0 2px 30px rgba(3,4,8,0.9)',
              }}
            >
              {HEADLINE_WORDS.map((w, wi) => (
                <span
                  key={wi}
                  data-hw
                  className="inline-block whitespace-pre"
                  style={
                    w.accent
                      ? { color: C.neon }
                      : undefined
                  }
                >
                  {w.text}
                  {wi < HEADLINE_WORDS.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* La tripulante tomando café, en primer plano. */}
        <div
          ref={set('girlScroll')}
          className="pointer-events-none absolute right-[4vw] bottom-0 h-[44svh] sm:right-[13vw] sm:h-[68svh]"
          style={{ transformOrigin: '70% 100%' }}
        >
          <div ref={set('girlWrap')} className="relative h-full will-change-transform">
            {/* Su cuadro de diálogo. */}
            <div
              role="status"
              aria-live="polite"
              className={`c33-talk absolute right-0 bottom-[100%] w-[min(260px,72vw)] sm:top-[9%] sm:right-[88%] sm:bottom-auto sm:w-[300px] ${talk ? 'is-on' : ''}`}
            >
              <div
                className="relative rounded-lg border px-4 pt-3 pb-3.5"
                style={{
                  background: 'rgba(8,9,12,0.92)',
                  borderColor: 'rgba(228,96,29,0.75)',
                  boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
                }}
              >
                <p className="text-[10px] tracking-[0.22em] uppercase" style={{ ...MONO, color: C.neon }}>
                  Tripulante · C33
                </p>
                <p className="mt-1.5 min-h-[3em] text-[15px] leading-[1.45]" style={{ ...BODY, color: C.cream }}>
                  {LINE.slice(0, typed)}
                  <span aria-hidden="true" className="c33-caret ml-0.5 inline-block h-[0.9em] w-[0.45em] translate-y-[0.12em]" style={{ background: C.neon }} />
                </p>
                {/* La colita, hacia ella: abajo en el teléfono, a la derecha en pantallas anchas. */}
                <span
                  aria-hidden="true"
                  className="absolute right-10 -bottom-[6px] h-3 w-3 rotate-45 border-r border-b sm:top-8 sm:-right-[6px] sm:bottom-auto sm:border-t sm:border-b-0"
                  style={{
                    background: 'rgb(8,9,12)',
                    borderColor: 'rgba(228,96,29,0.75)',
                  }}
                />
              </div>
            </div>
            <div ref={set('girlIn')} className="relative h-full opacity-0">
              <img
                src="/studio/capsula33/girl-1360.webp"
                srcSet="/studio/capsula33/girl-760.webp 760w, /studio/capsula33/girl-1360.webp 1360w"
                sizes="(max-width: 640px) 40vw, 30vw"
                alt="Una tripulante de pelo rosa, con casco transparente y auriculares, toma café con las dos manos"
                className="h-full w-auto max-w-none"
                style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.55))' }}
              />
              {/* Párpados: se cierran sobre los ojos de la imagen. Cada uno es la piel de la propia
                  imagen (la de abajo del ojo, corrida hacia arriba), así calza con su luz y su textura. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {EYES.map((e, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${((e.cx - e.rx) / 1360) * 100}%`,
                      top: `${((e.cy - e.ry) / 2048) * 100}%`,
                      width: `${((e.rx * 2) / 1360) * 100}%`,
                      height: `${((e.ry * 2) / 2048) * 100}%`,
                      transform: `rotate(${e.rot}deg)`,
                    }}
                  >
                    <div className="c33-lid absolute inset-0" ref={(el) => (R.current.lids[i] = el)}>
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{
                          borderRadius: '50%',
                          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 62%, transparent 100%)',
                          maskImage: 'radial-gradient(ellipse at 50% 50%, #000 62%, transparent 100%)',
                        }}
                      >
                        <img
                          src="/studio/capsula33/girl-1360.webp"
                          alt=""
                          className="absolute max-w-none"
                          style={{
                            width: `${(1360 / (e.rx * 2)) * 100}%`,
                            left: `${(-(e.cx - e.rx) / (e.rx * 2)) * 100}%`,
                            top: `${(-(e.cy - e.ry + EYE_SKIN_DROP) / (e.ry * 2)) * 100}%`,
                          }}
                        />
                      </div>
                      {/* La línea de las pestañas, en el borde de abajo. */}
                      <span className="absolute right-[6%] bottom-[8%] left-[4%] h-[34%] border-b-[1.5px]" style={{ borderColor: '#2a1713', borderRadius: '0 0 55% 55% / 0 0 100% 100%' }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Vapor de la taza: sale del borde (≈ 38 % del alto de la imagen) y sube por delante de la cara. */}
              {[
                { left: 46, delay: 0, w: 9.5 },
                { left: 50.5, delay: 0.8, w: 11.5 },
                { left: 54.5, delay: 1.6, w: 9 },
                { left: 48.5, delay: 2.4, w: 8 },
                { left: 52.5, delay: 3.1, w: 10.5 },
              ].map((w, i) => (
                <span key={i} aria-hidden="true" className="c33-steam" style={{ left: `${w.left}%`, top: '38.5%', width: `${w.w}%`, animationDelay: `${w.delay}s` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Las zonas vivas de la entrada (las ubica la cámara cada cuadro). */}
        <div className="pointer-events-none absolute inset-0">
          <span
            ref={set('port')}
            aria-hidden="true"
            className={`c33-port absolute top-0 left-0 rounded-full transition-[box-shadow,background] duration-700 ${hover === 'port' ? 'is-hover' : ''}`}
            style={{
              background: hover === 'port' ? 'radial-gradient(circle, rgba(255,214,160,0.4), transparent 66%)' : 'transparent',
              boxShadow: hover === 'port' ? '0 0 60px 10px rgba(255,140,60,0.4)' : 'none',
              animation: hover === 'port' ? 'c33-pulse 1.4s ease-in-out infinite' : 'none',
            }}
          >
            {/* El ojo de buey es un espejo infinito: un túnel de aros que se alejan, con «c̄33» debajo. */}
            <span className="c33-mirror">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <i key={i} style={{ '--i': i }} />
              ))}
              <b className="c33-mirror-core" />
            </span>
            <span className="c33-mirror-label">c̄33</span>
          </span>
        </div>

        {/* Viñeta: los bordes a oscuras, el centro (la entrada) con luz. */}
        <div
          ref={set('vignette')}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 72% 68% at 50% 50%, transparent 38%, rgba(3,4,8,0.55) 70%, rgba(3,4,8,0.94) 100%), linear-gradient(to bottom, rgba(3,4,8,0.55), transparent 22%, transparent 78%, rgba(3,4,8,0.6))',
          }}
        />

        {/* La interfaz de la nave: marca, estado y la llamada. */}
        <div ref={set('chrome')} className="pointer-events-none absolute inset-0 flex flex-col justify-end px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10">
        </div>

        {/* Adentro. */}
        <div
          ref={set('inCopy')}
          className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-10 opacity-0 md:px-10"
          style={{
            background: 'linear-gradient(to top, rgba(5,6,10,0.85), transparent)',
          }}
        >
          <p className="text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            Bienvenidos, exploradores de universos
          </p>
          <p className="mt-3 max-w-[40ch] text-[16px] leading-[1.55]" style={{ ...BODY, color: 'rgba(242,233,220,0.85)' }}>
            Café de especialidad y la colección del dueño en vitrinas, en el centro de San Martín de los Andes.
          </p>
        </div>
      </div>
      <style>{`
        .c33-talk { opacity: 0; transform: translateY(6px) scale(0.96); transform-origin: 100% 100%; pointer-events: none; transition: opacity 160ms ease-out, transform 160ms ease-out; }
        .c33-talk.is-on { opacity: 1; transform: none; transition: opacity 240ms cubic-bezier(0.22,1,0.36,1), transform 240ms cubic-bezier(0.22,1,0.36,1); }
        @media (min-width: 640px) { .c33-talk { transform-origin: 100% 30%; } }
        @keyframes c33-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .c33-caret { animation: c33-caret 1s steps(1, end) infinite; }
        @keyframes c33-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        /* Vapor: columnas blandas que suben y se abren; --steam (0–1) sube mientras ella habla. */
        @keyframes c33-steam {
          0% { transform: translate(-50%, 0) scale(0.5, 0.55); opacity: 0; }
          16% { opacity: calc(0.85 * var(--steam, 0.55)); }
          55% { transform: translate(-42%, -85%) scale(0.95, 1.1); opacity: calc(0.6 * var(--steam, 0.55)); }
          100% { transform: translate(-60%, -200%) scale(1.55, 1.75); opacity: 0; }
        }
        .c33-steam { position: absolute; aspect-ratio: 1 / 1.5; border-radius: 50%; background: radial-gradient(ellipse at 50% 60%, rgba(255,252,247,0.95), rgba(255,240,226,0.5) 42%, transparent 72%); filter: blur(4px); animation: c33-steam 4s ease-out infinite; opacity: 0; will-change: transform, opacity; }
        /* Espejo infinito del ojo de buey. */
        .c33-port { container-type: inline-size; }
        .c33-mirror { position: absolute; inset: 15%; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 50%, #fff 0, #e3edff 5%, #8aa6d6 13%, #1d2538 36%, #07080c 100%); box-shadow: inset 0 0 14px 4px rgba(0,0,0,0.9); }
        .c33-mirror i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 0 7px rgba(170,205,255,0.75), inset 0 0 6px rgba(170,205,255,0.45); transform: scale(1.3); opacity: 0; animation: c33-tunnel 3.4s cubic-bezier(0.45, 0, 0.85, 0.55) infinite; animation-delay: calc(var(--i) * -0.4857s); }
        .c33-mirror i:nth-child(even) { border-color: rgba(255,178,110,0.9); box-shadow: 0 0 7px rgba(255,140,60,0.7), inset 0 0 6px rgba(255,140,60,0.4); }
        .c33-mirror-core { position: absolute; left: 50%; top: 50%; width: 22%; height: 22%; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, #fff, rgba(255,255,255,0) 70%); }
        .c33-mirror-label { position: absolute; left: 0; right: 0; bottom: 21%; text-align: center; font-family: 'Roboto Mono', ui-monospace, monospace; font-size: 13cqw; line-height: 1; color: #f2e9dc; text-shadow: 0 0 6px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.8); }
        .c33-port.is-hover .c33-mirror i { animation-duration: 1.5s; }
        @keyframes c33-tunnel { 0% { transform: scale(1.3); opacity: 0; } 10% { opacity: 0.95; } 100% { transform: scale(0.03); opacity: 0; } }
        .c33-lid { transform-origin: 50% 0%; transform: scaleY(0); }
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

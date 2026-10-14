import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { trackPointer } from '../../lib/motion'
import { getLenis } from '../../hooks/useLenis'
import { createMapScene, MAP_BG, ZONES } from './mapScene'
import { PRICES } from './roomModel'
import { C, MONO, BODY, DISPLAY, openStatus } from './brand'

/**
 * cāpsula33 — capítulo 2: el mapa vivo del local.
 *
 * A la manera de un diorama isométrico (referencia del dueño: Townhouse, nominado
 * en Awwwards): titular grande a la izquierda, el local en miniatura a la
 * derecha, etiquetas sobre cada zona. Pasar el puntero enciende la zona; tocarla
 * abre su ficha (la pantalla trae los precios reales).
 *
 * Su propia animación de scroll (el curso pide una distinta por sección): el
 * local llega como plano visto desde arriba y, al bajar, gira a la esquina y se
 * levanta del piso hasta quedar en isométrico.
 */


/** El rectángulo donde entra el diorama: a la derecha en PC, abajo en tablet y teléfono. */
function areaFor() {
  const w = window.innerWidth
  const h = window.innerHeight
  if (w >= 1024) return { x: w * 0.4, y: h * 0.1, w: w * 0.56, h: h * 0.8 }
  return { x: w * 0.03, y: h * 0.47, w: w * 0.94, h: h * 0.42 }
}

export default function MapSection({ onProgress = () => {}, onReady = () => {} }) {
  const rootRef = useRef(null)
  const R = useRef({ labels: {} })
  const [hover, setHover] = useState(null)
  const [active, setActive] = useState(null)
  const [labelsOn, setLabelsOn] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [moved, setMoved] = useState(false) // la persona giró o acercó: aparece «Vista inicial»
  const [status] = useState(() => openStatus())
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)

  useLayoutEffect(() => {
    const r = R.current
    const scene = createMapScene({
      canvas: r.canvas,
      area: areaFor,
      onProgress,
      onReady,
      onHover: (id) => setHover(id),
      onDrag: (on) => setDragging(on),
      onFrame: () => {
        const st = scene.state
        // Con el local acercado, el texto se aparta (si no, el modelo lo tapa).
        const away = Math.min(1, Math.max(0, (st.zoom - 1.04) / 0.25))
        if (r.copy) r.copy.style.opacity = String(1 - away)
        const off = Math.abs(st.tYaw) > 0.02 || Math.abs(st.tElev) > 0.02 || st.tZoom > 1.02
        if (off !== r.moved) {
          r.moved = off
          setMoved(off)
        }
        for (const z of ZONES) {
          const el = r.labels[z.id]
          const at = scene.labelAt(z.id)
          if (el && at) el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, -100%)`
        }
        if (r.card && r.activeId) {
          const at = scene.labelAt(r.activeId)
          if (at) {
            const right = at.x > window.innerWidth * 0.62
            r.card.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(${right ? 'calc(-100% + 24px)' : '-24px'}, 14px)`
          }
        }
      },
    })
    r.scene = scene
    return () => scene.dispose()
    // El loader llama una vez; los callbacks son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll: del plano al diorama; las etiquetas entran cuando todo está levantado.
  useGSAP(
    () => {
      const r = R.current
      const st = r.scene.state
      // Suavizado propio (sin scrub de GSAP: no hay tween, solo el valor).
      const rise = { target: 0 }
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top 70%',
        end: 'top -45%',
        onUpdate: (self) => (rise.target = self.progress),
      })
      const ease = () => {
        st.rise += (rise.target - st.rise) * 0.08
        setLabelsOn(st.rise > 0.92)
      }
      gsap.ticker.add(ease)
      // El titular: cada línea sube detrás de su máscara (una vez).
      gsap.fromTo(
        r.copy.querySelectorAll('[data-line]'),
        { yPercent: 110 },
        { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: rootRef.current, start: 'top 35%', once: true } },
      )
      gsap.fromTo(
        r.copy.querySelectorAll('[data-fade]'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.35, scrollTrigger: { trigger: rootRef.current, start: 'top 35%', once: true } },
      )
      // El logo de fondo: se dibuja mientras la sección pasa y al final queda con un relleno tenue.
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const p = self.progress
          const draw = Math.min(1, Math.max(0, (p - 0.08) / 0.5))
          r.logoText.setAttribute('stroke-dashoffset', String(1800 * (1 - draw)))
          r.logoText.setAttribute('fill-opacity', String(0.07 * Math.min(1, Math.max(0, (p - 0.5) / 0.15))))
          r.logoBar.setAttribute('stroke-dashoffset', String(1 - Math.min(1, Math.max(0, (p - 0.45) / 0.12))))
          r.logo.style.transform = `translate3d(0, calc(-50% + ${(0.5 - p) * 70}px), 0) scale(${0.96 + p * 0.08})`
        },
      })
      return () => gsap.ticker.remove(ease)
    },
    { scope: rootRef },
  )

  // Puntero: el diorama gira apenas; sobre el local, la zona que toca se enciende.
  useEffect(() => {
    const pointer = trackPointer()
    const r = R.current
    const s = { x: 0, y: 0 }
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      s.x += (pointer.x - s.x) * 0.05
      s.y += (pointer.y - s.y) * 0.05
      if (r.scene) {
        r.scene.state.px = s.x
        r.scene.state.py = s.y
      }
    }
    raf = requestAnimationFrame(loop)
    const onMove = (e) => {
      if (e.pointerType === 'touch' || !r.scene || r.overLabel || r.scene.dragged()) return
      r.scene.setHover(r.scene.zoneAt(e.clientX, e.clientY))
    }
    const onKey = (e) => e.key === 'Escape' && setActive(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      pointer.dispose()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    const r = R.current
    r.activeId = active
    if (r.scene) r.scene.state.active = active
  }, [active])

  const pickAt = (e) => {
    if (R.current.scene?.dragged()) return // terminó un giro, no es un toque
    const id = R.current.scene?.zoneAt(e.clientX, e.clientY)
    setActive(id || null)
  }
  const overLabel = (id) => {
    const r = R.current
    r.overLabel = !!id
    r.scene?.setHover(id)
  }

  const set = (k) => (el) => (R.current[k] = el)
  const zone = ZONES.find((z) => z.id === active)

  return (
    <section ref={rootRef} id="mapa" className="relative h-[230svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <svg ref={set('logo')} aria-hidden="true" viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-x-[-4%] top-1/2 h-[86%] w-[108%] -translate-y-1/2">
          <line ref={set('logoBar')} x1="78" y1="58" x2="292" y2="58" stroke={C.orange} strokeWidth="10" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          <text
            ref={set('logoText')}
            x="500"
            y="380"
            textAnchor="middle"
            fontFamily="'Roboto Mono', ui-monospace, monospace"
            fontWeight="300"
            fontSize="430"
            letterSpacing="-12"
            fill={C.orange}
            fillOpacity="0"
            stroke={C.cream}
            strokeOpacity="0.22"
            strokeWidth="2.5"
            strokeDasharray="1800"
            strokeDashoffset="1800"
          >
            c33
          </text>
        </svg>
        <canvas ref={set('canvas')} onClick={pickAt} className={`absolute inset-0 h-full w-full ${dragging ? 'cursor-grabbing' : hover ? 'cursor-pointer' : labelsOn ? 'cursor-grab' : ''}`}
          style={{ touchAction: 'pan-y' }} role="img" aria-label="El local de cāpsula33 en miniatura, en isométrico: la entrada, el jardín, las vitrinas, la barra con su pantalla y el salón" />

        {/* El texto, a la izquierda (arriba en teléfono). */}
        <div ref={set('copy')} className="pointer-events-none absolute inset-x-0 top-0 px-6 pt-[12svh] md:px-10 lg:top-1/2 lg:right-auto lg:w-[40vw] lg:-translate-y-1/2 lg:pt-0 lg:pl-[5vw]">
          <p data-fade className="text-[11px] tracking-[0.22em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
            La planta, a escala
          </p>
          <h2 className="mt-4 text-[clamp(2.6rem,5.6vw,6.2rem)] leading-[0.92] font-semibold tracking-[-0.02em] uppercase" style={DISPLAY}>
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                La cápsula,
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                pieza por pieza.
              </span>
            </span>
          </h2>
          <p data-fade className="mt-6 max-w-[34ch] text-[17px] leading-[1.5] opacity-0 lg:text-[19px]" style={{ ...BODY, color: 'rgba(242,233,220,0.78)' }}>
            El jardín en su caja blanca, la colección en vitrinas, la barra naranja y el salón bajo las espirales de luz.
            {/* En el teléfono la instrucción ya va en la píldora de abajo. */}
            {touch ? null : ' Cada zona se enciende al pasar el puntero y se abre con su ficha.'}
          </p>
          <div data-fade className="mt-8 hidden opacity-0 lg:block">
            <a
              href="#llegar"
              onClick={(e) => {
                e.preventDefault()
                getLenis()?.scrollTo('#llegar', { duration: 1.4 })
              }}
              className="c33-map-cta pointer-events-auto inline-flex h-12 items-center rounded-md px-5 text-[15px] font-medium active:scale-[0.97]"
              style={{ ...BODY, background: C.cream, color: '#0b0c0f' }}
            >
              Cómo llegar
            </a>
            <p className="mt-3 text-[13px]" style={{ ...BODY, color: 'rgba(242,233,220,0.5)' }}>
              Av. Gral. Roca 1120 · martes a sábado de 9 a 21, lunes de 9 a 15
            </p>
          </div>
        </div>

        {/* Etiquetas de las zonas (las ubica la cámara cada cuadro). */}
        <div className="pointer-events-none absolute inset-0">
          {ZONES.map((z, i) => {
            const on = hover === z.id || active === z.id
            return (
              <button
                key={z.id}
                ref={(el) => (R.current.labels[z.id] = el)}
                type="button"
                onMouseEnter={() => overLabel(z.id)}
                onMouseLeave={() => overLabel(null)}
                onFocus={() => overLabel(z.id)}
                onBlur={() => overLabel(null)}
                onClick={() => setActive(active === z.id ? null : z.id)}
                aria-expanded={active === z.id}
                className="c33-label absolute top-0 left-0 flex flex-col items-center"
                style={{ opacity: labelsOn ? 1 : 0, pointerEvents: labelsOn ? 'auto' : 'none', transitionDelay: labelsOn ? `${i * 70}ms` : '0ms' }}
              >
                <span
                  className="rounded-[5px] border px-2.5 py-1.5 text-[10.5px] font-medium tracking-[0.16em] uppercase transition-colors duration-200"
                  style={{ ...MONO, background: on ? C.orange : 'rgba(11,12,15,0.88)', color: on ? '#0b0c0f' : C.cream, borderColor: on ? C.orange : 'rgba(228,96,29,0.7)', boxShadow: '0 6px 18px rgba(0,0,0,0.45)' }}
                >
                  {z.label}
                </span>
                <span aria-hidden="true" className="h-3 w-px" style={{ background: on ? C.orange : 'rgba(228,96,29,0.7)' }} />
              </button>
            )
          })}
        </div>

        {/* La ficha de la zona elegida, junto a su etiqueta. */}
        <div ref={set('card')} className="pointer-events-none absolute top-0 left-0">
          {zone ? (
            <div key={zone.id} className="c33-card pointer-events-auto w-[min(320px,86vw)] rounded-lg border p-5" style={{ background: 'rgba(14,15,19,0.96)', borderColor: 'rgba(242,233,220,0.14)', boxShadow: '0 24px 60px rgba(0,0,0,0.55)' }}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-[10.5px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
                  {zone.kicker}
                </p>
                <button type="button" onClick={() => setActive(null)} aria-label="Cerrar la ficha" className="tpl-hit -mt-1 -mr-1 grid h-7 w-7 place-items-center rounded-full text-[16px] leading-none transition-colors hover:bg-white/10" style={{ color: 'rgba(242,233,220,0.7)' }}>
                  ×
                </button>
              </div>
              <p className="mt-2 text-[22px] leading-tight font-semibold uppercase" style={DISPLAY}>
                {zone.title}
              </p>
              {/* Una vista de la zona, sin texto de relleno. */}
              {zone.img ? (
                <img key={zone.img} src={zone.img} alt="" width="640" height="400" decoding="async" className="c33-card-img mt-3 aspect-[16/10] w-full rounded-md object-cover" />
              ) : null}
              {zone.prices ? (
                // La pantalla LED de la barra: negra, de aeropuerto, texto blanco y naranja.
                <div className="mt-4 rounded-md border-2 p-3.5" style={{ background: '#06070a', borderColor: '#23262d', boxShadow: 'inset 0 0 22px rgba(0,0,0,0.9)' }}>
                  <p className="flex items-center justify-between text-[13px] font-bold tracking-[0.2em] uppercase" style={{ ...MONO, color: '#fff' }}>
                    Cafetería
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: C.orange, boxShadow: `0 0 8px ${C.orange}` }} />
                  </p>
                  {[
                    ['Calientes', PRICES.calientes],
                    ['Fríos', PRICES.frios],
                  ].map(([title, rows]) => (
                    <div key={title} className="mt-3">
                      <p className="mb-1 text-[10.5px] font-bold tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
                        {title}
                      </p>
                      {rows.map(([name, price]) => (
                        <p key={name} className="flex items-baseline gap-2 text-[12.5px] leading-[1.75] uppercase" style={{ ...MONO, color: '#f4f4f1' }}>
                          <span className="whitespace-nowrap">{name}</span>
                          <span aria-hidden="true" className="flex-1 translate-y-[-3px] border-b border-dotted opacity-25" />
                          <span className="tabular-nums" style={{ color: '#fff' }}>
                            {price}
                          </span>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Abajo al centro: el estado y la pista. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-wrap items-center justify-center gap-2 px-6 transition-opacity duration-700" style={{ opacity: labelsOn ? 1 : 0 }}>
          <p className="flex items-center gap-2.5 rounded-full border px-4 py-2 text-[12px]" style={{ ...BODY, background: 'rgba(14,15,19,0.85)', borderColor: 'rgba(242,233,220,0.12)', color: 'rgba(242,233,220,0.8)' }}>
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: status.open ? '#7dffa8' : C.orange, boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }} />
            {status.label}. {touch ? 'El local gira deslizando de costado; cada zona se abre al tocar su etiqueta.' : 'El local gira al arrastrarlo y cada zona se abre al tocarla.'}
          </p>
          {/* Acercar y alejar (también Ctrl + rueda o el pellizco). */}
          <span className="pointer-events-auto flex overflow-hidden rounded-full border" style={{ background: 'rgba(14,15,19,0.85)', borderColor: 'rgba(242,233,220,0.12)' }}>
            {[
              ['−', 'Alejar el local', 1 / 1.25],
              ['+', 'Acercar el local', 1.25],
            ].map(([sign, label, f]) => (
              <button
                key={sign}
                type="button"
                aria-label={label}
                onClick={() => R.current.scene?.zoomBy(f)}
                className="grid h-9 w-10 place-items-center text-[18px] leading-none transition-colors hover:bg-white/10 active:scale-[0.95]"
                style={{ ...MONO, color: C.cream }}
              >
                {sign}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={() => R.current.scene?.resetView()}
            className="pointer-events-auto rounded-full border px-4 py-2 text-[12px] transition-[opacity,transform] duration-300 active:scale-[0.97]"
            style={{ ...BODY, background: 'rgba(14,15,19,0.85)', borderColor: 'rgba(228,96,29,0.6)', color: C.cream, opacity: moved ? 1 : 0, transform: moved ? 'none' : 'translateY(6px)', pointerEvents: moved ? 'auto' : 'none' }}
          >
            Vista inicial
          </button>
        </div>
      </div>
      <style>{`
        .c33-label { transition: opacity 500ms cubic-bezier(0.22,1,0.36,1); }
        .c33-label:focus-visible { outline: none; }
        .c33-label:focus-visible > span:first-child { outline: 2px solid ${C.neon}; outline-offset: 3px; }
        @keyframes c33-card-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: none; } }
        .c33-card { animation: c33-card-in 260ms cubic-bezier(0.22,1,0.36,1); transform-origin: top left; }
        .c33-map-cta { transition: transform 160ms ease-out, background-color 200ms; }
        @media (hover: hover) { @keyframes c33-card-img { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: none; } } .c33-card-img { animation: c33-card-img 520ms cubic-bezier(0.22,1,0.36,1); } .c33-map-cta:hover { background: #fff !important; } }
        .c33-map-cta:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 3px; }
      `}</style>
    </section>
  )
}

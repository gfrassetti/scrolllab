import { useEffect, useRef, useState } from 'react'
import { useGSAP, ScrollTrigger, gsap } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'

/**
 * cāpsula33 — «Cómo llegar», fijada y a todo el ancho.
 *
 * Tomado del patrón de la sección de ubicación de MERIDIAN (mapa a todo el
 * ancho, rutas punteadas desde la sede hasta cada punto, tarjetas abajo), con
 * el plano de papel del local:
 *
 *   1. Primero el texto, grande, y el plano como una tarjeta al costado.
 *   2. Con el scroll el plano se abre hasta ocupar toda la pantalla y el texto
 *      queda en un recuadro arriba a la izquierda.
 *   3. Desde el local salen, de a una, las rutas punteadas a los puntos de la
 *      zona (los del mapa de papel: Lácar, Chapelco, Lanín, Quila Quina) y
 *      entran sus tarjetas. Pasar el puntero por una tarjeta enciende su ruta.
 *
 * El plano esconde el mapa real: al pasar el puntero, una lente lo deja ver
 * teñido con los colores del papel; con un clic se abre el mapa de Google de
 * verdad, en colores normales y para usar. El plano es un esquema: no está a
 * escala, ubica el local y nada más.
 */

const ADDRESS = 'Av. Gral. Roca 1120, San Martín de los Andes, Neuquén'
const EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&z=16&output=embed`
const OPEN = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`
// El tinte del mapa real mientras está escondido: el azul gris del papel.
const TINT = 'grayscale(1) sepia(0.55) hue-rotate(160deg) saturate(1.1) brightness(0.97) contrast(0.92)'

const PAPER = '#9fb3bb'
const NAVY = '#22323b'
const CREAM = '#efe3c8'
const HQ = [520, 300] // el local, en coordenadas del plano (800 × 520)

/** Los puntos de la zona, con el texto del mapa de papel del local. */
const POIS = [
  { id: 'lacar', name: 'Lago Lácar', note: 'Espejo de navegación: sirve para orientarse antes de salir.', at: [112, 240], route: 'M520 300 C 420 300, 260 250, 112 240' },
  { id: 'chapelco', name: 'Cerro Chapelco', note: 'La antena natural de la ciudad, al sureste.', at: [690, 452], route: 'M520 300 C 600 330, 660 380, 690 452' },
  { id: 'lanin', name: 'Volcán Lanín', note: 'El reactor dormido, hacia el noroeste.', at: [60, 50], route: 'M520 300 C 430 220, 220 90, 60 50' },
  { id: 'quila', name: 'Quila Quina', note: 'Ruta de exploración secundaria, del otro lado del lago.', at: [70, 440], route: 'M520 300 C 420 380, 220 430, 70 440' },
]

/** Manzanas del esquema: una grilla girada, con la avenida Roca marcada. */
const BLOCKS = (() => {
  const out = []
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      if ((r === 0 && c === 0) || (r === 4 && c === 5)) continue
      out.push({ x: 300 + c * 74, y: 110 + r * 66, w: 62, h: 54 })
    }
  }
  return out
})()

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)

export default function LlegarSection() {
  const rootRef = useRef(null)
  const R = useRef({ routes: [], pins: [], cards: [] })
  const [revealed, setRevealed] = useState(false)
  const [loadMap, setLoadMap] = useState(false)
  const [focus, setFocus] = useState(null)
  // En vertical se ve solo una franja del plano: se corre para que el local quede en el centro.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.9)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth / window.innerHeight < 0.9)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const lens = useRef({ r: 0, x: 0.5, y: 0.5 })

  // El mapa real se pide recién cuando la sección está cerca.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLoadMap(true), { rootMargin: '800px 0px' })
    io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  const paintLens = () => {
    const r = R.current
    const { r: rad, x, y } = lens.current
    const mask = rad > 0.5 ? `radial-gradient(circle ${rad}px at ${x * 100}% ${y * 100}%, transparent 97%, #000 100%)` : 'none'
    r.plan.style.webkitMaskImage = mask
    r.plan.style.maskImage = mask
    r.ring.style.width = r.ring.style.height = `${rad * 2}px`
    r.ring.style.left = `${x * 100}%`
    r.ring.style.top = `${y * 100}%`
    r.ring.style.opacity = rad > 4 && !r.open ? '1' : '0'
  }

  // La lente funciona cuando el plano ya está abierto (no mientras es una tarjeta chica).
  const lensReady = () => R.current.expanded > 0.98 && !R.current.open
  const onMove = (e) => {
    if (!lensReady()) return
    const b = R.current.card.getBoundingClientRect()
    lens.current.x = (e.clientX - b.left) / b.width
    lens.current.y = (e.clientY - b.top) / b.height
    paintLens()
  }
  const onEnter = (e) => {
    if (e.pointerType === 'touch' || !lensReady()) return
    onMove(e)
    gsap.to(lens.current, { r: 120, duration: 0.7, ease: 'expo.out', overwrite: true, onUpdate: paintLens })
  }
  const onLeave = () => {
    if (R.current.open) return
    gsap.to(lens.current, { r: 0, duration: 0.45, ease: 'power2.out', overwrite: true, onUpdate: paintLens })
  }
  const open = (e) => {
    const r = R.current
    if (r.open || r.expanded < 0.98) return
    r.open = true
    const b = r.card.getBoundingClientRect()
    if (e && e.clientX) {
      lens.current.x = (e.clientX - b.left) / b.width
      lens.current.y = (e.clientY - b.top) / b.height
    }
    gsap.to(lens.current, { r: Math.hypot(b.width, b.height), duration: 0.9, ease: 'expo.inOut', overwrite: true, onUpdate: paintLens, onComplete: () => setRevealed(true) })
  }
  const close = () => {
    const r = R.current
    setRevealed(false)
    r.open = false
    gsap.to(lens.current, { r: 0, duration: 0.8, ease: 'expo.inOut', overwrite: true, onUpdate: paintLens })
  }

  // El recorrido de la sección fijada.
  useGSAP(
    () => {
      const r = R.current
      const paint = (p) => {
        const wide = window.innerWidth >= 1024
        // 1 → 2: el plano pasa de tarjeta a pantalla completa (inset del recuadro → 0).
        const e = smooth(clamp01((p - 0.16) / 0.3))
        r.expanded = e
        const from = wide ? [16, 6, 16, 50] : [50, 5, 9, 5] // top, right, bottom, left (%)
        const inset = from.map((v) => lerp(v, 0, e))
        const rad = lerp(18, 0, e)
        r.card.style.clipPath = `inset(${inset[0]}% ${inset[1]}% ${inset[2]}% ${inset[3]}% round ${rad}px)`
        r.card.style.pointerEvents = e > 0.98 ? 'auto' : 'none'
        r.plan.style.transform = `scale(${lerp(1.08, 1, e)})`
        // El texto grande se achica en un recuadro arriba a la izquierda.
        const t = smooth(clamp01((p - 0.2) / 0.26))
        r.big.style.opacity = String(1 - clamp01(t * 1.6))
        r.big.style.transform = `translate3d(0, ${-t * 40}px, 0)`
        r.big.style.pointerEvents = t > 0.5 ? 'none' : 'auto'
        r.panel.style.opacity = String(clamp01((t - 0.55) / 0.45))
        r.panel.style.transform = `translate3d(0, ${(1 - clamp01((t - 0.55) / 0.45)) * 16}px, 0)`
        r.panel.style.pointerEvents = t > 0.7 ? 'auto' : 'none'
        // 3: las rutas a los puntos, de a una, y sus tarjetas.
        POIS.forEach((_, i) => {
          const k = clamp01((p - (0.5 + i * 0.09)) / 0.12)
          r.routes[i].style.strokeDashoffset = String(1 - k)
          r.pins[i].style.opacity = String(clamp01((k - 0.7) / 0.3))
          const c = clamp01((p - (0.56 + i * 0.09)) / 0.1)
          r.cards[i].style.opacity = String(c)
          r.cards[i].style.transform = `translate3d(0, ${(1 - c) * 24}px, 0)`
        })
        r.hint.style.opacity = String(clamp01((p - 0.48) / 0.08))
      }
      paint(0)
      ScrollTrigger.create({ trigger: rootRef.current, start: 'top top', end: 'bottom bottom', onUpdate: (self) => paint(self.progress), onRefresh: (self) => paint(self.progress) })
    },
    { scope: rootRef },
  )

  const set = (k) => (el) => (R.current[k] = el)
  const mono = "'Roboto Mono', ui-monospace, monospace"

  return (
    <section ref={rootRef} id="llegar" className="relative h-[340svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* El plano (y el mapa real abajo), recortado: tarjeta al principio, pantalla completa después. */}
        <div
          ref={set('card')}
          role="button"
          tabIndex={revealed ? -1 : 0}
          aria-label="Ver el mapa real del local"
          onPointerEnter={onEnter}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onClick={open}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
          className={`c33-llegar absolute inset-0 overflow-hidden ${revealed ? '' : 'cursor-pointer'}`}
          style={{ background: PAPER }}
        >
          {loadMap ? (
            <iframe
              title="Mapa de Google con la ubicación de cāpsula33"
              src={EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
              style={{ filter: revealed ? 'none' : TINT, pointerEvents: revealed ? 'auto' : 'none', transition: 'filter 700ms ease-out' }}
            />
          ) : null}

          <svg ref={set('plan')} viewBox={narrow ? '100 0 800 520' : '0 0 800 520'} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true" style={{ opacity: revealed ? 0 : 1, transition: 'opacity 400ms ease-out', transformOrigin: '50% 50%' }}>
            <defs>
              <pattern id="c33-paper-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke={NAVY} strokeOpacity="0.1" />
              </pattern>
            </defs>
            <rect x="-200" y="-200" width="1200" height="920" fill={PAPER} />
            <rect x="-200" y="-200" width="1200" height="920" fill="url(#c33-paper-grid)" />
            {/* El lago Lácar, al oeste. */}
            <path d="M-120 140 C 60 110, 150 150, 190 210 C 230 270, 200 340, 150 380 C 100 420, 30 430, -120 410 Z" fill="#6e8c99" stroke={NAVY} strokeWidth="2" />
            {/* Las manzanas. */}
            <g transform="rotate(-8 520 260)">
              {BLOCKS.map((b, i) => (
                <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={CREAM} stroke={NAVY} strokeWidth="1.5" />
              ))}
              <line x1="514" y1="90" x2="514" y2="450" stroke={C.orange} strokeWidth="4" strokeDasharray="10 6" />
              <text x="522" y="96" fill={NAVY} fontFamily={mono} fontSize="11" fontWeight="700" letterSpacing="1.5" transform="rotate(90 522 96)">AV. GRAL. ROCA</text>
            </g>
            <path d="M610 560 L690 450 L770 560 Z" fill="none" stroke={NAVY} strokeWidth="2" />

            {/* Las rutas, desde el local hasta cada punto. */}
            {POIS.map((poi, i) => (
              <g key={poi.id}>
                <path d={poi.route} fill="none" stroke={NAVY} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
                <path
                  ref={(el) => (R.current.routes[i] = el)}
                  d={poi.route}
                  pathLength="1"
                  fill="none"
                  stroke={C.orange}
                  strokeWidth={focus === poi.id ? 4.5 : 3}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-width 200ms' }}
                />
                <g ref={(el) => (R.current.pins[i] = el)} style={{ opacity: 0 }}>
                  <circle cx={poi.at[0]} cy={poi.at[1]} r={focus === poi.id ? 13 : 9} fill={CREAM} stroke={NAVY} strokeWidth="2" style={{ transition: 'r 200ms' }} />
                  <circle cx={poi.at[0]} cy={poi.at[1]} r="3.5" fill={C.orange} />
                  <text x={poi.at[0] + (poi.at[0] > 400 ? -16 : 16)} y={poi.at[1] + 4} textAnchor={poi.at[0] > 400 ? 'end' : 'start'} fill={NAVY} fontFamily={mono} fontSize="12" fontWeight="700" letterSpacing="1.2">
                    {poi.name.toUpperCase()}
                  </text>
                </g>
              </g>
            ))}

            {/* El local. */}
            <g transform={`translate(${HQ[0]} ${HQ[1]})`}>
              <circle r="30" fill={C.orange} fillOpacity="0.22" className="c33-hq-pulse" />
              <circle r="13" fill={C.orange} stroke={NAVY} strokeWidth="2" />
              <path d="M-6 3 A6 6 0 0 1 6 3 Z" fill={CREAM} />
            </g>
            <g transform={`translate(${HQ[0] + 22} ${HQ[1] + 22})`}>
              <rect width="168" height="44" rx="6" fill={NAVY} />
              <text x="12" y="19" fill={CREAM} fontFamily={mono} fontSize="13" fontWeight="600">cāpsula33</text>
              <text x="12" y="34" fill={CREAM} fillOpacity="0.75" fontFamily={mono} fontSize="10" letterSpacing="1">ROCA 1120 · C-33</text>
            </g>
            <g transform="translate(752 54)">
              <circle r="20" fill="none" stroke={NAVY} strokeWidth="1.5" />
              <path d="M0 -16 L6 4 L0 0 L-6 4 Z" fill={C.orange} />
              <text y="-25" textAnchor="middle" fill={NAVY} fontFamily={mono} fontSize="11" fontWeight="700">N</text>
            </g>
          </svg>

          {/* El aro de la lente. */}
          <span ref={set('ring')} aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0" style={{ boxShadow: `0 0 0 2px ${CREAM}, 0 0 0 6px rgba(34,50,59,0.55), 0 12px 40px rgba(0,0,0,0.35)` }}>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase" style={{ ...MONO, background: NAVY, color: CREAM }}>
              Clic para abrir
            </span>
          </span>
        </div>

        {/* 1. El texto grande, antes de que se abra el plano. */}
        <div ref={set('big')} className="absolute inset-x-0 top-0 px-6 pt-[18svh] md:px-10 lg:top-1/2 lg:w-[46vw] lg:-translate-y-1/2 lg:pt-0 lg:pl-[5vw]">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
            <span className="h-px w-8" style={{ background: C.neon }} />
            Cómo llegar
          </p>
          <h2 className="mt-4 text-[clamp(2.4rem,5.4vw,5.8rem)] leading-[0.93] font-semibold uppercase" style={DISPLAY}>
            Roca 1120,
            <br />
            <span style={{ color: C.neon }}>Sector SMA.</span>
          </h2>
          <p className="mt-5 max-w-[34ch] text-[17px] leading-[1.5]" style={{ ...BODY, color: 'rgba(242,233,220,0.8)' }}>
            San Martín de los Andes, Neuquén. Martes a sábado de 9 a 21; lunes de 9 a 15.
          </p>
        </div>

        {/* 2. El recuadro, sobre el plano abierto. */}
        <div ref={set('panel')} className="absolute top-20 left-4 max-w-[min(92vw,22rem)] rounded-lg p-4 opacity-0 md:left-10 lg:top-24 lg:left-[5vw]" style={{ background: 'rgba(11,12,15,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 18px 50px rgba(0,0,0,0.35)' }}>
          <p className="text-[10.5px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            Cómo llegar
          </p>
          <p className="mt-1.5 text-[22px] leading-tight font-semibold uppercase" style={DISPLAY}>
            Roca 1120, Sector SMA
          </p>
          <p className="mt-1 text-[13px] leading-[1.5]" style={{ ...BODY, color: 'rgba(242,233,220,0.75)' }}>
            San Martín de los Andes · martes a sábado 9–21, lunes 9–15
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={OPEN} target="_blank" rel="noopener noreferrer" className="c33-go inline-flex h-10 items-center rounded-full px-4 text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ ...DISPLAY, background: C.cream, color: '#0b0c0f' }}>
              Abrir en Google Maps
            </a>
            {revealed ? (
              <button type="button" onClick={close} className="c33-back inline-flex h-10 items-center rounded-full border px-4 text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ ...MONO, borderColor: 'rgba(242,233,220,0.4)', color: C.cream }}>
                Volver al plano
              </button>
            ) : null}
          </div>
          <p ref={set('hint')} className="mt-3 text-[11px] leading-[1.5] opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}>
            El plano esconde el mapa real: aparece al pasar el puntero y se abre entero con un clic.
          </p>
        </div>

        {/* 3. Las tarjetas de los puntos de la zona. */}
        <ul className="absolute inset-x-0 bottom-4 flex gap-3 overflow-x-auto px-4 pb-1 md:bottom-6 md:px-10 lg:justify-end lg:px-[5vw]" style={{ scrollbarWidth: 'none' }}>
          {POIS.map((poi, i) => (
            <li
              key={poi.id}
              ref={(el) => (R.current.cards[i] = el)}
              onPointerEnter={() => setFocus(poi.id)}
              onPointerLeave={() => setFocus(null)}
              className="c33-poi w-[13.5rem] shrink-0 rounded-lg border p-3.5 opacity-0"
              style={{ background: focus === poi.id ? NAVY : 'rgba(11,12,15,0.86)', borderColor: focus === poi.id ? C.orange : 'rgba(242,233,220,0.14)', backdropFilter: 'blur(10px)' }}
            >
              <p className="text-[10px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
                0{i + 1}
              </p>
              <p className="mt-1 text-[15px] font-semibold uppercase" style={DISPLAY}>
                {poi.name}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.72)' }}>
                {poi.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .c33-go, .c33-back { transition: transform 160ms ease-out, background-color 200ms, color 200ms; }
        .c33-go:active, .c33-back:active { transform: scale(0.97); }
        @media (hover: hover) { .c33-go:hover { background: #fff !important; } .c33-back:hover { background: ${C.orange}; color: #0b0c0f; } }
        .c33-go:focus-visible, .c33-back:focus-visible, .c33-llegar:focus-visible { outline: 2px solid ${C.neon}; outline-offset: -4px; }
        .c33-poi { transition: background-color 220ms ease-out, border-color 220ms ease-out; }
        .c33-poi::-webkit-scrollbar { display: none; }
        @keyframes c33-hq { 0%, 100% { transform: scale(1); opacity: 0.22; } 50% { transform: scale(1.5); opacity: 0.05; } }
        .c33-hq-pulse { transform-box: fill-box; transform-origin: center; animation: c33-hq 2.4s ease-in-out infinite; }
      `}</style>
    </section>
  )
}

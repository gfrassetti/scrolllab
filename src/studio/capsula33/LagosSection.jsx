import { useEffect, useRef, useState } from 'react'
import { useGSAP, ScrollTrigger } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'

/**
 * cāpsula33 — «La ruta»: el plano de la Base 7-Lagos, que se pinta con el scroll.
 *
 * Referencia: el mapa plegado que el local tiene en la mesa (plano azul, lagos
 * naranjas, ruta de evacuación). Acá está redibujado de cero, sin la foto: un
 * trazado de la ruta de los siete lagos como si fuera una estación espacial, de
 * la puerta del Domo C-33 (San Martín de los Andes) hasta el lago mayor. Con el
 * scroll la ruta se dibuja de un trazo, cada lago se pinta de naranja cuando la
 * ruta llega, y la lista de la izquierda marca dónde estamos.
 */

const VB = { w: 600, h: 840 }
// El recorte que se ve (el domo asoma por arriba del plano).
const VIEW = '-30 -95 660 955'
// Los lagos, de la puerta del domo hacia abajo: [nombre, x, y, ancho, alto, texto].
// Se escribieron de abajo hacia arriba; `flip` los da vuelta (la ruta baja con el scroll).
const LAKES_UP = [
  ['Lago Lácar', 60, 610, 170, 120, 'Puerto de partida. Es el espejo de navegación: sirve para orientarse antes de salir.'],
  ['Lago Machónico', 300, 560, 110, 70, 'Primer salto de la ruta: una escala corta entre el bosque.'],
  ['Lago Falkner', 380, 430, 130, 80, 'Agua profunda y quieta; la ruta lo bordea por la costa.'],
  ['Lago Villarino', 170, 400, 120, 80, 'Estación intermedia: el tramo más largo antes de la próxima señal.'],
  ['Lago Escondido', 300, 290, 90, 60, 'Casi no se ve desde la ruta: hay que saber dónde mirar.'],
  ['Lago Correntoso', 120, 210, 130, 70, 'Acá el agua se mueve: un río corto lo lleva todo hacia el lago mayor.'],
  ['Lago Espejo', 360, 150, 120, 70, 'La última escala antes del lago mayor. El agua devuelve el cielo.'],
  ['Lago Nahuel Huapi', 150, 40, 300, 80, 'Bonus: el lago mayor del sistema. Acá termina el mapa conocido.'],
]
const LAKES = LAKES_UP.map(([n, x, y, w, h, t]) => [n, x, VB.h - y - h, w, h, t])
const centers = LAKES.map(([, x, y, w, h]) => [x + w / 2, y + h / 2])
// La ruta pasa por el centro de cada lago, en tramos rectos como un circuito.
const ROUTE = 'M145 40 V170 H250 V245 H445 V370 H330 V400 H230 V460 H345 V520 H265 V595 H185 H300 V655 H420 V720 H300 V760'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function LagosSection() {
  const rootRef = useRef(null)
  const R = useRef({ lakes: [], paints: [], labels: [], times: [] })
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)

  // Cuándo (0–1 del scroll) la ruta llega a cada lago: se mide sobre el trazado real.
  useEffect(() => {
    const path = R.current.route
    if (!path) return
    const total = path.getTotalLength()
    const times = centers.map(([cx, cy]) => {
      let best = 0
      let bestD = Infinity
      for (let l = 0; l <= total; l += 2) {
        const pt = path.getPointAtLength(l)
        const d = (pt.x - cx) ** 2 + (pt.y - cy) ** 2
        if (d < bestD) {
          bestD = d
          best = l
        }
      }
      return best / total
    })
    R.current.times = times
    R.current.total = total
  }, [])

  useGSAP(
    () => {
      const r = R.current
      const START = 0.1
      const SPAN = 0.78
      const paint = (p) => {
        // Marco y cuadrícula.
        r.frame.style.opacity = String(0.35 + 0.65 * clamp01(p / 0.06))
        // La puerta del domo.
        const dome = clamp01((p - 0.03) / 0.07)
        r.dome.style.opacity = String(dome)
        r.dome.style.transform = `translate3d(0, ${(1 - dome) * 14}px, 0)`
        // La ruta, de un trazo.
        const draw = clamp01((p - START) / SPAN)
        r.progress.style.strokeDashoffset = String(1 - draw)
        r.head.style.opacity = draw > 0 && draw < 1 ? '1' : '0'
        if (r.total) {
          const pt = r.route.getPointAtLength(draw * r.total)
          r.head.setAttribute('cx', pt.x)
          r.head.setAttribute('cy', pt.y)
        }
        // Cada lago se pinta cuando la ruta llega.
        let cur = -1
        r.times.forEach((t, i) => {
          const at = START + SPAN * t
          const k = clamp01((p - at + 0.012) / 0.05)
          const e = 1 - (1 - k) * (1 - k)
          r.paints[i].style.opacity = String(e)
          r.lakes[i].style.transform = `scale(${0.92 + 0.08 * e})`
          r.labels[i].style.opacity = String(0.25 + 0.75 * e)
          if (k > 0.2) cur = i
        })
        if (cur !== activeRef.current) {
          activeRef.current = cur
          setActive(cur)
        }
        // El área restringida: el sello final.
        const stamp = clamp01((p - 0.9) / 0.08)
        r.stamp.style.opacity = String(stamp)
        r.stamp.style.transform = `scale(${1.25 - 0.25 * stamp}) rotate(${-12 + 12 * stamp}deg)`
        // El sector de partida: se ve al principio y se va cuando arranca el camino.
        const sma = clamp01((p - 0.03) / 0.06) * (1 - clamp01((p - 0.22) / 0.06))
        r.sma.style.opacity = String(sma)
        r.sma.style.transform = `translate3d(0, ${(1 - sma) * 12}px, 0)`
        // El resplandor del camino sigue al trazo; al completarse, todo el camino queda encendido.
        r.glow.style.strokeDashoffset = String(1 - draw)
        r.glow.style.opacity = String(0.55 + 0.35 * clamp01((p - (START + SPAN)) / 0.05))
        // El lago actual, grande: entra con cada cambio.
        r.now.style.opacity = String(draw > 0.01 && p < 0.97 ? 1 : 0)
      }
      paint(0)
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => paint(self.progress),
        onRefresh: (self) => paint(self.progress),
      })
    },
    { scope: rootRef },
  )

  const set = (k) => (el) => (R.current[k] = el)
  const cur = active >= 0 ? LAKES[active] : null

  return (
    <section ref={rootRef} id="ruta" className="relative h-[520svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* La mesa de planos, de fondo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(169,214,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(169,214,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* El plano entero, centrado; no se mueve: el que se enciende es el camino. */}
        <svg viewBox={VIEW} preserveAspectRatio="xMidYMid meet" className="absolute inset-x-0 top-[23svh] h-[47svh] w-full sm:top-[8svh] sm:h-[87svh]" role="img" aria-label="Plano de la ruta de los siete lagos, dibujado como una estación espacial: la ruta sale del domo C-33 y pasa por ocho lagos hasta el Nahuel Huapi">
          <defs>
            <pattern id="c33-lag-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0H0V30" fill="none" stroke="#a9d6ff" strokeOpacity="0.1" strokeWidth="1" />
            </pattern>
          </defs>
          <defs>
            <filter id="c33-route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <g ref={set('frame')} style={{ opacity: 0.35 }}>
            <rect x="2" y="2" width={VB.w - 4} height={VB.h - 4} rx="22" fill="#0d1d27" stroke="#a9d6ff" strokeOpacity="0.4" strokeWidth="2" />
            <rect x="2" y="2" width={VB.w - 4} height={VB.h - 4} rx="22" fill="url(#c33-lag-grid)" />
            {[0, 1, 2, 3, 4].map((k) => (
              <path key={k} d={`M2 ${120 + k * 150} C 150 ${60 + k * 150}, 300 ${200 + k * 150}, ${VB.w - 2} ${110 + k * 150}`} fill="none" stroke="#a9d6ff" strokeOpacity="0.12" strokeWidth="1.2" />
            ))}
            <path d="M470 400 L520 320 L570 400 Z" fill="none" stroke="#f2e9dc" strokeOpacity="0.4" strokeWidth="1.5" />
            <text x="520" y="420" textAnchor="middle" fill="#f2e9dc" fillOpacity="0.5" fontSize="9" fontFamily="'Roboto Mono', monospace" letterSpacing="1.5">CHAPELCO</text>
            <path d="M30 590 L80 510 L130 590 Z" fill="none" stroke="#f2e9dc" strokeOpacity="0.4" strokeWidth="1.5" />
            <text x="80" y="610" textAnchor="middle" fill="#f2e9dc" fillOpacity="0.5" fontSize="9" fontFamily="'Roboto Mono', monospace" letterSpacing="1.5">LANÍN</text>
          </g>

          <g ref={set('dome')} style={{ opacity: 0 }}>
            <path d="M70 40 A75 75 0 0 1 220 40 Z" fill="#17323f" stroke="#f2e9dc" strokeWidth="2" />
            <path d="M95 40 A50 50 0 0 1 195 40" fill="none" stroke="#a9d6ff" strokeOpacity="0.6" />
            <rect x="136" y="16" width="18" height="24" rx="8" fill={C.orange} />
            <text x="145" y="-48" textAnchor="middle" fill="#f2e9dc" fontSize="10" fontFamily="'Roboto Mono', monospace" letterSpacing="2">C-33 · DOMO 1</text>
          </g>

          <path ref={set('route')} d={ROUTE} fill="none" stroke="#a9d6ff" strokeOpacity="0.22" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
          <path d={ROUTE} fill="none" stroke="#a9d6ff" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="3 7" strokeLinejoin="round" />
          {/* El camino que se ilumina: un resplandor ancho y el trazo encima. */}
          <path ref={set('glow')} d={ROUTE} pathLength="1" fill="none" stroke={C.neon} strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1" filter="url(#c33-route-glow)" style={{ opacity: 0.55 }} />
          <path ref={set('progress')} d={ROUTE} pathLength="1" fill="none" stroke={C.orange} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1" style={{ filter: 'drop-shadow(0 0 5px rgba(255,122,26,0.7))' }} />

          {LAKES.map(([name, x, y, w, h], i) => (
            <g key={name} ref={(el) => (R.current.lakes[i] = el)} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <rect x={x} y={y} width={w} height={h} rx="18" fill="#17323f" stroke="#a9d6ff" strokeOpacity="0.7" strokeWidth="1.5" />
              <rect ref={(el) => (R.current.paints[i] = el)} x={x} y={y} width={w} height={h} rx="18" fill={i === LAKES.length - 1 ? '#f2e9dc' : C.orange} fillOpacity={i === LAKES.length - 1 ? 0.85 : 0.92} style={{ opacity: 0 }} />
              <g ref={(el) => (R.current.labels[i] = el)}>
                <text x={x + w / 2} y={y + h / 2 - 2} textAnchor="middle" fill="#f2e9dc" fontSize="11" fontFamily="'Chakra Petch', 'Roboto Mono', sans-serif" fontWeight="700" letterSpacing="1.2">
                  {name.replace('Lago ', '').toUpperCase()}
                </text>
                <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill="#f2e9dc" fillOpacity="0.8" fontSize="9" fontFamily="'Roboto Mono', monospace" letterSpacing="1.5">
                  {i === LAKES.length - 1 ? 'BONUS' : `0${i + 1}`}
                </text>
              </g>
            </g>
          ))}
          <circle ref={set('head')} r="7" fill="#fff" style={{ opacity: 0, filter: 'drop-shadow(0 0 8px #fff)' }} cx="145" cy="800" />

          <g ref={set('stamp')} style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: 'center' }}>
            <circle cx="510" cy="790" r="44" fill="none" stroke={C.orange} strokeWidth="2.5" />
            <circle cx="510" cy="790" r="35" fill="none" stroke={C.orange} strokeOpacity="0.6" strokeDasharray="4 5" />
            <text x="510" y="786" textAnchor="middle" fill={C.orange} fontSize="10" fontFamily="'Chakra Petch', sans-serif" fontWeight="700" letterSpacing="1.5">ÁREA</text>
            <text x="510" y="800" textAnchor="middle" fill={C.orange} fontSize="10" fontFamily="'Chakra Petch', sans-serif" fontWeight="700" letterSpacing="1.5">RESTRINGIDA</text>
          </g>
        </svg>

        {/* Velo suave a la izquierda: el texto flota sobre el plano y se lee igual. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(11,12,15,0.75) 0%, rgba(11,12,15,0) 34%)' }} />

        {/* Arriba a la izquierda: el título y el sector de partida. */}
        <div className="absolute top-20 left-6 max-w-[min(88vw,26rem)] md:left-10 lg:top-24 lg:left-[5vw]">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
            <span className="h-px w-8" style={{ background: C.neon }} />
            La ruta
          </p>
          <h2 className="mt-3 text-[clamp(1.9rem,4.4vw,4.6rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
            Base <span className="whitespace-nowrap" style={{ color: C.neon }}>7-Lagos.</span>
          </h2>
          <div ref={set('sma')} className="mt-4 rounded-md border p-3.5 opacity-0" style={{ borderColor: 'rgba(169,214,255,0.28)', background: 'rgba(13,29,39,0.75)', backdropFilter: 'blur(6px)' }}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ ...MONO, color: '#a9d6ff' }}>
              Sector SMA · C-33 · Domo 1
            </p>
            <p className="mt-1.5 text-[14px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.85)' }}>
              Puerta principal de la estación andina. Punto de recalificación antes de internarse en territorio no cartografiado.
            </p>
          </div>
        </div>

        {/* Abajo a la izquierda: el lago actual, grande, y la ruta como una regla de pasos. */}
        <div className="absolute right-6 bottom-6 left-6 md:right-auto md:left-10 md:max-w-[26rem] lg:bottom-10 lg:left-[5vw]">
          <div ref={set('now')} className="transition-opacity duration-500" style={{ opacity: 0 }} aria-live="polite">
            <p className="text-[11px] tracking-[0.22em] uppercase tabular-nums" style={{ ...MONO, color: C.neon }}>
              {cur ? (active === LAKES.length - 1 ? 'Bonus' : `Escala 0${active + 1} / 07`) : ''}
            </p>
            <p key={active} className="c33-lake-now mt-1 text-[clamp(1.6rem,3.6vw,3.4rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
              {cur ? cur[0] : ''}
            </p>
            <p key={`t${active}`} className="c33-lake-now mt-2 max-w-[42ch] text-[15px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.82)' }}>
              {cur ? cur[5] : ''}
            </p>
          </div>
          <ol className="mt-4 flex gap-1.5" aria-label="Ruta de evacuación">
            {LAKES.map(([name], i) => (
              <li key={name} title={name} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: i < active ? 'rgba(255,122,26,0.55)' : i === active ? C.orange : 'rgba(242,233,220,0.18)' }}>
                <span className="sr-only">{name}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <style>{`
        @keyframes c33-lake-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .c33-lake-now { animation: c33-lake-in 520ms cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </section>
  )
}

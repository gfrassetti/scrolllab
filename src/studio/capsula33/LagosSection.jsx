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
// Los lagos, de la puerta del domo hacia el norte: [nombre, x, y, ancho, alto, texto].
const LAKES = [
  ['Lago Lácar', 60, 610, 170, 120, 'Puerto de partida. Es el espejo de navegación: sirve para orientarse antes de salir.'],
  ['Lago Machónico', 300, 560, 110, 70, 'Primer salto de la ruta: una escala corta entre el bosque.'],
  ['Lago Falkner', 380, 430, 130, 80, 'Agua profunda y quieta; la ruta lo bordea por la costa.'],
  ['Lago Villarino', 170, 400, 120, 80, 'Estación intermedia: el tramo más largo antes de la próxima señal.'],
  ['Lago Escondido', 300, 290, 90, 60, 'Casi no se ve desde la ruta: hay que saber dónde mirar.'],
  ['Lago Correntoso', 120, 210, 130, 70, 'Acá el agua se mueve: un río corto lo lleva todo hacia el lago mayor.'],
  ['Lago Espejo', 360, 150, 120, 70, 'La última escala antes del lago mayor. El agua devuelve el cielo.'],
  ['Lago Nahuel Huapi', 150, 40, 300, 80, 'Bonus: el lago mayor del sistema. Acá termina el mapa conocido.'],
]
const centers = LAKES.map(([, x, y, w, h]) => [x + w / 2, y + h / 2])
// La ruta pasa por el centro de cada lago, en tramos rectos como un circuito.
const ROUTE = 'M145 800 V670 H250 V595 H445 V470 H330 V440 H230 V380 H345 V320 H265 V245 H185 H300 V185 H420 V120 H300 V80'

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
        r.frame.style.opacity = String(clamp01(p / 0.06))
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
        // Los paneles de datos entran y se quedan.
        r.sma.style.opacity = String(clamp01((p - 0.04) / 0.08))
        r.sma.style.transform = `translate3d(0, ${(1 - clamp01((p - 0.04) / 0.08)) * 16}px, 0)`
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
      <div className="sticky top-0 grid h-svh grid-rows-[auto_1fr] gap-3 overflow-hidden px-6 pt-20 pb-6 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-1 lg:gap-12 lg:px-[5vw] lg:pt-24 lg:pb-8">
        {/* Texto: título, el sector de partida, la lista de la ruta y el lago actual. */}
        <div className="flex min-h-0 flex-col justify-center gap-4 lg:gap-6">
          <div>
            <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
              <span className="h-px w-8" style={{ background: C.neon }} />
              La ruta
            </p>
            <h2 className="mt-3 text-[clamp(1.9rem,4.4vw,4.6rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
              Base <span style={{ color: C.neon }}>7-Lagos.</span>
            </h2>
            <p className="mt-2 hidden max-w-[40ch] text-[15px] leading-[1.5] sm:block" style={{ ...BODY, color: 'rgba(242,233,220,0.7)' }}>
              Aproximación interespacial: de la puerta del Domo C-33 hasta el lago mayor, de un solo trazo.
            </p>
          </div>

          <div ref={set('sma')} className="hidden rounded-md border p-4 opacity-0 sm:block" style={{ borderColor: 'rgba(169,214,255,0.28)', background: 'rgba(23,50,63,0.35)' }}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ ...MONO, color: '#a9d6ff' }}>
              Sector SMA · C-33 · Domo 1
            </p>
            <p className="mt-1.5 text-[14px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.8)' }}>
              Puerta principal de la estación andina. Punto de recalificación antes de internarse en territorio no cartografiado.
            </p>
          </div>

          <ol className="grid gap-px" aria-label="Ruta de evacuación">
            {LAKES.map(([name], i) => {
              const on = i <= active
              const now = i === active
              return (
                <li key={name} className="flex items-baseline gap-3 border-b py-[5px] text-[11.5px] tracking-[0.12em] uppercase transition-colors duration-300 lg:py-[6px] lg:text-[12px]" style={{ ...MONO, borderColor: 'rgba(242,233,220,0.1)', color: now ? C.cream : on ? 'rgba(242,233,220,0.7)' : 'rgba(242,233,220,0.28)' }}>
                  <span className="tabular-nums" style={{ color: now ? C.neon : 'inherit' }}>
                    {i === LAKES.length - 1 ? 'B' : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1">{name}</span>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full transition-all duration-300" style={{ background: on ? C.orange : 'transparent', boxShadow: on ? `0 0 8px ${C.orange}` : `inset 0 0 0 1px rgba(242,233,220,0.25)` }} />
                </li>
              )
            })}
          </ol>

          <p className="min-h-[3.2em] max-w-[44ch] text-[15px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.85)' }} aria-live="polite">
            {cur ? cur[5] : 'Scrolleá para trazar la ruta.'}
          </p>
        </div>

        {/* El plano. */}
        <div className="relative flex min-h-0 items-center justify-center">
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="h-full max-h-full w-auto max-w-full" role="img" aria-label="Plano de la ruta de los siete lagos, dibujado como una estación espacial: la ruta sale del domo C-33 y pasa por ocho lagos hasta el Nahuel Huapi">
            <defs>
              <pattern id="c33-lag-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M30 0H0V30" fill="none" stroke="#a9d6ff" strokeOpacity="0.1" strokeWidth="1" />
              </pattern>
            </defs>
            <g ref={set('frame')} style={{ opacity: 0 }}>
              <rect x="2" y="2" width={VB.w - 4} height={VB.h - 4} rx="22" fill="#0f2330" stroke="#a9d6ff" strokeOpacity="0.45" strokeWidth="2" />
              <rect x="2" y="2" width={VB.w - 4} height={VB.h - 4} rx="22" fill="url(#c33-lag-grid)" />
              {/* Curvas de nivel, de fondo. */}
              {[0, 1, 2, 3, 4].map((k) => (
                <path key={k} d={`M${-10} ${120 + k * 150} C ${150} ${60 + k * 150}, ${300} ${200 + k * 150}, ${VB.w + 10} ${110 + k * 150}`} fill="none" stroke="#a9d6ff" strokeOpacity="0.12" strokeWidth="1.2" />
              ))}
              {/* Cerros: la antena (Chapelco) y el reactor dormido (Lanín). */}
              <path d="M470 520 L520 440 L570 520 Z" fill="none" stroke="#f2e9dc" strokeOpacity="0.4" strokeWidth="1.5" />
              <text x="520" y="540" textAnchor="middle" fill="#f2e9dc" fillOpacity="0.5" fontSize="9" fontFamily="'Roboto Mono', monospace" letterSpacing="1.5">CHAPELCO</text>
              <path d="M30 330 L80 250 L130 330 Z" fill="none" stroke="#f2e9dc" strokeOpacity="0.4" strokeWidth="1.5" />
              <text x="80" y="350" textAnchor="middle" fill="#f2e9dc" fillOpacity="0.5" fontSize="9" fontFamily="'Roboto Mono', monospace" letterSpacing="1.5">LANÍN</text>
            </g>

            {/* El domo C-33, al sur. */}
            <g ref={set('dome')} style={{ opacity: 0 }}>
              <path d="M70 820 A75 75 0 0 1 220 820 Z" fill="#17323f" stroke="#f2e9dc" strokeWidth="2" />
              <path d="M95 820 A50 50 0 0 1 195 820" fill="none" stroke="#a9d6ff" strokeOpacity="0.6" />
              <rect x="136" y="796" width="18" height="24" rx="8" fill={C.orange} />
              <text x="145" y="835" textAnchor="middle" fill="#f2e9dc" fontSize="10" fontFamily="'Roboto Mono', monospace" letterSpacing="2">C-33 · DOMO 1</text>
            </g>

            {/* La ruta: la caja (gris), el trazo que se dibuja (naranja) y la cabeza que lo lleva. */}
            <path ref={set('route')} d={ROUTE} fill="none" stroke="#a9d6ff" strokeOpacity="0.22" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
            <path d={ROUTE} fill="none" stroke="#a9d6ff" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="3 7" strokeLinejoin="round" />
            <path ref={set('progress')} d={ROUTE} pathLength="1" fill="none" stroke={C.orange} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1" style={{ filter: 'drop-shadow(0 0 5px rgba(255,122,26,0.7))' }} />

            {/* Los lagos: cada uno se pinta cuando llega la ruta. */}
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

            {/* El área restringida: un sello que cae al final. */}
            <g ref={set('stamp')} style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: 'center' }}>
              <circle cx="505" cy="745" r="52" fill="none" stroke={C.orange} strokeWidth="2.5" />
              <circle cx="505" cy="745" r="42" fill="none" stroke={C.orange} strokeOpacity="0.6" strokeDasharray="4 5" />
              <text x="505" y="740" textAnchor="middle" fill={C.orange} fontSize="11" fontFamily="'Chakra Petch', sans-serif" fontWeight="700" letterSpacing="1.5">ÁREA</text>
              <text x="505" y="756" textAnchor="middle" fill={C.orange} fontSize="11" fontFamily="'Chakra Petch', sans-serif" fontWeight="700" letterSpacing="1.5">RESTRINGIDA</text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  )
}

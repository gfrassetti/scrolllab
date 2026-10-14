import { useEffect, useRef, useState } from 'react'
import { useGSAP, ScrollTrigger } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'
import { MAP_SVG, MAP_W, MAP_H, ROUTE_D, STOPS } from './lagosMapSvg'

/**
 * cāpsula33 — «La ruta»: el mapa «Base 7-Lagos» que el local tiene en la mesa,
 * redibujado en vector (mismos paneles, lagos, domo en corte y textos).
 *
 * El plano queda quieto y entero; con el scroll se enciende la ruta, de arriba
 * hacia abajo: sale del lago mayor y baja, lago por lago, hasta el Lácar y la
 * puerta del domo C-33. Cada lago se enciende cuando la ruta llega, y abajo a la
 * izquierda se lee la escala actual.
 */

// El recuadro del área restringida: el sello final.
const RESTRICTED = 'M970 1290 L1180 1290 L1228 1338 L1228 1592 L1180 1640 L970 1640 L925 1595 L925 1335 Z'
const PAD = 12

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function LagosSection() {
  const rootRef = useRef(null)
  const R = useRef({ lakes: [], times: [] })
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)

  // Cuándo (0–1 del trazo) la ruta pasa más cerca de cada lago: se mide sobre el trazado real.
  useEffect(() => {
    const path = R.current.route
    if (!path) return
    const total = path.getTotalLength()
    R.current.times = STOPS.map(([, , [x, y, w, h]]) => {
      const cx = x + w / 2
      const cy = y + h / 2
      let best = 0
      let bestD = Infinity
      for (let l = 0; l <= total; l += 3) {
        const pt = path.getPointAtLength(l)
        const d = (pt.x - cx) ** 2 + (pt.y - cy) ** 2
        if (d < bestD) {
          bestD = d
          best = l
        }
      }
      return best / total
    })
    R.current.total = total
  }, [])

  useGSAP(
    () => {
      const r = R.current
      const START = 0.08
      const SPAN = 0.8
      const paint = (p) => {
        // El plano: entra apenas atenuado y queda entero.
        r.map.style.opacity = String(0.55 + 0.45 * clamp01(p / 0.06))
        // La ruta, de un trazo, con su resplandor.
        const draw = clamp01((p - START) / SPAN)
        r.progress.style.strokeDashoffset = String(1 - draw)
        r.glow.style.strokeDashoffset = String(1 - draw)
        r.glow.style.opacity = String(0.6 + 0.3 * clamp01((p - (START + SPAN)) / 0.05))
        r.head.style.opacity = draw > 0 && draw < 1 ? '1' : '0'
        if (r.total) {
          const pt = r.route.getPointAtLength(draw * r.total)
          r.head.setAttribute('cx', pt.x)
          r.head.setAttribute('cy', pt.y)
        }
        // Cada lago se enciende cuando la ruta llega.
        let cur = -1
        r.times.forEach((t, i) => {
          const k = clamp01((p - (START + SPAN * t) + 0.012) / 0.045)
          const e = 1 - (1 - k) * (1 - k)
          r.lakes[i].style.opacity = String(e)
          r.lakes[i].style.transform = `scale(${1.12 - 0.12 * e})`
          if (k > 0.2) cur = i
        })
        if (cur !== activeRef.current) {
          activeRef.current = cur
          setActive(cur)
        }
        // El área restringida: el sello final.
        r.stamp.style.opacity = String(clamp01((p - 0.9) / 0.07))
        r.now.style.opacity = String(draw > 0.005 ? 1 : 0)
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
  const cur = active >= 0 ? STOPS[active] : null

  return (
    <section ref={rootRef} id="ruta" className="relative h-[520svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* La mesa, de fondo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(169,214,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(169,214,255,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* El mapa entero, quieto: lo que se enciende es la ruta. */}
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute top-[19svh] left-3 h-[55svh] w-[calc(100%-1.5rem)] sm:top-[17svh] lg:top-[5svh] lg:left-[34vw] lg:h-[90svh] lg:w-[62vw]"
          role="img"
          aria-label="Mapa «Base 7-Lagos»: la ruta de evacuación baja del lago Nahuel Huapi, pasa por los siete lagos y llega al lago Lácar y al domo C-33"
        >
          <defs>
            <filter id="c33-route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <g ref={set('map')} style={{ opacity: 0.55 }} dangerouslySetInnerHTML={{ __html: MAP_SVG }} />

          {/* Los lagos que se encienden al pasar la ruta. */}
          {STOPS.map(([name, , [x, y, w, h]], i) => (
            <rect
              key={name}
              ref={(el) => (R.current.lakes[i] = el)}
              x={x - PAD}
              y={y - PAD}
              width={w + PAD * 2}
              height={h + PAD * 2}
              rx="18"
              fill={C.neon}
              fillOpacity="0.16"
              stroke={C.neon}
              strokeWidth="5"
              style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}

          {/* La ruta: la base (para medir), el resplandor y el trazo encendido. */}
          <path ref={set('route')} d={ROUTE_D} fill="none" stroke="none" />
          <path
            ref={set('glow')}
            d={ROUTE_D}
            pathLength="1"
            fill="none"
            stroke={C.neon}
            strokeWidth="34"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset="1"
            filter="url(#c33-route-glow)"
            style={{ opacity: 0.6 }}
          />
          <path
            ref={set('progress')}
            d={ROUTE_D}
            pathLength="1"
            fill="none"
            stroke={C.neon}
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
          <circle ref={set('head')} r="13" fill="#fff" stroke={C.neon} strokeWidth="4" style={{ opacity: 0 }} cx="968" cy="232" />

          <path
            ref={set('stamp')}
            d={RESTRICTED}
            fill={C.neon}
            fillOpacity="0.12"
            stroke={C.neon}
            strokeWidth="6"
            strokeLinejoin="round"
            style={{ opacity: 0 }}
          />
        </svg>

        {/* Arriba a la izquierda: el título. */}
        <div className="absolute top-20 left-6 max-w-[min(88vw,26rem)] md:left-10 lg:top-24 lg:left-[5vw] lg:max-w-[min(26rem,27vw)]">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
            <span className="h-px w-8" style={{ background: C.neon }} />
            La ruta
          </p>
          <h2 className="mt-3 text-[clamp(1.9rem,4.4vw,4.6rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
            Base{' '}
            <span className="whitespace-nowrap" style={{ color: C.neon }}>
              7-Lagos.
            </span>
          </h2>
          <p className="mt-4 hidden max-w-[34ch] text-[15px] leading-[1.5] lg:block" style={{ ...BODY, color: 'rgba(242,233,220,0.72)' }}>
            El mapa que está en las mesas del local: la ruta de los siete lagos como si fuera una estación espacial, del lago mayor a la puerta del domo.
          </p>
        </div>

        {/* Abajo a la izquierda: la escala actual y la ruta como una regla de pasos. */}
        <div className="absolute right-6 bottom-6 left-6 md:right-auto md:left-10 md:max-w-[26rem] lg:bottom-10 lg:left-[5vw] lg:max-w-[min(26rem,27vw)]">
          <div ref={set('now')} className="transition-opacity duration-500" style={{ opacity: 0 }} aria-live="polite">
            <p className="text-[11px] tracking-[0.22em] uppercase tabular-nums" style={{ ...MONO, color: C.neon }}>
              {cur ? (cur[1] === 'Bonus' ? 'Bonus · el lago mayor' : `Escala ${cur[1]} / 07`) : ''}
            </p>
            <p key={active} className="c33-lake-now mt-1 text-[clamp(1.6rem,3.2vw,3.2rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
              {cur ? cur[0] : ''}
            </p>
            <p key={`t${active}`} className="c33-lake-now mt-2 max-w-[42ch] text-[15px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.82)' }}>
              {cur ? cur[3] : ''}
            </p>
          </div>
          <ol className="mt-4 flex gap-1.5" aria-label="Ruta de evacuación">
            {STOPS.map(([name], i) => (
              <li
                key={name}
                title={name}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ background: i < active ? 'rgba(255,122,26,0.55)' : i === active ? C.orange : 'rgba(242,233,220,0.18)' }}
              >
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

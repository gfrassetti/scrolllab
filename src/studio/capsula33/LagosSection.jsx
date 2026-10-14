import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'
import { MAP_CONTENT_ONLY, PAPER_COLOR, MAP_W, MAP_H, ROUTE_D, STOPS, RESTRICTED_D } from './lagosMapSvg'
import { GEO } from './lagosGeo'

/**
 * cāpsula33 — «La ruta»: el mapa «Base 7-Lagos» que el local tiene en la mesa,
 * redibujado en vector (mismos paneles, lagos, domo en corte y textos), con el norte
 * arriba como el mapa real: el Lácar arriba, el Nahuel Huapi abajo.
 *
 * Detrás, la geografía de verdad (lagos y rutas de OpenStreetMap, a escala), fija y
 * dibujada con la paleta de la hoja (azul plano, cuadrícula, rutas crema) pero
 * oscura: la hoja no está «encima» del mapa, se disuelve en él (bordes con fundido
 * doble, sin sombra, y un halo del mismo azul alrededor). Lo único que se enciende es
 * la ruta de la hoja; cada lago se enciende cuando la ruta llega, y abajo a la
 * izquierda se lee la escala actual.
 */

const PAD = 12
const NEON = '#ff8a1f'
// El punto del mapa real que queda detrás del centro de la hoja: entre San Martín y Villa La Angostura.
const MID = [(GEO.towns[0].at[0] + GEO.towns[1].at[0]) / 2, (GEO.towns[0].at[1] + GEO.towns[1].at[1]) / 2]
const INK = '#0c1d25'
const MAP_CONTENT = MAP_CONTENT_ONLY()

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function LagosSection() {
  const rootRef = useRef(null)
  const R = useRef({ lakes: [], times: [], caps: [], steps: [] })
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
        r.map.style.opacity = String(0.8 + 0.2 * clamp01(p / 0.06))
        // La ruta, de un trazo, con su resplandor.
        const draw = clamp01((p - START) / SPAN)
        for (const el of [r.progress, r.core, r.glow]) el.style.strokeDashoffset = String(1 - draw)
        r.glow.style.opacity = String(0.85 + 0.15 * clamp01((p - (START + SPAN)) / 0.05))
        r.dot.style.opacity = draw > 0 && draw < 1 ? '1' : '0'
        if (r.total) {
          const pt = r.route.getPointAtLength(draw * r.total)
          r.dot.setAttribute('cx', pt.x)
          r.dot.setAttribute('cy', pt.y)
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
        // Los textos de cada escala: se funden uno en otro con el scroll (sin saltos). Cada uno
        // entra enfocándose, se queda y se va hacia arriba mientras entra el siguiente.
        const n = r.times.length
        r.times.forEach((t, i) => {
          const el = r.caps[i]
          if (!el) return
          const at = START + SPAN * t
          const next = i < n - 1 ? START + SPAN * r.times[i + 1] : 2
          const inK = clamp01((p - (at - 0.012)) / 0.05)
          const outK = clamp01((p - (next - 0.03)) / 0.05)
          const e = inK * inK * (3 - 2 * inK)
          const o = outK * outK * (3 - 2 * outK)
          const vis = e * (1 - o)
          el.style.opacity = String(vis)
          el.style.transform = `translate3d(0, ${(1 - e) * 26 - o * 22}px, 0)`
          el.style.filter = vis > 0.01 && vis < 0.99 ? `blur(${(1 - vis) * 7}px)` : 'none'
          el.style.visibility = vis > 0.005 ? 'visible' : 'hidden'
          const st = r.steps[i]
          if (st) {
            st.style.background = p >= at ? (i === cur ? C.orange : 'rgba(255,122,26,0.5)') : 'rgba(242,233,220,0.18)'
            st.style.transform = `scaleY(${i === cur ? 2 : 1})`
          }
        })
        if (cur !== activeRef.current) {
          activeRef.current = cur
          setActive(cur)
        }
        // El área restringida: el sello final.
        r.stamp.style.opacity = String(clamp01((p - 0.9) / 0.07))
        r.now.style.opacity = String(draw > 0.005 ? 1 : 0)
      }
      // El título entra línea por línea (las letras suben desde una máscara) y la bajada se escribe palabra por palabra.
      const head = r.head
      const lines = head.querySelectorAll('[data-line]')
      const eyebrow = head.querySelector('[data-h="eyebrow"]')
      const lede = head.querySelector('[data-h="lede"]')
      const split = lede ? new SplitText(lede, { type: 'words', aria: 'none' }) : null
      gsap.set(lines, { yPercent: 108 })
      if (split) gsap.set(split.words, { opacity: 0.12 })
      const tl = gsap.timeline({ scrollTrigger: { trigger: rootRef.current, start: 'top 62%', once: true } })
      tl.to(eyebrow, { autoAlpha: 1, duration: 0.7, ease: 'expo.out' }, 0)
        .to(lines, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 }, 0.1)
        .to(lede, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0.5)
      if (split) tl.to(split.words, { opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.035 }, 0.6)
      r.cleanup = () => ro.disconnect()
      // El mapa real de fondo: fijo (no acompaña el scroll), cubre la pantalla y deja el tramo
      // San Martín – Villa La Angostura detrás de la hoja. Solo se reacomoda si cambia el tamaño.
      const placeGeo = () => {
        const W = r.stage.clientWidth
        const H = r.stage.clientHeight
        const k = Math.max(W / GEO.w, H / GEO.h) * 1.12
        const gw = GEO.w * k
        const gh = GEO.h * k
        const tx = Math.min(0, Math.max(W - gw, W * (W >= 1024 ? 0.57 : 0.5) - MID[0] * k))
        const ty = Math.min(0, Math.max(H - gh, H * 0.5 - MID[1] * k))
        r.geo.style.width = `${gw}px`
        r.geo.style.height = `${gh}px`
        r.geo.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
      }
      placeGeo()
      const ro = new ResizeObserver(placeGeo)
      ro.observe(r.stage)
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
  useEffect(() => () => R.current.cleanup?.(), [])

  const set = (k) => (el) => (R.current[k] = el)
  const cur = active >= 0 ? STOPS[active] : null

  return (
    <section ref={rootRef} id="ruta" className="relative h-[520svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div ref={set('stage')} className="sticky top-0 h-svh overflow-hidden">
        {/* El mapa real, de fondo: fijo, a escala, norte arriba, en la paleta de la hoja pero oscuro. */}
        <svg
          ref={set('geo')}
          aria-hidden="true"
          viewBox={`0 0 ${GEO.w} ${GEO.h}`}
          className="pointer-events-none absolute top-0 left-0"
          style={{ width: '100%', height: 'auto' }}
        >
          <rect width={GEO.w} height={GEO.h} fill={INK} />
          <path d={GEO.lakes} fill="#1d4556" fillRule="evenodd" />
          <path d={GEO.lakes} fill="none" stroke="#2f6478" strokeWidth="3" />
          <path d={GEO.islands} fill={INK} />
          <g fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d={GEO.roads.minor} stroke="rgba(243,226,176,0.1)" strokeWidth="4" />
            <path d={GEO.roads.main} stroke="rgba(243,226,176,0.16)" strokeWidth="6" />
            <path d={GEO.roads.r231} stroke="rgba(243,226,176,0.24)" strokeWidth="7" strokeDasharray="22 12" />
            <path d={GEO.roads.r40} stroke="rgba(243,226,176,0.32)" strokeWidth="8" />
          </g>
          <g
            fill="rgba(243,226,176,0.34)"
            fontFamily="'Roboto Mono', monospace"
            fontSize="22"
            fontWeight="600"
            letterSpacing="4"
            style={{ textTransform: 'uppercase' }}
          >
            {GEO.labels.map((l) => (
              <text key={l.n} x={l.at[0]} y={l.at[1]} textAnchor="middle">
                {l.n}
              </text>
            ))}
          </g>
          <g fontFamily="'Roboto Mono', monospace" fontSize="22" fontWeight="700" letterSpacing="4" style={{ textTransform: 'uppercase' }}>
            {GEO.towns.map((t) => (
              <g key={t.n} transform={`translate(${t.at[0]} ${t.at[1]})`}>
                <circle r="8" fill="none" stroke="rgba(243,226,176,0.5)" strokeWidth="3" />
                <text x="18" y="8" fill="rgba(243,226,176,0.45)">
                  {t.n}
                </text>
              </g>
            ))}
          </g>
        </svg>
        {/* La cuadrícula de la hoja sigue por todo el fondo, y un halo del mismo azul la rodea: la hoja
            se disuelve en el mapa en vez de estar apoyada encima. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '11px 11px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(48% 42% at 8% 92%, rgba(8,9,12,0.88), transparent 100%), radial-gradient(38% 62% at 57% 50%, rgba(63,126,150,0.32), rgba(63,126,150,0.12) 55%, transparent 80%), linear-gradient(90deg, rgba(8,9,12,0.86) 0%, rgba(8,9,12,0.5) 22%, rgba(8,9,12,0) 38%), radial-gradient(95% 110% at 57% 50%, transparent 55%, rgba(8,9,12,0.7) 100%)',
          }}
        />

        {/* El mapa entero, quieto: lo que se enciende es la ruta. */}
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute top-[max(18svh,9.5rem)] left-3 h-[calc(100svh-max(18svh,9.5rem)-10.5rem)] w-[calc(100%-1.5rem)] sm:top-[17svh] sm:h-[55svh] lg:top-[4svh] lg:left-[57%] lg:h-[92svh] lg:w-auto lg:-translate-x-1/2"
          style={{
            aspectRatio: `${MAP_W} / ${MAP_H}`,
          }}
          role="img"
          aria-label="Mapa «Base 7-Lagos»: la ruta sale del lago Lácar, en San Martín de los Andes, pasa por los siete lagos y llega al lago Nahuel Huapi"
        >
          <defs>
            {/* La hoja se disuelve en el mapa: una máscara de bordes suaves por los cuatro lados (más en
                las esquinas), sin borde recto ni sombra. */}
            <filter id="c33-paper-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
            {/* El azul del papel se va de a poco (fundido ancho): el dibujo queda sobre el mapa real. */}
            <filter id="c33-paper-wide" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="120" />
            </filter>
            <mask id="c33-paper-bg-fade" maskUnits="userSpaceOnUse" x="-200" y="-200" width={MAP_W + 400} height={MAP_H + 400}>
              <rect x="150" y="150" width={MAP_W - 300} height={MAP_H - 300} rx="200" fill="#fff" filter="url(#c33-paper-wide)" />
            </mask>
            <mask id="c33-paper-fade" maskUnits="userSpaceOnUse" x="0" y="0" width={MAP_W} height={MAP_H}>
              <rect x="40" y="34" width={MAP_W - 80} height={MAP_H - 68} rx="90" fill="#fff" filter="url(#c33-paper-soft)" />
            </mask>
            <filter id="c33-route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <filter id="c33-lake-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="-200" y="-200" width={MAP_W + 400} height={MAP_H + 400} fill={PAPER_COLOR} fillOpacity="0.92" mask="url(#c33-paper-bg-fade)" />
          <g mask="url(#c33-paper-fade)">
            <g>
              <g ref={set('map')} style={{ opacity: 0.55 }} dangerouslySetInnerHTML={{ __html: MAP_CONTENT }} />

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
                  fill={NEON}
                  fillOpacity="0.24"
                  stroke={NEON}
                  strokeWidth="7"
                  filter="url(#c33-lake-glow)"
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
                stroke={NEON}
                strokeWidth="46"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
                filter="url(#c33-route-glow)"
                style={{ opacity: 0.85 }}
              />
              <path
                ref={set('progress')}
                d={ROUTE_D}
                pathLength="1"
                fill="none"
                stroke={NEON}
                strokeWidth="13"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
              />
              {/* El centro blanco del tubo: lo que lo hace leer como luz. */}
              <path
                ref={set('core')}
                d={ROUTE_D}
                pathLength="1"
                fill="none"
                stroke="#fff4e2"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
              />
              <circle ref={set('dot')} r="16" fill="#fff" stroke={NEON} strokeWidth="5" filter="url(#c33-lake-glow)" style={{ opacity: 0 }} cx="676" cy="134" />

              <path
                ref={set('stamp')}
                d={RESTRICTED_D}
                fill={C.neon}
                fillOpacity="0.12"
                stroke={C.neon}
                strokeWidth="6"
                strokeLinejoin="round"
                style={{ opacity: 0 }}
              />
            </g>
          </g>
        </svg>

        {/* Arriba a la izquierda: el título (letra por letra al entrar). */}
        <div ref={set('head')} className="absolute top-20 left-6 max-w-[min(88vw,30rem)] md:left-10 lg:top-24 lg:left-[5vw] lg:max-w-[min(30rem,32vw)]">
          <p
            data-h="eyebrow"
            className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase opacity-0"
            style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}
          >
            <span className="h-px w-8" style={{ background: C.neon }} />
            La ruta
          </p>
          <h2
            data-h="title"
            aria-label="Base 7-Lagos."
            className="mt-3 flex flex-col text-[clamp(2.1rem,4.8vw,5rem)] leading-[0.95] font-semibold uppercase max-sm:flex-row max-sm:gap-x-[0.3em]"
            style={DISPLAY}
          >
            <span aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                Base
              </span>
            </span>
            <span aria-hidden="true" className="block overflow-hidden pb-[0.06em] whitespace-nowrap" style={{ color: C.neon }}>
              <span data-line className="block">
                7-Lagos.
              </span>
            </span>
          </h2>
          <p
            data-h="lede"
            className="mt-4 hidden max-w-[36ch] text-[16px] leading-[1.5] opacity-0 lg:block"
            style={{ ...BODY, color: 'rgba(242,233,220,0.74)' }}
          >
            El mapa que está en las mesas del local: la ruta de los siete lagos como si fuera una estación espacial, de la puerta del domo en el Lácar al lago
            mayor.
          </p>
        </div>

        {/* Abajo a la izquierda: la escala actual (cada una se funde en la siguiente) y la regla de pasos. */}
        <div className="absolute right-6 bottom-6 left-6 md:right-auto md:left-10 md:w-[30rem] lg:bottom-12 lg:left-[5vw] lg:w-[min(30rem,32vw)]">
          <div
            ref={set('now')}
            className="relative h-[10.5rem] transition-opacity duration-700 sm:h-[11.5rem] lg:h-[15rem]"
            style={{ opacity: 0 }}
            aria-live="polite"
          >
            {STOPS.map(([name, num, , text], i) => (
              <div
                key={name}
                ref={(el) => (R.current.caps[i] = el)}
                className="absolute inset-x-0 bottom-0 will-change-transform"
                style={{ opacity: 0, visibility: 'hidden' }}
              >
                <p className="text-[11px] tracking-[0.22em] uppercase tabular-nums" style={{ ...MONO, color: C.neon }}>
                  {num === 'Bonus' ? 'Bonus · el lago mayor' : `Escala ${num} / 07`}
                </p>
                <p className="mt-1.5 text-[clamp(1.9rem,3.4vw,3.8rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
                  {name}
                </p>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.5] lg:text-[17px]" style={{ ...BODY, color: 'rgba(242,233,220,0.84)' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
          <ol className="mt-5 flex items-end gap-1.5" aria-label="Ruta de evacuación">
            {STOPS.map(([name], i) => (
              <li
                key={name}
                title={name}
                className="h-1 flex-1 origin-bottom rounded-full transition-[background-color,transform] duration-500"
                ref={(el) => (R.current.steps[i] = el)}
                style={{ background: 'rgba(242,233,220,0.18)' }}
              >
                <span className="sr-only">{name}</span>
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite">
            {cur ? `${cur[0]}: ${cur[3]}` : ''}
          </p>
        </div>
      </div>
    </section>
  )
}

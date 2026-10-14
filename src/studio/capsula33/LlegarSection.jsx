import { useEffect, useRef, useState } from 'react'
import { useGSAP, ScrollTrigger, gsap } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'
import { STREETS, M_PER_PX_Z16 } from './llegarStreets'
import { useLang } from './i18nCore'

/**
 * cāpsula33 — «Cómo llegar», fijada y a pantalla completa desde el principio.
 *
 * El plano es el barrio de verdad, a escala: las calles, la costa del Lácar, las
 * plazas y los arroyos de OpenStreetMap, dibujados con los colores del mapa de
 * papel del local y en la misma proyección que Google Maps. Al terminar de
 * acercarse queda exactamente a la escala del mapa de Google que tiene abajo:
 * la lente lo deja ver teñido (las calles coinciden) y un clic lo abre entero.
 *
 * El recorrido:
 *   1. El pueblo entero, oscurecido, con el título enorme encima.
 *   2. La cámara baja hasta el local (Roca y Sarmiento); el título se vuelve un
 *      recuadro arriba a la izquierda y aparecen la escala y el norte.
 *   3. Las rutas a los puntos de la zona: el Lácar está en el plano; Chapelco, el
 *      Lanín y Quila Quina quedan afuera y se marcan en el borde, apuntando hacia
 *      donde están, con la distancia en línea recta. Entran sus tarjetas.
 */

const ADDRESS = 'Av. Gral. Roca 1120, San Martín de los Andes, Neuquén'
const EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&z=16&output=embed`
const OPEN = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`
// El tinte del mapa real mientras está escondido: el azul gris del papel.
const TINT = 'grayscale(1) sepia(0.55) hue-rotate(160deg) saturate(1.1) brightness(0.97) contrast(0.92)'

const STREET = '#9fb3bb'
const NAVY = '#22323b'
const CREAM = '#efe3c8'
const WATER = '#6e8c99'
const PARK = '#c6cfae'

/** Los puntos de la zona. `at` (metros desde el local) si está en el plano; si no, rumbo y distancia. */
const POIS = [
  {
    id: 'lacar',
    name: 'Lago Lácar',
    note: 'La costanera y el muelle, a 1,2 km bajando por San Martín.',
    at: STREETS.lacar,
    bearing: 228,
    dist: '1,2 km',
    dir: 'al suroeste',
  },
  {
    id: 'chapelco',
    name: 'Cerro Chapelco',
    note: 'La antena natural: el centro de esquí, subiendo por la RP 19.',
    bearing: 133,
    dist: '16 km',
    dir: 'al sureste',
  },
  {
    id: 'quila',
    name: 'Quila Quina',
    note: 'Del otro lado del lago: en lancha desde el muelle o por la RP 108.',
    bearing: 249,
    dist: '7,5 km',
    dir: 'al oeste',
  },
  { id: 'lanin', name: 'Volcán Lanín', note: 'El reactor dormido, hacia el norte, pasando Junín de los Andes.', bearing: 347, dist: '59 km', dir: 'al norte' },
]

const ROADS = [
  ['d', 10],
  ['e', 7],
  ['c', 14],
  ['b', 18],
  ['a', 22],
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)

export default function LlegarSection() {
  const { t } = useLang()
  const rootRef = useRef(null)
  const R = useRef({ routes: [], pins: [], cards: [], edges: [], labels: [] })
  const [revealed, setRevealed] = useState(false)
  const [loadMap, setLoadMap] = useState(false)
  const [focus, setFocus] = useState(null)
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)
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

  // La lente funciona cuando el plano ya llegó a la escala del mapa real.
  const lensReady = () => R.current.zoomed > 0.98 && !R.current.open
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
    gsap.to(lens.current, { r: 130, duration: 0.7, ease: 'expo.out', overwrite: 'auto', onUpdate: paintLens })
  }
  const onLeave = () => {
    if (R.current.open) return
    gsap.to(lens.current, { r: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto', onUpdate: paintLens })
  }
  const open = (e) => {
    const r = R.current
    if (r.open || r.zoomed < 0.98) return
    r.open = true
    const b = r.card.getBoundingClientRect()
    if (e && e.clientX) {
      lens.current.x = (e.clientX - b.left) / b.width
      lens.current.y = (e.clientY - b.top) / b.height
    }
    gsap.to(lens.current, {
      r: Math.hypot(b.width, b.height),
      duration: 0.9,
      ease: 'expo.inOut',
      overwrite: 'auto',
      onUpdate: paintLens,
      onComplete: () => setRevealed(true),
    })
  }
  const close = () => {
    const r = R.current
    setRevealed(false)
    r.open = false
    gsap.to(lens.current, { r: 0, duration: 0.8, ease: 'expo.inOut', overwrite: 'auto', onUpdate: paintLens })
  }

  // El recorrido de la sección fijada.
  useGSAP(
    () => {
      const r = R.current
      const paint = (p) => {
        const W = r.card.clientWidth
        const H = r.card.clientHeight
        const wide = W >= 1024
        // 1 → 2: la cámara baja del pueblo al local. Al final, la escala exacta del mapa de Google.
        const z = smooth(clamp01((p - 0.06) / 0.34))
        r.zoomed = z
        const zMin = Math.max(0.42, (W * M_PER_PX_Z16) / 4300) // nunca más lejos que el plano dibujado
        const zoom = lerp(zMin, 1, z)
        const mpp = M_PER_PX_Z16 / zoom // metros por píxel
        // De lejos el centro va al suroeste (entra el lago); al llegar, el local queda arriba a la
        // derecha del centro para que el Lácar entre en cuadro. El mapa de Google de abajo se corre
        // igual (su centro es el local), así las calles siguen coincidiendo.
        const end = wide ? [-330, 250] : [-60, -150]
        const cx = lerp(-560, end[0], z)
        const cy = lerp(420, end[1], z)
        r.plan.setAttribute('viewBox', `${cx - (W / 2) * mpp} ${cy - (H / 2) * mpp} ${W * mpp} ${H * mpp}`)
        r.ui.setAttribute('transform', `scale(${mpp})`)
        // En el teléfono el cartel del local va a la izquierda del punto (a la derecha se cortaba).
        r.hqLabel.setAttribute('transform', W < 640 ? 'translate(-192 18)' : 'translate(20 18)')
        r.pinLacar.setAttribute('transform', `translate(${STREETS.lacar[0]} ${STREETS.lacar[1]}) scale(${mpp})`)
        // Las etiquetas de calles: a un tamaño legible en pantalla, sin crecer de más al acercarse.
        r.labelsG.style.fontSize = `${Math.max(9, Math.min(12, 11 * zoom + 3)) * mpp}px`
        r.labelsG.style.opacity = String(0.35 + 0.65 * z)
        // El velo oscuro sobre el plano mientras está el título.
        r.veil.style.opacity = String(lerp(0.78, 0, smooth(clamp01((p - 0.1) / 0.26))))
        // La escala gráfica: 200 m en píxeles.
        r.scaleBar.style.width = `${200 / mpp}px`
        r.chrome.style.opacity = String(clamp01((p - 0.3) / 0.08))
        // El título enorme se va mientras la cámara baja; el recuadro lo reemplaza.
        const t = smooth(clamp01((p - 0.12) / 0.2))
        r.big.style.opacity = String(1 - t)
        r.big.style.transform = `translate3d(0, ${-t * 60}px, 0) scale(${1 - t * 0.06})`
        r.big.style.filter = t > 0.01 && t < 0.99 ? `blur(${t * 8}px)` : 'none'
        r.big.style.visibility = t >= 0.999 ? 'hidden' : 'visible'
        const k = clamp01((p - 0.3) / 0.1)
        r.panel.style.opacity = String(k)
        r.panel.style.transform = `translate3d(0, ${(1 - k) * 16}px, 0)`
        r.panel.style.pointerEvents = k > 0.7 ? 'auto' : 'none'
        r.card.style.pointerEvents = z > 0.98 ? 'auto' : 'none'
        // 3: las rutas, de a una, y sus tarjetas. Los puntos de afuera, en el borde de la pantalla.
        const hx = (0 - cx) / mpp + W / 2
        const hy = (0 - cy) / mpp + H / 2
        if (r.frame) {
          // El iframe, centrado en el local: más grande que la pantalla lo que haga falta.
          const ox = -end[0] / M_PER_PX_Z16
          const oy = -end[1] / M_PER_PX_Z16
          const fw = W + 2 * Math.abs(ox)
          const fh = H + 2 * Math.abs(oy)
          r.frame.style.width = `${fw}px`
          r.frame.style.height = `${fh}px`
          r.frame.style.left = `${W / 2 + ox - fw / 2}px`
          r.frame.style.top = `${H / 2 + oy - fh / 2}px`
        }
        const pad = wide ? 70 : 6
        const top = wide ? 70 : 350
        const bottom = H - (wide ? 150 : 170)
        POIS.forEach((poi, i) => {
          const kk = clamp01((p - (0.44 + i * 0.09)) / 0.12)
          const c = clamp01((p - (0.5 + i * 0.09)) / 0.1)
          r.cards[i].style.opacity = String(c)
          r.cards[i].style.transform = `translate3d(0, ${(1 - c) * 24}px, 0)`
          if (poi.at) {
            r.routes[i].style.strokeDashoffset = String(1 - kk)
            const px = (poi.at[0] - cx) / mpp + W / 2
            const py = (poi.at[1] - cy) / mpp + H / 2
            const onScreen = px > pad && px < W - pad && py > top && py < bottom
            r.pins[i].style.opacity = String(onScreen ? clamp01((kk - 0.7) / 0.3) : 0)
            r.edges[i].style.opacity = '0'
            if (onScreen) return
          }
          // El borde: desde el local, en el rumbo del punto, hasta el margen de la pantalla.
          const a = ((poi.bearing - 90) * Math.PI) / 180
          const dx = Math.cos(a)
          const dy = Math.sin(a)
          const tx = dx > 0 ? (W - pad - hx) / dx : dx < 0 ? (pad - hx) / dx : Infinity
          const ty = dy > 0 ? (bottom - hy) / dy : dy < 0 ? (top - hy) / dy : Infinity
          const d = Math.max(0, Math.min(tx, ty))
          const ex = hx + dx * d
          const ey = hy + dy * d
          const tagAt = (tag) => {
            tag.style.opacity = String(clamp01((kk - 0.6) / 0.4))
            tag.style.transform = `translate3d(${ex}px, ${ey}px, 0) translate(${dx > 0.3 ? '-100%' : dx < -0.3 ? '0%' : '-50%'}, ${dy > 0.3 ? '-100%' : dy < -0.3 ? '0%' : '-50%'})`
            tag.querySelector('[data-arrow]').style.transform = `rotate(${poi.bearing}deg)`
          }
          if (poi.at) return tagAt(r.edges[i])
          const line = r.routes[i]
          line.setAttribute('x1', hx)
          line.setAttribute('y1', hy)
          line.setAttribute('x2', hx + dx * d * kk)
          line.setAttribute('y2', hy + dy * d * kk)
          const tag = r.edges[i]
          tag.style.opacity = String(clamp01((kk - 0.6) / 0.4))
          tag.style.transform = `translate3d(${ex}px, ${ey}px, 0) translate(${dx > 0.3 ? '-100%' : dx < -0.3 ? '0%' : '-50%'}, ${dy > 0.3 ? '-100%' : dy < -0.3 ? '0%' : '-50%'})`
          tag.querySelector('[data-arrow]').style.transform = `rotate(${poi.bearing}deg)`
        })
      }
      paint(0)
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => paint(self.progress),
        onRefresh: (self) => paint(self.progress),
      })
      // El título entra letra por letra la primera vez.
      gsap.fromTo(
        r.big.querySelectorAll('[data-line]'),
        { yPercent: 110 },
        { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: rootRef.current, start: 'top 60%', once: true } },
      )
      gsap.fromTo(
        r.big.querySelectorAll('[data-fade]'),
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.08,
          delay: 0.35,
          scrollTrigger: { trigger: rootRef.current, start: 'top 60%', once: true },
        },
      )
    },
    { scope: rootRef },
  )

  const set = (k) => (el) => (R.current[k] = el)
  const mono = "'Roboto Mono', ui-monospace, monospace"

  return (
    <section ref={rootRef} id="llegar" className="relative h-[460svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* El plano (y el mapa real abajo), a pantalla completa. */}
        <div
          ref={set('card')}
          role="button"
          tabIndex={revealed ? -1 : 0}
          aria-label={t('Ver el mapa real del local')}
          onPointerEnter={onEnter}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onClick={open}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
          className={`c33-llegar absolute inset-0 overflow-hidden ${revealed ? '' : 'cursor-pointer'}`}
          style={{ background: CREAM }}
        >
          {loadMap ? (
            <iframe
              title={t('Mapa de Google con la ubicación de cāpsula33')}
              src={EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              ref={set('frame')}
              className="absolute top-0 left-0 h-full w-full border-0"
              style={{ filter: revealed ? 'none' : TINT, pointerEvents: revealed ? 'auto' : 'none', transition: 'filter 700ms ease-out' }}
            />
          ) : null}

          <svg
            ref={set('plan')}
            viewBox="-1000 -600 2000 1200"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
            style={{ opacity: revealed ? 0 : 1, transition: 'opacity 400ms ease-out' }}
          >
            <defs>
              <pattern id="c33-ll-grid" width="250" height="250" patternUnits="userSpaceOnUse">
                <path d="M250 0H0V250" fill="none" stroke={NAVY} strokeOpacity="0.09" strokeWidth="2" />
              </pattern>
              <pattern id="c33-ll-water" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
                <path d="M0 30 Q15 22 30 30 T60 30" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="3" />
              </pattern>
            </defs>
            <rect x="-5000" y="-5000" width="10000" height="10000" fill={CREAM} />
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#c33-ll-grid)" />
            <path d={STREETS.parks} fill={PARK} stroke={NAVY} strokeOpacity="0.35" strokeWidth="2" />
            <path d={STREETS.ponds} fill={WATER} />
            <path d={STREETS.streams} fill="none" stroke={WATER} strokeWidth="5" strokeLinecap="round" />
            <path d={STREETS.lake} fill={WATER} stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
            <path d={STREETS.lake} fill="url(#c33-ll-water)" />
            {/* Calles: el borde azul oscuro abajo, el gris azulado arriba (las manzanas quedan crema). */}
            {ROADS.map(([k, w]) => (
              <path key={`o${k}`} d={STREETS.roads[k]} fill="none" stroke={NAVY} strokeWidth={w + 4} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {ROADS.map(([k, w]) => (
              <path key={`i${k}`} d={STREETS.roads[k]} fill="none" stroke={STREET} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {/* La avenida Roca, marcada como en el papel. */}
            <path d={STREETS.roca} fill="none" stroke={C.orange} strokeWidth="5" strokeDasharray="18 11" strokeLinecap="round" />
            {/* Los nombres de las calles principales. */}
            <g ref={set('labelsG')} fill={NAVY} fontFamily={mono} fontWeight="700" letterSpacing="0.14em" style={{ textTransform: 'uppercase' }}>
              {STREETS.labels.map((l, i) => (
                <g key={l.t}>
                  <path id={`c33-st-${i}`} d={l.d} fill="none" />
                  <text dy="-0.9em">
                    <textPath href={`#c33-st-${i}`} startOffset="50%" textAnchor="middle">
                      {t(l.t)}
                    </textPath>
                  </text>
                </g>
              ))}
            </g>
            {/* La ruta al Lácar (en línea recta, punteada). */}
            <line
              ref={(el) => (R.current.routes[0] = el)}
              x1="0"
              y1="0"
              x2={STREETS.lacar[0]}
              y2={STREETS.lacar[1]}
              pathLength="1"
              stroke={C.orange}
              strokeWidth={focus === 'lacar' ? 9 : 6}
              strokeDasharray="1"
              strokeDashoffset="1"
              strokeLinecap="round"
            />
            <g ref={set('pinLacar')}>
              <g ref={(el) => (R.current.pins[0] = el)} style={{ opacity: 0 }}>
                <circle r="9" fill={CREAM} stroke={NAVY} strokeWidth="2" />
                <circle r="3.5" fill={C.orange} />
                <text x="-15" y="4" textAnchor="end" fill={NAVY} fontFamily={mono} fontSize="12" fontWeight="700" letterSpacing="1.2">
                  {t('Lago Lácar').toUpperCase()}
                </text>
              </g>
            </g>
            {/* El local: en píxeles de pantalla (se escala con el zoom). */}
            <g ref={set('ui')}>
              <circle r="34" fill={C.orange} fillOpacity="0.22" className="c33-hq-pulse" />
              <circle r="13" fill={C.orange} stroke={NAVY} strokeWidth="2" />
              <path d="M-6 3 A6 6 0 0 1 6 3 Z" fill={CREAM} />
              <g ref={set('hqLabel')} transform="translate(20 18)">
                <rect width="172" height="46" rx="6" fill={NAVY} />
                <text x="12" y="20" fill={CREAM} fontFamily={mono} fontSize="13" fontWeight="700">
                  cāpsula33
                </text>
                <text x="12" y="36" fill={CREAM} fillOpacity="0.75" fontFamily={mono} fontSize="10" letterSpacing="1">
                  ROCA 1120 · C-33
                </text>
              </g>
            </g>
          </svg>

          {/* El velo oscuro de la apertura (sobre el plano, debajo del título). */}
          <div
            ref={set('veil')}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(120% 90% at 35% 60%, rgba(11,12,15,0.55), rgba(11,12,15,0.96))' }}
          />

          {/* Los puntos que quedan fuera del plano: una línea desde el local hasta el borde. */}
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
            {POIS.map((poi, i) =>
              poi.at ? null : (
                <line
                  key={poi.id}
                  ref={(el) => (R.current.routes[i] = el)}
                  stroke={C.orange}
                  strokeWidth={focus === poi.id ? 3.5 : 2.5}
                  strokeDasharray="2 7"
                  strokeLinecap="round"
                />
              ),
            )}
          </svg>
          {POIS.map((poi, i) =>
            !poi.bearing ? null : (
              <div
                key={poi.id}
                ref={(el) => (R.current.edges[i] = el)}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2 whitespace-nowrap max-sm:hidden"
                style={{ background: NAVY, color: CREAM, opacity: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
              >
                <span data-arrow className="grid h-5 w-5 place-items-center rounded-full text-[11px]" style={{ background: C.orange, color: NAVY }}>
                  ↑
                </span>
                <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={MONO}>
                  {t(poi.name)} · {t(poi.dist)}
                </span>
              </div>
            ),
          )}

          {/* El aro de la lente. */}
          <span
            ref={set('ring')}
            aria-hidden="true"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
            style={{ boxShadow: `0 0 0 2px ${CREAM}, 0 0 0 6px rgba(34,50,59,0.55), 0 12px 40px rgba(0,0,0,0.35)` }}
          >
            <span
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase"
              style={{ ...MONO, background: NAVY, color: CREAM }}
            >
              {t('Clic para abrir')}
            </span>
          </span>
        </div>

        {/* La escala y el norte (cuando el plano ya llegó al local). */}
        <div
          ref={set('chrome')}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 bottom-[11.5rem] flex items-end gap-4 opacity-0 md:right-10 lg:bottom-[10rem]"
          style={{ color: NAVY }}
        >
          <div>
            <div ref={set('scaleBar')} className="h-2 border-x-2 border-b-2" style={{ borderColor: NAVY, width: 110 }} />
            <p className="mt-1 text-[10px] font-bold tracking-[0.16em]" style={MONO}>
              200 M
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full border-2" style={{ borderColor: NAVY }}>
            <span className="text-[10px] font-bold" style={MONO}>
              N
            </span>
          </div>
        </div>

        {/* 1. El título enorme, sobre el pueblo oscurecido. */}
        <div ref={set('big')} className="pointer-events-none absolute inset-x-0 bottom-[14svh] px-6 md:px-10 lg:bottom-[12svh] lg:px-[5vw]">
          <p
            data-fade
            className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase opacity-0"
            style={{ ...MONO, color: 'rgba(242,233,220,0.7)' }}
          >
            <span className="h-px w-8" style={{ background: C.neon }} />
            {t('Cómo llegar')} · {t('40°09′15″ S · 71°20′51″ O')}
          </p>
          <h2 className="mt-5 text-[clamp(3.2rem,12.5vw,13rem)] leading-[0.86] font-semibold tracking-[-0.03em] uppercase" style={DISPLAY}>
            <span className="block overflow-hidden pb-[0.04em]">
              <span data-line className="block">
                {t('Roca 1120,')}
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.04em]">
              <span data-line className="block" style={{ color: C.neon }}>
                {t('Sector SMA.')}
              </span>
            </span>
          </h2>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
            <p data-fade className="max-w-[40ch] text-[16px] leading-[1.5] opacity-0 md:text-[18px]" style={{ ...BODY, color: 'rgba(242,233,220,0.82)' }}>
              {t('Sobre la avenida Roca, a metros de Sarmiento y a 1,2 km del Lácar. Martes a sábado de 9 a 21; lunes de 9 a 15.')}
            </p>
            <p data-fade className="text-[11px] tracking-[0.2em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}>
              {t('El plano, a escala ↓')}
            </p>
          </div>
        </div>

        {/* 2. El recuadro, sobre el plano abierto. */}
        <div
          ref={set('panel')}
          className="absolute top-20 left-4 max-w-[min(92vw,22rem)] rounded-lg p-4 opacity-0 md:left-10 lg:top-24 lg:left-[5vw]"
          style={{ background: 'rgba(11,12,15,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 18px 50px rgba(0,0,0,0.35)' }}
        >
          <p className="text-[10.5px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            {t('Cómo llegar')}
          </p>
          <p className="mt-1.5 text-[22px] leading-tight font-semibold uppercase" style={DISPLAY}>
            {t('Roca 1120, Sector SMA')}
          </p>
          <p className="mt-1 text-[13px] leading-[1.5]" style={{ ...BODY, color: 'rgba(242,233,220,0.75)' }}>
            {t('San Martín de los Andes · martes a sábado 9–21, lunes 9–15')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={OPEN}
              target="_blank"
              rel="noopener noreferrer"
              className="c33-go inline-flex h-10 items-center rounded-full px-4 text-[12px] font-semibold tracking-[0.14em] uppercase"
              style={{ ...DISPLAY, background: C.cream, color: '#0b0c0f' }}
            >
              {t('Abrir en Google Maps')}
            </a>
            {revealed ? (
              <button
                type="button"
                onClick={close}
                className="c33-back inline-flex h-10 items-center rounded-full border px-4 text-[12px] font-semibold tracking-[0.12em] uppercase"
                style={{ ...MONO, borderColor: 'rgba(242,233,220,0.4)', color: C.cream }}
              >
                {t('Volver al plano')}
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-[11px] leading-[1.5]" style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}>
            {touch
              ? t('El plano está a escala del mapa real: un toque lo abre entero.')
              : t('El plano está a escala del mapa real: la lente lo deja ver y un clic lo abre entero.')}
          </p>
        </div>

        {/* 3. Las tarjetas de los puntos de la zona. */}
        <ul
          className="absolute inset-x-0 bottom-4 flex gap-3 overflow-x-auto px-4 pb-1 md:bottom-6 md:px-10 lg:justify-end lg:px-[5vw]"
          style={{ scrollbarWidth: 'none' }}
        >
          {POIS.map((poi, i) => (
            <li
              key={poi.id}
              ref={(el) => (R.current.cards[i] = el)}
              onPointerEnter={() => setFocus(poi.id)}
              onPointerLeave={() => setFocus(null)}
              className="c33-poi w-[14.5rem] shrink-0 rounded-lg border p-3.5 opacity-0"
              style={{
                background: focus === poi.id ? NAVY : 'rgba(11,12,15,0.86)',
                borderColor: focus === poi.id ? C.orange : 'rgba(242,233,220,0.14)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
                <span>0{i + 1}</span>
                <span style={{ color: 'rgba(242,233,220,0.6)' }}>
                  {t(poi.dist)} {t(poi.dir)}
                </span>
              </p>
              <p className="mt-1 text-[15px] font-semibold uppercase" style={DISPLAY}>
                {t(poi.name)}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.72)' }}>
                {t(poi.note)}
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

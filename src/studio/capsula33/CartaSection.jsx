import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { useLang } from './i18nCore'
import { C, MONO, DISPLAY, BODY } from './brand'

/**
 * cāpsula33 — «La carta»: el menú take-away como la pantalla de navegación de la nave.
 *
 * A todo el ancho: un mapa estelar con seis sistemas, uno por rubro (cafetería,
 * smoothies, laminados, cervezas, platos, helados: los rubros de la carta impresa).
 * Los planetas son la metáfora de la página, no de la carta. Al entrar se ve la carta
 * entera como un mapa, con la ruta que une los planetas; con el scroll la cámara
 * viaja de un sistema al siguiente (se aleja un poco en el viaje y se acerca al
 * llegar) y, en cada uno, los productos se enganchan en órbita de a uno: el punto,
 * la línea al planeta y el nombre con su precio. La consola de abajo lleva a
 * cualquier sistema con un clic. En el teléfono los productos van en lista
 * debajo del planeta. Precios de la carta impresa.
 */

const VG = true

const CATEGORIES = [
  {
    id: 'cafeteria',
    title: 'Cafetería',
    blurb: 'Espresso a 93 grados, de especialidad.',
    planet: ['#ffb067', '#ff7a1a', '#7a2a07'],
    rows: [
      ['tag', 'Calientes'],
      ['Americano', '$4.800'],
      ['Lagrima', '$4.500'],
      ['Flat White', '$5.500'],
      ['Capuccino', '$6.000'],
      ['Latte', '$5.500'],
      ['Latte cápsula33', '$6.000'],
      ['Chocolate caliente', '$6.500'],
      ['Chocolate caliente cápsula33', '$6.500'],
      ['Golden milk', '$5.000'],
      ['tag', 'Fríos'],
      ['Americano con hielo', '$5.500'],
      ['Latte con hielo', '$6.000'],
      ['Affogato', '$6.500'],
    ],
  },
  {
    id: 'smoothies',
    title: 'Smoothies',
    blurb: 'Frutas licuadas, una por humor.',
    planet: ['#ff9fd0', '#d63c8f', '#4a0b2e'],
    rows: [
      ['Alegría', '$9.000', 'Frutos rojos y ananá'],
      ['Capricho', '$9.000', 'Oreo y mantequilla de maní'],
      ['Vigor', '$9.000', 'Durazno y jengibre'],
    ],
  },
  {
    id: 'laminados',
    title: 'Laminados y pastelería',
    blurb: 'Masa madre, manteca y horno de todos los días.',
    planet: ['#ffe2a3', '#d9a441', '#5a3a07'],
    rows: [
      ['Medialuna clásica', '$3.500', null, VG],
      ['Medialuna con jamón y queso', '$7.000'],
      ['Croissant', '$4.500', null, VG],
      ['Croissant de Coruscant', '$8.000', 'Con jamón y queso'],
      ['Croissant bicolor', '$5.000', 'De frambuesa', VG],
      ['Alfajor Libra', '$6.000', 'Nuez / ddl / chocolate blanco / lima', VG],
      ['tag', 'Wookie Cookies · VG'],
      ['Clásica', '$3.500', 'Vainilla, chips de chocolate y nueces'],
      ['Salted caramel', '$3.500', 'Maní y salted caramel'],
      ['Chocolate', '$3.500', 'Full chocolate'],
    ],
  },
  {
    id: 'cervezas',
    title: 'Cervezas',
    blurb: 'De la canilla.',
    planet: ['#ffd58a', '#e0901f', '#4d2a05'],
    rows: [
      ['Golden', '$6.000'],
      ['Scottish', '$6.000'],
      ['Porter', '$6.000'],
      ['American Pale Ale', '$8.000'],
      ['Hazy Indian Pale Ale', '$10.000'],
      ['New England Indian Pale Ale', '$10.000'],
    ],
  },
  {
    id: 'platos',
    title: 'Platos intensos',
    blurb: 'Para quedarse un rato largo.',
    planet: ['#ff9a86', '#d8402f', '#4a0d07'],
    rows: [
      ['Sándwich de carne braseada', '$22.000', 'Ciabatta, carne desmechada, provolone, coleslaw, chimichurri, alioli de mostaza y papines'],
      ['Pizza de masa madre y mozzarella', '$15.000'],
      ['tag', 'Las pizzas'],
      ['Pesto y tomates asados', null, null, VG],
      ['Calabaza asada, queso azul y nueces', null, null, VG],
      ['Cantimpalo, olivas y muhammara'],
      ['Cebolla, orégano y olivas negras', null, null, VG],
    ],
  },
  {
    id: 'helados',
    title: 'Helados soft',
    blurb: 'Con toppings.',
    planet: ['#e8f4ff', '#8fb8e0', '#1d3550'],
    rows: [
      ['Crema', '$6.000', 'Coulis de frambuesa y crumble de avena'],
      ['Dulce de leche', '$6.000', 'Ganache de chocolate y praliné de almendras'],
      ['Mixto', '$6.000', 'Salted caramel y cucurucho molido'],
    ],
  },
]

const N = CATEGORIES.length
const INTRO = 0.08
const SEG = (1 - INTRO - 0.04) / N
const TRAVEL = 0.34

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)

/** Dónde cae cada cosa (en píxeles de pantalla a zoom 1), según el tamaño de la pantalla. */
function layoutFor(W, H) {
  const wide = W >= 1024
  const S = wide ? W * 1.25 : W * 1.35
  const systems = CATEGORIES.map((cat, i) => {
    const x = i * S
    const y = (i % 2 ? 1 : -1) * H * (wide ? 0.22 : 0.3)
    const R = wide ? Math.min(H * 0.17, W * 0.1) : Math.min(W * 0.17, H * 0.1)
    const n = cat.rows.length
    // PC: los productos en un arco a la derecha del planeta. Teléfono: en lista debajo.
    const px = wide ? -W * 0.2 : 0
    const py = wide ? 0 : -H * 0.17
    const items = cat.rows.map((_, j) => {
      if (wide) {
        const span = Math.min(150, 26 + n * 10)
        const a = ((-span / 2 + (span * j) / Math.max(1, n - 1)) * Math.PI) / 180
        const rx = W * 0.27
        const ry = Math.min(H * 0.34, 30 + n * 30)
        return { x: px + Math.cos(a) * rx * 0.62 + R * 0.6, y: py + Math.sin(a) * ry, a }
      }
      const step = n > 10 ? 27 : 36
      return { x: -W * 0.42, y: py + R + 46 + j * step, a: 0 }
    })
    return { x, y, R, px, py, items }
  })
  const minY = Math.min(...systems.map((s) => s.y)) - H * 0.45
  const maxY = Math.max(...systems.map((s) => s.y)) + H * 0.45
  const minX = -W * 0.5
  const maxX = systems[N - 1].x + W * 0.5
  const overview = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: Math.min(W / (maxX - minX), H / (maxY - minY)) * 0.92 }
  return { wide, systems, overview }
}

export default function CartaSection() {
  const rootRef = useRef(null)
  const { t } = useLang()
  const R = useRef({ sys: [], items: {}, lines: {}, dots: {}, nav: [] })
  const [dims, setDims] = useState(() => (typeof window === 'undefined' ? { W: 1440, H: 900 } : { W: window.innerWidth, H: window.innerHeight }))
  const L = useMemo(() => layoutFor(dims.W, dims.H), [dims])

  useEffect(() => {
    let t = 0
    const on = () => {
      clearTimeout(t)
      t = setTimeout(() => setDims({ W: window.innerWidth, H: window.innerHeight }), 150)
    }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  useGSAP(
    () => {
      const r = R.current
      const { W, H } = dims
      let active = -2
      r.routeLen = 0
      const paint = (p) => {
        // La cámara: el mapa entero al principio, después de sistema en sistema.
        let cx = L.overview.x
        let cy = L.overview.y
        let z = L.overview.z
        let cur = -1
        let reveal = 0
        let travel = 0
        if (p >= INTRO) {
          const i = Math.min(N - 1, Math.floor((p - INTRO) / SEG))
          const u = clamp01((p - INTRO - i * SEG) / SEG)
          const from = i === 0 ? L.overview : { x: L.systems[i - 1].x, y: L.systems[i - 1].y, z: 1 }
          const to = L.systems[i]
          const k = smooth(clamp01(u / TRAVEL))
          cx = lerp(from.x, to.x, k)
          cy = lerp(from.y, to.y, k)
          z = lerp(from.z, 1, k) * (i === 0 ? 1 : 1 - 0.42 * Math.sin(Math.PI * k))
          cur = i
          travel = k
          reveal = clamp01((u - TRAVEL * 0.9) / 0.5)
        }
        r.world.style.transform = `translate3d(${W / 2 - cx * z}px, ${H / 2 - cy * z}px, 0) scale(${z})`
        // Las estrellas, en dos capas que se corren menos que el mapa.
        r.stars1.style.backgroundPosition = `${-cx * 0.08}px ${-cy * 0.08}px`
        r.stars2.style.backgroundPosition = `${-cx * 0.2}px ${-cy * 0.2}px`
        // Los productos se enganchan de a uno en el sistema actual; los demás quedan apagados.
        L.systems.forEach((s, i) => {
          const on = i === cur
          r.sys[i].style.opacity = String(cur < 0 ? 0.6 : on ? 1 : 0.3)
          s.items.forEach((_, j) => {
            const key = `${i}-${j}`
            const el = r.items[key]
            if (!el) return
            const t = on ? clamp01((reveal - (j / s.items.length) * 0.7) / 0.22) : cur > i ? 1 : 0
            const e = 1 - (1 - t) ** 3
            el.style.opacity = String(e)
            el.style.clipPath = `inset(-30% ${(1 - e) * 100}% -30% 0)`
            const line = r.lines[key]
            if (line) line.style.strokeDashoffset = String(1 - e)
            const dot = r.dots[key]
            if (dot) dot.style.transform = `scale(${e})`
          })
        })
        // La ruta recorrida y la nave.
        const total = r.routeLen || (r.routeLen = r.route.getTotalLength())
        const along = cur < 0 ? 0 : (cur - 1 + travel) / (N - 1)
        const d = clamp01(along) * total
        r.routeDone.style.strokeDasharray = `${total}`
        r.routeDone.style.strokeDashoffset = String(total - d)
        const pt = r.route.getPointAtLength(Math.max(0.01, d))
        const pt2 = r.route.getPointAtLength(Math.min(total, d + 2))
        const ang = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI
        r.ship.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${ang}) scale(${1 / Math.max(0.25, z)})`)
        // La consola.
        if (cur !== active) {
          active = cur
          r.nav.forEach((el, i) => el && (el.dataset.on = i === cur ? '1' : i < cur ? 'done' : '0'))
          r.sector.textContent =
            cur < 0 ? t('Carta take-away · 6 rubros') : t('Rubro {n} / 0{N} · {title}', { n: `0${cur + 1}`, N, title: t(CATEGORIES[cur].title) })
          r.coord.textContent =
            cur < 0
              ? t('S 40°09′15″ · O 71°20′51″')
              : t('Rumbo {deg}° · {n} productos', { deg: String(20 + cur * 47).padStart(3, '0'), n: CATEGORIES[cur].rows.filter((x) => x[0] !== 'tag').length })
        }
        const out = clamp01((p - INTRO * 0.5) / (INTRO * 0.45))
        r.intro.style.opacity = String(1 - out)
        r.intro.style.transform = `translate3d(0, ${-out * 30}px, 0)`
        r.intro.style.visibility = out >= 1 ? 'hidden' : 'visible'
      }
      paint(0)
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => paint(self.progress),
        onRefresh: (self) => paint(self.progress),
      })
      gsap.fromTo(
        r.intro.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: rootRef.current, start: 'top 60%', once: true } },
      )
    },
    { scope: rootRef, dependencies: [L, t], revertOnUpdate: true },
  )

  const goTo = (i) => {
    const root = rootRef.current
    const top = root.getBoundingClientRect().top + window.scrollY
    const y = top + (INTRO + i * SEG + SEG * TRAVEL + 0.01) * (root.offsetHeight - window.innerHeight)
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(y, { duration: 1.6 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  const set = (k) => (el) => (R.current[k] = el)
  // La ruta une los planetas (no el centro de cada sistema: no cruza la lista de productos).
  const routeD = 'M' + L.systems.map((s) => `${s.x + s.px} ${s.y + s.py}`).join(' L')

  return (
    <section ref={rootRef} id="carta" className="relative h-[820svh]" style={{ background: '#04050a', color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Estrellas (dos capas) y la cuadrícula del radar. */}
        <div
          ref={set('stars1')}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,0.45), transparent), radial-gradient(1.5px 1.5px at 200px 160px, rgba(255,214,170,0.6), transparent), radial-gradient(1px 1px at 60px 200px, rgba(255,255,255,0.35), transparent)',
            backgroundSize: '240px 240px',
          }}
        />
        <div
          ref={set('stars2')}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(1.5px 1.5px at 40px 60px, rgba(255,255,255,0.8), transparent), radial-gradient(2px 2px at 300px 220px, rgba(169,214,255,0.6), transparent), radial-gradient(1px 1px at 180px 330px, rgba(255,255,255,0.5), transparent)',
            backgroundSize: '420px 420px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(127,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(127,212,255,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* El mapa: la ruta, los planetas y sus productos. */}
        <div ref={set('world')} className="absolute top-0 left-0 will-change-transform" style={{ transformOrigin: '0 0' }}>
          {/* La ruta entre planetas: solo en pantalla ancha (en el teléfono cruzaba los títulos y las listas). */}
          <svg
            className="absolute overflow-visible"
            style={{ left: 0, top: 0, width: 1, height: 1, visibility: L.wide ? 'visible' : 'hidden' }}
            aria-hidden="true"
          >
            <path
              ref={set('route')}
              d={routeD}
              fill="none"
              stroke="rgba(127,212,255,0.35)"
              strokeWidth="2"
              strokeDasharray="4 10"
              vectorEffect="non-scaling-stroke"
            />
            <path ref={set('routeDone')} d={routeD} fill="none" stroke={C.neon} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {/* La nave: un caza chico visto desde arriba, apuntando hacia donde va (mira a +x). */}
            <g ref={set('ship')}>
              <g className="c33-ship">
                {/* La estela de los motores. */}
                <g className="c33-ship-trail" style={{ transformBox: 'fill-box', transformOrigin: '100% 50%' }}>
                  <path d="M-15 -9 L-52 -9.6 L-15 -7 Z M-15 9 L-52 9.6 L-15 7 Z" fill={C.neon} fillOpacity="0.55" />
                  <path d="M-15 -9 L-34 -9.2 L-15 -8 Z M-15 9 L-34 9.2 L-15 8 Z" fill="#fff4e2" fillOpacity="0.8" />
                </g>
                {/* Alas en X (se ven dos, abiertas), con los cañones en las puntas. */}
                <path d="M7 -2.6 L-6 -19 L-14 -19 L-9 -9 L-12 -4 Z" fill="#aab4c2" stroke="#2a3340" strokeWidth="0.8" strokeLinejoin="round" />
                <path d="M7 2.6 L-6 19 L-14 19 L-9 9 L-12 4 Z" fill="#aab4c2" stroke="#2a3340" strokeWidth="0.8" strokeLinejoin="round" />
                <path d="M-6 -19 L9 -19.4 L9 -17.8 L-6 -17.6 Z M-6 19 L9 19.4 L9 17.8 L-6 17.6 Z" fill="#6c7788" stroke="#2a3340" strokeWidth="0.6" />
                <path d="M-7 -14 L-12 -14 M-7 14 L-12 14" stroke={C.neon} strokeWidth="1.6" strokeLinecap="round" />
                {/* Los motores. */}
                <circle cx="-14" cy="-9.2" r="2.8" fill="#2a3340" stroke="#7a8696" strokeWidth="0.7" />
                <circle cx="-14" cy="9.2" r="2.8" fill="#2a3340" stroke="#7a8696" strokeWidth="0.7" />
                <circle className="c33-ship-glow" cx="-14.4" cy="-9.2" r="1.9" fill={C.neon} />
                <circle className="c33-ship-glow" cx="-14.4" cy="9.2" r="1.9" fill={C.neon} />
                {/* El fuselaje largo y fino, la nariz y la cabina. */}
                <path d="M27 0 L13 -2.4 L-6 -3.6 L-13 -2 L-13 2 L-6 3.6 L13 2.4 Z" fill="#dfe5ec" stroke="#2a3340" strokeWidth="0.8" strokeLinejoin="round" />
                <path d="M27 0 L18 -1.4 L18 1.4 Z" fill={C.neon} />
                <ellipse cx="3" cy="0" rx="6" ry="2.1" fill="#7fd4ff" stroke="#1d3550" strokeWidth="0.7" />
                <path d="M-1 0 L7 0" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.6" />
              </g>
            </g>
          </svg>

          {L.systems.map((s, i) => {
            const cat = CATEGORIES[i]
            const [c1, c2, c3] = cat.planet
            return (
              <div key={cat.id} ref={(el) => (R.current.sys[i] = el)} className="c33-sys absolute" style={{ left: s.x, top: s.y, width: 0, height: 0 }}>
                {/* Órbitas y líneas a cada producto. */}
                <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }} aria-hidden="true">
                  <ellipse
                    cx={s.px}
                    cy={s.py}
                    rx={s.R * 1.7}
                    ry={s.R * 0.42}
                    fill="none"
                    stroke="rgba(127,212,255,0.25)"
                    transform={`rotate(-14 ${s.px} ${s.py})`}
                  />
                  <circle cx={s.px} cy={s.py} r={s.R * 2.3} fill="none" stroke="rgba(127,212,255,0.12)" strokeDasharray="2 6" />
                  {L.wide
                    ? s.items.map((it, j) =>
                        cat.rows[j][0] === 'tag' ? null : (
                          <line
                            key={j}
                            ref={(el) => (R.current.lines[`${i}-${j}`] = el)}
                            x1={s.px + Math.cos(it.a) * s.R * 1.05}
                            y1={s.py + Math.sin(it.a) * s.R * 1.05}
                            x2={it.x - 6}
                            y2={it.y}
                            pathLength="1"
                            stroke="rgba(255,122,26,0.45)"
                            strokeWidth="1"
                            strokeDasharray="1"
                            strokeDashoffset="1"
                          />
                        ),
                      )
                    : null}
                </svg>
                {/* El planeta, con su luna. */}
                <div
                  aria-hidden="true"
                  className="absolute rounded-full"
                  style={{
                    left: s.px - s.R,
                    top: s.py - s.R,
                    width: s.R * 2,
                    height: s.R * 2,
                    background: `radial-gradient(circle at 34% 30%, ${c1}, ${c2} 45%, ${c3} 100%)`,
                    boxShadow: `0 0 ${s.R * 0.8}px ${c2}55, inset -${s.R * 0.25}px -${s.R * 0.2}px ${s.R * 0.5}px rgba(0,0,0,0.55)`,
                  }}
                >
                  <span className="c33-moon absolute top-1/2 left-1/2 h-0 w-0" style={{ '--r': `${s.R * 1.45}px` }}>
                    <span className="absolute h-2.5 w-2.5 rounded-full" style={{ background: '#f2e9dc', boxShadow: '0 0 10px #fff' }} />
                  </span>
                </div>
                {/* El nombre del sistema. */}
                <div
                  className="absolute"
                  style={{
                    left: L.wide ? s.px - s.R : -dims.W * 0.42,
                    top: L.wide ? s.py - s.R - 124 : s.py - s.R - 102,
                    width: L.wide ? s.R * 3.6 : dims.W * 0.84,
                  }}
                >
                  <p className="text-[11px] tracking-[0.24em] uppercase" style={{ ...MONO, color: C.neon }}>
                    {t('Rubro')} 0{i + 1}
                  </p>
                  <h3 className="mt-1 text-[clamp(1.6rem,3.2vw,3rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
                    {t(cat.title)}
                  </h3>
                  <p className="mt-1 text-[14px]" style={{ ...BODY, color: 'rgba(242,233,220,0.65)' }}>
                    {t(cat.blurb)}
                  </p>
                </div>
                {/* Los productos. */}
                {s.items.map((it, j) => {
                  const [name, price, desc, vg] = cat.rows[j]
                  const tag = name === 'tag'
                  return (
                    <div
                      key={j}
                      ref={(el) => (R.current.items[`${i}-${j}`] = el)}
                      className="absolute flex items-start gap-2.5"
                      style={{ left: it.x, top: it.y, transform: 'translateY(-50%)', width: L.wide ? dims.W * 0.3 : dims.W * 0.84, opacity: 0 }}
                    >
                      {tag ? (
                        <span
                          className="rounded-[2px] px-1.5 py-0.5 text-[10.5px] font-bold tracking-[0.18em] uppercase"
                          style={{ ...MONO, background: 'rgba(127,212,255,0.16)', color: '#a9d6ff' }}
                        >
                          {t(price)}
                        </span>
                      ) : (
                        <>
                          <span
                            ref={(el) => (R.current.dots[`${i}-${j}`] = el)}
                            className="mt-[0.45em] h-2 w-2 shrink-0 rounded-full"
                            style={{ background: C.neon, boxShadow: `0 0 8px ${C.neon}`, transform: 'scale(0)' }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                              <span className="text-[15px] leading-tight font-medium lg:text-[16px]" style={BODY}>
                                {t(name)}
                                {vg ? (
                                  <span
                                    className="ml-1.5 rounded-[2px] border px-1 align-middle text-[9px] font-bold"
                                    style={{ ...MONO, borderColor: 'rgba(242,233,220,0.4)' }}
                                  >
                                    VG
                                  </span>
                                ) : null}
                              </span>
                              <span
                                aria-hidden="true"
                                className="mb-[0.3em] min-w-4 flex-1 border-b border-dotted"
                                style={{ borderColor: 'rgba(242,233,220,0.25)' }}
                              />
                              {price ? (
                                <span className="text-[14px] font-semibold tabular-nums" style={{ ...MONO, color: C.neon }}>
                                  {price}
                                </span>
                              ) : null}
                            </span>
                            {desc && L.wide ? (
                              <span className="mt-0.5 block text-[12.5px] leading-[1.35]" style={{ ...BODY, color: 'rgba(242,233,220,0.55)' }}>
                                {t(desc)}
                              </span>
                            ) : null}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* La consola: viñeta, barrido, esquinas, lecturas y el selector de sistemas. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(130% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)' }}
        />
        <div aria-hidden="true" className="c33-scan pointer-events-none absolute inset-0" />
        {[
          'top-4 left-4 border-t-2 border-l-2',
          'top-4 right-4 border-t-2 border-r-2',
          'bottom-4 left-4 border-b-2 border-l-2',
          'right-4 bottom-4 border-r-2 border-b-2',
        ].map((c) => (
          <span
            key={c}
            aria-hidden="true"
            className={`pointer-events-none absolute h-7 w-7 md:h-10 md:w-10 ${c}`}
            style={{ borderColor: 'rgba(127,212,255,0.5)' }}
          />
        ))}
        <div className="pointer-events-none absolute inset-x-0 top-20 flex items-center justify-between gap-6 px-6 md:top-8 md:px-14 lg:top-10">
          <p className="hidden items-center gap-3 text-[11px] tracking-[0.22em] uppercase md:flex" style={{ ...MONO, color: 'rgba(242,233,220,0.7)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.neon, boxShadow: `0 0 8px ${C.neon}` }} />
            <span ref={set('sector')}>{t('Carta take-away · 6 rubros')}</span>
          </p>
          <p ref={set('coord')} className="hidden text-[11px] tracking-[0.2em] uppercase md:block" style={{ ...MONO, color: 'rgba(169,214,255,0.7)' }}>
            {t('S 40°09′15″ · O 71°20′51″')}
          </p>
        </div>

        {/* La entrada: el título sobre el mapa entero. */}
        <div ref={set('intro')} className="pointer-events-none absolute inset-x-0 bottom-[16svh] px-6 md:px-14">
          <p data-in className="text-[11px] tracking-[0.24em] uppercase opacity-0" style={{ ...MONO, color: C.neon }}>
            {t('Experiencia Capsula · take-away')}
          </p>
          <h2 data-in className="mt-3 text-[clamp(2.6rem,8vw,8.5rem)] leading-[0.88] font-semibold tracking-[-0.02em] uppercase opacity-0" style={DISPLAY}>
            {t('La carta,')}
            <br />
            <span style={{ color: C.neon }}>{t('en órbita.')}</span>
          </h2>
          <p data-in className="mt-4 max-w-[40ch] text-[16px] leading-[1.5] opacity-0" style={{ ...BODY, color: 'rgba(242,233,220,0.75)' }}>
            {t(
              'La carta take-away, rubro por rubro: cafetería, smoothies, laminados y pastelería, cervezas, platos intensos y helados soft, con los precios de hoy.',
            )}
          </p>
        </div>

        <nav aria-label={t('Rubros de la carta')} className="absolute inset-x-0 bottom-6 flex justify-center px-4 md:bottom-8">
          <ol
            className="flex max-w-full gap-1 overflow-x-auto rounded-full border p-1 md:gap-1.5"
            style={{ borderColor: 'rgba(127,212,255,0.25)', background: 'rgba(4,5,10,0.7)', backdropFilter: 'blur(8px)', scrollbarWidth: 'none' }}
          >
            {CATEGORIES.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  ref={(el) => (R.current.nav[i] = el)}
                  data-on="0"
                  onClick={() => goTo(i)}
                  className="c33-nav tpl-hit flex h-9 items-center gap-2 rounded-full px-3 text-[10.5px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase md:px-4 md:text-[11px]"
                  style={MONO}
                >
                  <span className="tabular-nums opacity-60">0{i + 1}</span>
                  <span className="hidden sm:inline">{t(c.title)}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <style>{`
        .c33-sys { transition: opacity 600ms cubic-bezier(0.22,1,0.36,1); }
        .c33-nav { color: rgba(242,233,220,0.6); transition: background-color 300ms, color 300ms; }
        .c33-nav[data-on='done'] { color: rgba(255,122,26,0.75); }
        .c33-nav[data-on='1'] { background: ${C.neon}; color: #0b0c0f; }
        @media (hover: hover) { .c33-nav[data-on='0']:hover, .c33-nav[data-on='done']:hover { background: rgba(255,255,255,0.08); color: #f2e9dc; } }
        .c33-nav:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 2px; }
        .c33-scan { background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px); mix-blend-mode: overlay; }
        @keyframes c33-orbit { from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); } to { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); } }
        .c33-moon { animation: c33-orbit 14s linear infinite; }
        .c33-ship { filter: drop-shadow(0 0 5px rgba(255,122,26,0.55)); animation: c33-ship-bob 3.2s ease-in-out infinite; }
        .c33-ship-trail { animation: c33-ship-trail 0.14s steps(1, end) infinite; }
        .c33-ship-glow { animation: c33-ship-glow 0.9s ease-in-out infinite; }
        @keyframes c33-ship-bob { 0%, 100% { transform: translateY(-1.2px) rotate(-1.5deg); } 50% { transform: translateY(1.2px) rotate(1.5deg); } }
        @keyframes c33-ship-trail { 0% { transform: scaleX(1); } 50% { transform: scaleX(0.82); } }
        @keyframes c33-ship-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
    </section>
  )
}

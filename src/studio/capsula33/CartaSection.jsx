import { useMemo, useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'

/**
 * cāpsula33 — «La carta»: el menú take-away completo, que se lee con el scroll.
 *
 * La carta es una tira de papel (la de verdad: portada azul de cuadrícula, rojo,
 * mosaico de píxeles) que sube por una pantalla fija. Una línea de lectura
 * naranja la recorre: lo que ya pasó queda leído, lo que viene espera apagado,
 * y a la izquierda el rubro que cruza la línea cambia de título. Los precios
 * son los de la carta impresa.
 */

const VG = true

const CATEGORIES = [
  {
    id: 'cafeteria',
    title: 'Cafetería',
    blurb: 'Espresso a 93 grados, de especialidad.',
    groups: [
      {
        tag: 'Calientes',
        items: [
          ['Americano', '$4.800'],
          ['Lagrima', '$4.500'],
          ['Flat White', '$5.500'],
          ['Capuccino', '$6.000'],
          ['Latte', '$5.500'],
          ['Latte cápsula33', '$6.000'],
          ['Chocolate caliente', '$6.500'],
          ['Chocolate caliente cápsula33', '$6.500'],
          ['Golden milk', '$5.000'],
        ],
      },
      {
        tag: 'Fríos',
        items: [
          ['Americano con hielo', '$5.500'],
          ['Latte con hielo', '$6.000'],
          ['Affogato', '$6.500'],
        ],
      },
    ],
  },
  {
    id: 'smoothies',
    title: 'Bebidas smoothies',
    blurb: 'Frutas licuadas, una por humor.',
    groups: [
      {
        items: [
          ['Alegría', '$9.000', 'Frutos rojos y ananá'],
          ['Capricho', '$9.000', 'Oreo y mantequilla de maní'],
          ['Vigor', '$9.000', 'Durazno y jengibre'],
        ],
      },
    ],
  },
  {
    id: 'laminados',
    title: 'Laminados y pastelería',
    blurb: 'Masa madre, manteca y horno de todos los días.',
    groups: [
      {
        items: [
          ['Medialuna clásica', '$3.500', null, VG],
          ['Medialuna con jamón y queso', '$7.000'],
          ['Croissant', '$4.500', null, VG],
          ['Croissant de Coruscant', '$8.000', 'Croissant con jamón y queso'],
          ['Croissant bicolor', '$5.000', 'Croissant de frambuesa', VG],
          ['Alfajor Libra', '$6.000', 'Nuez / ddl / chocolate blanco / lima', VG],
        ],
      },
      {
        tag: 'Wookie Cookies',
        vg: true,
        items: [
          ['Clásica', '$3.500', 'Vainilla + chips de chocolate + nueces'],
          ['Salted caramel', '$3.500', 'Maní + salted caramel'],
          ['Chocolate', '$3.500', 'Full chocolate'],
        ],
      },
    ],
  },
  {
    id: 'cervezas',
    title: 'Cervezas',
    blurb: 'De la canilla.',
    groups: [
      {
        items: [
          ['Golden', '$6.000'],
          ['Scottish', '$6.000'],
          ['Porter', '$6.000'],
          ['American Pale Ale', '$8.000'],
          ['Hazy Indian Pale Ale', '$10.000'],
          ['New England Indian Pale Ale', '$10.000'],
        ],
      },
    ],
  },
  {
    id: 'platos',
    title: 'Platos intensos',
    blurb: 'Para quedarse un rato largo.',
    groups: [
      {
        items: [
          ['Sándwich de carne braseada', '$22.000', 'Pan ciabatta / carne desmechada / provolone / coleslaw / chimichurri / alioli de mostaza / papines rústicos'],
          ['Pizzas de masa madre y mozzarella', '$15.000'],
        ],
      },
      {
        tag: 'Las de hoy',
        items: [
          ['Mozzarella', null, 'Pesto de albahaca / tomates asados', VG],
          ['Mozzarella', null, 'Calabaza asada / queso azul / nueces', VG],
          ['Mozzarella', null, 'Cantimpalo / olivas negras / muhammara'],
          ['Mozzarella', null, 'Cebolla / orégano / olivas negras', VG],
        ],
      },
    ],
  },
  {
    id: 'helados',
    title: 'Helados soft',
    blurb: 'Con toppings.',
    groups: [
      {
        items: [
          ['Helado soft con toppings', '$6.000'],
          ['Crema', null, 'Coulis de frambuesa + crumble de avena'],
          ['Dulce de leche', null, 'Ganache de chocolate + praline de almendras'],
          ['Mixto', null, 'Salted caramel + cucurucho molido'],
        ],
      },
    ],
  },
]

const PAPER = '#f3f0e8'
const INK = '#101114'
const TEAL = '#1b6a78'
const RED = '#d8402f'

/** Mosaico de píxeles (los cuadraditos que se deshacen en el borde de la carta). */
function Pixels({ rows = 3, flip = false, seed = 1 }) {
  const cells = useMemo(() => {
    let x = seed * 9301 + 49297
    const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280)
    const cols = 34
    const out = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const density = flip ? (r + 1) / rows : 1 - r / rows
        if (rnd() < density * 0.62) out.push([c, r])
      }
    }
    return { out, cols }
  }, [rows, flip, seed])
  return (
    <svg viewBox={`0 0 ${cells.cols * 10} ${rows * 10}`} preserveAspectRatio="none" className="block w-full" style={{ height: rows * 9 }} aria-hidden="true">
      {cells.out.map(([c, r]) => (
        <rect key={`${c}-${r}`} x={c * 10 + 1} y={r * 10 + 1} width="8" height="8" fill={TEAL} />
      ))}
    </svg>
  )
}

export default function CartaSection() {
  const rootRef = useRef(null)
  const R = useRef({ titles: [], dots: [], items: [] })

  useGSAP(
    () => {
      const r = R.current
      let active = -1
      const paint = (p) => {
        const view = r.view.clientHeight
        const track = r.track.scrollHeight
        const line = view * 0.4
        const travel = Math.max(0, track - view * 0.7)
        const y = -Math.max(0, (p - 0.07) / 0.93) * travel // la portada se ve entera al llegar
        r.track.style.transform = `translate3d(0, ${y}px, 0)`
        // La línea de lectura: lo que está por encima ya se leyó, lo que viene espera.
        r.items.forEach((el) => {
          const t = el.offsetTop + el.offsetHeight / 2 + y
          const d = t - line
          const near = Math.max(0, 1 - Math.abs(d) / (view * 0.22))
          const o = d < 0 ? 0.62 + 0.38 * near : 0.2 + 0.8 * near
          el.style.opacity = String(o)
          el.style.transform = `translate3d(${(1 - Math.max(0, Math.min(1, 1 - d / (view * 0.5)))) * 10}px, 0, 0)`
          el.dataset.hot = near > 0.55 ? '1' : '0'
        })
        // El rubro que cruza la línea.
        let cur = 0
        r.sections.forEach((el, i) => {
          if (el.offsetTop + y <= line + 8) cur = i
        })
        if (cur !== active) {
          active = cur
          r.titles.forEach((el, i) => el && (el.dataset.on = i === cur ? '1' : '0'))
          r.dots.forEach((el, i) => el && (el.dataset.on = i === cur ? '1' : i < cur ? 'done' : '0'))
          if (r.count) r.count.textContent = `0${cur + 1} / 0${CATEGORIES.length}`
        }
      }
      r.sections = [...r.track.querySelectorAll('[data-cat]')]
      r.items = [...r.track.querySelectorAll('[data-it]')]
      paint(0)
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => paint(self.progress),
        onRefresh: (self) => paint(self.progress),
      })
      gsap.fromTo(
        r.head.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: rootRef.current, start: 'top 60%', once: true } },
      )
    },
    { scope: rootRef },
  )

  const set = (k) => (el) => (R.current[k] = el)

  return (
    <section ref={rootRef} id="carta" className="relative h-[640svh]" style={{ background: '#05060a', color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* La cuadrícula de fondo, como la portada de la carta. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(27,106,120,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(27,106,120,0.16) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* A la izquierda (arriba en teléfono): el rubro que se está leyendo. */}
        <div ref={set('head')} className="absolute top-20 right-6 left-6 md:left-10 lg:top-1/2 lg:right-auto lg:left-[5vw] lg:w-[min(36vw,34rem)] lg:-translate-y-1/2">
          <p data-in className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
            <span className="h-px w-8" style={{ background: C.neon }} />
            La carta · take-away
          </p>
          <div data-in className="relative mt-3 h-[3.1rem] opacity-0 sm:h-[4.2rem] lg:h-[11.5rem]">
            {CATEGORIES.map((c, i) => (
              <div key={c.id} ref={(el) => (R.current.titles[i] = el)} data-on={i === 0 ? '1' : '0'} className="c33-cat absolute inset-x-0 top-0">
                <h2 className="text-[clamp(1.7rem,6.4vw,2.4rem)] leading-[0.98] font-semibold uppercase lg:text-[clamp(2.6rem,4.6vw,5rem)]" style={DISPLAY}>
                  {c.title}
                </h2>
                <p className="mt-2 hidden max-w-[30ch] text-[17px] leading-[1.5] lg:block" style={{ ...BODY, color: 'rgba(242,233,220,0.72)' }}>
                  {c.blurb}
                </p>
              </div>
            ))}
          </div>
          <div data-in className="mt-6 hidden items-center gap-4 opacity-0 lg:flex">
            <span ref={set('count')} className="text-[12px] tracking-[0.2em] tabular-nums" style={{ ...MONO, color: C.neon }}>
              01 / 06
            </span>
            <ol className="flex flex-1 gap-1.5" aria-label="Rubros de la carta">
              {CATEGORIES.map((c, i) => (
                <li key={c.id} ref={(el) => (R.current.dots[i] = el)} data-on={i === 0 ? '1' : '0'} title={c.title} className="c33-dot h-1 flex-1 rounded-full">
                  <span className="sr-only">{c.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* La carta: una tira de papel que sube con el scroll. */}
        <div
          ref={set('view')}
          className="absolute inset-x-4 top-[9rem] bottom-4 overflow-hidden rounded-[6px] sm:inset-x-[12vw] lg:inset-x-auto lg:top-[4svh] lg:right-[5vw] lg:bottom-[4svh] lg:w-[min(46vw,34rem)]"
          style={{ background: PAPER, color: INK, boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          <div ref={set('track')} className="will-change-transform">
            {/* Portada: cuadrícula azul, CAPSULA en rojo, sello. */}
            <div className="relative px-5 pt-6 pb-5 md:px-7" style={{ background: TEAL, backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
              <p className="text-[11px] tracking-[0.3em] uppercase" style={{ ...MONO, color: '#dff3f2' }}>
                Experiencia
              </p>
              <p
                aria-label="Cápsula"
                className="mt-1 text-[clamp(2.6rem,12.5vw,4.4rem)] leading-[0.9] font-bold tracking-[0.01em] uppercase lg:text-[clamp(2.6rem,4.4vw,4.4rem)]"
                style={{ ...DISPLAY, color: RED, textShadow: '2px 2px 0 #7d1a12, 4px 4px 0 rgba(0,0,0,0.25)' }}
              >
                Capsula
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="rounded-[2px] px-2 py-1 text-[10px] font-bold tracking-[0.2em] uppercase" style={{ ...MONO, background: INK, color: '#fff' }}>
                  Declassified
                </span>
                <span className="text-[clamp(1.1rem,4.4vw,1.5rem)] font-semibold tracking-[0.06em] uppercase" style={{ ...DISPLAY, color: '#f1e9d6' }}>
                  Take-away
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t pt-3 text-[11px] tracking-[0.16em] uppercase" style={{ ...MONO, borderColor: 'rgba(255,255,255,0.3)', color: '#dff3f2' }}>
                <span>Bienvenidos, exploradores de universos</span>
              </div>
            </div>
            <Pixels rows={3} flip seed={3} />

            {CATEGORIES.map((cat) => (
              <section key={cat.id} data-cat className="px-5 pt-6 pb-4 md:px-7">
                <h3 data-it className="border-b-2 pb-2 text-[clamp(1.05rem,4.2vw,1.25rem)] font-semibold tracking-[0.08em] uppercase" style={{ ...DISPLAY, borderColor: INK }}>
                  {cat.title}
                </h3>
                {cat.groups.map((g, gi) => (
                  <div key={gi} className="mt-4">
                    {g.tag ? (
                      <p data-it className="mb-2 inline-flex items-center gap-2">
                        <span className="rounded-[2px] px-1.5 py-0.5 text-[10.5px] font-bold tracking-[0.14em] uppercase" style={{ ...MONO, background: INK, color: PAPER }}>
                          {g.tag}
                        </span>
                        {g.vg ? <span className="rounded-[2px] border px-1 text-[9px] font-bold" style={{ ...MONO, borderColor: INK }}>VG</span> : null}
                      </p>
                    ) : null}
                    <ul>
                      {g.items.map(([name, price, desc, vg], i) => (
                        <li key={`${name}-${i}`} data-it className="py-[0.42rem]">
                          <div className="flex items-baseline gap-3">
                            <span className="flex-1 text-[15px] leading-[1.25] font-medium lg:text-[16px]" style={BODY}>
                              {name}
                              {vg ? <span className="ml-1.5 rounded-[2px] border px-1 align-middle text-[9px] font-bold" style={{ ...MONO, borderColor: INK }}>VG</span> : null}
                            </span>
                            {price ? (
                              <span className="c33-price text-[14px] font-semibold tabular-nums" style={MONO}>
                                {price}
                              </span>
                            ) : null}
                          </div>
                          {desc ? (
                            <p className="mt-0.5 pr-8 text-[12.5px] leading-[1.4]" style={{ ...BODY, color: 'rgba(16,17,20,0.62)' }}>
                              {desc}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
            <div className="mt-6">
              <Pixels rows={4} seed={7} />
            </div>
            <p className="px-5 pt-3 pb-24 text-[11px] tracking-[0.16em] uppercase md:px-7" style={{ ...MONO, color: 'rgba(16,17,20,0.5)' }}>
              VG: opción vegana · Av. Gral. Roca 1120
            </p>
          </div>

          {/* La línea de lectura. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[40%]">
            <div className="h-px w-full" style={{ background: C.neon, boxShadow: `0 0 14px 1px ${C.neon}` }} />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-10" style={{ background: `linear-gradient(to bottom, ${PAPER}, transparent)` }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16" style={{ background: `linear-gradient(to top, ${PAPER}, transparent)` }} />
        </div>
      </div>
      <style>{`
        .c33-cat { opacity: 0; transform: translateY(24px); filter: blur(6px); visibility: hidden; transition: opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1), visibility 0s linear 700ms; }
        .c33-cat[data-on='1'] { opacity: 1; transform: none; filter: none; visibility: visible; transition-delay: 0s; }
        .c33-dot { background: rgba(242,233,220,0.18); transition: background-color 400ms; }
        .c33-dot[data-on='1'] { background: ${C.orange}; }
        .c33-dot[data-on='done'] { background: rgba(255,122,26,0.5); }
        [data-it][data-hot='1'] .c33-price { color: ${RED}; }
      `}</style>
    </section>
  )
}

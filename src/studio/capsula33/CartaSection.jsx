import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { useLang } from './i18nCore'
import { C, MONO, DISPLAY, BODY } from './brand'
import { CARTA_PHOTOS, CARTA_PHOTO_BASE } from './cartaPhotos'

/**
 * cāpsula33 — «La carta»: el menú take-away como la consola de pedidos de la nave.
 *
 * Una pantalla de mando: a la izquierda los seis rubros de la carta impresa, en el
 * centro los productos de ese rubro con su precio (grandes y fáciles de leer) y, a la
 * derecha, la foto del producto que tenés bajo el mouse (o el que tocaste, en el
 * teléfono). Nada que viajar ni esperar: se lee de un vistazo. Precios de la carta impresa.
 */

const VG = true

// [nombre, precio, descripción?, vegano?] — o ['tag', 'Subtítulo'] para un subtítulo dentro del rubro.
// `planet` es la paleta del rubro (luz, medio, sombra): tiñe la pestaña y el brillo del fondo.
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

const isTag = (row) => row[0] === 'tag'
/** El primer producto del rubro (el que tiene foto, si hay alguno): el que se muestra al entrar. */
const firstProduct = (i) => {
  const rows = CATEGORIES[i].rows
  const withPhoto = rows.findIndex((r) => !isTag(r) && CARTA_PHOTOS[r[0]])
  return withPhoto >= 0 ? withPhoto : rows.findIndex((r) => !isTag(r))
}

export default function CartaSection() {
  const rootRef = useRef(null)
  const { t } = useLang()
  const [ci, setCi] = useState(0)
  const [sel, setSel] = useState(() => firstProduct(0))
  const cat = CATEGORIES[ci]
  const [c1, c2, c3] = cat.planet
  const row = cat.rows[sel] || cat.rows.find((r) => !isTag(r))
  const [selName, selPrice, selDesc] = row
  const photo = CARTA_PHOTOS[selName]
  const count = (c) => c.rows.filter((r) => !isTag(r)).length

  const pick = (i) => {
    if (i === ci) return
    setCi(i)
    setSel(firstProduct(i))
  }
  const onTabKey = (e) => {
    const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!next) return
    e.preventDefault()
    const i = (ci + next + CATEGORIES.length) % CATEGORIES.length
    pick(i)
    rootRef.current?.querySelectorAll('[role="tab"]')[i]?.focus()
  }

  // La entrada: el título y la consola aparecen una vez, al llegar.
  useGSAP(
    () => {
      gsap.fromTo(
        rootRef.current.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: rootRef.current, start: 'top 62%', once: true } },
      )
    },
    { scope: rootRef, dependencies: [t], revertOnUpdate: true },
  )

  return (
    <section ref={rootRef} id="carta" className="relative overflow-hidden" style={{ background: '#04050a', color: C.cream }}>
      {/* El fondo: estrellas, cuadrícula de radar y el brillo del rubro que está abierto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 200px 160px, rgba(255,214,170,0.5), transparent), radial-gradient(1px 1px at 60px 200px, rgba(255,255,255,0.3), transparent)',
          backgroundSize: '240px 240px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(127,212,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(127,212,255,0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div
        aria-hidden="true"
        className="c33-glow pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(55% 55% at 78% 58%, ${c2}30, transparent 70%), radial-gradient(40% 40% at 8% 90%, ${c2}18, transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-[1480px] px-5 py-20 md:px-10 lg:px-14 lg:py-28">
        <header className="max-w-[60rem]">
          <p data-in className="text-[11px] tracking-[0.24em] uppercase opacity-0" style={{ ...MONO, color: C.neon }}>
            {t('Experiencia Capsula · take-away')}
          </p>
          <h2 data-in className="mt-3 text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.02em] uppercase opacity-0" style={DISPLAY}>
            {t('La carta,')}
            <br />
            <span style={{ color: C.neon }}>{t('lista para llevar.')}</span>
          </h2>
        </header>

        {/* La consola. */}
        <div
          data-in
          className="relative mt-10 border opacity-0 md:mt-14"
          style={{ borderColor: 'rgba(127,212,255,0.28)', background: 'rgba(7,9,15,0.82)', boxShadow: '0 30px 90px rgba(0,0,0,0.55)' }}
        >
          {[
            '-top-px -left-px border-t-2 border-l-2',
            '-top-px -right-px border-t-2 border-r-2',
            '-bottom-px -left-px border-b-2 border-l-2',
            '-right-px -bottom-px border-r-2 border-b-2',
          ].map((c) => (
            <span key={c} aria-hidden="true" className={`pointer-events-none absolute h-4 w-4 md:h-6 md:w-6 ${c}`} style={{ borderColor: C.neon }} />
          ))}
          <div aria-hidden="true" className="c33-scan pointer-events-none absolute inset-0" />

          {/* La barra de estado de la consola. */}
          <div
            className="relative flex items-center justify-between gap-4 border-b px-4 py-2.5 text-[10.5px] tracking-[0.2em] uppercase md:px-6 md:text-[11px]"
            style={{ ...MONO, borderColor: 'rgba(127,212,255,0.2)', color: 'rgba(169,214,255,0.75)' }}
          >
            <span className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.neon, boxShadow: `0 0 8px ${C.neon}` }} />
              {t('Rubro {n} / 0{N} · {title}', { n: `0${ci + 1}`, N: CATEGORIES.length, title: t(cat.title) })}
            </span>
            <span className="hidden sm:inline">{t('{n} productos', { n: count(cat) })}</span>
          </div>

          <div className="relative grid gap-0 lg:grid-cols-[250px_minmax(0,1fr)_minmax(320px,400px)]">
            {/* Los rubros. */}
            <div
              role="tablist"
              aria-label={t('Rubros de la carta')}
              aria-orientation="vertical"
              onKeyDown={onTabKey}
              className="no-scrollbar flex gap-1.5 overflow-x-auto border-b p-3 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-r lg:border-b-0 lg:p-4"
              style={{ borderColor: 'rgba(127,212,255,0.2)', scrollbarWidth: 'none' }}
            >
              {CATEGORIES.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  id={`c33-tab-${c.id}`}
                  aria-selected={i === ci}
                  aria-controls="c33-carta-panel"
                  tabIndex={i === ci ? 0 : -1}
                  onClick={() => pick(i)}
                  className="c33-tab flex shrink-0 items-center gap-3 rounded-[3px] px-3 py-2.5 text-left lg:py-3.5"
                  data-on={i === ci ? '1' : '0'}
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: `radial-gradient(circle at 34% 30%, ${c.planet[0]}, ${c.planet[1]} 55%, ${c.planet[2]})` }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] tracking-[0.2em] uppercase opacity-60" style={MONO}>
                      0{i + 1} · {count(c)}
                    </span>
                    <span className="block text-[13px] leading-tight font-semibold tracking-[0.04em] whitespace-nowrap uppercase lg:text-[15px] lg:whitespace-normal" style={DISPLAY}>
                      {t(c.title)}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Los productos. */}
            <div
              id="c33-carta-panel"
              role="tabpanel"
              aria-labelledby={`c33-tab-${cat.id}`}
              className="min-w-0 px-4 py-5 md:px-8 md:py-8 lg:min-h-[640px] lg:px-10"
            >
              <p className="text-[14px] leading-snug lg:text-[15px]" style={{ ...BODY, color: 'rgba(242,233,220,0.65)' }}>
                {t(cat.blurb)}
              </p>
              <ul key={cat.id} className="mt-4 lg:mt-6">
                {cat.rows.map((r, j) => {
                  const [name, price, desc, vg] = r
                  if (isTag(r)) {
                    return (
                      <li key={j} className="c33-row mt-5 first:mt-0 lg:mt-7" style={{ '--i': j }}>
                        <span
                          className="inline-block rounded-[2px] px-2 py-1 text-[10.5px] font-bold tracking-[0.18em] uppercase lg:text-[11.5px]"
                          style={{ ...MONO, background: 'rgba(127,212,255,0.16)', color: '#a9d6ff' }}
                        >
                          {t(price)}
                        </span>
                      </li>
                    )
                  }
                  return (
                    <li key={j} className="c33-row" style={{ '--i': j }}>
                      <button
                        type="button"
                        data-sel={j === sel ? '1' : '0'}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(j)}
                        onFocus={() => setSel(j)}
                        onClick={() => setSel(j)}
                        className="c33-item flex w-full items-start gap-3 border-b px-2 py-3 text-left lg:gap-4 lg:px-3 lg:py-3.5"
                        style={{ borderColor: 'rgba(242,233,220,0.08)' }}
                      >
                        <span aria-hidden="true" className="c33-dot mt-[0.55em] h-2 w-2 shrink-0 rounded-full" style={{ background: C.neon }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-3">
                            <span className="text-[16px] leading-tight font-medium lg:text-[21px]" style={BODY}>
                              {t(name)}
                              {vg ? (
                                <span
                                  className="ml-2 rounded-[2px] border px-1 align-middle text-[9px] font-bold lg:text-[10px]"
                                  style={{ ...MONO, borderColor: 'rgba(242,233,220,0.4)' }}
                                >
                                  VG
                                </span>
                              ) : null}
                            </span>
                            <span aria-hidden="true" className="mb-[0.35em] min-w-4 flex-1 border-b border-dotted" style={{ borderColor: 'rgba(242,233,220,0.22)' }} />
                            {price ? (
                              <span className="text-[15px] font-semibold tabular-nums lg:text-[19px]" style={{ ...MONO, color: C.neon }}>
                                {price}
                              </span>
                            ) : null}
                          </span>
                          {desc ? (
                            <span className="mt-1 block text-[13px] leading-[1.4] lg:text-[14.5px]" style={{ ...BODY, color: 'rgba(242,233,220,0.58)' }}>
                              {t(desc)}
                            </span>
                          ) : null}
                          {j === sel && CARTA_PHOTOS[name] ? (
                            <span className="c33-open mt-3 block overflow-hidden lg:hidden" style={{ border: '1px solid rgba(127,212,255,0.3)' }}>
                              <img
                                src={`${CARTA_PHOTO_BASE}${CARTA_PHOTOS[name]}`}
                                alt={t(name)}
                                className="block aspect-[16/9] w-full object-cover"
                                draggable="false"
                              />
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* La foto del producto elegido. */}
            <aside
              className="hidden lg:sticky lg:top-24 lg:block lg:self-start lg:border-l lg:p-6"
              style={{ borderColor: 'rgba(127,212,255,0.2)' }}
              aria-live="polite"
            >
              <div
                className="relative mx-auto aspect-[16/10] w-full max-w-[520px] overflow-hidden lg:aspect-[4/5] lg:max-w-none"
                style={{ background: '#0b0c0f', border: '1px solid rgba(127,212,255,0.3)' }}
              >
                {photo ? (
                  <img
                    key={photo}
                    src={`${CARTA_PHOTO_BASE}${photo}`}
                    alt={t(selName)}
                    className="c33-photo-img absolute inset-0 h-full w-full object-cover"
                    draggable="false"
                  />
                ) : (
                  <div
                    key={`${cat.id}-${sel}`}
                    className="c33-photo-img absolute inset-0 grid place-items-center"
                    style={{ background: `radial-gradient(circle at 50% 40%, ${c2}55, ${c3}aa 55%, #0b0c0f 100%)` }}
                  >
                    <span className="text-center">
                      <span className="block text-[clamp(2.4rem,5vw,4rem)] leading-none font-semibold" style={{ ...MONO, color: c1, opacity: 0.85 }}>
                        c̄33
                      </span>
                      <span className="mt-3 block text-[10.5px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
                        {t('Foto en camino')}
                      </span>
                    </span>
                  </div>
                )}
                <span key={`sw-${cat.id}-${sel}`} aria-hidden="true" className="c33-sweep pointer-events-none absolute inset-x-0 top-0 h-1/3" />
                <span aria-hidden="true" className="c33-photo-scan pointer-events-none absolute inset-0" />
                {['top-2 left-2 border-t border-l', 'top-2 right-2 border-t border-r', 'bottom-2 left-2 border-b border-l', 'right-2 bottom-2 border-r border-b'].map((c) => (
                  <span key={c} aria-hidden="true" className={`pointer-events-none absolute h-4 w-4 ${c}`} style={{ borderColor: C.neon }} />
                ))}
              </div>
              <div className="mx-auto mt-3 flex max-w-[520px] items-baseline justify-between gap-3 lg:max-w-none">
                <div className="min-w-0">
                  <p className="text-[10.5px] tracking-[0.2em] uppercase" style={{ ...MONO, color: 'rgba(169,214,255,0.7)' }}>
                    {t(cat.title)}
                  </p>
                  <p className="mt-1 text-[18px] leading-tight font-medium lg:text-[20px]" style={BODY}>
                    {t(selName)}
                  </p>
                  {selDesc ? (
                    <p className="mt-1 text-[13px] leading-[1.4] lg:hidden" style={{ ...BODY, color: 'rgba(242,233,220,0.58)' }}>
                      {t(selDesc)}
                    </p>
                  ) : null}
                </div>
                {selPrice ? (
                  <span className="shrink-0 text-[18px] font-semibold tabular-nums" style={{ ...MONO, color: C.neon }}>
                    {selPrice}
                  </span>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .c33-glow { transition: background 700ms cubic-bezier(0.23, 1, 0.32, 1); }
        .c33-scan { background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px); mix-blend-mode: overlay; }
        .c33-tab { color: rgba(242,233,220,0.62); border: 1px solid transparent; transition: background-color 220ms cubic-bezier(0.23,1,0.32,1), color 220ms, border-color 220ms; }
        .c33-tab[data-on='1'] { color: #f2e9dc; background: rgba(255,122,26,0.12); border-color: rgba(255,122,26,0.55); }
        @media (hover: hover) { .c33-tab[data-on='0']:hover { background: rgba(255,255,255,0.06); color: #f2e9dc; } }
        .c33-tab:focus-visible, .c33-item:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 2px; }
        .c33-row { animation: c33-row-in 380ms cubic-bezier(0.23, 1, 0.32, 1) both; animation-delay: calc(var(--i) * 26ms); }
        @keyframes c33-row-in { from { opacity: 0; transform: translateY(10px); } }
        .c33-item { color: rgba(242,233,220,0.92); transition: background-color 180ms cubic-bezier(0.23,1,0.32,1), color 180ms; }
        .c33-dot { opacity: 0.35; transform: scale(0.8); transition: opacity 180ms, transform 180ms cubic-bezier(0.23,1,0.32,1), box-shadow 180ms; }
        .c33-item[data-sel='1'] { background: linear-gradient(90deg, rgba(255,122,26,0.14), rgba(255,122,26,0)); color: #fff; }
        .c33-item[data-sel='1'] .c33-dot { opacity: 1; transform: scale(1.25); box-shadow: 0 0 10px ${C.neon}; }
        .c33-open { animation: c33-open 320ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        @keyframes c33-open { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 320px; } }
        .c33-photo-img { animation: c33-photo-in 420ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        @keyframes c33-photo-in { from { opacity: 0; transform: scale(1.05); } }
        .c33-photo-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.16) 2px 3px); mix-blend-mode: multiply; }
        .c33-sweep { background: linear-gradient(to bottom, rgba(255,122,26,0), rgba(255,122,26,0.32) 85%, rgba(255,190,130,0.7)); animation: c33-sweep 700ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        @keyframes c33-sweep { from { transform: translateY(-100%); opacity: 1; } to { transform: translateY(300%); opacity: 0; } }
      `}</style>
    </section>
  )
}

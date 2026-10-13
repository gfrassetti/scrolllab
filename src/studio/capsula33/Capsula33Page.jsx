import { useEffect } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import Hero from './Hero'
import { BODY, C, DISPLAY, FONTS_HREF, HOURS, MONO } from './brand'

/*
THESIS: el sitio es la cápsula misma — se entra por sus ventanas; rechaza el
  "hero foto + menú en PDF" de toda cafetería.
OWN-WORLD: negro espacio, naranja de fachada, neón naranja; mono liviana
  minúscula (logo) + cuadrada técnica (sus impresos) + Barlow; ventanas
  pastilla y ojo de buey como único contenedor; HUD de esquinas y códigos C33.
STORY: el visitante gira la fachada, entiende "café, cine y algo más", elige
  una ventana (menú, colección, mapa) y sale sabiendo si está abierto y cómo llegar.
FIRST VIEWPORT: la cápsula 3D al centro a ~80% del ancho; título abajo a la
  izquierda; estado abierto/cerrado arriba a la derecha; las ventanas son la acción.
FORM: brief fijado por el dueño (cápsula con ojos de buey), sin tirada.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md
*/

/**
 * cāpsula33 — demo privado del Estudio (sitio a medida para el café de San
 * Martín de los Andes). Solo en local: la ruta no existe en producción y las
 * fotos del local no viajan al repo (public/studio está en .gitignore).
 */

const ELEGIDOS = [
  { name: 'Mar de otoño', notes: 'sopa de maíz · puerro · crumble de queso' },
  { name: 'Tostón del bosque negro', notes: 'pan de masa madre · hummus · hongos grillados' },
  { name: 'Poke bowl de trucha', notes: 'trucha curada · arroz · palta · cebolla morada · quinoa' },
  { name: 'Spaghetti con ciervo ahumado', notes: 'salsa · parmesano · ciervo ahumado' },
]

const CAFE = ['Espresso', 'Flat white', 'Capuccino', 'Latte', 'Chocolate', 'Té en hebras']
const PASTELERIA = ['Medialuna', 'Croissant', 'Alfajor', 'Cookies']

const COLECCION = [
  { src: '/studio/capsula33/porthole-wall-800.webp', label: 'La pared de ojos de buey' },
  { src: '/studio/capsula33/droids-1600.webp', label: 'Un clásico del 77' },
  { src: '/studio/capsula33/entrance-800.webp', label: 'La entrada' },
  { src: '/studio/capsula33/ring-lights-800.webp', label: 'El salón' },
]

const DAY_NAMES = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' }
const MAPS = 'https://www.google.com/maps/search/?api=1&query=Gral.+Roca+1120,+San+Mart%C3%ADn+de+los+Andes'

function Pill({ src, alt, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-full border-[6px] ${className}`} style={{ borderColor: C.cream, background: C.ink }}>
      <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  )
}

export default function Capsula33Page() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'cāpsula33 — café, cine y algo más · San Martín de los Andes'
    return () => {
      link.remove()
      document.title = prevTitle
    }
  }, [])

  return (
    <SmoothScrollProvider>
      <div className="min-h-svh" style={{ background: C.void, color: C.cream, ...BODY }}>
        <Hero />

        {/* La pared del local, palabra por palabra. */}
        <section id="experiencia" className="px-6 py-28 md:px-10 md:py-40">
          <div className="mx-auto max-w-[62rem]">
            <p className="text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.18] font-medium" style={DISPLAY}>
              El ser humano es la única fuerza en el universo que habita las historias que cuenta sobre sí mismo. Este
              espacio es una cápsula de preservación de nuestra especie: un lugar para reunirnos.
            </p>
            <p className="mt-10 text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.18] font-medium" style={{ ...DISPLAY, color: C.orange }}>
              No somos lo que razonamos, somos lo que imaginamos.
            </p>
            <p className="mt-8 text-[13px] tracking-[0.12em] opacity-60" style={MONO}>
              — la pared de cāpsula33
            </p>
          </div>
        </section>

        {/* Elegidos: el menú como el tablero de partidas de la barra. */}
        <section id="menu" className="px-6 py-24 md:px-10 md:py-32" style={{ background: C.ink }}>
          <div className="mx-auto grid max-w-[76rem] gap-14 md:grid-cols-12">
            <h2 className="text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.01em] uppercase md:col-span-5" style={DISPLAY}>
              Elegidos
            </h2>
            <ol className="md:col-span-7">
              {ELEGIDOS.map((d, i) => (
                <li key={d.name} className="grid grid-cols-[3rem_1fr] gap-4 border-t py-6" style={{ borderColor: 'rgba(242,233,220,0.15)' }}>
                  <span className="pt-1 text-[13px] opacity-50" style={MONO}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block text-[22px] font-semibold tracking-[0.02em] uppercase md:text-[26px]" style={DISPLAY}>
                      {d.name}
                    </span>
                    <span className="mt-1 block text-[15px] opacity-70">{d.notes}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="grid gap-10 sm:grid-cols-2 md:col-span-7 md:col-start-6">
              {[
                ['Café', CAFE],
                ['Pastelería', PASTELERIA],
              ].map(([title, items]) => (
                <div key={title}>
                  <h3 className="mb-4 text-[13px] tracking-[0.18em] uppercase" style={{ ...DISPLAY, color: C.orange }}>
                    {title}
                  </h3>
                  <ul className="grid gap-2 text-[17px]" style={MONO}>
                    {items.map((it) => (
                      <li key={it} className="uppercase">
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[14px] opacity-60 sm:col-span-2">Los precios, en la pantalla de la barra.</p>
            </div>
          </div>
        </section>

        {/* La colección, en ventanas como las del local. */}
        <section id="coleccion" className="px-6 py-24 md:px-10 md:py-32">
          <div className="mx-auto max-w-[76rem]">
            <h2 className="max-w-[18ch] text-[clamp(2.2rem,5vw,4.5rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
              Cine en vitrinas
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-[1.55] opacity-75">
              Las figuras de la colección del dueño viven en los ojos de buey del salón. Algunas, a la altura de los más chicos.
            </p>
            <div className="mt-14 grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
              {COLECCION.map((p, i) => (
                <figure key={p.src} className={i % 2 ? 'md:mt-16' : ''}>
                  <Pill src={p.src} alt={p.label} className="aspect-[1/1.9]" />
                  <figcaption className="mt-3 text-center text-[12px] tracking-[0.14em] uppercase opacity-70" style={DISPLAY}>
                    {p.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Base 7-Lagos: el mapa que reparten en la barra. */}
        <section id="mapa" className="px-6 py-24 md:px-10 md:py-32" style={{ background: C.blueprint, color: C.paper }}>
          <div className="mx-auto grid max-w-[76rem] items-center gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="text-[clamp(2.4rem,5.5vw,5rem)] leading-[0.9] font-semibold uppercase" style={DISPLAY}>
                Base 7-Lagos
              </h2>
              <p className="mt-6 max-w-[40ch] text-[16px] leading-[1.55]">
                Sector SMA, domo 1: puerto de partida de la ruta de los Siete Lagos. Pasá a buscar el mapa impreso en la barra antes de salir.
              </p>
              <a
                href={MAPS}
                target="_blank"
                rel="noopener noreferrer"
                className="tpl-hit relative mt-8 inline-flex items-center gap-3 rounded-full px-6 py-3 text-[13px] font-semibold tracking-[0.14em] uppercase"
                style={{ ...DISPLAY, background: C.orange, color: C.void }}
              >
                Cómo llegar
              </a>
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <Pill src="/studio/capsula33/map-7lagos-1600.webp" alt="El mapa Base 7-Lagos de cāpsula33" className="aspect-[1/1.45] rounded-[3rem]" />
            </div>
          </div>
        </section>

        {/* Visitanos. */}
        <footer id="visita" className="px-6 pt-24 pb-10 md:px-10 md:pt-32">
          <div className="mx-auto grid max-w-[76rem] gap-12 md:grid-cols-12">
            <h2 className="text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.9] font-semibold uppercase md:col-span-6" style={DISPLAY}>
              Visitanos
            </h2>
            <div className="grid gap-8 text-[16px] sm:grid-cols-2 md:col-span-6">
              <div>
                <h3 className="mb-3 text-[13px] tracking-[0.18em] uppercase" style={{ ...DISPLAY, color: C.orange }}>
                  Dónde
                </h3>
                <p>Av. Gral. Roca 1120</p>
                <p>San Martín de los Andes, Neuquén</p>
                <a href={MAPS} target="_blank" rel="noopener noreferrer" className="tpl-link tpl-hit relative mt-2 inline-block" style={{ color: C.orange }}>
                  Abrir en Maps
                </a>
              </div>
              <div>
                <h3 className="mb-3 text-[13px] tracking-[0.18em] uppercase" style={{ ...DISPLAY, color: C.orange }}>
                  Cuándo
                </h3>
                <ul style={MONO} className="text-[14px]">
                  {HOURS.map((h) => (
                    <li key={h.day}>
                      {DAY_NAMES[h.day]} · {h.open}:00–{h.close}:00
                    </li>
                  ))}
                  <li className="opacity-60">Domingo · cerrado</li>
                </ul>
              </div>
              <div className="sm:col-span-2">
                <a href="https://www.instagram.com/capsulas33/" target="_blank" rel="noopener noreferrer" className="tpl-link tpl-hit relative text-[18px]" style={MONO}>
                  @capsulas33
                </a>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-24 max-w-[76rem] text-[clamp(4rem,19vw,16rem)] leading-[0.8] font-light" style={{ ...MONO, color: C.orange }}>
            cāpsula33
          </p>
        </footer>
      </div>
    </SmoothScrollProvider>
  )
}

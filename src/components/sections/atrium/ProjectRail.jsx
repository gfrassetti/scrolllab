import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { mixHex } from '../../../lib/themeVars'
import { civic, tower, courtyard, gallery, heroHouse, interior, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultWorks = [
  {
    title: 'Lakeside Civic Centre',
    meta: '4,800 m²',
    body: 'A council hall and library set into the shoreline, its roof folded to read as part of the landscape from across the water.',
    img: civic,
    href: '#contact',
    color: '#6b7280',
  },
  {
    title: 'Hofmatt Tower',
    meta: '12,600 m²',
    body: 'Twelve storeys of mixed-use space wrapped in terracotta fins that shade the glazing and soften the tower against the sky.',
    img: tower,
    href: '#contact',
    color: '#52606d',
  },
  {
    title: 'Olive Courtyard House',
    meta: '420 m²',
    body: 'A single-storey house turned inward around an old olive tree, its rooms reached from a covered cloister.',
    img: courtyard,
    href: '#contact',
    color: '#8a7a5c',
  },
  {
    title: 'Kunsthalle Annex',
    meta: '2,100 m²',
    body: 'A top-lit annex for travelling exhibitions, its concrete shell left bare so the art is the only colour in the room.',
    img: gallery,
    href: '#contact',
    color: '#9ca3af',
  },
  {
    title: 'House in the Pines',
    meta: '380 m²',
    body: 'A house raised on a plinth among existing pines, every principal room looking out through full-height glass.',
    img: heroHouse,
    href: '#contact',
    color: '#4b5a48',
  },
  {
    title: 'Alpine Apartment',
    meta: '160 m²',
    body: 'A ski-town apartment reworked in oak and local stone, with a sunken living room set a half-level below the entrance.',
    img: interior,
    href: '#contact',
    color: '#5b6b78',
  },
]

const COLLAPSED = '4.5rem'

/** El degradé de una columna sin foto: oscuro → el color → claro. */
function columnTone(color) {
  return {
    backgroundImage: `linear-gradient(to bottom right, ${mixHex(color, '#000000', 0.55)}, ${color}, ${mixHex(color, '#ffffff', 0.65)})`,
  }
}

/**
 * ProjectRail — los proyectos como acordeón vertical. Escritorio: una fila de
 * columnas angostas con número y título vertical; la abierta se ensancha a una
 * foto entera con título, texto y enlace (clic en cualquier columna). Teléfono:
 * filas apiladas que se abren hacia abajo.
 */
export default function ProjectRail({
  kicker = '(6)',
  title = 'Selected Projects',
  works: worksProp,
  linkLabel = 'Learn more',
  bg,
  fg,
}) {
  const works =
    Array.isArray(worksProp) && worksProp.length
      ? worksProp.map((w, i) => ({ ...defaultWorks[i % defaultWorks.length], ...w }))
      : defaultWorks
  const items = works.slice(0, 8)
  const root = useRef(null)
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(0)
  const cols = items.map((_, i) => (i === open ? 'minmax(0,1fr)' : COLLAPSED)).join(' ')

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-work-head], [data-work-col], [data-work-row]', { y: 16, stagger: 0.08 })

      gsap.from('[data-work-head]', {
        yPercent: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
      })

      gsap.from('[data-work-col], [data-work-row]', {
        autoAlpha: 0,
        y: 50,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '[data-work-list]', start: 'top 85%', once: true },
      })
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="work"
      className="bg-atrium-paper px-5 pt-[8svh] pb-[16svh] text-atrium-ink md:px-10 md:pb-[20svh]"
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--color-atrium-paper': bg || undefined,
        '--atrium-paper': bg || undefined,
        '--color-atrium-ink': fg || undefined,
        '--atrium-ink': fg || undefined,
      }}
    >
      <h2 data-work-head className="atrium-mid mb-[8svh] flex items-start gap-3">
        <span>{title}</span>
        {kicker ? (
          <span className="atrium-note font-display text-atrium-ink/65">{kicker}</span>
        ) : null}
      </h2>

      {/* Escritorio (lg): columnas que se abren de costado (clic). */}
      <div
        data-work-list
        className="hidden h-[min(72svh,43rem)] min-h-[28rem] border-y border-atrium-ink/30 transition-[grid-template-columns] duration-[500ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none lg:grid"
        style={{ gridTemplateColumns: cols }}
      >
        {items.map((work, i) => {
          const on = i === open
          return (
            <div
              key={`${work.title}-${i}`}
              data-work-col
              className={`group/col relative min-w-0 overflow-clip border-l border-atrium-ink/30 last:border-r ${
                on ? '' : 'cursor-pointer transition-colors duration-300 hover:bg-atrium-ink/5'
              }`}
            >
              {/* Cerrada: número, título vertical. */}
              <button
                type="button"
                onClick={() => setOpen(i)}
                onMouseDown={(e) => e.preventDefault()}
                aria-expanded={on}
                aria-label={work.title}
                inert={on}
                tabIndex={on ? -1 : 0}
                className={`absolute inset-0 flex flex-col items-center py-3 transition-opacity duration-300 ${
                  on ? 'pointer-events-none opacity-0' : 'opacity-100 delay-150'
                }`}
              >
                <span className="font-display text-5xl leading-[1.3] font-semibold tracking-[-0.04em] tabular-nums text-atrium-ink/50" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="flex flex-1 rotate-180 items-center text-xl font-semibold tracking-[-0.02em] whitespace-nowrap [writing-mode:vertical-rl]"
                  aria-hidden="true"
                >
                  {work.title}
                </span>
                <span className="atrium-note text-atrium-ink/50" aria-hidden="true">
                  {work.meta}
                </span>
              </button>

              {/* Abierta: foto arriba, título, texto, enlace. Ancho fijo: al abrir se desliza. */}
              <article
                inert={!on}
                className={`absolute inset-y-0 left-0 flex w-full min-w-[30rem] flex-col p-5 pb-4 transition-opacity duration-300 ${
                  on ? 'opacity-100 delay-200' : 'pointer-events-none opacity-0'
                }`}
              >
                <a
                  href={work.href || '#contact'}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="group/img relative block min-h-0 flex-1 overflow-hidden"
                  style={columnTone(work.color || '#6b7280')}
                >
                  {work.img && (
                    <img
                      {...imgAttrs(work.img, variants)}
                      sizes="(min-width: 1024px) 60vw, 55vw"
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/img:scale-110"
                    />
                  )}
                </a>
                <div className="shrink-0 pt-6">
                  <div className="flex items-baseline justify-between gap-6">
                    <h3 className="text-2xl leading-none font-semibold tracking-[-0.02em]">{work.title}</h3>
                    <span className="font-display text-atrium-ink/65">{work.meta}</span>
                  </div>
                  <p className="mt-3 mb-3 max-w-[38rem] text-base leading-snug text-atrium-ink/75">{work.body}</p>
                  <a href={work.href || '#contact'} className="tpl-link tpl-hit relative inline-block text-base font-medium">
                    {linkLabel}
                  </a>
                </div>
              </article>
            </div>
          )
        })}
      </div>

      {/* Teléfono y tablet: filas que se abren hacia abajo. */}
      <ul data-work-list className="border-t border-atrium-ink/20 lg:hidden">
        {items.map((work, i) => {
          const on = i === open
          return (
            <li key={`${work.title}-m-${i}`} data-work-row className="border-b border-atrium-ink/20">
              <button
                type="button"
                onClick={() => setOpen(on ? -1 : i)}
                aria-expanded={on}
                className="tpl-hit flex w-full items-center gap-4 py-5 text-left"
              >
                <span className="w-9 text-sm font-medium tabular-nums text-atrium-ink/60">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-2xl font-medium tracking-[-0.03em]">{work.title}</span>
                <span
                  aria-hidden="true"
                  className={`text-2xl leading-none font-light transition-transform duration-300 ${on ? 'rotate-45' : ''}`}
                >
                  +
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none ${
                  on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden" inert={!on}>
                  <div className="pb-6">
                    <div className="aspect-[4/3] overflow-hidden" style={columnTone(work.color || '#6b7280')}>
                      {work.img && (
                        <img
                          {...imgAttrs(work.img, variants)}
                          sizes="100vw"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-4 text-xs font-medium text-atrium-ink/60">{work.meta}</p>
                    <p className="mt-2 text-base leading-snug text-atrium-ink/85">{work.body}</p>
                    <a
                      href={work.href || '#contact'}
                      className="tpl-hit mt-5 inline-flex min-h-11 items-center gap-3 rounded-full border border-atrium-ink px-5 py-2.5 text-sm font-medium"
                    >
                      {linkLabel}
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

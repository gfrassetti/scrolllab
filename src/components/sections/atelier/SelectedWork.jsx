import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { hero1, projCoast, projTownhouse, projHillside, projMill, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'
import { cardTone } from './tone'

const defaultProjects = [
  {
    title: 'Pine House',
    tag: 'New build · Surrey · 2025',
    body: 'A family house in pale brick and oak under a standing-seam roof, set back among the existing pines. Every principal room looks into the trees.',
    img: hero1,
    href: '#studio',
    color: '#3d4a3a',
  },
  {
    title: 'Dune House',
    tag: 'New build · Norfolk · 2024',
    body: 'Cedar and zinc on a low coastal plot. The plan turns its back to the wind and opens a single long room to the sea.',
    img: projCoast,
    href: '#studio',
    color: '#4a5a60',
  },
  {
    title: 'Fig Tree Extension',
    tag: 'Extension · London · 2024',
    body: 'A white-brick rear extension to a Georgian terrace, with black steel windows and a walled garden built around a mature fig.',
    img: projTownhouse,
    href: '#studio',
    color: '#6a6458',
  },
  {
    title: 'Terrace House',
    tag: 'New build · Cotswolds · 2023',
    body: 'Pale stone and timber on a sloping lawn, with a long cantilevered terrace held out over the valley.',
    img: projHillside,
    href: '#studio',
    color: '#7a6a4c',
  },
  {
    title: 'Mill Cottage',
    tag: 'Conversion · Derbyshire · 2023',
    body: 'A stone mill cottage kept whole, with one new glass room tucked into the yard and lit from inside at dusk.',
    img: projMill,
    href: '#studio',
    color: '#2f3c4c',
  },
]

const COLLAPSED = '4.5rem'

/**
 * SelectedWork — the projects as a vertical accordion on ink. Desktop: a row of
 * narrow columns, each with a "+", a vertical title and its number; the open one
 * widens to a full photograph with the title, a paragraph and a link (hover or
 * click any column). Phone: stacked rows that open downwards.
 */
export default function SelectedWork({
  eyebrow = 'Projects',
  title = 'Selected work',
  projects = defaultProjects,
  linkLabel = 'Learn more',
  ctaLabel = 'Start a project',
  ctaHref = '#contact',
  bg,
  fg,
}) {
  const root = useRef(null)
  const items = (Array.isArray(projects) && projects.length ? projects : defaultProjects).slice(0, 8)
  const [open, setOpen] = useState(0)
  const cols = items.map((_, i) => (i === open ? 'minmax(0,1fr)' : COLLAPSED)).join(' ')

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-work-head], [data-work-list]', { y: 14, duration: 0.8 })
      gsap.from('[data-work-head] > *', {
        autoAlpha: 0,
        y: 30,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-work-head]', start: 'top 85%' },
      })
      gsap.from('[data-work-col]', {
        autoAlpha: 0,
        y: 60,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '[data-work-list]', start: 'top 85%' },
      })
      return undefined
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="projects"
      data-tone="dark"
      className="px-5 pt-24 pb-24 md:px-8 md:pt-32 md:pb-32"
      style={{
        backgroundColor: bg || '#111111',
        color: fg || '#ffffff',
        '--wk-bg': bg || '#111111',
        '--wk-fg': fg || '#ffffff',
      }}
    >
      <div className="mx-auto max-w-[1700px]">
        <header data-work-head className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-20">
          <div>
            <p className="mb-5 text-sm font-medium opacity-60">{eyebrow}</p>
            <h2 className="text-[clamp(2.6rem,8vw,7.5rem)] leading-[0.92] font-medium tracking-[-0.05em]">{title}</h2>
          </div>
          <a
            href={ctaHref}
            className="tpl-hit rounded-full border border-current px-6 py-3 text-sm font-medium transition-[background-color,color] duration-300 hover:bg-white hover:text-black"
          >
            {ctaLabel}
          </a>
        </header>

        {/* Desktop (lg): columnas que se abren de costado (clic); al pasar el mouse la cerrada se invierte */}
        <div
          data-work-list
          className="hidden h-[min(72svh,43rem)] min-h-[30rem] border-y border-current/30 transition-[grid-template-columns] duration-[500ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none lg:grid"
          style={{ gridTemplateColumns: cols }}
        >
          {items.map((p, i) => {
            const on = i === open
            return (
              <div
                key={`${p.title}-${i}`}
                data-work-col
                className={`group/col relative min-w-0 overflow-clip border-l border-current/30 last:border-r ${
                  on
                    ? ''
                    : 'cursor-pointer transition-[background-color,color] duration-300 hover:bg-[var(--wk-fg)] hover:text-[var(--wk-bg)]'
                }`}
              >
                {/* Cerrada: el +, el título vertical y el número */}
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-expanded={on}
                  aria-label={p.title}
                  inert={on}
                  tabIndex={on ? -1 : 0}
                  className={`absolute inset-0 flex flex-col items-center py-3 transition-opacity duration-300 ${
                    on ? 'pointer-events-none opacity-0' : 'opacity-100 delay-150'
                  }`}
                >
                  <span className="text-5xl leading-none font-light opacity-50" aria-hidden="true">
                    +
                  </span>
                  <span
                    className="flex flex-1 rotate-180 items-center text-xl font-semibold tracking-[-0.02em] whitespace-nowrap [writing-mode:vertical-rl]"
                    aria-hidden="true"
                  >
                    {p.title}
                  </span>
                  <span className="text-5xl leading-[1.3] font-semibold tracking-[-0.04em] tabular-nums opacity-50" aria-hidden="true">
                    {i + 1}
                  </span>
                </button>

                {/* Abierta: foto arriba (con zoom al pasar el mouse), título, texto, enlace y número. Ancho fijo: al abrir se desliza, no se reacomoda. */}
                <article
                  inert={!on}
                  className={`absolute inset-y-0 left-0 flex w-full min-w-[30rem] flex-col p-5 pb-3 transition-opacity duration-300 ${
                    on ? 'opacity-100 delay-200' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <a
                    href={p.href || '#studio'}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="group/img relative block min-h-0 flex-1 overflow-hidden"
                    style={cardTone(p.color || '#3d4a3a')}
                  >
                    {p.img && (
                      <img
                        {...imgAttrs(p.img, variants)}
                        sizes="(min-width: 1024px) 60vw, 55vw"
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/img:scale-110"
                      />
                    )}
                  </a>
                  <div className="shrink-0 pt-6">
                    <h3 className="mb-3 text-2xl leading-none font-semibold tracking-[-0.02em]">{p.title}</h3>
                    <p className="mb-3 max-w-[38rem] text-base leading-snug opacity-75">{p.body}</p>
                    <a href={p.href || '#studio'} className="tpl-link tpl-hit relative inline-block text-base font-medium">
                      {linkLabel}
                    </a>
                  </div>
                  <span className="shrink-0 text-5xl leading-[1.3] font-semibold tracking-[-0.04em] tabular-nums opacity-50">
                    {i + 1}
                  </span>
                </article>
              </div>
            )
          })}
        </div>

        {/* Teléfono y tablet: filas que se abren hacia abajo */}
        <ul className="border-t border-current/20 lg:hidden">
          {items.map((p, i) => {
            const on = i === open
            return (
              <li key={`${p.title}-m-${i}`} className="border-b border-current/20">
                <button
                  type="button"
                  onClick={() => setOpen(on ? -1 : i)}
                  aria-expanded={on}
                  className="tpl-hit flex w-full items-center gap-4 py-5 text-left"
                >
                  <span className="w-8 text-sm font-medium tabular-nums opacity-60">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-2xl font-medium tracking-[-0.03em]">{p.title}</span>
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
                      <div className="aspect-[4/3] overflow-hidden" style={cardTone(p.color || '#3d4a3a')}>
                        {p.img && (
                          <img
                            {...imgAttrs(p.img, variants)}
                            sizes="100vw"
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <p className="mt-4 text-xs font-medium opacity-60">{p.tag}</p>
                      <p className="mt-2 text-base leading-snug opacity-85">{p.body}</p>
                      <a
                        href={p.href || '#studio'}
                        className="tpl-hit mt-5 inline-flex min-h-11 items-center gap-3 rounded-full border border-current px-5 py-2.5 text-sm font-medium"
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
      </div>
    </section>
  )
}

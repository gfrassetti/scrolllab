import { useRef, useState } from 'react'
import { LABEL } from './brand'
import { PROJECTS } from './projects'
import { useReveal } from './reveal'
import { rows, sectionVars } from './vars'
import { WALL } from './wallImages'
import './ordo.css'

/**
 * Clients — who the studio works for, as an accordion with one large photograph that changes with the open row.
 *
 * The rows are buttons: one open at a time (a click, the keyboard, or the mouse resting on a row). The photograph of
 * the open row opens upwards over the last one from its lower edge while it settles from a slight zoom. On a phone the
 * photograph sits inside the open row instead of beside the list. Every text and photo is a prop; the defaults are the
 * demo copy. With «reduce motion» the change is instant.
 */

const [muralha, mare, linho] = [PROJECTS[1], PROJECTS[2], PROJECTS[0]]
const pic = (p) => ({ image: p.photos.hero.src, imageSmall: p.photos.hero.small, alt: p.photos.hero.alt })

const CLIENTS = [
  { name: 'Private homes', text: 'Houses and flats for people who will live in them for decades: restorations in the old city, new houses in the countryside.', tags: 'Restoration · New build · Interiors', ...pic(muralha) },
  { name: 'Restaurants & hotels', text: 'Rooms that are busy every night and still have to feel calm, from a twelve-seat counter to a small country hotel.', tags: 'Hospitality · Furniture · Lighting', ...pic(mare) },
  { name: 'Shops & brands', text: 'Places where a product is sold and a brand is met for the first time: layout, fittings and identity as one piece of work.', tags: 'Retail · Identity · Joinery', ...pic(linho) },
  { name: 'Cultural & public', text: 'Small museums, studios and civic rooms with modest budgets and long lives.', tags: 'Culture · Public · Refurbishment', image: WALL[2].image, imageSmall: WALL[2].imageSmall, alt: WALL[2].alt },
]

export default function Clients({ title = 'Who we work for', label, items, bg, fg, accent, calm }) {
  const ref = useRef(null)
  useReveal(ref, calm)
  const list = rows(items, CLIENTS)
  const [open, setOpen] = useState(0)
  // The photograph that was opened last goes on top: each row remembers when it was opened.
  const stamps = useRef({ 0: 1 })
  const counter = useRef(1)
  const show = (i) => {
    if (i === open) return
    counter.current += 1
    stamps.current[i] = counter.current
    setOpen(i)
  }
  const at = Math.min(open, Math.max(0, list.length - 1))

  return (
    <section
      ref={ref}
      id="clients"
      data-od-section
      aria-labelledby="clients-title"
      className={`od-root od-sec od-cl${calm ? ' od-cl--calm' : ''}`}
      style={sectionVars({ bg, fg, accent })}
    >
      <header className="od-sec__head">
        <h2 id="clients-title" className="od-sec__title">
          {title}
        </h2>
        <span className="od-sec__label" style={LABEL}>
          {label ?? `${String(list.length).padStart(2, '0')} kinds of client`}
        </span>
      </header>
      <div className="od-cl__body" data-group>
        <ul className="od-cl__list" data-up>
          {list.map((c, i) => {
            const on = i === at
            return (
              <li key={i} className="od-cl__item" data-on={on ? 'true' : undefined}>
                <h3 className="od-cl__h">
                  <button
                    type="button"
                    className="od-cl__btn"
                    aria-expanded={on}
                    aria-controls={`od-cl-panel-${i}`}
                    onClick={() => show(i)}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && show(i)}
                  >
                    <span className="od-cl__n" style={LABEL}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="od-cl__name">{c.name}</span>
                    <span className="od-cl__plus" aria-hidden="true" />
                  </button>
                </h3>
                <div id={`od-cl-panel-${i}`} className="od-cl__panel" role="region" aria-label={c.name}>
                  <div className="od-cl__inner">
                    <p className="od-cl__text">{c.text}</p>
                    <span className="od-cl__tags" style={LABEL}>
                      {c.tags}
                    </span>
                    {c.image && (
                      <img className="od-cl__pic" src={c.image} srcSet={c.imageSmall ? `${c.imageSmall} 900w, ${c.image} 1800w` : undefined} sizes="92vw" alt={c.alt || ''} loading="lazy" decoding="async" />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="od-cl__stage" data-up>
          {list.map((c, i) =>
            c.image ? (
              <img
                key={`${i}-${stamps.current[i] ?? 0}`}
                className="od-cl__img"
                data-on={i === at ? 'true' : undefined}
                data-seen={stamps.current[i] ? 'true' : undefined}
                style={{ zIndex: stamps.current[i] ?? 0 }}
                src={c.image}
                srcSet={c.imageSmall ? `${c.imageSmall} 900w, ${c.image} 1800w` : undefined}
                sizes="(min-width: 1024px) 46vw, 0px"
                alt=""
                aria-hidden="true"
                loading={i === 0 ? undefined : 'lazy'}
                decoding="async"
              />
            ) : null,
          )}
        </div>
      </div>
    </section>
  )
}

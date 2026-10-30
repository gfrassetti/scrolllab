import { useRef } from 'react'
import { LABEL } from './brand'
import { useReveal } from './reveal'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Services — the disciplines, as ruled rows. Each row carries a small rust slab (the one on the logo) that slides in
 * on hover and pushes the name along, the way a drawing sheet is marked when you point at it (`showSlab`).
 * Every text is a prop; the defaults are the demo copy.
 */

const SERVICES = [
  { name: 'Architecture', text: 'New houses, restorations and small public buildings, from the first sketch to the last site visit.', tags: 'Concept · Permits · Site' },
  { name: 'Interior design', text: 'Shops, restaurants and homes designed whole: layout, finishes, lighting and furniture.', tags: 'Layout · Materials · Lighting' },
  { name: 'Creative direction', text: 'The identity of a place: name, signage, tableware, photography and how it feels on the first day.', tags: 'Identity · Art direction · Photography' },
  { name: 'Furniture & joinery', text: 'One-off pieces and fitted joinery drawn for the room they live in, built in local workshops.', tags: 'Design · Prototypes · Fabrication' },
]

export default function Services({ title = 'Services', label, services, showSlab = 'on', bg, fg, accent, calm }) {
  const ref = useRef(null)
  useReveal(ref, calm)
  const list = rows(services, SERVICES)
  const count = label ?? `${String(list.length).padStart(2, '0')} disciplines`
  return (
    <section ref={ref} id="services" data-od-section aria-labelledby="services-title" className="od-root od-sec od-svc" style={sectionVars({ bg, fg, accent })} data-slab={showSlab === 'off' ? 'off' : undefined}>
      <header className="od-sec__head">
        <h2 id="services-title" className="od-sec__title">
          {title}
        </h2>
        <span className="od-sec__label" style={LABEL}>
          {count}
        </span>
      </header>
      <ol className="od-svc__list" data-group>
        {list.map((s, i) => (
          <li key={i} className="od-svc__row" data-up>
            <span className="od-svc__n" style={LABEL}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="od-svc__name">
              <span className="od-svc__slab" aria-hidden="true" />
              {s.name}
            </h3>
            <p className="od-svc__text">{s.text}</p>
            <span className="od-svc__tags" style={LABEL}>
              {s.tags}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

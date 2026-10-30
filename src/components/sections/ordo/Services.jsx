import { useRef } from 'react'
import { LABEL } from './brand'
import { useReveal } from './reveal'

/**
 * Services — the four disciplines, as ruled rows. Each row carries a small rust slab (the one on the logo) that slides in
 * on hover and pushes the name along, the way a drawing sheet is marked when you point at it.
 */

const SERVICES = [
  ['Architecture', 'New houses, restorations and small public buildings, from the first sketch to the last site visit.', 'Concept · Permits · Site'],
  ['Interior design', 'Shops, restaurants and homes designed whole: layout, finishes, lighting and furniture.', 'Layout · Materials · Lighting'],
  ['Creative direction', 'The identity of a place: name, signage, tableware, photography and how it feels on the first day.', 'Identity · Art direction · Photography'],
  ['Furniture & joinery', 'One-off pieces and fitted joinery drawn for the room they live in, built in local workshops.', 'Design · Prototypes · Fabrication'],
]

export default function Services({ calm }) {
  const ref = useRef(null)
  useReveal(ref, calm)
  return (
    <section ref={ref} id="services" aria-labelledby="services-title" className="od-sec od-svc">
      <header className="od-sec__head">
        <h2 id="services-title" className="od-sec__title">
          Services
        </h2>
        <span className="od-sec__label" style={LABEL}>
          {String(SERVICES.length).padStart(2, '0')} disciplines
        </span>
      </header>
      <ol className="od-svc__list" data-group>
        {SERVICES.map(([name, text, tags], i) => (
          <li key={name} className="od-svc__row" data-up>
            <span className="od-svc__n" style={LABEL}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="od-svc__name">
              <span className="od-svc__slab" aria-hidden="true" />
              {name}
            </h3>
            <p className="od-svc__text">{text}</p>
            <span className="od-svc__tags" style={LABEL}>
              {tags}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

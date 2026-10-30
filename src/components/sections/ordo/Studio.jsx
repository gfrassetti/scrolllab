import { useRef } from 'react'
import { LABEL } from './brand'
import { useReveal } from './reveal'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Studio — who ORDO is: one sentence about how the studio works, three plain figures and three principles.
 * Everything is set on the same ruled sheet as the rest of the page; the figures are the loudest thing in it.
 * Every text is a prop (the builder edits them); the defaults are the demo copy.
 */

const LEAD =
  'ORDO designs buildings and the rooms inside them. We draw every project whole, structure, light and furniture, so that nothing in it is an afterthought.'

const FIGURES = [
  { value: '68', caption: 'Projects built' },
  { value: '14', caption: 'People in the studio' },
  { value: '2014', caption: 'Founded in Lisbon' },
]

const PRINCIPLES = [
  { title: 'Draw it whole', text: 'Architecture, interiors and furniture are one drawing, made by one team. The joint between the wall and the shelf is decided at the same table as the plan.' },
  { title: 'Choose less', text: 'Few materials, used honestly: lime, oak, stone, clay. We would rather repeat a good material than add a clever one.' },
  { title: 'Build it with the makers', text: 'Every project is made with carpenters, masons and ceramicists we know by name. The drawings leave room for what they know.' },
]

export default function Studio({
  title = 'Studio',
  label = 'Lisbon — Est. 2014',
  lead = LEAD,
  figures,
  principles,
  bg,
  fg,
  accent,
  calm,
}) {
  const ref = useRef(null)
  useReveal(ref, calm)
  const figureRows = rows(figures, FIGURES)
  const principleRows = rows(principles, PRINCIPLES)
  return (
    <section ref={ref} id="studio" data-od-section aria-labelledby="studio-title" className="od-root od-sec od-studio" style={sectionVars({ bg, fg, accent })}>
      <header className="od-sec__head">
        <h2 id="studio-title" className="od-sec__title">
          {title}
        </h2>
        <span className="od-sec__label" style={LABEL}>
          {label}
        </span>
      </header>

      <div data-group>
        <p data-sweep className="od-paint od-studio__lead">
          {lead}
        </p>
      </div>

      <dl className="od-studio__figures" data-group>
        {figureRows.map((f, i) => (
          <div key={i} className="od-studio__figure" data-up>
            <dt className="sr-only">{f.caption}</dt>
            <dd className="od-studio__num">{f.value}</dd>
            <span className="od-studio__cap" style={LABEL} aria-hidden="true">
              {f.caption}
            </span>
          </div>
        ))}
      </dl>

      <ol className="od-studio__principles" data-group>
        {principleRows.map((p, i) => (
          <li key={i} className="od-studio__principle" data-up>
            <span className="od-studio__n" style={LABEL}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="od-studio__h">{p.title}</h3>
            <p className="od-studio__p">{p.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

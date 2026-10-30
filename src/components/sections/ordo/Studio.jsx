import { useRef } from 'react'
import { LABEL } from './brand'
import { useReveal } from './reveal'

/**
 * Studio — who ORDO is: one sentence about how the studio works, three plain figures and three principles.
 * Everything is set on the same ruled sheet as the rest of the page; the figures are the loudest thing in it.
 */

const LEAD =
  'ORDO designs buildings and the rooms inside them. We draw every project whole, structure, light and furniture, so that nothing in it is an afterthought.'

const FIGURES = [
  ['68', 'Projects built'],
  ['14', 'People in the studio'],
  ['2014', 'Founded in Lisbon'],
]

const PRINCIPLES = [
  ['Draw it whole', 'Architecture, interiors and furniture are one drawing, made by one team. The joint between the wall and the shelf is decided at the same table as the plan.'],
  ['Choose less', 'Few materials, used honestly: lime, oak, stone, clay. We would rather repeat a good material than add a clever one.'],
  ['Build it with the makers', 'Every project is made with carpenters, masons and ceramicists we know by name. The drawings leave room for what they know.'],
]

export default function Studio({ calm }) {
  const ref = useRef(null)
  useReveal(ref, calm)
  return (
    <section ref={ref} id="studio" aria-labelledby="studio-title" className="od-sec od-studio">
      <header className="od-sec__head">
        <h2 id="studio-title" className="od-sec__title">
          Studio
        </h2>
        <span className="od-sec__label" style={LABEL}>
          Lisbon — Est. 2014
        </span>
      </header>

      <div data-group>
        <p data-sweep className="od-paint od-studio__lead">
          {LEAD}
        </p>
      </div>

      <dl className="od-studio__figures" data-group>
        {FIGURES.map(([n, label]) => (
          <div key={label} className="od-studio__figure" data-up>
            <dt className="sr-only">{label}</dt>
            <dd className="od-studio__num">{n}</dd>
            <span className="od-studio__cap" style={LABEL} aria-hidden="true">
              {label}
            </span>
          </div>
        ))}
      </dl>

      <ol className="od-studio__principles" data-group>
        {PRINCIPLES.map(([title, text], i) => (
          <li key={title} className="od-studio__principle" data-up>
            <span className="od-studio__n" style={LABEL}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="od-studio__h">{title}</h3>
            <p className="od-studio__p">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

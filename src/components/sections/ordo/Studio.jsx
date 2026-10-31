import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../../../lib/gsap'
import { LABEL } from './brand'
import { useReveal } from './reveal'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Studio — who ORDO is: one sentence about how the studio works, three plain figures and three principles.
 * Everything is set on the same ruled sheet as the rest of the page; the figures are the loudest thing in it.
 * Every text is a prop (the builder edits them); the defaults are the demo copy.
 */

// Words between asterisks are marked with a rust bar under them.
const LEAD =
  'ORDO designs *buildings* and *the rooms inside them*. We draw every project whole, structure, light and furniture, so that nothing in it is an afterthought.'

/** The sentence as words, each with its own «marked» flag (`*like this*`). */
function words(text) {
  const out = []
  String(text ?? '')
    .split(/(\*[^*]+\*)/)
    .forEach((part) => {
      const marked = /^\*[^*]+\*$/.test(part)
      const raw = marked ? part.slice(1, -1) : part
      raw
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w) => out.push({ w, marked }))
    })
  return out
}

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
  tag = 'The practice',
  dimLabel = '14.33 m — scale 1:50',
  lead = LEAD,
  showMarks = 'on',
  figures,
  principles,
  bg,
  fg,
  accent,
  calm,
}) {
  const ref = useRef(null)
  const leadRef = useRef(null)
  useReveal(ref, calm)
  const leadWords = words(lead)

  // The sentence is read with the scroll: each word goes from faint to full ink, one after the other.
  useLayoutEffect(() => {
    if (calm || !leadRef.current) return undefined
    const ctx = gsap.context(() => {
      const ws = leadRef.current.querySelectorAll('[data-w]')
      gsap.set(ws, { opacity: 0.14 })
      gsap.to(ws, {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: leadRef.current, start: 'top 82%', end: 'bottom 48%', scrub: 0.5 },
      })
    }, leadRef)
    return () => ctx.revert()
  }, [calm, lead])

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

      <div className={`od-studio__lede${showMarks === 'off' ? ' od-studio__lede--plain' : ''}`}>
        {showMarks !== 'off' && (
          <div className="od-studio__marks" data-group>
            <span className="od-tag od-crop" style={LABEL} data-up>
              {tag}
            </span>
            <span className="od-dim" style={LABEL} aria-hidden="true" data-up>
              <i />
              <span>{dimLabel}</span>
              <i />
            </span>
          </div>
        )}
        <p ref={leadRef} className="od-studio__lead">
          {leadWords.map((x, i) => (
            <span key={i} data-w className={x.marked ? 'od-w od-w--mark' : 'od-w'}>
              {x.w}{' '}
            </span>
          ))}
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

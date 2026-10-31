import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { LABEL } from './brand'
import { rows, sectionVars } from './vars'
import { WALL } from './wallImages'
import './ordo.css'

/**
 * Wall — the studio's photographs pinned up like plates on a wall: three columns (two on a phone) that drift at
 * different speeds with the scroll (GSAP, scrubbed), each photo opening upwards from its lower edge as it arrives and
 * moving a little inside its frame, with its number and one line below.
 *
 * Each photo goes to the column that is shortest at that moment, so the columns end level whatever the proportions.
 * Every text and photo is a prop; the defaults are twelve sample photographs. With «reduce motion» nothing drifts or
 * opens: the wall is simply there.
 */

const SPEEDS = [
  [5, -5],
  [-7, 7],
  [9, -9],
]

/** Spread the photos over `n` columns, each to the one that is shortest so far (`ratio` = height ÷ width). */
function spread(list, n) {
  const cols = Array.from({ length: n }, () => ({ h: 0, items: [] }))
  list.forEach((p, i) => {
    const c = cols.reduce((a, b) => (b.h < a.h ? b : a))
    c.items.push({ ...p, i })
    c.h += p.ratio > 0 ? p.ratio : 1.25
  })
  return cols.map((c) => c.items)
}

/** Three columns from tablet up, two on a phone. */
function useColumns() {
  const query = '(min-width: 768px)'
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(query).matches))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide ? 3 : 2
}

export default function Wall({ title = 'On the wall', label, plates, showCaptions = 'on', bg, fg, accent, calm }) {
  const ref = useRef(null)
  const list = rows(plates, WALL)
  const n = useColumns()
  const cols = spread(list, n)
  const total = String(list.length).padStart(2, '0')

  useLayoutEffect(() => {
    if (calm) return undefined
    const root = ref.current
    const ctx = gsap.context(() => {
      const body = root.querySelector('[data-wall-cols]')
      gsap.utils.toArray('[data-wall-col]').forEach((col, k) => {
        const [a, b] = SPEEDS[k % SPEEDS.length]
        gsap.fromTo(col, { yPercent: a }, { yPercent: b, ease: 'none', scrollTrigger: { trigger: body, start: 'top bottom', end: 'bottom top', scrub: 0.7 } })
      })
      gsap.utils.toArray('[data-wall-plate]').forEach((plate) => {
        const frame = plate.querySelector('[data-wall-frame]')
        const img = plate.querySelector('img')
        const note = plate.querySelector('figcaption')
        gsap.set(frame, { clipPath: 'inset(100% 0% 0% 0%)' })
        if (note) gsap.set(note, { autoAlpha: 0, y: 12 })
        ScrollTrigger.create({
          trigger: plate,
          start: 'top 90%',
          once: true,
          onEnter: () => {
            gsap.to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut' })
            if (note) gsap.to(note, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.5 })
          },
        })
        // The photo moves inside its frame a little more slowly than the frame itself.
        gsap.fromTo(img, { yPercent: -5, scale: 1.14 }, { yPercent: 5, scale: 1.14, ease: 'none', scrollTrigger: { trigger: plate, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })
      })
    }, root)
    return () => ctx.revert()
  }, [calm, n, list.length])

  return (
    <section ref={ref} id="wall" data-od-section aria-labelledby="wall-title" className="od-root od-wall" style={sectionVars({ bg, fg, accent })}>
      <header className="od-sec__head">
        <h2 id="wall-title" className="od-sec__title">
          {title}
        </h2>
        <span className="od-sec__label" style={LABEL}>
          {label ?? `${total} plates`}
        </span>
      </header>
      <div className="od-wall__cols" data-wall-cols data-n={n}>
        {cols.map((col, k) => (
          <div key={k} className="od-wall__col" data-wall-col>
            {col.map((p) => (
              <figure key={p.i} className="od-wall__plate" data-wall-plate>
                <div className="od-wall__frame" data-wall-frame style={{ aspectRatio: `1 / ${p.ratio > 0 ? p.ratio : 1.25}` }}>
                  {p.image && (
                    <img
                      src={p.image}
                      srcSet={p.imageSmall ? `${p.imageSmall} 560w, ${p.image} 1100w` : undefined}
                      sizes="(min-width: 1024px) 30vw, (min-width: 768px) 32vw, 48vw"
                      alt={p.alt || ''}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                {showCaptions !== 'off' && (
                  <figcaption style={LABEL}>
                    <span className="od-wall__n">{String(p.i + 1).padStart(2, '0')}</span>
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

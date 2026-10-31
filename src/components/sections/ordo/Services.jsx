import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { LABEL } from './brand'
import { Dim, Line, Note } from './draw'
import { circ, drawTimeline, hideDrawn, rect } from './drawing'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Services — the disciplines as drawing plates. Each service is a sheet with its name, its text and a figure that
 * draws itself (an elevation, a plan, an identity grid, a joint). The section is pinned: the sheets are stacked on one
 * stage and, with the scroll (GSAP, scrubbed), each new one slides up over the last while the ones below stay behind
 * it, a little higher and smaller each, like a pile of plates. The scroll snaps to each plate.
 *
 * The figures are four drawings in code (`FIGURES`); a fifth or sixth service reuses them in order. Without figures
 * (`showFigures` off) a plate is just text. The small rust slab on a plate's corner is the logo's (`showSlab`). With
 * «reduce motion» nothing is pinned: the plates are a plain list, one after the other, with the figures complete.
 * Every text is a prop; the defaults are the demo copy.
 */

const SERVICES = [
  { name: 'Architecture', text: 'New houses, restorations and small public buildings, from the first sketch to the last site visit.', tags: 'Concept · Permits · Site', fig: 'Fig. 01 — Elevation, 1:50' },
  { name: 'Interior design', text: 'Shops, restaurants and homes designed whole: layout, finishes, lighting and furniture.', tags: 'Layout · Materials · Lighting', fig: 'Fig. 02 — Plan, 1:20' },
  { name: 'Creative direction', text: 'The identity of a place: name, signage, tableware, photography and how it feels on the first day.', tags: 'Identity · Art direction · Photography', fig: 'Fig. 03 — Identity grid' },
  { name: 'Furniture & joinery', text: 'One-off pieces and fitted joinery drawn for the room they live in, built in local workshops.', tags: 'Design · Prototypes · Fabrication', fig: 'Fig. 04 — Joint detail, 1:5' },
]

/** Four drawings on a 400 × 300 sheet. Strokes are the ink; one line of each is rust. */
const FIGURES = [
  // Elevation of a house: ground, walls, pitched roof, door, windows, height dimension.
  () => (
    <>
      <Line d="M30 250H370" className="od-wall" />
      <Line d="M80 250V130H320V250" />
      <Line d="M60 130L200 50L340 130Z" className="od-rust" />
      <Line d={`${rect(180, 180, 40, 70)}M200 180V250`} className="od-thin" />
      <Line d={`${rect(110, 160, 44, 44)}M110 182h44M132 160v44`} className="od-thin" />
      <Line d={`${rect(246, 160, 44, 44)}M246 182h44M268 160v44`} className="od-thin" />
      <Dim d="M356 130V250M350 130h12M350 250h12" />
      <Note x="344" y="196" anchor="end">
        6.40
      </Note>
    </>
  ),
  // Plan of a room: walls, door swing, table with chairs, sofa, rug.
  () => (
    <>
      <Line d={rect(50, 40, 300, 210)} className="od-wall" />
      <Line d="M130 250V220M130 220A30 30 0 0 1 160 250" className="od-thin" />
      <Line d={circ(220, 140, 34)} className="od-rust" />
      <Line d={`${circ(220, 92, 9)}${circ(220, 188, 9)}${circ(172, 140, 9)}${circ(268, 140, 9)}`} className="od-thin" />
      <Line d={rect(70, 60, 110, 38)} className="od-thin" />
      <Dim d={rect(150, 90, 140, 100)} />
      <Line d="M50 272H350M50 266v12M350 266v12" className="od-thin" />
      <Note x="200" y="292" anchor="middle">
        4.20 m
      </Note>
    </>
  ),
  // Identity grid: a mark built on a square grid, a baseline and three swatches.
  () => (
    <>
      <Line d="M60 40H340M60 140H340M60 240H340M60 40V240M200 40V240M340 40V240" className="od-thin" />
      <Line d={circ(200, 140, 70)} className="od-rust" />
      <Line d="M130 140H270M200 70V210" className="od-thin" />
      <Line d={rect(130, 70, 140, 140)} />
      <Line d="M60 270H340" className="od-wall" />
      <Line d={`${rect(60, 282, 20, 14)}${rect(90, 282, 20, 14)}${rect(120, 282, 20, 14)}`} className="od-thin" />
    </>
  ),
  // A joint in section: a leg, a rail, the mortise and tenon with its callout.
  () => (
    <>
      <Line d={rect(60, 70, 280, 24)} />
      <Line d={rect(100, 94, 36, 150)} />
      <Line d={rect(264, 94, 36, 150)} />
      <Line d="M136 120H264M136 150H264" className="od-thin" />
      <Line d="M118 94V114M118 114h-18M118 114h18" className="od-thin" />
      <Line d={circ(118, 112, 22)} className="od-rust" />
      <Line d="M140 128L214 196H330" className="od-thin" />
      <Line d="M30 262H370" className="od-wall" />
    </>
  ),
]

function Plate({ service, index, figures, slab }) {
  const Fig = FIGURES[index % FIGURES.length]
  const n = String(index + 1).padStart(2, '0')
  return (
    <article className="od-svc__plate" data-plate>
      {slab && <span className="od-svc__slab" aria-hidden="true" />}
      <div className="od-svc__body">
        <span className="od-svc__n" style={LABEL}>
          {n}
        </span>
        <h3 className="od-svc__name">{service.name}</h3>
        <p className="od-svc__text">{service.text}</p>
        <span className="od-svc__tags" style={LABEL}>
          {service.tags}
        </span>
      </div>
      {figures && (
        <figure className="od-svc__fig" data-fig>
          <svg className="od-fig" viewBox="0 0 400 300" role="presentation" aria-hidden="true" focusable="false">
            <Fig />
          </svg>
          <figcaption style={LABEL}>{service.fig ?? `Fig. ${n}`}</figcaption>
        </figure>
      )}
    </article>
  )
}

export default function Services({ title = 'Services', label, services, showFigures = 'on', showSlab = 'on', bg, fg, accent, calm }) {
  const ref = useRef(null)
  const counterRef = useRef(null)
  const barRef = useRef(null)
  const list = rows(services, SERVICES)
  const count = list.length
  const figures = showFigures !== 'off'
  const pinned = !calm && count > 1

  useLayoutEffect(() => {
    if (!pinned) return undefined
    const root = ref.current
    const ctx = gsap.context(() => {
      const plates = gsap.utils.toArray('[data-plate]')
      const figs = plates.map((p) => p.querySelector('[data-fig] svg'))
      figs.forEach((f) => f && hideDrawn(f))
      plates.slice(1).forEach((p) => gsap.set(p, { yPercent: 108 }))

      const tl = gsap.timeline({ defaults: { ease: 'none' } })
      // How far each plate below peeks out above the one on top: the whole pile always fits in the strip above.
      const peek = Math.min(14, 42 / Math.max(1, count - 1))
      for (let i = 1; i < count; i += 1) {
        const at = i - 1 + 0.08
        const d = 0.84
        tl.to(plates[i], { yPercent: 0, ease: 'power2.inOut', duration: d }, at)
        // The plates below stay behind the new one, each a little higher and smaller than the one above it.
        for (let j = 0; j < i; j += 1) {
          tl.to(plates[j], { y: -(i - j) * peek, scale: 1 - (i - j) * 0.025, ease: 'power2.inOut', duration: d }, at)
        }
        if (figs[i]) tl.add(drawTimeline(figs[i]).duration(d * 0.9), at + d * 0.35)
      }

      // The first figure is drawn once as the section comes into view, before the pin starts.
      const intro = figs[0] ? drawTimeline(figs[0], { paused: true }).duration(1.5) : null
      const enter = ScrollTrigger.create({ trigger: root, start: 'top 72%', once: true, onEnter: () => intro?.play() })

      const last = count - 1
      const st = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: () => `+=${last * window.innerHeight * 0.9}`,
        pin: root.querySelector('[data-svc-stage]'),
        scrub: 0.6,
        animation: tl,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / last, duration: { min: 0.25, max: 0.7 }, delay: 0.05, ease: 'power2.inOut' },
        onUpdate: (self) => {
          const idx = Math.min(last, Math.max(0, Math.round(self.progress * last)))
          if (counterRef.current && counterRef.current.dataset.i !== String(idx)) {
            counterRef.current.dataset.i = String(idx)
            counterRef.current.textContent = String(idx + 1).padStart(2, '0')
          }
          // Only the plate on top can be reached with the keyboard or a click.
          plates.forEach((p, j) => p.toggleAttribute('inert', j !== idx))
          if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress.toFixed(4)})`
        },
      })
      plates.slice(1).forEach((p) => p.setAttribute('inert', ''))
      return () => {
        st.kill()
        enter.kill()
        intro?.kill()
      }
    }, root)
    return () => ctx.revert()
  }, [pinned, count, figures])

  const total = String(list.length).padStart(2, '0')
  return (
    <section
      ref={ref}
      id="services"
      data-od-section
      aria-labelledby="services-title"
      className={`od-root od-svc${pinned ? ' od-svc--pin' : ''}`}
      style={sectionVars({ bg, fg, accent })}
    >
      <div data-svc-stage className="od-svc__stage">
        <header className="od-sec__head od-svc__head">
          <h2 id="services-title" className="od-sec__title">
            {title}
          </h2>
          <span className="od-sec__label" style={LABEL}>
            {label ?? (pinned ? (
              <>
                <span ref={counterRef}>01</span> — {total}
              </>
            ) : (
              `${total} disciplines`
            ))}
          </span>
        </header>
        {pinned && <span ref={barRef} className="od-proj__bar" aria-hidden="true" />}
        <div className="od-svc__plates">
          {list.map((s, i) => (
            <Plate key={i} service={s} index={i} figures={figures} slab={showSlab !== 'off'} />
          ))}
        </div>
      </div>
    </section>
  )
}

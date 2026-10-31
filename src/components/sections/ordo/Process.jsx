import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { LABEL } from './brand'
import { Dim, Fill, Line, Note } from './draw'
import { circ, drawTimeline, hideDrawn, rect } from './drawing'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Process — how a project goes from the first conversation to the building, as a plan that draws itself.
 *
 * The section is pinned: one stage with the plan on one side and the steps on the other, and the scroll (GSAP,
 * scrubbed) walks through them. Each step adds a layer to the same plan — the lot, the survey of what is there, the
 * partitions, the drawings with furniture and axes, and finally the built thing with the rust slab and the title
 * block — while the step list lights the active one and its text swaps. The scroll snaps to each step.
 *
 * The plan has five layers. With a different number of steps they are shared out evenly (3 steps: the layers are
 * grouped; 6 steps: one of them has no layer of its own). With «reduce motion» nothing is pinned: the complete plan
 * and the steps as a list. Every text is a prop; the defaults are the demo copy.
 */

const STEPS = [
  { name: 'Brief', text: 'A conversation on site: who lives or works here, what the budget allows and what the plot says. It ends in a one-page brief that both sides sign.', meta: 'Weeks 1–2' },
  { name: 'Survey', text: 'Every wall, level and window measured by our own hands. We draw what is there before we draw what could be.', meta: 'Weeks 2–4' },
  { name: 'Concept', text: 'Three ideas on tracing paper, one chosen. Rooms, light and the way through them are decided here, in plan and in a card model.', meta: 'Weeks 4–8' },
  { name: 'Drawings', text: 'The whole project drawn to the last joint — structure, finishes, lighting and furniture — in one coordinated set.', meta: 'Weeks 8–16' },
  { name: 'Site', text: 'We are on site every week with the builders. A project is finished when the first dinner is cooked in it.', meta: 'Week 16 →' },
]

/** The five layers of the plan, in the order they are drawn. */
function Plan({ project, sheet }) {
  return (
    <svg className="od-proc__svg" viewBox="40 14 570 400" role="presentation" aria-hidden="true" focusable="false">
      <g data-layer="0">
        <Dim d="M60 30H590V360H60Z" />
        <Line d="M60 380H590M60 372v16M590 372v16" className="od-thin" />
        <Note x="325" y="397" anchor="middle">
          48.00 m
        </Note>
        <Line d={circ(566, 66, 16)} className="od-thin" />
        <Line d="M566 82V50M566 50l-5 9M566 50l5 9" className="od-thin" />
      </g>
      <g data-layer="1">
        <Line d={rect(140, 70, 360, 240)} />
        <Line d="M130 70h20M140 60v20M130 310h20M140 300v20M490 70h20M500 60v20M490 310h20M500 300v20" className="od-thin" />
      </g>
      <g data-layer="2">
        <Line d="M140 190H320M320 70V190M320 240V310M320 240H500" className="od-wall" />
        <Line d="M230 190V160M230 160A30 30 0 0 1 260 190" className="od-thin" />
        <Line d="M350 240A30 30 0 0 0 320 210M320 240H350" className="od-thin" />
      </g>
      <g data-layer="3">
        <Line d={circ(230, 120, 26)} className="od-thin" />
        <Line d={`${circ(230, 84, 7)}${circ(230, 156, 7)}${circ(194, 120, 7)}${circ(266, 120, 7)}`} className="od-thin" />
        <Line d={rect(380, 88, 100, 36)} className="od-thin" />
        <Line d={`${rect(370, 252, 110, 50)}M370 266h110`} className="od-thin" />
        <Line d={rect(150, 278, 150, 24)} className="od-thin" />
        <Dim d="M140 40V330M320 40V330M500 40V330" />
        <Line d={`${circ(140, 40, 10)}${circ(320, 40, 10)}${circ(500, 40, 10)}`} className="od-thin" />
        <Line d="M110 70V310M104 70h12M104 310h12" className="od-thin" />
      </g>
      <g data-layer="4">
        <Line d={rect(140, 70, 360, 240)} className="od-heavy" />
        <Fill d="M140 322H500L486 336H154Z" className="od-slab" />
        <Line d={`${rect(430, 340, 160, 36)}M430 358H590`} className="od-thin" />
        <Note x="440" y="353">
          {project}
        </Note>
        <Note x="440" y="371">
          {sheet}
        </Note>
      </g>
    </svg>
  )
}

export default function Process({
  title = 'Process',
  label,
  steps,
  planNote = 'Fig. 02 — Ground floor, 1:100',
  planProject = 'CASA MURALHA',
  planSheet = '1:100 · SHEET 05',
  showPlan = 'on',
  bg,
  fg,
  accent,
  calm,
}) {
  const sectionRef = useRef(null)
  const counterRef = useRef(null)
  const barRef = useRef(null)
  const list = rows(steps, STEPS)
  const count = list.length
  const plan = showPlan !== 'off'

  // The pin: the stage stays on screen while the scroll walks through the steps, and each step adds its layers.
  useLayoutEffect(() => {
    if (calm || count < 2) return undefined
    const root = sectionRef.current
    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray('[data-proc-step]')
      const items = gsap.utils.toArray('[data-proc-li]')
      const layers = gsap.utils.toArray('[data-layer]')
      // Layer k belongs to step round(k·(n−1)/(layers−1)): the layers are shared out evenly among the steps.
      const ownerOf = (k) => Math.round((k * (count - 1)) / Math.max(1, layers.length - 1))
      layers.forEach((g) => hideDrawn(g))
      blocks.slice(1).forEach((b) => gsap.set(b, { autoAlpha: 0, y: 22 }))
      items.slice(1).forEach((li) => gsap.set(li, { opacity: 0.3 }))

      const tl = gsap.timeline({ defaults: { ease: 'none' } })
      for (let s = 1; s < count; s += 1) {
        const at = s - 1 + 0.08
        const d = 0.84
        tl.to(blocks[s - 1], { autoAlpha: 0, y: -18, ease: 'power2.in', duration: d * 0.4 }, at)
          .fromTo(blocks[s], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: d * 0.55 }, at + d * 0.4)
          .to(items[s - 1], { opacity: 0.3, duration: d * 0.5 }, at)
          .to(items[s], { opacity: 1, duration: d * 0.5 }, at)
        const mine = layers.filter((_, k) => ownerOf(k) === s)
        mine.forEach((g, j) => tl.add(drawTimeline(g).duration((d * 1.1) / mine.length), at - 0.05 + (j * d) / mine.length))
      }

      // The layers of the first step are drawn once as the section comes into view, before the pin starts.
      const first = layers.filter((_, k) => ownerOf(k) === 0)
      const intro = gsap.timeline({ paused: true })
      first.forEach((g, j) => intro.add(drawTimeline(g).duration(1.5), j * 0.9))
      const enter = ScrollTrigger.create({ trigger: root, start: 'top 72%', once: true, onEnter: () => intro.play() })

      const last = count - 1
      const st = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: () => `+=${last * window.innerHeight * 0.9}`,
        pin: root.querySelector('[data-proc-stage]'),
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
          // Only the step on the stage can be reached; the layers it just added are drawn in rust, the rest in ink.
          blocks.forEach((b, j) => b.toggleAttribute('inert', j !== idx))
          layers.forEach((g, k) => g.classList.toggle('od-new', ownerOf(k) === idx && idx > 0))
          if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress.toFixed(4)})`
        },
      })
      blocks.slice(1).forEach((b) => b.setAttribute('inert', ''))
      return () => {
        st.kill()
        enter.kill()
        intro.kill()
      }
    }, root)
    return () => ctx.revert()
  }, [calm, count, plan])

  const total = String(count).padStart(2, '0')
  const pinned = !calm && count > 1
  return (
    <section
      ref={sectionRef}
      id="process"
      data-od-section
      aria-labelledby="process-title"
      className={`od-root od-proc${pinned ? ' od-proc--pin' : ''}${plan ? '' : ' od-proc--noplan'}`}
      style={sectionVars({ bg, fg, accent })}
    >
      <div data-proc-stage className="od-proc__stage">
        <header className="od-sec__head od-proc__head">
          <h2 id="process-title" className="od-sec__title">
            {title}
          </h2>
          <span className="od-sec__label" style={LABEL}>
            {label ?? (
              <>
                <span ref={counterRef}>01</span> — {total}
              </>
            )}
          </span>
        </header>
        {pinned && <span ref={barRef} className="od-proj__bar" aria-hidden="true" />}
        <div className="od-proc__body">
          <div className="od-proc__side">
            <ol className="od-proc__list">
              {list.map((s, i) => (
                <li key={i} className="od-proc__li" data-proc-li>
                  <span className="od-proc__n" style={LABEL}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="od-proc__ln">{s.name}</span>
                </li>
              ))}
            </ol>
            <div className="od-proc__steps">
              {list.map((s, i) => (
                <article key={i} className="od-proc__step" data-proc-step>
                  <h3 className="od-proc__sh">
                    <span style={LABEL}>{String(i + 1).padStart(2, '0')}</span> {s.name}
                  </h3>
                  <p className="od-proc__st">{s.text}</p>
                  {s.meta && (
                    <span className="od-proc__meta" style={LABEL}>
                      {s.meta}
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
          {plan && (
            <figure className="od-proc__plan">
              <Plan project={planProject} sheet={planSheet} />
              <figcaption style={LABEL}>{planNote}</figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  )
}

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { externalProps } from '../../../lib/contactLinks'
import { LABEL } from './brand'
import { PROJECTS } from './projects'
import { hrefOf, navigate } from './router'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Projects — the index of the studio's work: one row per project, a photo card and its fact sheet.
 *
 * In the full page (`routed`) each card is a link to the project page (`/projects/<slug>`, ProjectPage.jsx) through the
 * router. Placed in a composition there is no router: each card goes to the `href` of its row (a section of the page,
 * a page of the buyer's own, or nothing).
 *
 * The sheet of the hero turns back into a sketch as it leaves (Sketch.jsx) and this section follows it. The section is
 * pinned: one stage with every project stacked on the same layout, and the scroll (GSAP, scrubbed) changes the project
 * on it. The next photo opens upwards from its lower edge while it settles from a slight zoom; the fact sheet of the
 * one leaving sinks and fades, and the next one rises into its place. The scroll snaps to each project, so the stage
 * always rests on one complete project.
 *
 * Every text, photo, link and colour is a prop; the defaults are the demo projects. With «reduce motion» nothing is
 * pinned: the projects are a plain list, one row after the other.
 */

/** The demo projects as rows of this section. */
const DEMO_ROWS = PROJECTS.map((p) => ({
  name: p.name,
  kind: p.kind,
  place: p.place,
  year: p.year,
  area: p.area,
  image: p.photos.cover.src,
  imageSmall: p.photos.cover.small,
  alt: p.photos.cover.alt,
  // Placed in a composition (no router) the card goes to the contact section until the buyer points it elsewhere.
  href: '#contact',
  slug: p.slug,
}))

function Item({ project, index, total, routed, labels, tip, wordNumber }) {
  const to = project.slug ? { name: 'project', slug: project.slug } : null
  const internal = routed && to
  const href = internal ? hrefOf(to) : project.href || undefined
  const open = internal
    ? (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
      }
    : undefined
  const ext = externalProps(href)
  const n = String(index + 1).padStart(2, '0')
  const image = project.image
  const small = project.imageSmall || image
  return (
    <article className="od-proj__item" data-proj-item>
      <a className="od-proj__card" href={href} onClick={open} {...ext} data-cursor={tip} aria-label={`${tip}: ${project.name}`} data-proj-card>
        {image && (
          <img
            src={image}
            srcSet={project.imageSmall ? `${small} 900w, ${image} 1800w` : undefined}
            sizes="(min-width: 1024px) 62vw, 230vw"
            alt={project.alt || `${project.name}, ${String(project.kind ?? '').toLowerCase()} in ${project.place}`}
            className="od-proj__img od-proj__img--cover"
            loading={index === 0 ? undefined : 'lazy'}
            decoding="async"
            data-proj-img
          />
        )}
      </a>
      <dl className="od-proj__ficha" data-proj-ficha>
        <div className="od-proj__row od-proj__row--name">
          <dt className="sr-only">{labels.project}</dt>
          <dd>
            <span className="od-proj__n" style={LABEL}>
              {n}
            </span>
            <a href={href} onClick={open} {...ext} className="od-proj__name tpl-hit relative">
              {project.name}
            </a>
          </dd>
        </div>
        {[
          [labels.type, project.kind],
          [labels.place, project.place],
          [labels.year, project.year],
          [labels.area, project.area ? `${project.area} m²` : ''],
        ].map(([k, v]) => (
          <div key={k} className="od-proj__row">
            <dt style={LABEL}>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <span className="sr-only">
        {wordNumber(index + 1, total)}
      </span>
    </article>
  )
}

export default function Projects({
  title = 'Projects',
  projects,
  typeLabel = 'Type',
  placeLabel = 'Place',
  yearLabel = 'Year',
  areaLabel = 'Area',
  cursorTip = 'View project',
  showGrain = 'on',
  routed = false,
  bg,
  fg,
  accent,
  calm,
}) {
  const sectionRef = useRef(null)
  const counterRef = useRef(null)
  const barRef = useRef(null)
  const list = rows(projects, DEMO_ROWS)
  const count = list.length

  // The pin: the stage stays on screen while the scroll walks through the projects.
  useLayoutEffect(() => {
    if (calm || count < 2) return undefined
    const root = sectionRef.current
    const ctx = gsap.context(() => {
      const stage = root.querySelector('[data-proj-stage]')
      const items = gsap.utils.toArray('[data-proj-item]')
      const first = items[0]
      const tl = gsap.timeline({ defaults: { ease: 'none' } })
      // Every project but the first waits hidden on the same spot.
      items.slice(1).forEach((item) => {
        gsap.set(item, { autoAlpha: 0 })
        gsap.set(item.querySelector('[data-proj-card]'), { clipPath: 'inset(100% 0% 0% 0%)' })
        gsap.set(item.querySelector('[data-proj-img]'), { scale: 1.2 })
        gsap.set(item.querySelector('[data-proj-ficha]'), { autoAlpha: 0, y: 26 })
      })
      gsap.set(first.querySelector('[data-proj-card]'), { clipPath: 'inset(0% 0% 0% 0%)' })
      // One unit of the timeline per project; the change happens in the middle 60% of each unit and the stage rests at
      // the whole numbers (the snap below).
      items.forEach((item, i) => {
        if (!i) return
        const prev = items[i - 1]
        const at = i - 1 + 0.2
        const d = 0.6
        const card = item.querySelector('[data-proj-card]')
        const img = item.querySelector('[data-proj-img]')
        const ficha = item.querySelector('[data-proj-ficha]')
        tl.set(item, { autoAlpha: 1 }, at)
          .fromTo(card, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: d }, at)
          .fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'power2.out', duration: d }, at)
          // The one leaving: its fact sheet sinks while the new photo covers it, and its photo drifts up a little.
          .to(prev.querySelector('[data-proj-ficha]'), { autoAlpha: 0, y: -22, ease: 'power2.in', duration: d * 0.45 }, at)
          .to(prev.querySelector('[data-proj-img]'), { yPercent: -4, scale: 1.04, ease: 'power1.in', duration: d }, at)
          .fromTo(ficha, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: d * 0.55 }, at + d * 0.45)
          .set(prev, { autoAlpha: 0 }, at + d)
      })
      const last = count - 1
      const st = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: () => `+=${last * window.innerHeight * 0.9}`,
        pin: stage,
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
          // Only the project on the stage can be reached with the keyboard or a click.
          items.forEach((item, j) => item.toggleAttribute('inert', j !== idx))
          if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress.toFixed(4)})`
        },
      })
      items.slice(1).forEach((item) => item.setAttribute('inert', ''))
      return () => st.kill()
    }, root)
    return () => ctx.revert()
  }, [calm, count])

  const labels = { project: title, type: typeLabel, place: placeLabel, year: yearLabel, area: areaLabel }
  const total = String(count).padStart(2, '0')
  return (
    <section
      ref={sectionRef}
      id="projects"
      data-od-section
      aria-labelledby="projects-title"
      className={`od-root od-proj relative${calm ? ' min-h-svh' : ' od-proj--pin'}`}
      style={sectionVars({ bg, fg, accent })}
      data-grain={showGrain === 'off' ? 'off' : undefined}
    >
      <div data-proj-stage className="od-proj__stage">
        <header className="od-proj__head">
          <h2 id="projects-title" className="od-proj__title">
            {title}
          </h2>
          <span className="od-proj__label" style={LABEL}>
            <span ref={counterRef}>01</span> — {total}
          </span>
        </header>
        {!calm && count > 1 && <span ref={barRef} className="od-proj__bar" aria-hidden="true" />}
        <div className="od-proj__slides">
          {list.map((p, i) => (
            <Item key={i} project={p} index={i} total={count} routed={routed} labels={labels} tip={cursorTip} wordNumber={(a, b) => `${a} / ${b}`} />
          ))}
        </div>
      </div>
    </section>
  )
}

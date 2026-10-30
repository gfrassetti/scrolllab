import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../../../lib/gsap'
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
 * The sheet of the hero turns back into a sketch as it leaves (Sketch.jsx) and this section follows it. Each
 * card is revealed as it comes into view: the photo opens upwards from its lower edge while it settles from a
 * slight zoom, and the fact sheet rises after it.
 *
 * Every text, photo, link and colour is a prop; the defaults are the demo projects. With «reduce motion» everything
 * is already in place, no reveal.
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
            sizes="(min-width: 1024px) 62vw, 100vw"
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
  const list = rows(projects, DEMO_ROWS)

  useLayoutEffect(() => {
    if (calm) return undefined
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-proj-item]').forEach((item) => {
        const card = item.querySelector('[data-proj-card]')
        const img = item.querySelector('[data-proj-img]')
        const ficha = item.querySelector('[data-proj-ficha]')
        gsap.set(card, { clipPath: 'inset(14% 0% 0% 0%)' })
        if (img) gsap.set(img, { scale: 1.12 })
        gsap.set(ficha, { autoAlpha: 0, y: 18 })
        gsap
          .timeline({ scrollTrigger: { trigger: item, start: 'top 82%', once: true } })
          .to(card, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' }, 0)
          .to(ficha, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.35)
        if (img) gsap.to(img, { scale: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 82%', once: true } })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [calm, list.length])

  const last = String(list.length).padStart(2, '0')
  const labels = { project: title, type: typeLabel, place: placeLabel, year: yearLabel, area: areaLabel }
  return (
    <section
      ref={sectionRef}
      id="projects"
      data-od-section
      aria-labelledby="projects-title"
      className="od-root od-proj relative min-h-svh"
      style={sectionVars({ bg, fg, accent })}
      data-grain={showGrain === 'off' ? 'off' : undefined}
    >
      <header className="od-proj__head">
        <h2 id="projects-title" className="od-proj__title">
          {title}
        </h2>
        <span className="od-proj__label" style={LABEL}>
          01 — {last}
        </span>
      </header>
      {list.map((p, i) => (
        <Item key={i} project={p} index={i} total={list.length} routed={routed} labels={labels} tip={cursorTip} wordNumber={(a, b) => `${a} / ${b}`} />
      ))}
    </section>
  )
}

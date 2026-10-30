import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../../../lib/gsap'
import { LABEL } from './brand'
import { PROJECTS } from './projects'
import { hrefOf, navigate } from './router'

/**
 * Projects — the index of the studio's work: one row per project, a photo card and its fact sheet.
 * Each card is a link to the project page (`/projects/<slug>`, ProjectPage.jsx).
 *
 * The sheet of the hero turns back into a sketch as it leaves (Sketch.jsx) and this section follows it. Each
 * card is revealed as it comes into view: the photo opens upwards from its lower edge while it settles from a
 * slight zoom, and the fact sheet rises after it.
 *
 * With «reduce motion»: everything is already in place, no reveal.
 */

const openProject = (project) => (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  navigate({ name: 'project', slug: project.slug })
}

function Item({ project, index, total }) {
  const to = { name: 'project', slug: project.slug }
  const open = openProject(project)
  const { src, small, alt } = project.photos.cover
  return (
    <article className="od-proj__item" data-proj-item>
      <a className="od-proj__card" href={hrefOf(to)} onClick={open} data-cursor="View project" aria-label={`View the project ${project.name}`} data-proj-card>
        <img
          src={src}
          srcSet={`${small} 900w, ${src} 1800w`}
          sizes="(min-width: 1024px) 62vw, 100vw"
          alt={alt}
          className="od-proj__img od-proj__img--cover"
          loading={index === 0 ? undefined : 'lazy'}
          decoding="async"
          data-proj-img
        />
      </a>
      <dl className="od-proj__ficha" data-proj-ficha>
        <div className="od-proj__row od-proj__row--name">
          <dt className="sr-only">Project</dt>
          <dd>
            <span className="od-proj__n" style={LABEL}>
              {project.n}
            </span>
            <a href={hrefOf(to)} onClick={open} className="od-proj__name">
              {project.name}
            </a>
          </dd>
        </div>
        {[
          ['Type', project.kind],
          ['Place', project.place],
          ['Year', project.year],
          ['Area', `${project.area} m²`],
        ].map(([k, v]) => (
          <div key={k} className="od-proj__row">
            <dt style={LABEL}>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <span className="sr-only">
        {index + 1} of {total}
      </span>
    </article>
  )
}

export default function Projects({ calm }) {
  const sectionRef = useRef(null)

  useLayoutEffect(() => {
    if (calm) return undefined
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-proj-item]').forEach((item) => {
        const card = item.querySelector('[data-proj-card]')
        const img = item.querySelector('[data-proj-img]')
        const ficha = item.querySelector('[data-proj-ficha]')
        gsap.set(card, { clipPath: 'inset(14% 0% 0% 0%)' })
        gsap.set(img, { scale: 1.12 })
        gsap.set(ficha, { autoAlpha: 0, y: 18 })
        gsap
          .timeline({ scrollTrigger: { trigger: item, start: 'top 82%', once: true } })
          .to(card, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' }, 0)
          .to(img, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0)
          .to(ficha, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.35)
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [calm])

  return (
    <section ref={sectionRef} id="projects" aria-labelledby="projects-title" className="od-proj relative min-h-svh">
      <header className="od-proj__head">
        <h2 id="projects-title" className="od-proj__title">
          Projects
        </h2>
        <span className="od-proj__label" style={LABEL}>
          {PROJECTS[0].n} — {PROJECTS[PROJECTS.length - 1].n}
        </span>
      </header>
      {PROJECTS.map((p, i) => (
        <Item key={p.slug} project={p} index={i} total={PROJECTS.length} />
      ))}
    </section>
  )
}

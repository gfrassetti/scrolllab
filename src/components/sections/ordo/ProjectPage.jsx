import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { LABEL, SITE } from './brand'
import { hidePaint, paint } from './paint'
import { PROJECTS, projectBySlug } from './projects'
import { hrefOf, navigate } from './router'

/**
 * A project page (`/projects/<slug>`): a horizontal strip. At the start, half and half: on the left
 * the colour panel with the title and, on the right, the first photo; the vertical scroll moves the strip to the
 * left and the other panels come in (the description, the photos with their text, the closing).
 *
 *   0 cover        the colour panel (the left half)               1 photo    the first photo (the right half)
 *   2 description  the sentence, the services and the area       3 – 6 photos  the big window, the niche, the craft…
 *   closing        the studio's sentence and the step to the next one: it goes BELOW the strip, the page continues downwards
 *
 * Motion (all tied to the strip's scroll, with `containerAnimation`):
 *   - parallax: each photo moves inside its frame slower than the strip (`data-px`) and its text goes at another
 *     speed (`data-pt`): they drift out of phase as they pass;
 *   - the photos emerge from below on entering (the frame opens from the bottom upwards);
 *   - the area rises from below and the rest of the text unfolds from left to right (the paint.js brush).
 *
 * On the phone (< 768 px) and with "reduce motion" there is no strip: the panels go one below the other, with the
 * same fades on arrival (and still with "reduce motion").
 *
 * The film grain covers the whole view (`.od-pd-grain`).
 */

const TO_HOME = { name: 'home' }
const NAV_CLEAR = 'calc(var(--nav-h) + 9px)'

function Photo({ photo, px = 1, sizes = '100vw', className = '' }) {
  return (
    <span className={`od-px ${className}`} data-reveal style={{ aspectRatio: `${photo.w} / ${photo.h}` }}>
      <img
        data-px={px}
        src={photo.src}
        srcSet={`${photo.small} 750w, ${photo.src} 1500w`}
        sizes={sizes}
        alt={photo.alt}
        decoding="async"
        width={photo.w}
        height={photo.h}
      />
    </span>
  )
}

/** A note: the paper card that goes with the photo. The outer one moves with the scroll and the inner one unfolds. */
function Note({ label, text, speed, className = '' }) {
  return (
    <div data-pt={speed} className={`od-pd-note ${className}`}>
      <span data-sweep className="od-paint od-pd-note__label" style={LABEL}>
        {label}
      </span>
      <p data-sweep className="od-paint od-pd-note__text">
        {text}
      </p>
    </div>
  )
}

export default function ProjectPage({ slug, calm, boarded = true }) {
  const rootRef = useRef(null)
  const wrapRef = useRef(null)
  const trackRef = useRef(null)
  const introRef = useRef(null)
  const project = projectBySlug(slug)

  // The tab title.
  useEffect(() => {
    if (!project) return undefined
    const prev = document.title
    document.title = `${project.name} · ${SITE.name}`
    return () => {
      document.title = prev
    }
  }, [project])

  // Escape goes back to the projects.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && navigate(TO_HOME, { section: 'projects' })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The motion: the horizontal strip (≥ 768 px), the parallax and the entrances.
  useLayoutEffect(() => {
    if (calm || !project) return undefined
    const root = rootRef.current
    const track = trackRef.current
    const wrap = wrapRef.current
    const mm = gsap.matchMedia()

    mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)' }, (ctx) => {
      const { wide } = ctx.conditions
      const q = (sel) => gsap.utils.toArray(sel, root)

      // What has not arrived yet is hidden (before painting).
      gsap.set(q('[data-reveal]'), { clipPath: 'inset(100% 0% 0% 0%)' })
      gsap.set(q('[data-rise]'), { yPercent: 112 })
      hidePaint(q('[data-sweep]'))

      // The strip: the vertical scroll moves it to the left while the section stays fixed.
      let move = null
      if (wide) {
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth)
        move = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top top',
            end: () => `+=${dist()}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
      }

      // The positions of a trigger: in the strip, the left edge of the panel; in vertical, its top edge.
      const at = wide ? { start: 'left 90%', end: 'right left' } : { start: 'top 88%', end: 'bottom top' }
      const trig = (el, extra) => ({ trigger: el, ...(move ? { containerAnimation: move } : {}), ...extra })
      const panelOf = (el) => el.closest('[data-panel]') || el

      // The parallax of the photos: they move inside their frame, slower than the strip.
      q('[data-px]').forEach((img) => {
        const k = Number(img.dataset.px) || 1
        const frame = panelOf(img)
        gsap.fromTo(
          img,
          wide ? { xPercent: -8 * k } : { yPercent: -8 * k },
          {
            ...(wide ? { xPercent: 8 * k } : { yPercent: 8 * k }),
            ease: 'none',
            scrollTrigger: trig(frame, { start: wide ? 'left right' : 'top bottom', end: wide ? 'right left' : 'bottom top', scrub: true }),
          },
        )
      })
      // The parallax of the texts: they go at another speed (the sign decides whether they get ahead or lag behind).
      q('[data-pt]').forEach((el) => {
        const k = Number(el.dataset.pt) || 1
        gsap.fromTo(
          el,
          wide ? { x: -80 * k } : { y: -50 * k },
          {
            ...(wide ? { x: 80 * k } : { y: 50 * k }),
            ease: 'none',
            scrollTrigger: trig(panelOf(el), { start: wide ? 'left right' : 'top bottom', end: wide ? 'right left' : 'bottom top', scrub: true }),
          },
        )
      })

      // The entrances (the first screen comes in with the opening, below): each panel on arrival.
      const entering = (el) => !(wide && el.closest('[data-first]'))
      const onceAt = (el, fn) => ScrollTrigger.create(trig(el, { start: at.start, once: true, onEnter: fn }))
      q('[data-panel]').forEach((panel) => {
        if (!entering(panel)) return
        onceAt(panel, () => {
          // The photos emerge from below.
          gsap.to(panel.querySelectorAll('[data-reveal]'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power3.inOut', stagger: 0.12 })
          // The area rises from below.
          gsap.to(panel.querySelectorAll('[data-rise]'), { yPercent: 0, duration: 1.4, ease: 'power3.out', delay: 0.15 })
          // The rest of the text unfolds from left to right.
          paint(panel.querySelectorAll('[data-sweep]'), { duration: 1.3, stagger: 0.14, delay: 0.25 })
        })
      })

      // The closing is below the strip: it comes in with the normal vertical scroll.
      q('[data-vpanel]').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 78%',
          once: true,
          onEnter: () => paint(el.querySelectorAll('[data-sweep]'), { duration: 1.3, stagger: 0.16 }),
        })
      })

      // The opening (cover and first photo): it starts when the curtain leaves; see the `boarded` effect.
      const first = q('[data-first]')
      const intro = gsap.timeline({ paused: true })
      first.forEach((p) => {
        intro.to(p.querySelectorAll('[data-reveal]'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power3.inOut' }, 0)
        intro.add(() => paint(p.querySelectorAll('[data-sweep]'), { duration: 1.3, stagger: 0.12 }), 0.45)
      })
      if (!wide) {
        // In vertical the opening is the first thing on the page; the rest comes in on scrolling (above, [data-panel]).
      }
      introRef.current = intro

      ScrollTrigger.refresh()
      return () => {
        introRef.current = null
      }
    })
    return () => mm.revert()
  }, [calm, project])

  // The opening runs when the loader or the curtain ends.
  useEffect(() => {
    if (calm || !boarded) return undefined
    const t = setTimeout(() => introRef.current?.play(), 450)
    return () => clearTimeout(t)
  }, [calm, boarded, project])

  if (!project) {
    return (
      <section className="od-pd-missing" aria-label="Project not found">
        <h1 className="od-pd-title">We could not find that project</h1>
        <a href={hrefOf(TO_HOME)} onClick={(e) => (e.preventDefault(), navigate(TO_HOME, { section: 'projects' }))} className="od-pd-back">
          ← See all projects
        </a>
      </section>
    )
  }

  const { photos: ph, notes } = project
  const i = PROJECTS.indexOf(project)
  const next = PROJECTS.length > 1 ? PROJECTS[(i + 1) % PROJECTS.length] : null
  const toNext = next ? { name: 'project', slug: next.slug } : TO_HOME
  const goBack = (e) => {
    e.preventDefault()
    navigate(TO_HOME, { section: 'projects' })
  }
  const goNext = (e) => {
    e.preventDefault()
    navigate(toNext, next ? {} : { section: 'projects' })
  }
  const ratio = (p) => p.w / p.h

  return (
    <div ref={rootRef} className={`od-pd${calm ? ' od-pd--v' : ''}`} style={{ '--clear': NAV_CLEAR }}>
      {/* The film grain, over the whole view. */}
      <div className="od-pd-grain" aria-hidden="true" />

      <section ref={wrapRef} className="od-pd-h" aria-labelledby="pd-title">
        <div ref={trackRef} className="od-pd-track" data-pd-track>
          {/* 0. The cover: the left half, the colour panel. */}
          <div className="od-pd-p od-pd-p--cover" data-panel data-first data-spot>
            <div className="od-pd-hero__top" style={LABEL}>
              <a href={hrefOf(TO_HOME)} onClick={goBack} className="od-pd-hero__back" data-cursor="Back">
                ← Projects
              </a>
              <span>
                {project.n} / {String(PROJECTS.length).padStart(2, '0')}
              </span>
            </div>
            <div className="od-pd-hero__mid">
              <span className="od-pd-hero__thumb" data-reveal>
                <img src={ph.thumb.src} srcSet={`${ph.thumb.small} 640w, ${ph.thumb.src} 1200w`} sizes="160px" alt={ph.thumb.alt} decoding="async" />
              </span>
              <p data-sweep className="od-paint od-pd-hero__kind" style={LABEL}>
                {project.kind}
              </p>
            </div>
            <div className="od-pd-hero__bottom">
              <span data-sweep className="od-paint od-pd-hero__meta" style={LABEL}>
                {project.place} · {project.year}
              </span>
              <h1 id="pd-title" className="od-pd-title">
                <span data-sweep className="od-paint">
                  {project.name}
                </span>
              </h1>
            </div>
          </div>

          {/* 1. The first photo: the right half. */}
          <div className="od-pd-p od-pd-p--hero" data-panel data-first>
            <Photo photo={ph.hero} px={1} sizes="50vw" className="od-px--fill" />
          </div>

          {/* 2. The description: the sentence, the services and the area. */}
          <div className="od-pd-p od-pd-p--intro" data-panel data-spot>
            <p data-sweep className="od-paint od-pd-intro__lede">
              {project.lede}
            </p>
            <ul className="od-pd-services">
              {project.services.map((s, k) => (
                <li key={s} data-sweep className="od-paint">
                  <span>{s}</span>
                  <span style={LABEL}>{String(k + 1).padStart(2, '0')}</span>
                </li>
              ))}
            </ul>
            <p className="od-pd-stat__n">
              <span className="od-pd-stat__mask">
                <span data-rise>{project.area}</span>
              </span>
              <span className="od-pd-stat__mask od-pd-stat__mask--u">
                <span data-rise>m²</span>
              </span>
            </p>
          </div>

          {/* 3. The big window. */}
          <figure className="od-pd-p od-pd-p--photo" data-panel data-spot style={{ '--r': ratio(ph.light) }}>
            <Photo photo={ph.light} px={1} sizes="100vw" />
            <Note label={notes.light[0]} text={notes.light[1]} speed={-1.5} className="od-pd-note--bl" />
          </figure>

          {/* 4. The niche. */}
          <figure className="od-pd-p od-pd-p--photo" data-panel data-spot style={{ '--r': ratio(ph.colour) }}>
            <Photo photo={ph.colour} px={1.1} sizes="(min-width: 768px) 40vh, 100vw" />
            <Note label={notes.colour[0]} text={notes.colour[1]} speed={-1.3} className="od-pd-note--br" />
          </figure>

          {/* 5. The craft. */}
          <figure className="od-pd-p od-pd-p--photo" data-panel data-spot style={{ '--r': ratio(ph.craft) }}>
            <Photo photo={ph.craft} px={0.9} sizes="100vw" />
            <Note label={notes.craft[0]} text={notes.craft[1]} speed={-1.2} className="od-pd-note--bl" />
          </figure>

          {/* 6. The photo of the whole shop, small, on paper. */}
          <div className="od-pd-p od-pd-p--small" data-panel>
            <Photo photo={ph.cover} px={1.2} sizes="(min-width: 768px) 38vw, 100vw" />
          </div>

        </div>
      </section>

      {/* 7. The closing: from here the page continues downwards (the horizontal strip ended at the previous photo). */}
      <section className="od-pd-end" data-vpanel data-spot aria-label="Next">
        <p data-sweep className="od-paint od-pd-end__quote">
          {project.quote}
        </p>
        <div className="od-pd-end__foot">
          <a href={hrefOf(toNext)} onClick={goNext} className="od-pd-end__next" data-cursor={next ? 'Next' : 'Back'}>
            <span data-sweep className="od-paint" style={LABEL}>
              {next ? 'Next project' : 'All projects'}
            </span>
            <span data-sweep className="od-paint od-pd-end__name">
              {next ? next.name : 'Projects'} <span aria-hidden="true">→</span>
            </span>
          </a>
          <a href={SITE.instagram.href} target="_blank" rel="noreferrer" className="od-pd-end__ig" style={LABEL}>
            {SITE.instagram.handle}
          </a>
        </div>
      </section>
    </div>
  )
}

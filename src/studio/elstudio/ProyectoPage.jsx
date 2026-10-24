import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { LABEL, SITE } from './brand'
import { PROJECTS, projectBySlug } from './projects'
import { hrefOf, navigate } from './router'

/**
 * La página de un proyecto (`/proyectos/<slug>`), con la estructura de las de los estudios de referencia:
 *   1. apertura   un panel de color con el título grande y, a la derecha, una foto a todo el alto.
 *   2. intro      la descripción y los servicios numerados.
 *   3. dato       la superficie en grande y la ficha.
 *   4. galería    las fotos a todo ancho, cada una con su texto.
 *   5. cierre     la frase del estudio y el paso al siguiente proyecto.
 *
 * Parallax: cada foto se mueve dentro de su marco (más lento que la página) y su texto se mueve a otra velocidad:
 * a medida que se scrollea, la foto y el texto se desfasan. Todo con transformaciones atadas al scroll
 * (`data-px` en la foto, `data-pt` en el texto, el número es la velocidad: positivo se atrasa respecto de la página y
 * negativo se adelanta; la foto siempre se atrasa y el texto se adelanta, así se separan). Con «reducir movimiento», quietos.
 *
 * Los `<section>` son hijos directos de <main>: la regla de scroll los cuenta como secciones.
 */

const TO_HOME = { name: 'home' }

function Photo({ photo, px = 1, sizes = '100vw', priority = false, className = '' }) {
  return (
    <span className={`es-px ${className}`} style={{ aspectRatio: `${photo.w} / ${photo.h}` }}>
      <img
        data-px={px}
        src={photo.src}
        srcSet={`${photo.small} 750w, ${photo.src} 1500w`}
        sizes={sizes}
        alt={photo.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        width={photo.w}
        height={photo.h}
      />
    </span>
  )
}

/** Un texto que entra con un fundido al aparecer. El de afuera se mueve con el scroll (data-pt) y el de adentro se revela. */
function Note({ label, text, speed, className = '' }) {
  return (
    <div data-pt={speed} className={`es-pd-note ${className}`}>
      <div data-rv>
        <span className="es-pd-note__label" style={LABEL}>
          {label}
        </span>
        <p className="es-pd-note__text">{text}</p>
      </div>
    </div>
  )
}

export default function ProyectoPage({ slug, calm }) {
  const rootRef = useRef(null)
  const project = projectBySlug(slug)

  // El título de la pestaña.
  useEffect(() => {
    if (!project) return undefined
    const prev = document.title
    document.title = `${project.name} · ${SITE.name}`
    return () => {
      document.title = prev
    }
  }, [project])

  // Escape vuelve a los proyectos.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && navigate(TO_HOME, { section: 'proyectos' })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // El parallax: las fotos y los textos, atados al scroll.
  useLayoutEffect(() => {
    if (calm || !project) return undefined
    const ctx = gsap.context(() => {
      const root = rootRef.current
      gsap.utils.toArray('[data-px]', root).forEach((img) => {
        const k = Number(img.dataset.px) || 1
        gsap.fromTo(
          img,
          { yPercent: -8 * k },
          {
            yPercent: 8 * k,
            ease: 'none',
            scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
      gsap.utils.toArray('[data-pt]', root).forEach((el) => {
        const k = Number(el.dataset.pt) || 1
        gsap.fromTo(
          el,
          { y: -70 * k },
          {
            y: 70 * k,
            ease: 'none',
            scrollTrigger: { trigger: el.closest('[data-pfig]') || el, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
      // Los textos y los datos se revelan con un fundido lento al llegar.
      gsap.utils.toArray('[data-rv]', root).forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 26,
          filter: 'blur(3px)',
          duration: 1.25,
          ease: 'power2.out',
          clearProps: 'filter,transform',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        })
      })
      ScrollTrigger.refresh()
    }, rootRef)
    return () => ctx.revert()
  }, [calm, project])

  if (!project) {
    return (
      <section className="es-pd-missing" aria-label="Proyecto no encontrado">
        <h1 className="es-pd-title">No encontramos ese proyecto</h1>
        <a href={hrefOf(TO_HOME)} onClick={(e) => (e.preventDefault(), navigate(TO_HOME, { section: 'proyectos' }))} className="es-pd-back">
          ← Ver los proyectos
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
    navigate(TO_HOME, { section: 'proyectos' })
  }
  const goNext = (e) => {
    e.preventDefault()
    navigate(toNext, next ? {} : { section: 'proyectos' })
  }

  return (
    <div ref={rootRef} className="es-pd">
      {/* 1. La apertura: el panel de color con el título y la foto a todo el alto. */}
      <section className="es-pd-hero" aria-labelledby="pd-title">
        <div className="es-pd-hero__panel">
          <div className="es-pd-hero__top" style={LABEL}>
            <a href={hrefOf(TO_HOME)} onClick={goBack} className="es-pd-hero__back" data-cursor="Volver">
              ← Proyectos
            </a>
            <span>
              {project.n} / {String(PROJECTS.length).padStart(2, '0')}
            </span>
          </div>
          <div className="es-pd-hero__mid">
            <span className="es-pd-hero__thumb">
              <img src={ph.thumb.src} srcSet={`${ph.thumb.small} 640w, ${ph.thumb.src} 1200w`} sizes="160px" alt={ph.thumb.alt} decoding="async" />
            </span>
            <p className="es-pd-hero__kind" style={LABEL} data-rv>
              {project.kind}
            </p>
          </div>
          <div className="es-pd-hero__bottom">
            <span className="es-pd-hero__meta" style={LABEL}>
              {project.place} · {project.year}
            </span>
            <h1 id="pd-title" className="es-pd-title">
              {project.name}
            </h1>
          </div>
        </div>
        <div className="es-pd-hero__photo">
          <Photo photo={ph.hero} px={1} sizes="(min-width: 1024px) 60vw, 100vw" priority className="es-px--fill" />
        </div>
      </section>

      {/* 2. La intro: la descripción y los servicios. */}
      <section className="es-pd-intro" aria-label="Descripción">
        <p className="es-pd-intro__lede" data-rv>
          {project.lede}
        </p>
        <ul className="es-pd-services" data-rv>
          {project.services.map((s, k) => (
            <li key={s}>
              <span>{s}</span>
              <span style={LABEL}>{String(k + 1).padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. El dato: la superficie en grande y la ficha. */}
      <section className="es-pd-stat" aria-label="Ficha">
        <p className="es-pd-stat__n" data-rv>
          {project.area}
          <span>m²</span>
        </p>
        <dl className="es-pd-facts" data-rv>
          {[
            ['Tipo', project.kind],
            ['Lugar', project.place],
            ['Año', project.year],
          ].map(([k, v]) => (
            <div key={k}>
              <dt style={LABEL}>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 4. La galería: cada foto con su texto, a distinta velocidad. */}
      <section className="es-pd-gal es-pd-gal--wide" aria-label="Fotos del proyecto" data-pfig>
        <Photo photo={ph.ventanal} px={1} sizes="100vw" />
        <Note label={notes.ventanal[0]} text={notes.ventanal[1]} speed={-1.5} className="es-pd-note--right" />
      </section>

      <section className="es-pd-gal es-pd-gal--split" aria-label="El nicho" data-pfig>
        <Note label={notes.nicho[0]} text={notes.nicho[1]} speed={-1.3} className="es-pd-note--left" />
        <Photo photo={ph.nicho} px={1.1} sizes="(min-width: 1024px) 40vw, 100vw" className="es-pd-gal__tall" />
      </section>

      <section className="es-pd-gal es-pd-gal--pair" aria-label="Oficio" data-pfig>
        <div className="es-pd-gal__a">
          <Photo photo={ph.prenda} px={0.9} sizes="(min-width: 1024px) 58vw, 100vw" />
        </div>
        <div className="es-pd-gal__b" data-pt={1.1}>
          <Photo photo={ph.cover} px={1.2} sizes="(min-width: 1024px) 34vw, 70vw" />
        </div>
        <Note label={notes.prenda[0]} text={notes.prenda[1]} speed={-1.2} className="es-pd-note--under" />
      </section>

      {/* 5. El cierre: la frase y el paso al siguiente. */}
      <section className="es-pd-end" aria-label="Siguiente">
        <p className="es-pd-end__quote" data-rv>
          {project.quote}
        </p>
        <a href={hrefOf(toNext)} onClick={goNext} className="es-pd-end__next" data-cursor={next ? 'Siguiente' : 'Volver'}>
          <span style={LABEL}>{next ? 'Siguiente proyecto' : 'Todos los proyectos'}</span>
          <span className="es-pd-end__name">
            {next ? next.name : 'Proyectos'} <span aria-hidden="true">→</span>
          </span>
        </a>
        <a href={SITE.instagram.href} target="_blank" rel="noreferrer" className="es-pd-end__ig" style={LABEL}>
          {SITE.instagram.handle}
        </a>
      </section>
    </div>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { workCoat, workNeon, workSet, workTrails, variants } from './assets/images'
import { themeVars } from '../../../lib/themeVars'
import { externalProps } from '../../../lib/contactLinks'

const defaultWorks = [
  {
    index: '001',
    title: 'Rain on Glass',
    category: 'Commercial',
    year: '2026',
    href: '#contact',
    img: workSet,
  },
  {
    index: '002',
    title: 'The Long Coat',
    category: 'Short film',
    year: '2025',
    href: '#contact',
    img: workCoat,
  },
  {
    index: '003',
    title: 'Red Lines',
    category: 'Music video',
    year: '2025',
    href: '#contact',
    img: workTrails,
  },
  {
    index: '004',
    title: 'Neon Tide',
    category: 'Photography',
    year: '2024',
    href: '#contact',
    img: workNeon,
  },
]

/**
 * WorkIndex — index-style list of works. On desktop, a floating
 * preview image trails the cursor and swaps per hovered row.
 * On mobile each row carries its own inline thumbnail.
 *
 * Calma: las filas entran con un fundido, y la vista previa sigue al cursor sin
 * rezago (el cursor es del visitante; antes, sin quickTo, la imagen se quedaba
 * clavada arriba a la izquierda).
 */
export default function WorkIndex({
  seq = '04',
  total = '06',
  label = 'The index',
  seqLabel = 'Seq.',
  works,
  /** Ancla de la sección: el nav apunta acá. */
  id = 'films',
  bg,
  fg,
  accent,
  /** La foto que sigue al mouse sobre la lista (solo en PC). */
  showHoverImage = 'on',
}) {
  const root = useRef(null)
  // `works` editable trae index/title/category/year; la imagen (stubeada en el
  // embed) sale por índice del set de ejemplo, igual que en SplitReveals.
  const rows =
    Array.isArray(works) && works.length
      ? works.map((w, i) => ({ ...w, img: w.img || defaultWorks[i % defaultWorks.length].img }))
      : defaultWorks
  const floatImg = useRef(null)
  const quick = useRef({ x: null, y: null })

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        quick.current.x = (x) => gsap.set(floatImg.current, { x })
        quick.current.y = (y) => gsap.set(floatImg.current, { y })
        return calmReveal('[data-work-row]', { y: 16, stagger: 0.08 })
      }

      gsap.from('[data-work-row]', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })

      if (!floatImg.current) return
      quick.current.x = gsap.quickTo(floatImg.current, 'x', {
        duration: 0.45,
        ease: 'power3',
      })
      quick.current.y = gsap.quickTo(floatImg.current, 'y', {
        duration: 0.45,
        ease: 'power3',
      })

      // Con la rueda la lista se mueve debajo de un mouse quieto y no llega
      // ningún mouseleave: la foto quedaba clavada sobre otra sección. Al
      // scrollear se mira qué hay debajo del puntero.
      const onScroll = () => {
        const { x, y } = last.current
        if (x == null) return
        const row = document.elementFromPoint(x, y)?.closest?.('[data-work-row]')
        if (row && root.current?.contains(row)) {
          const i = Number(row.dataset.index)
          if (rows[i]) showPreview(rows[i].img)
        } else hidePreview()
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    },
    { scope: root, dependencies: [showHoverImage], revertOnUpdate: true },
  )

  const last = useRef({ x: null, y: null })
  const handleMove = (e) => {
    last.current = { x: e.clientX, y: e.clientY }
    quick.current.x?.(e.clientX)
    quick.current.y?.(e.clientY)
  }

  const showPreview = (img) => {
    if (!floatImg.current) return
    floatImg.current.src = img
    gsap.to(floatImg.current, { autoAlpha: 1, scale: 1, duration: 0.35 })
  }

  const hidePreview = () => {
    if (!floatImg.current) return
    gsap.to(floatImg.current, { autoAlpha: 0, scale: 0.9, duration: 0.3 })
  }

  return (
    <section
      ref={root}
      id={id}
      className="px-5 py-24 md:px-10 md:py-36"
      style={{ backgroundColor: bg || undefined, color: fg || undefined, ...themeVars({ salt: fg, acid: accent, noir: bg }) }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t border-salt/20 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
          {seqLabel} {seq} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
      </div>

      <ul onMouseMove={handleMove} onMouseLeave={hidePreview}>
        {rows.map((work, i) => (
          <li
            key={i}
            data-work-row
            data-index={i}
            className="border-b border-salt/15 first:border-t"
          >
            <a
              href={work.href || '#contact'}
              {...externalProps(work.href)}
              onMouseEnter={() => showPreview(work.img)}
              className="group grid grid-cols-[auto_1fr] items-center gap-4 py-6 md:grid-cols-[6rem_1fr_auto_6rem] md:gap-8 md:py-8"
            >
              <span className="text-[11px] tracking-[0.3em] text-salt/40 md:text-xs">
                {work.index}
              </span>

              <span className="flex min-w-0 items-center gap-4">
                <img
                  {...imgAttrs(work.img, variants)}
                  sizes="44px"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-11 shrink-0 object-cover md:hidden"
                />
                {/* En mobile el año pasa abajo del título: la columna propia
                    le dejaba al título ~110 px y cortaba las palabras al medio. */}
                <span className="min-w-0">
                  <span className="block break-words font-brico text-[clamp(1.35rem,6.2vw,2.4rem)] leading-none font-extrabold tracking-[-0.02em] uppercase transition-all duration-300 group-hover:translate-x-2 group-hover:text-acid md:text-[clamp(1.6rem,4.5vw,3.8rem)]">
                    {work.title}
                  </span>
                  <span className="mt-2 block text-[11px] tracking-[0.3em] text-salt/40 md:hidden">
                    {work.year}
                  </span>
                </span>
              </span>

              <span className="hidden text-[11px] uppercase tracking-[0.3em] text-salt/40 md:block md:text-xs">
                {work.category}
              </span>
              <span className="hidden justify-self-end text-xs tracking-[0.3em] text-salt/40 md:block">
                {work.year}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* Cursor-trailing preview — desktop only */}
      {showHoverImage !== 'off' && (
      <img
        ref={floatImg}
        src={rows[0]?.img}
        loading="lazy"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-40 hidden w-56 -translate-x-1/2 -translate-y-1/2 scale-90 object-cover opacity-0 invisible md:block lg:w-64"
      />
      )}
    </section>
  )
}

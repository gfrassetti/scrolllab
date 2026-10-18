import { useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { accA, accB, accC, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'
import { themeVars } from '../../../lib/themeVars'

const defaultItems = [
  {
    title: 'Commissions',
    body: 'We design and cast pieces for architects, galleries and private homes. Every commission starts with a model at 1:20.',
    img: accA,
  },
  {
    title: 'Moulds',
    body: 'Moulds are milled in-house from aluminium, so any piece can be cast again, identical, years later.',
    img: accB,
  },
  {
    title: 'Spaces',
    body: 'From a single bench to a whole courtyard: we also pour floors, walls and stairs on site.',
    img: accC,
  },
]

/**
 * TypeAccordion — giant condensed titles that expand into a
 * text + image drawer on click. Height animates via the CSS
 * grid-template-rows trick; ScrollTrigger refreshes afterwards
 * so pinned sections below stay accurate.
 */
export default function TypeAccordion({
  unit = '04',
  total = '05',
  label = 'What we do',
  unitLabel = 'Unit',
  /** Ancla de la sección, si un link apunta acá. */
  id = 'services',
  items = defaultItems,
  bg,
  fg,
  accent,
  /** Las fotos de los cajones. */
  showImages = 'on',
  /** El rótulo de las filas cerradas y el de la abierta (dicen que se pueden abrir). */
  openLabel = 'Open',
  closeLabel = 'Close',
}) {
  const root = useRef(null)
  const [open, setOpen] = useState(0)
  // Una fila sin foto propia conserva la de la demo en su lugar.
  const given = Array.isArray(items) && items.length
    ? items.map((row, i) => ({ ...row, img: row.img || defaultItems[i]?.img }))
    : defaultItems
  const rows = showImages === 'off' ? given.map((row) => ({ ...row, img: null })) : given

  // Las filas cerradas «respiran» (el + crece y vuelve, de a una) para decir que
  // se abren; la abierta queda quieta. Las líneas se trazan al entrar.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const plus = gsap.utils.toArray('[data-acc-plus="closed"]', root.current)
      const pulse = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
      plus.forEach((el, i) => {
        pulse.to(el, { scale: 1.25, duration: 0.35, ease: 'power2.out' }, i * 0.45)
        pulse.to(el, { scale: 1, duration: 0.5, ease: 'power2.inOut' }, i * 0.45 + 0.35)
      })
      return () => {
        pulse.kill()
        gsap.set(plus, { scale: 1 })
      }
    },
    { scope: root, dependencies: [open, rows.length], revertOnUpdate: true },
  )
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('[data-acc-line]', {
        scaleX: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    },
    { scope: root },
  )

  const toggle = (index) => {
    setOpen((current) => (current === index ? -1 : index))
    setTimeout(() => ScrollTrigger.refresh(), 550)
  }

  return (
    <section
      ref={root}
      id={id}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined, ...themeVars({ carbon: fg, klein: accent, concrete: bg }) }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          {unitLabel} {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <div className="border-b-2 border-carbon">
        {rows.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i} className="relative">
              <span data-acc-line aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 origin-left bg-carbon" />
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors duration-200 hover:text-klein"
              >
                <span className="flex items-baseline gap-4 md:gap-8">
                  <span className="font-mono text-[11px] tracking-[0.1em] md:text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`font-anton text-[9vw] leading-none uppercase transition-colors duration-300 md:text-[6vw] ${
                      isOpen ? 'text-klein' : ''
                    }`}
                  >
                    {item.title}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3 md:gap-5">
                  <span className="hidden font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 transition-opacity duration-200 group-hover:opacity-100 sm:inline md:text-xs">
                    {isOpen ? closeLabel : openLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    data-acc-plus={isOpen ? 'open' : 'closed'}
                    className={`flex size-11 items-center justify-center border-2 border-current font-anton text-3xl leading-none transition-[transform,background-color,color] duration-500 md:size-16 md:text-5xl ${
                      isOpen ? 'bg-carbon text-concrete' : 'group-hover:bg-klein group-hover:text-concrete'
                    }`}
                  >
                    <span className={`block transition-transform duration-500 ${isOpen ? 'rotate-45' : ''}`}>+</span>
                  </span>
                </span>
              </button>

              <div
                className="grid transition-[grid-template-rows] duration-500 ease-in-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div
                    className={`grid gap-6 pt-2 pb-8 md:gap-10 ${
                      item.img ? 'md:grid-cols-2' : ''
                    }`}
                  >
                    <p className="max-w-[46ch] font-mono text-sm leading-relaxed">
                      {item.body}
                    </p>
                    {item.img ? (
                      <img
                        {...imgAttrs(item.img, variants)}
                        sizes="(min-width: 768px) 45vw, 100vw"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-8/5 w-full border-2 border-carbon object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

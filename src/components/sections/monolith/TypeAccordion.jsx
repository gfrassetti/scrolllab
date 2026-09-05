import { useRef, useState } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'
import accA from './assets/acc-a.png'
import accB from './assets/acc-b.png'
import accC from './assets/acc-c.png'

const defaultItems = [
  {
    title: 'First unit',
    body: 'Placeholder answer. Click rows to expand them — the grid-rows trick animates height with pure CSS.',
    img: accA,
  },
  {
    title: 'Second unit',
    body: 'Generic copy for the second drawer. Swap freely, the accordion keeps the rhythm.',
    img: accB,
  },
  {
    title: 'Third unit',
    body: 'One idea per drawer. Close it and the page snaps back to pure typography.',
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
  label = 'The drawers',
  items = defaultItems,
  bg,
  fg,
}) {
  const root = useRef(null)
  const [open, setOpen] = useState(0)
  const rows = Array.isArray(items) && items.length ? items : defaultItems

  const toggle = (index) => {
    setOpen((current) => (current === index ? -1 : index))
    setTimeout(() => ScrollTrigger.refresh(), 550)
  }

  return (
    <section
      ref={root}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          Unit {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <div className="border-b-2 border-carbon">
        {rows.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i} className="border-t-2 border-carbon">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
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
                <span
                  aria-hidden="true"
                  className={`font-anton text-[7vw] leading-none transition-transform duration-500 md:text-[4vw] ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                >
                  +
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
                        src={item.img}
                        alt=""
                        loading="lazy"
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

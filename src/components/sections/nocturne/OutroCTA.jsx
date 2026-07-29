import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const defaultColumns = [
  { heading: 'Reel', items: ['Films', 'Index', 'Stills', 'About'] },
  { heading: 'Signal', items: ['Instagram', 'Vimeo', 'Are.na'] },
]

/**
 * OutroCTA — closing credits. Giant CTA word rises out of a mask,
 * link columns above, thin legal line at the very bottom.
 */
export default function OutroCTA({
  ctaWord = 'ROLL CREDITS',
  email = 'hello@placeholder.films',
  columns = defaultColumns,
  legal = '©2026 Placeholder Films — Template, not a promise',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-outro-word]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.from(split.chars, {
        yPercent: 115,
        stagger: 0.035,
        duration: 1,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          once: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <footer ref={root} className="px-5 pt-24 pb-6 md:px-10 md:pt-36">
      <div className="mb-20 grid gap-12 border-t border-salt/20 pt-10 md:mb-28 md:grid-cols-12">
        <p className="max-w-[30ch] text-sm leading-relaxed text-salt/60 md:col-span-5 md:text-base">
          Placeholder closing note. The lights come up, the room is quiet —
          tell the audience where to go next.
        </p>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:justify-items-end">
          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
                {column.heading}
              </p>
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-300 hover:text-acid md:text-base"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <a href={`mailto:${email}`} className="group block" aria-label={email}>
        <span
          data-outro-word
          className="block font-brico text-[11.5vw] leading-[0.85] font-extrabold tracking-[-0.02em] whitespace-nowrap uppercase transition-colors duration-500 group-hover:text-acid"
        >
          {ctaWord}
        </span>
      </a>

      <div className="mt-10 flex flex-col gap-2 border-t border-salt/20 pt-4 text-[11px] uppercase tracking-[0.3em] text-salt/40 md:flex-row md:items-baseline md:justify-between md:text-xs">
        <p>{legal}</p>
        <a href="#top" className="transition-colors duration-300 hover:text-acid">
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}

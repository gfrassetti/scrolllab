import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultExhibits = [
  { code: 'EX-01', caption: 'Placeholder exhibit', img: 'https://picsum.photos/seed/mono-a/900/900' },
  { code: 'EX-02', caption: 'Generic artifact', img: 'https://picsum.photos/seed/mono-b/900/900' },
  { code: 'EX-03', caption: 'Untitled block', img: 'https://picsum.photos/seed/mono-c/900/900' },
  { code: 'EX-04', caption: 'Working sample', img: 'https://picsum.photos/seed/mono-d/900/900' },
]

/**
 * ExhibitGrid — hard-bordered image grid. Cells reveal with a
 * stagger; images sit in grayscale until hovered.
 */
export default function ExhibitGrid({
  unit = '03',
  total = '05',
  label = 'The exhibits',
  exhibits = defaultExhibits,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-exhibit]', {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1,
        stagger: 0.12,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-5 py-20 md:px-8 md:py-32">
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
        <p>
          Unit {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <div className="grid grid-cols-2 gap-[2px] border-2 border-carbon bg-carbon md:grid-cols-4">
        {exhibits.map((exhibit) => (
          <figure key={exhibit.code} data-exhibit className="group bg-concrete">
            <div className="overflow-hidden">
              <img
                src={exhibit.img}
                alt=""
                loading="lazy"
                className="aspect-square w-full object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
              />
            </div>
            <figcaption className="flex items-baseline justify-between border-t-2 border-carbon px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] md:text-[11px]">
              <span className="text-klein">{exhibit.code}</span>
              <span>{exhibit.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

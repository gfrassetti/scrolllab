import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const BUBBLE_COLORS = ['#ffb02e', '#ff3ea5', '#3ddc97', '#ff6b35']

const defaultColumns = [
  { heading: 'Column one', items: ['Link one', 'Link two', 'Link three'] },
  { heading: 'Column two', items: ['Link one', 'Link two', 'Link three'] },
]

/**
 * FooterSplash — closing CTA with a giant candy word and a slow
 * stream of bubbles rising behind it.
 */
export default function FooterSplash({
  ctaWord = 'YOUR CTA',
  email = 'hello@placeholder.studio',
  columns = defaultColumns,
  legal = '©2026 Placeholder Brand — Template, not a promise',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-splash-word]', {
        type: 'chars',
        mask: 'chars',
      })
      split.chars.forEach((char, i) => {
        char.style.color = BUBBLE_COLORS[i % BUBBLE_COLORS.length]
      })
      gsap.from(split.chars, {
        yPercent: 120,
        rotate: 10,
        stagger: 0.04,
        ease: 'back.out(1.5)',
        duration: 0.9,
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      })

      gsap.utils.toArray('[data-rise-bubble]', root.current).forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 120, opacity: 0 },
          {
            y: -160 - (i % 3) * 60,
            opacity: 0.5,
            duration: 5 + (i % 4) * 1.4,
            ease: 'none',
            repeat: -1,
            delay: i * 0.7,
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <footer
      ref={root}
      className="relative overflow-hidden px-5 pt-24 pb-6 md:px-10 md:pt-36"
    >
      {[...Array(9)].map((_, i) => (
        <span
          key={i}
          data-rise-bubble
          aria-hidden="true"
          className="absolute bottom-0 rounded-full opacity-0"
          style={{
            width: `${10 + (i % 4) * 10}px`,
            height: `${10 + (i % 4) * 10}px`,
            left: `${5 + i * 10.5}%`,
            backgroundColor: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
          }}
        />
      ))}

      <div className="relative mb-20 grid gap-12 md:mb-28 md:grid-cols-12">
        <p className="max-w-[30ch] text-sm leading-relaxed text-foam/70 md:col-span-5 md:text-base">
          Placeholder closing note. Tell people where to go next — swap this
          text and the link columns in the code.
        </p>
        <div className="grid grid-cols-2 gap-8 md:col-span-7 md:justify-items-end">
          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-foam/50 md:text-xs">
                {column.heading}
              </p>
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-300 hover:text-fizz md:text-base"
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

      <a
        href={`mailto:${email}`}
        className="group relative block"
        aria-label={email}
      >
        <span
          data-splash-word
          className="block font-brico text-[clamp(3rem,13vw,11rem)] leading-[0.9] font-extrabold tracking-[-0.03em] whitespace-nowrap uppercase"
        >
          {ctaWord}
          <span aria-hidden="true">!</span>
        </span>
      </a>

      <div className="relative mt-10 flex flex-col gap-2 border-t border-foam/20 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-foam/50 md:flex-row md:items-baseline md:justify-between md:text-xs">
        <p>{legal}</p>
        <a
          href="#top"
          className="transition-colors duration-300 hover:text-fizz"
        >
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}

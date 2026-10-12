import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { lab, lounge, paint, road, studio, wheel, variants } from './assets/images'

/**
 * APEX — Models
 *
 * The range as one list of names set at poster scale. With a mouse, the name
 * under the pointer is the only one at full strength and its picture sits in
 * the square on the right; on a phone there is no hover, so the name that
 * crosses the middle of the screen takes over. Light panel on purpose: it is
 * the page's visual break between two dark sections.
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

const DEFAULT_ITEMS = [
  { name: 'Model 1', image: studio, href: '#contact' },
  { name: 'Model 2', image: wheel, href: '#contact' },
  { name: 'Model 3', image: road, href: '#contact' },
  { name: 'Model 4', image: lounge, href: '#contact' },
  { name: 'Model 5', image: lab, href: '#contact' },
  { name: 'Model 6', image: paint, href: '#contact' },
]

export default function Models({
  eyebrow = 'Section label',
  index = '03',
  caption = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  items,
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const listRef = useRef(null)
  const [follow, setFollow] = useState(0)
  const reduced = typeof window !== 'undefined' && prefersReducedMotion()

  const edited = Array.isArray(items)
    ? items.map((s, i) => ({ name: s?.name || '', image: s?.image || DEFAULT_ITEMS[i]?.image || DEFAULT_ITEMS[0].image, href: s?.href || '#contact' })).filter((s) => s.name)
    : []
  const list = edited.length ? edited : DEFAULT_ITEMS

  // The square follows the active name down the column (no `sticky`: a hosted
  // widget would read that as a pinned section).
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    const place = () => {
      const li = list.children[active]
      if (li) setFollow(li.offsetTop - list.offsetTop + li.offsetHeight / 2)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active, list.length])

  // A phone has no hover: the name crossing the middle of the screen is the active one.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.i))
        })
      },
      { rootMargin: '-44% 0px -44% 0px' },
    )
    root.querySelectorAll('[data-model]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [list.length])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root || reduced) return undefined
      gsap.fromTo(
        '[data-apex-rise]',
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: root, start: 'top 72%', once: true } },
      )
      return undefined
    },
    { scope: rootRef, dependencies: [reduced] },
  )

  const vars = { '--md-bg': bg || '#e6eaf1', '--md-fg': fg || '#04070d', '--md-accent': accent || '#2f6bff' }

  return (
    <section
      ref={rootRef}
      id="models"
      className="apex-models relative isolate px-[5vw] py-[clamp(4rem,12svh,9rem)] md:px-[2.4vw]"
      style={{ ...vars, background: 'var(--md-bg)', color: 'var(--md-fg)' }}
    >
      <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-[1.6vw]">
        <p data-apex-rise className="flex items-baseline gap-4 text-[11px] tracking-[0.16em] uppercase md:col-span-3 lg:text-[max(10px,0.6vw)]" style={LABEL}>
          <span className="tabular-nums opacity-50">({index})</span>
          <span>{eyebrow}</span>
        </p>
        <p data-apex-rise className="max-w-[34ch] text-[11px] leading-[1.5] tracking-[0.12em] uppercase opacity-70 md:col-span-4 md:col-start-9 lg:text-[max(10px,0.6vw)]" style={LABEL}>
          {caption}
        </p>

        <ul
          ref={listRef}
          className="apex-model-list flex flex-col md:col-span-8 md:mt-[4vw]"
          style={DISPLAY}
          onPointerLeave={() => setHover(false)}
        >
          {list.map((m, i) => (
            <li key={`${m.name}-${i}`} data-apex-rise className="relative">
              <a
                href={m.href}
                data-model
                data-i={i}
                data-active={i === active ? 'true' : 'false'}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') {
                    setHover(true)
                    setActive(i)
                  }
                }}
                onFocus={() => setActive(i)}
                className="apex-model tpl-hit relative block py-[0.04em] text-[clamp(2rem,9.5vw,2.6rem)] md:text-[clamp(2.7rem,8.6vw,9rem)] leading-[0.98] font-medium tracking-[-0.045em]"
              >
                {m.name}
              </a>
              {/* Phones: the active name carries its own small picture. */}
              <span aria-hidden="true" className="apex-model-thumb pointer-events-none absolute top-1/2 right-0 aspect-square w-[24vw] -translate-y-1/2 overflow-hidden md:hidden" data-active={i === active ? 'true' : 'false'}>
                <img {...imgAttrs(m.image, variants)} sizes="24vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </span>
            </li>
          ))}
        </ul>

        <div className="hidden md:col-span-3 md:col-start-10 md:mt-[4vw] md:block" aria-hidden="true">
          <div
            className="apex-model-pic relative aspect-square w-full overflow-hidden"
            data-hover={hover ? 'true' : 'false'}
            style={{ transform: `translateY(max(0px, calc(${follow}px - 50%)))`, transition: 'transform 700ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))' }}
          >
            {list.map((m, i) => (
              <img
                key={`${m.name}-${i}`}
                {...imgAttrs(m.image, variants)}
                sizes="(min-width: 768px) 26vw, 58vw"
                alt=""
                loading="lazy"
                decoding="async"
                data-active={i === active ? 'true' : 'false'}
                className="apex-model-img absolute inset-0 h-full w-full object-cover"
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .apex-model { opacity: 0.2; transition: opacity 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        .apex-model[data-active='true'] { opacity: 1; }
        .apex-model-img { opacity: 0; transform: scale(1.08); transition: opacity 520ms var(--ease-out, ease), transform 900ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        .apex-model-img[data-active='true'] { opacity: 1; transform: scale(1); }
        .apex-model-thumb { opacity: 0; transition: opacity 360ms var(--ease-out, ease); }
        .apex-model-thumb[data-active='true'] { opacity: 1; }
        .apex-model:focus-visible { outline: 2px solid var(--md-accent); outline-offset: 4px; opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .apex-model,
          :where(:root:not([data-motion='full'])) .apex-model-img,
          :where(:root:not([data-motion='full'])) .apex-model-pic,
          :where(:root:not([data-motion='full'])) .apex-model-thumb { transition: none; }
        }
      `}</style>
    </section>
  )
}

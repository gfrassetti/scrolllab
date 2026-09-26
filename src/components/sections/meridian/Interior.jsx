import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * MERIDIAN — Interior (link menu → mask slider with hotspots)
 *
 * Full-viewport slider driven by a big list of links instead of arrows or
 * scroll: clicking a link plays the same "mask" push/stretch transition as
 * GallerySlider (see docs/motion-cookbook.md, P16). Every slide carries
 * pulsing "+" hotspots absolutely positioned on the photo; clicking one
 * opens a small dark tooltip anchored to it.
 *
 * What the builder edits: the link labels (and each slide's photo). What it
 * deliberately does NOT edit: how many hotspots a slide has and where they
 * sit — they are placed on specific spots of a specific photo, so they live
 * in SLIDE_DATA below and change with the code, not with a form.
 *
 * Mobile is a different layout (verified on the reference): the paragraph
 * and the link list move ABOVE the slider, and the slider drops to a
 * compact portrait frame.
 *
 * REPLACE ME: the demo photos are exteriors/renders — swap them (and the
 * SLIDE_DATA coordinates) for your interior shots.
 */

const DEFAULT_LINKS = [
  { label: 'Category 1', img: '/meridian/gallery/01.webp' },
  { label: 'Category 2', img: '/meridian/gallery/02.webp' },
  { label: 'Category 3', img: '/meridian/gallery/03.webp' },
  { label: 'Category 4', img: '/meridian/gallery/04.webp' },
  { label: 'Category 5', img: '/meridian/gallery/05.webp' },
  { label: 'Category 6', img: '/meridian/gallery/06.webp' },
]

const BODY = '[Short description of this feature — replace with your own copy.]'
const spot = (x, y, n) => ({ x, y, title: `Feature ${n}`, body: BODY })

// Per-slide copy + hotspot positions (% of the slide). Intentionally uneven:
// 3, 4, 1, 2, 3, 2 hotspots; some slides have a paragraph, some don't.
const SLIDE_DATA = [
  {
    text: '[Short paragraph about this category. Replace with your own copy.]',
    spots: [spot(8, 12, 1), spot(80, 12, 2), spot(78, 78, 3)],
  },
  { text: '', spots: [spot(22, 30, 1), spot(58, 22, 2), spot(72, 54, 3), spot(34, 72, 4)] },
  {
    text: '[Short paragraph about this category. Replace with your own copy.]',
    spots: [spot(50, 46, 1)],
  },
  { text: '', spots: [spot(30, 40, 1), spot(70, 66, 2)] },
  {
    text: '[Short paragraph about this category. Replace with your own copy.]',
    spots: [spot(15, 62, 1), spot(48, 30, 2), spot(82, 42, 3)],
  },
  { text: '', spots: [spot(62, 26, 1), spot(26, 70, 2)] },
]

const INK = '#2a2622'

function Links({ links, index, onPick, tone }) {
  const dark = tone === 'dark'
  return (
    <ul className="m-0 flex list-none flex-col items-start p-0">
      {links.map((l, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => onPick(i)}
            aria-current={i === index}
            className="mer-int-link block text-left uppercase"
            data-active={i === index}
            data-tone={dark ? 'dark' : 'light'}
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
          >
            {l.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Interior({ links }) {
  const valid = links?.filter((l) => l?.label || l?.img)
  const list = (valid?.length ? valid : DEFAULT_LINKS).slice(0, SLIDE_DATA.length)
  const n = list.length

  const stage = useRef(null)
  const boxes = useRef([])
  const inners = useRef([])
  const pos = useRef({ v: 0 })
  const tween = useRef(null)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(null) // spot index inside the current slide

  const layout = (p) => {
    const w = stage.current?.clientWidth || window.innerWidth
    for (let i = 0; i < n; i += 1) {
      const box = boxes.current[i]
      const inner = inners.current[i]
      if (!box || !inner) continue
      const d = i - p
      const a = Math.abs(d)
      if (a >= 1.001) {
        box.style.visibility = 'hidden'
        continue
      }
      box.style.visibility = 'visible'
      box.style.transform = `translate3d(${d * 100}%,0,0)`
      inner.style.transformOrigin = d > 0 ? 'left center' : 'right center'
      inner.style.transform = `translate3d(${-d * (w / 2)}px,0,0) scale(${1 + 1.2 * a}, ${1 + 0.2 * a})`
    }
  }

  const goTo = (i) => {
    if (i === index) return
    setOpen(null)
    setIndex(i)
    tween.current?.kill()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pos.current.v = i
      layout(i)
      return
    }
    tween.current = gsap.to(pos.current, {
      v: i,
      duration: 1.3,
      ease: 'power3.inOut',
      onUpdate: () => layout(pos.current.v),
    })
  }

  useGSAP(
    () => {
      layout(pos.current.v)
      const onResize = () => layout(pos.current.v)
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
        tween.current?.kill()
      }
    },
    { scope: stage, dependencies: [n] },
  )

  // click anywhere outside a hotspot / tooltip closes the tooltip
  useEffect(() => {
    if (open == null) return undefined
    const close = (e) => {
      if (e.target.closest('[data-mer-spot], [data-mer-tip]')) return
      setOpen(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const data = SLIDE_DATA[index]
  const tip = open != null ? data.spots[open] : null
  const flip = tip && tip.x > 55

  return (
    <section id="interior" className="relative bg-[#dfd8cf] text-[#2a2622]">
      <div className="flex flex-col md:block md:h-svh">
        {/* mobile: paragraph + links sit above the slider */}
        <div className="px-6 pt-10 pb-6 md:hidden">
          <p
            key={index}
            className="mer-int-fade mb-5 min-h-[3.2rem] text-[11px] leading-[1.35] uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {data.text}
          </p>
          <Links links={list} index={index} onPick={goTo} tone="dark" />
        </div>

        <div ref={stage} className="relative h-[68svh] overflow-hidden md:h-full">
          {list.map((l, i) => (
            <div
              key={i}
              ref={(el) => (boxes.current[i] = el)}
              className="absolute inset-0 overflow-hidden"
              style={{ visibility: i === 0 ? 'visible' : 'hidden' }}
              aria-hidden={i !== index}
            >
              <div
                ref={(el) => (inners.current[i] = el)}
                className="absolute inset-0 will-change-transform"
              >
                <img
                  src={l.img}
                  alt=""
                  draggable={false}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  className="pointer-events-none h-full w-full object-cover"
                />
              </div>
              {SLIDE_DATA[i].spots.map((s, k) => (
                <button
                  key={k}
                  type="button"
                  data-mer-spot
                  aria-label={s.title}
                  aria-expanded={i === index && open === k}
                  tabIndex={i === index ? 0 : -1}
                  className="mer-spot absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                  data-open={i === index && open === k}
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  onClick={() => setOpen(open === k ? null : k)}
                >
                  <span aria-hidden="true" className="mer-spot-ring" />
                  <span aria-hidden="true" className="mer-spot-ring mer-spot-ring-2" />
                  <svg
                    className="mer-spot-plus relative m-auto"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M8 2v12M2 8h12" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              ))}
            </div>
          ))}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden md:block"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.38), rgba(0,0,0,0) 55%), linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0) 40%)',
            }}
          />

          {tip && (
            <div
              key={`${index}-${open}`}
              data-mer-tip
              role="dialog"
              aria-label={tip.title}
              className="mer-tip absolute z-20 w-[250px] bg-[#2a2622] p-5 text-[#f0eae0] md:w-[300px] md:p-6"
              style={{
                top: `calc(${tip.y}% - 24px)`,
                ...(flip
                  ? { right: `calc(${100 - tip.x}% + 34px)`, transformOrigin: 'right top' }
                  : { left: `calc(${tip.x}% + 34px)`, transformOrigin: 'left top' }),
              }}
            >
              <span
                aria-hidden="true"
                className="absolute top-[18px] h-3.5 w-3.5 rotate-45 bg-[#2a2622]"
                style={flip ? { right: '-7px' } : { left: '-7px' }}
              />
              <h4
                className="text-[1.5rem] leading-[1.1] md:text-[1.9rem]"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
              >
                {tip.title}
              </h4>
              <p
                className="mt-8 text-[11px] leading-[1.4] uppercase md:mt-12"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {tip.body}
              </p>
            </div>
          )}

          {/* desktop: links bottom-left over the photo, paragraph bottom-right */}
          <div className="absolute bottom-14 left-16 z-10 hidden md:block">
            <Links links={list} index={index} onPick={goTo} tone="light" />
          </div>
          {data.text && (
            <p
              key={index}
              className="mer-int-fade absolute right-16 bottom-16 z-10 hidden max-w-[22rem] text-[12px] leading-[1.4] text-white/90 uppercase md:block"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {data.text}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .mer-int-link { font-size: clamp(2rem, 3.6vw, 3.6rem); line-height: 1.05; padding: 0; background: none; border: 0; cursor: pointer; border-bottom: 1px solid transparent; transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.5s ease; }
        .mer-int-link[data-tone="light"] { color: #fff; }
        .mer-int-link[data-tone="dark"] { color: ${INK}; font-size: 2rem; }
        .mer-int-link[data-active="false"] { opacity: 0.45; border-bottom-color: currentColor; }
        .mer-int-link[data-active="false"]:hover { opacity: 0.85; }
        .mer-int-link[data-active="true"] { opacity: 1; }

        .mer-spot { display: flex; box-shadow: 0 0 0 6px rgba(255,255,255,0.28); transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-spot:hover { transform: scale(1.08); }
        .mer-spot-ring { position: absolute; inset: 0; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.7); animation: mer-spot-ping 2.6s cubic-bezier(0.22, 1, 0.36, 1) infinite; pointer-events: none; }
        .mer-spot-ring-2 { animation-delay: 1.3s; }
        @keyframes mer-spot-ping { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(2.1); opacity: 0; } }
        .mer-spot-plus { transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-spot[data-open="true"] .mer-spot-plus { transform: rotate(45deg); }

        .mer-tip { animation: mer-tip-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes mer-tip-in { from { opacity: 0; transform: scale(0.94) translateY(6px); } to { opacity: 1; transform: none; } }
        .mer-int-fade { animation: mer-int-fade 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both; }
        @keyframes mer-int-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mer-spot-ring, .mer-tip, .mer-int-fade { animation: none; } }
      `}</style>
    </section>
  )
}

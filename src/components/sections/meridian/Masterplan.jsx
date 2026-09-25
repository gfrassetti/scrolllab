import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * MERIDIAN — Masterplan (aerial photo + hoverable units)
 *
 * A full-width aerial photo with numbered dots that pulse (two rings
 * ping outward). Hovering a dot removes it and draws the outline of that
 * property in white over the photo, with a tooltip anchored to the spot:
 * bedrooms / bathrooms, area, and the unit name in big serif.
 *
 * Geometry: the photo, the outlines and the dots share one box with the
 * photo's own aspect ratio (16:9), and everything is placed in that
 * photo's pixel space (viewBox 1280×720) — so overlays can never drift
 * from the image. On narrow screens the box keeps a 1000px minimum and the
 * band scrolls sideways.
 *
 * Touch has no hover: a tap opens a unit, another tap (or tapping the
 * photo) closes it. Where the band scrolls sideways (< 1000px) a thin
 * progress bar sits along the bottom and two floating arrows hint at, and
 * drive, the scroll.
 *
 * REPLACE ME: public/meridian/gallery/masterplan.webp is a demo aerial. If
 * you swap it, redraw OUTLINES / DOTS below on your own plots (image pixel
 * coordinates). The builder edits the unit texts, not the geometry.
 */

const IMG_W = 1280
const IMG_H = 720

// Property outlines and their pulse dots, in image pixels. One per unit.
const OUTLINES = [
  'M148 380 L190 340 L335 322 L410 365 L405 395 L265 440 L150 400 Z',
  'M255 440 L410 392 L560 380 L565 415 L480 470 L350 520 L250 470 Z',
  'M478 415 L540 395 L790 398 L850 440 L830 495 L690 560 L600 555 L480 505 Z',
  'M825 430 L915 412 L1100 415 L1180 505 L1140 575 L900 600 L825 570 Z',
  'M515 290 L630 282 L795 295 L790 340 L690 360 L515 335 Z',
  'M798 300 L895 292 L985 312 L995 345 L940 380 L800 372 Z',
  'M995 240 L1200 232 L1280 240 L1280 295 L1100 300 L995 278 Z',
  'M65 265 L245 260 L245 285 L70 295 Z',
]
const DOTS = [
  [285, 380],
  [405, 440],
  [655, 470],
  [1000, 505],
  [655, 325],
  [890, 338],
  [1130, 266],
  [150, 280],
]

const DEFAULT_UNITS = OUTLINES.map((_, i) => ({
  name: `Unit ${i + 1}`,
  line1: '[N] bedrooms, [N] bathrooms',
  line2: '[000.00] m²',
}))

const INK = '#2a2622'
const SAND = '#dfd8cf'

export default function Masterplan({ units }) {
  const valid = units?.filter((u) => u?.name || u?.line1)
  const list = (valid?.length ? valid : DEFAULT_UNITS).slice(0, OUTLINES.length)

  const scroller = useRef(null)
  const paths = useRef([])
  const [active, setActive] = useState(null)
  const leaveTimer = useRef(null)

  const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

  useGSAP(
    () => {
      // real path lengths (not pathLength=1): GSAP snaps sub-unit dash
      // offsets, so a 0→1 draw-on jumps instead of tracing
      gsap.set(paths.current.filter(Boolean), {
        strokeDasharray: (_, el) => el.getTotalLength(),
        strokeDashoffset: (_, el) => el.getTotalLength(),
        fillOpacity: 0,
      })
    },
    { scope: scroller },
  )

  const barRef = useRef(null)
  const [edge, setEdge] = useState({ left: false, right: true })

  // on narrow screens start centred in the wide band, and keep the
  // progress bar + arrow visibility in sync with the scroll position
  useEffect(() => {
    const el = scroller.current
    if (!el) return undefined
    if (el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    const sync = () => {
      const max = el.scrollWidth - el.clientWidth
      const w = Math.min(1, el.clientWidth / el.scrollWidth)
      const x = max > 0 ? (el.scrollLeft / max) * (1 - w) : 0
      if (barRef.current) {
        barRef.current.style.width = `${w * 100}%`
        barRef.current.style.left = `${x * 100}%`
      }
      setEdge({ left: el.scrollLeft > 8, right: el.scrollLeft < max - 8 })
    }
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  const nudge = (dir) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' })
  }

  const drawn = useRef(new Set())
  const setOutline = (i, on) => {
    const p = paths.current[i]
    if (!p) return
    if (on) drawn.current.add(i)
    else drawn.current.delete(i)
    gsap.killTweensOf(p)
    gsap.to(p, {
      strokeDashoffset: on ? 0 : p.getTotalLength(),
      fillOpacity: on ? 0.1 : 0,
      duration: on ? 0.9 : 0.45,
      ease: on ? 'power2.inOut' : 'power2.out',
    })
  }

  const activate = (i) => {
    window.clearTimeout(leaveTimer.current)
    if (i === active) return
    if (active != null) setOutline(active, false)
    setOutline(i, true)
    setActive(i)
  }
  const clearAll = () => {
    drawn.current.forEach((i) => setOutline(i, false))
    setActive(null)
  }
  const deactivate = () => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(clearAll, 100)
  }

  const tap = (i) => {
    if (!canHover() && active === i) clearAll()
    else activate(i)
  }

  const tip = active != null ? DOTS[active] : null
  const flip = tip && tip[0] / IMG_W > 0.6

  return (
    <section id="masterplan" className="relative bg-[#2a2622]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-5 z-20 h-[2px] bg-white/35 min-[1000px]:hidden"
      >
        <span ref={barRef} className="absolute top-0 h-full bg-white" style={{ width: '30%' }} />
      </div>
      {[-1, 1].map((dir) => (
        <button
          key={dir}
          type="button"
          aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'}
          onClick={() => nudge(dir)}
          className="mer-mp-arrow absolute top-1/2 z-20 -mt-5 flex h-10 w-10 items-center justify-center rounded-full min-[1000px]:hidden"
          data-show={dir < 0 ? edge.left : edge.right}
          style={dir < 0 ? { left: '12px', '--dir': -1 } : { right: '12px', '--dir': 1 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ transform: dir < 0 ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
      <div ref={scroller} className="mer-mp-scroll overflow-x-auto">
        <div
          className="relative w-full min-w-[1000px]"
          style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
          onClick={(e) => {
            if (!canHover() && !e.target.closest('[data-mp-dot], [data-mp-tip]')) clearAll()
          }}
        >
          <img
            src="/meridian/gallery/masterplan.webp"
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0) 40%)' }}
          />
          <svg
            viewBox={`0 0 ${IMG_W} ${IMG_H}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {OUTLINES.slice(0, list.length).map((d, i) => (
              <path
                key={i}
                ref={(el) => (paths.current[i] = el)}
                d={d}
                fill="#fff"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {DOTS.slice(0, list.length).map(([x, y], i) => (
            <button
              key={i}
              type="button"
              data-mp-dot
              data-active={active === i}
              aria-label={list[i].name}
              className="mer-mp-dot absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${(x / IMG_W) * 100}%`, top: `${(y / IMG_H) * 100}%` }}
              onMouseEnter={() => canHover() && activate(i)}
              onMouseLeave={() => canHover() && deactivate()}
              onFocus={() => canHover() && activate(i)}
              onBlur={() => canHover() && deactivate()}
              onClick={() => tap(i)}
            >
              <span className="mer-mp-vis">
                <span aria-hidden="true" className="mer-mp-ring" />
                <span aria-hidden="true" className="mer-mp-ring mer-mp-ring-2" />
                <span
                  className="relative m-auto text-[12px]"
                  style={{ fontFamily: "'Space Mono', monospace", color: INK }}
                >
                  {i + 1}
                </span>
              </span>
            </button>
          ))}

          {tip && (
            <div
              key={active}
              data-mp-tip
              role="dialog"
              aria-label={list[active].name}
              className="mer-mp-tip pointer-events-none absolute z-10 flex h-[150px] w-[240px] flex-col justify-between p-5 md:h-[170px] md:w-[290px] md:p-6"
              style={{
                top: `calc(${(tip[1] / IMG_H) * 100}% - 20px)`,
                background: SAND,
                color: INK,
                ...(flip
                  ? { right: `calc(${100 - (tip[0] / IMG_W) * 100}% + 30px)`, transformOrigin: 'right top' }
                  : { left: `calc(${(tip[0] / IMG_W) * 100}% + 30px)`, transformOrigin: 'left top' }),
              }}
            >
              <span
                aria-hidden="true"
                className="absolute top-[14px] h-3.5 w-3.5 rotate-45"
                style={{ background: SAND, ...(flip ? { right: '-7px' } : { left: '-7px' }) }}
              />
              <p
                className="text-[11px] leading-[1.5] uppercase md:text-[12px]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {list[active].line1}
                <span className="block opacity-50">{list[active].line2}</span>
              </p>
              <p
                className="self-end text-[2rem] leading-none uppercase md:text-[2.4rem]"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
              >
                {list[active].name}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .mer-mp-arrow { color: #fff; background: rgba(42, 38, 34, 0.45); border: 1px solid rgba(255, 255, 255, 0.55); backdrop-filter: blur(4px); opacity: 0; pointer-events: none; transition: opacity 0.4s ease; }
        .mer-mp-arrow[data-show="true"] { opacity: 1; pointer-events: auto; animation: mer-mp-nudge 2.2s ease-in-out infinite; }
        @keyframes mer-mp-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(calc(var(--dir) * 3px)); } }
        @media (prefers-reduced-motion: reduce) { .mer-mp-arrow[data-show="true"] { animation: none; } }
        .mer-mp-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .mer-mp-scroll::-webkit-scrollbar { display: none; }

        .mer-mp-vis { position: absolute; inset: 0; display: flex; border-radius: 9999px; background: #fff; box-shadow: 0 0 0 5px rgba(255,255,255,0.28); transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease; }
        .mer-mp-dot[data-active="true"] .mer-mp-vis { transform: scale(0); opacity: 0; }
        .mer-mp-ring { position: absolute; inset: 0; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.75); animation: mer-mp-ping 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite; pointer-events: none; }
        .mer-mp-ring-2 { animation-delay: 1.4s; }
        @keyframes mer-mp-ping { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(2.3); opacity: 0; } }

        .mer-mp-tip { animation: mer-mp-tip-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes mer-mp-tip-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .mer-mp-ring, .mer-mp-tip { animation: none; } }
      `}</style>
    </section>
  )
}

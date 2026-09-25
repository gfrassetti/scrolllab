import { useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'
import { useLang } from './lang'

/**
 * MERIDIAN — Location (interactive map + distance cards)
 *
 * Structure read off the reference's "infrastructure" section:
 *
 *   section (overflow hidden)
 *   ├─ map layer  — one parent box: the map IMAGE, the HQ monogram, one
 *   │               dotted route per pin (HQ → pin) and the pin buttons,
 *   │               all positioned in the map's own coordinate space (%)
 *   ├─ header     — big serif title (connector words drop to small caps),
 *   │               CTA, location label
 *   └─ cards      — draggable row, one small card per pin
 *
 * Parallax: the map, the header and the cards each scrub on their own
 * offset as the section passes, so all three slide against each other
 * (reference: `.infrastructure-bg` is translated by scroll).
 *
 * Interaction — one `active` index drives everything:
 *   - desktop: hover a pin → its route is laid HQ → pin one dot at a time,
 *     the pin fills from the centre outward, the card row scrolls to that
 *     card and the card reveals its photo. Leaving takes the dots away
 *     again, last dot first.
 *   - touch: there is no hover, so the same thing happens on tap; the
 *     active card grows tall (the rest stay small) and shows a × to close
 *     it, and the map pans to centre the pin.
 *   - card reveal: a circle grows from the pin button in the card's corner
 *     (clip-path) and uncovers the photo; the title turns white. Leaving
 *     collapses the circle inward, uncovering the number again.
 *
 * REPLACE ME: public/meridian/map/map.webp is a generated map (soft sea,
 * coast, topographic contours) and the card photos reuse hero frames. Swap
 * the image for your own map (keep the 1440×832 aspect, or edit
 * MAP_W/MAP_H) and move PINS onto your own geography. Pass your photos
 * through the `places` prop.
 */

const MAP_W = 1440
const MAP_H = 832
const HQ = [735, 520]

// Pin positions in map units (x, y) — on land, just inland of the coast.
// One card per pin, same order.
const PINS = [
  [110, 505],
  [230, 545],
  [325, 470],
  [430, 505],
  [530, 520],
  [620, 470],
  [840, 450],
  [940, 500],
  [1040, 470],
  [1140, 525],
  [1240, 455],
  [1335, 500],
]

const frame = (n) => `/meridian/hero/seq/${String(n).padStart(4, '0')}.webp`

// unitKey resolves through the language dictionary at render time
const DEFAULT_PLACES = [
  ['5', 'minDrive', 'Location 1', 8],
  ['10', 'minDrive', 'Location 2', 28],
  ['12', 'minDrive', 'Location 3', 48],
  ['15', 'minDrive', 'Location 4', 68],
  ['20', 'minDrive', 'Location 5', 88],
  ['25', 'minDrive', 'Location 6', 108],
  ['30', 'minDrive', 'Location 7', 128],
  ['35', 'minDrive', 'Location 8', 148],
  ['40', 'minDrive', 'Location 9', 168],
  ['45', 'minDrive', 'Location 10', 188],
  ['1', 'hourDrive', 'Location 11', 208],
  ['70', 'minDrive', 'Location 12', 228],
].map(([distance, unitKey, title, f]) => ({ distance, unitKey, title, img: frame(f) }))

const SMALL_WORDS = new Set([
  'between', 'and', 'on', 'the', 'of', 'in', 'at', 'by', 'to', 'from', 'near', 'with', 'a',
])

const INK = '#2a2622'
const LAND = '#dfd8cf'
const DOT_GAP = 9

// HQ → pin: a shallow quadratic arc, bowed to one side, sampled into dots
function dotsFor([px, py], i) {
  const [hx, hy] = HQ
  const mx = (hx + px) / 2
  const my = (hy + py) / 2
  const dx = px - hx
  const dy = py - hy
  const len = Math.hypot(dx, dy) || 1
  const bow = (i % 2 ? 1 : -1) * Math.min(60, len * 0.16)
  const cx = mx + (-dy / len) * bow
  const cy = my + (dx / len) * bow
  const at = (t) => [
    (1 - t) * (1 - t) * hx + 2 * (1 - t) * t * cx + t * t * px,
    (1 - t) * (1 - t) * hy + 2 * (1 - t) * t * cy + t * t * py,
  ]
  const steps = 240
  const pts = [at(0)]
  const cum = [0]
  for (let s = 1; s <= steps; s += 1) {
    const p = at(s / steps)
    const q = pts[pts.length - 1]
    pts.push(p)
    cum.push(cum[cum.length - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]))
  }
  const total = cum[cum.length - 1]
  const dots = []
  let k = 0
  for (let d = 34; d < total - 14; d += DOT_GAP) {
    while (cum[k] < d) k += 1
    dots.push(pts[k])
  }
  return dots
}

const DOTS = PINS.map(dotsFor)

function PinIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="4.6" r="3.1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 7.9V14.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2 12 12M12 2 2 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export default function Location({
  title = 'Prime location between [Area One], [Area Two], and [Area Three] on the picturesque coastline of [Country]',
  ctaLabel,
  ctaHref = '#',
  location = '[Region], [Country]',
  places,
}) {
  const { t } = useLang()
  const valid = places?.filter((p) => p?.title || p?.img)
  const list = (valid?.length ? valid : DEFAULT_PLACES)
    .slice(0, PINS.length)
    .map((p) => ({ ...p, unit: p.unit ?? t(p.unitKey || 'minDrive') }))

  const root = useRef(null)
  const bgRef = useRef(null)
  const panRef = useRef(null)
  const headRef = useRef(null)
  const titleRef = useRef(null)
  const cardsRef = useRef(null)
  const trackRef = useRef(null)
  const cursorRef = useRef(null)
  const dotGroups = useRef([])
  const cardEls = useRef([])
  const leaveTimer = useRef(null)
  const drawn = useRef(new Set())
  const [active, setActive] = useState(null)

  const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      dotGroups.current.forEach((g) => {
        if (g) gsap.set(g.querySelectorAll('circle'), { attr: { r: 0 }, opacity: 0 })
      })
      if (reduced) return

      // three layers, three different offsets → they slide against each other
      const scrub = { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true }
      gsap.fromTo(bgRef.current, { y: -60 }, { y: 120, ease: 'none', scrollTrigger: scrub })
      gsap.fromTo(headRef.current, { y: 80 }, { y: -80, ease: 'none', scrollTrigger: scrub })
      gsap.fromTo(cardsRef.current, { y: 90 }, { y: -30, ease: 'none', scrollTrigger: scrub })

      const split = new SplitText(titleRef.current, { type: 'chars' })
      gsap.set(split.chars, { opacity: 0, yPercent: 30, filter: 'blur(6px)' })
      gsap.to(split.chars, {
        opacity: 1,
        yPercent: 0,
        filter: 'blur(0px)',
        duration: 1.6,
        stagger: 0.018,
        ease: 'power2.out',
        scrollTrigger: { trigger: titleRef.current, start: 'top 82%', once: true },
      })
      ScrollTrigger.refresh()
    },
    { scope: root, dependencies: [title], revertOnUpdate: true },
  )

  // Lay the route down one dot at a time (first dot nearest the HQ);
  // take it away in reverse, last dot first.
  const setPath = (i, on) => {
    const g = dotGroups.current[i]
    if (!g) return
    const dots = g.querySelectorAll('circle')
    if (on) drawn.current.add(i)
    else drawn.current.delete(i)
    gsap.killTweensOf(dots)
    gsap.to(dots, {
      attr: { r: on ? 1.9 : 0 },
      opacity: on ? 1 : 0,
      duration: on ? 0.32 : 0.2,
      ease: on ? 'back.out(3)' : 'power1.in',
      stagger: { amount: on ? 1.5 : 0.7, from: on ? 'start' : 'end' },
    })
  }

  const panToPin = (i) => {
    if (!isMobile() || !panRef.current || !bgRef.current) return
    const mapW = bgRef.current.offsetWidth
    const vw = root.current.clientWidth
    const max = Math.max(0, (mapW - vw) / 2)
    const target =
      i == null ? 0 : Math.max(-max, Math.min(max, -(PINS[i][0] / MAP_W - 0.5) * mapW))
    gsap.to(panRef.current, { x: target, duration: 1.1, ease: 'power3.out' })
  }

  const activate = (i, { scroll = false } = {}) => {
    window.clearTimeout(leaveTimer.current)
    if (i !== active) {
      if (active != null) setPath(active, false)
      setPath(i, true)
      setActive(i)
      panToPin(i)
    }
    if (scroll) {
      const card = cardEls.current[i]
      const track = trackRef.current
      if (card && track) track.scrollTo({ left: card.offsetLeft - 24, behavior: 'smooth' })
    }
  }

  const clearAll = () => {
    drawn.current.forEach((i) => setPath(i, false))
    setActive(null)
    panToPin(null)
  }

  const deactivate = () => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(clearAll, 90)
  }

  // mouse: hover drives it. touch: tap toggles it.
  const hoverIn = (i, scroll) => canHover() && activate(i, { scroll })
  const hoverOut = () => canHover() && deactivate()
  const tap = (i, scroll) => {
    if (!canHover() && active === i) {
      clearAll()
      return
    }
    activate(i, { scroll })
  }

  // mouse drag-scroll for the card row (touch already scrolls natively)
  const drag = useRef({ down: false, x: 0, left: 0 })
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    drag.current = { down: true, x: e.clientX, left: trackRef.current.scrollLeft }
  }
  const onPointerMove = (e) => {
    const c = cursorRef.current
    if (c && e.pointerType === 'mouse') {
      c.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`
    }
    const d = drag.current
    if (!d.down) return
    trackRef.current.scrollLeft = d.left - (e.clientX - d.x)
  }
  const endDrag = () => {
    drag.current.down = false
  }

  return (
    <section
      ref={root}
      id="location"
      className="relative overflow-hidden bg-[#dfd8cf] text-[#2a2622]"
      style={{ minHeight: 'calc(100svh + 9rem)' }}
    >
      {/* MAP — one parent: image + monogram + routes + pins share coordinates */}
      <div
        ref={bgRef}
        className="absolute top-0 left-1/2 -translate-x-1/2 will-change-transform max-md:top-[200px]"
        style={{ width: 'max(100%, 1100px)', aspectRatio: `${MAP_W} / ${MAP_H}` }}
      >
        <div ref={panRef} className="absolute inset-0">
          <img
            src="/meridian/map/map.webp"
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {DOTS.slice(0, list.length).map((dots, i) => (
              <g key={i} ref={(el) => (dotGroups.current[i] = el)} fill={INK}>
                {dots.map(([x, y], k) => (
                  <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="0" />
                ))}
              </g>
            ))}
            <g transform={`translate(${HQ[0]} ${HQ[1]})`}>
              <circle r="28" fill={LAND} fillOpacity="0.55" stroke={INK} strokeWidth="1.6" />
              <text
                y="11"
                textAnchor="middle"
                fontFamily="'Fraunces', serif"
                fontSize="32"
                fill={INK}
              >
                M
              </text>
            </g>
          </svg>
          {PINS.slice(0, list.length).map(([x, y], i) => (
            <button
              key={i}
              type="button"
              aria-label={`${list[i].title} — ${list[i].distance} ${list[i].unit}`}
              data-active={active === i}
              className="mer-pin absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` }}
              onMouseEnter={() => hoverIn(i, true)}
              onMouseLeave={hoverOut}
              onFocus={() => hoverIn(i, true)}
              onBlur={hoverOut}
              onClick={() => tap(i, true)}
            >
              <span className="mer-pin-fill absolute inset-0 rounded-full" />
              <span className="relative flex h-full w-full items-center justify-center">
                <PinIcon />
              </span>
              <span className="mer-pin-label">{list[i].title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* HEADER — title, CTA, location label */}
      <div ref={headRef} className="pointer-events-none relative z-10 px-5 pt-28 md:px-16 md:pt-36">
        <h2
          ref={titleRef}
          className="pointer-events-none max-w-[46rem] text-[clamp(2.2rem,4.6vw,4.4rem)] leading-[1] tracking-[-0.02em] uppercase"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
        >
          {title.split(/(\s+)/).map((w, i) => {
            if (!w.trim()) return w
            const small = SMALL_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ''))
            return small ? (
              <span key={i} className="text-[0.42em] tracking-normal">
                {w}
              </span>
            ) : (
              <span key={i}>{w}</span>
            )
          })}
        </h2>
        <a
          href={ctaHref}
          className="mer-cta pointer-events-auto relative mt-8 inline-flex items-center overflow-hidden rounded-[4px] px-5 py-3 text-[12px] uppercase tracking-[0.14em]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <span aria-hidden="true" className="mer-cta-fill absolute inset-0" />
          <span className="relative">{ctaLabel ?? t('seeOnMap')}</span>
        </a>
        <p
          className="absolute top-28 right-5 text-[12px] uppercase tracking-[0.12em] max-md:hidden md:top-36 md:right-16"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {location}
        </p>
      </div>

      {/* CARDS — small, with air above (the map) and below */}
      <div
        ref={cardsRef}
        className="absolute inset-x-0 bottom-6 z-10 md:bottom-16"
        onMouseEnter={() => cursorRef.current && (cursorRef.current.style.opacity = 1)}
        onMouseLeave={() => cursorRef.current && (cursorRef.current.style.opacity = 0)}
      >
        <div
          ref={trackRef}
          className="mer-track relative flex cursor-grab items-end gap-2 overflow-x-auto px-6 select-none md:px-6"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {list.map((p, i) => (
            <article
              key={i}
              ref={(el) => (cardEls.current[i] = el)}
              data-active={active === i}
              className="mer-card relative w-[280px] shrink-0 overflow-hidden bg-[#d6d1c5] max-md:flex max-md:h-[76px] max-md:items-end max-md:justify-between max-md:p-4 max-md:data-[active=true]:h-[188px] md:h-[210px] md:w-[330px]"
              onMouseEnter={() => hoverIn(i, false)}
              onMouseLeave={hoverOut}
              onClick={() => tap(i, false)}
            >
              <div className="flex items-start gap-3 p-5 max-md:hidden">
                <span
                  className="text-[3.6rem] leading-[0.9]"
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
                >
                  {p.distance}
                </span>
                <span
                  className="pt-1 text-[11px] uppercase tracking-[0.06em]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {p.unit}
                </span>
              </div>
              <div className="mer-card-photo absolute inset-0" aria-hidden="true">
                <img
                  src={p.img}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="pointer-events-none h-full w-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0) 60%)',
                  }}
                />
              </div>
              <div className="mer-card-text max-md:relative md:absolute md:bottom-5 md:left-5">
                <h3
                  className="mer-card-title text-[1.2rem] leading-[1.1] md:text-[1.5rem]"
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
                >
                  {p.title}
                </h3>
                <p
                  className="mer-card-dist mt-1 text-[10px] uppercase tracking-[0.06em] md:hidden"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {p.distance} {p.unit}
                </p>
              </div>
              <span
                className="mer-card-pin flex h-10 w-10 items-center justify-center rounded-full max-md:relative md:absolute md:right-4 md:bottom-4"
                role="presentation"
              >
                <span className="mer-card-pin-icon">
                  <PinIcon size={13} />
                </span>
                <span className="mer-card-x">
                  <CloseIcon />
                </span>
              </span>
            </article>
          ))}
        </div>
      </div>

      <span
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-40 hidden text-[12px] uppercase tracking-[0.14em] opacity-0 transition-opacity duration-300 md:block"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        drag
      </span>

      <style>{`
        .mer-track { scrollbar-width: none; -ms-overflow-style: none; }
        .mer-track::-webkit-scrollbar { display: none; }

        .mer-pin { color: ${INK}; background: rgba(42, 38, 34, 0.06); border: 1px solid rgba(42, 38, 34, 0.14); transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-pin-fill { background: ${INK}; clip-path: circle(0% at 50% 50%); transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-pin svg { transition: color 0.35s ease 0.08s; }
        .mer-pin[data-active="true"] { transform: scale(1.1); }
        .mer-pin[data-active="true"] .mer-pin-fill { clip-path: circle(75% at 50% 50%); }
        .mer-pin[data-active="true"] svg { color: ${LAND}; }
        .mer-pin-label { position: absolute; left: 50%; top: 100%; margin-top: 4px; transform: translateX(-50%); white-space: nowrap; font-family: 'Space Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(42, 38, 34, 0.62); pointer-events: none; transition: color 0.4s ease; }
        .mer-pin[data-active="true"] .mer-pin-label { color: ${INK}; }
        @media (max-width: 767px) {
          .mer-pin-label { display: none; }
          .mer-pin[data-active="true"] .mer-pin-label { display: block; }
        }

        .mer-card { transition: height 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-card-photo { clip-path: circle(0px at calc(100% - 36px) calc(100% - 36px)); transition: clip-path 1s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-card[data-active="true"] .mer-card-photo { clip-path: circle(150% at calc(100% - 36px) calc(100% - 36px)); }
        .mer-card-title, .mer-card-dist { transition: color 0.5s ease 0.1s; }
        .mer-card[data-active="true"] .mer-card-title,
        .mer-card[data-active="true"] .mer-card-dist { color: #fff; }
        .mer-card-pin { position: relative; border: 1px solid rgba(42, 38, 34, 0.18); transition: background-color 0.5s ease 0.1s, color 0.5s ease 0.1s, border-color 0.5s ease 0.1s; }
        .mer-card[data-active="true"] .mer-card-pin { background: #fff; color: ${INK}; border-color: #fff; }
        .mer-card-x { display: none; }
        @media (max-width: 767px) {
          .mer-card[data-active="true"] .mer-card-pin-icon { display: none; }
          .mer-card[data-active="true"] .mer-card-x { display: block; }
          .mer-card[data-active="true"] .mer-card-pin { background: ${INK}; color: #fff; border-color: ${INK}; }
        }

        .mer-cta { background: ${INK}; color: #f0eae0; transition: color 0.4s ease; }
        .mer-cta-fill { background: #f0eae0; transform: translateY(101%); transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-cta:hover .mer-cta-fill { transform: translateY(0); }
        .mer-cta:hover { color: ${INK}; }
      `}</style>
    </section>
  )
}

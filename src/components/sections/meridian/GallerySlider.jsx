import { useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'

/**
 * MERIDIAN — Gallery slider
 *
 * ~100vh full-bleed slider with a counter. The transition is the
 * reference's "mask" effect, rebuilt without Swiper (its own Swiper
 * instance runs `effect: 'mask'`, speed 1200ms; the numbers below come
 * from reading its live slide transforms):
 *
 *   d = slideIndex - position          (0 = current, ±1 = neighbours)
 *   slide box   translateX(d * 100%), overflow hidden — moves 1:1
 *   inner image translateX(-d * W/2)   — lags at half speed
 *               scale(1 + 1.2|d|, 1 + 0.2|d|)  — stretched while it travels
 *               origin left when d > 0 (arriving), right when d < 0 (leaving)
 *
 * So the outgoing photo is dragged back and smeared wide while the next
 * one settles out of the same stretch — a push with parallax rather than
 * a plain slide.
 *
 * Scroll-driven: the section is a tall runway with a sticky stage, and
 * scroll progress maps to `position` (smoothed), so wheeling down/up
 * plays the slides forward/back; when the visitor pauses it eases to the
 * nearest slide. The arrows scroll to that slide's spot in the runway.
 *
 * REPLACE ME: the demo slides reuse hero flythrough frames so the section
 * works out of the box. Point `slides` at your own high-resolution
 * project photos (1920px+ wide, WebP/AVIF).
 */

const pad = (n) => String(n).padStart(2, '0')

// Demo renders live in public/meridian/gallery/ (01–05, WebP). Replace
// them with your own high-resolution photos — or use the `slides` prop.
const DEFAULT_SLIDES = [1, 2, 3, 4, 5].map((n) => ({
  img: `/meridian/gallery/0${n}.webp`,
  alt: `Project view ${n}`,
}))

// Scroll distance (in viewport heights) each slide-to-slide step gets.
const RUNWAY_PER_STEP = 0.9
const EASE = 0.1

export default function GallerySlider({ slides }) {
  const valid = slides?.filter((s) => s?.img)
  const list = valid?.length ? valid : DEFAULT_SLIDES
  const n = list.length

  const track = useRef(null)
  const stage = useRef(null)
  const boxes = useRef([])
  const inners = useRef([])
  const [index, setIndex] = useState(0)

  const runwayY = (i) => {
    const el = track.current
    if (!el) return 0
    const top = el.getBoundingClientRect().top + window.scrollY
    return (
      top + (n > 1 ? i / (n - 1) : 0) * (el.offsetHeight - window.innerHeight)
    )
  }

  const goTo = (i) => {
    const y = runwayY(Math.max(0, Math.min(n - 1, i)))
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(y, { duration: 1.2 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      let target = 0
      let cur = 0
      let shownIndex = 0
      let snapTimer

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
        const idx = Math.round(p)
        if (idx !== shownIndex) {
          shownIndex = idx
          setIndex(idx)
        }
      }

      const tick = () => {
        const before = cur
        cur += (target - cur) * EASE
        if (Math.abs(target - cur) < 0.0005) cur = target
        if (cur !== before) layout(cur)
      }

      layout(0)
      if (!reduced) gsap.ticker.add(tick)

      const st = ScrollTrigger.create({
        trigger: track.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          target = self.progress * (n - 1)
          if (reduced) {
            cur = target
            layout(cur)
            return
          }
          // pause → settle on the nearest slide
          window.clearTimeout(snapTimer)
          snapTimer = window.setTimeout(() => {
            const lenis = getLenis()
            if (!lenis || self.progress <= 0 || self.progress >= 1) return
            const near = Math.round(target)
            if (Math.abs(target - near) > 0.02)
              lenis.scrollTo(runwayY(near), { duration: 0.9 })
          }, 160)
        },
      })

      const onResize = () => layout(cur)
      window.addEventListener('resize', onResize)
      return () => {
        window.clearTimeout(snapTimer)
        window.removeEventListener('resize', onResize)
        gsap.ticker.remove(tick)
        st.kill()
      }
    },
    { scope: track, dependencies: [n] },
  )

  const btn =
    'meridian-gal-btn group relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border transition-opacity duration-300 disabled:pointer-events-none disabled:opacity-20 md:h-12 md:w-12'

  return (
    <section
      ref={track}
      id="villas"
      className="relative bg-[#dfd8cf] text-[#2a2622]"
      style={{ height: `calc(100svh + ${(n - 1) * RUNWAY_PER_STEP * 100}svh)` }}
    >
      <div className="sticky top-0 flex h-svh flex-col md:block">
        <div
          ref={stage}
          className="relative h-[62svh] overflow-hidden select-none md:h-full"
          role="region"
          aria-roledescription="carousel"
          aria-label="Project gallery"
        >
          {list.map((s, i) => (
            <div
              key={`${s.img}-${i}`}
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
                  src={s.img}
                  alt={s.alt || ''}
                  draggable={false}
                  decoding="async"
                  loading={i < 2 ? 'eager' : 'lazy'}
                  className="pointer-events-none h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-1/3 md:block"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))',
            }}
          />
        </div>

        {/* counter + arrows: over the photo on desktop, in a plain row under
            it on mobile (the reference does the same swap) */}
        <div className="flex items-center justify-between px-6 py-5 md:absolute md:inset-x-12 md:bottom-12 md:z-10 md:p-0 md:text-white">
          <p
            className="flex items-baseline gap-2 text-3xl leading-none md:text-4xl"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
            aria-live="polite"
          >
            <span className="relative inline-block h-[1em] overflow-hidden">
              <span key={index} className="meridian-gal-num block">
                {pad(index + 1)}
              </span>
            </span>
            <span className="text-lg opacity-60 md:text-xl">/ {pad(n)}</span>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className={`${btn} border-current`}
              aria-label="Previous slide"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              <span className="meridian-gal-fill absolute inset-0" />
              <svg
                className="relative rotate-180"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 8h11M9 3.5 13.5 8 9 12.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className={`${btn} border-current`}
              aria-label="Next slide"
              disabled={index === n - 1}
              onClick={() => goTo(index + 1)}
            >
              <span className="meridian-gal-fill absolute inset-0" />
              <svg
                className="relative"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 8h11M9 3.5 13.5 8 9 12.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .meridian-gal-num { animation: meridian-gal-roll 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes meridian-gal-roll { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .meridian-gal-fill { background: currentColor; transform: translateY(101%); transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .meridian-gal-btn:hover:not(:disabled) .meridian-gal-fill { transform: translateY(0); }
        .meridian-gal-btn svg { transition: color 0.3s; mix-blend-mode: normal; }
        .meridian-gal-btn:hover:not(:disabled) svg { color: #dfd8cf; }
      `}</style>
    </section>
  )
}

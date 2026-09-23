import { useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'

/**
 * MERIDIAN — Amenities (draggable cards, image ⇄ paragraph)
 *
 * Read off the reference's "private space" band:
 *   - a centred serif headline (connector words in small caps) that
 *     parallaxes against the scroll
 *   - a label row with a slim progress bar that tracks the card row
 *   - a row of ruled cells, each with a photo and a round "+" button
 *
 * Interaction: click the "+" → the photo collapses toward the button (a
 * clip-path circle shrinking into the corner) and a paragraph takes its
 * place; the "+" turns into an "×" on an ink fill. Hover fills the button
 * softly from the centre outward. Same circle-wipe vocabulary as the map
 * cards, so the page keeps one motion language.
 *
 * Parallax: every photo is taller than its frame and drifts inside it.
 * Mobile is the same layout, narrower cells (verified on the reference).
 *
 * REPLACE ME: demo photos reuse gallery stills — pass your own through
 * `items`.
 */

const SMALL_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'from', 'a', 'with'])
const BODY = '[Short description of this amenity — replace with your own copy.]'

const DEFAULT_ITEMS = [
  '/meridian/gallery/03.webp',
  '/meridian/gallery/05.webp',
  '/meridian/gallery/06.webp',
  '/meridian/gallery/panorama.webp',
  '/meridian/gallery/01.webp',
  '/meridian/gallery/02.webp',
  '/meridian/gallery/04.webp',
  '/meridian/gallery/03.webp',
].map((img, i) => ({ title: `Amenity ${i + 1}`, text: BODY, img }))

const INK = '#2a2622'

export default function Amenities({
  title = 'A blend of [Feature One] and [Feature Two] designed to enhance daily life',
  label = 'Amenities',
  items,
}) {
  const valid = items?.filter((it) => it?.title || it?.img)
  const list = (valid?.length ? valid : DEFAULT_ITEMS).slice(0, 10)

  const root = useRef(null)
  const titleWrap = useRef(null)
  const titleRef = useRef(null)
  const trackRef = useRef(null)
  const barRef = useRef(null)
  const [open, setOpen] = useState(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const track = trackRef.current
      const updateBar = () => {
        const bar = barRef.current
        if (!bar || !track) return
        const max = track.scrollWidth - track.clientWidth
        const w = Math.min(1, track.clientWidth / track.scrollWidth)
        const x = max > 0 ? (track.scrollLeft / max) * (1 - w) : 0
        bar.style.width = `${w * 100}%`
        bar.style.transform = `translateX(${(x / w) * 100}%)`
      }
      updateBar()
      track.addEventListener('scroll', updateBar, { passive: true })
      window.addEventListener('resize', updateBar)
      const cleanup = () => {
        track.removeEventListener('scroll', updateBar)
        window.removeEventListener('resize', updateBar)
      }
      if (reduced) return cleanup

      gsap.fromTo(
        titleWrap.current,
        { y: 50 },
        {
          y: -50,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      gsap.utils.toArray('.mer-am-img', root.current).forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -7 },
          {
            yPercent: 7,
            ease: 'none',
            scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
      const split = new SplitText(titleRef.current, { type: 'chars' })
      gsap.set(split.chars, { opacity: 0, yPercent: 30, filter: 'blur(6px)' })
      gsap.to(split.chars, {
        opacity: 1,
        yPercent: 0,
        filter: 'blur(0px)',
        duration: 1.6,
        stagger: 0.015,
        ease: 'power2.out',
        scrollTrigger: { trigger: titleRef.current, start: 'top 85%', once: true },
      })
      ScrollTrigger.refresh()
      return cleanup
    },
    { scope: root, dependencies: [title, list.length], revertOnUpdate: true },
  )

  // mouse drag-scroll (touch scrolls natively)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false })
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.target.closest('button')) return
    drag.current = { down: true, x: e.clientX, left: trackRef.current.scrollLeft, moved: false }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d.down) return
    if (Math.abs(e.clientX - d.x) > 3) d.moved = true
    trackRef.current.scrollLeft = d.left - (e.clientX - d.x)
  }
  const endDrag = () => {
    drag.current.down = false
  }

  return (
    <section
      ref={root}
      id="amenities"
      className="relative overflow-hidden bg-[#dfd8cf] py-28 text-[#2a2622] md:py-40"
    >
      <div ref={titleWrap} className="px-6 text-center md:px-16">
        <h2
          ref={titleRef}
          className="mx-auto max-w-[56rem] text-[clamp(2.2rem,5vw,4.8rem)] leading-[1] tracking-[-0.02em] uppercase"
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
      </div>

      <div className="mt-24 flex items-center justify-between px-6 pb-5 md:mt-40 md:px-14">
        <p
          className="flex items-center gap-3 text-[12px] uppercase tracking-[0.12em]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
          {label}
        </p>
        <div aria-hidden="true" className="relative h-px w-[110px] bg-[#2a2622]/15 md:w-[150px]">
          <span ref={barRef} className="absolute inset-y-[-0.5px] left-0 h-[2px] bg-[#2a2622]" />
        </div>
      </div>

      <div
        ref={trackRef}
        className="mer-am-track flex cursor-grab overflow-x-auto border-t border-[#2a2622]/10 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {list.map((it, i) => (
          <article
            key={i}
            data-open={open === i}
            className="mer-am-card w-[82vw] shrink-0 border-r border-[#2a2622]/10 p-5 md:w-[593px] md:p-8"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#d9d3c7]">
              <p
                className="absolute inset-0 overflow-auto p-6 text-[12px] leading-[1.5] uppercase"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {it.text || BODY}
              </p>
              <div className="mer-am-photo absolute inset-0">
                <img
                  src={it.img}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="mer-am-img pointer-events-none absolute inset-x-0 -top-[8%] h-[116%] w-full object-cover"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <h3
                className="text-[1.5rem] leading-[1.1] md:text-[1.9rem]"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
              >
                {it.title}
              </h3>
              <button
                type="button"
                aria-label={open === i ? `Close ${it.title}` : `Read about ${it.title}`}
                aria-expanded={open === i}
                className="mer-am-btn relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span aria-hidden="true" className="mer-am-fill absolute inset-0 rounded-full" />
                <svg
                  className="mer-am-plus relative"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>

      <style>{`
        .mer-am-track { scrollbar-width: none; -ms-overflow-style: none; }
        .mer-am-track::-webkit-scrollbar { display: none; }

        .mer-am-photo { clip-path: circle(150% at calc(100% - 24px) calc(100% - 24px)); transition: clip-path 1s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-am-card[data-open="true"] .mer-am-photo { clip-path: circle(0px at calc(100% - 24px) calc(100% - 24px)); }

        .mer-am-btn { color: ${INK}; border: 1px solid rgba(42, 38, 34, 0.22); transition: background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease; }
        .mer-am-fill { background: rgba(42, 38, 34, 0.14); clip-path: circle(0% at 50% 50%); transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-am-btn:hover .mer-am-fill { clip-path: circle(75% at 50% 50%); }
        .mer-am-plus { transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-am-card[data-open="true"] .mer-am-btn { background: ${INK}; color: #f0eae0; border-color: ${INK}; }
        .mer-am-card[data-open="true"] .mer-am-fill { background: transparent; }
        .mer-am-card[data-open="true"] .mer-am-plus { transform: rotate(45deg); }
      `}</style>
    </section>
  )
}

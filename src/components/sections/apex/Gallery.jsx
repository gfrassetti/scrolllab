import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { lab, lounge, paint, craft, road, studio, wheel, variants } from './assets/images'

/**
 * APEX — Gallery
 *
 * A full-viewport carousel. The pointer carries a small portrait of the NEXT
 * picture (or the PREVIOUS one over the left quarter); a click opens that
 * picture out of the thumbnail's own rectangle — it grows from where the
 * cursor was to the whole screen while it settles from a 1.45 zoom. The left
 * 25 % goes back, the rest goes forward; arrow keys, swipe and two real
 * buttons do the same (the thumbnail is a pointer-only extra).
 *
 * Calm (reduce motion): a short crossfade, no growing, no zoom.
 * Touch / no hover: no cursor thumbnail; the same zones and a swipe.
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

const DEFAULT_SLIDES = [
  { image: studio, title: 'The studio', caption: 'Where every finished car is first seen in full light.' },
  { image: lab, title: 'Battery lab', caption: 'Every cell is tested on its own before it goes in.' },
  { image: paint, title: 'Paint shop', caption: 'Seven coats, polished by hand between each one.' },
  { image: craft, title: 'Trim bench', caption: 'Leather cut and stitched for one car at a time.' },
  { image: wheel, title: 'Wheels', caption: 'Forged in one piece, balanced by hand.' },
  { image: lounge, title: 'Owners’ lounge', caption: 'Where the car is handed over, never delivered.' },
  { image: road, title: 'First drive', caption: 'Two hundred kilometres before it is yours.' },
]

const THUMB = { w: 176, h: 224 }
const pad = (n) => String(n).padStart(2, '0')

export default function Gallery({
  eyebrow = 'The atelier',
  index = '02',
  slides,
  nextLabel = 'Next',
  prevLabel = 'Previous',
  showCursorThumb = 'on',
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const cursorRef = useRef(null)
  const curRef = useRef(0)
  const busy = useRef(false)
  const pointer = useRef(null)
  const down = useRef(null)
  const suppress = useRef(false)
  const [cur, setCur] = useState(0)

  const edited = Array.isArray(slides)
    ? slides.map((s, i) => ({ image: s?.image || DEFAULT_SLIDES[i]?.image, title: s?.title || '', caption: s?.caption || '' })).filter((s) => s.image)
    : []
  const items = edited.length ? edited : DEFAULT_SLIDES
  const n = items.length
  const at = (i) => (i + n) % n
  const nextIdx = at(cur + 1)
  const prevIdx = at(cur - 1)
  const near = (i) => i === cur || i === nextIdx || i === prevIdx

  const cursorOn = showCursorThumb !== 'off'

  // Cursor thumbnail: follows the pointer (mouse only).
  useEffect(() => {
    const root = rootRef.current
    const cursor = cursorRef.current
    if (!root || !cursor || !cursorOn) return undefined
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    const qx = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3.out' })
    const qy = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3.out' })
    const qr = gsap.quickTo(cursor, 'rotation', { duration: 0.6, ease: 'power3.out' })
    let lastX = 0
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      const r = root.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      pointer.current = { x, y }
      cursor.dataset.zone = x < r.width * 0.25 ? 'prev' : 'next'
      qx(x - THUMB.w / 2)
      qy(y - THUMB.h / 2)
      qr(Math.max(-7, Math.min(7, (x - lastX) * 0.35)))
      lastX = x
      if (cursor.dataset.shown !== 'true') {
        gsap.set(cursor, { x: x - THUMB.w / 2, y: y - THUMB.h / 2 })
        cursor.dataset.shown = 'true'
      }
    }
    const hide = () => {
      cursor.dataset.shown = 'false'
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', hide)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', hide)
      gsap.killTweensOf(cursor)
    }
  }, [cursorOn])

  const go = (dir) => {
    if (busy.current || n < 2) return
    const from = curRef.current
    const to = at(from + dir)
    const stage = stageRef.current
    const root = rootRef.current
    if (!stage || !root) return
    const inc = stage.querySelector(`[data-slide="${to}"]`)
    const out = stage.querySelector(`[data-slide="${from}"]`)
    if (!inc || !out) return
    busy.current = true
    curRef.current = to
    setCur(to)

    const incImg = inc.querySelector('img')
    const outImg = out.querySelector('img')
    const finish = () => {
      gsap.set(out, { autoAlpha: 0, zIndex: 1, clipPath: 'none' })
      gsap.set(inc, { zIndex: 2, clipPath: 'none' })
      if (outImg) gsap.set(outImg, { scale: 1 })
      busy.current = false
    }

    if (prefersReducedMotion()) {
      gsap.set(inc, { autoAlpha: 1, zIndex: 3, clipPath: 'none' })
      gsap.fromTo(inc, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out', onComplete: finish })
      return
    }

    // The new picture opens from the thumbnail's rectangle (or a stand-in for
    // keys / touch) to the whole screen — once it is decoded (at most 1.2 s), so
    // a slow network never opens an empty frame.
    const r = root.getBoundingClientRect()
    const p = pointer.current && dir > 0 === (pointer.current.x >= r.width * 0.25)
      ? pointer.current
      : { x: r.width * (dir > 0 ? 0.75 : 0.12), y: r.height * 0.5 }
    const hw = THUMB.w / 2
    const hh = THUMB.h / 2
    const t = Math.max(0, p.y - hh)
    const l = Math.max(0, p.x - hw)
    const rr = Math.max(0, r.width - (p.x + hw))
    const b = Math.max(0, r.height - (p.y + hh))
    const open = () => {
    gsap.set(inc, { autoAlpha: 1, zIndex: 3, clipPath: `inset(${t}px ${rr}px ${b}px ${l}px)` })
    if (incImg) gsap.set(incImg, { scale: 1.45 })
    gsap
      .timeline({ onComplete: finish })
      .to(inc, { clipPath: 'inset(0px 0px 0px 0px)', duration: 1.25, ease: 'power3.inOut' }, 0)
      .to(incImg, { scale: 1, duration: 1.7, ease: 'power3.out' }, 0)
      .to(outImg, { scale: 1.12, duration: 1.25, ease: 'power2.inOut' }, 0)
    }
    const ready = incImg && !incImg.complete && incImg.decode ? incImg.decode().catch(() => {}) : Promise.resolve()
    Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(open)
  }

  // A picture that fails is asked for once more (without the srcset); if it
  // fails again it is hidden, so the frame shows the section colour instead of
  // a broken-image icon.
  const onImgError = (e) => {
    const img = e.currentTarget
    if (img.dataset.retried) {
      img.style.visibility = 'hidden'
      return
    }
    img.dataset.retried = '1'
    const src = img.getAttribute('src')
    img.removeAttribute('srcset')
    img.src = `${src}${src.includes('?') ? '&' : '?'}retry=1`
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
  }
  const onPointerDown = (e) => {
    down.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e) => {
    const d = down.current
    down.current = null
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppress.current = true
      go(dx < 0 ? 1 : -1)
    }
  }
  const zoneClick = (dir) => () => {
    if (suppress.current) {
      suppress.current = false
      return
    }
    go(dir)
  }

  const vars = { '--ga-bg': bg || '#04070d', '--ga-fg': fg || '#e8edf6', '--ga-accent': accent || '#9cc3ff' }
  const active = items[cur]

  return (
    <section
      ref={rootRef}
      id="atelier"
      data-cursor={cursorOn ? 'on' : 'off'}
      className="apex-gallery relative isolate h-svh min-h-[34rem] touch-pan-y overflow-hidden select-none"
      style={{ ...vars, background: 'var(--ga-bg)', color: 'var(--ga-fg)' }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      aria-roledescription="carousel"
      aria-label={eyebrow}
    >
      <div ref={stageRef} className="absolute inset-0">
        {items.map((s, i) => (
          <div
            key={i}
            data-slide={i}
            className="absolute inset-0 overflow-hidden"
            style={{ visibility: i === 0 ? 'visible' : 'hidden', zIndex: i === 0 ? 2 : 1 }}
            aria-hidden={i === cur ? undefined : true}
          >
            {near(i) || i === 0 ? (
              <img
                {...imgAttrs(s.image, variants)}
                sizes="100vw"
                alt={s.title}
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                onError={onImgError}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div aria-hidden="true" className="apex-ga-shade pointer-events-none absolute inset-0" />
          </div>
        ))}
      </div>

      {/* Zones: the left quarter goes back, the rest forward. */}
      <button type="button" tabIndex={-1} aria-hidden="true" data-zone="prev" onClick={zoneClick(-1)} className="apex-ga-zone absolute inset-y-0 left-0 z-10 w-1/4" />
      <button type="button" tabIndex={-1} aria-hidden="true" data-zone="next" onClick={zoneClick(1)} className="apex-ga-zone absolute inset-y-0 right-0 z-10 w-3/4" />

      {/* Chrome */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-[5vw] pt-[max(1.1rem,2.4svh)] text-[11px] tracking-[0.16em] uppercase md:px-[2.4vw] lg:text-[max(11px,0.6vw)]" style={LABEL}>
        <p className="flex items-baseline gap-4">
          <span className="tabular-nums opacity-50">({index})</span>
          <span>{eyebrow}</span>
        </p>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-5 px-[5vw] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:flex-row md:items-end md:justify-between md:gap-6 md:px-[2.4vw] md:pb-[2.4vw]">
        <div key={cur} className="apex-ga-cap min-w-0 max-w-[34rem]" aria-live="polite">
          <p className="text-[1.5rem] md:text-[clamp(1.9rem,4.6vw,4.75rem)] leading-[0.98] font-medium tracking-[-0.035em]" style={DISPLAY}>
            {active.title}
          </p>
          <p className="mt-3 max-w-[38ch] text-[14px] leading-[1.45] opacity-80 md:text-[max(13px,0.95vw)]">{active.caption}</p>
        </div>
        <div
          className="pointer-events-auto flex shrink-0 items-center justify-between gap-5 border-t border-current/20 pt-3 text-[11px] tracking-[0.16em] uppercase md:justify-start md:border-0 md:pt-0 lg:text-[max(11px,0.6vw)]"
          style={LABEL}
          onPointerEnter={() => cursorRef.current && (cursorRef.current.dataset.shown = 'false')}
        >
          <button type="button" onClick={() => go(-1)} className="tpl-link tpl-hit relative py-1" aria-label={prevLabel}>
            {prevLabel}
          </button>
          <span className="tabular-nums opacity-70" aria-hidden="true">
            {pad(cur + 1)} / {pad(n)}
          </span>
          <button type="button" onClick={() => go(1)} className="tpl-link tpl-hit relative py-1" aria-label={nextLabel}>
            {nextLabel}
          </button>
        </div>
      </div>

      {/* Progress: the accent follows the picture. */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 block h-[2px] bg-white/10">
        <span className="block h-full origin-left transition-transform duration-[900ms]" style={{ background: 'var(--ga-accent)', transform: `scaleX(${(cur + 1) / n})`, transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))' }} />
      </span>

      {/* Pointer thumbnail */}
      {cursorOn ? (
        <div
          ref={cursorRef}
          aria-hidden="true"
          data-zone="next"
          data-shown="false"
          className="apex-ga-cursor pointer-events-none absolute top-0 left-0 z-30 hidden overflow-hidden"
          style={{ width: THUMB.w, height: THUMB.h }}
        >
          <img {...imgAttrs(items[nextIdx].image, variants)} sizes="180px" alt="" data-thumb="next" className="absolute inset-0 h-full w-full object-cover" />
          <img {...imgAttrs(items[prevIdx].image, variants)} sizes="180px" alt="" data-thumb="prev" className="absolute inset-0 h-full w-full object-cover" />
          <span className="apex-ga-chip absolute bottom-2 left-2 px-2 py-1 text-[10px] tracking-[0.16em] uppercase" style={LABEL}>
            <span data-chip="next">{nextLabel} →</span>
            <span data-chip="prev">← {prevLabel}</span>
          </span>
        </div>
      ) : null}

      <style>{`
        .apex-ga-shade { background: linear-gradient(0deg, color-mix(in srgb, var(--ga-bg) 78%, transparent) 0%, transparent 46%), linear-gradient(180deg, color-mix(in srgb, var(--ga-bg) 45%, transparent) 0%, transparent 22%); }
        .apex-ga-zone { background: transparent; border: 0; padding: 0; }
        .apex-ga-cursor {
          opacity: 0; scale: 0.7; transition: opacity 260ms var(--ease-out, ease), scale 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
          background: var(--ga-bg); will-change: transform;
        }
        .apex-ga-cursor[data-shown='true'] { opacity: 1; scale: 1; }
        .apex-ga-cursor [data-thumb] { transition: opacity 240ms var(--ease-out, ease); }
        .apex-ga-cursor[data-zone='next'] [data-thumb='prev'], .apex-ga-cursor[data-zone='prev'] [data-thumb='next'] { opacity: 0; }
        .apex-ga-cursor[data-zone='next'] [data-chip='prev'], .apex-ga-cursor[data-zone='prev'] [data-chip='next'] { display: none; }
        .apex-ga-chip { background: var(--ga-bg); color: var(--ga-fg); }
        .apex-ga-cap { animation: apex-ga-cap 700ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) 380ms both; }
        @keyframes apex-ga-cap { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (hover: hover) and (pointer: fine) {
          .apex-gallery[data-cursor='on'] .apex-ga-zone { cursor: none; }
          .apex-ga-cursor { display: block; }
        }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .apex-ga-cap { animation: none; }
          :where(:root:not([data-motion='full'])) .apex-ga-cursor { transition: none; }
        }
      `}</style>
    </section>
  )
}

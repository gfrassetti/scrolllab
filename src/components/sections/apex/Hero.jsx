import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { useMobileMenu } from '../../../hooks/useMobileMenu'

/**
 * APEX — Hero
 *
 * A film, not a photo: five continuous takes of one car, chained with soft
 * crossfades into a single 37-second loop that never jumps (the last take
 * dissolves into the first). It is built and graded by scripts/apex-reel.mjs
 * — the colour grade is baked into the file; the overlay, grain and vignette
 * on top are CSS variables a buyer is meant to turn.
 *
 *  - Two files: 1080p for desktop and a 720×1280 portrait crop per shot for
 *    phones (a phone must not download pixels it will never show). One of
 *    them is chosen at mount; the poster is the film's first picture.
 *  - Chapters: the manifest says where each take starts on the loop's clock;
 *    the indicator follows the video's own time (no React renders) and a tap
 *    jumps to a take.
 *  - Entrance, in order: curtain lifts → headline lines rise out of their
 *    masks → pause → sub copy → chrome. On scroll the film drifts toward the
 *    camera and goes down to the next section's black.
 *  - Calm (reduce motion / data saver): the film is not played; the graded
 *    poster is the hero and the text fades in. Never a hole.
 *
 * Builder / LAB: every text, link, colour and the film itself are fields; the
 * grain is a toggle. `flow` (only LAB's iframe passes it) drops the scroll-out
 * scrub: a hosted widget sits in someone else's page and must not go black as
 * it leaves.
 *
 * The footage in /public/apex is SAMPLE media: replace the five clips and run
 * `node scripts/apex-reel.mjs` (README: "The film").
 */

// The demo film lives in the site's public/ folder. A buyer who points `filmSrc`
// at their own file gets their own (and a phone falls back to the same file).
const DEMO = { film: '/apex/hero.mp4', mobile: '/apex/hero-m.mp4', poster: '/apex/poster.jpg', posterMobile: '/apex/poster-m.jpg' }
const DEFAULT_CHAPTERS = ['Approach', 'Silhouette', 'Detail', 'Cabin', 'Departure']

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = {
  fontFamily: "'Archivo', 'Inter Tight', sans-serif",
  fontStretch: '112%',
  fontVariationSettings: "'wdth' 112",
}

const NOISE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)

const pad = (n) => String(n).padStart(2, '0')

/** The device asks for less: no autoplay, no data spent on a film. */
function filmShouldStay() {
  if (typeof navigator === 'undefined') return false
  const c = navigator.connection
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')))
}

export default function Hero({
  brand = 'APEX',
  tagline = 'Electric grand touring',
  links = [
    { label: 'Models', href: '#models' },
    { label: 'Studio', href: '#studio' },
    { label: 'Journal', href: '#journal' },
  ],
  ctaLabel = 'Reserve',
  ctaHref = '#reserve',
  menuLabel = 'Menu',
  closeLabel = 'Close',
  line1 = 'Power,',
  line2 = 'without the noise.',
  blurb = 'A grand tourer shaped by light and silence: every surface drawn to be felt before it is seen.',
  discoverLabel = 'Discover the car',
  discoverHref = '#models',
  scrollLabel = 'Scroll',
  chapters,
  chapterLabel = 'Chapter',
  chaptersLabel = 'Film chapters',
  filmSrc,
  filmSrcMobile,
  poster,
  posterMobile,
  manifestSrc,
  showGrain = 'on',
  flow = false,
  bg,
  fg,
  accent,
  washColor,
}) {
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const shotsRef = useRef([])
  const activeRef = useRef(-1)
  const menu = useMobileMenu()

  // Decided once, before the first render: which film the device downloads and
  // whether it plays at all.
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  // Crossing the breakpoint (rotating a tablet, resizing a window) swaps the
  // file and keeps the film's place, so the picture never restarts.
  const resumeAt = useRef(0)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const onChange = (e) => {
      resumeAt.current = videoRef.current?.currentTime || 0
      setPhone(e.matches)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  const [still] = useState(() => prefersReducedMotion() || filmShouldStay())

  const film = filmSrc || DEMO.film
  const demoFilm = film === DEMO.film
  const filmPhone = filmSrcMobile || (demoFilm ? DEMO.mobile : film)
  const posterDesktop = poster || (demoFilm ? DEMO.poster : undefined)
  const posterPhone = posterMobile || poster || (demoFilm ? DEMO.posterMobile : undefined)
  const manifestUrl = manifestSrc || film.replace(/[^/]*$/, 'manifest.json')

  // Where each take starts on the loop's clock, written next to the film by
  // scripts/apex-reel.mjs. Missing → the takes are taken as equal parts.
  const [manifest, setManifest] = useState(null)
  useEffect(() => {
    let cancelled = false
    setManifest(null)
    fetch(manifestUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!cancelled && Array.isArray(m?.shots) && m.shots.length) setManifest(m.shots)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [manifestUrl])

  // The names come from the editor first, then the manifest, then the demo's.
  const edited = Array.isArray(chapters) ? chapters.map((c) => String(c?.label || '').trim()).filter(Boolean) : []
  const labels = edited.length ? edited : manifest ? manifest.map((s) => s.label) : DEFAULT_CHAPTERS
  const labelsRef = useRef(labels)
  labelsRef.current = labels
  shotsRef.current = manifest || []

  // Play only while the hero is on screen; follow the film's clock for the chapters.
  useEffect(() => {
    const video = videoRef.current
    const root = rootRef.current
    if (!video || !root || still) return undefined

    let raf = 0
    let visible = true
    const segs = () => root.querySelectorAll('[data-apex-seg]')
    const label = () => root.querySelector('[data-apex-chapter]')

    const paint = () => {
      const names = labelsRef.current
      const known = shotsRef.current
      const dur = video.duration
      let shots = []
      if (known.length === names.length) shots = known
      else if (Number.isFinite(dur) && dur > 0) {
        shots = names.map((_, k) => ({ start: (dur * k) / names.length, end: (dur * (k + 1)) / names.length }))
      }
      if (shots.length) {
        const t = video.currentTime
        let i = shots.findIndex((s) => t >= s.start && t < s.end)
        if (i < 0) i = t >= shots[shots.length - 1].end ? 0 : shots.length - 1
        const s = shots[i]
        const p = Math.max(0, Math.min(1, (t - s.start) / Math.max(0.001, s.end - s.start)))
        const nodes = segs()
        if (i !== activeRef.current) {
          activeRef.current = i
          nodes.forEach((el, k) => {
            el.dataset.state = k < i ? 'past' : k === i ? 'on' : 'next'
          })
          const l = label()
          if (l) l.textContent = `${pad(i + 1)} / ${pad(shots.length)} — ${names[i]}`
        }
        const fill = nodes[i]?.querySelector('[data-apex-fill]')
        if (fill) fill.style.transform = `scaleX(${p.toFixed(3)})`
      }
      raf = requestAnimationFrame(paint)
    }

    const start = () => {
      if (!visible) return
      video.play().catch(() => {})
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(paint)
    }
    const stop = () => {
      video.pause()
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) start()
        else stop()
      },
      { threshold: 0.05 },
    )
    io.observe(root)
    start()
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [still, labels.length])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return undefined
      if (still) {
        gsap.set('[data-apex-curtain]', { autoAlpha: 0 })
        return calmReveal('[data-apex-reveal]', { y: 10, stagger: 0.1 })
      }
      const enter = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: root, start: 'top 92%', once: true },
      })
      // On the page the hero is the hook, so it takes its time (headline → pause →
      // sub copy → chrome). As a widget it is on screen only while someone scrolls
      // past: the same order, in about half the time.
      const k = flow ? 0.5 : 1
      enter
        .to('[data-apex-curtain]', { autoAlpha: 0, duration: 1.2 * k, ease: 'power2.inOut' }, 0)
        .fromTo('[data-apex-line]', { yPercent: 112 }, { yPercent: 0, duration: 1.15 * k, stagger: 0.12 * k }, 0.5 * k)
        .fromTo('[data-apex-sub]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 * k, stagger: 0.1 * k }, 2.15 * k)
        .fromTo('[data-apex-chrome]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 * k, stagger: 0.06 * k }, 2.5 * k)

      // Handoff: the film comes a little closer and dips into the next black.
      // Not in a hosted widget: it sits in someone else's page.
      if (flow) return undefined
      const out = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
      })
      out
        .to('[data-apex-film]', { scale: 1.08 }, 0)
        .to('[data-apex-dim]', { autoAlpha: 1 }, 0.1)
        .to('[data-apex-copy]', { yPercent: -10, autoAlpha: 0 }, 0)
      return undefined
    },
    { scope: rootRef, dependencies: [still, flow] },
  )

  const jump = (i) => {
    const video = videoRef.current
    const s = shotsRef.current[i]
    if (video && s) video.currentTime = s.start + 0.04
  }

  const names = labels
  const vars = {
    '--apex-ink': bg || '#04070d',
    '--apex-fg': fg || '#e8edf6',
    '--apex-accent': accent || '#9cc3ff',
    '--apex-wash': washColor || '#0b2a63',
  }

  return (
    <section
      ref={rootRef}
      id="top"
      className="apex-hero relative isolate h-svh min-h-[34rem] overflow-hidden"
      style={{ ...vars, background: 'var(--apex-ink)', color: 'var(--apex-fg)' }}
    >
      {/* The film and everything graded over it. */}
      <div data-apex-film className="tpl-gpu absolute inset-0">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={phone ? filmPhone : film}
          poster={phone ? posterPhone : posterDesktop}
          muted
          loop
          playsInline
          preload={still ? 'none' : 'auto'}
          onLoadedMetadata={(e) => {
            if (resumeAt.current > 0) {
              e.currentTarget.currentTime = resumeAt.current % (e.currentTarget.duration || 1)
              resumeAt.current = 0
            }
          }}
          disablePictureInPicture
          aria-hidden="true"
        />
        <div aria-hidden="true" className="apex-wash pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="apex-shade pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="apex-vignette pointer-events-none absolute inset-0" />
        {showGrain === 'off' ? null : (
          <div
            aria-hidden="true"
            className="apex-grain pointer-events-none absolute inset-0 overflow-hidden"
            style={{ '--apex-noise': `url("data:image/svg+xml;utf8,${NOISE}")` }}
          />
        )}
      </div>
      <div data-apex-dim aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] opacity-0" style={{ background: 'var(--apex-ink)' }} />
      <div data-apex-curtain aria-hidden="true" className="pointer-events-none absolute inset-0 z-40" style={{ background: 'var(--apex-ink)' }} />

      <div className="absolute inset-0 z-10 flex flex-col px-[5vw] pt-[max(1.1rem,2.4svh)] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-[2.4vw]">
        {/* Top: mark, one sentence, links, one action. */}
        <header data-apex-chrome className="flex items-start justify-between gap-6 text-[11px] tracking-[0.16em] uppercase md:text-[max(11px,0.74vw)]" style={LABEL}>
          <a href="#top" className="tpl-hit relative text-[15px] font-bold tracking-[0.34em] md:text-[max(15px,1.05vw)]" aria-label={brand}>
            {brand}
          </a>
          <p className="hidden max-w-[22ch] opacity-70 md:block md:absolute md:left-[28%]">{tagline}</p>
          <nav className="hidden items-center gap-[2.2vw] md:flex" aria-label="Primary">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="tpl-link tpl-hit relative py-1">
                {l.label}
              </a>
            ))}
            <a href={ctaHref} className="apex-cta tpl-hit relative border border-current px-[1.1em] py-[0.7em]">
              {ctaLabel}
            </a>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <a href={ctaHref} className="apex-cta tpl-hit relative border border-current px-[1em] py-[0.7em]">
              {ctaLabel}
            </a>
            <button {...menu.triggerProps} className="tpl-hit relative border border-current px-[1em] py-[0.7em] uppercase">
              {menuLabel}
            </button>
          </div>
        </header>

        {/* The one thing to read. */}
        <div data-apex-copy className="mt-auto mb-[clamp(2rem,9svh,6rem)] grid items-end gap-8 md:grid-cols-12 md:gap-[1.6vw]">
          <h1
            data-apex-reveal
            className="text-[clamp(2.75rem,6vw,6.25rem)] leading-[0.95] font-medium tracking-[-0.035em] md:col-span-8"
            style={DISPLAY}
          >
            {[line1, line2].filter(Boolean).map((l) => (
              <span key={l} className="block overflow-hidden pb-[0.08em]">
                <span data-apex-line className="block">
                  {l}
                </span>
              </span>
            ))}
          </h1>
          <div className="flex max-w-[34ch] flex-col gap-5 text-[13px] leading-[1.45] md:col-span-3 md:col-start-10 md:text-[max(13px,0.95vw)]">
            <p data-apex-sub data-apex-reveal className="opacity-80">
              {blurb}
            </p>
            <a data-apex-sub data-apex-reveal href={discoverHref} className="apex-more tpl-hit relative inline-flex items-center gap-3 self-start uppercase tracking-[0.14em]" style={LABEL}>
              <span className="tpl-link py-1 text-[11px] md:text-[max(11px,0.74vw)]">{discoverLabel}</span>
              <span aria-hidden="true" className="apex-more-arrow inline-block h-px w-8 bg-current" />
            </a>
          </div>
        </div>

        {/* Chapters follow the film; a tap jumps to a take. */}
        <footer data-apex-chrome className="flex items-end justify-between gap-6 text-[11px] tracking-[0.16em] uppercase md:text-[max(11px,0.74vw)]" style={LABEL}>
          <div className="min-w-0">
            <p data-apex-chapter className="mb-3 tabular-nums opacity-80" aria-live="off">
              {`01 / ${pad(names.length)} — ${names[0]}`}
            </p>
            <div className="flex items-center gap-[0.6vw]" role="group" aria-label={chaptersLabel}>
              {names.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  data-apex-seg
                  data-state={i === 0 ? 'on' : 'next'}
                  aria-label={`${chapterLabel} ${i + 1}: ${name}`}
                  onClick={() => jump(i)}
                  className="apex-seg tpl-hit relative block h-[2px] w-[clamp(28px,4.2vw,64px)]"
                  disabled={still}
                >
                  <span data-apex-fill className="absolute inset-0 origin-left" style={{ background: 'var(--apex-accent)', transform: 'scaleX(0)' }} />
                </button>
              ))}
            </div>
          </div>
          <p className="hidden items-center gap-3 opacity-70 md:flex">
            {scrollLabel}
            <span aria-hidden="true" className="apex-scroll-line block h-px w-10 origin-left bg-current" />
          </p>
        </footer>
      </div>

      {/* Phone menu: its own sheet, in the same black. */}
      {menu.open ? (
        <div {...menu.panelProps} className="apex-sheet fixed inset-0 z-50 flex flex-col justify-between px-[5vw] pt-[max(1.1rem,2.4svh)] pb-[max(1.5rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--apex-ink)', color: 'var(--apex-fg)' }} aria-label={menuLabel}>
          <div className="flex items-start justify-between text-[11px] tracking-[0.16em] uppercase" style={LABEL}>
            <span className="text-[15px] font-bold tracking-[0.34em]">{brand}</span>
            <button type="button" onClick={menu.close} className="tpl-hit relative border border-current px-[1em] py-[0.7em]">
              {closeLabel}
            </button>
          </div>
          <ul className="flex flex-col gap-3" style={DISPLAY}>
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} onClick={menu.close} className="block py-1 text-[clamp(2.4rem,11vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.03em]">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="max-w-[26ch] text-[13px] opacity-70">{tagline}</p>
        </div>
      ) : null}

      <style>{`
        .apex-wash { background: var(--apex-wash); mix-blend-mode: soft-light; opacity: 0.32; }
        .apex-shade {
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--apex-ink) 62%, transparent) 0%, transparent 24%),
            linear-gradient(0deg, color-mix(in srgb, var(--apex-ink) 82%, transparent) 0%, color-mix(in srgb, var(--apex-ink) 30%, transparent) 38%, transparent 62%),
            radial-gradient(ellipse 70% 55% at 12% 88%, color-mix(in srgb, var(--apex-ink) 55%, transparent), transparent 70%);
        }
        .apex-vignette { background: radial-gradient(ellipse at 50% 46%, transparent 52%, color-mix(in srgb, var(--apex-ink) 55%, transparent) 100%); }
        .apex-grain::after {
          content: ''; position: absolute; inset: -40%; background-image: var(--apex-noise);
          opacity: 0.1; mix-blend-mode: overlay; animation: apex-grain 0.9s steps(5) infinite;
        }
        @keyframes apex-grain {
          0% { transform: translate(0, 0); } 20% { transform: translate(-3%, 2%); } 40% { transform: translate(2%, -3%); }
          60% { transform: translate(-2%, -1%); } 80% { transform: translate(3%, 3%); } 100% { transform: translate(0, 0); }
        }
        .apex-seg { background: color-mix(in srgb, currentColor 24%, transparent); transition: background-color 300ms ease; }
        .apex-seg[data-state='past'] { background: currentColor; }
        .apex-seg:disabled { cursor: default; }
        .apex-cta { transition: background-color 320ms var(--ease-out, ease), color 320ms var(--ease-out, ease); }
        .apex-more-arrow { transform-origin: left center; transition: transform 520ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        .apex-scroll-line { animation: apex-breathe 2.4s var(--ease-in-out, ease-in-out) infinite; }
        @keyframes apex-breathe { 0%, 100% { transform: scaleX(0.35); } 50% { transform: scaleX(1); } }
        .apex-sheet { animation: apex-sheet 380ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) both; }
        @keyframes apex-sheet { from { opacity: 0; } to { opacity: 1; } }
        @media (hover: hover) {
          .apex-cta:hover { background-color: var(--apex-fg); color: var(--apex-ink); }
          .apex-more:hover .apex-more-arrow { transform: scaleX(1.7); }
          .apex-seg:not(:disabled):hover { background: color-mix(in srgb, currentColor 60%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .apex-grain::after,
          :where(:root:not([data-motion='full'])) .apex-scroll-line,
          :where(:root:not([data-motion='full'])) .apex-sheet { animation: none; }
          :where(:root:not([data-motion='full'])) .apex-cta,
          :where(:root:not([data-motion='full'])) .apex-more-arrow,
          :where(:root:not([data-motion='full'])) .apex-seg { transition: none; }
        }
      `}</style>
    </section>
  )
}

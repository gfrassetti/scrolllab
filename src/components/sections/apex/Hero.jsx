import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { getLenis } from '../../../hooks/useLenis'
import HeroMenu, { Burger } from './HeroMenu'

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
 *    masks → pause → sub copy → chrome. On scroll: parallax in three speeds
 *    (film lags and closes in, sub copy, headline ahead) and then the film
 *    goes down to the next section's black.
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
const DEFAULT_CHAPTERS = ['Arrival', 'Profile', 'Wheel', 'Cabin', 'Tail light']

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

// The loader plays once per page load: a remount (the builder re-mounts the
// section on every edit, an SPA route comes back) must not replay it.
let loaderPlayed = false

/** The device asks for less: no autoplay, no data spent on a film. */
function filmShouldStay() {
  if (typeof navigator === 'undefined') return false
  const c = navigator.connection
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')))
}

export default function Hero({
  brand = 'Apex',
  tagline = 'Electric grand tourers',
  links = [
    { label: 'Models', href: '#models' },
    { label: 'Atelier', href: '#atelier' },
    { label: 'Showroom', href: '#showroom' },
    { label: 'Contact', href: '#contact' },
  ],
  ctaLabel = 'Book a drive',
  ctaHref = '#contact',
  menuLabel = 'Menu',
  closeLabel = 'Close',
  line1 = 'Built for the long way,',
  line2 = 'driven in silence.',
  blurb = 'A four-seat electric grand tourer, built by hand in small numbers. 620 km on a charge, and not a sound you did not choose.',
  discoverLabel = 'Discover the range',
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
  showMenuFilm = 'on',
  menuMeta = 'Via Lagrange 18, Turin\nsales@apexautomobili.com',
  showLoader = 'on',
  loaderTop = 'Apex',
  loaderSub = 'Electric grand tourers',
  loaderWord = 'APEX',
  loaderLabel = 'Loading',
  loaderBg,
  loaderFg,
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
  const menu = useMobileMenu({ breakpoint: null })

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
  // The loader needs the hero at the top of the page, motion on and a page
  // (not a hosted widget): otherwise it would cover something nobody is looking at.
  const [loaderOpen, setLoaderOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      showLoader !== 'off' &&
      !flow &&
      !loaderPlayed &&
      !prefersReducedMotion() &&
      !filmShouldStay() &&
      window.scrollY < window.innerHeight * 0.5,
  )
  const enterRef = useRef(null)

  // Lazy film: the poster (the film's first picture) paints with the page; the
  // 10 MB file is attached only once the page has finished loading AND the hero
  // is within a screen of the viewport, so it never competes with fonts, the
  // poster or the rest of the page. In a composition whose hero is far down it
  // is not fetched at all until the visitor gets near.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const root = rootRef.current
    if (still || !root) return undefined
    let near = false
    let loaded = false
    let done = false
    const go = () => {
      if (done || !near || !loaded) return
      done = true
      setArmed(true)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting
        go()
      },
      { rootMargin: '100% 0px' },
    )
    io.observe(root)
    const ready = () => {
      loaded = true
      go()
    }
    let timer = 0
    if (document.readyState === 'complete') ready()
    else {
      window.addEventListener('load', ready, { once: true })
      timer = window.setTimeout(ready, 2500) // a stalled third-party must not hold the film back
    }
    return () => {
      io.disconnect()
      window.removeEventListener('load', ready)
      window.clearTimeout(timer)
    }
  }, [still])

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
    let lastT = -1
    let movedAt = performance.now()
    let kickedAt = 0
    const segs = () => root.querySelectorAll('[data-apex-seg]')
    const label = () => root.querySelector('[data-apex-chapter]')

    // The film must never sit still on screen. Browsers pause a muted video on
    // their own (power saving, a tab coming back, a dropped request on a busy
    // server) and do not always resume it: if it is on screen and has not moved
    // for a while, play it again; if it is stuck waiting for data, reload it
    // from where it was.
    const keepAlive = (now) => {
      if (!visible || document.hidden || !video.currentSrc || now - kickedAt < 1200) return
      const idle = now - movedAt
      if (video.paused && !video.seeking) {
        kickedAt = now
        video.play().catch(() => {})
      } else if (idle > 4000 && video.readyState < 3) {
        kickedAt = now
        movedAt = now
        const at = video.currentTime
        video.load()
        video.addEventListener(
          'loadedmetadata',
          () => {
            video.currentTime = at
            video.play().catch(() => {})
          },
          { once: true },
        )
      }
    }

    const paint = (now = performance.now()) => {
      // Same picture as last frame (paused, buffering, 60 Hz screen on a 30 fps film): nothing to repaint.
      if (video.currentTime === lastT) {
        keepAlive(now)
        raf = requestAnimationFrame(paint)
        return
      }
      movedAt = now
      lastT = video.currentTime
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
    const onVisibility = () => {
      if (!document.hidden) start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [still, armed, phone, labels.length])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return undefined
      if (still) {
        gsap.set('[data-apex-curtain]', { autoAlpha: 0 })
        return calmReveal('[data-apex-reveal]', { y: 10, stagger: 0.1 })
      }
      // With the loader, the entrance waits for the cover to finish (it is
      // played from there); the old curtain is not needed.
      const enter = gsap.timeline({
        defaults: { ease: 'power3.out' },
        paused: true,
      })
      enterRef.current = enter
      if (loaderOpen) gsap.set('[data-apex-curtain]', { autoAlpha: 0 })
      else {
        ScrollTrigger.create({ trigger: root, start: 'top 92%', once: true, onEnter: () => enter.play() })
      }
      // On the page the hero is the hook, so it takes its time (headline → pause →
      // sub copy → chrome). As a widget it is on screen only while someone scrolls
      // past: the same order, in about half the time.
      const k = flow ? 0.5 : 1
      enter
        .to('[data-apex-curtain]', { autoAlpha: 0, duration: loaderOpen ? 0.01 : 1.2 * k, ease: 'power2.inOut' }, 0)
        .fromTo('[data-apex-line]', { yPercent: 112 }, { yPercent: 0, duration: 1.15 * k, stagger: 0.12 * k }, 0.5 * k)
        .fromTo('[data-apex-sub]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 * k, stagger: 0.1 * k }, 2.15 * k)
        .fromTo('[data-apex-chrome]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 * k, stagger: 0.06 * k }, 2.5 * k)

      // Handoff, three speeds (parallax): the film lags behind the page and
      // comes a little closer; the headline runs ahead of it, the sub copy in
      // between, so the type seems to float in front of the picture. At the
      // end everything dips into the next section's black.
      // Not in a hosted widget: it sits in someone else's page.
      if (flow) return undefined
      const vh = () => window.innerHeight
      const out = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      })
      out
        .to('[data-apex-film]', { scale: 1.08, yPercent: 12 }, 0)
        .to('[data-apex-dim]', { autoAlpha: 1 }, 0.1)
        .to('[data-apex-par="h1"]', { y: () => -vh() * 0.36 }, 0)
        .to('[data-apex-par="sub"]', { y: () => -vh() * 0.18 }, 0)
        .to('[data-apex-copy]', { autoAlpha: 0, duration: 0.3 }, 0.2)
      return undefined
    },
    { scope: rootRef, dependencies: [still, flow] },
  )

  // The loader: black, the wordmark and a counter; when the film is ready the
  // hero covers it from the bottom up (the same clip, the same easing as the
  // menu's curtain). The page is held still until the cover is done.
  useGSAP(
    () => {
      const root = rootRef.current
      if (!loaderOpen || !root) return undefined
      const stage = root.querySelector('[data-apex-stage]')
      const count = root.querySelector('[data-apex-loader-count]')
      const content = root.querySelector('[data-apex-loader-content]')
      const video = videoRef.current
      if (!stage) return undefined

      const lenis = getLenis()
      lenis?.stop()
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const release = () => {
        document.body.style.overflow = prevOverflow
        lenis?.start()
      }

      const proxy = { n: 0 }
      const paint = () => {
        if (count) count.textContent = String(Math.round(proxy.n)).padStart(3, '0')
      }
      gsap.set(stage, { clipPath: 'inset(100% 0% 0% 0%)' })
      gsap.fromTo('[data-apex-loader-word]', { yPercent: 108 }, { yPercent: 0, duration: 1.1, ease: 'power3.out', delay: 0.1 })
      gsap.fromTo('[data-apex-loader-meta]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, stagger: 0.08, delay: 0.3 })

      let minDone = false
      let ready = false
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        gsap
          .timeline({
            onComplete: () => {
              loaderPlayed = true
              release()
              setLoaderOpen(false)
              gsap.set(stage, { clearProps: 'clipPath' })
              enterRef.current?.play()
            },
          })
          .to(proxy, { n: 100, duration: 0.5, ease: 'power1.out', onUpdate: paint })
          .to(content, { yPercent: -7, duration: 1.15, ease: 'power3.inOut' }, '>0.15')
          .to(stage, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power3.inOut' }, '<')
          .fromTo('[data-apex-film] video', { scale: 1.16 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, '<')
      }
      const tryFinish = () => {
        if (minDone && ready) finish()
      }
      gsap.to(proxy, {
        n: 88,
        duration: 1.7,
        ease: 'power2.out',
        onUpdate: paint,
        onComplete: () => {
          minDone = true
          tryFinish()
        },
      })
      const onReady = () => {
        ready = true
        tryFinish()
      }
      // The film (or its absence) decides when the page is ready; a stalled
      // file must not hold the page back for more than a few seconds.
      if (video?.readyState >= 2) onReady()
      else video?.addEventListener('loadeddata', onReady, { once: true })
      const cap = window.setTimeout(onReady, 4500)

      return () => {
        window.clearTimeout(cap)
        video?.removeEventListener('loadeddata', onReady)
        if (!finished) release()
      }
    },
    { scope: rootRef, dependencies: [] },
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
    '--apex-loader-bg': loaderBg || bg || '#04070d',
    '--apex-loader-fg': loaderFg || fg || '#e8edf6',
  }

  return (
    <section
      ref={rootRef}
      id="top"
      className="apex-hero relative isolate h-svh min-h-[34rem] overflow-hidden"
      style={{ ...vars, background: 'var(--apex-ink)', color: 'var(--apex-fg)' }}
    >
      {loaderOpen ? (
        <div
          data-apex-loader
          // Marca para las auditorías del repo (check:mobile/motion/parity): esperan a que se vaya.
          data-page-loader
          aria-hidden="true"
          className="absolute inset-0 z-0 flex flex-col justify-between overflow-hidden px-[5vw] pt-[max(1.1rem,2.4svh)] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-[2.4vw]"
          style={{ background: 'var(--apex-loader-bg)', color: 'var(--apex-loader-fg)' }}
        >
          <div data-apex-loader-content className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-6 text-[11px] tracking-[0.16em] uppercase lg:text-[max(11px,0.6vw)]" style={LABEL}>
              <span data-apex-loader-meta>{loaderTop}</span>
              <span data-apex-loader-meta className="hidden lg:absolute lg:left-[16%] lg:block">
                {loaderSub}
              </span>
              <span data-apex-loader-meta className="tabular-nums">
                <span data-apex-loader-count>000</span>
                <span className="opacity-60"> / 100 — {loaderLabel}</span>
              </span>
            </div>
            <span className="block overflow-hidden pb-[0.04em]">
              <span
                data-apex-loader-word
                className="block text-[clamp(5.5rem,24vw,30rem)] leading-[0.8] font-extrabold tracking-[-0.045em]"
                style={{ ...LABEL, fontWeight: 800, fontVariationSettings: "'wdth' 125", fontStretch: '125%' }}
              >
                {loaderWord}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      <div data-apex-stage className="absolute inset-0 z-[1]" style={loaderOpen ? { clipPath: 'inset(100% 0% 0% 0%)' } : undefined}>
      {/* The film and everything graded over it. */}
      {/* Taller than the hero: its top edge hides above the fold so the film can lag behind the page. */}
      <div data-apex-film className="tpl-gpu absolute inset-x-0 bottom-0 -top-[16%]">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={still || armed ? (phone ? filmPhone : film) : undefined}
          poster={phone ? posterPhone : posterDesktop}
          muted
          loop
          playsInline
          preload={still || !armed ? 'none' : 'auto'}
          disableRemotePlayback
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
        <header data-apex-chrome className="flex items-start justify-between gap-6 text-[11px] tracking-[0.16em] uppercase lg:text-[max(11px,0.6vw)]" style={LABEL}>
          <div className="flex min-w-0 items-start gap-[2.4vw]">
            {/* The wordmark opens up on hover. A hidden copy already set at the
                open spacing holds the width, so nothing beside it moves. */}
            <a href="#top" className="apex-brand tpl-hit relative inline-grid text-[12px] font-bold whitespace-nowrap md:text-[max(15px,1.05vw)]" aria-label={brand}>
              <span aria-hidden="true" className="invisible col-start-1 row-start-1 tracking-[0.2em] md:tracking-[0.46em]">
                {brand}
              </span>
              <span className="apex-brand-text col-start-1 row-start-1 tracking-[0.2em] md:tracking-[0.34em]">{brand}</span>
            </a>
            <p className="hidden max-w-[18ch] opacity-70 lg:block">{tagline}</p>
          </div>
          <nav className="hidden items-center gap-[2.2vw] md:flex" aria-label="Primary">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="tpl-link tpl-hit relative py-1">
                {l.label}
              </a>
            ))}
            <a href={ctaHref} className="apex-cta tpl-hit relative border border-current px-[1.1em] py-[0.62em]">
              {ctaLabel}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a href={ctaHref} className="apex-cta tpl-hit relative border border-current px-[0.8em] py-[0.5em] tracking-[0.1em] whitespace-nowrap md:hidden">
              {ctaLabel}
            </a>
            <button {...menu.triggerProps} className="apex-burger-btn tpl-hit relative md:ml-[1.6vw]" aria-label={menuLabel}>
              <Burger />
            </button>
          </div>
        </header>

        {/* The one thing to read. */}
        <div data-apex-copy className="mt-auto mb-[clamp(2rem,9svh,6rem)] grid items-end gap-8 md:grid-cols-12 md:gap-[1.6vw]">
          <h1
            data-apex-reveal
            data-apex-par="h1"
            className="text-[2.15rem] md:text-[clamp(2.75rem,6vw,6.25rem)] leading-[0.95] font-medium tracking-[-0.035em] md:col-span-8"
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
          <div data-apex-par="sub" className="flex max-w-[34ch] flex-col gap-5 text-[14px] leading-[1.45] md:col-span-3 md:col-start-10 md:text-[max(13px,0.95vw)]">
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
        <footer data-apex-chrome className="flex items-end justify-between gap-6 text-[11px] tracking-[0.16em] uppercase lg:text-[max(11px,0.6vw)]" style={LABEL}>
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

      </div>

      {/* The menu: a curtain that drops from the top and goes back up. */}
      <HeroMenu
        menu={menu}
        brand={brand}
        links={links}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        menuLabel={menuLabel}
        closeLabel={closeLabel}
        meta={menuMeta}
        showFilm={showMenuFilm !== 'off'}
        filmSrc={filmPhone}
        poster={posterPhone}
      />

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
        .apex-brand-text { transition: letter-spacing 600ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        .apex-burger { position: relative; display: block; width: 26px; height: 11px; }
        .apex-burger i { position: absolute; left: 0; right: 0; height: 1.5px; background: currentColor; transition: transform 520ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        .apex-burger i:nth-child(1) { top: 0; }
        .apex-burger i:nth-child(2) { bottom: 0; }
        .apex-burger[data-x] i { top: 50%; bottom: auto; margin-top: -0.75px; }
        .apex-burger[data-x] i:nth-child(1) { transform: rotate(45deg); }
        .apex-burger[data-x] i:nth-child(2) { transform: rotate(-45deg); }
        /* The menu: a curtain from the top edge; closing retracts the same edge upward. */
        .apex-sheet {
          clip-path: inset(0 0 100% 0); visibility: hidden;
          transition: clip-path 800ms var(--ease-in-out, cubic-bezier(0.77, 0, 0.175, 1)), visibility 0s linear 800ms;
        }
        .apex-sheet[data-open='true'] {
          clip-path: inset(0 0 0 0); visibility: visible;
          transition: clip-path 800ms var(--ease-in-out, cubic-bezier(0.77, 0, 0.175, 1)), visibility 0s;
        }
        .apex-menu-link {
          transform: translateY(108%);
          transition: transform 620ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)), opacity 320ms var(--ease-out, ease);
        }
        .apex-sheet[data-open='true'] .apex-menu-link {
          transform: translateY(0);
          transition: transform 900ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) calc(260ms + var(--i, 0) * 80ms), opacity 320ms var(--ease-out, ease);
        }
        .apex-menu-film { clip-path: inset(100% 0 0 0); transition: clip-path 600ms var(--ease-in-out, ease-in-out); }
        .apex-sheet[data-open='true'] .apex-menu-film { clip-path: inset(0 0 0 0); transition: clip-path 1000ms var(--ease-in-out, ease-in-out) 380ms; }
        .apex-menu-meta { opacity: 0; transition: opacity 300ms var(--ease-out, ease); }
        .apex-sheet[data-open='true'] .apex-menu-meta { opacity: 0.7; transition: opacity 700ms var(--ease-out, ease) 700ms; }
        @media (max-width: 767px) {
          .apex-wash { mix-blend-mode: normal; opacity: 0.14; }
          .apex-grain { display: none; }
        }
        @media (hover: hover) {
          .apex-brand:hover .apex-brand-text { letter-spacing: 0.46em; }
          .apex-burger-btn:hover .apex-burger:not([data-x]) i:nth-child(1) { transform: translateY(4.5px); }
          .apex-burger-btn:hover .apex-burger:not([data-x]) i:nth-child(2) { transform: translateY(-4.5px); }
          .apex-menu-list:hover .apex-menu-link:not(:hover) { opacity: 0.24; }
          .apex-cta:hover { background-color: var(--apex-fg); color: var(--apex-ink); }
          .apex-more:hover .apex-more-arrow { transform: scaleX(1.7); }
          .apex-seg:not(:disabled):hover { background: color-mix(in srgb, currentColor 60%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .apex-grain::after,
          :where(:root:not([data-motion='full'])) .apex-scroll-line,
          :where(:root:not([data-motion='full'])) .apex-sheet { animation: none; }
          :where(:root:not([data-motion='full'])) .apex-sheet,
          :where(:root:not([data-motion='full'])) .apex-menu-link,
          :where(:root:not([data-motion='full'])) .apex-menu-film,
          :where(:root:not([data-motion='full'])) .apex-menu-meta,
          :where(:root:not([data-motion='full'])) .apex-burger i,
          :where(:root:not([data-motion='full'])) .apex-brand-text,
          :where(:root:not([data-motion='full'])) .apex-cta,
          :where(:root:not([data-motion='full'])) .apex-more-arrow,
          :where(:root:not([data-motion='full'])) .apex-seg { transition: none; }
        }
      `}</style>
    </section>
  )
}

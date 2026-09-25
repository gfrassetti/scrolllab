import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import { useLang } from './lang'

/**
 * MERIDIAN — Preloader
 *
 * Structure and timing verified against the reference's own Preloader
 * (horizonte-village.com, entry bundle): full-screen sand layer, a line
 * drawing that traces itself (desktop only), the logo dead-centre, and a
 * "Loading..." label with a big counter at the bottom. The counter shows
 * min(tween, real progress) so it never claims 100% before the first
 * frames of the flythrough are actually decoded. On done the layer fades
 * out (0.8s, ease-out expo ≈ their "default-ease"), scroll unlocks and
 * `onDone` fires so the hero can play its intro.
 *
 * REPLACE ME: the sketch is a generic generated aerial map — swap
 * SKETCH for a drawing of your own property (any array of path `d`
 * strings; the draw-on reads each path's real length, so any geometry
 * works).
 */

const INK = '#2a2622'
const SAND = '#dfd8cf'
const SEEN_KEY = 'meridian-preloader-seen'

// Longer than the reference's feel on purpose: first visit 8s, repeat 3s.
const DURATION_FIRST = 8
const DURATION_SEEN = 3

// Generic aerial "pencil map" of a hillside development, generated once
// from a seeded PRNG (same drawing every load): contour lines, roads,
// axonometric houses, pools, tree canopies and palms. Order matters — the
// draw-on runs in array order, so the terrain lays down first and the
// details fill in after.
function buildSketch() {
  let a = 7
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const f = (n) => n.toFixed(1)
  const smooth = (pts) => {
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
    for (let i = 1; i < pts.length - 1; i += 1) {
      const [x, y] = pts[i]
      const [nx, ny] = pts[i + 1]
      d += ` Q${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`
    }
    const l = pts[pts.length - 1]
    return `${d} L${f(l[0])} ${f(l[1])}`
  }
  const blob = (cx, cy, r) => {
    const n = 9
    const pts = []
    for (let i = 0; i < n; i += 1) {
      const ang = (i / n) * Math.PI * 2
      const rr = r * (0.75 + rnd() * 0.5)
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr])
    }
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    const m0 = mid(pts[n - 1], pts[0])
    let d = `M${f(m0[0])} ${f(m0[1])}`
    for (let i = 0; i < n; i += 1) {
      const m = mid(pts[i], pts[(i + 1) % n])
      d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(m[0])} ${f(m[1])}`
    }
    return `${d} Z`
  }

  const out = []

  // terrain — flowing contour lines rising to the right
  for (let k = 0; k < 9; k += 1) {
    const y0 = k * 116 - 160
    const pts = []
    for (let x = -80; x <= 1520; x += 160) {
      pts.push([
        x,
        y0 +
          360 -
          x * 0.24 +
          Math.sin(x * 0.006 + k * 0.7) * 30 +
          (rnd() - 0.5) * 16,
      ])
    }
    out.push(smooth(pts))
  }

  // roads — each is a pair of parallel edges
  const roads = [
    [
      [-40, 830],
      [300, 690],
      [620, 560],
      [900, 420],
      [1180, 300],
      [1490, 150],
    ],
    [
      [560, -20],
      [650, 200],
      [700, 420],
      [690, 620],
      [730, 860],
    ],
    [
      [1490, 600],
      [1250, 540],
      [1040, 560],
      [860, 640],
      [700, 700],
    ],
  ]
  roads.forEach((r) => {
    const base = r.map(([x, y]) => [
      x + (rnd() - 0.5) * 20,
      y + (rnd() - 0.5) * 20,
    ])
    out.push(smooth(base))
    out.push(smooth(base.map(([x, y]) => [x + 9, y + 7])))
  })

  // houses — axonometric boxes with a terrace line, windows, sometimes a pool
  for (let i = 0; i < 35; i += 1) {
    const x = 330 + rnd() * 1050
    const y = 110 + rnd() * 640
    const w = 34 + rnd() * 62
    const h = 16 + rnd() * 20
    const d = 7 + rnd() * 9
    let p = `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}ZM${f(x)} ${f(y)}L${f(x + d)} ${f(y - d)}H${f(x + w + d)}L${f(x + w)} ${f(y)}M${f(x + w + d)} ${f(y - d)}V${f(y - d + h)}L${f(x + w)} ${f(y + h)}`
    const win = 1 + Math.floor(rnd() * 3)
    for (let k = 1; k <= win; k += 1) {
      const wx = x + (w * k) / (win + 1)
      p += `M${f(wx)} ${f(y + 3)}V${f(y + h - 3)}`
    }
    if (rnd() < 0.4) p += `M${f(x + 5)} ${f(y - 5)}H${f(x + w * 0.5)}`
    out.push(p)
    if (rnd() < 0.25) {
      const px = x + w + d + 8
      const py = y + h * 0.4
      out.push(`M${f(px)} ${f(py)}h26v12h-26ZM${f(px + 3)} ${f(py + 3)}h20`)
    }
  }

  // tree canopies
  for (let i = 0; i < 40; i += 1) {
    out.push(blob(-20 + rnd() * 1480, 20 + rnd() * 800, 7 + rnd() * 10))
  }

  // palms
  for (let i = 0; i < 15; i += 1) {
    const x = 340 + rnd() * 1050
    const y = 140 + rnd() * 640
    const tx = x + 1
    const ty = y - 24
    let p = `M${f(x)} ${f(y)}Q${f(x + 3)} ${f(y - 12)} ${f(tx)} ${f(ty)}`
    for (let k = 0; k < 6; k += 1) {
      const ang = (-160 + k * 28) * (Math.PI / 180)
      const len = 11 + rnd() * 7
      const ex = tx + Math.cos(ang) * len
      const ey = ty + Math.sin(ang) * len + 5
      p += `M${f(tx)} ${f(ty)}Q${f(tx + Math.cos(ang) * len * 0.6)} ${f(ty + Math.sin(ang) * len * 0.6 - 4)} ${f(ex)} ${f(ey)}`
    }
    out.push(p)
  }
  return out
}

const SKETCH = buildSketch()

export default function Preloader({
  getLoaded,
  onDone,
  onFadeStart,
  bigPx = 132,
  wordmark = 'Meridian',
}) {
  const rootRef = useRef(null)
  const numRef = useRef(null)
  const sketchRef = useRef(null)
  const markRef = useRef(null)
  const labelRef = useRef(null)
  const [gone, setGone] = useState(false)
  const { t } = useLang()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGone(true)
      onDone?.()
      return undefined
    }

    const root = rootRef.current
    if (!root) return undefined

    const seen = (() => {
      try {
        return sessionStorage.getItem(SEEN_KEY) === '1'
      } catch {
        return false
      }
    })()

    // Lenis boots after this effect (parent effects run last), so lock on
    // the next tick as well; the wheel/touch guards cover the gap and any
    // build without Lenis.
    const lock = () => getLenis()?.stop()
    lock()
    const lockTimer = window.setTimeout(lock, 0)
    const block = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    root.addEventListener('wheel', block, { passive: false })
    root.addEventListener('touchmove', block, { passive: false })

    const state = { v: 0 }
    const count = gsap.to(state, {
      v: 100,
      duration: seen ? DURATION_SEEN : DURATION_FIRST,
      ease: 'power2.inOut',
    })

    // Line drawing — desktop only, like the reference. Each path draws
    // from 0 with an in-out expo (their "sketch-ease").
    let draw
    const paths = sketchRef.current?.querySelectorAll('path')
    if (paths?.length && window.matchMedia('(min-width: 768px)').matches) {
      gsap.set(paths, {
        strokeDasharray: (_, el) => el.getTotalLength(),
        strokeDashoffset: (_, el) => el.getTotalLength(),
        opacity: 0,
      })
      // Gentle on purpose: each line fades up while it draws (sine, not
      // expo) and the lines overlap heavily, so the map surfaces rather
      // than snapping into place.
      const per = seen ? 1.6 : 4.5
      draw = gsap.to(paths, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: per,
        ease: 'sine.inOut',
        stagger: { amount: (seen ? DURATION_SEEN : DURATION_FIRST) - per },
      })
    }

    // Wordmark and counter arrive slowly, out of a soft blur.
    const soft = gsap.timeline()
    soft.fromTo(
      markRef.current,
      { autoAlpha: 0, filter: 'blur(10px)' },
      { autoAlpha: 1, filter: 'blur(0px)', duration: 2.4, ease: 'power2.out' },
      0.5,
    )
    soft.fromTo(
      labelRef.current,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 1.6, ease: 'power1.out' },
      1,
    )

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      gsap.ticker.remove(tick)
      // the hero's own wordmark starts surfacing as the layer begins to fade
      onFadeStart?.()
      gsap.to(root, {
        autoAlpha: 0,
        duration: 1.6,
        ease: 'power2.inOut',
        onComplete: () => {
          getLenis()?.start()
          try {
            sessionStorage.setItem(SEEN_KEY, '1')
          } catch {
            /* private mode — the loader just runs full length next time */
          }
          setGone(true)
          onDone?.()
        },
      })
    }

    const started = performance.now()
    function tick() {
      const real = Math.min(1, getLoaded?.() ?? 1) * 100
      const shown = Math.round(Math.min(state.v, real))
      if (numRef.current) numRef.current.textContent = String(shown)
      // safety valve: never trap the visitor behind a stalled request
      if (shown >= 100 || performance.now() - started > 15000) finish()
    }
    gsap.ticker.add(tick)

    return () => {
      window.clearTimeout(lockTimer)
      gsap.ticker.remove(tick)
      count.kill()
      draw?.kill()
      soft.kill()
      root.removeEventListener('wheel', block)
      root.removeEventListener('touchmove', block)
      if (!finished) getLenis()?.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[100] h-svh w-full"
      style={{ background: SAND, color: INK }}
    >
      <svg
        ref={sketchRef}
        aria-hidden="true"
        viewBox="0 0 1440 832"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-45 md:block"
        fill="none"
        stroke={INK}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SKETCH.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>

      <div
        ref={markRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(2rem,5vw,4rem)] leading-[1.1] whitespace-nowrap uppercase tracking-[-0.01em] md:text-[length:var(--mark)]"
        style={{
          fontFamily: "'Fraunces', serif",
          opacity: 0,
          '--mark': `${bigPx}px`,
        }}
      >
        {wordmark}
      </div>

      <div
        ref={labelRef}
        style={{ opacity: 0 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-baseline gap-2 md:bottom-12"
      >
        <p
          className="text-[11px] uppercase tracking-[0.24em]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {t('loading')}
        </p>
        <p
          className="text-4xl leading-none md:text-5xl"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          <span ref={numRef}>0</span>
          <span className="ml-0.5 text-2xl md:text-3xl">%</span>
        </p>
      </div>
    </div>
  )
}

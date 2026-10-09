import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { getLenis } from '../../../hooks/useLenis'
import { SCORE } from './score'

/**
 * FOLD — Film
 *
 * ⚠ THE FILM IN THIS DEMO IS A SAMPLE. The engine below is yours to keep; the
 * pictures are not meant to ship with your brand. To make your own film:
 * produce your clips (AI-generated or shot — each one starting on the last
 * frame of the one before), build the reel with scripts/fold-reel.mjs and
 * rewrite score.js (when each take plays, the texts, the chapters, the
 * transitions). Step by step: README → "The film".
 *
 * A scroll-driven film. One <canvas> pinned to the screen paints a long
 * sequence of WebP frames — several shots laid end to end — and how far you
 * have scrolled through the section picks the frame (forward when you scroll
 * down, backward when you scroll up). Each shot runs at an even pace across
 * its stretch of the score, so the picture keeps moving the whole way.
 *
 * On top of the frames, everything is written in the score (score.js) against
 * that same progress: a slow push of the camera, a hairline grid with ✦
 * markers that reframes each shot, text cards, the chapter rail on the left
 * with its menu, and the scene change — the frame dissolving into a field of
 * colour cell by cell, holding, and lifting off a new story.
 *
 * Frames load around the playhead (nearest first, a few at a time) at the
 * tier that fits the screen (768 or 1440 wide); while one is missing the
 * nearest loaded frame is shown, so the canvas is never blank.
 */

const INK = '#1b1a17'
const PAPER = '#f2efe6'
const SERIF = "'Fraunces', 'Times New Roman', serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"

// ---- tiny helpers ----------------------------------------------------------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

// Value of a keyed track at p (keys sorted by position), eased between keys.
function track(keys, p, pick, mix) {
  if (p <= pick(keys[0])[0]) return pick(keys[0])[1]
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [a, va] = pick(keys[i])
    const [b, vb] = pick(keys[i + 1])
    if (p <= b) return mix(va, vb, smooth(clamp((p - a) / (b - a || 1), 0, 1)))
  }
  return pick(keys[keys.length - 1])[1]
}
const vec = (a, b, t) => a.map((v, i) => lerp(v, b[i], t))
const now = () => performance.now()

// Last step at or before p.
const step = (keys, p) => keys.reduce((v, [at, value]) => (p >= at ? value : v), keys[0][1])

// The take playing at p, and where in the reel it is — a fractional frame,
// so the engine can mix a frame with the next one and every tick of scroll
// moves the picture. The manifest's `pace` curve (cumulative visible motion
// per frame, 0 → 1) spreads the scroll by how much the picture changes, so the
// same scroll always buys the same amount of movement; without it, frames run
// at an even pace.
function shotAt(scenes, p) {
  let s = scenes[0]
  for (const sc of scenes) if (p >= sc.from) s = sc
  return shotIn(s, p)
}
// Where a given take is at p (used for the take that is leaving during a
// transition, which keeps playing underneath the new one).
function shotIn(s, p) {
  const t = clamp((p - s.from) / (s.to - s.from || 1), 0, 1)
  let local = t * (s.count - 1)
  const pace = s.pace
  if (pace && pace.length === s.count) {
    let lo = 0
    let hi = pace.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (pace[mid] <= t) lo = mid
      else hi = mid
    }
    local = lo + clamp((t - pace[lo]) / (pace[hi] - pace[lo] || 1), 0, 1)
  }
  const at = s.start + local
  return { scene: s, at, idx: Math.floor(at), last: s.start + s.count - 1 }
}

// The first reel that answers: the CDN, the full local reel, the light one.
async function findReel(bases) {
  for (const base of bases.filter(Boolean)) {
    try {
      const r = await fetch(`${base}/manifest.json`)
      if (r.ok) return { base, m: await r.json() }
    } catch {
      // next one
    }
  }
  return null
}

// ---- frame reel: load around the playhead, never blank ---------------------
function createReel({ base, count, pad, tier, want = () => true }) {
  const frames = new Array(count).fill(null)
  const pending = new Set()
  let queue = []
  let inflight = 0
  const MAX = 8
  const NEAR = 10
  const AHEAD = 360
  const BEHIND = 90
  const url = (i) => `${base}/${tier}/f_${String(i + 1).padStart(pad, '0')}.webp`
  const load = (i) => {
    if (frames[i] || pending.has(i)) return
    pending.add(i)
    inflight += 1
    const img = new Image()
    img.decoding = 'async'
    img.src = url(i)
    const done = () => {
      pending.delete(i)
      inflight -= 1
      pump()
    }
    const ready = img.decode ? img.decode() : new Promise((r, j) => ((img.onload = r), (img.onerror = j)))
    ready.then(() => {
      frames[i] = img
      done()
    }, done)
  }
  function pump() {
    while (inflight < MAX && queue.length) load(queue.shift())
  }
  return {
    // Coarse to fine, ahead of the playhead first (that is where the reader
    // is going): the next few frames one by one, then every 8th frame far
    // ahead, then every 4th, 2nd, and the rest. A fast scroll always finds a
    // frame one or two away from the exact one instead of a gap.
    aim(center, dir = 1) {
      const seen = new Set()
      const order = []
      const push = (i) => {
        if (i >= 0 && i < count && !seen.has(i) && want(i)) {
          seen.add(i)
          order.push(i)
        }
      }
      for (let d = 0; d <= NEAR; d += 1) push(center + dir * d)
      // Bands of distance; inside each band every 3rd frame first (the
      // original picture — the two in between are interpolated), then the rest.
      let from = 0
      for (const to of [72, 180, AHEAD]) {
        for (const s of [3, 1]) {
          for (let d = from; d <= to; d += 1) if (d % s === 0) push(center + dir * d)
          for (let d = from; d <= Math.min(to, BEHIND); d += 1) if (d % s === 0) push(center - dir * d)
        }
        from = to + 1
      }
      queue = order.filter((i) => !frames[i] && !pending.has(i))
      pump()
    },
    get: (i) => frames[i],
    // Also keep a second playhead fed (the take leaving under a transition).
    keep(i) {
      for (let k = i, n = 0; k < count && n < 4; k += 1) if (want(k)) (load(k), (n += 1))
    },
    near(i) {
      if (frames[i]) return frames[i]
      for (let d = 1; d < count; d += 1) {
        if (frames[i - d]) return frames[i - d]
        if (frames[i + d]) return frames[i + d]
      }
      return null
    },
  }
}

// A text card: kicker, headline and body or list. In the film it fades in
// and out with the score (data-on); on a calm plate it is simply there.
function Card({ tx, live = false }) {
  return (
    <article
      {...(live ? { 'data-fold-text': true, 'data-on': 'false' } : { 'data-calm-card': true, 'data-on': 'true' })}
      data-tone={tx.tone || 'dark'}
      className={`fold-text fold-hide-on-nav absolute ${
        tx.place === 'center'
          ? 'fold-center inset-x-0 top-1/2 px-[6vw] text-center'
          : `w-[86vw] max-w-[36rem] px-[6vw] md:w-auto md:px-0 ${
              tx.place === 'right' ? 'bottom-[14svh] md:right-[8vw]' : 'top-[18svh] md:top-[34svh] md:left-[10vw]'
            }`
      }`}
    >
      <p
        className={`mb-3 flex items-center gap-3 text-[11px] tracking-[0.18em] uppercase ${tx.place === 'center' ? 'justify-center' : ''}`}
        style={{ fontFamily: MONO }}
      >
        <span aria-hidden="true" className="inline-block h-px w-6 bg-current" />
        {tx.kicker}
      </p>
      <h2
        className={`leading-[1.02] font-light tracking-[-0.02em] ${
          tx.place === 'center' ? 'text-[16vw] md:text-[7vw]' : 'text-[9vw] md:text-[3.6vw]'
        }`}
        style={{ fontFamily: SERIF }}
      >
        {tx.title}
      </h2>
      {tx.body ? <p className="mt-4 max-w-[28rem] text-[15px] leading-[1.45] md:text-[1.05vw]">{tx.body}</p> : null}
      {tx.list ? (
        <ul className="mt-6 max-w-[30rem] text-[15px] leading-[1.45] md:text-[1.05vw]">
          {tx.list.map((li) => (
            <li key={li} className="fold-li py-3">
              {li}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

// ---- reduced motion: the story as still plates ----------------------------
// No film under the scroll, no transitions, no breathing camera: each text
// sits on its own frame of the film, and fades in once when it arrives. Same
// pictures, same words, nothing that moves with the scroll.
function CalmPlates({ score }) {
  const ref = useRef(null)
  const [frames, setFrames] = useState(null)

  useEffect(() => {
    let alive = true
    findReel(score.film.bases).then((found) => {
      if (!alive || !found) return
      const { base, m } = found
      const sizes = Object.keys(m.tiers)
        .map(Number)
        .sort((x, y) => x - y)
      // A still plate covers the whole screen (on a phone, a crop of a wide
      // frame): the sharpest tier the reel has.
      const tier = sizes[sizes.length - 1]
      const shots = Object.fromEntries(m.scenes.map((sc) => [sc.id, sc]))
      const scenes = score.scenes
        .filter((sc) => shots[sc.id])
        .map((sc) => ({ ...sc, ...shots[sc.id], from: sc.from, to: sc.to }))
      setFrames(
        score.texts.map((tx) => {
          const { scene, at } = shotAt(scenes, Math.min(1, (tx.from + Math.min(1, tx.to)) / 2))
          return {
            src: `${base}/${tier}/f_${String(Math.round(at) + 1).padStart(score.film.pad, '0')}.webp`,
            focus: scene.focus ?? score.portraitFocus ?? 0.5,
          }
        }),
      )
    })
    return () => {
      alive = false
    }
  }, [score])

  useEffect(() => calmReveal(ref.current?.querySelectorAll('[data-calm-card]') ?? []), [])

  // Where each chapter starts: its first plate (the menu jumps there).
  const anchor = {}
  score.chapters.forEach((c, ci) => {
    const ti = score.texts.findIndex((tx) => tx.from >= c.at - 0.02)
    if (ti >= 0 && !anchor[ti]) anchor[ti] = `fold-ch-${ci + 1}`
  })

  return (
    <div ref={ref}>
      {score.texts.map((tx, i) => (
        <div
          key={i}
          id={anchor[i]}
          className="relative min-h-svh overflow-hidden"
          style={{ background: tx.place === 'center' ? '#45433d' : '#1b1a17' }}
        >
          {tx.place !== 'center' && frames?.[i] ? (
            <img
              src={frames[i].src}
              alt=""
              aria-hidden="true"
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${frames[i].focus * 100}% 50%` }}
            />
          ) : null}
          <Card tx={tx} />
        </div>
      ))}
    </div>
  )
}

export default function Film({ score = SCORE }) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const fxRef = useRef(null)
  const gridRef = useRef(null)
  const stRef = useRef(null)
  const menuBtnRef = useRef(null)
  const firstLinkRef = useRef(null)
  const [chapter, setChapter] = useState(0)
  const [menu, setMenu] = useState(false)
  // Reduced motion: decided once, before the first render (swapping the
  // layout after mount would tear the tree React is holding).
  const [calm] = useState(() => prefersReducedMotion())
  const [inView, setInView] = useState(false)

  // The menu button and the veil are fixed: in a page made of several
  // sections they only belong to the film while it is on screen.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const fx = fxRef.current
    if (!root || !canvas || !fx) return undefined
    const ctx = canvas.getContext('2d')
    const fctx = fx.getContext('2d')
    const calm = prefersReducedMotion()
    let alive = true

    // Phones (narrow screens) take the light frames and only the original
    // pictures (the in-between ones are interpolated): the engine still mixes
    // each frame into the next, and the data per screen drops to a third.
    // Wide screens get every frame at the sharpest tier the reel has.
    const small = window.innerWidth <= 820
    const sharp = !small && window.innerWidth * Math.min(2, window.devicePixelRatio || 1) > 1100
    let STEP = 1
    // The frame to show and the next one, on this device's step.
    const snap = (scene, at) => {
      const end = scene.start + scene.count - 1
      const k0 = Math.min(scene.start + Math.floor((at - scene.start) / STEP) * STEP, end)
      const k1 = Math.min(k0 + STEP, end)
      return { k0, k1, frac: k1 > k0 ? clamp((at - k0) / (k1 - k0), 0, 1) : 0 }
    }
    let reel = null
    let scenes = null
    findReel(score.film.bases).then((found) => {
      if (!alive || !found) return
      const { base, m } = found
      const sizes = Object.keys(m.tiers)
        .map(Number)
        .sort((a, b) => a - b)
      const tier = sharp ? sizes[sizes.length - 1] : sizes.find((w) => w >= 768) || sizes[0]
      STEP = small ? m.interp || 1 : 1
      const shots = Object.fromEntries(m.scenes.map((s) => [s.id, s]))
      scenes = score.scenes.filter((s) => shots[s.id]).map((s) => ({ ...s, ...shots[s.id], from: s.from, to: s.to }))
      const takes = m.scenes
      const want = (i) => {
        const t = takes.find((x) => i >= x.start && i < x.start + x.count)
        return !t || (i - t.start) % STEP === 0 || i === t.start + t.count - 1
      }
      reel = createReel({
        ...score.film,
        base,
        count: m.tiers[tier].count,
        tier,
        want,
      })
      reel.aim(shotAt(scenes, st.progress).idx)
    })

    // Canvas sizes follow the screen.
    let W = 0
    let H = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.round(canvas.clientWidth * dpr)
      H = Math.round(canvas.clientHeight * dpr)
      canvas.width = W
      canvas.height = H
      fx.width = W
      fx.height = H
      mask = null
      flakes = null
    }

    // ---- dots transition: a low-res mask, scaled up without smoothing ----
    let mask = null
    const buildMask = () => {
      const cell = Math.max(4, Math.round(5 * dpr))
      const mw = Math.ceil(W / cell)
      const mh = Math.ceil(H / cell)
      const c = document.createElement('canvas')
      c.width = mw
      c.height = mh
      const noise = new Float32Array(mw * mh)
      for (let y = 0; y < mh; y += 1) {
        for (let x = 0; x < mw; x += 1) {
          // Low at the bottom, high at the top: the wave rises. A soft swell
          // across the width, frayed by noise.
          const swell = 0.06 * Math.sin((x / mw) * Math.PI * 2.2 + 0.8)
          noise[y * mw + x] = 0.3 * Math.random() + 0.7 * (1 - y / mh) + swell
        }
      }
      mask = {
        c,
        mw,
        mh,
        noise,
        img: c.getContext('2d').createImageData(mw, mh),
      }
    }
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
    // cover: 0 → 1 the field rises in; lift: 0 → 1 it rises out (from below).
    const drawDots = (cover, lift, color) => {
      fctx.clearRect(0, 0, W, H)
      if (cover <= 0 || lift >= 1) return
      if (!mask) buildMask()
      const clock = now() / 1000
      const [r, g, b] = hex(color)
      const { noise, img, mw, mh, c } = mask
      const d = img.data
      const top = -0.12 + cover * 1.35 // below this the field is painted…
      const bottom = -0.12 + lift * 1.35 // …and below this it has lifted again
      const EDGE = 0.05
      for (let i = 0; i < mw * mh; i += 1) {
        const v = noise[i]
        const o = i * 4
        const inField = v < top - EDGE && v > bottom + EDGE
        const atEdge =
          !inField && ((v < top && v >= top - EDGE) || (lift > 0 && v <= bottom + EDGE && v > bottom && v < top))
        if (inField) {
          // The field is alive too: each cell glints slowly with the clock.
          const k = calm ? 1 : 1 + 0.09 * Math.sin(clock * 1.4 + v * 61) * Math.sin(clock * 0.7 + v * 23)
          d[o] = Math.min(255, r * k)
          d[o + 1] = Math.min(255, g * k)
          d[o + 2] = Math.min(255, b * k)
          d[o + 3] = 255
        } else if (atEdge) {
          // The edge: specks of light.
          const k = Math.random() > 0.5
          d[o] = k ? 246 : 196
          d[o + 1] = k ? 242 : 190
          d[o + 2] = k ? 232 : 178
          d[o + 3] = Math.random() > 0.35 ? 255 : 0
        } else {
          d[o + 3] = 0
        }
      }
      c.getContext('2d').putImageData(img, 0, 0)
      fctx.imageSmoothingEnabled = false
      fctx.drawImage(c, 0, 0, W, H)
    }

    // ---- camera: the score's push plus a slow breath with the clock -------
    let cam = null
    const camera = (p) => {
      const z = track(score.zoom, p, (k) => [k.at, [k.s, k.x, k.y]], vec)
      // The camera breathes with the clock: a slow drift that keeps the
      // picture alive while the reader stops to read.
      const t = now() / 1000
      return {
        s: z[0] * (calm ? 1 : 1.012 + 0.012 * Math.sin(t * 0.23)),
        x: z[1] + (calm ? 0 : 0.006 * Math.sin(t * 0.17)),
        y: z[2] + (calm ? 0 : 0.005 * Math.cos(t * 0.13)),
        dx: calm ? 0 : 0.006 * Math.sin(t * 0.17),
      }
    }
    // Where a frame lands on the canvas (cover, with the camera on top).
    const rect = (img, scene, c) => {
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const k = Math.max(W / iw, H / ih) * c.s
      const dw = iw * k
      const dh = ih * k
      // Tall screens crop the wide frame: hold the shot's portrait focus.
      const fx0 = H > W ? (scene.focus ?? score.portraitFocus ?? 0.5) + c.dx : c.x
      return { x: fx0 * W - fx0 * dw, y: c.y * H - c.y * dh, dw, dh, k }
    }

    // ---- paper transition: the leaving take tears into flakes of paper that
    // blow upward from the bottom, and the new take is already playing
    // underneath. Both keep moving the whole time.
    let flakes = null
    const buildFlakes = () => {
      const cols = W > H ? 24 : 10
      const rows = Math.max(6, Math.round((cols * H) / W))
      const list = []
      let seed = 7
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          list.push({
            c,
            r,
            // Bottom rows let go first, with a ragged edge.
            thr: 0.62 * (1 - (r + 0.5) / rows) + 0.22 * rnd(),
            rot: (rnd() - 0.5) * 2.6,
            drift: (rnd() - 0.5) * 0.5,
            lift: 0.7 + rnd() * 0.6,
          })
        }
      }
      flakes = { cols, rows, list }
    }
    const drawPaper = (q, tr, p) => {
      fctx.clearRect(0, 0, W, H)
      if (q >= 1 || !reel || !scenes) return
      const leaving = scenes.find((s) => s.id === tr.leaving)
      if (!leaving) return
      const { k0: idx } = snap(leaving, shotIn(leaving, p).at)
      reel.keep(idx)
      const img = reel.near(idx)
      if (!img) return
      if (!flakes) buildFlakes()
      const r = rect(img, leaving, cam || camera(p))
      const sx = img.naturalWidth / r.dw
      const sy = img.naturalHeight / r.dh
      const cw = W / flakes.cols
      const ch = H / flakes.rows
      for (const f of flakes.list) {
        const local = calm ? (q > f.thr ? 1 : 0) : clamp((q - f.thr) / 0.3, 0, 1)
        if (local >= 1) continue
        const e = local * local
        const x0 = f.c * cw
        const y0 = f.r * ch
        const srcX = (x0 - r.x) * sx
        const srcY = (y0 - r.y) * sy
        if (e <= 0) {
          fctx.drawImage(img, srcX, srcY, cw * sx, ch * sy, x0, y0, cw + 0.5, ch + 0.5)
          continue
        }
        fctx.save()
        fctx.globalAlpha = 1 - e
        fctx.translate(x0 + cw / 2 + f.drift * e * W * 0.3, y0 + ch / 2 - e * H * 0.75 * f.lift)
        fctx.rotate(f.rot * e)
        fctx.scale(1 - e * 0.45, 1 - e * 0.45)
        fctx.drawImage(img, srcX, srcY, cw * sx, ch * sy, -cw / 2, -ch / 2, cw, ch)
        // A paper edge catching the light.
        fctx.strokeStyle = 'rgba(246, 242, 232, 0.55)'
        fctx.lineWidth = Math.max(1, dpr)
        fctx.strokeRect(-cw / 2, -ch / 2, cw, ch)
        fctx.restore()
      }
    }

    // ---- per-frame update -------------------------------------------------
    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
    })
    stRef.current = st
    const gridEls = gridRef.current
    const texts = gsap.utils.toArray('[data-fold-text]', root)

    let lastIdx = -1
    let lastChapter = -1
    let fxDirty = false

    const render = () => {
      // The film follows the scroll directly: Lenis already smooths the wheel,
      // a second ease on top made the picture arrive late.
      const p = st.progress

      // Frame + camera.
      if (reel && scenes.length) {
        const { scene, at } = shotAt(scenes, p)
        const { k0: idx, k1, frac } = snap(scene, at)
        if (idx !== lastIdx) {
          reel.aim(idx, idx >= lastIdx ? 1 : -1)
          lastIdx = idx
        }
        const img = reel.near(idx)
        cam = camera(p)
        if (img) {
          const r = rect(img, scene, cam)
          ctx.globalAlpha = 1
          ctx.drawImage(img, r.x, r.y, r.dw, r.dh)
          // Between two frames, mix in the next one by how far we are.
          const next = k1 > idx && frac > 0.02 ? reel.get(k1) : null
          if (next && img === reel.get(idx)) {
            ctx.globalAlpha = frac
            ctx.drawImage(next, r.x, r.y, r.dw, r.dh)
            ctx.globalAlpha = 1
          }
        }
      }

      // Grid.
      if (gridEls) {
        const [l, t, r, b] = track(score.grid, p, (k) => [k.at, k.r], vec)
        gridEls.style.setProperty('--l', `${l * 100}%`)
        gridEls.style.setProperty('--t', `${t * 100}%`)
        gridEls.style.setProperty('--r', `${r * 100}%`)
        gridEls.style.setProperty('--b', `${b * 100}%`)
      }

      // Scene changes.
      let active = false
      for (const tr of score.transitions) {
        if (p < tr.from - 0.005 || p > tr.to + 0.005) continue
        active = true
        fxDirty = true
        if (tr.type === 'paper') {
          drawPaper(clamp((p - tr.from) / (tr.to - tr.from), 0, 1), tr, p)
          continue
        }
        const cover = smooth(clamp((p - tr.from) / (tr.full - tr.from), 0, 1))
        const lift = smooth(clamp((p - tr.out) / (tr.to - tr.out), 0, 1))
        drawDots(cover, lift, tr.color)
      }
      if (!active && fxDirty) {
        fctx.clearRect(0, 0, W, H)
        fxDirty = false
      }
      const tone = step(score.tone, p)
      if (root.dataset.tone !== tone) root.dataset.tone = tone

      // Texts.
      texts.forEach((el, i) => {
        const tx = score.texts[i]
        const on = p >= tx.from && p <= tx.to
        if (el.dataset.on !== String(on)) el.dataset.on = String(on)
      })

      // Chapter.
      const ch = score.chapters.reduce((v, c, i) => (p >= c.at ? i : v), 0)
      if (ch !== lastChapter) {
        lastChapter = ch
        setChapter(ch)
      }
    }

    resize()
    gsap.ticker.add(render)
    window.addEventListener('resize', resize)
    return () => {
      alive = false
      gsap.ticker.remove(render)
      window.removeEventListener('resize', resize)
      st.kill()
    }
  }, [score])

  // ---- menu ----------------------------------------------------------------
  useEffect(() => {
    const html = document.documentElement
    if (!menu) {
      delete html.dataset.foldNav
      return undefined
    }
    html.dataset.foldNav = 'open'
    getLenis()?.stop()
    const t = window.setTimeout(() => firstLinkRef.current?.focus({ preventScroll: true }), 120)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenu(false)
        menuBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      delete html.dataset.foldNav
      getLenis()?.start()
    }
  }, [menu])

  // Jump to a chapter: under the veil, so the reader never sees the skip.
  const goTo = (i, e) => {
    e?.preventDefault()
    if (calm) {
      document.getElementById(`fold-ch-${i + 1}`)?.scrollIntoView()
      setMenu(false)
      return
    }
    const st = stRef.current
    if (!st) return
    const y = Math.ceil(st.start + score.chapters[i].at * (st.end - st.start)) + (i ? 2 : 0)
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
    else window.scrollTo(0, y)
    setMenu(false)
  }

  return (
    <section
      ref={rootRef}
      data-tone="dark"
      data-inview={inView || menu ? '' : undefined}
      className={`fold-film relative${calm ? '' : ' fold-scroll'}`}
      style={calm ? undefined : { '--screens': score.screens, '--screens-phone': score.screensPhone ?? score.screens }}
    >
      {calm ? (
        <CalmPlates score={score} />
      ) : (
        <div
        className="sticky top-0 h-svh overflow-hidden bg-[#e9e2d3] bg-cover bg-center"
        // The first frame of the light reel as the opening picture: the film
        // never starts on an empty page while its frames load.
        style={{ backgroundImage: "url('/fold/demo/768/f_0001.webp')" }}
      >
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
          <canvas ref={fxRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />

          {/* Grid: hairlines framing the scene, ✦ at the crossings. */}
          <div ref={gridRef} aria-hidden="true" className="fold-ov fold-grid pointer-events-none absolute inset-0">
            <span className="fold-gl fold-gl-v" style={{ left: 'var(--l)' }} />
            <span className="fold-gl fold-gl-v" style={{ left: 'var(--r)' }} />
            <span className="fold-gl fold-gl-h" style={{ top: 'var(--t)' }} />
            <span className="fold-gl fold-gl-h" style={{ top: 'var(--b)' }} />
            {[
              ['var(--l)', 'var(--t)'],
              ['var(--r)', 'var(--t)'],
              ['var(--l)', 'var(--b)'],
              ['var(--r)', 'var(--b)'],
            ].map(([x, y]) => (
              <svg key={`${x}${y}`} className="fold-star" viewBox="0 0 20 20" style={{ left: x, top: y }}>
                <path d="M10 0C10.6 6 14 9.4 20 10 14 10.6 10.6 14 10 20 9.4 14 6 10.6 0 10 6 9.4 9.4 6 10 0Z" />
              </svg>
            ))}
          </div>

          {/* Frame: the column line on the left and the line under the header. */}
          <div aria-hidden="true" className="fold-ov fold-frame pointer-events-none absolute inset-0">
            <span className="fold-fv">
              <i />
            </span>
            <span className="fold-fh">
              <i />
            </span>
          </div>

          {/* Chapter rail: a tick per chapter, the active one long and named. */}
          <nav className="fold-ov fold-rail fold-hide-on-nav" aria-label="Chapters">
            {score.chapters.map((c, i) => (
              <a
                key={c.title}
                href={`#chapter-${i + 1}`}
                className={`tpl-hit${i === chapter ? ' on' : ''}`}
                aria-current={i === chapter ? 'step' : undefined}
                onClick={(e) => goTo(i, e)}
              >
                <i />
                <em style={{ fontFamily: MONO }}>{c.title}</em>
              </a>
            ))}
          </nav>

          {/* Text cards. */}
          {score.texts.map((tx, i) => (
            <Card key={i} tx={tx} live />
          ))}
        </div>
      )}

      {/* Menu button: four squares in the left column. */}
      <button
        ref={menuBtnRef}
        type="button"
        className="fold-menu"
        aria-label={menu ? 'Close' : 'Menu'}
        aria-expanded={menu}
        aria-controls="fold-nav"
        onClick={() => setMenu((v) => !v)}
      >
        <span />
        <span />
        <span />
        <span />
      </button>

      {/* Menu: the film blurs behind a veil, the chapters come up in a column. */}
      <div className="fold-veil" aria-hidden="true" />
      <nav id="fold-nav" className="fold-nav" aria-label="Chapters" aria-hidden={!menu} inert={!menu}>
        {score.chapters.map((c, i) => (
          <a
            key={c.title}
            ref={i === 0 ? firstLinkRef : undefined}
            href={`#chapter-${i + 1}`}
            onClick={(e) => goTo(i, e)}
            style={{ transitionDelay: menu ? `${0.05 + i * 0.07}s` : '0s' }}
          >
            <b style={{ fontFamily: MONO }}>Ch. {i + 1}</b>
            <em style={{ fontFamily: SERIF }}>{c.title}</em>
          </a>
        ))}
      </nav>

      <style>{`
        /* A phone moves the page much further per swipe than a wheel tick:
           a shorter scroll for the same film (score.screensPhone). */
        .fold-scroll { height: calc(var(--screens) * 100svh); }
        @media (max-width: 820px) { .fold-scroll { height: calc(var(--screens-phone) * 100svh); } }
        .fold-film { color: ${INK}; --ease: cubic-bezier(0.22, 1, 0.36, 1); --v1: 5.3%; --h1: 5.3vw; }
        .fold-film[data-tone='light'] .fold-ov { color: ${PAPER}; }
        .fold-ov { transition: color 420ms linear, opacity 380ms var(--ease); }
        .fold-gl { position: absolute; background: currentColor; opacity: 0.32; }
        .fold-gl-v { top: 0; bottom: 0; width: 1px; }
        .fold-gl-h { left: 0; right: 0; height: 1px; }
        .fold-star { position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; fill: currentColor; }

        .fold-fv, .fold-fh { position: absolute; display: block; }
        .fold-fv { left: var(--v1); top: 0; bottom: 0; width: 1px; }
        .fold-fh { top: var(--h1); left: 0; right: 0; height: 1px; }
        .fold-fv i, .fold-fh i { display: block; width: 100%; height: 100%; background: currentColor; opacity: 0.22; }
        .fold-fv i { transform-origin: 50% 0; animation: foldRuleV 1.15s var(--ease) both; }
        .fold-fh i { transform-origin: 0 50%; animation: foldRuleH 1.15s var(--ease) both; }
        @keyframes foldRuleV { from { transform: scaleY(0); } }
        @keyframes foldRuleH { from { transform: scaleX(0); } }

        .fold-rail { position: absolute; left: var(--v1); top: 24%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 24px; opacity: 0; animation: foldIn 0.8s var(--ease) 0.4s forwards; }
        .fold-rail a { position: relative; display: flex; align-items: center; height: 11px; color: inherit; text-decoration: none; opacity: 0.4; transition: opacity 0.32s linear; }
        .fold-rail a i { display: block; width: 9px; height: 1px; background: currentColor; transition: width 0.5s var(--ease); }
        .fold-rail a em { position: absolute; left: 34px; font-size: 11px; font-style: normal; line-height: 1; letter-spacing: 0.2em; text-transform: uppercase; white-space: nowrap; opacity: 0; transform: translateX(-4px); transition: opacity 0.35s linear, transform 0.5s var(--ease); }
        .fold-rail a:hover, .fold-rail a.on { opacity: 1; }
        .fold-rail a.on i { width: 22px; }
        .fold-rail a:hover em, .fold-rail a.on em { opacity: 0.9; transform: none; }
        .fold-rail a:focus-visible { outline: 1px solid currentColor; outline-offset: 6px; }
        @keyframes foldIn { to { opacity: 1; } }
        @media (max-width: 900px) { .fold-rail { display: none; } }

        .fold-menu { position: fixed; z-index: 40; left: 2.65%; top: calc(var(--h1) * 1.5); transform: translate(-50%, -50%); display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(1.5px, 0.18vw, 3px); line-height: 0; padding: 0; border: 0; background: none; cursor: pointer; color: ${INK}; opacity: 0; animation: foldMenuIn 0.7s var(--ease) 1.1s forwards; transition: color 420ms linear; }
        .fold-menu::before { content: ''; position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; transform: translate(-50%, -50%); }
        .fold-menu span { display: block; width: clamp(3px, 0.27vw, 4.5px); aspect-ratio: 1; background: currentColor; transition: transform 0.5s var(--ease); }
        .fold-menu:hover span:nth-child(1) { transform: translate(-1px, -1px); }
        .fold-menu:hover span:nth-child(2) { transform: translate(1px, -1px); }
        .fold-menu:hover span:nth-child(3) { transform: translate(-1px, 1px); }
        .fold-menu:hover span:nth-child(4) { transform: translate(1px, 1px); }
        .fold-menu:focus-visible { outline: 1px solid currentColor; outline-offset: 10px; }
        .fold-film[data-tone='light'] .fold-menu, [data-fold-nav='open'] .fold-menu { color: ${PAPER}; }
        .fold-film:not([data-inview]) .fold-menu { opacity: 0 !important; pointer-events: none; }
        @keyframes foldMenuIn { from { opacity: 0; transform: translate(-50%, calc(-50% + 10px)); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @media (max-width: 820px) { .fold-menu { left: 24px; top: 68px; } }

        .fold-veil { position: fixed; inset: 0; z-index: 30; pointer-events: none; opacity: 0; visibility: hidden; background: rgba(32, 31, 28, 0.52); backdrop-filter: blur(26px) saturate(1.15); -webkit-backdrop-filter: blur(26px) saturate(1.15); transition: opacity 0.62s var(--ease), visibility 0s 0.62s; }
        [data-fold-nav='open'] .fold-veil { opacity: 1; visibility: visible; transition: opacity 0.62s var(--ease); }
        [data-fold-nav='open'] .fold-hide-on-nav { opacity: 0 !important; pointer-events: none !important; }

        .fold-nav { position: fixed; inset: 0; z-index: 35; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; visibility: hidden; transition: visibility 0s 0.62s; }
        [data-fold-nav='open'] .fold-nav { pointer-events: auto; visibility: visible; transition: none; }
        .fold-nav a { position: relative; display: block; width: clamp(280px, 27vw, 500px); padding: 26px 0 30px; text-align: center; color: ${PAPER}; text-decoration: none; opacity: 0; transform: translateY(22px); transition: opacity 0.64s var(--ease), transform 0.76s var(--ease), color 0.38s linear; }
        [data-fold-nav='open'] .fold-nav a { opacity: 1; transform: none; }
        .fold-nav a::after, .fold-nav a::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; transform: scaleX(0); transform-origin: 0 50%; }
        .fold-nav a::after { background: rgba(242, 239, 230, 0.17); transition: transform 0.82s var(--ease); }
        .fold-nav a::before { background: ${PAPER}; transition: transform 0.46s var(--ease); }
        .fold-nav a:last-child::after, .fold-nav a:last-child::before { display: none; }
        [data-fold-nav='open'] .fold-nav a::after { transform: scaleX(1); }
        [data-fold-nav='open'] .fold-nav a:nth-child(1)::after { transition-delay: 0.3s; }
        [data-fold-nav='open'] .fold-nav a:nth-child(2)::after { transition-delay: 0.4s; }
        [data-fold-nav='open'] .fold-nav a:nth-child(3)::after { transition-delay: 0.5s; }
        .fold-nav b { display: block; margin: 0 0 clamp(10px, 1vw, 18px); font-size: clamp(11px, 0.62vw, 12px); font-weight: 400; line-height: 1; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(242, 239, 230, 0.62); transition: color 0.38s linear; }
        .fold-nav em { display: block; font-size: clamp(34px, 4.6vw, 86px); font-style: normal; font-weight: 300; line-height: 0.98; letter-spacing: -0.015em; }
        @media (hover: hover) {
          [data-fold-nav='open'] .fold-nav:hover a { color: rgba(242, 239, 230, 0.34); }
          [data-fold-nav='open'] .fold-nav:hover a b { color: rgba(242, 239, 230, 0.22); }
          [data-fold-nav='open'] .fold-nav a:hover { color: ${PAPER}; }
          [data-fold-nav='open'] .fold-nav a:hover b { color: rgba(242, 239, 230, 0.7); }
          [data-fold-nav='open'] .fold-nav a:hover::before { transform: scaleX(1); }
        }
        .fold-nav a:focus-visible { outline: none; }
        .fold-nav a:focus-visible::before { transform: scaleX(1); }

        .fold-text { opacity: 0; transform: translateY(24px); filter: blur(6px); transition: opacity 700ms ease, transform 900ms var(--ease), filter 700ms ease; pointer-events: none; }
        .fold-text[data-on='true'] { opacity: 1; transform: none; filter: blur(0); pointer-events: auto; }
        .fold-text { text-shadow: 0 0 22px rgba(233, 226, 211, 0.9), 0 0 6px rgba(233, 226, 211, 0.7); }
        .fold-text[data-tone='light'] { color: ${PAPER}; text-shadow: 0 0 22px rgba(20, 19, 17, 0.75), 0 0 6px rgba(20, 19, 17, 0.6); }
        .fold-center { transform: translateY(calc(-50% + 24px)); }
        .fold-center[data-on='true'] { transform: translateY(-50%); }
        .fold-li { border-top: 1px solid currentColor; border-color: color-mix(in srgb, currentColor 28%, transparent); }

        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .fold-text { transition: opacity 300ms ease; transform: none; filter: none; }
          :where(:root:not([data-motion='full'])) .fold-center { transform: translateY(-50%); }
          :where(:root:not([data-motion='full'])) .fold-fv i, :where(:root:not([data-motion='full'])) .fold-fh i { animation: none; }
          :where(:root:not([data-motion='full'])) .fold-menu, :where(:root:not([data-motion='full'])) .fold-rail { animation: none; opacity: 1; }
          :where(:root:not([data-motion='full'])) .fold-nav a { transform: none; }
        }
      `}</style>
    </section>
  )
}

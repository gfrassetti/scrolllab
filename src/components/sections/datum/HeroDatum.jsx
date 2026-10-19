import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'

/**
 * HeroDatum — the opening of DATUM, an architecture practice: the page is a drawing sheet.
 *
 * The name runs edge to edge over a sheet of only two hairlines and a diagonal from corner to corner (the
 * datum line). The lines are not on a fixed grid: the name is measured, so the first letter ends exactly
 * on the first line and a stem of a middle letter lands on the second one (the size and the letter
 * spacing are solved for it). Scrolling, the name leaves (the menu takes its place at the top), the datum
 * turns a full circle and settles level, clearing the first copy as it sweeps; the statement rises from
 * below and is cut by the level line as it passes it; then black comes up the sheet — the «poché» of a
 * section drawing — and the second statement comes up in paper colour.
 *
 * Every number lives in `apply(q)` (q = 0 → 1 over the section). Reduced motion: no pin, the sheet and
 * both statements in place, nothing hidden.
 */
const CSS = `
.datum-hero { position: relative; height: 420svh; }
.datum-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--datum-paper); }
.datum-layer { position: absolute; inset: 0; z-index: 2; }
/* the statement only shows below the level datum: it disappears into the line as it rises */
.datum-layer[data-reveal] { z-index: 3; -webkit-mask-image: linear-gradient(180deg, transparent 50%, #000 50%); mask-image: linear-gradient(180deg, transparent 50%, #000 50%); }
.datum-sheet { position: absolute; inset: 0; pointer-events: none; z-index: 4; mix-blend-mode: difference;
  --hair: rgba(239,239,237,.2); --hair-strong: rgba(239,239,237,.3); }
.datum-col { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--hair); }
.datum-diag { position: absolute; inset: 0;
  background: linear-gradient(var(--a), transparent calc(50% - .5px), var(--hair-strong) calc(50% - .5px), var(--hair-strong) calc(50% + .5px), transparent calc(50% + .5px)); }
.datum-sweep { position: absolute; inset: 0;
  background: linear-gradient(var(--a2), transparent calc(var(--p2) - .5px), rgba(239,239,237,.55) calc(var(--p2) - .5px), rgba(239,239,237,.55) calc(var(--p2) + .5px), transparent calc(var(--p2) + .5px)); }
.datum-brand { position: absolute; left: 0; right: 0; top: 1.6svh; z-index: 2; white-space: nowrap; line-height: .78;
  font-family: 'Archivo', sans-serif; font-weight: 800; font-variation-settings: 'wdth' 125; font-kerning: none; will-change: transform; }
.datum-brand > span { display: inline-block; }
.datum-copy { position: absolute; z-index: 2; letter-spacing: -.01em; }
.datum-cap { font-weight: 500; font-size: 14px; line-height: 1.15; }
.datum-lede { font-size: clamp(26px, 3.06vw, 52px); line-height: 1.05; letter-spacing: -.035em; }
.datum-meta { font-weight: 500; font-size: 12px; }
.datum-scale { align-items: flex-end; font-weight: 500; font-size: 10px; letter-spacing: .06em; }
.datum-scale i { display: block; width: 2.6vw; max-width: 40px; height: 6px; border: 1px solid currentColor; border-top: 0; }
.datum-scale i:nth-child(odd) { background: currentColor; }
/* the first copy: the turning datum wipes it, two opposite sectors growing like a drafting arm */
.datum-fade { --m: conic-gradient(from var(--c0, 0deg) at 50% 50%, transparent 0deg var(--d, 0deg), #000 var(--d, 0deg) 180deg,
  transparent 180deg calc(180deg + var(--d, 0deg)), #000 calc(180deg + var(--d, 0deg)) 360deg);
  -webkit-mask-image: var(--m); mask-image: var(--m); }
/* the statement: three lines stepped like a section, resting just under the level datum */
.datum-statement { position: absolute; z-index: 3; right: 25%; top: calc(50% + 4svh);
  font-size: clamp(40px, 5.2vw, 96px); line-height: .98; letter-spacing: -.045em; text-align: right; will-change: transform; }
.datum-statement span { display: block; }
.datum-statement span:nth-child(odd) { padding-right: 12.5vw; }
/* the poché: black comes up the sheet behind the second sweep */
.datum-poche { position: absolute; inset: 0; z-index: 3; background: var(--datum-ink);
  -webkit-mask-image: linear-gradient(var(--a2), #000 var(--p2), transparent var(--p2));
  mask-image: linear-gradient(var(--a2), #000 var(--p2), transparent var(--p2)); }
.datum-statement[data-second] { color: var(--datum-paper); z-index: 3; right: auto; left: 50%; top: 50%; text-align: left;
  transform: translate(-30%, -50%); opacity: 0; will-change: auto; }
.datum-statement[data-second] span:nth-child(odd) { padding: 0; }
.datum-statement[data-second] span:nth-child(2) { padding-left: 12.5vw; }
@media (max-width: 767px) {
  .datum-statement { right: 6vw; font-size: 12vw; }
  .datum-statement span:nth-child(odd) { padding-right: 10vw; }
  .datum-statement[data-second] { left: 6vw; transform: translateY(-50%); }
  .datum-statement[data-second] span:nth-child(2) { padding-left: 10vw; }
}
/* reduced motion: the drawing, unpinned and complete; the second statement follows on the black */
.datum-hero[data-calm] { height: auto; }
.datum-hero[data-calm] .datum-stage { position: relative; height: auto; min-height: 100svh; }
.datum-hero[data-calm] .datum-layer, .datum-hero[data-calm] .datum-fade { -webkit-mask-image: none; mask-image: none; }
.datum-hero[data-calm] .datum-poche { display: none; }
.datum-hero[data-calm] .datum-statement[data-second] { position: relative; left: auto; top: auto; transform: none; opacity: 1;
  margin-top: 100svh; padding: 14svh 6vw; background: var(--datum-ink); }
`

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (q, a, b) => clamp01((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3

// The ink of each letter of the name, in em, drawn on a canvas in the brand's own face (Archivo 800,
// wdth 125, no kerning): advance, left and right ink, and the edges of its stems (columns inked over
// almost the whole height — the T's stem, the D's back, the U's legs).
function inkMetrics(text) {
  const S = 300
  const cv = document.createElement('canvas')
  cv.width = S * 2
  cv.height = S * 1.4
  const c = cv.getContext('2d', { willReadFrequently: true })
  c.font = `800 ${S}px Archivo`
  if ('fontStretch' in c) c.fontStretch = 'expanded'
  if ('fontKerning' in c) c.fontKerning = 'none'
  const ox = S * 0.5
  return [...text].map((ch) => {
    c.clearRect(0, 0, cv.width, cv.height)
    c.fillText(ch, ox, S * 1.1)
    const adv = c.measureText(ch).width / S
    const { data, width, height } = c.getImageData(0, 0, cv.width, cv.height)
    const col = new Uint16Array(width)
    let top = height
    let bottom = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 127) {
          col[x]++
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }
    let l = -1
    let r = -1
    for (let x = 0; x < width; x++) {
      if (col[x]) {
        if (l < 0) l = x
        r = x + 1
      }
    }
    if (l < 0) return { adv, l: 0, r: adv, edges: [] }
    const full = (bottom - top + 1) * 0.9
    const edges = []
    let inStem = false
    for (let x = l; x <= r; x++) {
      const stem = x < r && col[x] >= full
      if (stem !== inStem) {
        edges.push((x - ox) / S)
        inStem = stem
      }
    }
    return { adv, l: (l - ox) / S, r: (r - ox) / S, edges }
  })
}

// Size, letter spacing and offset of the name for a sheet W wide: the first letter ends on the first line
// (12.5%), the last one ends at the right edge, and a stem of a middle letter lands on the second line
// (50% or 62.5%, whichever leaves the first letter closest to the left edge).
function solveName(m, W) {
  const n = m.length
  const C = []
  let acc = 0
  for (const g of m) {
    C.push(acc)
    acc += g.adv
  }
  const first = m[0]
  const last = m[n - 1]
  const L1 = 0.125
  let best = null
  if (n >= 3) {
    // fs·A1 + (n−1)·ls = R1 (last letter at the edge) and fs·A2 + i·ls = R2 (a stem on the second line)
    const A1 = C[n - 1] + last.r - first.r
    const R1 = (1 - L1) * W
    for (let i = 1; i < n - 1; i++) {
      for (const e of m[i].edges) {
        for (const t of [0.5, 0.625]) {
          const A2 = C[i] + e - first.r
          const R2 = (t - L1) * W
          const det = A1 * i - (n - 1) * A2
          if (Math.abs(det) < 1e-6) continue
          const fs = (R1 * i - (n - 1) * R2) / det
          const ls = (A1 * R2 - A2 * R1) / det
          if (!(fs > 0) || ls < 0) continue
          const x0 = L1 * W - fs * first.r
          const left = x0 + fs * first.l
          if (left < -1 || left > W * 0.02) continue
          if (!best || Math.abs(left) < Math.abs(best.left)) best = { fs, ls, x0, left, l2: t }
        }
      }
    }
  }
  if (best) return best
  // no stem fits: the first letter fills the first column and the rest shares out the width
  const fs = (L1 * W) / Math.max(0.01, first.r - first.l)
  const x0 = -fs * first.l
  const ls = n > 1 ? Math.max(0, (W - x0 - fs * (C[n - 1] + last.r)) / (n - 1)) : 0
  return { fs, ls, x0, l2: 0.5 }
}

export default function HeroDatum({
  name = 'DATUM',
  caption = 'Measured form.\nRooms that last.',
  lede = 'An architecture practice\nthat draws every line\ntwice before it builds one.',
  statement = ['Every line', 'becomes', 'a wall.'],
  second = ['Every wall', 'holds', 'a life.'],
  place = 'Porto · Est. 2009',
  scaleLabel = '0 — 4 m · 1:100',
  hint = 'Scroll to read the drawing',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const el = root.current
      const stage = el.querySelector('[data-stage]')
      const brand = el.querySelector('[data-brand]')
      const word = brand.firstElementChild
      const first = el.querySelector('[data-reveal] .datum-statement')
      const second2 = el.querySelector('[data-second]')
      const fade = el.querySelector('.datum-fade')
      const docStyle = document.documentElement.style
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (calm) el.dataset.calm = ''

      const box = { W: 1, H: 1, a: 37, navTop: 0, rise: 0, exit: 0, out: 0 }
      let metrics = null
      let retries = 0
      let lastQ = 0
      const layout = () => {
        const W = stage.clientWidth
        const H = window.innerHeight
        box.W = W
        box.H = H
        // the datum starts exactly corner to corner, whatever the screen
        box.a = (Math.atan2(H, W) * 180) / Math.PI
        if (!metrics) metrics = inkMetrics(word.textContent)
        const fit = solveName(metrics, W)
        brand.style.fontSize = `${fit.fs}px`
        word.style.letterSpacing = `${fit.ls}px`
        word.style.marginRight = `${-fit.ls}px`
        word.style.marginLeft = `${fit.x0}px`
        // the canvas and the page must have measured the same face: while they don't (the font is still on
        // its way, or reached one and not the other), try again a little later
        const sum = metrics.reduce((t, g) => t + g.adv, 0)
        if (Math.abs(word.getBoundingClientRect().width - (fit.fs * sum + metrics.length * fit.ls)) > 2 && retries++ < 40) {
          window.setTimeout(remeasure, 150)
        }
        docStyle.setProperty('--datum-l1', '12.5%')
        docStyle.setProperty('--datum-l2', `${fit.l2 * 100}%`)
        box.navTop = brand.offsetTop + brand.offsetHeight + H * 0.026
        // far enough up that no ink is left (the letters overhang their tight line box)
        box.out = brand.offsetTop + brand.offsetHeight + fit.fs * 0.25
        docStyle.setProperty('--datum-nav-top', `${box.navTop}px`)
        // the statement rises from under the screen and leaves through the level line
        box.rise = H * 0.5
        box.exit = -(first.offsetHeight + H * 0.04 + 4)
        if (!calm) apply(lastQ)
      }

      // q: 0 → 1 over the section.
      const apply = (q) => {
        lastQ = q
        const out = ease(seg(q, 0.0, 0.12))
        brand.style.transform = `translate3d(0, ${-out * box.out}px, 0)`
        docStyle.setProperty('--datum-nav-y', `${-out * box.navTop}px`)

        // the datum turns a full circle and settles level (540° ≡ 180°): the first half-turn wipes the copy
        const s1 = ease(seg(q, 0.06, 0.42))
        const a = box.a + s1 * (540 - box.a)
        stage.style.setProperty('--a', `${a}deg`)
        fade.style.setProperty('--c0', `${box.a + 90}deg`)
        fade.style.setProperty('--d', `${Math.min(180, a - box.a)}deg`)
        fade.style.visibility = a - box.a >= 180 ? 'hidden' : ''

        // the statement comes up under the line, rests, then goes into it
        const up = easeOut(seg(q, 0.36, 0.52))
        const gone = ease(seg(q, 0.6, 0.72))
        first.style.transform = `translate3d(0, ${(1 - up) * box.rise + gone * box.exit}px, 0)`

        // black comes up the sheet behind a second, level sweep
        const s2 = ease(seg(q, 0.66, 0.88))
        stage.style.setProperty('--a2', '0deg')
        stage.style.setProperty('--p2', `${-4 + s2 * 108}%`)
        second2.style.opacity = String(clamp01((q - 0.8) / 0.08))
      }

      // measured again with the real face once it has loaded (asked for by name: `ready` can resolve before
      // the brand's face has even started loading, and the canvas would measure the fallback)
      let dead = false
      const remeasure = () => {
        if (dead) return
        metrics = null
        layout()
        if (calm) stage.style.setProperty('--a', `${box.a}deg`)
      }
      document.fonts?.load(`800 expanded 100px Archivo`, name).then(remeasure, () => {})
      document.fonts?.ready.then(remeasure)
      document.fonts?.addEventListener('loadingdone', remeasure)

      if (calm) {
        stage.style.setProperty('--a2', '0deg')
        stage.style.setProperty('--p2', '-4%')
        remeasure()
        return () => {
          dead = true
          document.fonts?.removeEventListener('loadingdone', remeasure)
        }
      }
      layout()
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => apply(self.progress),
      })
      const ro = new ResizeObserver(layout)
      ro.observe(stage)
      return () => {
        dead = true
        document.fonts?.removeEventListener('loadingdone', remeasure)
        st.kill()
        ro.disconnect()
      }
    },
    { scope: root },
  )

  const lines = (t) => t.split('\n').map((l, i) => (i ? [<br key={i} />, l] : l))

  return (
    <section ref={root} id="top" className="datum-hero" aria-label={name}>
      <style>{CSS}</style>
      <div data-stage="" className="datum-stage">
        <div className="datum-sheet" aria-hidden="true">
          {/* two lines only: the first letter ends on the first, a stem of the name stands on the second */}
          <i className="datum-col" style={{ left: 'var(--datum-l1, 12.5%)' }} />
          <i className="datum-col" style={{ left: 'var(--datum-l2, 50%)' }} />
          <i className="datum-diag" />
          <i className="datum-sweep" />
        </div>

        <h1 data-brand="" className="datum-brand">
          <span>{name}</span>
        </h1>

        {/* the first copy: wiped by the turning datum */}
        <div className="datum-layer datum-fade">
          <p className="datum-copy datum-cap hidden md:block" style={{ left: 'var(--datum-l1, 12.5%)', top: 'calc(var(--datum-nav-top, 30svh) + 18svh)' }}>
            {lines(caption)}
          </p>
          <p className="datum-copy datum-lede left-[6vw] md:left-[var(--datum-l2,50%)]" style={{ top: 'calc(var(--datum-nav-top, 30svh) + 16svh)' }}>
            {lines(lede)}
          </p>
          <p className="datum-copy datum-meta hidden md:block" style={{ left: 'var(--datum-l1, 12.5%)', bottom: 26 }}>
            {place}
          </p>
          <div className="datum-copy datum-scale hidden md:flex" style={{ left: 'var(--datum-l2, 50%)', bottom: 26 }} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 8 }}>{scaleLabel}</span>
          </div>
          <p className="datum-copy datum-meta right-[6vw] md:right-4" style={{ bottom: 26 }}>
            {hint}
          </p>
        </div>

        {/* the statement: rises under the level datum and goes into it */}
        <div className="datum-layer" data-reveal="">
          <h2 className="datum-statement" aria-label={statement.join(' ')}>
            {statement.map((l) => (
              <span key={l} aria-hidden="true">
                {l}
              </span>
            ))}
          </h2>
        </div>
        <div className="datum-poche" aria-hidden="true" />
        <h2 data-second="" className="datum-statement" aria-label={second.join(' ')}>
          {second.map((l) => (
            <span key={l} aria-hidden="true">
              {l}
            </span>
          ))}
        </h2>
      </div>
    </section>
  )
}

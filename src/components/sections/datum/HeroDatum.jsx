import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'

/**
 * HeroDatum — the opening of DATUM, an architecture practice: the page is a drawing sheet.
 *
 * The name runs edge to edge over a sheet of only two hairlines and a diagonal from corner to corner (the
 * datum line). The lines are not on a fixed grid: the name is measured, so the first letter ends exactly
 * on the first line and a stem of a middle letter lands on the second one (the size and the letter
 * spacing are solved for it). Scrolling, the name leaves (the menu takes its place at the top) and the datum
 * turns, slowly, from the diagonal to level (148° at 16:10). The line is a boundary: on one side the
 * drawing shows (the lede, then the statement), on the other nothing. The lede sits just touching it, so
 * the turn starts without cutting anything; turning, it wipes the lede and lets the statement in from
 * below. The statement keeps rising and its lines go into the level line one by one until only «a wall.»
 * is left under it. Then black closes in two bands — one rising from the line, one from the bottom — and
 * the last word turns paper-coloured where they cross it. The practice (PracticeDatum) takes over on that
 * black without a seam: it overlaps the last screen of this one and puts the same word, in 3D, exactly
 * where this one left it.
 *
 * Every number lives in `apply(q)` (q = 0 → 1 over the section). Reduced motion: no pin, the sheet and
 * the statement in place, nothing hidden.
 */
const CSS = `
.datum-hero { position: relative; height: 420svh; }
.datum-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--datum-paper); }
.datum-layer { position: absolute; inset: 0; z-index: 2; }
/* one side of the datum shows the drawing, the other nothing: the boundary turns with it */
.datum-layer[data-reveal] { z-index: 3; -webkit-mask-image: linear-gradient(var(--a), #000 50%, transparent 50%);
  mask-image: linear-gradient(var(--a), #000 50%, transparent 50%); }
.datum-sheet { position: absolute; inset: 0; pointer-events: none; z-index: 4; mix-blend-mode: difference;
  --hair: rgba(239,239,237,.2); --hair-strong: rgba(239,239,237,.3); }
.datum-col { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--hair); }
.datum-diag { position: absolute; inset: 0;
  background: linear-gradient(var(--a), transparent calc(50% - .5px), var(--hair-strong) calc(50% - .5px), var(--hair-strong) calc(50% + .5px), transparent calc(50% + .5px)); }
.datum-brand { position: absolute; left: 0; right: 0; top: 1.6svh; z-index: 2; white-space: nowrap; line-height: .78;
  font-family: 'Archivo', sans-serif; font-weight: 800; font-variation-settings: 'wdth' 125; font-kerning: none; will-change: transform; }
.datum-brand > span { display: inline-block; }
.datum-copy { position: absolute; z-index: 2; letter-spacing: -.01em; }
.datum-cap { font-weight: 500; font-size: 14px; line-height: 1.15; }
.datum-lede { font-size: clamp(26px, 3.06vw, 52px); line-height: 1.05; letter-spacing: -.035em; will-change: transform; }
.datum-meta { font-weight: 500; font-size: 12px; }
.datum-scale { align-items: flex-end; font-weight: 500; font-size: 10px; letter-spacing: .06em; }
.datum-scale i { display: block; width: 2.6vw; max-width: 40px; height: 6px; border: 1px solid currentColor; border-top: 0; }
.datum-scale i:nth-child(odd) { background: currentColor; }
/* the lede: its last line just touches the diagonal where it crosses the second line of the sheet */
.datum-lede { left: var(--datum-l2, 50%); bottom: calc(50% + 10px); }
@media (max-width: 767px) { .datum-lede { left: 30vw; bottom: auto; top: calc(var(--datum-nav-top, 12svh) + 4svh); font-size: 22px; } }
/* the statement, right-aligned on the second line of the sheet, resting just under the level datum
   (PracticeDatum measures a copy with these same rules: keep them in step) */
.datum-statement { position: absolute; z-index: 3; right: calc(100% - var(--datum-l2, 50%)); top: calc(50% + 3svh); margin: 0;
  font-size: clamp(44px, 6.4vw, 124px); font-weight: 400; line-height: .98; letter-spacing: -.045em; text-align: right; white-space: nowrap; will-change: transform; }
.datum-statement span { display: block; }
@media (max-width: 767px) { .datum-statement { right: 6vw; font-size: 12.5vw; } }
/* black closes in two bands: one rising from the level line, one from the bottom; under the bottom one the
   statement is drawn again in paper colour, so the word turns over where the band crosses it */
.datum-band { position: absolute; left: 0; right: 0; z-index: 3; height: 0; overflow: hidden; background: var(--datum-ink); }
.datum-band[data-top] { bottom: 50%; }
.datum-band[data-bottom] { bottom: 0; }
.datum-band-in { position: absolute; left: 0; right: 0; bottom: 0; height: var(--stage-h, 100svh); }
.datum-band .datum-statement { color: var(--datum-paper); }
/* reduced motion: the drawing, unpinned and complete */
.datum-hero[data-calm] { height: auto; }
.datum-hero[data-calm] .datum-stage { position: relative; height: auto; min-height: 100svh; }
.datum-hero[data-calm] .datum-layer { -webkit-mask-image: none; mask-image: none; }
.datum-hero[data-calm] .datum-band { display: none; }
`

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (q, a, b) => clamp01((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a, b, t) => a + (b - a) * t

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
      const turned = el.querySelector('[data-band-copy]')
      const lede = el.querySelector('.datum-lede')
      const notes = el.querySelector('[data-notes]')
      const bandTop = el.querySelector('[data-top]')
      const bandBottom = el.querySelector('[data-bottom]')
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
        stage.style.setProperty('--stage-h', `${stage.clientHeight}px`)
        // the statement comes up from under the screen and stops with only its last line under the datum
        box.rise = H * 0.62
        // (its top a hair under the line, where PracticeDatum puts the same word in 3D)
        const fs = parseFloat(getComputedStyle(first).fontSize)
        box.exit = H / 2 + fs * 0.02 - first.offsetTop - first.lastElementChild.offsetTop
        if (!calm) apply(lastQ)
      }

      // q: 0 → 1 over the section.
      const apply = (q) => {
        lastQ = q
        const out = ease(seg(q, 0.0, 0.12))
        brand.style.transform = `translate3d(0, ${-out * box.out}px, 0)`
        docStyle.setProperty('--datum-nav-y', `${-out * box.navTop}px`)

        // the datum turns from the diagonal to level, clockwise and slowly; the side that shows the drawing
        // turns with it (from above the diagonal to below the level line)
        const turn = seg(q, 0.02, 0.27)
        const a = 180 + box.a + (180 - box.a) * (turn - Math.sin(turn * 2 * Math.PI) / (2 * Math.PI))
        stage.style.setProperty('--a', `${a}deg`)
        // the lede drifts up as if the sheet scrolled, so the turning line takes it from its first word
        lede.style.transform = `translate3d(0, ${-seg(q, 0, 0.3) * box.H * 0.16}px, 0)`
        notes.style.opacity = String(1 - seg(q, 0.03, 0.14))

        // the statement rises the whole way, its lines going into the level line one after the other
        const t = seg(q, 0.07, 0.66)
        const y = lerp(box.rise, box.exit, t * (2 - t))
        first.style.transform = `translate3d(0, ${y}px, 0)`
        turned.style.transform = first.style.transform

        // black: from the line upwards, then from the bottom up through the last word
        bandTop.style.height = `calc(${ease(seg(q, 0.62, 0.82)) * 50}% + 1px)`
        bandBottom.style.height = `${ease(seg(q, 0.7, 0.95)) * 50}%`
        bandTop.style.visibility = q > 0.62 ? '' : 'hidden'
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
        </div>

        <h1 data-brand="" className="datum-brand">
          <span>{name}</span>
        </h1>

        {/* small notes: they fade as the drawing turns */}
        <div className="datum-layer" data-notes="">
          <p className="datum-copy datum-cap hidden md:block" style={{ left: 'var(--datum-l1, 12.5%)', top: 'calc(var(--datum-nav-top, 30svh) + 18svh)' }}>
            {lines(caption)}
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

        {/* the drawing on the shown side of the datum: the lede, then the statement */}
        <div className="datum-layer" data-reveal="">
          <p className="datum-copy datum-lede">{lines(lede)}</p>
          <h2 className="datum-statement" aria-label={statement.join(' ')}>
            {statement.map((l) => (
              <span key={l} aria-hidden="true">
                {l}
              </span>
            ))}
          </h2>
        </div>
        <div className="datum-band" data-top="" aria-hidden="true" />
        <div className="datum-band" data-bottom="" aria-hidden="true">
          <div className="datum-band-in">
            <p data-band-copy="" className="datum-statement">
              {statement.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

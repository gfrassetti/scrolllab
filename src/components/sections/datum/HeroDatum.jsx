import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'

/**
 * HeroDatum — the opening of DATUM, an architecture practice: the page is a drawing sheet.
 *
 * The name runs edge to edge over an 8-column grid of hairlines, with a diagonal from corner to corner
 * (the datum line). Scrolling, the name leaves (the menu takes its place at the top), the diagonal sweeps
 * across the sheet and reveals the statement behind it, then a second sweep fills the sheet with black —
 * the «poché» of a section drawing — and the second statement comes up in paper colour.
 *
 * Every number lives in `apply(q)` (q = 0 → 1 over the section). Reduced motion: no pin, the sheet and
 * both statements stacked, nothing hidden.
 */
const CSS = `
.datum-hero { position: relative; height: 420svh; }
.datum-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--datum-paper); }
/* full-stage layers: the masks are measured on the screen, so the cut follows the sweep line exactly */
.datum-layer { position: absolute; inset: 0; z-index: 2; }
.datum-layer[data-reveal] { z-index: 3; -webkit-mask-image: linear-gradient(var(--a), #000 var(--p), transparent var(--p)); mask-image: linear-gradient(var(--a), #000 var(--p), transparent var(--p)); }
.datum-sheet { position: absolute; inset: 0; pointer-events: none; z-index: 4; mix-blend-mode: difference;
  --hair: rgba(239,239,237,.11); --hair-strong: rgba(239,239,237,.3); }
.datum-col { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--hair); }
.datum-col[data-strong] { background: var(--hair-strong); opacity: .6; }
@media (max-width: 767px) { .datum-col[data-odd] { display: none; } }
.datum-diag { position: absolute; inset: 0;
  background: linear-gradient(var(--a), transparent calc(50% - .5px), var(--hair-strong) calc(50% - .5px), var(--hair-strong) calc(50% + .5px), transparent calc(50% + .5px)); }
/* the sweep: a line parallel to the datum that crosses the sheet; behind it the statement, ahead the first copy */
.datum-sweep { position: absolute; inset: 0;
  background: linear-gradient(var(--a), transparent calc(var(--p) - .5px), rgba(239,239,237,.55) calc(var(--p) - .5px), rgba(239,239,237,.55) calc(var(--p) + .5px), transparent calc(var(--p) + .5px)); }
.datum-sweep[data-two] { background: linear-gradient(var(--a2), transparent calc(var(--p2) - .5px), rgba(239,239,237,.55) calc(var(--p2) - .5px), rgba(239,239,237,.55) calc(var(--p2) + .5px), transparent calc(var(--p2) + .5px)); }
.datum-ticks { position: absolute; left: 0; right: 0; bottom: 0; height: 8px; opacity: .8;
  background: repeating-linear-gradient(90deg, var(--hair-strong) 0 1px, transparent 1px 2.083vw); }
.datum-ticks[data-major] { height: 14px; background: repeating-linear-gradient(90deg, var(--hair-strong) 0 1px, transparent 1px 12.5vw); }
.datum-brand { position: absolute; left: 0; right: 0; top: 1.6svh; z-index: 2; white-space: nowrap; line-height: .78;
  font-family: 'Archivo', sans-serif; font-weight: 800; font-variation-settings: 'wdth' 125; will-change: transform; }
.datum-brand > span { display: inline-block; }
.datum-copy { position: absolute; z-index: 2; letter-spacing: -.01em; }
.datum-cap { font-weight: 500; font-size: 14px; line-height: 1.15; }
.datum-lede { font-size: clamp(26px, 3.06vw, 52px); line-height: 1.05; letter-spacing: -.035em; }
.datum-meta { font-weight: 500; font-size: 12px; }
.datum-scale { align-items: flex-end; font-weight: 500; font-size: 10px; letter-spacing: .06em; }
.datum-scale i { display: block; width: 2.6vw; max-width: 40px; height: 6px; border: 1px solid currentColor; border-top: 0; }
.datum-scale i:nth-child(odd) { background: currentColor; }
/* the statement: three lines stepped like a section, revealed behind the moving line */
.datum-statement { position: absolute; z-index: 3; right: 25%; top: 50%; transform: translateY(-50%);
  font-size: clamp(40px, 5.2vw, 96px); line-height: .98; letter-spacing: -.045em; text-align: right; }
.datum-statement span { display: block; }
.datum-statement span:nth-child(odd) { padding-right: 12.5vw; }
.datum-fade { -webkit-mask-image: linear-gradient(var(--a), transparent var(--p), #000 var(--p));
  mask-image: linear-gradient(var(--a), transparent var(--p), #000 var(--p)); }
/* the poché: black fills the sheet behind the second sweep */
.datum-poche { position: absolute; inset: 0; z-index: 3; background: var(--datum-ink);
  -webkit-mask-image: linear-gradient(var(--a2), #000 var(--p2), transparent var(--p2));
  mask-image: linear-gradient(var(--a2), #000 var(--p2), transparent var(--p2)); }
.datum-statement[data-second] { color: var(--datum-paper); z-index: 3; right: auto; left: 50%; text-align: left;
  transform: translate(-30%, -50%); opacity: 0; }
.datum-statement[data-second] span:nth-child(odd) { padding: 0; }
.datum-statement[data-second] span:nth-child(2) { padding-left: 12.5vw; }
@media (max-width: 767px) {
  .datum-statement { right: 6vw; font-size: 12vw; }
  .datum-statement span:nth-child(odd) { padding-right: 10vw; }
  .datum-statement[data-second] { left: 6vw; transform: translateY(-50%); }
  .datum-statement[data-second] span:nth-child(2) { padding-left: 10vw; }
}
/* reduced motion: the drawing, unpinned and complete */
.datum-hero[data-calm] { height: auto; }
.datum-hero[data-calm] .datum-stage { position: relative; height: auto; min-height: 100svh; }
.datum-hero[data-calm] .datum-layer, .datum-hero[data-calm] .datum-fade { -webkit-mask-image: none; mask-image: none; }
`

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (q, a, b) => clamp01((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

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
      const second2 = el.querySelector('[data-second]')
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (calm) el.dataset.calm = ''

      const box = { W: 1, H: 1, a: 32 }
      const layout = () => {
        const W = stage.clientWidth
        const H = window.innerHeight
        box.W = W
        box.H = H
        // the diagonal goes exactly corner to corner, whatever the screen
        box.a = (Math.atan2(H, W) * 180) / Math.PI
        // the name fills the width: a size for the height, then the letter spacing shares out the rest
        brand.style.fontSize = `${Math.min(H * 0.33, W * 0.2)}px`
        word.style.letterSpacing = '0px'
        const natural = word.getBoundingClientRect().width
        const gap = (W - natural) / Math.max(1, word.textContent.length - 1)
        word.style.letterSpacing = `${gap}px`
        word.style.marginRight = `${-gap}px`
        const navTop = brand.offsetTop + brand.offsetHeight + H * 0.026
        document.documentElement.style.setProperty('--datum-nav-top', `${navTop}px`)
        apply(lastQ)
      }

      let lastQ = 0
      // q: 0 → 1 over the section. The first sweep (the datum line) goes from the far corner to the near
      // one and turns a little; the second sweep fills with black behind it.
      const apply = (q) => {
        lastQ = q
        const out = ease(seg(q, 0.0, 0.12))
        brand.style.transform = `translate3d(0, ${-out * 115}%, 0)`
        const navTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--datum-nav-top')) || 0
        document.documentElement.style.setProperty('--datum-nav-y', `${-out * navTop}px`)

        // the datum turns a little; the sweep crosses the sheet from one corner to the other, parallel to it
        const s1 = ease(seg(q, 0.1, 0.52))
        const a = box.a + s1 * 30
        stage.style.setProperty('--a', `${a}deg`)
        stage.style.setProperty('--p', `${-4 + s1 * 108}%`)
        // the second sweep, across: behind it the sheet is filled black
        const s2 = ease(seg(q, 0.62, 0.88))
        stage.style.setProperty('--a2', `${a + 90}deg`)
        stage.style.setProperty('--p2', `${-4 + s2 * 108}%`)
        second2.style.opacity = String(clamp01((q - 0.8) / 0.08))
      }

      if (calm) {
        stage.style.setProperty('--a', '32deg')
        stage.style.setProperty('--p', '104%')
        stage.style.setProperty('--a2', '122deg')
        stage.style.setProperty('--p2', '-4%')
        layout()
        return undefined
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
      document.fonts?.ready.then(layout)
      return () => {
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
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            // en el teléfono, 4 columnas (las impares se ocultan)
            <i key={i} className="datum-col" data-strong={i === 1 || i === 5 ? '' : undefined} data-odd={i % 2 ? '' : undefined} style={{ left: `${(i / 8) * 100}%` }} />
          ))}
          <i className="datum-diag" />
          <i className="datum-sweep" />
          <i className="datum-sweep" data-two="" />
          <i className="datum-ticks" />
          <i className="datum-ticks" data-major="" />
        </div>

        <h1 data-brand="" className="datum-brand">
          <span>{name}</span>
        </h1>

        {/* the first copy: wiped out ahead of the sweep */}
        <div className="datum-layer datum-fade">
          <p className="datum-copy datum-cap hidden md:block" style={{ left: '12.5%', top: 'calc(var(--datum-nav-top, 30svh) + 18svh)' }}>
            {lines(caption)}
          </p>
          <p className="datum-copy datum-lede left-[6vw] md:left-[62.5%]" style={{ top: 'calc(var(--datum-nav-top, 30svh) + 16svh)' }}>
            {lines(lede)}
          </p>
          <p className="datum-copy datum-meta hidden md:block" style={{ left: '12.5%', bottom: 26 }}>
            {place}
          </p>
          <div className="datum-copy datum-scale hidden md:flex" style={{ left: '37.5%', bottom: 26 }} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 8 }}>{scaleLabel}</span>
          </div>
          <p className="datum-copy datum-meta right-[6vw] md:right-auto md:left-[calc(62.5%+10px)]" style={{ bottom: 26 }}>
            {hint}
          </p>
        </div>

        {/* the statement: drawn in behind the sweep */}
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

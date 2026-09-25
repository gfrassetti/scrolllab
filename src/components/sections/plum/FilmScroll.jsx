import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'
import { markSvg } from './marks'
import { KineticTextReveal } from '../../ui/KineticTextReveal'

/**
 * PLUM — FilmScroll
 *
 * The whole page IS a film. One canvas stays fixed for the entire scroll
 * while a pre-rendered webp sequence plays across it, frame after frame.
 * Text "beats", short looping/one-shot mp4 clips, chapter colour washes and
 * an edge grid + progress readout ride on top — all positioned by scroll %.
 *
 * Everything is an editable JSON manifest (default `public/plum/story.json`),
 * fetched at runtime — no code changes to retell the story:
 *
 *   {
 *     "title":  "PLUM",
 *     "theme":  { "bg", "ink", "accent" },
 *     "frames": { "basePath", "pad", "ext" },
 *     "scroll": { "pxPerFrame", "ease" },
 *     "loader": { "window", "decodeWidth", "keyframeStride", "keyframeWidth" },
 *     "ui":     { "progress": true, "grid": true },
 *
 *     "chapters": [
 *       { "id": "arrival", "frames": 120, "label": "01 — Arrival",
 *         "tint": "#0f2f5c", "tintAlpha": 0.5 }
 *     ],
 *
 *     "beats": [
 *       { "at": 0.34, "kicker": "THE TERMS",
 *         "title": "No fees.\nA share of the <em>upside</em>.",
 *         "body": "…", "align": "right", "y": "top",
 *         "font": "serif", "size": "lg",
 *         "cta": { "label": "Apply", "href": "#" } }
 *     ],
 *
 *     "clips": [
 *       { "src": "/plum/clips/reveal.mp4", "at": [0.0, 0.10], "mode": "once", "fit": "cover" },
 *       { "src": "/plum/clips/footer.mp4", "at": [0.9, 1.0], "mode": "loop", "fit": "cover" }
 *     ]
 *   }
 *
 * Frames live at  <basePath>/<chapter.id>/<n padded>.<ext>  (n = 1..frames).
 * Swap a chapter folder + its "frames" count and that act changes. Reorder
 * the chapters array to reorder the story.
 *
 * Playback: frames are fetched once as Blobs (all resident); a rolling
 * window of full-res ImageBitmaps is decoded around the playhead, the rest
 * closed; a sparse always-resident thumbnail layer covers fast flicks. The
 * frame index rides the shared gsap.ticker (same clock as Lenis +
 * ScrollTrigger). A sticky child holds the canvas — no GSAP pin.
 *
 * `prefers-reduced-motion`: one static frame, no long scroll, no ticker.
 */

const FALLBACK = {
  title: 'PLUM',
  theme: { bg: '#0b0b0d', ink: '#f3f1ec', accent: '#6f5bff' },
  frames: { basePath: '/plum/seq', pad: 4, ext: 'webp' },
  scroll: { pxPerFrame: 22, ease: 0.14 },
  loader: { window: 44, decodeWidth: 1280, keyframeStride: 6, keyframeWidth: 512 },
  ui: { progress: true, grid: true },
  chapters: [{ id: 'arrival', frames: 8 }],
  beats: [],
  clips: [],
}

const FONT = {
  serif: 'var(--font-display, Georgia, serif)',
  sans: 'inherit',
  mono: 'var(--font-mono, ui-monospace, monospace)',
  script: 'var(--font-rupture, cursive)',
}
const SIZE = {
  md: 'clamp(1.5rem, 1rem + 2.4vw, 2.4rem)',
  lg: 'clamp(2.1rem, 1rem + 4.4vw, 3.8rem)',
  xl: 'clamp(2.8rem, 1rem + 7vw, 6rem)',
}

/** Split a title on a single <em>…</em> so that part renders in the script face. */
function renderTitle(title, emFont) {
  const m = /^(.*?)<em>(.*?)<\/em>(.*)$/s.exec(title || '')
  if (!m) return title
  return (
    <>
      {m[1]}
      <em style={{ fontFamily: emFont, fontStyle: 'normal' }}>{m[2]}</em>
      {m[3]}
    </>
  )
}

export default function FilmScroll({ src = '/plum/story.json', story: inlineStory }) {
  const [story, setStory] = useState(inlineStory || null)

  useEffect(() => {
    if (inlineStory) return setStory(inlineStory)
    let ok = true
    fetch(src, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => ok && setStory(j || FALLBACK))
      .catch(() => ok && setStory(FALLBACK))
    return () => {
      ok = false
    }
  }, [src, inlineStory])

  const cfg = story || FALLBACK
  const theme = { ...FALLBACK.theme, ...cfg.theme }
  const fr = { ...FALLBACK.frames, ...cfg.frames }
  const sc = { ...FALLBACK.scroll, ...cfg.scroll }
  const ld = { ...FALLBACK.loader, ...cfg.loader }
  const ui = { ...FALLBACK.ui, ...cfg.ui }
  const chapters = cfg.chapters?.length ? cfg.chapters : FALLBACK.chapters
  const beats = cfg.beats || []
  const clips = cfg.clips || []
  const overlays = cfg.overlays || []
  const pad = fr.pad || 4

  // A chapter is one or more frame folders played back-to-back. A single-folder
  // chapter uses { id, frames }; a chapter that spans several folders uses
  // { id, parts: [{ id, frames }, …] } so several source clips read as ONE act
  // without renaming any files on disk.
  const chapterParts = (ch) =>
    ch.parts?.length ? ch.parts : [{ id: ch.id, frames: ch.frames || 0 }]
  const chapterFrames = (ch) => chapterParts(ch).reduce((n, p) => n + (p.frames || 0), 0)
  const total = chapters.reduce((n, c) => n + chapterFrames(c), 0)

  // chapter → [startFrac, endFrac] across the whole scroll
  const spans = []
  {
    let acc = 0
    for (const ch of chapters) {
      const cf = chapterFrames(ch)
      spans.push([acc / total, (acc + cf) / total, ch])
      acc += cf
    }
  }
  // The scene-change transition fires ONLY at boundaries whose chapter opts in
  // with `"cut": true` — one deliberate cut in the story, not a veil on every
  // hand-off.
  const boundaries = spans
    .slice(1)
    .filter((s) => s[2]?.cut)
    .map((s) => s[0])
  // the very first frame, shown as a poster so the first paint is never black
  const firstPart = chapters[0] ? chapterParts(chapters[0])[0] : null
  const firstUrl = firstPart
    ? `${fr.basePath}/${firstPart.id}/${String(1).padStart(pad, '0')}.${fr.ext}`
    : null

  const track = useRef(null)
  const stage = useRef(null)
  const canvasRef = useRef(null)
  const clipLayer = useRef(null)
  const beatRefs = useRef([])
  // Instancias de <KineticTextReveal> (una por beat) + si el beat ya está
  // activo, para disparar el revelado una sola vez al entrar.
  const titleRefs = useRef([])
  const beatActiveRef = useRef([])
  const overlayRefs = useRef([])
  const progressRef = useRef(null)
  const chapterRef = useRef(null)
  const curtainRef = useRef(null)
  const gridFill = useRef(null)

  useGSAP(
    () => {
      if (!story) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { alpha: false })
      const alive = { v: true }

      const urls = []
      for (const ch of chapters) {
        for (const part of chapterParts(ch)) {
          for (let n = 1; n <= part.frames; n++) {
            urls.push(`${fr.basePath}/${part.id}/${String(n).padStart(fr.pad, '0')}.${fr.ext}`)
          }
        }
      }
      const count = urls.length
      if (count < 2) return

      // frame index where each chapter (after the first) begins — the scene
      // changes the dissolve smooths over.
      const boundaryFrames = []
      {
        let acc = 0
        for (const ch of chapters) {
          if (acc > 0) boundaryFrames.push(acc)
          acc += chapterFrames(ch)
        }
      }

      const blobs = new Array(count)
      const bitmaps = new Map()
      const keys = new Map()
      const decoding = new Set()
      const fetching = new Set()
      let inFetch = 0
      const MAX_FETCH = 8
      const MAX_DECODE = 6
      const WIN = Math.max(12, ld.window | 0)
      const KEEP_BACK = Math.round(WIN * 0.36)
      const KEEP_FWD = WIN - KEEP_BACK
      const DROP_BACK = KEEP_BACK + 14
      const DROP_FWD = KEEP_FWD + 24
      const KEY_STRIDE = Math.max(2, ld.keyframeStride | 0)
      const KEY_W = Math.max(160, ld.keyframeWidth | 0)
      const DEC_W = Math.max(480, ld.decodeWidth | 0)
      const EASE = Math.min(0.9, Math.max(0.02, sc.ease || 0.14))
      // Progressive download: only blobs near the playhead are fetched, plus a
      // sparse always-resident proxy (every KEY_STRIDE) across the whole film.
      // Frames stream in as you scroll — visible in the Network panel — instead
      // of the whole film loading up front (pear.no's loading model).
      const FETCH_BACK = WIN + 24
      const FETCH_FWD = WIN + 64
      const RELEASE = FETCH_FWD + 140
      // frames-long cross-dissolve that softens each scene change (a filmic
      // dissolve of the real footage, not an overlay). 0 = hard cut.
      const DISSOLVE = Math.max(0, (ui.dissolve | 0) || 0)

      let targetProg = 0
      let prog = 0
      let shown = -1
      let dirty = true

      const idxOf = (p) => Math.max(0, Math.min(count - 1, Math.round(p * (count - 1))))

      // —— mp4 overlay clips ——
      const vids = clips.map((c) => {
        const v = document.createElement('video')
        v.muted = true
        v.playsInline = true
        v.loop = c.mode === 'loop'
        v.preload = 'none'
        v.setAttribute('aria-hidden', 'true')
        v.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .45s linear;pointer-events:none;'
        v.style.objectFit = c.fit === 'contain' ? 'contain' : 'cover'
        if (c.fit === 'contain' && c.align) v.style.objectPosition = `${c.align} center`
        clipLayer.current?.appendChild(v)
        return { c, v, loaded: false }
      })

      function updateClips(p) {
        for (const item of vids) {
          const { c, v } = item
          const a = c.at?.[0] ?? 0
          const b = c.at?.[1] ?? 1
          const inRange = p >= a && p <= b
          if (inRange) {
            if (!item.loaded) {
              v.src = c.src
              v.load()
              item.loaded = true
            }
            const span = Math.max(b - a, 0.001)
            const fin = (p - a) / (span * 0.16)
            const fout = (b - p) / (span * 0.16)
            v.style.opacity = Math.max(0, Math.min(1, fin, fout)).toFixed(3)
            if (v.paused) v.play().catch(() => {})
          } else {
            v.style.opacity = '0'
            if (!v.paused) v.pause()
            if (item.loaded && (p < a - 0.14 || p > b + 0.14)) {
              v.removeAttribute('src')
              v.load()
              item.loaded = false
            }
          }
        }
      }

      // keyframe indices whose blob is in but that still need a thumbnail;
      // decoded through the same MAX_DECODE gate as the window so total
      // concurrent createImageBitmap() calls stay bounded.
      const keyQueue = []

      function fetchOne(i) {
        if (i < 0 || i >= count || blobs[i] || fetching.has(i) || inFetch >= MAX_FETCH) return
        fetching.add(i)
        inFetch++
        fetch(urls[i], { cache: 'force-cache' })
          .then((r) => (r.ok ? r.blob() : null))
          .then((bl) => {
            if (!bl || !alive.v) return
            blobs[i] = bl
            if (i % KEY_STRIDE === 0 && !keys.has(i)) keyQueue.push(i)
            dirty = true
          })
          .catch(() => {})
          .finally(() => {
            fetching.delete(i)
            inFetch--
            if (alive.v) {
              pumpFetch()
              pumpDecode()
            }
          })
      }

      // Fetch nearest-to-playhead first, then top up the sparse whole-film
      // proxy, then release far full-res blobs so memory stays bounded and the
      // network keeps working as the playhead moves.
      function pumpFetch() {
        if (!alive.v) return
        const here = idxOf(prog)
        for (let d = 0; d <= FETCH_FWD && inFetch < MAX_FETCH; d++) {
          const cands = d === 0 ? [here] : [here + d, here - d]
          for (const i of cands) {
            if (i < here - FETCH_BACK || i > here + FETCH_FWD) continue
            fetchOne(i)
            if (inFetch >= MAX_FETCH) break
          }
        }
        for (let i = 0; i < count && inFetch < MAX_FETCH; i += KEY_STRIDE) fetchOne(i)
        for (let i = 0; i < count; i++) {
          if (blobs[i] && i % KEY_STRIDE !== 0 && (i < here - RELEASE || i > here + RELEASE)) {
            blobs[i] = undefined
          }
        }
      }

      function decodeInto(map, i, w, tag) {
        decoding.add(tag)
        createImageBitmap(blobs[i], { resizeWidth: w })
          .then((bm) => {
            if (!alive.v) return bm.close()
            map.set(i, bm)
            dirty = true
          })
          .catch(() => {})
          .finally(() => {
            decoding.delete(tag)
            if (alive.v) pumpDecode()
          })
      }

      function pumpDecode() {
        if (!alive.v) return
        const here = idxOf(prog)
        for (const i of [...bitmaps.keys()]) {
          if (i < here - DROP_BACK || i > here + DROP_FWD) {
            bitmaps.get(i).close()
            bitmaps.delete(i)
          }
        }
        // window frames first — nearest the playhead
        for (let d = 0; d <= KEEP_FWD && decoding.size < MAX_DECODE; d++) {
          const cands = d === 0 ? [here] : [here + d, here - d]
          for (const i of cands) {
            if (i < 0 || i >= count) continue
            if (i > here + KEEP_FWD || i < here - KEEP_BACK) continue
            if (bitmaps.has(i) || decoding.has(i) || !blobs[i]) continue
            decodeInto(bitmaps, i, DEC_W, i)
            if (decoding.size >= MAX_DECODE) break
          }
        }
        // spare capacity → fill the thumbnail layer
        while (decoding.size < MAX_DECODE && keyQueue.length) {
          const i = keyQueue.shift()
          if (keys.has(i) || !blobs[i]) continue
          decodeInto(keys, i, KEY_W, `k${i}`)
        }
      }

      function nearest(i) {
        if (bitmaps.has(i)) return bitmaps.get(i)
        for (let r = 1; r <= 14; r++) {
          if (bitmaps.has(i - r)) return bitmaps.get(i - r)
          if (bitmaps.has(i + r)) return bitmaps.get(i + r)
        }
        for (let r = 0; r <= KEY_STRIDE + 2; r++) {
          if (keys.has(i - r)) return keys.get(i - r)
          if (keys.has(i + r)) return keys.get(i + r)
        }
        return null
      }

      // chapter wash: colour + eased alpha near the chapter's own bounds
      function washAt(p) {
        for (const [a, b, ch] of spans) {
          if (p < a || p > b || !ch.tint) continue
          const span = Math.max(b - a, 0.001)
          const edge = Math.min(0.12, span * 0.35)
          const inRamp = Math.min(1, (p - a) / edge)
          const outRamp = Math.min(1, (b - p) / edge)
          const k = Math.max(0, Math.min(1, inRamp, outRamp))
          return { color: ch.tint, alpha: (ch.tintAlpha ?? 0.5) * k }
        }
        return null
      }

      function drawCover(bm, alpha) {
        const cw = canvas.width
        const cah = canvas.height
        const scale = Math.max(cw / bm.width, cah / bm.height)
        const dw = bm.width * scale
        const dh = bm.height * scale
        if (alpha != null) ctx.globalAlpha = alpha
        ctx.drawImage(bm, (cw - dw) / 2, (cah - dh) / 2, dw, dh)
        if (alpha != null) ctx.globalAlpha = 1
      }

      function paint() {
        const fi = idxOf(prog)
        if (fi === shown && !dirty) return
        const bm = nearest(fi)
        if (!bm) return
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        drawCover(bm)
        // cross-dissolve: just after a scene change, hold the outgoing scene's
        // last frame on top and fade it out over DISSOLVE frames of scroll, so
        // one scene melts into the next instead of hard-cutting.
        if (DISSOLVE > 0) {
          for (const b of boundaryFrames) {
            if (fi >= b && fi < b + DISSOLVE) {
              const obm = nearest(b - 1)
              if (obm) drawCover(obm, 1 - (fi - b) / DISSOLVE)
              break
            }
          }
        }
        const w = washAt(prog)
        if (w && w.alpha > 0.001) {
          ctx.globalAlpha = w.alpha
          ctx.fillStyle = w.color
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.globalAlpha = 1
        }
        shown = fi
        dirty = false
      }

      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
        // Fall back to the viewport if the sticky stage hasn't been laid out
        // yet (0×0) — otherwise the canvas bakes a zero size and stays black.
        const w = stage.current.clientWidth || window.innerWidth || 0
        const h = stage.current.clientHeight || window.innerHeight || 0
        if (w < 2 || h < 2) return
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        dirty = true
        paint()
      }

      // Sólo DEV: cuenta los disparos del revelado de títulos, para poder
      // verificar el cableado aunque la ventana esté oculta (con la pestaña en
      // segundo plano el navegador congela requestAnimationFrame y la
      // animación no se ve, pero el disparo igual ocurre).
      const revealCalls = { play: 0, reset: 0 }

      function layoutBeats() {
        for (let k = 0; k < beatRefs.current.length; k++) {
          const el = beatRefs.current[k]
          if (!el || !beats[k]) continue
          const dist = Math.abs(prog - beats[k].at)
          const span = beats[k].hold ? 0.18 : 0.12
          const o = dist > span ? 0 : 1 - dist / span
          el.style.opacity = o.toFixed(3)
          el.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`
          el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'

          // El título se revela con Motion al entrar el beat y se rearma al
          // salir. FilmScroll sigue mandando sobre el CONTENEDOR (opacidad y
          // translate); Motion sólo toca los segmentos de texto de adentro, así
          // que nunca pelean por el transform del mismo nodo.
          // Histéresis: entra con o>0.35 y sólo se rearma por debajo de 0.12,
          // así el scroll parado justo en el umbral no lo re-dispara en loop.
          const wasActive = beatActiveRef.current[k] === true
          const active = wasActive ? o > 0.12 : o > 0.35
          if (active !== wasActive) {
            beatActiveRef.current[k] = active
            const reveal = titleRefs.current[k]
            if (reveal) {
              if (active) reveal.play()
              else reveal.reset()
              if (import.meta.env.DEV) revealCalls[active ? 'play' : 'reset']++
            }
          }
        }
      }

      function updateOverlays(p) {
        for (let k = 0; k < overlayRefs.current.length; k++) {
          const el = overlayRefs.current[k]
          const o = overlays[k]
          if (!el || !o) continue
          const base = o.opacity ?? 1
          if (!o.at) {
            el.style.opacity = base.toFixed(3)
            continue
          }
          const a = o.at[0] ?? 0
          const b = o.at[1] ?? 1
          const span = Math.max(b - a, 0.001)
          const fin = (p - a) / (span * 0.18)
          const fout = (b - p) / (span * 0.18)
          const k2 = p < a || p > b ? 0 : Math.max(0, Math.min(1, fin, fout))
          el.style.opacity = (base * k2).toFixed(3)
        }
      }

      // The halftone "curtain" between scenes: a dotted veil that swells as the
      // playhead crosses a chapter boundary, peaking exactly on the change.
      const CURTAIN_BAND = 0.045
      function updateTransition(p) {
        const el = curtainRef.current
        if (!el) return
        let best = 1
        for (const bnd of boundaries) best = Math.min(best, Math.abs(p - bnd))
        const veil = best >= CURTAIN_BAND ? 0 : 1 - best / CURTAIN_BAND
        el.style.opacity = (veil * veil).toFixed(3)
      }

      function updateUi() {
        if (progressRef.current) {
          progressRef.current.textContent = `${Math.round(prog * 100)}%`
        }
        if (chapterRef.current) {
          const hit = spans.find(([a, b]) => prog >= a && prog <= b)
          chapterRef.current.textContent = hit?.[2]?.label || ''
        }
        if (gridFill.current) {
          gridFill.current.style.transform = `scaleY(${prog.toFixed(4)})`
        }
      }

      function frameTick() {
        prog += (targetProg - prog) * EASE
        if (Math.abs(targetProg - prog) < 0.0002) prog = targetProg
        paint()
        layoutBeats()
        updateOverlays(prog)
        updateClips(prog)
        updateTransition(prog)
        updateUi()
        pumpFetch()
        pumpDecode()
      }

      if (import.meta.env.DEV) {
        window.__plum = {
          seek(f) {
            targetProg = prog = Math.max(0, Math.min(1, f))
            paint(); layoutBeats(); updateOverlays(prog); updateTransition(prog); updateUi(); pumpFetch(); pumpDecode()
          },
          get info() {
            return { prog: +prog.toFixed(3), shown, url: urls[idxOf(prog)], bmp: bitmaps.size, key: keys.size, reveal: { ...revealCalls } }
          },
        }
      }

      resize()
      window.addEventListener('resize', resize)
      window.addEventListener('load', resize)
      // Retry a few times in case the sticky stage sizes a beat after mount
      // (first-load must not be left on a zero-size, black canvas).
      let tries = 0
      const settle = setInterval(() => {
        if (!alive.v || tries++ > 12) return clearInterval(settle)
        if (canvas.width < 2 || canvas.height < 2) resize()
        else clearInterval(settle)
      }, 100)
      pumpFetch()

      // Autoplay pre-roll: a few frames of motion the instant the page loads,
      // before any scroll — the hero equivalent of pear.no's autoplaying
      // reveal.mp4, built from footage we already own instead of a new asset.
      // It drives prog/targetProg directly and hands off to the normal
      // scroll-driven system once done; any real scroll/touch/key cancels it
      // immediately so the two never fight over the same variables.
      let prerollTween = null
      function startFilmSystem() {
        gsap.ticker.add(frameTick)
        ScrollTrigger.create({
          trigger: track.current,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            targetProg = self.progress
          },
          onRefresh: resize,
        })
      }

      if (reduced) {
        targetProg = prog = 0.3
        dirty = true
        layoutBeats()
        updateOverlays(prog)
        updateUi()
        const iv = setInterval(() => {
          if (!alive.v) return clearInterval(iv)
          pumpDecode()
          paint()
          if (bitmaps.size || keys.size) clearInterval(iv)
        }, 120)
      } else {
        if (window.scrollY > 4 || cfg.hero?.clip) {
          // A real <video> hero (below) carries the opening motion, so the
          // canvas doesn't need the frame-sequence preroll.
          startFilmSystem()
        } else {
          const PREROLL_FRAMES = Math.min(10, Math.floor(count * 0.02))
          let prerollDone = false
          const finishPreroll = () => {
            if (prerollDone) return
            prerollDone = true
            prerollTween?.kill()
            startFilmSystem()
          }
          prerollTween = gsap.to(
            {},
            {
              duration: 2.2,
              ease: 'sine.inOut',
              onUpdate() {
                prog = targetProg = (this.progress() * PREROLL_FRAMES) / (count - 1)
                dirty = true
                paint()
              },
              onComplete: finishPreroll,
            },
          )
          window.addEventListener('wheel', finishPreroll, { passive: true, once: true })
          window.addEventListener('touchstart', finishPreroll, { passive: true, once: true })
          window.addEventListener('keydown', finishPreroll, { once: true })
        }

        const split = new SplitText('[data-plum-brand]', { type: 'chars', mask: 'chars' })
        gsap.from(split.chars, {
          yPercent: 115,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.04,
          delay: 0.15,
        })
        gsap.from('[data-plum-fade]', {
          opacity: 0,
          y: 12,
          duration: 0.8,
          stagger: 0.12,
          delay: 0.55,
        })
        // the intro wordmark clears as the film starts
        gsap.to('[data-plum-intro]', {
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: track.current,
            start: 'top top',
            end: `+=${Math.min(900, sc.pxPerFrame * total * 0.08)}`,
            scrub: true,
          },
        })
        // the <video> hero hands off to the canvas film over the first viewport
        gsap.to('[data-plum-hero]', {
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: track.current,
            start: 'top top',
            end: '+=90%',
            scrub: true,
          },
        })
      }

      return () => {
        alive.v = false
        clearInterval(settle)
        prerollTween?.kill()
        gsap.ticker.remove(frameTick)
        window.removeEventListener('resize', resize)
        window.removeEventListener('load', resize)
        vids.forEach(({ v }) => {
          v.pause()
          v.removeAttribute('src')
          v.load()
          v.remove()
        })
        bitmaps.forEach((bm) => bm.close())
        keys.forEach((bm) => bm.close())
        bitmaps.clear()
        keys.clear()
      }
    },
    { scope: track, dependencies: [story], revertOnUpdate: true },
  )

  const heightPx = Math.max(total, 2) * sc.pxPerFrame
  const xClass = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }
  const yClass = { top: 'justify-start pt-[16vh]', center: 'justify-center', bottom: 'justify-end pb-[16vh]' }

  return (
    <section
      ref={track}
      className="relative"
      style={{
        height: `${heightPx}px`,
        background: theme.bg,
        color: theme.ink,
        '--plum-void': theme.bg,
        '--plum-mist': theme.ink,
        '--plum-accent': theme.accent,
      }}
    >
      <div ref={stage} className="sticky top-0 h-svh overflow-hidden">
        {/* poster: the first frame, so the very first paint is never black */}
        {firstUrl && (
          <img
            src={firstUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          />
        )}
        {/* imagery */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
        />
        {/* real <video> hero — plays on load and hands off to the canvas film
            over the first viewport (pear.no's opening) */}
        {cfg.hero?.clip && (
          <video
            data-plum-hero
            className="pointer-events-none absolute inset-0 z-[5] h-full w-full object-cover"
            src={cfg.hero.clip}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        )}
        {/* mp4 clips mount here, between imagery and type */}
        <div ref={clipLayer} className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />

        {/* scene-change curtain: a halftone dot veil that peaks on each cut */}
        {ui.transitions !== false && boundaries.length > 0 && (
          <div
            ref={curtainRef}
            className="plum-curtain pointer-events-none absolute inset-0 z-[15]"
            aria-hidden="true"
            style={{
              opacity: 0,
              backgroundColor: theme.bg,
              backgroundImage: `radial-gradient(${theme.ink} 1px, transparent 1.6px)`,
              backgroundSize: '11px 11px',
              maskImage:
                'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
            }}
          />
        )}

        {/* marks over the film — a wrapper positions/fades, an inner element
            carries the optional drift motion so the two never fight */}
        {overlays.map((o, k) => {
          const x = o.x ?? 'center'
          const y = o.y ?? 'center'
          const s = { position: 'absolute', zIndex: 20, opacity: 0, width: o.w || '72px' }
          if (x === 'left') s.left = '6%'
          else if (x === 'right') s.right = '6%'
          else if (x === 'center') s.left = '50%'
          else s.left = x
          if (y === 'top') s.top = '10%'
          else if (y === 'bottom') s.bottom = '10%'
          else if (y === 'center') s.top = '50%'
          else s.top = y
          const tx = x === 'center' ? 'translateX(-50%)' : ''
          const ty = y === 'center' ? 'translateY(-50%)' : ''
          if (tx || ty) s.transform = `${tx} ${ty}`.trim()
          const motion =
            o.motion === 'drift'
              ? 'plum-drift'
              : o.motion === 'drift-y'
                ? 'plum-drift-y'
                : o.motion === 'bob'
                  ? 'plum-bob'
                  : ''
          const svgMarkup = o.mark ? markSvg(o.mark, o.color || theme.accent) : o.svg
          const inner = svgMarkup ? (
            <div className={motion} style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
          ) : (
            <img className={motion} style={{ width: '100%', display: 'block' }} src={o.src} alt="" />
          )
          return (
            <div
              key={k}
              ref={(el) => (overlayRefs.current[k] = el)}
              className="pointer-events-none"
              style={s}
              aria-hidden="true"
            >
              {inner}
            </div>
          )
        })}

        {/* edge grid + progress */}
        {ui.grid && (
          <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
            <div
              className="absolute top-0 bottom-0 left-6 w-px md:left-10"
              style={{ background: theme.ink, opacity: 0.14 }}
            />
            <div
              ref={gridFill}
              className="absolute top-0 left-6 h-full w-px origin-top md:left-10"
              style={{ background: theme.accent, transform: 'scaleY(0)' }}
            />
            {[0.2, 0.4, 0.6, 0.8].map((t) => (
              <div
                key={t}
                className="absolute left-6 h-px w-3 md:left-10"
                style={{ top: `${t * 100}%`, background: theme.ink, opacity: 0.2 }}
              />
            ))}
          </div>
        )}

        {/* HUD: chapter label + progress % */}
        <div className="pointer-events-none absolute inset-x-5 bottom-5 z-30 flex items-end justify-between text-[11px] uppercase tracking-[0.18em] md:inset-x-10">
          <span ref={chapterRef} style={{ color: theme.ink, opacity: 0.6 }} />
          {ui.progress && (
            <span ref={progressRef} style={{ color: theme.accent }}>
              0%
            </span>
          )}
        </div>

        {/* intro wordmark */}
        <div
          data-plum-intro
          className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6"
        >
          <p
            data-plum-fade
            className="mb-4 text-[11px] uppercase tracking-[0.24em]"
            style={{ color: theme.ink, opacity: 0.65 }}
          >
            {cfg.hero?.kicker || `${cfg.title || 'PLUM'} — scroll`}
          </p>
          <h1
            data-plum-brand
            className="text-center leading-[0.9] font-medium tracking-[-0.04em] select-none text-[clamp(4rem,17vw,13rem)]"
            style={{ color: theme.ink }}
          >
            {cfg.title || 'PLUM'}
          </h1>
        </div>

        {/* beats */}
        {beats.map((b, k) => {
          // Un título con <em> usa la cara script y se sigue renderizando a la
          // vieja usanza (KineticTextReveal sólo acepta texto plano).
          const hasEm = /<em>/.test(b.title || '')
          return (
          <div
            key={`${b.at}-${k}`}
            ref={(el) => (beatRefs.current[k] = el)}
            style={{ opacity: 0 }}
            className={`absolute inset-0 z-20 flex flex-col px-6 md:px-16 ${
              yClass[b.y] || yClass.center
            } ${xClass[b.align] || xClass.left}`}
          >
            <div className="flex max-w-[40ch] flex-col gap-4">
              {b.kicker && (
                <span
                  className="text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: theme.accent }}
                >
                  {b.kicker}
                </span>
              )}
              <h2
                className="font-medium tracking-[-0.02em]"
                style={{
                  color: theme.ink,
                  fontFamily: FONT[b.font] || FONT.serif,
                  fontSize: SIZE[b.size] || SIZE.md,
                  lineHeight: 1.05,
                  // El revelado por líneas ya arma los saltos con flex-col; el
                  // `pre-line` sólo hace falta en el camino de fallback.
                  whiteSpace: hasEm ? 'pre-line' : 'normal',
                }}
              >
                {hasEm ? (
                  renderTitle(b.title, FONT.script)
                ) : (
                  <KineticTextReveal
                    ref={(el) => (titleRefs.current[k] = el)}
                    text={b.title || ''}
                    splitBy="lines"
                    direction="up"
                    distance={26}
                    stagger={0.09}
                    autoPlay={false}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </h2>
              {b.body && (
                <p
                  className="text-[clamp(0.95rem,0.8rem+0.5vw,1.15rem)] leading-[1.5]"
                  style={{ color: theme.ink, opacity: 0.78, whiteSpace: 'pre-line' }}
                >
                  {b.body}
                </p>
              )}
              {b.cta && (
                <a
                  href={b.cta.href || '#'}
                  className="mt-2 inline-flex w-fit items-center gap-2 border px-4 py-2 text-[11px] uppercase tracking-[0.2em]"
                  style={{ borderColor: theme.accent, color: theme.accent }}
                >
                  {b.cta.label} <span aria-hidden="true">→</span>
                </a>
              )}
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}

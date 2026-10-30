import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { createFrameBudget } from '../../../lib/motion'
import { C, HERO_VH, LABEL, NAV_H, OPEN_DELAY, OPEN_T as T, SITE, STAGE_AT } from './brand'
import { hidePaint, paint } from './paint'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT } from './localScene'
import photoFull from './assets/room-photo.webp'
import photoSmall from './assets/room-photo-1200.webp'
import sketchFull from './assets/sketch-room.webp'
import sketchSmall from './assets/sketch-room-1200.webp'
import emptyFull from './assets/sketch-empty.webp'
import emptySmall from './assets/sketch-empty-1200.webp'
import rawFull from './assets/sketch-raw.webp'
import rawSmall from './assets/sketch-raw-1200.webp'
import { DESIGN_PIECES, IMG, ROOM_IN_IMAGE as RI } from './designPieces'

/**
 * The hero: from the sketch to the photo of the shop, on a sheet with the grid in view.
 *
 * The layout (like that of a plan hero): on top, three quarters of the screen for the drawing quadrant
 * (an elevation, 21:9), at full width, with the stage and the sheet in its corners; below, a low
 * band like the one on heronaiapp.com: the big title on the left and, on the right, a cell
 * with the text of each stage. The height of that band is --band-h (ordo.css).
 * When the loader ends, a shop (café / showroom, warm minimal) is drawn in pencil. As you scroll
 * (the hero stays fixed):
 *   01 The space    the shop as received, in raw grey shell (small window, patches, the pipe and the bare bulb).
 *   02 Design       the studio designs everything, piece by piece (designPieces.js): first the building work (big
 *                   window, niche, ceiling, finishes) and then the furnishings (bar, shelf, bench,
 *                   table, vase, plinth, tree).
 *   03 Matter & light  light and shadow are painted beneath the strokes, colour comes in and the
 *                   strokes go away: the photo of the shop remains.
 *   04 Experience   the camera moves in on the photo.
 * On narrow screens (phone, tablet in portrait) the shop does not fit whole: the drawing stays
 * large and the camera travels across it, from left to right, following each piece of furniture as it is drawn;
 * for the light, the colour and the photo it returns to the centre.
 * Everything happens over the same shot (sketch and photo aligned): the lines never shift. The 3D
 * stays underneath just for measuring (the crosshair reads floor metres).
 *
 * With the mouse: on entering the drawing the construction lines appear (dotted guides and a rust
 * ruler around the quadrant). On the last sheet, with the shop finished, click and
 * drag is enabled: on the left side of the cursor the sketch of the shop as received is seen (the before).
 *
 * On the way out (with `boceto`, Sketch.jsx): 100vh more of scroll with the sheet fixed, in which everything goes back
 * to a sketch (the photo is unpainted and the strokes return; the text and the frame turn to pencil). Then the
 * sketched sheet keeps going with the scroll and is left behind.
 *
 * With "reduce motion": the sheet still, with the photo.
 */

const REVEAL_SECONDS = 3.8 * T

// What the right-hand cell says on each sheet of the plan (the first is also the fixed subtitle,
// for search engines: ABOUT).
const ABOUT =
  'An architecture and interiors studio in Lisbon. We design every space whole, from the first line to the last joint.'
const STAGES = [
  { n: '01', title: 'The space', text: ABOUT },
  { n: '02', title: 'Design', text: 'We draw the whole space, piece by piece: openings, ceiling, finishes, joinery and furniture.' },
  { n: '03', title: 'Matter & light', text: 'From the idea to the built: materials, light and colour chosen for how the place will be lived in.' },
  { n: '04', title: 'Experience', text: 'The finished project, with a face of its own: a space ready to welcome its people.' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** The zoom on the photo at the end of the hero (localScene.js: uPhotoZoom). Without zoom: the photo stays
 *  as it is in stage 04, so that the drag and the return to a sketch do not move. */
/**
 * The title is written in parts with the first ticks of the wheel: "Design" is already there and, as each hero
 * progress point passes, the next part appears with a slow fade (it rises slightly and blurs a little on arrival). Each
 * part has its own timing: it does not depend on how fast the wheel is turned. What has not arrived yet is not seen.
 */
const TITLE_AT = [0, 0.012, 0.04, 0.07]
/** How each part of the title and of the stage text comes in and out (s). */
const SOFT_IN = 1.25
const SOFT_OUT = 0.45

const PHOTO_END_ZOOM = 1
// Stage 02: the pieces (building work and furnishings) are drawn one after another between 0.06 and 0.52 of the hero.
const PIECE_DUR = 0.09
const pieceAt = (k) => 0.06 + (k * (0.52 - 0.06 - PIECE_DUR)) / Math.max(1, DESIGN_PIECES.length - 1)
/** The cursor label on the last stage, when dragging is possible. */
const DRAG_TIP = 'Click and drag'
/** What is not background in the photo (the shop with its base and its shadow), as fractions of the image. */
const PHOTO_IN = { x0: 0.03, x1: 0.97, y0: 0.085, y1: 0.87 }

/**
 * The sheet measurements for a stage of W × H: the drawing quadrant goes full width,
 * between the nav and the text block below (which starts at `infoTop`).
 */
function sheetLayout(W, H, infoTop) {
  const side = W >= 640 ? 36 : 16
  // One column line per module from the right edge (the nav dividers, continuing downwards).
  const mod = W >= 1024 ? 192 : 128
  const cols = Math.max(1, Math.ceil(W / mod) - 1)
  // Between the nav binding (opaque up to --nav-h + 9) and the quadrant there is the band of labels.
  const top = (W >= 640 ? NAV_H.desk : NAV_H.phone) + (W >= 640 ? 34 : 28)
  const bottom = infoTop - (W >= 640 ? 18 : 12)
  return { cols, panel: { x: side, y: top, w: W - side * 2, h: Math.max(80, bottom - top) } }
}

/**
 * The elevation frame inside the quadrant: what is fitted is the shop (not the paper around it
 * in the image), as large as possible without cropping it. On narrow screens it is enlarged and crops the
 * sides.
 */
function cameraFrame(p) {
  const rw = RI.x1 - RI.x0
  const rh = RI.y1 - RI.y0
  const aspect = p.w / p.h
  const over = aspect < 1.5 ? Math.min(2.2, Math.max(1, (FRAME_ASPECT / aspect) * 0.86)) : 1
  const fw = Math.min(((p.w * 0.97) / rw) * over, ((p.h * 0.94) / rh) * FRAME_ASPECT)
  const fh = fw / FRAME_ASPECT
  return {
    x: p.x + p.w / 2 - fw * ((RI.x0 + RI.x1) / 2),
    y: p.y + p.h / 2 - fh * ((RI.y0 + RI.y1) / 2),
    w: fw,
    h: fh,
  }
}

/**
 * A part of the title. Until its turn comes it is not seen, but it takes up its place (the title does not rearrange as each
 * part arrives). See TITLE_AT.
 */
function Chunk({ text, hidden }) {
  return (
    <span data-chunk className="od-chunk">
      <span className="od-chunk__ink" style={hidden ? { opacity: 0, visibility: 'hidden' } : undefined}>
        {text}
      </span>
    </span>
  )
}

export default function Hero({ boarded, calm, bridge, navLogoRef, exit, boceto = false }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const panelRef = useRef(null)
  const infoRef = useRef(null)
  const cueRef = useRef(null)
  const colsRef = useRef(null)
  const sceneRef = useRef(null)
  const [stage, setStage] = useState(calm ? 3 : 0)
  const [cols, setCols] = useState(8)

  // The loader lands on the nav logo.
  useEffect(() => {
    bridge.current = {
      target: () => navLogoRef.current?.querySelector('svg[data-part=row]'),
      show: () => {
        if (navLogoRef.current) navLogoRef.current.style.opacity = '1'
      },
    }
    return () => {
      bridge.current = {}
    }
  }, [bridge, navLogoRef])

  // The scene, the sheet geometry and the scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    const stageEl = stageRef.current
    const panel = panelRef.current
    const info = infoRef.current
    const phone = window.matchMedia('(max-width: 767px)').matches
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    // The pencil sketch and the photo of the shop (same shot): lightweight ones on small screens.
    const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1600
    const scene = createLocalScene({
      canvas,
      phone,
      photo: big ? photoFull : photoSmall,
      sketch: big ? sketchFull : sketchSmall,
      sketchEmpty: big ? emptyFull : emptySmall,
      sketchRaw: big ? rawFull : rawSmall,
    })
    sceneRef.current = scene
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2)
    scene.setPixelRatio(dpr)
    const budget = createFrameBudget({ dpr, apply: (v) => scene.setPixelRatio(v) })

    let L = null
    let lastKey = ''
    const measure = () => {
      const W = stageEl.clientWidth
      const H = stageEl.clientHeight
      scene.resize(W, H)
      L = sheetLayout(W, H, info.offsetTop)
      setCols(L.cols)
      lastKey = ''
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stageEl)

    // The hero scroll (0→1 while it is fixed), smoothed on every frame.
    let target = calm ? 1 : 0
    let current = target
    const trigger = calm
      ? null
      : ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          // With `boceto`, after the four stages comes the return to a sketch (Sketch.jsx): 100vh more.
          end: boceto ? () => `+=${window.innerHeight * HERO_VH}` : 'bottom bottom',
          onUpdate: (self) => {
            target = self.progress
          },
        })

    let shownStage = -1
    let canDrag = false
    let release = () => {}
    let frame = null
    // When the shop does not fit whole in the quadrant (phone, tablet in portrait), the camera
    // travels across it: the furniture is drawn from left to right and the frame follows the piece being drawn.
    let base = null
    let pan = false
    let order = DESIGN_PIECES.map((_, i) => i)
    let slot = order
    const centerOf = (i) => (DESIGN_PIECES[i].rect[0] + DESIGN_PIECES[i].rect[2]) / 2 / IMG.w
    // The return to a sketch on exit (0 → 1, driven by Sketch.jsx): the photo is unpainted and the strokes return.
    let back = 0
    // The route: it starts on the left, passes each piece of furniture while it is drawn and, for the light, the
    // colour and the photo, returns to the centre. The frame never shows anything beyond the walls.
    const panTo = (p) => {
      const P = L.panel
      const at = (k) => pieceAt(k) + PIECE_DUR * 0.4
      const n = order.length
      let fx = centerOf(order[0])
      for (let k = 0; k < n - 1; k += 1) if (p > at(k)) fx = centerOf(order[k]) + (centerOf(order[k + 1]) - centerOf(order[k])) * smooth(at(k), at(k + 1), p)
      if (p > at(n - 1)) fx = centerOf(order[n - 1]) + (0.5 - centerOf(order[n - 1])) * smooth(0.52, 0.8, p)
      const lo = P.x + P.w - RI.x1 * base.w
      const hi = P.x - RI.x0 * base.w
      const x = Math.min(hi, Math.max(lo, P.x + P.w / 2 - fx * base.w))
      if (Math.abs(x - frame.x) < 0.3) return
      frame = { ...base, x }
      scene.setFrame(frame.x, frame.y, frame.w, frame.h)
    }
    // The title parts: the ink is uncovered with the scroll (only what changed is written).
    const chunks = [...stageEl.querySelectorAll('[data-chunk]')].map((el, i) => ({ ink: el.querySelector('.od-chunk__ink'), on: calm || i === 0 }))
    const apply = (p) => {
      if (!lastKey) {
        lastKey = 'set'
        const P = L.panel
        const f = cameraFrame(P)
        base = f
        frame = f
        pan = !calm && f.w * (RI.x1 - RI.x0) > P.w + 2
        order = DESIGN_PIECES.map((_, i) => i)
        // Going through: the building work first and then the furnishings, each layer from left to right.
        if (pan) order.sort((a, b) => (DESIGN_PIECES[b].obra ? 1 : 0) - (DESIGN_PIECES[a].obra ? 1 : 0) || centerOf(a) - centerOf(b))
        slot = DESIGN_PIECES.map((_, i) => order.indexOf(i))
        scene.setFrame(f.x, f.y, f.w, f.h)
        canvas.style.clipPath = `inset(${P.y}px ${stageEl.clientWidth - P.x - P.w}px ${stageEl.clientHeight - P.y - P.h}px ${P.x}px)`
        Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` })
        stageEl.style.setProperty('--px', `${P.x}px`)
        stageEl.style.setProperty('--py', `${P.y}px`)
        stageEl.style.setProperty('--pw', `${P.w}px`)
        stageEl.style.setProperty('--ph', `${P.h}px`)
      }
      if (!calm) {
        chunks.forEach((c, i) => {
          const on = p >= TITLE_AT[i]
          if (on === c.on) return
          c.on = on
          gsap.to(
            c.ink,
            on
              ? { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: SOFT_IN, ease: 'power2.out', overwrite: 'auto', clearProps: 'filter' }
              : { autoAlpha: 0, y: 12, filter: 'blur(3px)', duration: SOFT_OUT, ease: 'power2.out', overwrite: 'auto' },
          )
        })
      }
      // The scroll cue goes away as soon as scrolling down begins.
      if (cueRef.current) cueRef.current.style.opacity = String(calm ? 0 : 1 - smooth(0.004, 0.035, p))
      // The space → the design, piece by piece → light and shadow, colour (the strokes go away) → the camera moves in.
      scene.setRise(0)
      const pieces = DESIGN_PIECES.map((_, i) => (calm ? 1 : smooth(pieceAt(slot[i]), pieceAt(slot[i]) + PIECE_DUR, p)))
      if (pan) panTo(p)
      scene.setDesign(pieces)
      scene.setPhoto(calm ? 1 : smooth(0.52, 0.64, p) * (1 - back))
      scene.setSat(calm ? 1 : smooth(0.62, 0.78, p))
      scene.setSketch(calm ? 0 : Math.max(1 - smooth(0.62, 0.8, p), back))
      const s = calm ? 3 : p < STAGE_AT[1] ? 0 : p < STAGE_AT[2] ? 1 : p < STAGE_AT[3] ? 2 : 3
      if (s !== shownStage) {
        shownStage = s
        setStage(s)
        // The drag (before / after) is only enabled on the last sheet, with the shop finished.
        canDrag = s === 3 && back === 0
        if (!canDrag) release()
      }
    }
    apply(current)
    if (calm) scene.setReveal(1)

    let parked = false
    const tick = (_t, deltaMs) => {
      if (parked) return
      current += (target - current) * (1 - Math.exp(-deltaMs / 110))
      if (Math.abs(target - current) < 1e-4) current = target
      apply(current)
      if (scene.render()) budget.tick(deltaMs)
    }
    gsap.ticker.add(tick)

    // The cursor crosshair asks here at which point of the elevation it is, in metres: along the wall and
    // height from the floor. Only inside the interior of the shop.
    // The exit to Projects (Projects.jsx): where the shop is on screen now (the photo, with the scene's
    // final zoom, and the quadrant crop) and how to hide the canvas one.
    if (exit) {
      exit.current = {
        place() {
          if (!frame || !L) return null
          const r = stageEl.getBoundingClientRect()
          const P = L.panel
          const z = PHOTO_END_ZOOM
          const w = frame.w * z
          const h = frame.h * z
          // The zoom is on the point (0.5, 0.52) of the frame (localScene.js, photoAt).
          const img = { x: r.left + frame.x + frame.w * 0.5 - w * 0.5, y: r.top + frame.y + frame.h * 0.52 - h * 0.52, w, h }
          const x0 = Math.max(img.x + PHOTO_IN.x0 * w, r.left + P.x)
          const y0 = Math.max(img.y + PHOTO_IN.y0 * h, r.top + P.y)
          const x1 = Math.min(img.x + PHOTO_IN.x1 * w, r.left + P.x + P.w)
          const y1 = Math.min(img.y + PHOTO_IN.y1 * h, r.top + P.y + P.h)
          return { img, clip: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
        },
        /** On exit, everything goes back to a sketch: the photo (in the scene) and the text and the frame (--sk, CSS). */
        setBack(v) {
          if (v === back) return
          back = v
          stageEl.style.setProperty('--sk', String(v))
          stageEl.classList.toggle('is-sketch', v > 0.001)
          canDrag = shownStage === 3 && v === 0
          if (v > 0) release()
          // While everything goes back to a sketch there is no drag: nor the label that offers it.
          if (v > 0) canvas.removeAttribute('data-cursor-tip')
          else if (shownStage === 3) canvas.setAttribute('data-cursor-tip', DRAG_TIP)
        },
        hidePhoto(hidden) {
          if (hidden === parked) return
          // While the photo flies, the canvas is not seen: the hero stops computing and drawing.
          parked = hidden
          canvas.style.visibility = hidden ? 'hidden' : ''
          if (!hidden) scene.render(true)
        },
      }
    }

    setPlanProbe((x, y) => {
      if (!frame) return null
      const c = canvas.getBoundingClientRect()
      const u = (x - c.left - frame.x) / frame.w
      const v = (y - c.top - frame.y) / frame.h
      const mx = ((u - RI.x0) / (RI.x1 - RI.x0)) * RI.w
      const my = ((RI.y1 - v) / (RI.y1 - RI.y0)) * RI.h
      if (mx < 0 || mx > RI.w || my < 0 || my > RI.h) return null
      return { x: mx, y: my }
    })

    // The drag over the drawing (mouse only): the other state to the left of the cursor.
    const split = { on: 0 }
    let dragging = false
    const onDown = (e) => {
      if (!canDrag || !fine || e.pointerType === 'touch' || e.button !== 0) return
      dragging = true
      canvas.setPointerCapture?.(e.pointerId)
      scene.setSplit(e.clientX / stageEl.clientWidth)
      gsap.to(split, { on: 1, duration: 0.45, ease: 'expo.out', overwrite: true, onUpdate: () => scene.setSplitOn(split.on) })
    }
    const onMove = (e) => {
      if (dragging) scene.setSplit(e.clientX / stageEl.clientWidth)
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      gsap.to(split, { on: 0, duration: 0.55, ease: 'expo.out', overwrite: true, onUpdate: () => scene.setSplitOn(split.on) })
    }
    release = onUp
    // The construction lines: they appear on entering the drawing with the mouse (the canvas only receives the
    // pointer inside the quadrant, through its clip-path).
    const onEnter = (e) => e.pointerType !== 'touch' && stageEl.classList.add('is-hover')
    const onLeave = () => stageEl.classList.remove('is-hover')
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerenter', onEnter)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      gsap.ticker.remove(tick)
      gsap.killTweensOf(split)
      trigger?.kill()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
      setPlanProbe(null)
      if (exit) exit.current = null
      canvas.style.visibility = ''
      scene.dispose()
      sceneRef.current = null
    }
  }, [calm, exit, boceto])

  // On a stage change, what changes comes in with a slow fade: it rises slightly and blurs a little on arrival
  // (the text, the number and the quadrant labels, one after another). Before painting, so it does not show all at once.
  const firstStage = useRef(true)
  useLayoutEffect(() => {
    if (firstStage.current) {
      firstStage.current = false
      return undefined
    }
    if (calm) return undefined
    const tween = gsap.fromTo(
      stageRef.current.querySelectorAll('[data-paint-stage]'),
      { autoAlpha: 0, y: 10, filter: 'blur(3px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: SOFT_IN, stagger: 0.12, ease: 'power2.out', overwrite: 'auto', clearProps: 'filter,transform' },
    )
    return () => tween.kill()
  }, [stage, calm])

  // Before the loader ends: the grid, the quadrant and the column, hidden.
  useLayoutEffect(() => {
    if (calm) return undefined
    const q = gsap.utils.selector(stageRef.current)
    const ctx = gsap.context(() => {
      gsap.set(q('[data-col]'), { scaleY: 0 })
      gsap.set(q('[data-vline]'), { scaleY: 0 })
      gsap.set(q('[data-panel-edge]'), { scale: 0 })
      // The line under the frame is born at the centre of the screen, with the nav one (Nav.jsx).
      const mid = window.innerHeight / 2
      gsap.set(q('[data-frame-line]'), { scaleX: 0, y: (_i, el) => mid - el.getBoundingClientRect().top })
      gsap.set(q('[data-frame-mark]'), { autoAlpha: 0, scale: 0.4 })
      hidePaint(q('[data-paint]'))
    }, stageRef)
    return () => ctx.revert()
  }, [calm])

  // When the loader ends: the sketch is painted and the sheet is assembled around it.
  useEffect(() => {
    const scene = sceneRef.current
    if (!boarded || !scene || calm) return undefined
    const q = gsap.utils.selector(stageRef.current)
    const pen = { v: 0 }
    const tl = gsap.timeline()
    // The drawing starts when the image is there (if it takes long, the frame is assembled anyway and the drawing follows it).
    let alive = true
    scene.sketchReady.then(() => {
      if (alive) gsap.to(pen, { v: 1, duration: REVEAL_SECONDS, ease: 'power1.inOut', onUpdate: () => scene.setReveal(pen.v) })
    })
    tl
      .to(q('[data-panel-edge]'), { scale: 1, duration: 0.9 * T, ease: 'expo.inOut', stagger: 0.05 * T }, 0.2 * T)
      // The same timings as the nav line: it stretches at the centre and drops into place.
      .to(q('[data-frame-line]'), { scaleX: 1, duration: 0.8 * T, ease: 'expo.inOut' }, OPEN_DELAY)
      .to(q('[data-frame-line]'), { y: 0, duration: 1 * T, ease: 'expo.inOut' }, OPEN_DELAY + 0.75 * T)
      .to(q('[data-frame-mark]'), { autoAlpha: 1, scale: 1, duration: 0.5 * T, ease: 'back.out(2)', stagger: 0.05 * T }, OPEN_DELAY + 2.1 * T)
      .to(q('[data-col]'), { scaleY: 1, duration: 1.1 * T, ease: 'expo.out', stagger: 0.06 * T }, OPEN_DELAY + 0.8 * T)
      // The text line starts with the two horizontal ones and is slower than they are (both take 1.75 T).
      .to(q('[data-vline]'), { scaleY: 1, duration: 2.6 * T, ease: 'power2.inOut' }, OPEN_DELAY)
      .add(() => paint(q('[data-paint]'), { stagger: 0.05 * T, duration: 0.85 * T }), OPEN_DELAY + 0.6 * T)
      .add(() => cueRef.current?.classList.add('is-on'), OPEN_DELAY + 1.4 * T)
    return () => {
      alive = false
      tl.kill()
      gsap.killTweensOf(pen)
    }
  }, [boarded, calm])

  const st = STAGES[stage]

  return (
    <section ref={sectionRef} id="home" aria-label="Home" className={`relative z-[2] ${boceto ? 'h-[580vh]' : 'h-[480vh]'} calm:h-svh`}>
      <div ref={stageRef} data-hero-sheet className="od-lamina od-sheet od-sk sticky top-0 h-svh overflow-hidden">
        {/* The column grid, in view. */}
        <div ref={colsRef} className="od-cols" aria-hidden="true" style={{ '--cols': cols }}>
          {Array.from({ length: cols }, (_, i) => (
            <span key={i} data-col style={{ '--i': i + 1 }} />
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label="Elevation of a shop shell drawn in pencil that gets designed piece by piece, from the openings and finishes to each piece of furniture, until it becomes the photograph of the finished space"
          data-cursor-tip={stage === 3 ? DRAG_TIP : undefined}
        />

        {/* The quadrant frame: four borders that are drawn, and their data. */}
        <div ref={panelRef} className="od-panel" data-cursor-zone aria-hidden="true">
          <span data-panel-edge className="od-panel__edge od-panel__edge--t" />
          <span data-panel-edge className="od-panel__edge od-panel__edge--r" />
          <span data-panel-edge className="od-panel__edge od-panel__edge--b" />
          <span data-panel-edge className="od-panel__edge od-panel__edge--l" />
          <span data-paint data-paint-stage className="od-paint od-panel__label od-panel__label--tl" style={LABEL}>
            {st.n} — {st.title}
          </span>
          <span data-paint data-paint-stage className="od-paint od-panel__label od-panel__label--tr hidden sm:block" style={LABEL}>
            Elevation · Scale 1:50 · Sheet {st.n} / 04
          </span>
        </div>

        {/* The construction lines (with the mouse). */}
        <div className="od-guides" aria-hidden="true">
          <span className="od-guide od-guide--h" style={{ top: 'var(--py)' }} />
          <span className="od-guide od-guide--h" style={{ top: 'calc(var(--py) + var(--ph) / 3)' }} />
          <span className="od-guide od-guide--h" style={{ top: 'calc(var(--py) + var(--ph) * 2 / 3)' }} />
          <span className="od-guide od-guide--h" style={{ top: 'calc(var(--py) + var(--ph))' }} />
          <span className="od-guide od-guide--v" style={{ left: 'var(--px)' }} />
          <span className="od-guide od-guide--v" style={{ left: 'calc(var(--px) + var(--pw) / 2)' }} />
          <span className="od-guide od-guide--v" style={{ left: 'calc(var(--px) + var(--pw))' }} />
          <span className="od-guide od-guide--rust-v" />
          <span className="od-guide od-guide--rust-h" />
        </div>

        {/* The edge of the bottom band and its crosses: the frame of this sheet (it leaves with it). */}
        <span data-frame-line className="od-frame__line od-frame__line--bottom" aria-hidden="true" />
        {['bl', 'br'].map((k) => (
          <span key={k} data-frame-mark className={`od-frame__mark od-frame__mark--${k}`} aria-hidden="true" />
        ))}

        {/* The bottom band: the big title and, on the right, the stage text. */}
        <div ref={infoRef} className="od-info" style={{ color: C.ink }}>
          <h1 className="od-info__title">
            <span className="sr-only">{SITE.name} — </span>
            <span data-paint className="od-paint od-info__line">
              <Chunk text="Architecture" /> <Chunk text="& interiors" hidden={!calm} />
            </span>
            <span data-paint className="od-paint od-info__line">
              <Chunk text="for the people" hidden={!calm} /> <Chunk text="who live in them" hidden={!calm} />
            </span>
          </h1>
          {/* The scroll cue: the word and a hand-drawn arrow that is traced over and over. */}
          <div ref={cueRef} className="od-scrollcue" aria-hidden="true">
            <span className="od-scrollcue__label" style={LABEL}>
              Scroll
            </span>
            <svg className="od-scrollcue__arrow" viewBox="0 0 30 64" fill="none">
              <path className="od-scrollcue__s1" pathLength="1" d="M15.2 2 C14.4 14, 16.3 24, 15 36 S14.6 50, 15.4 58.5" />
              <path className="od-scrollcue__s2" pathLength="1" d="M16.4 4.5 C15.6 18, 16.8 30, 15.9 42 S15.6 52, 15.8 57" />
              <path className="od-scrollcue__h1" pathLength="1" d="M5.5 46.5 C9 50.5, 12.4 54.6, 15.3 59.4" />
              <path className="od-scrollcue__h2" pathLength="1" d="M25.2 45.4 C21.6 50, 18.4 54.4, 15.1 59.6 L14.2 61" />
            </svg>
          </div>

          <div className="od-info__side">
            {/* The line that separates the headline from the text: it is traced from top to bottom on opening (data-vline). */}
            <span data-vline className="od-info__vline" aria-hidden="true" />
            <h2 className="sr-only">{ABOUT}</h2>
            {/* The sheet number: the same as the quadrant's sheet ("Sheet 02 / 04"). */}
            <span data-paint data-paint-stage className="od-paint od-info__step" style={LABEL} aria-hidden="true">
              {st.n} / 04
            </span>
            <p data-paint data-paint-stage className="od-paint od-info__copy" aria-live="polite">
              {st.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

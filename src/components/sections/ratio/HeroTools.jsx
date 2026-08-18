import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'
import { RuptureOn } from './RuptureOn'
import {
  MAG_SCROLL,
  magScale,
  placeMag,
  nestInner,
  attachScroll,
  playLoadPath,
} from './readymag'

const RULES = [
  { left: '54%', height: '58%' },
  { left: '71%', height: '100%' },
  { left: '84%', height: '42%' },
  { left: '86.5%', height: '88%' },
  { left: '89%', height: '64%' },
]

/**
 * Mag canvas 1024. Letter cells and cube sizes from the live model.
 * Widget boxes 797×433 stay as path origins — do not shrink them.
 */
const BOX = { w: 797, h: 433 }
const FONT = 264
const TRACK = -10
/** Gap between ink boxes. Advance + 32 looked like the old 198px cells. */
const INK_GAP = 0
const TYPE_Z = 420
const CUBE_Z = 200

/** Word 1: 198px cells. Mag GRIDS x is kept only for hop delays. */
const FORM_STEP = 198
const FORM_SLOTS = [
  { x: 132, y: -325, z: TYPE_Z, delay_px: 330, loadDelay: 0 },
  { x: 132 + FORM_STEP, y: -325, z: TYPE_Z + 1, delay_px: 250, loadDelay: 0.1 },
  { x: 132 + FORM_STEP * 2, y: -325, z: TYPE_Z + 2, delay_px: 170, loadDelay: 0.2 },
  { x: 132 + FORM_STEP * 3, y: -325, z: TYPE_Z + 3, delay_px: 90, loadDelay: 0.3 },
  { x: 132 + FORM_STEP * 4, y: -325, z: TYPE_Z + 4, delay_px: 10, loadDelay: 0.4 },
]

/** Mag widgets 16, 17, 14, 18 (JUST). */
const JUST_SLOTS = [
  { x: 2250, y: -101, inDx: -2148, inDy: 1, dx2: -1336, dy2: -380, speed2: 0.4, z: TYPE_Z + 10 },
  { x: 2375, y: -101, inDx: -2286, inDy: 0, dx2: -1336, dy2: -379, speed2: 0.5, z: TYPE_Z + 11 },
  { x: 2551, y: -102, inDx: -2374, inDy: 0, dx2: -1336, dy2: -379, speed2: 0.4, z: TYPE_Z + 12 },
  { x: 2711, y: -101, inDx: -2451, inDy: 0, dx2: -1336, dy2: -379, speed2: 0.26, z: TYPE_Z + 13 },
]

/**
 * Mag POWERFUL (8 glyphs): slide in, then tumble off as the slab grows.
 * Even indices shoot up; odd shoot down. Downward dy is longer than the
 * dump — letters rest on the floor, and a 180° spin around the 433 box
 * would otherwise park them on the fold.
 */
const POWER_SLOTS = [
  { x: 5031, dx1: -5183, dx2: -5391, dy2: -1400, rot: -180, z: TYPE_Z + 20 },
  { x: 5187, dx1: -5331, dx2: -5418, dy2: 1180, rot: 180, z: TYPE_Z + 21 },
  { x: 5382, dx1: -5494, dx2: -5631, dy2: -1400, rot: -180, z: TYPE_Z + 22 },
  { x: 5609, dx1: -5641, dx2: -5708, dy2: 1240, rot: 180, z: TYPE_Z + 23 },
  { x: 5768, dx1: -5710, dx2: -5811, dy2: -1400, rot: -180, z: TYPE_Z + 24 },
  { x: 5934, dx1: -5806, dx2: -5818, dy2: 1260, rot: 180, z: TYPE_Z + 25 },
  { x: 6077, dx1: -5856, dx2: -5979, dy2: -1400, rot: -180, z: TYPE_Z + 26 },
  { x: 6255, dx1: -5948, dx2: -5996, dy2: 1260, rot: 180, z: TYPE_Z + 27 },
]

function powerSlot(i) {
  if (POWER_SLOTS[i]) return POWER_SLOTS[i]
  const last = POWER_SLOTS[POWER_SLOTS.length - 1]
  const extra = i - (POWER_SLOTS.length - 1)
  const up = extra % 2 === 1
  return {
    x: last.x + extra * 178,
    dx1: last.dx1 - extra * 92,
    dx2: last.dx2 - extra * 80,
    dy2: up ? -1400 : 1260,
    rot: up ? -180 : 180,
    z: TYPE_Z + 20 + i,
  }
}

const CUBE = { x: -385, y: 20, w: 197, h: 197, z: CUBE_Z }

function cubeSteps(hop) {
  return [
    { delay_px: 1174, dx: 70, dy: hop, rot: 90, from: 0, acc: 'ease-out', speed: 1 },
    { dx: 202, dy: hop, rot: 90, speed: 1 },
    { dx: 255, dy: 0, rot: 180, acc: 'ease-in', speed: 1 },
    { dx: 0, dy: 0, rot: 360, speed: 1 },
    { delay_px: 1730, dx: 50, dy: hop, rot: 270, acc: 'ease-out', speed: 1 },
    { dx: 332, dy: hop, rot: 270, speed: 1 },
    { dx: 502, dy: 0, rot: 360, acc: 'ease-in', speed: 1 },
    { dx: 0, dy: 0, rot: 360, speed: 1 },
  ]
}

function glyphsOf(word) {
  return Array.from(word || '').filter((ch) => ch !== ' ')
}

function slotAt(list, i) {
  if (list[i]) return list[i]
  return list[list.length - 1]
}

function inkWidth(el, ch, px) {
  const ctx = document.createElement('canvas').getContext('2d')
  const family = el ? getComputedStyle(el).fontFamily : 'Space Grotesk, sans-serif'
  ctx.font = `400 ${px}px ${family}`
  const m = ctx.measureText((ch || 'M').toUpperCase())
  const ink = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0)
  return Math.max(ink, m.width * 0.58)
}

/** Caps sit on the hero floor. Do not hang below the fold. */
function paintGlyph(el, s) {
  if (!el) return
  const px = FONT * s
  Object.assign(el.style, {
    position: 'absolute',
    left: '0px',
    top: 'auto',
    bottom: '0px',
    display: 'block',
    width: 'max-content',
    height: `${0.72 * px}px`,
    fontSize: `${px}px`,
    fontWeight: '400',
    fontStyle: 'normal',
    lineHeight: '0.72',
    letterSpacing: '0px',
    color: '#111',
    textTransform: 'uppercase',
    overflow: 'visible',
  })
}

/** Obys On overlay: Mr Bedfort, 197px mag, −10 tracking, 1px ink stroke. */
function paintScript(el, s) {
  if (!el) return
  const px = 197 * s
  Object.assign(el.style, {
    position: 'absolute',
    left: '0px',
    top: 'auto',
    bottom: `${Math.round(-0.08 * px)}px`,
    display: 'block',
    width: 'max-content',
    height: `${0.9 * px}px`,
    fontFamily: '"Mr Bedfort", cursive',
    fontSize: `${px}px`,
    fontWeight: '400',
    fontStyle: 'normal',
    lineHeight: '0.9',
    letterSpacing: `${TRACK * s}px`,
    color: '#5fd4ea',
    WebkitTextStroke: '1px #111',
    paintOrder: 'stroke fill',
    textTransform: 'uppercase',
    overflow: 'visible',
    zIndex: '2',
    pointerEvents: 'none',
  })
}

function Actor({ kind, i, text, fill, children }) {
  return (
    <div data-scroll-ac data-kind={kind} data-i={i} className="ratio-ac">
      <div
        data-load-ac
        className="ratio-ac"
        data-ratio-block={fill ? '' : undefined}
        style={fill ? tilt(3, 1) : undefined}
      >
        {fill ? (
          <>
            <span data-rupture-off className="absolute inset-0 bg-[#111]" />
            <RuptureOn index={0} />
          </>
        ) : null}
        {children ?? (
          fill ? null : (
            <>
              <span className="ratio-glyph font-grotesk select-none">{text}</span>
              {kind === 'are' || kind === 'tools' ? (
                <span data-rupture-script className="ratio-script select-none" aria-hidden="true">
                  {text}
                </span>
              ) : null}
            </>
          )
        )}
      </div>
    </div>
  )
}

export default function HeroTools({
  word1 = 'GRID',
  word2 = 'THE',
  word3 = 'FOLD',
  word4 = 'RATIO',
  word5 = 'BASELINE',
  note = 'Type on the floor. A cube holds the fold and the ratio between them.',
  aside = '... grid\nfold\nratio.',
}) {
  const root = useRef(null)
  const form = glyphsOf(word1)
  const just = glyphsOf(word3)
  const power = glyphsOf(word5)

  useGSAP(
    () => {
      const pin = root.current.querySelector('[data-hero-pin]')
      const stage = pin.querySelector('[data-stage]')
      const topBand = pin.querySelector('[data-top-band]')
      const asideEl = pin.querySelector('[data-aside]')
      const noteEl = pin.querySelector('[data-note]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const s = magScale(pin.offsetWidth)
      const bottomEl = pin.querySelector('[data-bottom]')
      const frame = pin.querySelector('[data-top-frame]')
      const floorGap = Math.max(28, Math.round(bottomEl.offsetHeight * 0.08))
      const topGap = Math.max(20, Math.round(bottomEl.offsetHeight * 0.08))
      const cubeSide = Math.min(
        CUBE.w * s,
        Math.max(72, bottomEl.offsetHeight - floorGap - topGap),
      )
      const cubeMag = cubeSide / s

      const placeActor = (el, mag) => {
        placeMag(el, mag, s)
        el.style.top = 'auto'
        el.style.bottom = `${floorGap}px`
        el.style.marginTop = '0px'
        nestInner(el.querySelector('[data-load-ac]'))
      }

      const cube = stage.querySelector('[data-kind="cube"]')
      placeActor(cube, { ...CUBE, w: cubeMag, h: cubeMag })

      // Rest stays with the type. Hop lands on the top plate's bottom edge.
      let hopDy = -241
      if (frame) {
        const stageR = stage.getBoundingClientRect()
        const frameR = frame.getBoundingClientRect()
        const border = parseFloat(getComputedStyle(frame).borderBottomWidth) || 1
        hopDy = -Math.round((stageR.bottom - floorGap - (frameR.bottom - border)) / s)
      }

      {
        const px = FONT * s
        let run = 0
        form.forEach((ch, i) => {
          const slot = slotAt(FORM_SLOTS, i)
          const el = stage.querySelector(`[data-kind="form"][data-i="${i}"]`)
          const glyph = el.querySelector('.ratio-glyph')
          paintGlyph(glyph, s)
          placeActor(el, { ...BOX, ...slot, x: 132 + run / s })
          run += inkWidth(glyph, ch, px) + INK_GAP
        })
      }

      {
        const el = stage.querySelector('[data-kind="are"]')
        placeActor(el, { ...BOX, x: 1328, y: -101, z: TYPE_Z })
        const glyph = el.querySelector('.ratio-glyph')
        paintGlyph(glyph, s)
        if (glyph) glyph.style.letterSpacing = `${TRACK * s}px`
        paintScript(el.querySelector('[data-rupture-script]'), s)
      }

      just.forEach((_, i) => {
        const slot = slotAt(JUST_SLOTS, i)
        const el = stage.querySelector(`[data-kind="just"][data-i="${i}"]`)
        placeActor(el, { ...BOX, x: slot.x, y: slot.y, z: slot.z })
        paintGlyph(el.querySelector('.ratio-glyph'), s)
      })

      {
        const el = stage.querySelector('[data-kind="tools"]')
        placeActor(el, {
          w: 941,
          h: 433,
          x: 4067,
          y: -100,
          z: TYPE_Z + 16,
        })
        const glyph = el.querySelector('.ratio-glyph')
        paintGlyph(glyph, s)
        if (glyph) glyph.style.letterSpacing = `${TRACK * s}px`
        paintScript(el.querySelector('[data-rupture-script]'), s)
      }

      power.forEach((_, i) => {
        const slot = powerSlot(i)
        const el = stage.querySelector(`[data-kind="power"][data-i="${i}"]`)
        placeActor(el, {
          w: 216,
          h: 433,
          x: slot.x,
          y: -101,
          z: slot.z,
        })
        paintGlyph(el.querySelector('.ratio-glyph'), s)
      })

      gsap.set(asideEl, { autoAlpha: 0 })
      gsap.set(topBand, { xPercent: 0 })

      if (reduced) {
        stage.style.opacity = '1'
        return undefined
      }

      stage.style.opacity = '1'

      form.forEach((_, i) => {
        const slot = slotAt(FORM_SLOTS, i)
        const inner = stage.querySelector(`[data-kind="form"][data-i="${i}"] [data-load-ac]`)
        playLoadPath(
          inner,
          {
            dx: 0,
            dy: -224,
            from: -7,
            rot: 0,
            acc: 'ease-out',
            delay: slot.loadDelay,
            dur: 0.6,
          },
          s,
        )
      })

      const players = []
      const add = (el, steps) => {
        if (el) players.push(attachScroll(el, steps, s))
      }

      form.forEach((_, i) => {
        const slot = slotAt(FORM_SLOTS, i)
        add(stage.querySelector(`[data-kind="form"][data-i="${i}"]`), [
          {
            delay_px: slot.delay_px,
            dx: -40,
            dy: 300,
            rot: -7,
            from: 0,
            acc: 'ease-in',
            speed: 1,
          },
        ])
      })
      add(stage.querySelector('[data-kind="are"]'), [{ dx: -2000, dy: 0, speed: 1 }])
      just.forEach((_, i) => {
        const slot = slotAt(JUST_SLOTS, i)
        add(stage.querySelector(`[data-kind="just"][data-i="${i}"]`), [
          { dx: slot.inDx, dy: slot.inDy, speed: 1 },
          { dx: slot.dx2, dy: slot.dy2, rot: 360, acc: 'ease-out', speed: slot.speed2 },
        ])
      })
      add(cube, cubeSteps(hopDy))
      add(stage.querySelector('[data-kind="tools"]'), [{ dx: -5000, dy: 0, speed: 1 }])
      if (noteEl) {
        const exit = Math.ceil((noteEl.offsetWidth + 48) / s) + 40
        add(noteEl, [{ delay_px: 2100, dx: -exit, dy: 0, speed: 1 }])
      }
      power.forEach((_, i) => {
        const slot = powerSlot(i)
        add(stage.querySelector(`[data-kind="power"][data-i="${i}"]`), [
          { dx: slot.dx1, dy: 0, speed: 1 },
          { dx: slot.dx2, dy: slot.dy2, rot: slot.rot, acc: 'ease-out', speed: 1 },
        ])
      })

      const cubeFill = cube.querySelector('[data-load-ac]')
      const foldGlyphs = stage.querySelectorAll('[data-kind="just"] .ratio-glyph')
      const plateGlyphs = stage.querySelectorAll('[data-kind="tools"] .ratio-glyph')
      const plateGap = 28
      // Model: white gutter on the right — slab never reaches the edge.
      const slabMax = Math.max(cubeSide, pin.offsetWidth - Math.max(64, pin.offsetWidth * 0.08))
      // Keep height fixed to the cube — only width grows.
      gsap.set(cubeFill, {
        width: cubeSide,
        height: cubeSide,
        maxHeight: cubeSide,
        scaleX: 1,
        scaleY: 1,
        transformOrigin: 'left center',
      })

      const capCubeBeforeWord = (glyphs) => {
        if (!cubeFill || !glyphs.length) return
        const fillLeft = cubeFill.getBoundingClientRect().left
        let nearest = Infinity
        glyphs.forEach((g) => {
          const r = g.getBoundingClientRect()
          if (r.width < 1 || r.right < fillLeft) return
          nearest = Math.min(nearest, r.left)
        })
        if (!Number.isFinite(nearest)) return
        const cap = nearest - plateGap - fillLeft
        const current = Number(gsap.getProperty(cubeFill, 'width'))
        if (!Number.isFinite(cap) || !Number.isFinite(current)) return
        if (cap < current) gsap.set(cubeFill, { width: Math.max(cubeSide, cap), height: cubeSide })
      }

      const beatRange = MAG_SCROLL * s
      const holdPx = pin.offsetHeight * 0.4
      const range = beatRange + holdPx
      const T = MAG_SCROLL / 1000
      const holdT = holdPx / s / 1000
      // Last-word slab waits until glyph 3 arrives (Beat step 1 done).
      const growIndex = Math.min(2, Math.max(0, power.length - 1))
      const growAt = Math.abs(powerSlot(growIndex).dx1) / 1000
      const growDur = Math.max(0.85, T - growAt - 0.04)

      const ticks = pin.querySelector('[data-top-ticks]')

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: `+=${range}px`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const px = self.progress * range
            players.forEach((p) => p.seek(px))
            const t = self.progress * (T + holdT)
            if (t < growAt) capCubeBeforeWord([...foldGlyphs, ...plateGlyphs])
          },
        },
      })

      tl.to({}, { duration: T + holdT }, 0)
      if (ticks) tl.to(ticks, { xPercent: -72, duration: T }, 0)
      tl.to(asideEl, { autoAlpha: 1, duration: 0.08 }, 1.65)
      tl.to(cubeFill, { width: pin.offsetWidth, height: cubeSide, duration: 1.2, ease: 'none' }, 2.15)
      tl.to(cubeFill, { width: cubeSide, height: cubeSide, duration: 0.5, ease: 'none' }, 3.35)
      // Word 5: cube stays small through glyphs 1–2, grows from glyph 3.
      tl.to(cubeFill, { width: slabMax, height: cubeSide, duration: growDur, ease: 'none' }, growAt)
      const typeEls = stage.querySelectorAll('[data-kind]:not([data-kind="cube"])')
      tl.to(typeEls, { autoAlpha: 0, duration: 0.22 }, Math.max(growAt + 0.35, T - 0.4))
      if (asideEl) tl.to(asideEl, { autoAlpha: 0, duration: 0.15 }, Math.max(growAt + 0.35, T - 0.4))
    },
    { scope: root, dependencies: [word1, word2, word3, word4, word5, note] },
  )

  return (
    <section
      id="intro"
      ref={root}
      className="relative bg-white text-[#111]"
    >
      <div data-hero-pin className="relative h-svh overflow-hidden">
        <div className="flex h-full flex-col pt-11 md:pt-12">
          <div data-top-slot className="relative z-10 min-h-0 flex-1 overflow-hidden bg-white">
            <div
              data-top-band
              data-ratio-block
              className="absolute left-3 right-0 top-2 bottom-0 will-change-transform md:left-4"
              style={tilt(0, 1)}
            >
              <div data-top-frame className="relative h-full overflow-hidden border border-[#111] bg-white">
                <p
                  data-note
                  className="absolute bottom-4 left-4 z-10 max-w-[36ch] text-[11px] leading-[1.45] tracking-[0.04em] uppercase will-change-transform md:bottom-5 md:left-5"
                >
                  {note}
                </p>
                <div data-top-ticks className="absolute inset-0 will-change-transform">
                  {RULES.map((rule) => (
                    <button
                      key={rule.left}
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      data-hero-hit
                      className="absolute bottom-0 z-10 w-8 -translate-x-1/2 cursor-default"
                      style={{ left: rule.left, height: '100%' }}
                    >
                      <span
                        data-hero-rule
                        className="pointer-events-none absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-[#111]"
                        style={{ height: rule.height }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div data-bottom className="relative z-30 min-h-0 flex-[1.15] overflow-visible border-t border-[#111]">
            <p
              data-aside
              className="pointer-events-none absolute top-3 right-6 z-20 whitespace-pre text-left text-[11px] leading-[1.35] tracking-[0.04em]"
            >
              {aside}
            </p>
            <div data-stage className="pointer-events-none absolute inset-0 z-10 overflow-visible opacity-0">
              <Actor kind="cube" fill />
              {form.map((ch, i) => (
                <Actor key={`f-${i}-${ch}`} kind="form" i={i} text={ch} />
              ))}
              <Actor kind="are" text={word2} />
              {just.map((ch, i) => (
                <Actor key={`j-${i}-${ch}`} kind="just" i={i} text={ch} />
              ))}
              <Actor kind="tools" text={word4} />
              {power.map((ch, i) => (
                <Actor key={`p-${i}-${ch}`} kind="power" i={i} text={ch} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

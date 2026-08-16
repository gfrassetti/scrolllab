import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'
import {
  MAG_SCROLL,
  magScale,
  placeMag,
  nestInner,
  attachScroll,
  playLoadPath,
  openPinOverflow,
} from './readymag'

const RULES = [
  { left: '54%', height: '58%' },
  { left: '71%', height: '100%' },
  { left: '84%', height: '42%' },
  { left: '86.5%', height: '88%' },
  { left: '89%', height: '64%' },
]

/**
 * Widget geometry from the Readymag mag (canvas 1024). dx/dy in the
 * recipes are absolute from these rest poses — do not pack x or shrink
 * the boxes or the riel aims at the wrong place.
 *
 * Visual type is pact with the cube: same height, same Y band.
 * The 797×433 boxes stay for the path origin; the glyph is painted
 * to the cube’s bottom / height so it cannot sit in the top band.
 *
 * Actors match the ref: word1/3/5 letter-by-letter, word2/4 one widget.
 */
const BOX = { w: 797, h: 433 }
const TRACK = -10
const TYPE_Z = 420
const CUBE_Z = 200

/** Word 1 letter x — even step. Mag GRIDS packs I next to D; SPAN’s A/N are wide. */
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

const POWER_SLOTS = [
  { x: 5031, dx1: -5183, dx2: -5391, dy2: -655, rot: -180, z: TYPE_Z + 20 },
  { x: 5187, dx1: -5331, dx2: -5418, dy2: 343, rot: 180, z: TYPE_Z + 21 },
  { x: 5382, dx1: -5494, dx2: -5631, dy2: -655, rot: -180, z: TYPE_Z + 22 },
  { x: 5609, dx1: -5641, dx2: -5708, dy2: 500, rot: 180, z: TYPE_Z + 23 },
  { x: 5768, dx1: -5710, dx2: -5811, dy2: -651, rot: -180, z: TYPE_Z + 24 },
]

const CUBE = { x: -385, y: 20, w: 191, h: 191, z: CUBE_Z }

const CUBE_STEPS = [
  { delay_px: 1174, dx: 70, dy: -241, rot: 90, from: 0, acc: 'ease-out', speed: 1 },
  { dx: 202, dy: -241, rot: 90, speed: 1 },
  { dx: 302, dy: 0, rot: 180, acc: 'ease-in', speed: 1 },
  { dx: 0, dy: 0, rot: 360, speed: 1 },
  { delay_px: 1730, dx: 50, dy: -241, rot: 270, acc: 'ease-out', speed: 1 },
  { dx: 332, dy: -241, rot: 270, speed: 1 },
  { dx: 502, dy: 0, rot: 360, acc: 'ease-in', speed: 1 },
  { dx: 0, dy: 0, rot: 360, speed: 1 },
]

function glyphsOf(word) {
  return Array.from(word || '').filter((ch) => ch !== ' ')
}

function slotAt(list, i) {
  if (list[i]) return list[i]
  return list[list.length - 1]
}

/** Paint a glyph so its em-box matches the cube: same px height, same baseline. */
function paintGlyph(el, slotY, s) {
  if (!el) return
  const size = CUBE.h * s
  Object.assign(el.style, {
    position: 'absolute',
    left: '0px',
    top: 'auto',
    bottom: `${(CUBE.y - slotY) * s}px`,
    height: `${size}px`,
    fontSize: `${size}px`,
    lineHeight: '1',
    letterSpacing: `${TRACK * s}px`,
  })
}

function Actor({ kind, i, text, fill, children }) {
  return (
    <div data-scroll-ac data-kind={kind} data-i={i} className="ratio-ac">
      <div
        data-load-ac
        className={fill ? 'ratio-ac bg-[#111]' : 'ratio-ac'}
        data-ratio-block={fill ? '' : undefined}
        style={fill ? tilt(3, 1) : undefined}
      >
        {children ?? (
          <span className="ratio-glyph font-grotesk select-none">{text}</span>
        )}
      </div>
    </div>
  )
}

export default function HeroTools({
  word1 = 'SPAN',
  word2 = 'CAN',
  word3 = 'FOLD',
  word4 = 'PLATE',
  word5 = 'SCALE',
  note = 'Ink first. The span is a guess we agree to hold — until the sheet says otherwise.',
  caption = 'A working measure',
  aside = '... still\nthe sheet\nholds.',
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
      const underscore = pin.querySelector('[data-underscore]')
      const asideEl = pin.querySelector('[data-aside]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const s = magScale(pin.offsetWidth)

      const placeActor = (el, mag) => {
        placeMag(el, mag, s)
        nestInner(el.querySelector('[data-load-ac]'))
      }

      const cube = stage.querySelector('[data-kind="cube"]')
      placeActor(cube, CUBE)

      form.forEach((_, i) => {
        const slot = slotAt(FORM_SLOTS, i)
        const el = stage.querySelector(`[data-kind="form"][data-i="${i}"]`)
        placeActor(el, { ...BOX, ...slot })
        paintGlyph(el.querySelector('.ratio-glyph'), slot.y, s)
      })

      {
        const el = stage.querySelector('[data-kind="are"]')
        placeActor(el, { ...BOX, x: 1328, y: -101, z: TYPE_Z })
        paintGlyph(el.querySelector('.ratio-glyph'), -101, s)
      }

      just.forEach((_, i) => {
        const slot = slotAt(JUST_SLOTS, i)
        const el = stage.querySelector(`[data-kind="just"][data-i="${i}"]`)
        placeActor(el, { ...BOX, x: slot.x, y: slot.y, z: slot.z })
        paintGlyph(el.querySelector('.ratio-glyph'), slot.y, s)
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
        paintGlyph(el.querySelector('.ratio-glyph'), -100, s)
      }

      power.forEach((_, i) => {
        const slot = slotAt(POWER_SLOTS, i)
        const el = stage.querySelector(`[data-kind="power"][data-i="${i}"]`)
        placeActor(el, {
          w: 216,
          h: 433,
          x: slot.x,
          y: -101,
          z: slot.z,
        })
        paintGlyph(el.querySelector('.ratio-glyph'), -101, s)
      })

      if (underscore) {
        underscore.style.width = `${40 * s}px`
        underscore.style.height = `${Math.max(6, 12 * s)}px`
        underscore.style.left = '50%'
        underscore.style.bottom = `${(-101 + 24) * s}px`
        underscore.style.marginLeft = `${(1328 - 80) * s}px`
      }

      gsap.set(underscore, { scaleX: 0, transformOrigin: 'left center' })
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
      add(cube, CUBE_STEPS)
      add(stage.querySelector('[data-kind="tools"]'), [{ dx: -5000, dy: 0, speed: 1 }])
      power.forEach((_, i) => {
        const slot = slotAt(POWER_SLOTS, i)
        add(stage.querySelector(`[data-kind="power"][data-i="${i}"]`), [
          { dx: slot.dx1, dy: 0, speed: 1 },
          { dx: slot.dx2, dy: slot.dy2, rot: slot.rot, acc: 'ease-out', speed: 1 },
        ])
      })

      const range = MAG_SCROLL * s
      const T = MAG_SCROLL / 1000
      const cubeFill = cube.querySelector('[data-load-ac]')
      gsap.set(cubeFill, { transformOrigin: 'left center' })
      const barX = () => pin.offsetWidth / Math.max(cube.offsetWidth, 1)

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
          onRefresh: openPinOverflow,
          onEnter: openPinOverflow,
          onEnterBack: openPinOverflow,
          onUpdate(self) {
            const px = self.progress * range
            players.forEach((p) => p.seek(px))
          },
        },
      })

      tl.to({}, { duration: T }, 0)
      tl.to(topBand, { xPercent: -72, duration: T }, 0)
      tl.to(underscore, { scaleX: 1, duration: 0.12 }, 0.42)
      tl.to(underscore, { scaleX: 0, duration: 0.08 }, 0.9)
      tl.to(asideEl, { autoAlpha: 1, duration: 0.08 }, 1.65)
      // Square through FOLD. Fast bar as PLATE arrives. Slow bar for SCALE.
      tl.fromTo(
        cubeFill,
        { scaleX: 1, scaleY: 1 },
        { scaleX: barX, scaleY: 1, duration: 0.28, ease: 'none' },
        3.5,
      )
      tl.to(cubeFill, { scaleX: 1, scaleY: 1, duration: 0.22, ease: 'none' }, 4.88)
      tl.to(cubeFill, { scaleX: barX, scaleY: 1, duration: 1.15, ease: 'none' }, 5.22)
    },
    { scope: root, dependencies: [word1, word2, word3, word4, word5] },
  )

  return (
    <section
      id="intro"
      ref={root}
      className="relative bg-[#f3f1eb] text-[#111]"
    >
      <div data-hero-pin className="relative h-svh overflow-visible">
        <div className="flex h-full flex-col pt-11 md:pt-12">
          <div data-top-slot className="relative min-h-0 flex-1 overflow-hidden">
            <div
              data-top-band
              data-ratio-block
              className="absolute inset-x-3 top-2 bottom-0 will-change-transform md:inset-x-4"
              style={tilt(0, 1)}
            >
              <div className="relative h-full border border-[#111]">
                <p className="absolute bottom-4 left-4 z-10 max-w-[36ch] text-[11px] leading-[1.45] tracking-[0.04em] uppercase md:bottom-5 md:left-5">
                  {note}
                </p>
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

          <div className="relative z-20 border-t border-[#111] px-4 md:px-5">
            <span className="block py-1 text-[10px] tracking-[0.18em] uppercase">
              {caption}
            </span>
          </div>

          <div data-bottom className="relative min-h-0 flex-[1.15]">
            <p
              data-aside
              className="pointer-events-none absolute top-3 right-6 z-20 whitespace-pre text-left text-[11px] leading-[1.35] tracking-[0.04em]"
            >
              {aside}
            </p>
          </div>
        </div>

        <div data-stage className="pointer-events-none absolute inset-0 z-40 overflow-visible opacity-0">
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
          <span
            data-underscore
            className="absolute origin-left bg-[#111] will-change-transform"
          />
        </div>
      </div>
    </section>
  )
}

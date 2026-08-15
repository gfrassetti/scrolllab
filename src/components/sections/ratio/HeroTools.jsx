import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { tilt } from './rupture'

const RULES = [
  { left: '54%', height: '58%' },
  { left: '71%', height: '100%' },
  { left: '84%', height: '42%' },
  { left: '86.5%', height: '88%' },
  { left: '89%', height: '64%' },
]

function glyphsOf(word) {
  return Array.from(word || '').filter((ch) => ch !== ' ')
}

function openPinOverflow(self) {
  const el = self.pin
  if (!el) return
  el.style.overflow = 'visible'
  if (el.parentElement) el.parentElement.style.overflow = 'visible'
}

/**
 * Top band = construction drawing (stays). Bottom = type row.
 * Cube + letters live in a full-viewport overlay (z-40) so they can
 * cross into the top sibling and then leave the page entirely.
 */
export default function HeroTools({
  word1 = 'FORM',
  word2 = 'ARE',
  word3 = 'JUST',
  word4 = 'TOOLS',
  word5 = 'POWER',
  note = 'This page is a construction drawing. This time we show the measure as a tool — and tools can be put down.',
  caption = '4 systems of measure',
  aside = '... but\nthese tools\nare...',
}) {
  const root = useRef(null)
  const words = [word1, word2, word3, word4, word5].map(glyphsOf)

  useGSAP(
    () => {
      const pin = root.current.querySelector('[data-hero-pin]')
      const cube = pin.querySelector('[data-cube]')
      const bottom = pin.querySelector('[data-bottom]')
      const topSlot = pin.querySelector('[data-top-slot]')
      const topBand = pin.querySelector('[data-top-band]')
      const underscore = pin.querySelector('[data-underscore]')
      const asideEl = pin.querySelector('[data-aside]')
      const groups = [0, 1, 2, 3, 4].map((w) =>
        [...pin.querySelectorAll(`[data-word="${w}"]`)],
      )
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const m = { W: 0, pinH: 0, size: 0, font: 0, charW: 0, baseX: 0, jump: 0 }

      const measure = () => {
        m.W = pin.offsetWidth
        m.pinH = pin.offsetHeight
        m.size = bottom.offsetHeight
        m.jump = -(topSlot.offsetHeight + 12)
        m.font = m.size * 0.88
        m.charW = m.font * 0.54
        m.baseX = m.size * 1.04
        groups.forEach((els) => {
          els.forEach((el) => {
            el.style.fontSize = `${m.font}px`
          })
        })
        if (underscore) {
          underscore.style.width = `${m.charW * 0.55}px`
          underscore.style.height = `${Math.max(6, m.font * 0.045)}px`
        }
      }

      const restX = (i) => m.baseX + i * m.charW
      const hitA = () => restX(0) - m.size
      const offRight = (i) => m.W + m.charW * (i + 2)
      const fallOut = () => m.pinH

      measure()

      groups[0].forEach((el, i) => gsap.set(el, { x: restX(i), y: 0, rotate: 0, autoAlpha: 1 }))
      groups.slice(1).forEach((els) => {
        els.forEach((el, i) => gsap.set(el, { x: offRight(i), y: 0, rotate: 0, autoAlpha: 1 }))
      })
      gsap.set(cube, {
        x: 0,
        y: 0,
        rotate: 0,
        width: m.size,
        height: m.size,
        transformOrigin: 'left bottom',
      })
      gsap.set(underscore, { x: restX(0) - m.charW * 0.7, y: m.font * 0.08, scaleX: 0 })
      gsap.set(asideEl, { autoAlpha: 0 })
      gsap.set(topBand, { xPercent: 0 })

      if (reduced) return undefined

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: '+=1100%',
          pin: true,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh(self) {
            measure()
            openPinOverflow(self)
          },
          onEnter: openPinOverflow,
          onEnterBack: openPinOverflow,
        },
      })

      tl.to(topBand, { xPercent: -72, duration: 1 }, 0)

      groups[0].forEach((el, i) => {
        const fromEnd = groups[0].length - 1 - i
        tl.to(
          el,
          { y: fallOut, autoAlpha: 0, rotate: 8, duration: 0.1 },
          0.06 + fromEnd * 0.07,
        )
      })

      groups[1].forEach((el, i) => {
        tl.to(el, { x: () => restX(i), duration: 0.16 }, 0.4)
      })
      tl.to(underscore, { scaleX: 1, duration: 0.1 }, 0.42)

      tl.to(cube, { x: hitA, duration: 0.14 }, 0.54)
      tl.to(cube, { y: () => m.jump, rotate: -16, duration: 0.12 }, 0.68)
      tl.to(cube, { y: 0, rotate: 0, duration: 0.12 }, 0.84)

      groups[1].forEach((el, i) => {
        tl.to(
          el,
          { y: fallOut, autoAlpha: 0, rotate: 6, duration: 0.1 },
          0.96 + i * 0.05,
        )
      })
      tl.to(underscore, { scaleX: 0, autoAlpha: 0, duration: 0.08 }, 0.96)

      groups[2].forEach((el, i) => {
        tl.to(el, { x: () => restX(i), duration: 0.12 }, 1.08)
      })

      groups[2].forEach((el, i) => {
        const at = 1.22 + i * 0.09
        tl.to(
          el,
          {
            y: () => -m.pinH * 1.15,
            x: () => restX(i) + m.W * 0.7,
            rotate: 14 + i * 10,
            autoAlpha: 0,
            duration: 0.12,
          },
          at,
        )
        if (i === 0) {
          tl.to(cube, { x: hitA, duration: 0.08 }, at)
        }
        if (i === 1) {
          tl.to(cube, { y: () => m.jump, rotate: -12, duration: 0.1 }, at)
          tl.to(
            cube,
            { width: () => m.W, x: 0, y: 0, rotate: 0, duration: 0.22 },
            at + 0.08,
          )
        }
      })

      tl.to(
        cube,
        { width: () => m.size, height: () => m.size, x: 0, y: 0, rotate: 0, duration: 0.16 },
        1.68,
      )
      groups[3].forEach((el, i) => {
        tl.to(el, { x: () => restX(i), y: 0, rotate: 0, autoAlpha: 1, duration: 0.16 }, 1.68)
      })
      tl.to(asideEl, { autoAlpha: 1, duration: 0.12 }, 1.72)

      tl.to(cube, { x: hitA, duration: 0.1 }, 1.86)
      tl.to(cube, { y: () => m.jump, rotate: -16, duration: 0.1 }, 1.96)
      tl.to(cube, { y: 0, rotate: 0, x: 0, duration: 0.1 }, 2.08)

      groups[3].forEach((el, i) => {
        tl.to(
          el,
          { y: fallOut, autoAlpha: 0, rotate: 8, duration: 0.1 },
          2.18 + i * 0.04,
        )
      })
      groups[4].forEach((el, i) => {
        tl.to(el, { x: () => restX(i), duration: 0.14 }, 2.18)
      })

      groups[4].forEach((el, i) => {
        const at = 2.36 + i * 0.08
        const up = i % 2 === 0
        tl.to(
          el,
          {
            y: () => (up ? -m.pinH * 1.1 : fallOut()),
            autoAlpha: 0,
            duration: 0.1,
          },
          at,
        )
        tl.to(cube, { x: () => restX(i) - m.size * 0.15, duration: 0.08 }, at)
      })

      tl.to(
        cube,
        {
          x: 0,
          y: 0,
          rotate: 0,
          width: () => m.W,
          height: () => m.size,
          duration: 0.22,
        },
        2.82,
      )
    },
    { scope: root, dependencies: [word1, word2, word3, word4, word5] },
  )

  return (
    <section
      id="intro"
      ref={root}
      className="relative bg-[#f3f1eb] text-[#111]"
    >
      <div data-hero-pin className="relative h-svh">
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

        <div data-actors className="pointer-events-none absolute inset-0 z-40">
          <div
            data-ratio-block
            className="absolute bottom-0 left-0"
            style={tilt(3, 1)}
          >
            <div
              data-cube
              className="bg-[#111] will-change-transform"
            />
          </div>
          {words.map((letters, w) =>
            letters.map((ch, i) => (
              <span
                key={`${w}-${i}-${ch}`}
                data-word={w}
                data-i={i}
                className="absolute bottom-0 left-0 origin-bottom font-grotesk leading-[0.72] font-bold tracking-[-0.06em] uppercase select-none will-change-transform"
              >
                {ch}
              </span>
            )),
          )}
          <span
            data-underscore
            className="absolute bottom-0 left-0 origin-left bg-[#111] will-change-transform"
          />
        </div>
      </div>
    </section>
  )
}

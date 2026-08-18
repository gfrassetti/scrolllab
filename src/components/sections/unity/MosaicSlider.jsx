import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import mosaic1 from './assets/mosaic-1.png'
import mosaic2 from './assets/mosaic-2.png'
import mosaic3 from './assets/mosaic-3.png'
import mosaic4 from './assets/mosaic-4.png'
import mosaic5 from './assets/mosaic-5.png'
import mosaic6 from './assets/mosaic-6.png'
import mosaic7 from './assets/mosaic-7.png'
import mosaic8 from './assets/mosaic-8.png'

const DEFAULT_SLIDES = [
  mosaic1,
  mosaic2,
  mosaic3,
  mosaic4,
  mosaic5,
  mosaic6,
  mosaic7,
  mosaic8,
]

/** Mosaic offsets as % of viewport; index 0 = center plate. */
const MOSAIC = [
  { x: 0, y: 0, r: 0, s: 0.44, z: 30 },
  { x: -27, y: -18, r: -5, s: 0.15, z: 12 },
  { x: -33, y: 12, r: 6, s: 0.14, z: 10 },
  { x: -18, y: 26, r: -4, s: 0.13, z: 11 },
  { x: 8, y: -16, r: 4, s: 0.12, z: 9 },
  { x: 29, y: -10, r: -6, s: 0.15, z: 12 },
  { x: 34, y: 14, r: 5, s: 0.14, z: 10 },
  { x: 20, y: 28, r: -3, s: 0.13, z: 11 },
]

/**
 * MosaicSlider — continuous scrub (no mid-timeline gsap.set).
 * Same left-origin coords from mosaic → unfold → pan.
 */
export default function MosaicSlider({
  eyebrow = 'EYEBROW 1',
  title = 'HEADLINE 3.\nHEADLINE 4.',
  slides = DEFAULT_SLIDES,
  img1,
  img2,
  img3,
  img4,
  img5,
  img6,
  img7,
  img8,
}) {
  const root = useRef(null)
  const sources = [
    img1 || slides[0],
    img2 || slides[1],
    img3 || slides[2],
    img4 || slides[3],
    img5 || slides[4],
    img6 || slides[5],
    img7 || slides[6],
    img8 || slides[7],
  ].slice(0, 8)

  const titleLines = String(title)
    .split(/\n|\\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (!root.current) return

      const pin = root.current.querySelector('[data-pin]')
      const track = root.current.querySelector('[data-track]')
      const text = root.current.querySelector('[data-sticky-text]')
      const panels = gsap.utils.toArray('[data-panel]', root.current)
      if (!pin || !track || panels.length === 0) return

      const gap = 22

      const measure = () => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const panelW = Math.min(vw * 0.88, vh * 1.02)
        const panelH = Math.min(vh * 0.88, panelW * 1.2)
        return { vw, vh, panelW, panelH }
      }

      /** Left-edge x so the panel's center sits at visualCenterX (scale-aware origin). */
      const leftForCenter = (visualCenterX, panelW) => visualCenterX - panelW / 2

      const mosaicPose = (i, drift = 0) => {
        const { vw, vh, panelW, panelH } = measure()
        const m = MOSAIC[i]
        const dx = drift * (i % 2 === 0 ? -18 : 22)
        const dy = drift * (i % 3 === 0 ? -32 : 28)
        const cx = vw / 2 + (m.x / 100) * vw + dx
        const cy = (m.y / 100) * vh + dy
        return {
          width: panelW,
          height: panelH,
          x: leftForCenter(cx, panelW),
          y: cy,
          rotate: m.r + drift * (i % 2 === 0 ? -2 : 2),
          scale: m.s * (1 + drift * 0.04),
          zIndex: m.z,
        }
      }

      const stripPose = (i) => {
        const { panelW, panelH } = measure()
        return {
          width: panelW,
          height: panelH,
          x: i * (panelW + gap),
          y: 0,
          rotate: 0,
          scale: 1,
          zIndex: 10,
        }
      }

      const trackStartX = () => {
        const { vw, panelW } = measure()
        return (vw - panelW) / 2
      }

      const trackEndX = () => {
        const { vw, panelW } = measure()
        return (vw - panelW) / 2 - (panels.length - 1) * (panelW + gap)
      }

      // One coordinate system for the whole scrub
      gsap.set(panels, {
        position: 'absolute',
        left: 0,
        top: '50%',
        xPercent: 0,
        yPercent: -50,
        transformOrigin: '50% 50%',
      })
      gsap.set(track, { x: 0, y: 0 })

      panels.forEach((panel, i) => {
        gsap.set(panel, mosaicPose(i, 0))
      })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.65,
          pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // Act 1 — Drift
      panels.forEach((panel, i) => {
        tl.fromTo(panel, mosaicPose(i, 0), mosaicPose(i, 1), 0)
      })
      if (text) tl.fromTo(text, { y: 8, scale: 1 }, { y: -12, scale: 1, duration: 1 }, 0)

      // Act 2 — Zoom (pull in + grow type)
      panels.forEach((panel, i) => {
        const { vw, vh, panelW, panelH } = measure()
        const m = MOSAIC[i]
        const zoomS = i === 0 ? 0.82 : m.s * 1.55
        const cx = i === 0 ? vw / 2 : vw / 2 + (m.x / 100) * vw * 0.55
        const cy = i === 0 ? 0 : (m.y / 100) * vh * 0.45
        tl.to(
          panel,
          {
            width: panelW,
            height: panelH,
            x: leftForCenter(cx, panelW),
            y: cy,
            scale: zoomS,
            rotate: m.r * 0.25,
            duration: 1.15,
          },
          1,
        )
      })
      if (text) tl.to(text, { scale: 1.65, duration: 1.15 }, 1)

      // Act 3 — Unfold into strip (continuous — same left-origin space)
      panels.forEach((panel, i) => {
        const end = stripPose(i)
        tl.to(
          panel,
          {
            width: () => measure().panelW,
            height: () => measure().panelH,
            x: () => stripPose(i).x,
            y: 0,
            scale: 1,
            rotate: i % 2 === 0 ? -0.6 : 0.6,
            zIndex: 10,
            duration: 1.35,
          },
          2.15,
        )
        void end
      })
      // Park track so slide 0 is centered as panels land in strip slots
      tl.fromTo(track, { x: 0 }, { x: () => trackStartX(), duration: 1.35 }, 2.15)
      if (text) tl.to(text, { scale: 2.15, opacity: 0, duration: 1 }, 2.2)

      // Act 4 — Pan
      tl.to(track, { x: () => trackEndX(), duration: 2.6 }, 3.5)
      panels.forEach((panel) => {
        tl.to(panel, { rotate: 0, duration: 1.1 }, 3.5)
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="peace"
      className="relative h-[800vh] bg-black text-white md:h-[860vh]"
    >
      <div data-pin className="sticky top-0 h-svh overflow-hidden">
        <div data-track className="absolute inset-0 will-change-transform">
          {sources.map((src, i) => (
            <div
              key={`${src}-${i}`}
              data-panel
              className="overflow-hidden bg-[#1a1a1a] will-change-transform"
              style={{ zIndex: MOSAIC[i]?.z || 1 }}
            >
              <img
                src={src}
                alt=""
                loading={i < 3 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        <div
          data-sticky-text
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center px-5 text-center will-change-transform"
        >
          <p className="mb-3 text-[11px] font-semibold tracking-[0.28em] text-[#2c4a42] uppercase md:text-xs">
            {eyebrow}
          </p>
          <h2 className="font-display text-[clamp(2.4rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em] uppercase">
            {titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
        </div>
      </div>
    </section>
  )
}

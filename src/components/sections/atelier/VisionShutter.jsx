import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * VisionShutter — Trionn-inspired scroll transition:
 * horizontal light bands (shutters) slice across a dark field while
 * oversized words scrub sideways. Bars expand until the frame washes light.
 *
 * The three marquee words are editable from the builder (word1–word3).
 */
export default function VisionShutter({
  line1 = 'Placeholder line one.',
  line2 = 'Placeholder line two.',
  word1 = 'WORD ONE',
  word2 = 'WORD TWO',
  word3 = 'WORD THREE',
}) {
  const root = useRef(null)
  const words = [word1, word2, word3, word1, word2]

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      const bars = gsap.utils.toArray('[data-shutter-bar]')
      const words = root.current.querySelector('[data-shutter-words]')
      const wash = root.current.querySelector('[data-shutter-wash]')
      const pillars = gsap.utils.toArray('[data-shutter-pillar]')
      const copy = root.current.querySelector('[data-shutter-copy]')

      gsap.set(bars, {
        scaleY: reduced ? 0.35 : 0.08,
        transformOrigin: '50% 50%',
      })
      gsap.set(wash, { autoAlpha: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=280%',
          pin: true,
          scrub: 0.65,
          anticipatePin: 1,
        },
      })

      tl.to(
        words,
        {
          xPercent: reduced ? -18 : -55,
          ease: 'none',
        },
        0,
      )

      tl.to(
        pillars,
        {
          yPercent: -12,
          opacity: 0.55,
          stagger: 0.04,
          ease: 'none',
        },
        0,
      )

      tl.to(
        bars,
        {
          scaleY: 1,
          stagger: { each: 0.03, from: 'edges' },
          ease: 'none',
        },
        0.08,
      )

      tl.to(
        copy,
        { autoAlpha: 0.35, y: -24, ease: 'none' },
        0.35,
      )

      tl.to(
        words,
        { autoAlpha: 0.15, ease: 'none' },
        0.55,
      )

      // Bars + wash become the light plane that leads into Selected Work
      tl.to(
        wash,
        { autoAlpha: 1, ease: 'none' },
        0.72,
      )
      tl.to(
        bars,
        { backgroundColor: '#e8e8e6', ease: 'none' },
        0.72,
      )
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      aria-label="Vision transition"
      className="relative bg-[#0b0c10] text-white"
    >
      <div className="relative h-svh overflow-hidden">
        {/* Soft 3D-ish pillars */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-end justify-center gap-[4vw] px-[8vw] pb-[8vh]"
        >
          {[0.55, 0.8, 1, 0.72, 0.9, 0.62].map((h, i) => (
            <span
              key={i}
              data-shutter-pillar
              className="w-[7vw] max-w-16 min-w-8 rounded-sm bg-gradient-to-b from-white/18 via-white/6 to-transparent"
              style={{ height: `${h * 42}vh`, opacity: 0.35 + i * 0.04 }}
            />
          ))}
        </div>

        <div
          data-shutter-copy
          className="absolute top-[18%] left-5 z-20 max-w-[18ch] md:left-10"
        >
          <p className="text-[clamp(1rem,2vw,1.35rem)] leading-snug font-medium tracking-[-0.02em]">
            {line1}
            <br />
            {line2}
          </p>
        </div>

        <div className="absolute inset-0 z-10 flex items-center overflow-hidden">
          <p
            data-shutter-words
            className="flex whitespace-nowrap font-brico text-[clamp(4.5rem,14vw,11rem)] leading-none font-semibold tracking-[-0.04em] text-white will-change-transform"
          >
            {words.map((word, i) => (
              <span key={i} className="px-[0.12em]">
                {word}
              </span>
            ))}
          </p>
        </div>

        {/* Venetian / shutter bands */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between py-[6vh]"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              data-shutter-bar
              className="block h-[9vh] w-full origin-center bg-[#d9d9d6] will-change-transform"
              style={{ opacity: 0.92 - (i % 3) * 0.04 }}
            />
          ))}
        </div>

        <div
          data-shutter-wash
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 bg-[#e8e8e6]"
        />
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import PaperFrame from './PaperFrame'

/**
 * ChapterFork — pinned split: two futures tear apart on scroll.
 */
export default function ChapterFork({
  label = 'Chapter 3',
  prompt = 'Prompt 1 — replace with the fork question.',
  left = {
    title: 'Headline 1',
    body: 'Body 1 — replace with path copy.',
  },
  right = {
    title: 'Headline 2',
    body: 'Body 2 — replace with path copy.',
  },
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const pin = root.current.querySelector('[data-fork-pin]')
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.45,
          pin,
          anticipatePin: 1,
        },
      })

      gsap.set('[data-path-left]', { xPercent: -8, rotate: -6, scale: 0.92 })
      gsap.set('[data-path-right]', { xPercent: 8, rotate: 6, scale: 0.92 })

      tl.fromTo(
        '[data-fork-prompt]',
        { opacity: 0, y: 28, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 1.1 },
        0,
      )
      tl.to('[data-path-left]', { xPercent: 0, rotate: -1.5, scale: 1, duration: 2 }, 0.5)
      tl.to('[data-path-right]', { xPercent: 0, rotate: 1.5, scale: 1, duration: 2 }, 0.5)
      tl.fromTo('[data-split-line]', { scaleY: 0 }, { scaleY: 1, duration: 1.4 }, 0.8)
      tl.to('[data-path-left]', { xPercent: -14, rotate: -4, duration: 2 }, 2.8)
      tl.to('[data-path-right]', { xPercent: 14, rotate: 4, duration: 2 }, 2.8)
      tl.to('[data-fork-prompt]', { opacity: 0.35, duration: 1.2 }, 2.8)
      tl.to('[data-crack]', { scaleX: 1, opacity: 1, duration: 1.6 }, 3)
    },
    { scope: root },
  )

  return (
    <section
      id="chapter-fork"
      ref={root}
      className="relative h-[420vh] bg-[#1f1c19] text-white"
    >
      <div
        data-fork-pin
        className="relative flex h-svh items-center justify-center overflow-hidden px-4 md:px-8"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(232,90,36,0.18), transparent 55%), #1f1c19',
          }}
        />

        <div className="relative z-10 w-full max-w-6xl">
          <p className="mb-3 text-center text-[11px] tracking-[0.28em] text-comic-flare uppercase">
            {label}
          </p>
          <p
            data-fork-prompt
            className="mx-auto mb-10 max-w-2xl text-center font-brico text-[clamp(1.5rem,3.6vw,2.5rem)] leading-snug font-bold tracking-[-0.02em]"
          >
            {prompt}
          </p>

          <div className="relative grid gap-5 md:grid-cols-2 md:gap-8">
            <span
              data-split-line
              aria-hidden="true"
              className="absolute top-[6%] bottom-[6%] left-1/2 hidden w-px origin-top bg-white/30 md:block"
            />
            <span
              data-crack
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 z-20 hidden h-1 w-24 -translate-x-1/2 -translate-y-1/2 origin-center scale-x-0 bg-comic-flare md:block"
              style={{ opacity: 0 }}
            />

            <div data-path-left className="will-change-transform">
              <PaperFrame>
                <div className="relative min-h-72 overflow-hidden md:min-h-85">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1f5c55] via-[#0f3531] to-[#072422]" />
                  <div className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 70%, rgba(240,160,64,0.45), transparent 40%)',
                    }}
                  />
                  <div className="relative z-10 flex h-full min-h-72 flex-col justify-end p-7 md:min-h-85 md:p-9">
                    <p className="mb-3 text-[10px] tracking-[0.25em] text-white/55 uppercase">
                      Path 1
                    </p>
                    <h2 className="mb-3 font-brico text-2xl font-bold tracking-[-0.03em] md:text-3xl">
                      {left.title}
                    </h2>
                    <p className="max-w-sm text-sm leading-relaxed text-white/80">
                      {left.body}
                    </p>
                  </div>
                </div>
              </PaperFrame>
            </div>

            <div data-path-right className="will-change-transform">
              <PaperFrame>
                <div className="relative min-h-72 overflow-hidden md:min-h-85">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#e86a2f] via-[#a83218] to-[#4a1408]" />
                  <div className="absolute inset-0 opacity-35"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.25), transparent 45%)',
                    }}
                  />
                  <div className="relative z-10 flex h-full min-h-72 flex-col justify-end p-7 md:min-h-85 md:p-9">
                    <p className="mb-3 text-[10px] tracking-[0.25em] text-white/55 uppercase">
                      Path 2
                    </p>
                    <h2 className="mb-3 font-brico text-2xl font-bold tracking-[-0.03em] md:text-3xl">
                      {right.title}
                    </h2>
                    <p className="max-w-sm text-sm leading-relaxed text-white/80">
                      {right.body}
                    </p>
                  </div>
                </div>
              </PaperFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

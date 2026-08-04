import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import heroBack from './assets/hero-back.png'
import heroMid from './assets/hero-mid.png'
import heroFront from './assets/hero-front.png'

/**
 * HeroStrike — full-bleed multi-layer parallax hero.
 * Titles start clustered mid-frame and peel apart on scroll;
 * layers drift at different speeds then blur out (no zoom-out).
 */
export default function HeroStrike({
  lineLeft = 'TITLE 1',
  lineRight = 'TITLE 2',
  lineLeft2 = 'TITLE 3',
  lineRight2 = 'TITLE 4',
  caption = 'Caption 1 — scroll',
  imgBack = heroBack,
  imgMid = heroMid,
  imgFront = heroFront,
  /** @deprecated kept for builder compat — maps to mid layer */
  img,
}) {
  const root = useRef(null)
  const midSrc = imgMid || img || heroMid

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // Start clustered toward center
      gsap.set('[data-strike-type-left]', { xPercent: 28 })
      gsap.set('[data-strike-type-right]', { xPercent: -28 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      })

      // Act 1 — parallax layers drift (different speeds, no scale zoom)
      tl.fromTo(
        '[data-strike-layer-back]',
        { yPercent: 0 },
        { yPercent: -12, duration: 4 },
        0,
      )
      tl.fromTo(
        '[data-strike-layer-mid]',
        { yPercent: 4 },
        { yPercent: -22, duration: 4 },
        0,
      )
      tl.fromTo(
        '[data-strike-layer-front]',
        { yPercent: 8 },
        { yPercent: -34, duration: 4 },
        0,
      )
      tl.fromTo(
        '[data-strike-veil]',
        { opacity: 0.25 },
        { opacity: 0.45, duration: 3.2 },
        0,
      )

      // Act 2 — titles peel from center outward
      tl.to(
        '[data-strike-type-left]',
        { xPercent: -8, duration: 3.2 },
        0.4,
      )
      tl.to(
        '[data-strike-type-right]',
        { xPercent: 8, duration: 3.2 },
        0.4,
      )

      // Act 3 — dissolve with blur (keep scale ~1)
      tl.to(
        '[data-strike-layers]',
        {
          filter: 'blur(18px)',
          opacity: 0.2,
          duration: 2.4,
        },
        3.4,
      )
      tl.to(
        '[data-strike-type-left]',
        { xPercent: -22, opacity: 0.15, duration: 2.2 },
        3.5,
      )
      tl.to(
        '[data-strike-type-right]',
        { xPercent: 22, opacity: 0.15, duration: 2.2 },
        3.5,
      )
      tl.to('[data-strike-caption]', { opacity: 0, y: -12, duration: 1 }, 3.8)

      // Act 4 — soft fade exit (no zoom)
      tl.to(
        '[data-strike-stage]',
        { opacity: 0, duration: 1.4 },
        5.2,
      )
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative h-[280vh] bg-[#0a1a12] text-[#ece9e2] md:h-[320vh]"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          data-strike-stage
          className="relative h-full w-full will-change-transform"
        >
          {/* Full-bleed multi-layer stack */}
          <div
            data-strike-layers
            className="absolute inset-0 will-change-transform"
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                data-strike-layer-back
                src={imgBack}
                alt=""
                className="absolute inset-x-0 -top-[12%] h-[124%] w-full object-cover opacity-55 will-change-transform"
              />
            </div>
            <div className="absolute inset-0 overflow-hidden">
              <img
                data-strike-layer-mid
                src={midSrc}
                alt=""
                className="absolute inset-x-0 -top-[10%] h-[130%] w-full object-cover opacity-80 mix-blend-lighten will-change-transform"
              />
            </div>
            <div className="absolute inset-0 overflow-hidden">
              <img
                data-strike-layer-front
                src={imgFront}
                alt=""
                className="absolute inset-x-0 top-[18%] h-[95%] w-full object-cover opacity-70 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_78%,transparent_100%)] will-change-transform"
              />
            </div>
            <div
              data-strike-veil
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-[#0a1a12]/70 via-[#0a1a12]/35 to-[#0a1a12]"
            />
          </div>

          {/* Titles — clustered mid, peel on scroll */}
          <div
            data-strike-type
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex -translate-y-1/2 justify-center gap-[clamp(0.5rem,2vw,1.5rem)] px-4 font-display text-[clamp(2.2rem,8vw,6.5rem)] leading-[0.85] tracking-[-0.03em] uppercase md:top-[40%]"
          >
            <div
              data-strike-type-left
              className="space-y-1 text-right will-change-transform"
            >
              <p className="text-acid">{lineLeft}</p>
              <p className="text-[#ece9e2]">{lineLeft2}</p>
            </div>
            <div
              data-strike-type-right
              className="space-y-1 text-left will-change-transform"
            >
              <p className="text-[#ece9e2]">{lineRight}</p>
              <p className="text-acid">{lineRight2}</p>
            </div>
          </div>

          <p
            data-strike-caption
            className="absolute right-5 bottom-6 z-10 text-[11px] tracking-[0.25em] text-white/55 uppercase md:right-10 md:text-xs"
          >
            {caption} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}

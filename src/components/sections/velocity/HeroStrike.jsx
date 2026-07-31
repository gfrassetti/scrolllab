import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * HeroStrike — portrait hero (no 3D) that shrinks, blurs and gets
 * crossed by a lime signature stroke as you scroll, then exits.
 * Inspired by athlete-site exit choreography; placeholder media only.
 */
export default function HeroStrike({
  brand = 'BRAND',
  lineLeft = 'TITLE 1',
  lineRight = 'TITLE 2',
  lineLeft2 = 'TITLE 3',
  lineRight2 = 'TITLE 4',
  caption = 'Lorem ipsum — scroll',
  img = 'https://picsum.photos/seed/velocity-hero/900/1200',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (reduced) return

      const path = root.current.querySelector('[data-strike-path]')
      if (path) {
        const length = path.getTotalLength()
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        })
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.65,
        },
      })

      tl.to(
        '[data-strike-frame]',
        {
          scale: 0.42,
          filter: 'blur(10px)',
          opacity: 0.35,
          ease: 'none',
        },
        0,
      )
        .to(
          '[data-strike-type]',
          {
            opacity: 0.15,
            scale: 1.06,
            ease: 'none',
          },
          0,
        )
        .to(
          '[data-strike-path]',
          {
            strokeDashoffset: 0,
            ease: 'none',
          },
          0.22,
        )
        .to(
          '[data-strike-stage]',
          {
            opacity: 0,
            scale: 0.88,
            ease: 'power1.in',
          },
          0.72,
        )
        .to(
          '[data-strike-caption]',
          {
            opacity: 0,
            y: -12,
            ease: 'none',
          },
          0.55,
        )
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative h-[240vh] bg-[#0a1a12] text-[#ece9e2] md:h-[280vh]"
    >
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'repeating-radial-gradient(circle at 50% 45%, transparent 0 18px, rgba(236,233,226,0.07) 18px 19px)',
          }}
        />

        <div
          data-strike-stage
          className="relative flex h-full w-full items-center justify-center will-change-transform"
        >
          <div
            data-strike-type
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[18%] z-0 flex justify-between px-3 font-display text-[clamp(2.4rem,9vw,7.5rem)] leading-[0.85] tracking-[-0.03em] uppercase md:px-8"
          >
            <div className="max-w-[42%] space-y-1">
              <p className="text-acid">{lineLeft}</p>
              <p style={{ color: '#ece9e2' }}>{lineLeft2}</p>
            </div>
            <div className="max-w-[42%] space-y-1 text-right">
              <p style={{ color: '#ece9e2' }}>{lineRight}</p>
              <p className="text-acid">{lineRight2}</p>
            </div>
          </div>

          <div
            data-strike-frame
            className="relative z-10 aspect-3/4 w-[min(72vw,22rem)] origin-center overflow-hidden border border-white/25 bg-[#14261c] shadow-[0_30px_80px_rgba(0,0,0,0.45)] will-change-transform md:w-[min(38vw,28rem)]"
          >
            <img src={img} alt="" className="h-full w-full object-cover" />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 300 400"
              fill="none"
              aria-hidden="true"
            >
              <path
                data-strike-path
                d="M40 95 C 90 140, 130 170, 165 210 S 230 290, 265 340"
                stroke="var(--color-acid)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="absolute top-6 left-5 text-[11px] font-medium tracking-[0.28em] uppercase md:left-10 md:text-xs">
            {brand}
          </p>
          <p
            data-strike-caption
            className="absolute right-5 bottom-6 text-[11px] tracking-[0.25em] text-white/55 uppercase md:right-10 md:text-xs"
          >
            {caption} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}

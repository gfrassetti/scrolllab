import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import stageA from './assets/stage-a.png'
import stageB from './assets/stage-b.png'

/**
 * StageLines — two typographic beats (group → finals).
 * Same language as the Framer "Group Stage / Finals" bands.
 */
export default function StageLines({
  eyebrow1 = 'EYEBROW 7',
  line1 = 'HEADLINE 8 LOREM IPSUM',
  img1 = stageA,
  eyebrow2 = 'EYEBROW 8',
  line2 = 'HEADLINE 9 LOREM IPSUM',
  img2 = stageB,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.utils.toArray('[data-stage-band]', root.current).forEach((band) => {
        const img = band.querySelector('[data-stage-img]')
        const type = band.querySelector('[data-stage-type]')
        if (img) {
          gsap.fromTo(
            img,
            { yPercent: -12 },
            {
              yPercent: 12,
              ease: 'none',
              scrollTrigger: {
                trigger: band,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          )
        }
        if (type) {
          gsap.fromTo(
            type,
            { y: 40, opacity: 0.35 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: band,
                start: 'top 80%',
                end: 'top 35%',
                scrub: 0.4,
              },
            },
          )
        }
      })
    },
    { scope: root },
  )

  const bands = [
    { eyebrow: eyebrow1, line: line1, img: img1, bg: '#1a1a1a' },
    { eyebrow: eyebrow2, line: line2, img: img2, bg: '#0a0a0a' },
  ]

  return (
    <section ref={root} id="stage" className="bg-black text-white">
      {bands.map((band) => (
        <div
          key={band.eyebrow}
          data-stage-band
          className="relative min-h-[85svh] overflow-hidden"
          style={{ backgroundColor: band.bg }}
        >
          <div className="absolute inset-0 opacity-35">
            <img
              data-stage-img
              src={band.img}
              alt=""
              loading="lazy"
              className="h-[130%] w-full object-cover will-change-transform"
            />
          </div>
          <div className="relative z-10 flex min-h-[85svh] flex-col justify-end px-5 py-16 md:px-10 md:py-24">
            <p className="mb-4 text-[11px] tracking-[0.28em] uppercase opacity-70">
              {band.eyebrow}
            </p>
            <h2
              data-stage-type
              className="max-w-[16ch] font-oswald text-[clamp(2.6rem,8vw,6rem)] leading-[0.92] font-semibold tracking-[-0.02em] uppercase"
            >
              {band.line}
            </h2>
          </div>
        </div>
      ))}
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useHoldScan } from './useHoldScan'
import HoldReticle from './HoldReticle'
import TiltPlate from './TiltPlate'
import aegis from './assets/faction-aegis.jpg'
import raven from './assets/faction-raven.jpg'

/**
 * FactionHold — two houses on a pinned stage. Scroll parallax is scrub
 * (reversible). Center hold opens a live intel feed over the tableau.
 */
export default function FactionHold({
  index = '002',
  kicker = 'Two factions.',
  line = 'Divided in belief, united in purpose.',
  leftName = 'AEGIS',
  leftBody = 'Protect the citadel. Hold the beam. Give more than you take.',
  rightName = 'RAVEN',
  rightBody = 'Take the raid. Rewrite the drop. Power is a door you kick in.',
  holdHint = 'CLICK & HOLD',
  feedLabel = 'Intel overlay',
  img = aegis,
  img2 = raven,
}) {
  const root = useRef(null)
  const { progress, bind } = useHoldScan({ duration: 0.55 })

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=180%',
          pin: '[data-faction-pin]',
          scrub: 0.55,
        },
      })
      tl.fromTo('[data-faction-left]', { xPercent: -10, scale: 1.08 }, { xPercent: 0, scale: 1, ease: 'none' }, 0)
      tl.fromTo('[data-faction-right]', { xPercent: 10, scale: 1.08 }, { xPercent: 0, scale: 1, ease: 'none' }, 0)
      tl.fromTo('[data-faction-copy]', { y: 18, autoAlpha: 0.4 }, { y: 0, autoAlpha: 1, ease: 'none' }, 0)
    },
    { scope: root },
  )

  return (
    <section id="factions" ref={root} className="relative bg-[#0e0b14] text-white">
      <div
        data-faction-pin
        role="button"
        tabIndex={0}
        aria-label={holdHint}
        aria-pressed={progress > 0.08}
        className="relative h-svh cursor-pointer overflow-hidden [touch-action:pan-y]"
        {...bind}
      >

        <div className="absolute inset-0 grid md:grid-cols-2">
          <TiltPlate className="relative min-h-full overflow-hidden">
            <img
              data-faction-left
              src={img}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute right-6 bottom-8 left-6 z-10">
              <p className="font-anton text-[clamp(2.4rem,6vw,4.2rem)] leading-none uppercase">
                {leftName}
              </p>
              <p className="mt-2 max-w-sm text-sm text-white/80">{leftBody}</p>
            </div>
          </TiltPlate>
          <TiltPlate className="relative min-h-full overflow-hidden">
            <img
              data-faction-right
              src={img2}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute right-6 bottom-8 left-6 z-10 md:text-right">
              <p className="font-anton text-[clamp(2.4rem,6vw,4.2rem)] leading-none uppercase">
                {rightName}
              </p>
              <p className="mt-2 max-w-sm text-sm text-white/80 md:ml-auto">{rightBody}</p>
            </div>
          </TiltPlate>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center"
          style={{
            opacity: progress,
            transform: `scale(${0.9 + progress * 0.1})`,
          }}
        >
          <div className="relative h-[72%] w-[min(90%,64rem)] overflow-hidden rounded-[2px] shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]">
            <div className="absolute inset-0 grid grid-cols-2">
              <img src={img} alt="" className="vanta-feed h-full w-full object-cover" />
              <img src={img2} alt="" className="vanta-feed h-full w-full object-cover" />
            </div>
            <div className="vanta-scanlines absolute inset-0" />
            <div className="absolute inset-0 bg-[#5b4cff]/25 mix-blend-multiply" />
            <div className="absolute inset-0 border border-white/45" />
            <p className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.22em] uppercase">
              REC ● {feedLabel}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-4 z-20 rounded-[1.6rem] border border-white/30 md:inset-6" />
        <div
          data-faction-copy
          className="pointer-events-none absolute top-16 right-8 left-8 z-20 md:top-20 md:right-12 md:left-12"
        >
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-70">
            {index} ■ {kicker.toUpperCase()}
          </p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85 md:text-lg">{line}</p>
        </div>

        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <HoldReticle progress={progress} label={holdHint} size={148} />
        </div>
      </div>
    </section>
  )
}

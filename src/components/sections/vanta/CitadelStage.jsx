import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useHoldScan } from './useHoldScan'
import HoldReticle from './HoldReticle'
import citadel from './assets/citadel.jpg'
import scan from './assets/citadel-scan.jpg'

/**
 * CitadelStage — P1 pin + P2 zoom (scrub, reversible) + click-and-hold
 * cinematic feed on top of the stage.
 */
export default function CitadelStage({
  index = '001',
  title = 'The Citadel',
  body = 'Last stronghold of every operator still online. The beam is the drop clock — when it goes dark, the raid begins.',
  holdHint = 'CLICK & HOLD',
  feedLabel = 'Live feed',
  img = citadel,
  img2 = scan,
}) {
  const root = useRef(null)
  const { progress, bind } = useHoldScan({ duration: 0.55 })

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        '[data-citadel-media]',
        { scale: 1.12 },
        {
          scale: 1.28,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=160%',
            pin: '[data-citadel-pin]',
            scrub: 0.5,
          },
        },
      )
    },
    { scope: root },
  )

  return (
    <section id="citadel" ref={root} className="relative bg-[#1a1428] text-white">
      <div data-citadel-pin className="relative h-svh overflow-hidden">
        <button
          type="button"
          aria-label={holdHint}
          aria-pressed={progress > 0.08}
          className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent [touch-action:pan-y]"
          {...bind}
        />
        <div data-citadel-media className="absolute inset-0 will-change-transform">
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center"
          style={{
            opacity: progress,
            transform: `scale(${0.88 + progress * 0.12})`,
          }}
        >
          <div className="relative h-[78%] w-[min(92%,78rem)] overflow-hidden rounded-[2px] shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]">
            <img src={img2} alt="" className="vanta-feed h-full w-full object-cover" />
            <div className="vanta-scanlines absolute inset-0" />
            <div className="absolute inset-0 border border-white/45" />
            <p className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.22em] uppercase">
              REC ● {feedLabel}
            </p>
            <p className="absolute right-3 bottom-3 font-mono text-[10px] tracking-[0.2em] uppercase opacity-80">
              {Math.round(progress * 100)}%
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-4 z-20 rounded-[1.6rem] border border-white/35 md:inset-6" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <HoldReticle progress={progress} label={holdHint} size={128} />
        </div>

        <div className="pointer-events-none absolute right-8 bottom-10 left-8 z-20 md:right-14 md:bottom-14 md:left-14">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-80">
            {index} ■ {title.toUpperCase()}
          </p>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/90 md:text-lg">
            {body}
          </p>
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useHoldScan } from './useHoldScan'
import HoldReticle from './HoldReticle'
import { VantaCrosshair } from './VantaChrome'
import scene from './assets/factions-paint.jpg'
import scan from './assets/citadel-scan.jpg'

/**
 * FactionHold — full-viewport tableau. No GSAP pin-spacer (that left
 * a cream void). Parallax is scrub on the painting; hold opens intel.
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
  img = scene,
  img2 = scan,
}) {
  const root = useRef(null)
  const { progress, bind } = useHoldScan({ duration: 0.55 })

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        '[data-faction-bg]',
        { scale: 1.08, xPercent: -2 },
        {
          scale: 1.16,
          xPercent: 2,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 80%',
            end: 'bottom top',
            scrub: 0.5,
          },
        },
      )
    },
    { scope: root },
  )

  return (
    <section id="factions" ref={root} className="relative bg-[#111114] text-white">
      <div
        role="button"
        tabIndex={0}
        aria-label={holdHint}
        aria-pressed={progress > 0.08}
        className="relative h-svh cursor-pointer overflow-hidden [touch-action:pan-y]"
        {...bind}
      >
        <img
          data-faction-bg
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_20%] will-change-transform"
        />
        <img
          src={img2}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-lighten"
          style={{ opacity: progress * 0.35 }}
        />

        <div
          className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center"
          style={{
            opacity: progress,
            transform: `scale(${0.9 + progress * 0.1})`,
          }}
        >
          <div className="relative h-[70%] w-[min(90%,58rem)] overflow-hidden rounded-[2px] shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]">
            <img src={img} alt="" className="vanta-feed h-full w-full object-cover" />
            <div className="vanta-scanlines absolute inset-0" />
            <div className="absolute inset-0 bg-[#5b4cff]/20 mix-blend-multiply" />
            <div className="absolute inset-0 border border-white/45" />
            <p className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.22em] uppercase">
              REC ● {feedLabel}
            </p>
          </div>
        </div>

        <VantaCrosshair />
        <div className="pointer-events-none absolute top-16 right-8 left-8 z-20 md:top-20 md:right-12 md:left-12">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-80">
            {index} ■ {kicker.toUpperCase()}
          </p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/90 md:text-lg">{line}</p>
        </div>

        <div className="pointer-events-none absolute right-8 bottom-12 left-8 z-20 flex justify-between gap-6 md:bottom-14">
          <div>
            <p className="font-anton text-[clamp(1.8rem,4vw,3.2rem)] leading-none uppercase">{leftName}</p>
            <p className="mt-2 max-w-xs text-sm text-white/80">{leftBody}</p>
          </div>
          <div className="text-right">
            <p className="font-anton text-[clamp(1.8rem,4vw,3.2rem)] leading-none uppercase">{rightName}</p>
            <p className="mt-2 ml-auto max-w-xs text-sm text-white/80">{rightBody}</p>
          </div>
        </div>

        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <HoldReticle progress={progress} label={holdHint} size={148} />
        </div>
      </div>
    </section>
  )
}

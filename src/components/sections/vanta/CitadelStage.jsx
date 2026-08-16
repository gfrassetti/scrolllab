import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useHoldScan } from './useHoldScan'
import HoldReticle from './HoldReticle'
import { VantaStage, VantaCrosshair } from './VantaChrome'
import citadel from './assets/keep-paint.jpg'
import scan from './assets/citadel-scan.jpg'

/**
 * CitadelStage — painterly keep in a custom viewport. Zoom is scrub
 * (reversible). Click-and-hold opens a live feed over the painting.
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
        { scale: 1.08 },
        {
          scale: 1.22,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=170%',
            pin: '[data-citadel-pin]',
            scrub: 0.5,
          },
        },
      )
    },
    { scope: root },
  )

  return (
    <section id="citadel" ref={root} className="relative bg-[#f4f1ea] text-white">
      <div data-citadel-pin className="relative h-svh overflow-hidden px-3 py-3 md:px-4 md:py-4">
        <button
          type="button"
          aria-label={holdHint}
          aria-pressed={progress > 0.08}
          className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent [touch-action:pan-y]"
          {...bind}
        />
        <VantaStage className="absolute inset-3 md:inset-4">
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
            <div className="relative h-[76%] w-[min(92%,74rem)] overflow-hidden rounded-[2px] shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]">
              <img src={img2} alt="" className="vanta-feed h-full w-full object-cover" />
              <div className="vanta-scanlines absolute inset-0" />
              <div className="absolute inset-0 border border-white/45" />
              <p className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.22em] uppercase">
                REC ● {feedLabel}
              </p>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgb(255 255 255 / 0.14) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.14) 1px, transparent 1px)',
              backgroundSize: '25% 33%',
            }}
          />
          <VantaCrosshair />
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <HoldReticle progress={progress} label={holdHint} size={128} />
          </div>
          <div className="pointer-events-none absolute right-8 bottom-12 left-8 z-20 text-center md:bottom-14">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-85">
              {index} ■ {title.toUpperCase()}
            </p>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/90 md:text-lg">
              {body}
            </p>
          </div>
        </VantaStage>
      </div>
    </section>
  )
}

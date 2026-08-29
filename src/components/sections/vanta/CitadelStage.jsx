import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useHoldScan } from './useHoldScan'
import HoldReticle from './HoldReticle'
import { VantaConsole, VantaCrosshair } from './VantaChrome'
import citadel from './assets/keep-paint.jpg'
import scan from './assets/citadel-scan.jpg'

/**
 * CitadelStage — full-viewport painting (no GSAP pin-spacer).
 * Zoom is scrub on the image. Console bar is KPR `the-console-loading`
 * (`scaleX(percent)`, ease none, 0.6s). Hold opens the live feed.
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
  const bar = useRef({ percent: 0 })
  const [loadPct, setLoadPct] = useState(0)
  const { progress, bind } = useHoldScan({ duration: 0.55 })

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const media = root.current.querySelector('[data-citadel-media]')
      if (reduced) {
        bar.current.percent = 1
        setLoadPct(1)
        return
      }

      gsap.fromTo(
        media,
        { scale: 1.06 },
        {
          scale: 1.16,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 80%',
            end: 'bottom top',
            scrub: 0.5,
          },
        },
      )

      gsap.to(bar.current, {
        percent: 1,
        duration: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 72%',
          toggleActions: 'play none none reverse',
        },
        onUpdate: () => setLoadPct(bar.current.percent),
      })
    },
    { scope: root },
  )

  const shown = Math.max(loadPct, progress)

  return (
    <section id="citadel" ref={root} className="relative bg-[#111114] text-white">
      <div
        className="sticky top-0 h-svh overflow-hidden"
        role="button"
        tabIndex={0}
        aria-label={holdHint}
        aria-pressed={progress > 0.08}
        {...bind}
      >
        <img
          data-citadel-media
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />

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
              'linear-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.12) 1px, transparent 1px)',
            backgroundSize: '25% 33%',
          }}
        />
        <VantaCrosshair />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <HoldReticle progress={progress} label={holdHint} size={128} />
        </div>
        <div className="pointer-events-none absolute top-16 right-8 left-8 z-20 md:top-20 md:right-12 md:left-12">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-85">
            {index} ■ {title.toUpperCase()}
          </p>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/90 md:text-lg">{body}</p>
        </div>
        <VantaConsole
          kicker="Accessing"
          title="Citadel Mainnet"
          protocol="VANTA://CITADEL/BEAM/07"
          protocolLabel="Encryption Protocol"
          percent={shown}
        />
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import TiltPlate from './TiltPlate'
import warden from './assets/op-warden.jpg'
import lyra from './assets/op-lyra.jpg'
import rex from './assets/op-rex.jpg'
import nova from './assets/op-nova.jpg'
import op05 from './assets/faction-aegis.jpg'
import op06 from './assets/faction-raven.jpg'
import op07 from './assets/citadel-scan.jpg'
import op08 from './assets/keep-portal.jpg'

/**
 * OperatorFan — lilac deck. Two branches open from a center pair, the fan
 * expands on scrub; portraits swap once at a discrete beat (P1 + P3).
 */
export default function OperatorFan({
  kicker = '004  Roster',
  title = '10,000 unique digital collectibles.',
  body = 'Every operator is born with a kit of hand-painted assets — weapons, marks, and a path they have not chosen yet.',
  img = op05,
  img2 = op06,
  img3 = op07,
  img4 = op08,
  img5 = warden,
  img6 = lyra,
  img7 = rex,
  img8 = nova,
}) {
  const root = useRef(null)
  const deck = [
    { a: img, b: img5, tab: 'left' },
    { a: img2, b: img6, tab: 'right' },
    { a: img3, b: img5, tab: 'left' },
    { a: img, b: img7, tab: 'right' },
    { a: img4, b: img6, tab: 'left' },
    { a: img2, b: img8, tab: 'right' },
    { a: img3, b: img7, tab: 'left' },
    { a: img4, b: img8, tab: 'right' },
  ]

  useGSAP(
    () => {
      const nodes = gsap.utils.toArray('[data-fan-card]', root.current)
      const backs = gsap.utils.toArray('[data-fan-b]', root.current)
      const mid = (nodes.length - 1) / 2
      const place = (spread) => {
        nodes.forEach((node, i) => {
          const t = i - mid
          const branch = t < 0 ? -1 : 1
          gsap.set(node, {
            x: t * 92 * spread + branch * 10 * spread,
            rotate: t * 6.2 * spread,
            y: Math.abs(t) * 14 * spread,
            scale: 1 - Math.abs(t) * 0.07,
            zIndex: 20 - Math.abs(t) * 2,
            transformOrigin: '50% 110%',
          })
        })
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        place(1.05)
        gsap.set(backs, { autoAlpha: 1 })
        return
      }

      place(0.08)
      gsap.set(backs, { autoAlpha: 0 })

      const proxy = { spread: 0.08, swap: 0 }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=380%',
          pin: '[data-fan-pin]',
          scrub: 0.65,
        },
      })

      tl.to(
        proxy,
        {
          spread: 0.55,
          duration: 0.28,
          ease: 'none',
          onUpdate: () => place(proxy.spread),
        },
        0,
      )
      tl.to(
        backs,
        { autoAlpha: 1, duration: 0.08, ease: 'none' },
        0.32,
      )
      tl.to(
        proxy,
        {
          spread: 1.18,
          duration: 0.6,
          ease: 'none',
          onUpdate: () => place(proxy.spread),
        },
        0.4,
      )
    },
    { scope: root },
  )

  return (
    <section id="roster" ref={root} className="relative bg-[#c9b8e6] text-[#111114]">
      <div data-fan-pin className="relative h-svh overflow-hidden">
        <div className="absolute top-16 right-6 left-6 z-20 flex items-start justify-between gap-8 md:top-20">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-60">
              ■ {kicker}
            </p>
            <h2 className="font-anton mt-2 max-w-lg text-[clamp(1.8rem,4.5vw,3.6rem)] leading-[0.9] uppercase">
              {title}
            </h2>
          </div>
          <p className="hidden max-w-xs text-[12px] leading-relaxed md:block">{body}</p>
        </div>

        <div className="absolute inset-x-0 bottom-[6%] flex h-[66%] items-end justify-center" style={{ perspective: '1400px' }}>
          {deck.map((card, i) => (
            <div
              key={i}
              data-fan-card
              className="absolute h-full w-[min(34vw,230px)] will-change-transform"
            >
              <TiltPlate className="h-full w-full">
                <FolderFrame tab={card.tab} className="h-full w-full">
                  <article className="relative h-full w-full">
                    <img src={card.a} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <img
                      data-fan-b
                      src={card.b}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </article>
                </FolderFrame>
              </TiltPlate>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import TiltPlate from './TiltPlate'
import { VantaGrid, VantaCrosshair } from './VantaChrome'
import warden from './assets/op-warden.jpg'
import lyra from './assets/op-lyra.jpg'
import rex from './assets/op-rex.jpg'
import nova from './assets/op-nova.jpg'
import flame from './assets/op-flame.jpg'
import pink from './assets/op-pink.jpg'
import beanie from './assets/op-beanie.jpg'
import face from './assets/familiar-face.jpg'

/**
 * OperatorFan — lilac paper, hairline grid, top-tab folders.
 * Two center plates sit on top; the fan opens on scrub (reversible).
 */
export default function OperatorFan({
  kicker = '004  Roster',
  title = '10,000 unique digital collectibles.',
  body = 'Every operator is born with a kit of hand-painted assets — weapons, marks, and a path they have not chosen yet.',
  img = flame,
  img2 = pink,
  img3 = beanie,
  img4 = face,
  img5 = warden,
  img6 = lyra,
  img7 = rex,
  img8 = nova,
}) {
  const root = useRef(null)
  const deck = [
    { a: img, b: img5, tab: 'top' },
    { a: img2, b: img6, tab: 'topRight' },
    { a: img3, b: img7, tab: 'top' },
    { a: img4, b: img8, tab: 'topRight' },
    { a: img5, b: img, tab: 'top' },
    { a: img6, b: img2, tab: 'topRight' },
    { a: img7, b: img3, tab: 'top' },
    { a: img8, b: img4, tab: 'topRight' },
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
          const near = Math.abs(t) < 1.1
          gsap.set(node, {
            x: t * 108 * spread + branch * 14 * spread,
            rotate: t * 5.4 * spread,
            y: Math.abs(t) * 16 * spread - (near ? 18 * spread : 0),
            scale: near ? 1.06 - Math.abs(t) * 0.04 : 1 - Math.abs(t) * 0.08,
            zIndex: near ? 30 - Math.abs(t) : 16 - Math.abs(t) * 2,
            transformOrigin: '50% 108%',
          })
        })
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        place(1.05)
        gsap.set(backs, { autoAlpha: 1 })
        return
      }

      place(0.12)
      gsap.set(backs, { autoAlpha: 0 })

      const proxy = { spread: 0.12 }
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
          spread: 0.58,
          duration: 0.3,
          ease: 'none',
          onUpdate: () => place(proxy.spread),
        },
        0,
      )
      tl.to(backs, { autoAlpha: 1, duration: 0.08, ease: 'none' }, 0.32)
      tl.to(
        proxy,
        {
          spread: 1.22,
          duration: 0.58,
          ease: 'none',
          onUpdate: () => place(proxy.spread),
        },
        0.4,
      )
    },
    { scope: root },
  )

  return (
    <section id="roster" ref={root} className="relative bg-[#cfc3e8] text-[#111114]">
      <div data-fan-pin className="relative h-svh overflow-hidden">
        <VantaGrid color="rgb(17 17 20 / 0.14)" />
        <VantaCrosshair className="text-[#111114]" />

        <div className="absolute top-16 right-0 left-0 z-20 grid gap-6 px-6 md:top-20 md:grid-cols-[1fr_1px_1fr] md:px-12">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-55">
              ■ {kicker}
            </p>
            <h2 className="font-anton mt-3 max-w-[12ch] text-[clamp(2rem,4.6vw,3.8rem)] leading-[0.88] uppercase">
              {title}
            </h2>
          </div>
          <span aria-hidden="true" className="hidden bg-[#111114]/15 md:block" />
          <p className="hidden max-w-sm self-end text-[13px] leading-relaxed md:block">
            <span className="mb-2 block font-mono text-[10px] tracking-[0.2em] uppercase opacity-55">
              ■ Initial collection
            </span>
            {body}
          </p>
        </div>

        <div
          className="absolute inset-x-0 bottom-[5%] flex h-[62%] items-end justify-center"
          style={{ perspective: '1600px' }}
        >
          {deck.map((card, i) => (
            <div
              key={i}
              data-fan-card
              className="absolute h-full w-[min(32vw,220px)] will-change-transform"
            >
              <TiltPlate className="h-full w-full">
                <FolderFrame tab={card.tab} className="h-full w-full shadow-[0_18px_40px_rgb(17_17_20_/0.18)]">
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

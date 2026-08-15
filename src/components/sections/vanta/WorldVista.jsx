import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import TiltPlate from './TiltPlate'
import vista from './assets/world-vista.jpg'
import tower from './assets/world-tower.jpg'
import eye from './assets/eye-detail.jpg'
import portal from './assets/keep-portal.jpg'

/**
 * WorldVista — P1 pin + P2 zoom of the aerial world, collage shards drift in.
 */
export default function WorldVista({
  index = '003',
  title = 'The World',
  body = 'A circular outpost in the mist. Operators look down from the ridge and choose a path they cannot un-choose.',
  img = vista,
  img2 = tower,
  img3 = eye,
  img4 = portal,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=240%',
            pin: '[data-world-pin]',
            scrub: 0.55,
          },
        })
        tl.fromTo('[data-world-bg]', { scale: 1.08 }, { scale: 1.22, duration: 1 }, 0)
        tl.fromTo(
          '[data-world-shard]',
          { y: 80, autoAlpha: 0, rotate: -6 },
          { y: 0, autoAlpha: 1, rotate: 0, stagger: 0.12, duration: 0.35 },
          0.25,
        )
        tl.fromTo('[data-world-copy]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.2)
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section id="world" ref={root} className="relative bg-[#140f1c] text-white">
      <div data-world-pin className="relative h-svh overflow-hidden">
        <img
          data-world-bg
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
        <div className="pointer-events-none absolute inset-5 rounded-[1.4rem] border border-white/30 md:inset-7" />

        <TiltPlate className="absolute top-[18%] left-[8%] z-10 hidden h-[28%] w-[18%] md:block">
          <FolderFrame tab="left" className="h-full w-full">
            <img data-world-shard src={img2} alt="" className="h-full w-full object-cover" />
          </FolderFrame>
        </TiltPlate>
        <TiltPlate className="absolute top-[22%] right-[10%] z-10 hidden h-[34%] w-[16%] md:block">
          <FolderFrame tab="right" className="h-full w-full">
            <img data-world-shard src={img3} alt="" className="h-full w-full object-cover" />
          </FolderFrame>
        </TiltPlate>
        <TiltPlate className="absolute bottom-[16%] left-[36%] z-10 hidden h-[24%] w-[22%] md:block">
          <FolderFrame tab="left" className="h-full w-full">
            <img data-world-shard src={img4} alt="" className="h-full w-full object-cover" />
          </FolderFrame>
        </TiltPlate>

        <div data-world-copy className="pointer-events-none absolute right-8 bottom-10 left-8 z-20 md:right-14 md:left-14">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-80">
            {index} ■ {title.toUpperCase()}
          </p>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed md:text-lg">{body}</p>
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import TiltPlate from './TiltPlate'
import { VantaStage, VantaCrosshair } from './VantaChrome'
import vista from './assets/world-paint.jpg'
import tower from './assets/world-tower.jpg'
import eye from './assets/eye-detail.jpg'
import portal from './assets/keep-portal.jpg'

/**
 * WorldVista — aerial painting in a custom viewport. Zoom + shards are scrub.
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
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=240%',
          pin: '[data-world-pin]',
          scrub: 0.55,
        },
      })
      tl.fromTo('[data-world-bg]', { scale: 1.08 }, { scale: 1.24, duration: 1, ease: 'none' }, 0)
      tl.fromTo(
        '[data-world-shard]',
        { y: 70, autoAlpha: 0, rotate: -8 },
        { y: 0, autoAlpha: 1, rotate: 0, stagger: 0.1, duration: 0.32, ease: 'none' },
        0.22,
      )
      tl.fromTo('[data-world-copy]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'none' }, 0.18)
    },
    { scope: root },
  )

  return (
    <section id="world" ref={root} className="relative bg-[#f4f1ea] text-white">
      <div data-world-pin className="relative h-svh overflow-hidden px-3 py-3 md:px-4 md:py-4">
        <VantaStage className="absolute inset-3 md:inset-4">
          <img
            data-world-bg
            src={img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
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

          <TiltPlate className="absolute top-[18%] left-[7%] z-10 hidden h-[26%] w-[16%] md:block">
            <div data-world-shard className="h-full w-full">
              <FolderFrame tab="notch" className="h-full w-full">
                <img src={img2} alt="" className="h-full w-full object-cover" />
              </FolderFrame>
            </div>
          </TiltPlate>
          <TiltPlate className="absolute right-[9%] bottom-[22%] z-10 hidden h-[22%] w-[18%] md:block">
            <div data-world-shard className="h-full w-full">
              <FolderFrame tab="topRight" className="h-full w-full">
                <img src={img3} alt="" className="h-full w-full object-cover" />
              </FolderFrame>
            </div>
          </TiltPlate>
          <TiltPlate className="absolute bottom-[18%] left-[10%] z-10 hidden h-[18%] w-[14%] md:block">
            <div data-world-shard className="h-full w-full">
              <FolderFrame tab="left" className="h-full w-full">
                <img src={img4} alt="" className="h-full w-full object-cover" />
              </FolderFrame>
            </div>
          </TiltPlate>

          <div
            data-world-copy
            className="pointer-events-none absolute right-8 bottom-12 left-8 z-20 text-center md:bottom-14"
          >
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-85">
              {index} ■ {title.toUpperCase()}
            </p>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed md:text-lg">{body}</p>
          </div>
        </VantaStage>
      </div>
    </section>
  )
}

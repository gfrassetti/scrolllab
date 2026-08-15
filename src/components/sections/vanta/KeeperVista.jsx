import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import heroFace from './assets/hero-face.jpg'
import keepersPair from './assets/op-cutout.png'
import vistaRidge from './assets/world-vista.jpg'

/**
 * KeeperVista — the folder card comes forward, flips into a parallax tableau,
 * then closes again as a rotating card (P1 + P2 + rotateY).
 */
export default function KeeperVista({
  line = 'You are an operator: an agent of power and change in this world.',
  power = 'What will you do with this power? Will you choose to protect or destroy? To give or to take?',
  index = '003',
  img = heroFace,
  img2 = keepersPair,
  img3 = vistaRidge,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const stage = root.current.querySelector('[data-keep-stage]')
      const front = root.current.querySelector('[data-keep-front]')
      const vista = root.current.querySelector('[data-keep-vista]')
      const bg = root.current.querySelector('[data-keep-bg]')
      const pair = root.current.querySelector('[data-keep-pair]')
      const typeA = root.current.querySelector('[data-keep-line]')
      const typeB = root.current.querySelector('[data-keep-power]')
      const grid = root.current.querySelector('[data-keep-grid]')

      gsap.set(stage, { transformPerspective: 1600 })
      gsap.set(vista, { autoAlpha: 0, rotateY: 78, scale: 0.52, borderRadius: 28 })
      gsap.set(bg, { scale: 1.18 })
      gsap.set(pair, { yPercent: 10, scale: 1.04 })
      gsap.set(typeB, { autoAlpha: 0 })
      gsap.set(grid, { autoAlpha: 0 })

      if (reduced) {
        gsap.set(front, { autoAlpha: 0 })
        gsap.set(vista, { autoAlpha: 1, rotateY: 0, scale: 1, borderRadius: 0 })
        gsap.set([typeA, typeB, grid], { autoAlpha: 1 })
        gsap.set([bg, pair], { yPercent: 0, scale: 1 })
        return
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=320%',
          pin: '[data-keep-pin]',
          scrub: 0.6,
        },
      })

      tl.to(front, { z: 90, scale: 1.12, duration: 0.12, ease: 'none' }, 0)
      tl.to(front, { rotateY: -88, autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.12)
      tl.to(vista, { autoAlpha: 1, rotateY: 0, scale: 1, borderRadius: 0, duration: 0.14, ease: 'none' }, 0.16)
      tl.to(typeA, { autoAlpha: 0, y: -16, duration: 0.08, ease: 'none' }, 0.2)
      tl.to(typeB, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0.26)
      tl.to(grid, { autoAlpha: 1, duration: 0.08, ease: 'none' }, 0.24)
      tl.to(bg, { scale: 1.34, yPercent: -6, duration: 0.42, ease: 'none' }, 0.22)
      tl.to(pair, { yPercent: -8, scale: 1, duration: 0.42, ease: 'none' }, 0.22)
      tl.to(typeB, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.68)
      tl.to(grid, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.7)
      tl.to(
        vista,
        { rotateY: 62, scale: 0.4, borderRadius: 32, y: 24, duration: 0.2, ease: 'none' },
        0.74,
      )
      tl.to(vista, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.92)
    },
    { scope: root },
  )

  return (
    <section id="power" ref={root} className="relative bg-[#f4f1ea] text-white">
      <div data-keep-pin className="relative h-svh overflow-hidden">
        <div data-keep-stage className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <article
            data-keep-front
            className="absolute top-[14%] left-1/2 z-20 h-[72%] w-[min(42vw,380px)] -translate-x-1/2 overflow-hidden rounded-[1.6rem] will-change-transform"
            style={{ transformOrigin: '50% 50%' }}
          >
            <img src={img} alt="" className="h-full w-full object-cover object-[center_18%]" />
          </article>

          <div
            data-keep-vista
            className="absolute inset-0 z-10 overflow-hidden will-change-transform"
            style={{ transformOrigin: '50% 50%' }}
          >
            <img
              data-keep-bg
              src={img3}
              alt=""
              className="absolute inset-[-8%] h-[116%] w-[116%] object-cover"
            />
            <img
              data-keep-pair
              src={img2}
              alt=""
              className="absolute bottom-[-4%] left-1/2 h-[78%] w-auto max-w-[90%] -translate-x-1/2 object-contain"
            />
            <div
              data-keep-grid
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(rgb(255 255 255 / 0.18) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.18) 1px, transparent 1px)',
                backgroundSize: '12% 12%',
              }}
            />
            <p className="absolute top-[18%] left-[8%] z-10 font-mono text-[10px] tracking-[0.22em] uppercase">
              ■ {index}
            </p>
            <p
              data-keep-power
              className="font-anton pointer-events-none absolute top-[22%] right-[6%] z-10 max-w-[14ch] text-right text-[clamp(1.6rem,4.2vw,3.4rem)] leading-[0.88] tracking-[-0.03em] uppercase"
            >
              {power}
            </p>
          </div>
        </div>

        <p
          data-keep-line
          className="font-anton pointer-events-none absolute top-[18%] left-[6%] z-30 max-w-[12ch] text-[clamp(1.8rem,4.5vw,3.6rem)] leading-[0.9] tracking-[-0.03em] text-[#111114]/40 uppercase"
        >
          {line}
        </p>
      </div>
    </section>
  )
}

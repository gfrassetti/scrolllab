import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import TiltPlate from './TiltPlate'
import { VantaGrid, VantaCrosshair } from './VantaChrome'
import familiarWide from './assets/familiar-wide.jpg'
import familiarFace from './assets/familiar-face.jpg'
import familiarTall from './assets/familiar-tall.jpg'
import vistaPaint from './assets/vista-paint.jpg'

/**
 * KeeperVista — cream paper: three notched plates, then the painting
 * swallows the viewport and holds with a mesh cage. All scrub, reversible.
 */
export default function KeeperVista({
  worldLine = 'A familiar world… set on a different path.',
  line = 'You are an operator: an agent of power and change in this world.',
  power = 'What will you do with this power? Will you choose to protect or destroy? To give or to take?',
  index = '001',
  img = familiarWide,
  img2 = familiarFace,
  img3 = familiarTall,
  img4 = vistaPaint,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const plates = gsap.utils.toArray('[data-keep-plate]', root.current)
      const vista = root.current.querySelector('[data-keep-vista]')
      const bg = root.current.querySelector('[data-keep-bg]')
      const world = root.current.querySelector('[data-keep-world]')
      const lineEl = root.current.querySelector('[data-keep-line]')
      const powerEl = root.current.querySelector('[data-keep-power]')
      const mesh = root.current.querySelector('[data-keep-mesh]')
      const gridW = root.current.querySelector('[data-keep-hud]')

      gsap.set(vista, { autoAlpha: 0, scale: 0.42, borderRadius: 36 })
      gsap.set(bg, { scale: 1.12 })
      gsap.set([lineEl, powerEl, mesh, gridW], { autoAlpha: 0 })
      gsap.set(plates[0], { xPercent: -8, yPercent: -4, rotate: -4 })
      gsap.set(plates[1], { yPercent: 10, rotate: 3 })
      gsap.set(plates[2], { xPercent: 8, rotate: 5 })

      if (reduced) {
        gsap.set(plates, { autoAlpha: 0 })
        gsap.set(world, { autoAlpha: 0 })
        gsap.set(vista, { autoAlpha: 1, scale: 1, borderRadius: 0 })
        gsap.set([lineEl, powerEl], { autoAlpha: 1 })
        return
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=100%',
          pin: '[data-keep-pin]',
          pinSpacing: false,
          scrub: 0.65,
        },
      })

      tl.to(plates[0], { xPercent: 0, yPercent: 0, rotate: -2, duration: 0.12, ease: 'none' }, 0)
      tl.to(plates[1], { yPercent: 0, rotate: 1, duration: 0.12, ease: 'none' }, 0)
      tl.to(plates[2], { xPercent: 0, rotate: 2, duration: 0.12, ease: 'none' }, 0)

      tl.to(plates[0], { xPercent: -28, yPercent: -18, scale: 0.72, duration: 0.16, ease: 'none' }, 0.18)
      tl.to(plates[1], { yPercent: 28, scale: 0.7, duration: 0.16, ease: 'none' }, 0.18)
      tl.to(
        plates[2],
        { xPercent: 6, yPercent: -8, scale: 1.35, autoAlpha: 0, duration: 0.16, ease: 'none' },
        0.18,
      )
      tl.to(world, { autoAlpha: 0, y: -24, duration: 0.12, ease: 'none' }, 0.2)
      tl.to(
        vista,
        { autoAlpha: 1, scale: 1, borderRadius: 0, duration: 0.2, ease: 'none' },
        0.22,
      )
      tl.to(lineEl, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0.32)
      tl.to(gridW, { autoAlpha: 1, duration: 0.08, ease: 'none' }, 0.34)
      tl.to(bg, { scale: 1.28, yPercent: -5, duration: 0.28, ease: 'none' }, 0.34)
      tl.to(lineEl, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.52)
      tl.to(powerEl, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0.54)
      tl.to(mesh, { autoAlpha: 1, duration: 0.12, ease: 'none' }, 0.62)
      tl.to(mesh, { autoAlpha: 0.35, duration: 0.12, ease: 'none' }, 0.88)
    },
    { scope: root },
  )

  return (
    <section id="power" ref={root} className="relative bg-[#f4f1ea] text-[#111114]">
      <div data-keep-pin className="relative h-svh overflow-hidden">
        <VantaGrid />
        <VantaCrosshair className="text-[#111114]" />

        <p
          data-keep-world
          className="font-anton pointer-events-none absolute top-[16%] left-[6%] z-20 max-w-[11ch] text-[clamp(2.2rem,5.4vw,4.6rem)] leading-[0.88] tracking-[-0.04em] uppercase"
        >
          <span className="mb-3 block font-mono text-[10px] tracking-[0.22em] opacity-50">
            ■ {index}
          </span>
          {worldLine}
        </p>

        <TiltPlate className="absolute top-[28%] left-[7%] z-10 hidden h-[22%] w-[28%] md:block">
          <div data-keep-plate className="h-full w-full">
            <FolderFrame tab="notch" className="h-full w-full shadow-[0_18px_50px_rgb(17_17_20_/0.18)]">
              <img src={img} alt="" className="h-full w-full object-cover" />
            </FolderFrame>
          </div>
        </TiltPlate>

        <TiltPlate className="absolute bottom-[8%] left-[22%] z-10 h-[38%] w-[26%] md:left-[28%] md:w-[22%]">
          <div data-keep-plate className="h-full w-full">
            <FolderFrame tab="left" className="h-full w-full shadow-[0_22px_60px_rgb(17_17_20_/0.2)]">
              <img src={img2} alt="" className="h-full w-full object-cover object-[center_18%]" />
            </FolderFrame>
          </div>
        </TiltPlate>

        <TiltPlate className="absolute top-[14%] right-[6%] z-10 h-[72%] w-[min(38vw,420px)]">
          <div data-keep-plate className="h-full w-full">
            <FolderFrame tab="right" className="h-full w-full shadow-[0_28px_70px_rgb(17_17_20_/0.22)]">
              <img src={img3} alt="" className="h-full w-full object-cover object-[center_20%]" />
            </FolderFrame>
          </div>
        </TiltPlate>

        <div
          data-keep-vista
          className="vanta-stage-tr absolute inset-[4%] z-20 overflow-hidden will-change-transform md:inset-[3.5%]"
          style={{ transformOrigin: '72% 50%' }}
        >
          <img
            data-keep-bg
            src={img4}
            alt=""
            className="absolute inset-[-8%] h-[116%] w-[116%] object-cover"
          />
          <div
            data-keep-hud
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgb(255 255 255 / 0.22) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.22) 1px, transparent 1px)',
              backgroundSize: '25% 33%',
            }}
          />
          <div data-keep-mesh className="vanta-mesh pointer-events-none absolute inset-0" />
          <p
            data-keep-line
            className="font-anton pointer-events-none absolute top-[22%] left-[6%] z-10 max-w-[14ch] text-[clamp(1.6rem,4vw,3.4rem)] leading-[0.9] tracking-[-0.03em] text-white uppercase mix-blend-overlay"
          >
            {line}
          </p>
          <p
            data-keep-power
            className="font-anton pointer-events-none absolute top-[28%] right-[6%] z-10 max-w-[16ch] text-right text-[clamp(1.5rem,3.6vw,3rem)] leading-[0.9] tracking-[-0.03em] text-white uppercase"
          >
            {power}
          </p>
        </div>
      </div>
    </section>
  )
}

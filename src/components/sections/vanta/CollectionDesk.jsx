import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import TiltPlate from './TiltPlate'
import { VantaGrid, VantaCrosshair } from './VantaChrome'
import dossier from './assets/dossier-portrait.jpg'
import crystal from './assets/vanta-crystal.png'
import eye from './assets/eye-detail.jpg'

/**
 * CollectionDesk — white dossier, not a product row: giant vertical mark,
 * one folder specimen, crystal on a ruler, windows to the soul.
 */
export default function CollectionDesk({
  kicker = 'Initial collection',
  mark = '10K',
  title = '10,000 unique digital collectibles.',
  crystalLabel = 'Pulse crystal',
  eyeLabel = 'Windows to the soul',
  img = dossier,
  img2 = crystal,
  img3 = eye,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        '[data-desk-card]',
        { y: 48 },
        {
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 82%',
            end: 'top 38%',
            scrub: 0.5,
          },
        },
      )
    },
    { scope: root },
  )

  return (
    <section id="collection" ref={root} className="relative bg-[#f4f1ea] text-[#111114]">
      <div className="relative min-h-svh overflow-hidden">
        <VantaGrid />
        <VantaCrosshair className="text-[#111114]" />

        <div className="relative z-10 grid min-h-svh items-stretch md:grid-cols-[7.5rem_minmax(0,1fr)_minmax(16rem,22rem)]">
          <div className="hidden items-end border-r border-[#111114]/10 px-3 py-16 md:flex">
            <p
              data-desk-in
              className="font-anton origin-bottom-left text-[clamp(4.5rem,9vw,8rem)] leading-[0.78] tracking-[-0.06em]"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {mark}
            </p>
          </div>

          <div className="flex flex-col justify-between px-5 py-20 md:px-10 md:py-16">
            <div data-desk-in>
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-50">
                ▶▶ {kicker}
              </p>
              <h2 className="font-anton mt-4 max-w-[12ch] text-[clamp(1.8rem,3.4vw,3rem)] leading-[0.9] uppercase md:hidden">
                {title}
              </h2>
            </div>

            <div data-desk-card className="mx-auto w-full max-w-[420px] py-8" style={{ perspective: '1200px' }}>
              <TiltPlate className="h-[min(68vh,620px)] w-full">
                <FolderFrame tab="top" className="h-full w-full shadow-[0_32px_80px_rgb(17_17_20_/0.22)]">
                  <img src={img} alt="" className="h-full w-full object-cover object-[center_18%]" />
                </FolderFrame>
              </TiltPlate>
            </div>
          </div>

          <div className="grid content-center gap-0 border-t border-[#111114]/10 md:border-t-0 md:border-l">
            <figure data-desk-in className="relative px-6 py-8 md:px-7">
              <p className="mb-5 font-mono text-[10px] tracking-[0.2em] uppercase opacity-50">
                ■ {crystalLabel}
              </p>
              <div className="grid place-items-center py-6" style={{ perspective: 800 }}>
                <img
                  src={img2}
                  alt=""
                  className="vanta-crystal h-44 w-auto object-contain mix-blend-multiply md:h-52"
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-10 right-5 w-9 opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, #111 0 1px, transparent 1px 7px)',
                }}
              />
            </figure>
            <figure data-desk-in className="relative overflow-hidden border-t border-[#111114]/10">
              <img src={img3} alt="" className="aspect-[16/11] w-full object-cover" />
              <p className="absolute bottom-3 left-3 font-mono text-[10px] tracking-[0.2em] text-white uppercase">
                ■ {eyeLabel}
              </p>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}

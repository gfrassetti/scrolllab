import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import FolderFrame from './FolderFrame'
import collectCard from './assets/op-lyra.jpg'
import eye from './assets/eye-detail.jpg'

/**
 * CollectionDesk — white ledger: 10K type, 3D hover plate on Z, spinning
 * crystal, Windows to the Soul. Hands off into the lilac fan.
 */
export default function CollectionDesk({
  kicker = 'Initial collection',
  mark = '10K',
  title = '10,000 unique digital collectibles.',
  crystalLabel = 'Pulse crystal',
  eyeLabel = 'Windows to the soul',
  img = collectCard,
  img3 = eye,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const card = root.current.querySelector('[data-desk-card]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!card) return

      gsap.set(card, { transformPerspective: 1200, transformOrigin: '50% 50%', z: 36 })

      if (reduced) return undefined
      if (window.matchMedia('(pointer: coarse)').matches) return undefined

      const mouse = { x: 0, y: 0 }
      const apply = () => {
        gsap.set(card, {
          rotateY: mouse.x * 14,
          rotateX: mouse.y * -10,
          z: 36 + Math.abs(mouse.x) * 28,
        })
      }
      const onMove = (event) => {
        const box = card.getBoundingClientRect()
        mouse.x = ((event.clientX - box.left) / box.width - 0.5) * 2
        mouse.y = ((event.clientY - box.top) / box.height - 0.5) * 2
        apply()
      }
      const onLeave = () => {
        gsap.to(mouse, {
          x: 0,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
          onUpdate: apply,
        })
      }
      card.addEventListener('pointermove', onMove)
      card.addEventListener('pointerleave', onLeave)
      return () => {
        card.removeEventListener('pointermove', onMove)
        card.removeEventListener('pointerleave', onLeave)
      }
    },
    { scope: root },
  )

  return (
    <section id="collection" ref={root} className="relative bg-[#f4f1ea] text-[#111114]">
      <div className="mx-auto grid min-h-svh max-w-[1400px] items-center gap-8 px-5 py-24 md:grid-cols-[0.7fr_1fr_0.85fr] md:px-10">
        <div>
          <div className="flex items-start gap-3">
            <p className="font-anton text-[clamp(4.5rem,14vw,9rem)] leading-[0.75] tracking-[-0.05em]">
              {mark}
            </p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase opacity-55">
              ▶▶ {kicker}
            </p>
          </div>
          <h2 className="font-anton mt-6 max-w-[12ch] text-[clamp(1.4rem,3vw,2.2rem)] leading-[0.9] uppercase opacity-80">
            {title}
          </h2>
        </div>

        <div className="flex justify-center" style={{ perspective: '1200px' }}>
          <div
            data-desk-card
            className="h-[min(72vh,640px)] w-[min(78%,380px)] will-change-transform"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <FolderFrame tab="left" className="h-full w-full shadow-[0_28px_80px_rgb(17_17_20_/0.28)]">
              <img src={img} alt="" className="h-full w-full object-cover" />
            </FolderFrame>
          </div>
        </div>

        <div className="grid gap-6">
          <figure className="relative overflow-hidden rounded-[1.25rem] bg-[#ece8e0] px-6 py-8">
            <p className="mb-4 font-mono text-[10px] tracking-[0.2em] uppercase opacity-55">
              ● {crystalLabel}
            </p>
            <div className="grid place-items-center py-4" style={{ perspective: '800px' }}>
              <div
                className="vanta-crystal relative h-40 w-24 md:h-52 md:w-28"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-0 bg-gradient-to-br from-[#f3e8ff] via-[#7c3aed] to-[#1e1b4b]"
                  style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                />
                <span
                  className="absolute inset-[12%] bg-gradient-to-l from-white/50 to-transparent"
                  style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                />
              </div>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-10 right-4 w-10 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, #111 0 1px, transparent 1px 8px)',
              }}
            />
          </figure>

          <figure className="relative overflow-hidden rounded-[1.25rem]">
            <img src={img3} alt="" className="aspect-[16/10] w-full object-cover" />
            <p className="absolute bottom-3 left-3 font-mono text-[10px] tracking-[0.2em] text-white uppercase">
              ● {eyeLabel}
            </p>
          </figure>
        </div>
      </div>
    </section>
  )
}

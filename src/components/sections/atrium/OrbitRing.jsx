import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import orbitDesk from './assets/orbit-desk.jpg'
import orbitModel from './assets/orbit-model.jpg'
import orbitHands from './assets/orbit-hands.jpg'
import orbitScreens from './assets/orbit-screens.jpg'
import orbitMaterials from './assets/orbit-materials.jpg'
import orbitMeeting from './assets/orbit-meeting.jpg'
import orbitSite from './assets/orbit-site.jpg'
import orbitBoard from './assets/orbit-board.jpg'
import orbitFacade from './assets/orbit-facade.jpg'
import orbitCivic from './assets/orbit-civic.jpg'
import gallery from './assets/gallery.jpg'
import model from './assets/model.jpg'

const defaultTiles = [
  orbitDesk,
  orbitModel,
  orbitHands,
  orbitScreens,
  orbitMaterials,
  orbitMeeting,
  orbitSite,
  orbitBoard,
  orbitFacade,
  orbitCivic,
  gallery,
  model,
]

const defaultScenes = [
  {
    lineOne: '2014 Year',
    lineTwo: 'of practice',
    left: 'Design approach grounded in passive strategies, material logic, and environmental responsibility.',
    right: 'Lifecycle-focused architecture with efficient systems, sustainable choices, and long-term value.',
  },
  {
    lineOne: '36+ People',
    lineTwo: 'in the studio',
    left: 'Architects, model makers, and site leads share one drawing set from the first massing.',
    right: 'The team stays small enough that every room still has an author.',
  },
  {
    lineOne: '82 Works',
    lineTwo: 'on the ledger',
    left: 'Houses, halls, and civic rooms. Placeholder counts for the buyer to replace.',
    right: 'Each job keeps the same discipline: volume first, then the joint.',
  },
  {
    lineOne: '40k Metres',
    lineTwo: 'drawn to date',
    left: 'Sample figure. Swap it for the metres your practice has actually built.',
    right: 'The number is a measure, not a promise.',
  },
]

/**
 * OrbitRing — photographs sit on a circular rail, each rotated to the
 * tangent. The ring turns on scrub (P1); centre copy and foot columns cycle.
 */
export default function OrbitRing({
  tiles = defaultTiles,
  scenes = defaultScenes,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const ring = root.current.querySelector('[data-orbit-ring]')
      const sceneEls = gsap.utils.toArray('[data-orbit-scene]')
      const n = sceneEls.length

      const show = (index) => {
        sceneEls.forEach((el, i) => {
          const on = i === index
          gsap.to(el, {
            autoAlpha: on ? 1 : 0,
            duration: 0.45,
            ease: 'power2.out',
            overwrite: true,
          })
        })
      }

      gsap.set(sceneEls, { autoAlpha: 0 })
      gsap.set(sceneEls[0], { autoAlpha: 1 })

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: '[data-orbit-pin]',
        scrub: 0.35,
        anticipatePin: 1,
        onUpdate: (self) => {
          if (!ring) return
          gsap.set(ring, { rotate: self.progress * 360 })
          const index = Math.min(n - 1, Math.floor(self.progress * n + 0.001))
          if (ring.dataset.active !== String(index)) {
            ring.dataset.active = String(index)
            show(index)
          }
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="practice"
      className="relative h-[420svh] bg-atrium-ink text-atrium-paper"
    >
      <div
        data-orbit-pin
        className="relative h-svh overflow-hidden"
      >
        <div
          data-orbit-ring
          data-active="0"
          className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-0 w-0 will-change-transform"
        >
          {tiles.map((src, i) => {
            const angle = (360 / tiles.length) * i
            return (
              <div
                key={`${src}-${i}`}
                className="absolute top-0 left-0 h-[5.6rem] w-[8rem] md:h-[7.8rem] md:w-[11.2rem] lg:h-[9.2rem] lg:w-[13.2rem]"
                style={{
                  transform: `rotate(${angle}deg) translateY(-41vmin) translateX(-50%)`,
                }}
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full max-w-none object-cover"
                />
              </div>
            )
          })}
        </div>

        <div className="relative z-10 flex h-full flex-col">
          {scenes.map((scene, i) => (
            <div
              key={scene.lineOne}
              data-orbit-scene
              className="absolute inset-0 flex flex-col"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <div className="flex flex-1 items-center justify-center px-5 text-center">
                <h2 className="font-grotesk text-[clamp(2.6rem,8.4vw,6.8rem)] font-medium leading-[0.9] tracking-[-0.055em]">
                  <span className="block">{scene.lineOne}</span>
                  <span className="block">{scene.lineTwo}</span>
                </h2>
              </div>
              <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 px-5 pb-10 text-[12px] leading-relaxed text-atrium-paper/50 md:grid-cols-2 md:gap-16 md:px-10 md:pb-14 md:text-[13px]">
                <p className="md:max-w-[28ch]">{scene.left}</p>
                <p className="md:max-w-[28ch] md:justify-self-end md:text-right">{scene.right}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

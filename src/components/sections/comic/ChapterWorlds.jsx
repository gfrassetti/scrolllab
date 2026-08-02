import { useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import PaperFrame from './PaperFrame'
import { usePinnedScrub } from './usePinnedScrub'
import heroRoad from './assets/hero-road.png'
import closedYards from './assets/closed-yards.png'

const DEFAULT_FACTS = [
  {
    id: 'lab',
    title: 'Card title 1',
    blurb: 'Card body 1 — replace with your copy.',
    concern: 'Note 1 — replace with sourced text.',
  },
  {
    id: 'yard',
    title: 'Card title 2',
    blurb: 'Card body 2 — replace with your copy.',
    concern: 'Note 2 — replace with sourced text.',
  },
]

/**
 * ChapterWorlds — pinned collide reel (stage absolutos = nunca colapsa a vacío).
 */
export default function ChapterWorlds({
  label = 'Chapter 4',
  headline = 'Headline 1',
  facts = DEFAULT_FACTS,
  sceneOpen = 'Scene 1',
  sceneClosed = 'Scene 2',
  hotspotOpen = 'Hotspot 1',
  hotspotClosed = 'Hotspot 2',
}) {
  const root = useRef(null)
  const [openId, setOpenId] = useState(null)

  usePinnedScrub(root, {
    scrub: 0.4,
    build: ({ root: el, tl }) => {
      const head = el.querySelector('[data-worlds-head]')
      const stage = el.querySelector('[data-stage-worlds]')
      const openWorld = el.querySelector('[data-world="open"]')
      const closedWorld = el.querySelector('[data-world="closed"]')
      const openImg = el.querySelector('[data-world-img="open"]')
      const closedImg = el.querySelector('[data-world-img="closed"]')
      const crack = el.querySelector('[data-crack]')
      const hotspots = gsap.utils.toArray(el.querySelectorAll('[data-hotspot]'))
      const cards = gsap.utils.toArray(el.querySelectorAll('[data-fact]'))
      const pulse = gsap.utils.toArray(el.querySelectorAll('[data-pulse]'))

      // Entrada suave — siempre algo visible (nunca ±55% fuera del overflow)
      gsap.set(openWorld, { xPercent: -18, rotate: -2, opacity: 0.55 })
      gsap.set(closedWorld, { xPercent: 18, rotate: 2, opacity: 0.55 })
      gsap.set(hotspots, { scale: 0.5, opacity: 0 })
      gsap.set(cards, { y: 48, opacity: 0 })
      gsap.set(crack, { scaleY: 0, opacity: 0 })
      gsap.set(pulse, { scale: 0.7, opacity: 0 })
      gsap.set(stage, { opacity: 1 })

      tl.fromTo(
        head,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 1 },
        0,
      )

      tl.to(
        openWorld,
        { xPercent: 0, rotate: -0.6, opacity: 1, duration: 2.2 },
        0.6,
      )
      tl.to(
        closedWorld,
        { xPercent: 0, rotate: 0.6, opacity: 1, duration: 2.2 },
        0.6,
      )
      tl.fromTo(
        openImg,
        { scale: 1.14, xPercent: -4 },
        { scale: 1.04, xPercent: 0, duration: 2.2 },
        0.6,
      )
      tl.fromTo(
        closedImg,
        { scale: 1.14, xPercent: 4 },
        { scale: 1.04, xPercent: 0, duration: 2.2 },
        0.6,
      )
      tl.to(crack, { scaleY: 1, opacity: 1, duration: 1.2 }, 2)

      tl.to(hotspots, { scale: 1, opacity: 1, stagger: 0.18, duration: 0.8 }, 2.8)
      tl.to(pulse, { scale: 1.7, opacity: 0, stagger: 0.18, duration: 1.2 }, 3)
      tl.to(pulse, { scale: 0.85, opacity: 0.5, duration: 0.01 }, 4.2)
      tl.to(pulse, { scale: 1.9, opacity: 0, stagger: 0.12, duration: 1.3 }, 4.25)

      tl.to(openImg, { scale: 1.1, xPercent: 2, duration: 2.2 }, 3.8)
      tl.to(closedImg, { scale: 1.1, xPercent: -2, duration: 2.2 }, 3.8)
      tl.to(head, { opacity: 0.4, y: -8, duration: 1 }, 4)

      // Cards suben SIN empujar los mundos fuera del viewport
      tl.to(cards, { y: 0, opacity: 1, stagger: 0.2, duration: 1.2 }, 5.2)
      tl.to(stage, { yPercent: -6, scale: 0.94, duration: 1.4 }, 5.2)
    },
  })

  return (
    <section
      id="chapter-worlds"
      ref={root}
      className="relative h-[620vh] bg-[#1a1512] text-white"
    >
      <div data-pin className="relative h-svh overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(232,90,36,0.16), transparent 55%), #1a1512',
          }}
        />

        {/* Headline */}
        <div
          data-worlds-head
          className="absolute inset-x-0 top-[4.5rem] z-30 px-4 text-center md:top-20"
        >
          <p className="mb-2 text-[11px] tracking-[0.28em] text-comic-flare uppercase">
            {label}
          </p>
          <h2 className="mx-auto max-w-3xl font-brico text-[clamp(1.7rem,4vw,3rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
            {headline}
          </h2>
        </div>

        {/* Stage — altura fija, nunca colapsa */}
        <div
          data-stage-worlds
          className="absolute top-[28%] left-1/2 z-20 grid w-[min(100%-2rem,72rem)] -translate-x-1/2 gap-4 md:grid-cols-2 md:gap-6"
        >
          <span
            data-crack
            aria-hidden="true"
            className="absolute top-[6%] bottom-[6%] left-1/2 z-20 hidden w-px origin-top bg-comic-flare md:block"
          />

          <div data-world="open" className="relative will-change-transform">
            <PaperFrame className="!w-full" shadow>
              <div className="relative h-[min(32vh,240px)] overflow-hidden sm:h-[min(36vh,280px)] md:h-[min(38vh,320px)]">
                <img
                  data-world-img="open"
                  src={heroRoad}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
                <p className="absolute top-3 left-3 text-[10px] tracking-[0.25em] text-white/85 uppercase">
                  {sceneOpen}
                </p>
                <span
                  data-pulse
                  aria-hidden="true"
                  className="absolute top-[48%] left-[32%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-comic-flare/80"
                />
                <button
                  type="button"
                  data-hotspot
                  onClick={() => setOpenId(openId === 'lab' ? null : 'lab')}
                  className="absolute top-[48%] left-[32%] z-10 max-w-[9.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-comic-flare px-2.5 py-2 text-left text-[9px] font-semibold tracking-[0.06em] text-white uppercase shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:max-w-none sm:px-3 sm:text-[10px]"
                >
                  {hotspotOpen}
                </button>
              </div>
            </PaperFrame>
          </div>

          <div data-world="closed" className="relative will-change-transform">
            <PaperFrame className="!w-full" shadow>
              <div className="relative h-[min(32vh,240px)] overflow-hidden sm:h-[min(36vh,280px)] md:h-[min(38vh,320px)]">
                <img
                  data-world-img="closed"
                  src={closedYards}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
                <p className="absolute top-3 left-3 text-[10px] tracking-[0.25em] text-white/85 uppercase">
                  {sceneClosed}
                </p>
                <span
                  data-pulse
                  aria-hidden="true"
                  className="absolute top-[44%] right-[20%] h-14 w-14 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-comic-flare/80"
                />
                <button
                  type="button"
                  data-hotspot
                  onClick={() => setOpenId(openId === 'yard' ? null : 'yard')}
                  className="absolute top-[44%] right-[20%] z-10 max-w-[9.5rem] translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-comic-flare px-2.5 py-2 text-left text-[9px] font-semibold tracking-[0.06em] text-white uppercase shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:max-w-none sm:px-3 sm:text-[10px]"
                >
                  {hotspotClosed}
                </button>
              </div>
            </PaperFrame>
          </div>
        </div>

        {/* Fact cards — ancladas abajo del pin, no pelean el layout del stage */}
        <div className="absolute bottom-6 left-1/2 z-30 grid w-[min(100%-2rem,72rem)] -translate-x-1/2 gap-3 md:grid-cols-2 md:gap-4">
          {facts.map((fact) => {
            const active = openId === fact.id
            return (
              <article
                key={fact.id}
                data-fact
                className={`border border-white/15 bg-[#f7f4ee] p-4 text-[#2a2622] transition-shadow duration-300 md:p-5 ${
                  active
                    ? 'ring-2 ring-comic-flare shadow-[0_12px_40px_rgba(232,90,36,0.25)]'
                    : ''
                }`}
              >
                <h3 className="mb-1 font-brico text-lg font-bold tracking-[-0.02em] md:text-xl">
                  {fact.title}
                </h3>
                <p className="mb-2 text-xs leading-relaxed text-[#2a2622]/75 md:text-sm">
                  {fact.blurb}
                </p>
                  <p className="text-xs leading-relaxed md:text-sm">
                    {fact.concern}
                  </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

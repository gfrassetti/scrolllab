import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import PaperFrame from './PaperFrame'
import closeupBuddies from './assets/closeup-buddies.png'
import heroRoad from './assets/hero-road.png'
import driveSunset from './assets/drive-sunset.png'

/**
 * ChapterBond — pinned comic pages that tear over each other.
 */
export default function ChapterBond({
  label = 'Chapter 2',
  lead = 'Lead 1 — replace with chapter intro.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const pin = root.current.querySelector('[data-pin]')
      const pages = gsap.utils.toArray('[data-page]')
      const leadEl = root.current.querySelector('[data-bond-lead]')

      gsap.set(pages[0], { yPercent: 0, rotate: -0.4 })
      pages.slice(1).forEach((p, i) => {
        gsap.set(p, { yPercent: 108, rotate: i % 2 === 0 ? 2.8 : -2.4 })
      })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.45,
          pin,
          anticipatePin: 1,
        },
      })

      tl.fromTo(leadEl, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1 }, 0)
      tl.to(leadEl, { opacity: 0, y: -18, duration: 0.7 }, 1.5)

      pages.slice(1).forEach((page, i) => {
        const t = 1.7 + i * 2.3
        tl.to(page, { yPercent: 0, rotate: i % 2 === 0 ? -0.8 : 1, duration: 1.9 }, t)
        tl.to(
          pages[i],
          { scale: 0.93, yPercent: -5, rotate: i % 2 === 0 ? -3.5 : 3.2, duration: 1.9 },
          t,
        )
        const img = page.querySelector('[data-page-img]')
        if (img) {
          tl.fromTo(img, { scale: 1.12 }, { scale: 1.02, duration: 2 }, t)
        }
      })
    },
    { scope: root },
  )

  const pages = [
    {
      kicker: 'Panel 01',
      title: 'Headline 1',
      body: 'Body 1 — replace with panel copy.',
      img: closeupBuddies,
    },
    {
      kicker: 'Panel 02',
      title: 'Headline 2',
      body: 'Body 2 — replace with panel copy.',
      img: heroRoad,
    },
    {
      kicker: 'Panel 03',
      title: 'Headline 3',
      body: 'Body 3 — replace with panel copy.',
      img: driveSunset,
    },
  ]

  return (
    <section
      id="chapter-bond"
      ref={root}
      className="relative h-[560vh] bg-comic-paper text-[#2a2622]"
    >
      <div
        data-pin
        className="relative flex h-svh flex-col items-center justify-center overflow-hidden px-4"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundColor: '#d8d4cc',
            backgroundImage:
              'radial-gradient(ellipse at 50% 15%, rgba(255,255,255,0.55), transparent 50%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 3px)',
          }}
        />

        <p className="relative z-30 mb-3 text-[11px] tracking-[0.28em] text-comic-flare uppercase">
          {label}
        </p>
        <p
          data-bond-lead
          className="relative z-30 mb-6 max-w-2xl text-center font-brico text-[clamp(1.2rem,2.8vw,1.85rem)] leading-snug font-semibold"
        >
          {lead}
        </p>

        <div className="relative z-20 h-[min(70svh,580px)] w-full max-w-4xl">
          {pages.map((page) => (
            <article
              key={page.title}
              data-page
              className="absolute inset-0 will-change-transform"
            >
              <PaperFrame className="h-full !w-full">
                <div className="grid h-full md:grid-cols-[1.4fr_0.6fr]">
                  <div className="relative min-h-48 overflow-hidden">
                    <img
                      data-page-img
                      src={page.img}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-3 bg-[#f7f4ee] p-6 md:p-8">
                    <p className="text-[10px] tracking-[0.25em] text-comic-flare uppercase">
                      {page.kicker}
                    </p>
                    <h2 className="font-brico text-2xl font-bold tracking-[-0.03em] md:text-3xl">
                      {page.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-[#2a2622]/75">
                      {page.body}
                    </p>
                  </div>
                </div>
              </PaperFrame>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

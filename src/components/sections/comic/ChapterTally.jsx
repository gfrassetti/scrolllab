import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { WOOD } from './comicKit'
import { AnimalSketch, DogHead, PigHead, Postcard } from './StoryArt'

// per-second rates are placeholders: swap in your own figures (and source them)
const DEFAULT_COUNTERS = [
  { kind: 'fish', perSecond: 3200 },
  { kind: 'chicken', perSecond: 2100 },
  { kind: 'duck', perSecond: 96 },
  { kind: 'pig', perSecond: 48 },
  { kind: 'rabbit', perSecond: 38 },
  { kind: 'turkey', perSecond: 21 },
  { kind: 'sheep', perSecond: 18 },
  { kind: 'cow', perSecond: 10 },
]

const TILT = [-2.2, 1.6, -1.2, 2.4, 1.8, -2.6, 1.2, -1.6]

function useSeconds() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return seconds
}

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * ChapterTally — the closing chapter, on red wood. A tilted postcard, a line
 * with a live clock ("since you opened the page"), a grid of pencil-drawn
 * cards whose numbers keep climbing, and the call to action: a big line and
 * two paper cards (one live, one "coming soon").
 */
export default function ChapterTally({
  postcard = 'Title 1',
  lead = 'Lead 2 — replace with your closing line.',
  counterLabel = 'Counter label — since you opened the page',
  counters = DEFAULT_COUNTERS,
  headline = 'HEADLINE 2',
  subline = 'Subline 1 — replace.',
  ctaPrimary = 'CTA 1',
  ctaPrimaryHref = '#contact',
  ctaSoon = 'CTA 2',
  soonLabel = 'Coming soon',
}) {
  const root = useRef(null)
  const seconds = useSeconds()

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-tally-reveal]')
      gsap.from('[data-postcard]', {
        y: -80,
        rotate: 22,
        opacity: 0,
        duration: 1.1,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
      gsap.from('[data-tally-card]', {
        y: 70,
        rotate: (i) => (i % 2 ? 8 : -8),
        opacity: 0,
        duration: 0.9,
        ease: 'back.out(1.5)',
        stagger: 0.08,
        scrollTrigger: { trigger: '[data-tally-grid]', start: 'top 80%', once: true },
      })
      gsap.from('[data-hero-card]', {
        y: 90,
        rotate: (i) => (i ? 10 : -10),
        opacity: 0,
        duration: 1,
        ease: 'back.out(1.6)',
        stagger: 0.15,
        scrollTrigger: { trigger: '[data-hero-cards]', start: 'top 82%', once: true },
      })
      gsap.from('[data-tally-line]', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(2)',
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section id="chapter-tally" ref={root} className="relative -mt-[100svh] overflow-hidden px-5 pt-[45svh] pb-24 text-white md:px-10 md:pt-[52svh]" style={WOOD}>
      <div data-postcard data-tally-reveal className="absolute top-[38svh] right-[3%] w-[min(22vw,250px)] rotate-[8deg] drop-shadow-[0_18px_30px_rgba(0,0,0,0.4)] max-md:relative max-md:top-auto max-md:right-auto max-md:mx-auto max-md:mb-10 max-md:w-[60vw]">
        <Postcard title={postcard} className="block h-auto w-full" />
      </div>

      <div className="mx-auto max-w-5xl text-center">
        <p data-tally-line data-tally-reveal className="mx-auto max-w-xl text-sm font-semibold md:text-base">
          {lead}
        </p>
        <p data-tally-line data-tally-reveal className="mt-3 font-brico text-lg font-bold md:text-2xl">
          {counterLabel} — <span className="tabular-nums">{clock(seconds)}</span>
        </p>
      </div>

      <div data-tally-grid className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
        {counters.map((c, i) => (
          <div
            key={c.kind}
            data-tally-card
            data-tally-reveal
            className="relative bg-[#ecebe6] px-3 pt-3 pb-2 text-[#2a2622] shadow-[0_12px_30px_rgba(40,6,16,0.45)]"
            style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }}
          >
            <p className="text-center text-[13px] font-bold tabular-nums">
              {Math.round(c.perSecond * seconds).toLocaleString('en-US')}
            </p>
            <AnimalSketch kind={c.kind} className="block h-auto w-full" />
          </div>
        ))}
      </div>

      <div className="mx-auto mt-24 max-w-4xl text-center">
        <h2 data-tally-line data-tally-reveal className="font-hand text-[clamp(2.6rem,7vw,5.5rem)] leading-none font-black tracking-[0.02em] uppercase">
          {headline}
        </h2>
        <p data-tally-line data-tally-reveal className="mt-2 text-sm font-semibold md:text-base">{subline}</p>
      </div>

      <div data-hero-cards className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-6 md:gap-10">
        <a
          data-hero-card
          data-tally-reveal
          href={ctaPrimaryHref}
          className="group tpl-hit relative block w-[min(70vw,260px)] -rotate-3 bg-[#ecebe6] p-5 text-center text-[#2a2622] shadow-[0_18px_40px_rgba(40,6,16,0.5)] transition-transform duration-300 ease-out hover:-translate-y-1 hover:-rotate-1"
        >
          <span className="font-hand text-3xl font-black uppercase">{ctaPrimary}</span>
          <DogHead mood="happy" className="mx-auto mt-2 block h-auto w-[70%] grayscale transition-[filter] duration-300 group-hover:grayscale-0" />
        </a>
        <div
          data-hero-card
          data-tally-reveal
          aria-disabled="true"
          className="relative w-[min(70vw,260px)] rotate-3 bg-[#ecebe6]/70 p-5 text-center text-[#2a2622] shadow-[0_18px_40px_rgba(40,6,16,0.4)]"
        >
          <span className="mx-auto mb-1 block w-fit rounded-full bg-[#2a2622]/15 px-2 py-0.5 text-[11px] font-bold tracking-[0.14em] uppercase">
            {soonLabel}
          </span>
          <span className="font-hand text-3xl font-black uppercase opacity-70">{ctaSoon}</span>
          <PigHead mood="calm" className="mx-auto mt-2 block h-auto w-[70%] opacity-60 grayscale" />
        </div>
      </div>
    </section>
  )
}

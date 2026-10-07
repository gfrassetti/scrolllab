import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, trackPointer } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { BoilOutline, SpeechBubble, TORN_TOP, boilTo, hoverDepth } from './comicKit'
import { LabScene, PigSitting, WallScene, YardScene } from './WallArt'

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

function Arrow({ flip }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1d1311] shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95">
      <svg viewBox="0 0 20 20" className={`h-5 w-5 ${flip ? 'rotate-180' : ''}`} aria-hidden="true">
        <path d="M12 4 L6 10 L12 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** A paper note with a boiling outline and a stamp, for the side slides. */
function Note({ fact, stamp }) {
  return (
    <div data-note className="relative w-[min(30vw,440px)] max-md:w-[78vw]">
      <BoilOutline />
      <div className="relative bg-[#d8d6d0] p-6 text-[#1d1a18] md:p-8" style={{ clipPath: 'polygon(0.6% 1%, 99.4% 0%, 100% 99%, 0% 100%)' }}>
        <p className="font-hand text-[clamp(1.8rem,3vw,3rem)] leading-[0.9] font-black tracking-[0.01em] uppercase">{fact.title}</p>
        <hr className="my-4 border-[#1d1a18]/30" />
        <p className="text-sm leading-relaxed md:text-[15px]">{fact.blurb}</p>
        <p className="mt-3 text-sm leading-relaxed text-[#1d1a18]/75 md:text-[15px]">{fact.concern}</p>
        <p className="mt-6 ml-auto w-fit -rotate-6 border-4 border-double border-[#2a2622]/70 px-3 py-1 font-hand text-xl font-black tracking-[0.18em] text-[#2a2622]/70 uppercase">
          {stamp}
        </p>
      </div>
    </div>
  )
}

/**
 * ChapterWorlds — full width, after the reference: a three-slide carousel
 * (the lab ← the wall → the yard), with the pig on the middle slide. The scene
 * drifts with the scroll (parallax) and with the pointer; on the wall the pig
 * holds still while the bricks move behind it. Two arrows walk the slides; the
 * side ones carry a note.
 */
export default function ChapterWorlds({
  facts = DEFAULT_FACTS,
  captions = ['Caption 10 — replace with story beat.'],
  dialogue = 'Dialogue 5 — replace.',
  stamp = 'Stamp',
  back = 'Back',
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()
  const [active, setActive] = useState(1)

  // the slides travel side by side; the active one sits at 0
  useGSAP(
    () => {
      const slides = gsap.utils.toArray('[data-slide]', root.current)
      gsap.to(slides, {
        xPercent: (i) => (i - active) * 100,
        duration: reduced ? 0 : 0.9,
        ease: 'power3.inOut',
        overwrite: 'auto',
      })
      gsap.fromTo(
        root.current.querySelectorAll(`[data-slide="${active}"] [data-note]`),
        { y: 60, rotate: 5, opacity: 0 },
        { y: 0, rotate: 0, opacity: 1, duration: 0.8, delay: reduced ? 0 : 0.45, ease: 'back.out(1.6)' },
      )
    },
    { scope: root, dependencies: [active, reduced] },
  )

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-comic-reveal]')
      const scene = root.current
      const pin = scene.querySelector('[data-pin]')
      const caption = scene.querySelector('[data-worlds-caption]')
      gsap.set(caption, { opacity: 0, y: 20 })
      gsap.set(scene.querySelector('[data-bubble]'), { scale: 0.5, opacity: 0, transformOrigin: '50% 80%' })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: scene,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
          pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      // parallax: the far scene drifts more than the pig
      tl.fromTo('[data-slide-bg]', { yPercent: 5 }, { yPercent: -5, duration: 4 }, 0)
      tl.fromTo('[data-pig]', { yPercent: 6 }, { yPercent: -2, duration: 4 }, 0)
      tl.to(caption, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }, 0.3)
      tl.to(scene.querySelector('[data-bubble]'), { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' }, 0.9)
      // the next chapter overlaps this one's last screen: hold the picture
      tl.to({}, { duration: 1.2 }, 4)

      const boil = { f: 0 }
      tl.fromTo(boil, { f: 0 }, { f: 40, duration: 5.2, ease: 'none', onUpdate: () => boilTo(scene, boil.f) }, 0)

      // pointer: the bricks move, the pig stays; on the side slides the note floats
      return hoverDepth(scene, [['[data-slide-bg]', -26], ['[data-note]', 10]], { gsap, trackPointer })
    },
    { scope: root, dependencies: [reduced] },
  )

  const go = (i) => setActive(Math.max(0, Math.min(2, i)))
  const left = active === 1 ? facts[0].title : active === 2 ? back : null
  const right = active === 1 ? facts[1].title : active === 0 ? back : null

  const slides = (
    <>
      <div data-slide="0" className="absolute inset-0 overflow-hidden will-change-transform" aria-hidden={active !== 0}>
        <div data-slide-bg className="absolute -inset-[7%]">
          <LabScene className="absolute inset-0 h-full w-full" />
        </div>
        <div className="absolute inset-y-0 right-[6%] flex items-center max-md:inset-x-0 max-md:right-auto max-md:justify-center">
          <Note fact={facts[0]} stamp={stamp} />
        </div>
      </div>
      <div data-slide="1" className="absolute inset-0 overflow-hidden will-change-transform" aria-hidden={active !== 1}>
        <div data-slide-bg className="absolute -inset-[7%]">
          <WallScene className="absolute inset-0 h-full w-full" />
        </div>
        <div data-pig className="absolute bottom-[6%] left-1/2 w-[min(32vw,470px)] -translate-x-1/2 max-md:w-[62vw]">
          <PigSitting className="block h-auto w-full" />
        </div>
        <SpeechBubble line={dialogue} className="absolute top-[24%] right-[16%] w-[min(20vw,300px)] max-md:right-[6%] max-md:w-[42vw]" />
      </div>
      <div data-slide="2" className="absolute inset-0 overflow-hidden will-change-transform" aria-hidden={active !== 2}>
        <div data-slide-bg className="absolute -inset-[7%]">
          <YardScene className="absolute inset-0 h-full w-full" />
        </div>
        <div className="absolute inset-y-0 left-[6%] flex items-center max-md:inset-x-0 max-md:left-auto max-md:justify-center">
          <Note fact={facts[1]} stamp={stamp} />
        </div>
      </div>
    </>
  )

  const arrows = (
    <>
      {left && (
        <button
          type="button"
          onClick={() => go(active - 1)}
          className="group tpl-hit absolute bottom-[6%] left-[3%] z-20 flex items-center gap-3 text-left text-[14px] font-semibold text-white drop-shadow md:text-lg"
        >
          <Arrow />
          <span>{left}</span>
        </button>
      )}
      {right && (
        <button
          type="button"
          onClick={() => go(active + 1)}
          className="group tpl-hit absolute right-[3%] bottom-[6%] z-20 flex items-center gap-3 text-right text-[14px] font-semibold text-white drop-shadow md:text-lg"
        >
          <span>{right}</span>
          <Arrow flip />
        </button>
      )}
    </>
  )

  if (reduced) {
    return (
      <section id="chapter-worlds" ref={root} className="relative bg-[#1a0614] text-white">
        <p data-comic-reveal className="px-6 pt-16 text-center font-semibold">{captions[0]}</p>
        <div data-comic-reveal className="relative mt-8 h-[80svh] overflow-hidden">
          {slides}
          {arrows}
        </div>
      </section>
    )
  }

  return (
    <section
      id="chapter-worlds"
      ref={root}
      className="relative -mt-[100svh] h-[320vh] bg-[#1a0614] text-white"
      style={{ clipPath: TORN_TOP }}
    >
      <div data-pin className="relative h-svh overflow-hidden">
        {slides}
        <p
          data-worlds-caption
          className="pointer-events-none absolute inset-x-0 top-[12%] z-20 px-6 text-center text-[15px] font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] md:text-lg"
        >
          {captions[0]}
        </p>
        {arrows}
      </div>
    </section>
  )
}

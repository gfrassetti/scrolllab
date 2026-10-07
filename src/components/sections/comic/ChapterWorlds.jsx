import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, trackPointer } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { DARK_PAPER, SpeechBubble, TORN_TOP, TornCard, boilTo, hoverDepth } from './comicKit'
import { BrickBg, DinnerBg, DogHead, FarmhouseBg, KnifeHand, PigHead } from './StoryArt'

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

const CAPTIONS = [
  'Caption 10 — replace with story beat.',
  'Caption 11 — replace with story beat.',
  'Caption 12 — replace with story beat.',
]

function Arrow({ flip }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1d1311] transition-transform duration-300 group-hover:scale-110">
      <svg viewBox="0 0 20 20" className={`h-4 w-4 ${flip ? 'rotate-180' : ''}`} aria-hidden="true">
        <path d="M12 4 L6 10 L12 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** The pig against the brick wall, with two doors to learn more. */
function WallCard({ line, facts, open, setOpen }) {
  return (
    <TornCard
      aspect="aspect-[2.4/1]"
      back={
        <div data-card-bg className="absolute -inset-[5%] will-change-transform">
          <BrickBg className="absolute inset-0 h-full w-full" />
        </div>
      }
    >
      <div className="absolute inset-x-0 -top-[30%] bottom-0 overflow-hidden">
        <div data-char className="absolute bottom-0 left-[40%] w-[24%] will-change-transform">
          <div data-char-hover>
            <PigHead mood="sad" className="block h-auto w-full" />
          </div>
        </div>
      </div>
      <SpeechBubble line={line} className="absolute top-[16%] right-[8%] w-[22%] max-md:w-[34%]" />
      {facts.slice(0, 2).map((fact, i) => (
        <button
          key={fact.id}
          type="button"
          onClick={() => setOpen(open === i ? -1 : i)}
          aria-expanded={open === i}
          className={`group tpl-hit pointer-events-auto absolute bottom-[6%] flex items-center gap-3 text-left text-[13px] font-semibold text-white drop-shadow md:text-sm ${
            i ? 'right-[3%] flex-row-reverse text-right' : 'left-[3%]'
          }`}
        >
          <Arrow flip={i === 1} />
          <span className="max-w-[16ch]">{fact.title}</span>
        </button>
      ))}
      {open >= 0 && (
        <div className="pointer-events-auto absolute inset-x-[18%] top-[12%] z-10 rounded-sm bg-[#f7f4ee] p-5 text-[#2a2622] shadow-[0_20px_60px_rgba(0,0,0,0.45)] md:p-7">
          <p className="font-hand text-2xl font-black tracking-[0.02em] uppercase md:text-3xl">{facts[open].title}</p>
          <p className="mt-2 text-sm leading-relaxed">{facts[open].blurb}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#2a2622]/70">{facts[open].concern}</p>
          <button
            type="button"
            onClick={() => setOpen(-1)}
            className="tpl-hit tpl-link relative mt-3 text-[12px] font-semibold tracking-[0.18em] uppercase"
          >
            Close
          </button>
        </div>
      )}
    </TornCard>
  )
}

function FarmhouseCard({ sfx }) {
  return (
    <TornCard
      size="w-[min(70vw,1150px)] max-md:w-[92vw]"
      aspect="aspect-[2.3/1]"
      back={
        <div data-card-bg className="absolute -inset-[5%] will-change-transform">
          <FarmhouseBg className="absolute inset-0 h-full w-full" />
        </div>
      }
    >
      <div
        data-sfx
        className="pointer-events-none absolute top-[18%] left-[48%] font-hand text-[clamp(2.4rem,7vw,7rem)] leading-none font-black tracking-[0.04em] text-white"
        style={{ WebkitTextStroke: '3px #1d1311', paintOrder: 'stroke', transform: 'rotate(18deg)' }}
      >
        {sfx}
      </div>
    </TornCard>
  )
}

function DinnerCard() {
  return (
    <TornCard
      size="w-[min(70vw,1150px)] max-md:w-[92vw]"
      aspect="aspect-[2.6/1]"
      back={
        <div data-card-bg className="absolute -inset-[5%] will-change-transform">
          <DinnerBg className="absolute inset-0 h-full w-full" />
        </div>
      }
    >
      <div className="absolute inset-x-0 -top-[30%] bottom-0 overflow-hidden">
        <div data-char className="absolute bottom-[8%] left-[14%] w-[26%] will-change-transform">
          <div data-char-hover>
            <DogHead mood="alert" className="block h-auto w-full" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <div data-prop className="absolute top-[40%] -right-[2%] w-[44%] will-change-transform">
          <KnifeHand className="block h-auto w-full" />
        </div>
      </div>
    </TornCard>
  )
}

/**
 * ChapterWorlds — the dark chapter, drawn on black paper. The pig against a
 * brick wall (with two buttons that open a note each), then a farmhouse at
 * dusk with a sound that swells and fades, then the dinner table rising over
 * it. A torn red-wood board rises at the end: the closing chapter.
 */
export default function ChapterWorlds({
  facts = DEFAULT_FACTS,
  captions = CAPTIONS,
  dialogue = 'Dialogue 5 — replace.',
  sfx = 'SQUEEE',
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(-1)

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-comic-reveal]')
      const scene = root.current
      const q = (sel) => gsap.utils.toArray(sel, scene)
      const pin = root.current.querySelector('[data-pin]')
      const [wall, farm, dinner] = q('[data-dark-card]')
      const caps = q('[data-dark-caption]')
      const sfxEl = root.current.querySelector('[data-sfx]')
      const H = () => pin.clientHeight

      gsap.set([farm, dinner], { y: () => H() * 1.1, transformOrigin: '50% 50%' })
      // the wall rides up with the torn dark paper
      gsap.set(wall, { transformOrigin: '50% 50%' })
      q('[data-char]').forEach((c) => gsap.set(c, { y: () => -H() * 0.07 }))
      gsap.set(caps, { opacity: 0, y: 20 })
      gsap.set(sfxEl, { scale: 0.4, opacity: 0, transformOrigin: '50% 50%' })
      gsap.set(root.current.querySelector('[data-bubble]'), { scale: 0.5, opacity: 0, transformOrigin: '50% 80%' })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
          pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      const land = (card, at, dur = 1.8) => {
        tl.to(card, { y: 0, duration: dur, ease: 'power2.out' }, at)
        const ch = card.querySelector('[data-char]')
        if (ch) tl.to(ch, { y: 0, duration: 1.8, ease: 'power2.out' }, at)
        tl.fromTo(card.querySelector('[data-card-bg]'), { scale: 1.1 }, { scale: 1, duration: 2.4, ease: 'power1.out' }, at)
      }

      tl.to(wall.querySelector('[data-char]'), { y: 0, duration: 1.2, ease: 'power2.out' }, 0)
      tl.fromTo(wall.querySelector('[data-card-bg]'), { scale: 1.1 }, { scale: 1, duration: 2, ease: 'power1.out' }, 0)
      tl.to(caps[0], { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2)' }, 0.6)
      tl.to(root.current.querySelector('[data-bubble]'), { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.8)' }, 1.4)
      // a beat to stop and open the notes
      tl.to(caps[0], { opacity: 0, y: -14, duration: 0.5 }, 3.6)
      tl.to(wall, { y: () => -H() * 1.1, duration: 1.8, ease: 'power2.in' }, 3.6)
      land(farm, 3.8)
      tl.to(caps[1], { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2)' }, 4.8)
      // the sound swells across the barn and fades
      tl.to(sfxEl, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' }, 5.0)
      tl.to(sfxEl, { scale: 1.5, opacity: 0.2, duration: 1.4, ease: 'power1.in' }, 5.7)
      tl.to(caps[1], { opacity: 0, y: -14, duration: 0.5 }, 6.8)
      land(dinner, 6.8)
      tl.to(farm, { scale: 0.8, y: () => -H() * 0.18, duration: 1.8, ease: 'power1.out' }, 6.8)
      tl.fromTo(dinner.querySelector('[data-prop]'), { xPercent: 40 }, { xPercent: 0, duration: 1.8, ease: 'power2.out' }, 7.2)
      tl.to(caps[2], { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2)' }, 7.8)
      tl.to(caps[2], { opacity: 0, duration: 0.5 }, 9.6)

      const boil = { f: 0 }
      tl.fromTo(boil, { f: 0 }, { f: 80, duration: 11.2, ease: 'none', onUpdate: () => boilTo(scene, boil.f) }, 0)

      tl.to({}, { duration: 2.15 }, tl.duration())

      return hoverDepth(root.current, [['[data-card-bg]', -12], ['[data-char-hover]', 14], ['[data-prop]', 18]], { gsap, trackPointer })
    },
    { scope: root, dependencies: [reduced] },
  )

  if (reduced) {
    return (
      <section id="chapter-worlds" ref={root} className="flex flex-col items-center gap-20 px-4 py-24 text-white" style={DARK_PAPER}>
        <p data-comic-reveal className="max-w-2xl text-center font-semibold">{captions[0]}</p>
        <div data-comic-reveal>
          <WallCard line={dialogue} facts={facts} open={open} setOpen={setOpen} />
        </div>
        <p data-comic-reveal className="max-w-2xl text-center font-semibold">{captions[1]}</p>
        <div data-comic-reveal>
          <FarmhouseCard sfx={sfx} />
        </div>
        <p data-comic-reveal className="max-w-2xl text-center font-semibold">{captions[2]}</p>
        <div data-comic-reveal>
          <DinnerCard />
        </div>
      </section>
    )
  }

  return (
    <section id="chapter-worlds" ref={root} className="relative -mt-[100svh] h-[720vh]" style={{ ...DARK_PAPER, clipPath: TORN_TOP }}>
      <div data-pin className="relative h-svh overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-[10%] z-40 flex justify-center px-6 md:top-[9%]">
          <div className="relative h-20 w-full max-w-3xl text-center">
            {captions.map((text) => (
              <p
                key={text}
                data-dark-caption
                className="absolute inset-x-0 text-[15px] font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] md:text-lg"
              >
                {text}
              </p>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[28%] z-10 flex justify-center">
          <div data-dark-card className="will-change-transform">
            <WallCard line={dialogue} facts={facts} open={open} setOpen={setOpen} />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[30%] z-20 flex justify-center">
          <div data-dark-card className="will-change-transform">
            <FarmhouseCard sfx={sfx} />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[44%] z-30 flex justify-center">
          <div data-dark-card className="will-change-transform">
            <DinnerCard />
          </div>
        </div>
      </div>
    </section>
  )
}

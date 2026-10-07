import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, trackPointer } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { DARK_PAPER, PAPER, SpeechBubble, TORN_TOP, TornCard, boilTo, hoverDepth } from './comicKit'
import { BathBg, BedroomBg, DogHead, PettingHand, PorchBg } from './StoryArt'

const DIALOGUES = ['Dialogue 2 — replace.', 'Dialogue 3 — replace.', 'Dialogue 4 — replace.']

// the three cards alternate left / right, like the reference (x 137 → 308 → 137 of 1280)
const SHIFT = ['-6vw', '7vw', '-6vw']

function Bone() {
  return (
    <svg viewBox="0 0 160 70" className="block h-auto w-full" aria-hidden="true">
      <path
        d="M30 20 C16 4 -4 18 10 32 C-4 46 16 62 30 46 L130 46 C144 62 164 46 150 32 C164 18 144 4 130 20Z"
        fill="#f6f0e2"
        stroke="#1d1311"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HomeCard({ index, line }) {
  const back = [
    <PorchBg key="p" className="absolute inset-0 h-full w-full" />,
    <BedroomBg key="b" className="absolute inset-0 h-full w-full" />,
    <BathBg key="t" className="absolute inset-0 h-full w-full" />,
  ][index]
  return (
    <TornCard
      size="w-[min(66vw,1100px)] max-md:w-[90vw]"
      aspect="aspect-[2.27/1]"
      back={
        <div data-card-bg className="absolute -inset-[5%] will-change-transform">
          {back}
        </div>
      }
    >
      <div className="absolute inset-x-0 -top-[45%] bottom-0 overflow-hidden">
        {index === 0 && (
          <>
            <div data-char className="absolute bottom-0 left-[16%] w-[36%] will-change-transform">
              <div data-char-hover>
                <DogHead mood="alert" className="block h-auto w-full" />
              </div>
            </div>
            <div data-prop className="absolute top-[18%] left-[38%] w-[14%] will-change-transform">
              <Bone />
            </div>
          </>
        )}
        {index === 1 && (
          <>
            <div data-char className="absolute bottom-0 left-[46%] w-[34%] will-change-transform">
              <div data-char-hover>
                <DogHead mood="happy" className="block h-auto w-full" />
              </div>
            </div>
            <div data-prop className="absolute top-[40%] right-0 w-[44%] will-change-transform">
              <PettingHand className="block h-auto w-full" />
            </div>
          </>
        )}
        {index === 2 && (
          <div data-char className="absolute bottom-0 left-[6%] w-[36%] will-change-transform">
            <div data-char-hover>
              <DogHead mood="bliss" className="block h-auto w-full" />
            </div>
          </div>
        )}
      </div>
      <SpeechBubble
        line={line}
        className={`absolute top-[26%] w-[26%] max-md:w-[38%] ${index === 1 ? '-left-[16%]' : '-right-[14%]'}`}
      />
    </TornCard>
  )
}

/**
 * ChapterBond — three home cards on grey paper. Each one comes up from below
 * and lands over the previous, which backs away to ~0.8; they alternate left
 * and right. Inside each card the dog lags its card and the room settles
 * (parallax), the bubble and the paper cut boil as you scroll. At the end a
 * torn dark paper rises: the page of the next chapter.
 */
export default function ChapterBond({ lead = 'Caption 9 — replace with story beat.', dialogues = DIALOGUES }) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-comic-reveal]')
      const scene = root.current
      const q = (sel) => gsap.utils.toArray(sel, scene)
      const pin = root.current.querySelector('[data-pin]')
      const cards = q('[data-home-card]')
      const leadEl = root.current.querySelector('[data-bond-lead]')
      const dark = root.current.querySelector('[data-curtain-dark]')

      // the first card is already on its way up when the page arrives (no empty paper)
      gsap.set(cards, { y: (i) => pin.clientHeight * (i ? 1.1 : 0.55), transformOrigin: '50% 50%' })
      cards.forEach((card) => {
        gsap.set(card.querySelector('[data-char]'), { y: () => -pin.clientHeight * 0.07 })
        gsap.set(card.querySelector('[data-bubble]'), { scale: 0.5, opacity: 0, transformOrigin: '50% 80%' })
      })
      gsap.set(leadEl, { opacity: 0, y: 20 })
      gsap.set(dark, { yPercent: 106 })

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

      tl.to(leadEl, { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2)' }, 0.4)
      cards.forEach((card, i) => {
        const at = i ? i * 2.6 - 1 : 0
        const IN = i ? 1.8 : 1.2
        tl.to(card, { y: 0, duration: IN, ease: 'power2.out' }, at)
        tl.to(card.querySelector('[data-char]'), { y: 0, duration: IN, ease: 'power2.out' }, at)
        tl.fromTo(card.querySelector('[data-card-bg]'), { scale: 1.1 }, { scale: 1, duration: IN + 0.6, ease: 'power1.out' }, at)
        const prop = card.querySelector('[data-prop]')
        if (prop) tl.fromTo(prop, { yPercent: -30, rotate: -8 }, { yPercent: 0, rotate: 0, duration: IN, ease: 'power2.out' }, at + 0.2)
        tl.to(card.querySelector('[data-bubble]'), { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.8)' }, at + IN - 0.4)
        // the card before backs away as this one lands on it
        if (i) tl.to(cards[i - 1], { scale: 0.8, duration: IN, ease: 'power1.out' }, at)
      })
      const END = (cards.length - 1) * 2.6 - 1 + 2.6
      tl.to(leadEl, { opacity: 0, duration: 0.5 }, END)
      tl.to(dark, { yPercent: 0, duration: 1.6, ease: 'power2.out' }, END)

      // the paper cuts and bubbles boil all the way, the dogs bob with the scroll
      const boil = { f: 0 }
      const chars = q('[data-char-hover]')
      tl.fromTo(
        boil,
        { f: 0 },
        {
          f: END * 7,
          duration: END + 1.6,
          ease: 'none',
          onUpdate: () => {
            boilTo(scene, boil.f)
            chars.forEach((c, i) => gsap.set(c.parentElement, { rotate: Math.sin(boil.f * 0.6 + i) * 3 }))
          },
        },
        0,
      )

      return hoverDepth(root.current, [['[data-card-bg]', -12], ['[data-char-hover]', 14], ['[data-prop]', 20]], { gsap, trackPointer })
    },
    { scope: root, dependencies: [reduced] },
  )

  if (reduced) {
    return (
      <section id="chapter-bond" ref={root} className="flex flex-col items-center gap-24 px-4 py-24" style={PAPER}>
        <p data-comic-reveal className="max-w-2xl text-center font-semibold text-[#1b1a18]">{lead}</p>
        {[0, 1, 2].map((i) => (
          <div key={i} data-comic-reveal>
            <HomeCard index={i} line={dialogues[i]} />
          </div>
        ))}
      </section>
    )
  }

  return (
    <section id="chapter-bond" ref={root} className="relative h-[560vh]" style={PAPER}>
      <div data-pin className="relative h-svh overflow-hidden">
        <p
          data-bond-lead
          className="pointer-events-none absolute inset-x-0 top-[10%] z-40 px-6 text-center text-[15px] font-semibold text-[#1b1a18] md:top-[9%] md:text-lg"
        >
          {lead}
        </p>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[30%] flex justify-center"
            style={{ zIndex: 10 + i, transform: `translateX(${SHIFT[i]})` }}
          >
            <div data-home-card className="will-change-transform">
              <HomeCard index={i} line={dialogues[i]} />
            </div>
          </div>
        ))}
        <div
          data-curtain-dark
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-9 -bottom-2 z-50 will-change-transform"
          style={{ filter: 'drop-shadow(0 -8px 14px rgba(0,0,0,0.5))' }}
        >
          <div className="h-full w-full" style={{ ...DARK_PAPER, clipPath: TORN_TOP }} />
        </div>
      </div>
    </section>
  )
}

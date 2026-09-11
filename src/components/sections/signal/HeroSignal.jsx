import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

const defaultWords = ['move', 'resonate', 'linger', 'hit different']

/**
 * HeroSignal — kinetic word-cycle hero (the Awwwards "swap-title" mechanic):
 * each word's characters blur-and-rise into place, holds, then slides out as
 * the next word slides in from below. A timed sequence played once on
 * scroll-in — not scroll-scrubbed — a lighter cousin of cookbook P8 (type
 * reveal). See docs/reference-analysis/signal.md.
 */
export default function HeroSignal({
  kicker = 'SIGNAL — motion & sound studio',
  lead = 'We make brands',
  words = defaultWords,
  scrollLabel = 'Scroll',
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      const wordEls = gsap.utils.toArray('[data-word]')
      if (wordEls.length < 2) return

      const splits = wordEls.map((el) => new SplitText(el, { type: 'chars', mask: 'chars' }))
      splits.forEach((split, i) => {
        gsap.set(split.chars, { yPercent: 110, opacity: 0, filter: 'blur(8px)' })
        if (i > 0) gsap.set(wordEls[i], { yPercent: 100, opacity: 0 })
      })

      const HOLD = '+=1.6'
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 })

      tl.to(splits[0].chars, {
        yPercent: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: 'power2.out',
        stagger: { each: 0.022, from: 'random' },
      })

      for (let i = 1; i < wordEls.length; i++) {
        tl.to(wordEls[i - 1], { yPercent: -100, opacity: 0, duration: 0.55, ease: 'power2.inOut' }, HOLD)
          .fromTo(
            wordEls[i],
            { yPercent: 100, opacity: 1 },
            { yPercent: 0, duration: 0.55, ease: 'power2.out' },
            '<',
          )
          .to(
            splits[i].chars,
            {
              yPercent: 0,
              opacity: 1,
              filter: 'blur(0px)',
              duration: 0.7,
              ease: 'power2.out',
              stagger: { each: 0.022, from: 'random' },
            },
            '<+=0.05',
          )
      }

      // close the loop: last word exits, first word resets off-screen so the
      // repeat re-plays the same reveal instead of popping back into view
      const last = wordEls.length - 1
      tl.to(wordEls[last], { yPercent: -100, opacity: 0, duration: 0.55, ease: 'power2.inOut' }, HOLD)
        .set(wordEls[last], { yPercent: 100 })
        .set(wordEls[0], { yPercent: 0 })
        .set(splits[0].chars, { yPercent: 110, opacity: 0, filter: 'blur(8px)' })

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top 80%',
        once: true,
        onEnter: () => tl.play(0),
      })
    },
    { scope: root, dependencies: [words.join('|')] },
  )

  return (
    <header
      ref={root}
      className="relative flex min-h-svh flex-col justify-between overflow-hidden bg-signal-ink px-5 pt-28 pb-10 text-signal-paper md:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 15%, rgba(255,255,255,0.06), transparent 60%)',
        }}
      />

      <p className="relative z-10 text-[11px] tracking-[0.28em] text-signal-paper/55 uppercase">
        {kicker}
      </p>

      <div className="relative z-10 flex flex-col items-start gap-1">
        <h1 className="font-grotesk text-[clamp(2.4rem,7vw,5.2rem)] leading-[0.98] font-medium tracking-[-0.03em]">
          {lead}
        </h1>
        <div className="relative h-[clamp(3.6rem,10vw,7.6rem)] w-full overflow-hidden">
          {words.map((word, i) => (
            <span
              key={word}
              data-word
              className="absolute inset-0 flex items-center font-grotesk text-[clamp(2.4rem,7vw,5.2rem)] leading-[0.98] font-medium tracking-[-0.03em] text-signal-accent"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between text-[11px] tracking-[0.22em] text-signal-paper/45 uppercase">
        <span>{scrollLabel}</span>
        <span>01 — signal</span>
      </div>
    </header>
  )
}

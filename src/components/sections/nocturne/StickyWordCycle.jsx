import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

const defaultWords = ['CRAFT', 'MOTION', 'SILENCE', 'IMPACT']

/**
 * StickyWordCycle — the viewport pins while scroll steps through a
 * cycle of giant words, each dissolving into the next. A thin acid
 * progress bar tracks the sequence. Static word list under reduced
 * motion.
 */
export default function StickyWordCycle({
  seq = '05',
  total = '06',
  label = 'The mantra',
  words = defaultWords,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const wordEls = gsap.utils.toArray('[data-cycle-word]')
      let current = 0

      const activate = (index) => {
        wordEls.forEach((el, i) => {
          gsap.to(el, {
            opacity: i === index ? 1 : 0,
            filter: i === index ? 'blur(0px)' : 'blur(14px)',
            scale: i === index ? 1 : 0.92,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: true,
          })
        })
      }

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const index = Math.min(
            words.length - 1,
            Math.floor(self.progress * words.length),
          )
          if (index !== current) {
            current = index
            activate(index)
          }
        },
      })

      gsap.to('[data-cycle-bar]', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })
    },
    { scope: root, dependencies: [words.length] },
  )

  if (reduced) {
    return (
      <section className="px-5 py-24 md:px-10 md:py-36">
        <div className="mb-10 flex items-baseline justify-between border-t border-salt/20 pt-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
            Seq. {seq} / {total}
          </p>
          <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
        </div>
        {words.map((word) => (
          <p
            key={word}
            className="font-brico text-[13vw] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase"
          >
            {word}
          </p>
        ))}
      </section>
    )
  }

  return (
    <section
      ref={root}
      className="relative"
      style={{ height: `${words.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        <div className="absolute top-0 inset-x-0 mx-5 flex items-baseline justify-between border-t border-salt/20 pt-4 md:mx-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
            Seq. {seq} / {total}
          </p>
          <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
        </div>

        {words.map((word, i) => (
          <p
            key={word}
            data-cycle-word
            className="absolute font-brico text-[16vw] leading-none font-extrabold tracking-[-0.02em] uppercase select-none"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            {word}
            <span aria-hidden="true" className="text-acid">
              .
            </span>
          </p>
        ))}

        <div className="absolute bottom-10 inset-x-0 mx-5 h-px bg-salt/20 md:mx-10">
          <div
            data-cycle-bar
            className="h-full w-full origin-left scale-x-0 bg-acid"
          />
        </div>
      </div>
    </section>
  )
}

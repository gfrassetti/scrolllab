import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const WORD_COLORS = ['#ffb02e', '#ff3ea5', '#3ddc97', '#ff6b35']

/**
 * PopManifesto — a giant paragraph that inks in word by word as you
 * scroll, with every fourth-ish word landing in a flavor color.
 */
export default function PopManifesto({
  eyebrow = 'Section eyebrow',
  text = 'Lorem ipsum, but honest: this manifesto is placeholder text. It inks in word by word as you scroll and some words land in flavor colors — replace it with your own story from the builder or straight in the code.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-pop-manifesto]', { type: 'words' })

      // Every few words gets a flavor color once it has inked in.
      split.words.forEach((word, i) => {
        if (i % 4 === 2) {
          word.dataset.popColor = WORD_COLORS[(i / 4) % WORD_COLORS.length | 0]
        }
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top 75%',
          end: 'bottom 55%',
          scrub: 0.35,
        },
      })

      tl.fromTo(
        split.words,
        { opacity: 0.1, y: 12 },
        { opacity: 1, y: 0, stagger: 0.55, ease: 'none' },
      )
      split.words.forEach((word, i) => {
        if (!word.dataset.popColor) return
        tl.to(
          word,
          { color: word.dataset.popColor, duration: 0.4 },
          i * 0.6 + 0.3,
        )
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="px-5 py-24 md:px-10 md:py-40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
        {eyebrow}
      </p>
      <p
        data-pop-manifesto
        className="mt-8 max-w-5xl font-brico text-[clamp(1.6rem,4.6vw,3.6rem)] leading-[1.15] font-bold tracking-[-0.01em]"
      >
        {text}
      </p>
    </section>
  )
}

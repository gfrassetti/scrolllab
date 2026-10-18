import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { pointerFx } from '../../../lib/interact'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

/**
 * HeroTwin — two stacked headlines with opposing scroll parallax.
 *
 * Calma: el titular es `absolute` sobre el párrafo (el parallax los separa
 * al scrollear); sin parallax quedaban uno encima del otro. En calma el
 * titular va arriba del párrafo, en fila.
 */
export default function HeroTwin({
  body = 'The Unity Cup brings 32 community clubs from 19 countries to Bristol for nine days of football. No sponsors on the shirts, no tickets to buy: just the game everyone already speaks.',
  headline = 'ONE BALL.\nEVERY LANGUAGE.',
  bg,
  fg,
  /** El titular que cruza la foto. */
  accent,
  /** El párrafo y cada línea del titular flotan a distinta profundidad con el puntero. */
  showHover = 'on',
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-twin-head], [data-twin-body]', { y: 16, stagger: 0.14 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.45,
        },
      })

      tl.to('[data-twin-body]', { yPercent: -28, opacity: 0.35 }, 0)
      tl.to('[data-twin-head]', { yPercent: 42 }, 0)

      if (showHover === 'off') return
      const fx = pointerFx(root.current)
      fx.depth([
        { el: root.current.querySelector('[data-twin-body]'), amount: 10 },
        ...gsap.utils.toArray('[data-twin-head] > span', root.current).map((el, i) => ({ el, amount: i % 2 ? 18 : -18 })),
      ])
      return fx.dispose
    },
    { scope: root, dependencies: [reduced, showHover] },
  )

  const lines = String(headline)
    .split(/\n|\\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <section
      ref={root}
      id="start"
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-(--sec-bg) px-5 pt-24 pb-20 text-current md:px-10"
      style={{
        '--sec-bg': bg || '#e7e4dc',
        '--ut-accent': accent || '#2c4a42',
        color: fg || '#0a0a0a',
      }}
    >
      <div className="relative mx-auto w-full max-w-5xl text-center calm:flex calm:flex-col-reverse calm:items-center calm:gap-8">
        <p
          data-twin-body
          className="mx-auto max-w-[38ch] font-display text-[clamp(1.35rem,3.4vw,2.6rem)] leading-[1.25] tracking-[-0.01em] will-change-transform md:max-w-[42ch]"
        >
          {body}
        </p>

        <h1
          data-twin-head
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 font-anton text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.9] font-normal tracking-[-0.03em] text-(color:--ut-accent) uppercase will-change-transform calm:static calm:translate-y-0"
        >
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
      </div>
    </section>
  )
}

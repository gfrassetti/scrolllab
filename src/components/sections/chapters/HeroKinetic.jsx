import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { pointerFx } from '../../../lib/interact'

/**
 * HeroKinetic — full-viewport hero with oversized kinetic typography.
 * Characters rise out of a mask on load; the whole block drifts up
 * and fades as the user starts scrolling (cinematic exit).
 *
 * Calma (reducir movimiento): las tres líneas y las notas entran con un fundido,
 * sin máscara ni deriva al scrollear.
 */
export default function HeroKinetic({
  lineOne = 'SLOW',
  lineTwo = 'stories,',
  lineThree = 'PRINTED',
  kicker = 'Chapters — a quarterly of long-form stories',
  meta = 'Issue 97 — Spring 2026',
  hint = 'Scroll to begin',
  /** Ancla de la sección, si un link apunta acá. */
  id,
  bg,
  fg,
  accent,
  /** Las tres líneas se corren apenas, cada una a su ritmo, con el puntero. */
  showHover = 'on',
  /** El sello redondo que gira (lleva el texto de «Meta»). */
  showStamp = 'on',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        return calmReveal('[data-hero-line], [data-hero-meta]', { y: 18, stagger: 0.14, duration: 0.9 })
      }

      const split = new SplitText('[data-hero-line]', {
        type: 'chars',
        mask: 'chars',
      })

      // La máscara mide lo que la línea (leading .82) y cortaba la cola de la "y"
      // en cursiva ("story" se leía "storv"). Se la agranda hacia abajo y el
      // margen negativo deja el layout igual; 135% mantiene las letras
      // escondidas al arrancar.
      for (const mask of split.masks || []) {
        mask.style.paddingBottom = '0.2em'
        mask.style.marginBottom = '-0.2em'
      }

      gsap.from(split.chars, {
        yPercent: 135,
        duration: 1.3,
        ease: 'power4.out',
        stagger: { each: 0.03 },
        delay: 0.2,
      })

      gsap.from('[data-hero-meta]', {
        opacity: 0,
        y: 14,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.12,
        delay: 1,
      })

      const exit = {
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
      gsap.to('[data-hero-inner]', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: exit })
      // al salir, las tres líneas se separan hacia lados opuestos, como páginas que se abren
      gsap.utils.toArray('[data-hero-line]', root.current).forEach((line, i) => {
        gsap.to(line, { xPercent: i % 2 ? 18 : -14, ease: 'none', scrollTrigger: { ...exit } })
      })
      // el sello del número gira con el scroll (y solo, despacio)
      const stamp = root.current.querySelector('[data-hero-stamp]')
      if (stamp) {
        gsap.to(stamp, { rotation: 360, duration: 28, ease: 'none', repeat: -1 })
        gsap.to('[data-hero-stamp-wrap]', { rotation: 220, ease: 'none', scrollTrigger: { ...exit } })
      }

      // Las líneas flotan a distinta profundidad con el puntero (o el dedo).
      if (showHover === 'off') return
      const fx = pointerFx(root.current)
      const lines = gsap.utils.toArray('[data-hero-line]', root.current)
      fx.depth(lines.map((el, i) => ({ el, amount: [-14, 22, -8][i] ?? 0 })))
      return fx.dispose
    },
    { scope: root, dependencies: [showHover] },
  )

  return (
    <section
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--market-ink': fg || undefined,
        '--market-bone': bg || undefined,
        '--color-accent': accent || undefined,
      }}
      ref={root}
      id={id}
      className="relative flex h-svh flex-col justify-between overflow-hidden px-5 pt-24 pb-6 md:px-10 md:pb-10"
    >
      <div
        data-hero-inner
        className="flex h-full flex-col justify-between"
      >
        <p
          data-hero-meta
          className="max-w-55 text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
        >
          {kicker}
        </p>

        <h1 className="select-none leading-[0.82] font-medium tracking-[-0.03em]">
          <span data-hero-line className="block text-[17vw]">
            {lineOne}
          </span>
          <span
            data-hero-line
            className="block pl-[12vw] font-display text-[17vw] font-normal italic tracking-normal text-accent"
          >
            {lineTwo}
          </span>
          <span data-hero-line className="block text-[17vw]">
            {lineThree}
          </span>
        </h1>

        {showStamp !== 'off' && (
          <div
            data-hero-stamp-wrap
            aria-hidden="true"
            className="pointer-events-none absolute right-5 bottom-20 size-40 md:right-10 md:bottom-24 md:size-44"
          >
            <svg data-hero-stamp viewBox="0 0 200 200" className="size-full">
              <defs>
                <path id="chapters-stamp-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
              </defs>
              {/* el texto ocupa justo la vuelta (textLength = 2π·78): cualquier largo cierra el círculo */}
              <text className="fill-current text-[14px] uppercase">
                <textPath href="#chapters-stamp-path" textLength="486" lengthAdjust="spacing">{`${meta} · `}</textPath>
              </text>
              <circle cx="100" cy="100" r="5" className="fill-accent" />
            </svg>
          </div>
        )}

        <div className="flex items-end justify-between border-t border-ink/15 pt-4">
          <p
            data-hero-meta
            className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
          >
            {meta}
          </p>
          <p
            data-hero-meta
            className="text-[11px] uppercase tracking-[0.25em] md:text-xs"
          >
            {hint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { portrait, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

/**
 * LastPortrait — dark portrait closer ("Last Dance" beat).
 * Giant title, name, body, optional stats row.
 */
export default function LastPortrait({
  title = 'HEADLINE 6.',
  name = 'Name 1 — Role 1',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Integer aliquet, augue eget aliquam.',
  question = 'HEADLINE 7?',
  caption = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae justo.',
  img = portrait,
  stat1Label = 'STAT 1',
  stat1Value = '00',
  stat2Label = 'STAT 2',
  stat2Value = '00',
  stat3Label = 'STAT 3',
  stat3Value = '00',
  bg,
  fg,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-last-rise]', { y: 14, stagger: 0.08 })

      gsap.from('[data-last-rise]', {
        y: 48,
        opacity: 0,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          end: 'top 30%',
          scrub: 0.5,
        },
      })

      gsap.fromTo(
        '[data-last-img]',
        { yPercent: 8, scale: 1.06 },
        {
          yPercent: -6,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="last"
      className="relative overflow-hidden px-5 py-24 md:px-10 md:py-32"
      style={{ background: bg || '#0a0a0a', color: fg || '#e7e4dc' }}
    >
      <h2
        data-last-rise
        className="font-oswald text-[clamp(2.8rem,10vw,7rem)] leading-[0.9] font-semibold tracking-[-0.02em] uppercase"
      >
        {title}
      </h2>

      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div
            className="relative aspect-[4/5] overflow-hidden"
            style={{ background: 'color-mix(in srgb, currentColor 8%, transparent)' }}
          >
            {img && (
              <img
                data-last-img
                {...imgAttrs(img, variants)}
                sizes="(min-width: 1024px) 40vw, 100vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover will-change-transform"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col justify-end lg:col-span-7 lg:pl-8">
          <p data-last-rise className="text-[11px] tracking-[0.28em] uppercase opacity-55">
            {name}
          </p>
          <p
            data-last-rise
            className="mt-5 max-w-[46ch] text-[15px] leading-relaxed opacity-75 md:text-base"
          >
            {body}
          </p>

          <h3
            data-last-rise
            className="mt-12 font-oswald text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] font-semibold uppercase"
          >
            {question}
          </h3>
          <p data-last-rise className="mt-3 max-w-[36ch] text-sm opacity-60">
            {caption}
          </p>

          <dl
            data-last-rise
            className="mt-12 grid grid-cols-3 gap-4 border-t pt-6"
            style={{ borderColor: 'color-mix(in srgb, currentColor 15%, transparent)' }}
          >
            {[
              [stat1Label, stat1Value],
              [stat2Label, stat2Value],
              [stat3Label, stat3Value],
            ].map(([label, value], i) => (
              <div key={i} className="min-w-0 break-words">
                <dt className="text-[11px] tracking-[0.22em] uppercase opacity-45">
                  {label}
                </dt>
                <dd className="mt-1 font-oswald text-2xl font-semibold uppercase">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

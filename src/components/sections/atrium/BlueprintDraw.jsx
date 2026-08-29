import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * BlueprintDraw — a generic floor plan that traces itself on scrub.
 * No unique building mesh: rooms, a courtyard void, and a north mark.
 */
export default function BlueprintDraw({
  index = '01',
  title = 'Plan before mass',
  body = 'Lines first. A courtyard holds the centre; rooms gather around light. Swap this drawing for your own plan. The motion stays.',
  caption = 'Courtyard house, 1:200',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const paths = gsap.utils.toArray('[data-plan-stroke]')
      paths.forEach((path) => {
        const length = path.getTotalLength()
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: reduced ? 0 : length,
        })
      })
      if (reduced) return

      gsap.to(paths, {
        strokeDashoffset: 0,
        ease: 'none',
        stagger: 0.04,
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
          pin: '[data-plan-pin]',
          anticipatePin: 1,
        },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative h-[220svh] bg-atrium-ink text-atrium-paper">
      <div
        data-plan-pin
        className="flex h-svh flex-col justify-between px-5 py-24 md:flex-row md:items-end md:px-10 md:py-16"
      >
        <div className="max-w-sm">
          <p className="text-[11px] tracking-[0.28em] text-atrium-paper/45 uppercase">
            Drawing
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,4.2rem)] leading-[0.92]">
            {title}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-atrium-paper/65">{body}</p>
        </div>

        <figure className="mt-10 w-full max-w-xl md:mt-0">
          <svg
            viewBox="0 0 640 420"
            className="h-auto w-full"
            fill="none"
            aria-hidden="true"
          >
            <rect
              data-plan-stroke
              x="40"
              y="36"
              width="560"
              height="348"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              data-plan-stroke
              x="72"
              y="68"
              width="220"
              height="140"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              data-plan-stroke
              x="348"
              y="68"
              width="220"
              height="140"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              data-plan-stroke
              x="72"
              y="236"
              width="496"
              height="116"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle
              data-plan-stroke
              cx="320"
              cy="210"
              r="54"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              data-plan-stroke
              d="M320 72v48M292 210h56M72 210h496"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              data-plan-stroke
              d="M40 36h28v28"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              data-plan-stroke
              d="M572 356h28v28"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          <figcaption className="mt-4 text-[11px] tracking-[0.22em] text-atrium-paper/40 uppercase">
            {caption}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

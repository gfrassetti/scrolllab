import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const CX = 720
const CY = 450
const R_IN = 96
const R_OUT = 372
const R_LABEL = 408

/**
 * Ocho hilos que salen del centro con un leve arqueo, como el diagrama de
 * la referencia. Todo se calcula una vez: sin aleatoriedad, el dibujo es el
 * mismo en cada render y en el ZIP que compra el cliente.
 */
const SPOKES = Array.from({ length: 8 }, (_, i) => {
  const deg = -90 + i * 45
  const rad = (deg * Math.PI) / 180
  const bow = ((deg + 20) * Math.PI) / 180
  const p = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  const [x1, y1] = p(R_IN, rad)
  const [cx, cy] = p((R_IN + R_OUT) / 2, bow)
  const [x2, y2] = p(R_OUT, rad)
  const [lx, ly] = p(R_LABEL, rad)
  return {
    id: String(i + 1).padStart(2, '0'),
    d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    lx: Number(lx.toFixed(1)),
    ly: Number(ly.toFixed(1)),
  }
})

/**
 * ClarityPair — the paper/ink hinge of the page. A hairline radial diagram
 * draws itself under a 60px statement; halfway through the pin the field
 * inverts and the second statement takes over (P1 + P13). This is the only
 * hard colour change in ATRIUM, and it happens inside a single pin.
 */
export default function ClarityPair({
  kicker = 'Section label',
  left = 'Placeholder statement',
  right = 'and a second one',
  bodyLeft = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
  bodyRight = 'Ut labore et dolore magna aliqua, ut enim ad minim veniam, quis nostrud exercitation.',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const pin = root.current.querySelector('[data-clarity-pin]')
      const strokes = gsap.utils.toArray('[data-clarity-stroke]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      strokes.forEach((path) => {
        const length = path.getTotalLength()
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: reduced ? 0 : length,
        })
      })

      if (reduced) return

      gsap.set('[data-clarity-b]', { autoAlpha: 0 })
      gsap.set('[data-clarity-body]', { autoAlpha: 0, y: 18 })
      gsap.set('[data-clarity-num]', { autoAlpha: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
        },
      })

      tl.to(strokes, { strokeDashoffset: 0, ease: 'none', stagger: 0.03 }, 0)
      tl.to('[data-clarity-num]', { autoAlpha: 1, stagger: 0.02, ease: 'none' }, 0.12)
      tl.to('[data-clarity-figure]', { rotate: 26, ease: 'none' }, 0)

      tl.to('[data-clarity-ink]', { opacity: 1, ease: 'none' }, 0.46)
      tl.to(pin, { color: '#f4f1ea', ease: 'none' }, 0.46)
      tl.to('[data-clarity-a]', { autoAlpha: 0, ease: 'none' }, 0.46)
      tl.to('[data-clarity-b]', { autoAlpha: 1, ease: 'none' }, 0.58)

      tl.to('[data-clarity-body]', { autoAlpha: 1, y: 0, stagger: 0.06, ease: 'none' }, 0.66)
    },
    { scope: root },
  )

  return (
    <section ref={root} id="practice" className="relative h-[300svh] bg-atrium-ink">
      <div
        data-clarity-pin
        className="sticky top-0 h-svh overflow-hidden text-atrium-ink"
      >
        <div className="absolute inset-0 bg-atrium-paper" />
        <div data-clarity-ink className="absolute inset-0 bg-atrium-ink opacity-0" />

        <div className="relative h-full">
          <svg
            data-clarity-figure
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full will-change-transform"
          >
            {SPOKES.map((s) => (
              <path
                key={s.id}
                data-clarity-stroke
                d={s.d}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                opacity="0.5"
              />
            ))}
            {SPOKES.map((s) => (
              <text
                key={`n-${s.id}`}
                data-clarity-num
                x={s.lx}
                y={s.ly}
                fill="currentColor"
                fontSize="12"
                letterSpacing="0.5"
                textAnchor="middle"
                dominantBaseline="middle"
                opacity="0.6"
              >
                {s.id}
              </text>
            ))}
          </svg>

          {kicker ? (
            <p className="atrium-note absolute top-[13svh] left-5 font-display opacity-65 md:left-10">
              {kicker}
            </p>
          ) : null}

          <div className="absolute inset-0 flex items-center justify-center px-5">
            <h2
              data-clarity-a
              className="atrium-mid max-w-[15ch] text-center text-balance"
            >
              {left}
            </h2>
            <h2
              data-clarity-b
              className="atrium-mid absolute max-w-[15ch] px-5 text-center text-balance"
            >
              {right}
            </h2>
          </div>

          <div className="atrium-note absolute inset-x-5 bottom-[9svh] grid gap-6 opacity-60 md:inset-x-10 md:grid-cols-2 md:gap-24">
            <p data-clarity-body className="md:max-w-[34ch]">
              {bodyLeft}
            </p>
            <p data-clarity-body className="md:max-w-[34ch] md:justify-self-end md:text-right">
              {bodyRight}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

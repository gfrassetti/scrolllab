import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { themeVars } from '../../../lib/themeVars'

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
 *
 * Calma: las dos frases viven una encima de la otra (la segunda es `absolute`
 * y entra cuando el campo se invierte) — sin scrub se veían las dos pisadas.
 * En calma la bisagra papel → tinta son dos bandas en fila: la primera con el
 * diagrama ya trazado, la segunda sobre tinta. Mismo texto, sin pin. La banda
 * del diagrama mide una pantalla (como el pin): el SVG escala con el alto, y
 * en una banda más baja los números quedaban en 9–11 px.
 */
export default function ClarityPair({
  kicker = 'Practice',
  left = 'Clear plans',
  right = 'and honest materials',
  bodyLeft = 'A plan should explain itself: where you come in, where the light falls, where you rest.',
  bodyRight = 'Stone that looks like stone, timber that ages like timber, concrete left as it was poured.',
  /** El papel (fondo del principio) y la tinta (fondo del final): la animación pasa de uno al otro. */
  bg,
  fg,
}) {
  const root = useRef(null)
  const colors = themeVars({ 'atrium-paper': bg, 'atrium-ink': fg })
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-calm-reveal]', { y: 16, stagger: 0.12 })

      const strokes = gsap.utils.toArray('[data-clarity-stroke]')

      strokes.forEach((path) => {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
      })

      // Una sola composición: el texto no se mueve nunca. El papel se vuelve tinta con
      // un velo que sube desde abajo; dentro del velo hay una copia exacta del texto en
      // el color invertido, así el color cambia justo en el borde del velo.
      gsap.set('[data-clarity-b]', { autoAlpha: 0 })
      gsap.set('[data-clarity-body]', { autoAlpha: 0, y: 14 })
      gsap.set('[data-clarity-num]', { autoAlpha: 0 })
      gsap.set('[data-clarity-ink]', { clipPath: 'inset(100% 0% 0% 0%)' })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
        },
      })

      tl.to(strokes, { strokeDashoffset: 0, stagger: 0.03 }, 0)
      tl.to('[data-clarity-num]', { autoAlpha: 1, stagger: 0.02 }, 0.1)
      tl.to('[data-clarity-figure]', { rotate: 26 }, 0)
      tl.to('[data-clarity-body]', { autoAlpha: 1, y: 0, stagger: 0.05 }, 0.2)
      // la segunda frase entra a su lugar (ya reservado) mientras el velo sube
      tl.to('[data-clarity-b]', { autoAlpha: 1 }, 0.42)
      tl.to('[data-clarity-ink]', { clipPath: 'inset(0% 0% 0% 0%)' }, 0.38)
    },
    { scope: root, dependencies: [reduced, bg, fg], revertOnUpdate: true },
  )

  const figure = (
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
          className="text-[18px] sm:text-[12px] lg:text-[13px]"
          letterSpacing="0.5"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity="0.6"
        >
          {s.id}
        </text>
      ))}
    </svg>
  )

  if (reduced) {
    return (
      <section ref={root} id="practice" className="relative" style={colors}>
        <div className="relative flex min-h-svh flex-col justify-center overflow-hidden bg-atrium-paper px-5 py-24 text-atrium-ink md:px-10">
          {figure}
          {kicker ? (
            <p className="atrium-note absolute top-[10svh] left-5 font-display opacity-65 md:left-10">
              {kicker}
            </p>
          ) : null}
          <div data-calm-reveal className="relative flex flex-col items-center gap-10 text-center">
            <h2 className="atrium-mid max-w-[15ch] text-balance">{left}</h2>
            <p className="atrium-note max-sm:text-[14px]! max-w-[34ch] opacity-60">{bodyLeft}</p>
          </div>
        </div>
        <div className="relative flex min-h-[70svh] flex-col justify-center bg-atrium-ink px-5 py-24 text-atrium-paper md:px-10">
          <div data-calm-reveal className="flex flex-col items-center gap-10 text-center">
            <h2 className="atrium-mid max-w-[15ch] text-balance">{right}</h2>
            <p className="atrium-note max-sm:text-[14px]! max-w-[34ch] opacity-60">{bodyRight}</p>
          </div>
        </div>
      </section>
    )
  }

  // La composición completa; se dibuja dos veces (papel y tinta) en el mismo lugar.
  const layer = (
    <div className="relative h-full">
      {figure}

      {kicker ? (
        <p className="atrium-note absolute top-[13svh] left-5 font-display opacity-65 md:left-10">{kicker}</p>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center px-5">
        <h2 className="atrium-mid max-w-[16ch] text-center text-balance">
          <span className="block">{left}</span>
          <span data-clarity-b className="block">
            {right}
          </span>
        </h2>
      </div>

      <div className="atrium-note max-sm:text-[14px]! absolute inset-x-5 bottom-[9svh] grid gap-6 opacity-60 md:inset-x-10 md:grid-cols-2 md:gap-24">
        <p data-clarity-body className="md:max-w-[34ch]">
          {bodyLeft}
        </p>
        <p data-clarity-body className="md:max-w-[34ch] md:justify-self-end md:text-right">
          {bodyRight}
        </p>
      </div>
    </div>
  )

  return (
    <section ref={root} id="practice" className="relative h-[300svh] bg-atrium-ink" style={colors}>
      <div data-clarity-pin className="sticky top-0 h-svh overflow-hidden">
        <div className="absolute inset-0 bg-atrium-paper text-atrium-ink">{layer}</div>
        <div
          data-clarity-ink
          aria-hidden="true"
          className="absolute inset-0 bg-atrium-ink text-atrium-paper"
          style={{ clipPath: 'inset(100% 0% 0% 0%)' }}
        >
          {layer}
        </div>
      </div>
    </section>
  )
}

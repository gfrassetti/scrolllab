import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'

const COLS = 21

/** Posiciones fijas (siempre las mismas): cada columna tiene 2–4 bloques de distinto alto. */
function makeColumns(n) {
  let s = 7
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  return Array.from({ length: n }, () => {
    const count = 2 + Math.floor(rnd() * 3)
    let y = rnd() * 14
    const blocks = []
    for (let b = 0; b < count; b++) {
      const h = 8 + rnd() * 24
      blocks.push({ top: Math.min(y, 94 - h), h })
      y += h + 6 + rnd() * 16
    }
    return { blocks, dir: rnd() > 0.5 ? 1 : -1, shift: 12 + rnd() * 22 }
  })
}
const COLUMNS = makeColumns(COLS)

/**
 * VisionShutter — the transition between "what we do" and the projects: a white
 * field cut by vertical columns of black blocks. The blocks draw in, the columns
 * slide past each other, and then every column fills until the whole screen is
 * black — the colour of the next section. The pinned stage is a child of the
 * section (CSS sticky), so the section stays a normal block in the builder.
 */
export default function VisionShutter({
  kicker = 'Selected work',
  line = 'Twelve years, forty-one houses, one idea: build less, and build it well.',
  /** Nombre de la sección para lectores de pantalla. */
  regionLabel = 'Transition to the projects',
  /** Fondo y texto de cierre; los bloques; el color con que cierra (el de la sección siguiente). */
  bg = '#ffffff',
  fg = '#111111',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const cols = gsap.utils.toArray('[data-bars-col]')
      const blocks = gsap.utils.toArray('[data-bars-block]')
      const fills = gsap.utils.toArray('[data-bars-fill]')
      const copy = root.current.querySelectorAll('[data-bars-copy] > *')

      if (prefersReducedMotion()) {
        gsap.set(blocks, { scaleY: 1 })
        gsap.set(fills, { scaleY: 1 })
        gsap.set(copy, { autoAlpha: 1 })
        return undefined
      }

      gsap.set(blocks, { scaleY: 0 })
      gsap.set(fills, { scaleY: 0 })
      gsap.set(copy, { autoAlpha: 0, y: 24 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
      })
      // 1 · los bloques se dibujan, columna por columna
      tl.to(blocks, { scaleY: 1, duration: 0.3, stagger: { amount: 0.28, from: 'start' } }, 0)
      // 2 · las columnas se cruzan en vertical
      cols.forEach((col, i) => {
        const c = COLUMNS[i]
        tl.to(col, { yPercent: c.dir * c.shift, duration: 0.45 }, 0.3)
      })
      // 3 · cada columna se llena hasta cerrar en negro; el texto sube sobre el cierre
      tl.to(fills, { scaleY: 1, duration: 0.25, stagger: { amount: 0.2, from: 'center' } }, 0.7)
      tl.to(copy, { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.04 }, 0.86)
      return undefined
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      aria-label={regionLabel}
      data-tone="mixed"
      className="relative h-[320vh] overflow-clip calm:h-svh"
      style={{ backgroundColor: bg, color: bg }}
    >
      <div className="sticky top-0 h-svh w-full overflow-clip calm:static">
        <div
          className="absolute inset-0 grid [--cols:9] md:[--cols:21]"
          style={{ gridTemplateColumns: 'repeat(var(--cols), minmax(0, 1fr))' }}
          aria-hidden="true"
        >
          {COLUMNS.map((c, i) => (
            <div
              key={i}
              data-bars-col
              className={`relative h-full will-change-transform ${i >= 9 ? 'max-md:hidden' : ''}`}
            >
              {c.blocks.map((b, j) => (
                <span
                  key={j}
                  data-bars-block
                  className="absolute inset-x-0 origin-top"
                  style={{ top: `${b.top}%`, height: `${b.h}%`, backgroundColor: fg }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* El cierre vive fuera de las columnas que se mueven: llena el alto exacto. */}
        <div
          className="absolute inset-0 grid [--cols:9] md:[--cols:21]"
          style={{ gridTemplateColumns: 'repeat(var(--cols), minmax(0, 1fr))' }}
          aria-hidden="true"
        >
          {COLUMNS.map((c, i) => (
            <span
              key={i}
              data-bars-fill
              className={`block h-full ${i % 2 ? 'origin-top' : 'origin-bottom'} ${i >= 9 ? 'max-md:hidden' : ''}`}
              style={{ backgroundColor: fg }}
            />
          ))}
        </div>

        <div
          data-bars-copy
          className="relative z-10 flex h-full flex-col items-start justify-end gap-5 px-5 pb-16 md:px-8 md:pb-24"
          style={{ color: bg }}
        >
          <p className="text-sm font-medium">{kicker}</p>
          <p className="max-w-[44rem] text-[clamp(1.8rem,4.4vw,4rem)] leading-[1.05] font-medium tracking-[-0.04em] text-balance">
            {line}
          </p>
        </div>
      </div>
    </section>
  )
}

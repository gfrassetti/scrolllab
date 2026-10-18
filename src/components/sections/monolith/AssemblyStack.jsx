import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { themeVars } from '../../../lib/themeVars'

const defaultLayers = [
  { name: 'Footing', spec: 'Raw steel plate, 12 mm, levelled on site' },
  { name: 'Core', spec: 'Fibre concrete, poured in one go, 28 days to cure' },
  { name: 'Slab', spec: 'Sanded top, sealed twice, never painted' },
  { name: 'Signal', spec: 'One surface in Klein blue — every piece has one' },
]

// Alto de cada capa en unidades (--u), de abajo hacia arriba. La última es la «señal».
const HEIGHTS = [0.8, 11, 1.2, 0.45]

/**
 * AssemblyStack — how a piece is built, drawn in isometric: the layers drop
 * one by one onto the footing as you scroll (pinned), each with its callout,
 * until the monolith is standing. The boxes are plain CSS 3D (three faces
 * each), so the block follows the section's colours and needs no assets.
 *
 * Se pincha el contenido (`[data-assembly-pin]`), no la sección.
 *
 * Calma: la pieza aparece armada y las capas se leen como lista.
 */
export default function AssemblyStack({
  unit = '04',
  total = '07',
  label = 'How it stands',
  unitLabel = 'Unit',
  title = 'Four layers, no glue.',
  layers,
  bg,
  fg,
  accent,
}) {
  const root = useRef(null)
  const [active, setActive] = useState(-1)
  const valid = layers?.filter((l) => l?.name || l?.spec)
  const rows = (valid?.length ? valid : defaultLayers).slice(0, HEIGHTS.length)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        setActive(rows.length - 1)
        return calmReveal('[data-layer-label]', { y: 16, stagger: 0.08 })
      }
      const boxes = gsap.utils.toArray('[data-layer-box]', root.current)
      const labels = gsap.utils.toArray('[data-layer-label]', root.current)
      let last = -2
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=240%',
          pin: root.current.querySelector('[data-assembly-pin]'),
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (self) => {
            const idx = Math.min(rows.length - 1, Math.floor(self.progress * (rows.length + 0.6)) - 1)
            if (idx !== last) {
              last = idx
              setActive(idx)
            }
          },
        },
      })
      boxes.forEach((box, i) => {
        // cada capa cae desde arriba y se apoya; la que viene tapa a la anterior
        tl.from(box, { z: '+=200', autoAlpha: 0, duration: 1, ease: 'power2.in' }, i * 1.05)
      })
      tl.from(labels, { autoAlpha: 0, x: 24, stagger: 1.05, duration: 0.5 }, 0.4)
      tl.to('[data-assembly-stage]', { rotationZ: -32, duration: tl.duration(), ease: 'none' }, 0)
    },
    { scope: root, dependencies: [rows.length], revertOnUpdate: true },
  )

  // Altura acumulada de cada capa (en --u)
  const base = HEIGHTS.map((_, i) => HEIGHTS.slice(0, i).reduce((a, b) => a + b, 0))

  return (
    <section
      ref={root}
      style={{
        backgroundColor: bg || undefined,
        color: fg || undefined,
        ...themeVars({ carbon: fg, klein: accent, concrete: bg }),
      }}
    >
      <div
        data-assembly-pin
        className="flex min-h-svh flex-col overflow-hidden px-5 pt-20 pb-10 md:px-8 md:pt-24"
      >
        <div className="flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
          <p>
            {unitLabel} {unit} / {total}
          </p>
          <p>{label}</p>
        </div>

        <h2 className="mt-6 max-w-[12ch] font-anton text-[clamp(2.4rem,6.5vw,5.5rem)] leading-[0.9] uppercase">
          {title}
        </h2>

        <div className="grid flex-1 items-center gap-6 md:grid-cols-12">
          {/* La pieza, en isométrica */}
          <div className="relative flex h-[42svh] items-center justify-center md:col-span-7 md:h-full" aria-hidden="true">
            <div
              data-assembly-stage
              className="relative [--u:min(3.6vw,2.6svh)] md:[--u:min(2.2vw,3.4svh)]"
              style={{
                width: 'calc(var(--u) * 7)',
                height: 'calc(var(--u) * 7)',
                transformStyle: 'preserve-3d',
                transform: 'translateY(calc(var(--u) * 6)) rotateX(58deg) rotateZ(-45deg)',
              }}
            >
              {/* sombra en el piso */}
              <div className="absolute inset-[-12%] bg-carbon opacity-10" />
              {rows.map((_, i) => {
                const signal = i === HEIGHTS.length - 1
                const h = `calc(var(--u) * ${HEIGHTS[i]})`
                const inset = signal ? '8%' : i === 0 ? '-8%' : '0%'
                return (
                  <div
                    key={i}
                    data-layer-box
                    className="absolute"
                    style={{
                      inset,
                      transformStyle: 'preserve-3d',
                      transform: `translateZ(calc(var(--u) * ${base[i]}))`,
                    }}
                  >
                    {/* tapa */}
                    <div
                      className={`absolute inset-0 border-2 border-carbon ${signal ? 'bg-klein' : 'bg-concrete'}`}
                      style={{ transform: `translateZ(${h})` }}
                    />
                    {/* frente */}
                    <div
                      className="absolute left-0 top-full w-full origin-top border-2 border-carbon"
                      style={{
                        height: h,
                        transform: 'rotateX(90deg)',
                        background: signal
                          ? 'color-mix(in srgb, var(--color-klein) 78%, var(--color-carbon))'
                          : 'color-mix(in srgb, var(--color-concrete) 78%, var(--color-carbon))',
                      }}
                    />
                    {/* costado */}
                    <div
                      className="absolute left-0 top-0 h-full origin-left border-2 border-carbon"
                      style={{
                        width: h,
                        transform: 'rotateY(-90deg)',
                        background: signal
                          ? 'color-mix(in srgb, var(--color-klein) 62%, var(--color-carbon))'
                          : 'color-mix(in srgb, var(--color-concrete) 62%, var(--color-carbon))',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Las capas, de arriba hacia abajo como se leen en un plano */}
          <ol className="md:col-span-5">
            {rows
              .map((layer, i) => ({ layer, i }))
              .reverse()
              .map(({ layer, i }) => (
                <li
                  key={i}
                  data-layer-label
                  className={`grid grid-cols-[2.5rem_1fr] gap-3 border-t-2 border-carbon py-3 transition-colors duration-300 md:py-4 ${
                    active === i ? 'text-klein' : ''
                  }`}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block font-anton text-[clamp(1.6rem,3.4vw,2.8rem)] leading-none uppercase">
                      {layer.name}
                    </span>
                    <span className="mt-1 block font-mono text-sm leading-relaxed text-carbon/80">
                      {layer.spec}
                    </span>
                  </span>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

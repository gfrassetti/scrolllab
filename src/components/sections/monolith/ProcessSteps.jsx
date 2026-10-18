import { useRef, useState } from 'react'
import { ScrollTrigger, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { themeVars } from '../../../lib/themeVars'

const defaultSteps = [
  {
    title: 'Brief',
    time: 'Week 1',
    body: 'You send the room, the load it has to carry and the date. We reply with a first sketch and a price range.',
  },
  {
    title: 'Model',
    time: 'Weeks 2 – 3',
    body: 'A model at 1:20 in clay and foam, and a drawing you can mark up with a pen. Nothing is cut until you sign it.',
  },
  {
    title: 'Mould',
    time: 'Weeks 3 – 5',
    body: 'Milled in aluminium in our own shop, so the same piece can be cast again, identical, years from now.',
  },
  {
    title: 'Pour',
    time: 'Weeks 5 – 8',
    body: 'Fibre concrete poured in one go, then cured for twenty-eight days under damp cloth. It cannot be hurried.',
  },
  {
    title: 'Install',
    time: 'Weeks 9 – 10',
    body: 'Our crew delivers, levels and fixes it in place, and signs the underside. You get the mould drawings.',
  },
]

/**
 * ProcessSteps — how a piece gets made, step by step. A mould on the left
 * fills with concrete as the scroll goes down the five steps on the right; the
 * step in the middle of the screen is the one at full strength and the counter
 * follows it. The mould is plain CSS (`--p` on the section), so it also works
 * in the builder preview and in a LAB widget.
 *
 * Calma: sin la banda de progreso — los cinco pasos entran con un fundido y
 * quedan todos legibles; el molde se muestra lleno.
 */
export default function ProcessSteps({
  unit = '05',
  total = '05',
  label = 'How it is made',
  unitLabel = 'Unit',
  title = 'From sketch to site.',
  cureLabel = 'Cure',
  /** Ancla de la sección, si un link apunta acá. */
  id = 'process',
  steps,
  bg,
  fg,
  accent,
  /** El molde que se llena de hormigón a un costado. */
  showMould = 'on',
}) {
  const root = useRef(null)
  const [active, setActive] = useState(0)
  const valid = steps?.filter((s) => s?.title || s?.body)
  const rows = valid?.length ? valid : defaultSteps
  const mould = showMould !== 'off'

  useGSAP(
    () => {
      const section = root.current
      if (!section) return
      if (prefersReducedMotion()) {
        section.style.setProperty('--p', '1')
        return calmReveal('[data-step]', { y: 20, stagger: 0.1 })
      }

      const list = section.querySelector('[data-steps]')
      const triggers = [
        // el molde sigue el recorrido de la lista entera
        ScrollTrigger.create({
          trigger: list,
          start: 'top 62%',
          end: 'bottom 62%',
          onUpdate: (self) => section.style.setProperty('--p', self.progress.toFixed(4)),
        }),
        // el paso que cruza el medio de la pantalla es el activo
        ...Array.from(section.querySelectorAll('[data-step]')).map((el, i) =>
          ScrollTrigger.create({
            trigger: el,
            start: 'top 58%',
            end: 'bottom 58%',
            onToggle: (self) => {
              if (self.isActive) setActive(i)
            },
          }),
        ),
      ]
      return () => triggers.forEach((t) => t.kill())
    },
    { scope: root, dependencies: [rows.length], revertOnUpdate: true },
  )

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <section
      ref={root}
      id={id}
      className="px-5 py-20 md:px-8 md:py-32"
      style={{
        '--p': 0,
        backgroundColor: bg || undefined,
        color: fg || undefined,
        ...themeVars({ carbon: fg, klein: accent, concrete: bg }),
      }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:mb-16 md:text-xs">
        <p>
          {unitLabel} {unit} / {total}
        </p>
        <p>{label}</p>
      </div>

      <h2 className="mb-10 max-w-[14ch] font-anton text-[clamp(2.4rem,7vw,6rem)] leading-[0.9] uppercase md:mb-16">
        {title}
      </h2>

      <div className="grid gap-8 md:grid-cols-12 md:gap-12">
        {mould && (
          <div className="sticky top-16 z-10 -mx-5 bg-concrete px-5 pb-3 md:top-24 md:z-0 md:mx-0 md:col-span-5 md:self-start md:bg-transparent md:px-0 md:pb-0">
            <div className="relative h-20 overflow-hidden border-2 border-carbon bg-concrete md:h-[54svh]">
              {/* el hormigón: sube en pantalla ancha, avanza en el teléfono */}
              <div
                aria-hidden="true"
                data-mould-fill
                className="absolute bottom-0 left-0 h-full w-[calc(var(--p)*100%)] bg-carbon md:h-[calc(var(--p)*100%)] md:w-full"
              />
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-[calc(var(--p)*100%-4px)] h-full w-1 bg-klein md:left-0 md:bottom-[calc(var(--p)*100%-4px)] md:h-1 md:w-full"
              />
              <p className="absolute top-2 left-3 font-mono text-[11px] uppercase tracking-[0.1em] text-concrete mix-blend-difference md:top-3 md:left-4 md:text-xs">
                {cureLabel}
              </p>
              <p className="absolute right-3 bottom-1 font-anton text-[clamp(3.2rem,7vw,7rem)] leading-none uppercase text-concrete mix-blend-difference md:right-4 md:bottom-3">
                {pad(Math.min(active + 1, rows.length))}
                <span className="text-[0.4em]">/{pad(rows.length)}</span>
              </p>
            </div>
          </div>
        )}

        <ol data-steps className={mould ? 'md:col-span-7' : 'md:col-span-12'}>
          {rows.map((step, i) => (
            <li
              key={i}
              data-step
              data-active={active === i ? 'true' : 'false'}
              className="group border-t-2 border-carbon py-8 transition-opacity duration-500 ease-out last:border-b-2 data-[active=false]:opacity-35 md:min-h-[44svh] md:py-12"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
                {pad(i + 1)}
                {step.time ? <span className="ml-4 opacity-60">{step.time}</span> : null}
              </p>
              <h3 className="mt-3 font-anton text-[clamp(2.6rem,9vw,7.5rem)] leading-[0.9] uppercase transition-colors duration-300 group-data-[active=true]:text-klein">
                {step.title}
              </h3>
              <p className="mt-5 max-w-[44ch] font-mono text-sm leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

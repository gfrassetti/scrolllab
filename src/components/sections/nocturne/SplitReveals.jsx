import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { pointerFx } from '../../../lib/interact'
import { imgAttrs } from '../../../lib/responsiveImage'
import { beatDiner, beatRoad, beatRoof, variants } from './assets/images'
import { themeVars } from '../../../lib/themeVars'

const defaultBeats = [
  {
    kicker: 'Beat 01',
    title: 'Last order',
    body: 'A diner at 3 a.m., one waitress, one customer. One take, with the street lights as our only key.',
    img: beatDiner,
  },
  {
    kicker: 'Beat 02',
    title: 'The coast road',
    body: 'Forty kilometres of wet asphalt, a camera car and a city that never quite goes dark.',
    img: beatRoad,
  },
  {
    kicker: 'Beat 03',
    title: 'Rooftop, blue hour',
    body: 'Twelve minutes of usable light between sunset and night. We had one chance, and we took it.',
    img: beatRoof,
  },
]

/**
 * SplitReveals — alternating image/text rows. Images reveal with a
 * clip-path wipe; text slides up. Direction flips on every row.
 *
 * Calma: foto y texto de cada fila entran con un fundido (sin el wipe).
 */
export default function SplitReveals({
  seq = '03',
  total = '06',
  label = 'The frames',
  seqLabel = 'Seq.',
  beats,
  /** Ancla de la sección: el nav apunta acá. */
  id = 'frames',
  bg,
  fg,
  accent,
  /** Cada foto se inclina hacia el puntero y se acerca un poco. */
  showHover = 'on',
}) {
  const root = useRef(null)
  // `beats` editable trae solo kicker/title/body (la imagen del embed viene
  // stubeada); la imagen por defecto se toma por índice del set de ejemplo.
  const rows =
    Array.isArray(beats) && beats.length
      ? beats.map((b, i) => ({
          ...b,
          img: b.img || defaultBeats[i % defaultBeats.length].img,
        }))
      : defaultBeats

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        return calmReveal('[data-beat-img], [data-beat-copy]', {
          y: 20,
          stagger: 0.12,
          duration: 0.9,
        })
      }

      gsap.utils.toArray('[data-beat]').forEach((row, i) => {
        const fromLeft = i % 2 === 0
        const img = row.querySelector('[data-beat-img]')
        const copy = row.querySelector('[data-beat-copy]')

        gsap.from(img, {
          clipPath: fromLeft ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)',
          duration: 1.2,
          ease: 'power4.inOut',
          scrollTrigger: { trigger: row, start: 'top 70%', once: true },
        })
        gsap.from(copy, {
          y: 40,
          opacity: 0,
          duration: 1,
          delay: 0.35,
          ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 70%', once: true },
        })

        // Paralaje: la foto se mueve dentro de su marco, el texto y el número
        // gigante a otras velocidades — tres planos por fila.
        const scrub = {
          trigger: row,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        }
        gsap.fromTo(
          row.querySelector('[data-beat-photo]'),
          { yPercent: -9 },
          { yPercent: 9, ease: 'none', scrollTrigger: scrub },
        )
        gsap.fromTo(
          row.querySelector('[data-beat-float]'),
          { y: 70 },
          { y: -70, ease: 'none', scrollTrigger: { ...scrub } },
        )
        gsap.fromTo(
          row.querySelector('[data-beat-num]'),
          { yPercent: 40 },
          { yPercent: -40, ease: 'none', scrollTrigger: { ...scrub } },
        )
      })

      if (showHover === 'off') return
      const fx = pointerFx(root.current)
      fx.tilt(gsap.utils.toArray('[data-beat-img]', root.current), {
        max: 3.5,
        scale: 1.015,
      })
      return fx.dispose
    },
    { scope: root, dependencies: [showHover] },
  )

  return (
    <section
      ref={root}
      id={id}
      className="overflow-hidden px-5 py-24 md:px-10 md:py-36"
      style={{
        backgroundColor: bg || undefined,
        color: fg || undefined,
        ...themeVars({ salt: fg, acid: accent, noir: bg }),
      }}
    >
      <div className="mb-14 flex items-baseline justify-between border-t border-salt/20 pt-4 md:mb-24">
        <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
          {seqLabel} {seq} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
      </div>

      <div className="space-y-20 md:space-y-32">
        {rows.map((beat, i) => (
          <div key={i} data-beat className="relative grid items-center gap-8 md:grid-cols-2 md:gap-16">
            {/* el número de la toma, gigante y en contorno, detrás de todo */}
            <span
              data-beat-num
              aria-hidden="true"
              className={`pointer-events-none absolute -top-[0.35em] font-brico text-[34vw] leading-none font-extrabold text-transparent select-none md:text-[22vw] ${
                i % 2 === 1 ? 'left-0' : 'right-0'
              }`}
              style={{
                WebkitTextStroke: `1px color-mix(in srgb, ${fg || 'var(--color-salt)'} 16%, transparent)`,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div
              data-beat-img
              className={`relative aspect-4/3 w-full overflow-hidden ${i % 2 === 1 ? 'md:order-2' : ''}`}
            >
              <img
                data-beat-photo
                {...imgAttrs(beat.img, variants)}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover"
              />
            </div>
            <div data-beat-float className="relative">
              <div data-beat-copy className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-acid md:text-xs">{beat.kicker}</p>
                <h3 className="font-brico text-[clamp(2rem,5vw,4.2rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
                  {beat.title}
                </h3>
                <p className="max-w-[42ch] text-sm leading-relaxed text-salt/60 md:text-base">{beat.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

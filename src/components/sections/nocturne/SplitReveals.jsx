import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultBeats = [
  {
    kicker: 'Beat 01',
    title: 'Placeholder frame',
    body: 'Generic copy for the first beat. The image wipes in from the side like a projector shutter opening.',
    img: 'https://picsum.photos/seed/noct-a/1200/900',
  },
  {
    kicker: 'Beat 02',
    title: 'Counter frame',
    body: 'Alternate rows flip direction to keep the eye moving. Replace image and words, keep the rhythm.',
    img: 'https://picsum.photos/seed/noct-b/1200/900',
  },
  {
    kicker: 'Beat 03',
    title: 'Closing frame',
    body: 'End the sequence on your strongest visual. Everything here is placeholder by design.',
    img: 'https://picsum.photos/seed/noct-c/1200/900',
  },
]

/**
 * SplitReveals — alternating image/text rows. Images reveal with a
 * clip-path wipe; text slides up. Direction flips on every row.
 */
export default function SplitReveals({
  seq = '03',
  total = '06',
  label = 'The frames',
  beats,
  bg,
  fg,
}) {
  const root = useRef(null)
  // `beats` editable trae solo kicker/title/body (la imagen del embed viene
  // stubeada); la imagen por defecto se toma por índice del set de ejemplo.
  const rows =
    Array.isArray(beats) && beats.length
      ? beats.map((b, i) => ({ ...b, img: b.img || defaultBeats[i % defaultBeats.length].img }))
      : defaultBeats

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.utils.toArray('[data-beat]').forEach((row, i) => {
        const fromLeft = i % 2 === 0
        const img = row.querySelector('[data-beat-img]')
        const copy = row.querySelector('[data-beat-copy]')

        gsap.from(img, {
          clipPath: fromLeft
            ? 'inset(0 100% 0 0)'
            : 'inset(0 0 0 100%)',
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
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="px-5 py-24 md:px-10 md:py-36"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <div className="mb-14 flex items-baseline justify-between border-t border-salt/20 pt-4 md:mb-24">
        <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
          Seq. {seq} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
      </div>

      <div className="space-y-20 md:space-y-32">
        {rows.map((beat, i) => (
          <div
            key={i}
            data-beat
            className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
          >
            <img
              data-beat-img
              src={beat.img}
              alt=""
              loading="lazy"
              className={`aspect-4/3 w-full object-cover ${i % 2 === 1 ? 'md:order-2' : ''}`}
            />
            <div data-beat-copy className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-acid md:text-xs">
                {beat.kicker}
              </p>
              <h3 className="font-brico text-[clamp(2rem,5vw,4.2rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
                {beat.title}
              </h3>
              <p className="max-w-[42ch] text-sm leading-relaxed text-salt/60 md:text-base">
                {beat.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

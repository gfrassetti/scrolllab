import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { workSet, workCoat, workTrails, workNeon, beatDiner, beatRoof, variants } from './assets/images'

const defaultShots = [
  { img: workSet, title: 'Rain on Glass', meta: 'Commercial — 2026' },
  { img: workCoat, title: 'The Long Coat', meta: 'Short film — 2025' },
  { img: beatDiner, title: 'Last Order', meta: 'Short film — 2025' },
  { img: workTrails, title: 'Red Lines', meta: 'Music video — 2025' },
  { img: beatRoof, title: 'Blue Hour', meta: 'Commercial — 2024' },
  { img: workNeon, title: 'Neon Tide', meta: 'Photography — 2024' },
]

const pad = (n) => String(Math.floor(n)).padStart(2, '0')

/**
 * ZoomPortal — the reel. A strip of 35 mm film runs across the screen as you
 * scroll (pinned): sprocket holes, edge numbers, one still per frame. The frame
 * that crosses the gate in the middle grows and takes its colour while the
 * others stay small and grey, and its title — big, under the strip — changes
 * with a wipe. A timecode runs with the film.
 *
 * Every shot (photo, title, line) is a field.
 *
 * Calma: sin pin — la tira queda quieta y se recorre con el dedo; cada título
 * va debajo de su cuadro.
 */
export default function ZoomPortal({
  seqLabel = 'Seq.',
  seq = '02',
  total = '06',
  label = 'The reel',
  endCaption = 'Every film we shot this year, one frame each. Scroll to run the reel.',
  /** Ancla de la sección, si un link apunta acá. */
  id = 'screening-room',
  shots,
  /** El código que va impreso en el borde de la película. */
  edgeCode = 'NOCTURNE 5219',
  bg,
  fg,
  accent,
}) {
  const root = useRef(null)
  const [shot, setShot] = useState(0)
  const valid = shots?.filter((s) => s?.img || s?.title)
  const reel = valid?.length
    ? valid.slice(0, 8).map((s, i) => ({ ...s, img: s.img || defaultShots[i % defaultShots.length].img }))
    : defaultShots

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-reel-frame]', { y: 14, stagger: 0.06 })
      const q = (s) => root.current.querySelector(s)
      const strip = q('[data-strip]')
      const frames = gsap.utils.toArray('[data-reel-frame]', root.current)
      const timecode = q('[data-timecode]')

      // de «el primer cuadro en el centro» a «el último en el centro»
      const center = (el) => el.offsetLeft + el.offsetWidth / 2
      const from = () => window.innerWidth / 2 - center(frames[0])
      const to = () => window.innerWidth / 2 - center(frames[frames.length - 1])
      let last = -1
      // el cuadro en la ventanilla crece y toma color; los otros quedan chicos y grises
      const update = () => {
        const mid = window.innerWidth / 2
        frames.forEach((frame, i) => {
          const r = frame.getBoundingClientRect()
          const k = Math.max(0, 1 - Math.abs(r.left + r.width / 2 - mid) / r.width)
          const photo = frame.firstElementChild
          photo.style.transform = `scale(${0.82 + k * 0.18})`
          photo.style.filter = `grayscale(${1 - k}) brightness(${0.55 + k * 0.45})`
          if (k > 0.5 && i !== last) {
            last = i
            setShot(i)
          }
        })
      }
      gsap.fromTo(
        strip,
        { x: from },
        {
          x: to,
          ease: 'none',
          onUpdate: update,
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.7,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const secs = self.progress * 96
              if (timecode) timecode.textContent = `00:${pad(secs / 60)}:${pad(secs % 60)}:${pad((secs % 1) * 24)}`
            },
          },
        },
      )
      update()
    },
    { scope: root, dependencies: [reel.length], revertOnUpdate: true },
  )

  // la línea de agujeros de arrastre, arriba y abajo de la tira
  const sprockets = (
    <div
      aria-hidden="true"
      className="h-[2.4vmin] min-h-3 w-full"
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0 30%, color-mix(in srgb, var(--color-salt) 80%, transparent) 30% 70%, transparent 70%)',
        backgroundSize: '3.6vmin 100%',
        maskImage: 'linear-gradient(to bottom, transparent 24%, black 24%, black 76%, transparent 76%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 24%, black 24%, black 76%, transparent 76%)',
      }}
    />
  )

  return (
    <section
      ref={root}
      id={id}
      className="relative h-[420vh] calm:h-auto"
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--color-noir': bg || undefined,
        '--color-salt': fg || undefined,
        '--color-acid': accent || undefined,
      }}
    >
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden bg-noir text-salt calm:static calm:h-auto calm:py-24">
        <div className="absolute inset-x-0 top-16 mx-5 flex items-baseline justify-between border-t border-salt/20 pt-4 md:top-20 md:mx-10 calm:static calm:mb-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-salt/60 md:text-xs">
            {seqLabel} {seq} / {total}
          </p>
          <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
        </div>

        {/* la tira de película */}
        <div className="calm:overflow-x-auto">
          <div data-strip className="flex w-max flex-col bg-[color-mix(in_srgb,var(--color-noir)_65%,black)] will-change-transform">
            {sprockets}
            <div className="flex gap-[1.6vmin] px-[1.6vmin]">
              {reel.map((s, i) => (
                <figure key={i} data-reel-frame className="relative w-[min(62vw,40svh)] shrink-0 sm:w-[min(44vw,40svh)] md:w-[min(30vw,40svh)]">
                  <div className="relative aspect-[4/5] overflow-hidden will-change-transform">
                    <img
                      {...imgAttrs(s.img, variants)}
                      sizes="(min-width: 768px) 30vw, 62vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-1 flex justify-between gap-4 font-mono text-[11px] tracking-[0.2em] text-acid/80 uppercase">
                    <span>
                      {edgeCode} ▸ {pad(i + 1)}A
                    </span>
                    <span className="hidden text-salt calm:inline">{s.title}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            {sprockets}
          </div>
        </div>

        {/* el título del cuadro que está en la ventanilla */}
        <div className="mx-5 mt-6 flex items-end justify-between gap-6 md:mx-10 md:mt-8 calm:hidden">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-acid md:text-xs">
              {pad(shot + 1)} / {pad(reel.length)}
            </p>
            <div className="overflow-hidden">
              <p
                key={shot}
                className="animate-[reel-title_0.6s_cubic-bezier(.2,.8,.2,1)_both] font-brico text-[clamp(2rem,6vw,5rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
              >
                {reel[shot]?.title}
              </p>
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-salt/70 md:text-xs">{reel[shot]?.meta}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="hidden max-w-[30ch] text-[11px] uppercase tracking-[0.3em] text-salt/60 md:block md:text-xs">
              {endCaption}
            </p>
            <p data-timecode className="mt-3 font-mono text-[11px] tracking-[0.15em] text-salt/80 tabular-nums md:text-xs">
              00:00:00:00
            </p>
          </div>
        </div>
        <style>{'@keyframes reel-title{from{transform:translateY(105%)}to{transform:translateY(0)}}'}</style>
      </div>
    </section>
  )
}

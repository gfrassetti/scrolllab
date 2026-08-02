import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultWorlds = [
  {
    name: 'FLAVOR 01',
    tagline: 'Placeholder tagline one',
    body: 'Placeholder world copy. Each flavor owns the stage — bg, illustration and type crossfade on one scroll progress.',
    bg: '#ffb02e',
    ink: '#241352',
    accent: '#fff3e2',
  },
  {
    name: 'FLAVOR 02',
    tagline: 'Placeholder tagline two',
    body: 'Swap this text for your own flavor story — the color morph is the show, the words are yours.',
    bg: '#ff3ea5',
    ink: '#241352',
    accent: '#ffe0f0',
  },
  {
    name: 'FLAVOR 03',
    tagline: 'Placeholder tagline three',
    body: 'Three layers move as one: wash, blob art, and copy. Reduced-motion visitors get solid panels.',
    bg: '#3ddc97',
    ink: '#241352',
    accent: '#d8fff0',
  },
  {
    name: 'FLAVOR 04',
    tagline: 'Placeholder tagline four',
    body: 'A darker world to close the ride. Hold the beat, then release into benefits below.',
    bg: '#241352',
    ink: '#fff3e2',
    accent: '#5b3df0',
  },
]

/**
 * FlavorWorlds — pinned stage; one scrub progress crossfades
 * (1) background wash (2) illustration blobs (3) copy per flavor.
 */
export default function FlavorWorlds({
  eyebrow = 'Section eyebrow',
  worlds = defaultWorlds,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const panels = gsap.utils.toArray('[data-world]', root.current)
      const washes = gsap.utils.toArray('[data-world-wash]', root.current)
      const arts = gsap.utils.toArray('[data-world-art]', root.current)

      if (reduced || panels.length === 0) {
        panels.forEach((panel, i) => {
          gsap.set(panel, { opacity: i === 0 ? 1 : 0 })
          if (washes[i]) {
            washes[i].style.backgroundColor = worlds[i]?.bg || '#241352'
            washes[i].style.opacity = i === 0 ? 1 : 0
          }
        })
        if (root.current && worlds[0]) {
          root.current.style.backgroundColor = worlds[0].bg
          root.current.style.color = worlds[0].ink
        }
        return
      }

      gsap.set(panels, { opacity: 0 })
      gsap.set(washes, { opacity: 0 })
      gsap.set(arts, { opacity: 0, scale: 0.75, rotate: -12 })
      gsap.set(panels[0], { opacity: 1 })
      gsap.set(washes[0], { opacity: 1 })
      gsap.set(arts[0], { opacity: 0.9, scale: 1, rotate: 0 })
      if (root.current && worlds[0]) {
        root.current.style.color = worlds[0].ink
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${Math.max(worlds.length, 1) * 100}%`,
          pin: true,
          scrub: 0.55,
          anticipatePin: 1,
        },
      })

      // Intro hold on first world
      tl.to({}, { duration: 0.35 })

      for (let i = 0; i < worlds.length - 1; i += 1) {
        const next = i + 1
        const nextInk = worlds[next]?.ink || '#241352'

        // Layer 1 — background wash crossfade
        tl.to(washes[i], { opacity: 0, duration: 0.55 }, `world-${i}`)
        tl.fromTo(
          washes[next],
          { opacity: 0 },
          { opacity: 1, duration: 0.55 },
          `world-${i}`,
        )

        // Layer 2 — illustration blob exit / enter
        tl.to(
          arts[i],
          { opacity: 0, scale: 1.25, rotate: 18, duration: 0.5 },
          `world-${i}`,
        )
        tl.fromTo(
          arts[next],
          { opacity: 0, scale: 0.7, rotate: -16 },
          { opacity: 0.95, scale: 1, rotate: 6, duration: 0.55 },
          `world-${i}+=0.08`,
        )

        // Layer 3 — copy swap
        tl.to(
          panels[i],
          { opacity: 0, y: -28, duration: 0.35 },
          `world-${i}+=0.05`,
        )
        tl.fromTo(
          panels[next],
          { opacity: 0, y: 36 },
          { opacity: 1, y: 0, duration: 0.4 },
          `world-${i}+=0.18`,
        )
        tl.to(
          root.current,
          { color: nextInk, duration: 0.45 },
          `world-${i}`,
        )

        // Hold beat so the world reads before the next dive
        tl.to({}, { duration: 0.4 })
      }

      // Soft exit lift on last art
      tl.to(
        arts[worlds.length - 1],
        { scale: 1.12, rotate: 10, duration: 0.35 },
        '+=0.05',
      )
    },
    { scope: root, dependencies: [worlds] },
  )

  return (
    <section
      ref={root}
      className="relative overflow-hidden"
      style={{ backgroundColor: worlds[0]?.bg || '#241352', color: worlds[0]?.ink }}
    >
      {/* Layer 1 — stacked color washes */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {worlds.map((world, i) => (
          <div
            key={`wash-${world.name}`}
            data-world-wash
            className="absolute inset-0"
            style={{ backgroundColor: world.bg, opacity: i === 0 ? 1 : 0 }}
          />
        ))}
      </div>

      {/* Layer 2 — per-world illustration blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {worlds.map((world, i) => (
          <div
            key={`art-${world.name}`}
            data-world-art
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ opacity: i === 0 ? 0.9 : 0 }}
          >
            <span
              className="block aspect-square w-[min(78vw,38rem)] rounded-[42%_58%_55%_45%/50%_44%_56%_50%] opacity-90"
              style={{ backgroundColor: world.accent || world.ink }}
            />
            <span
              className="absolute top-[18%] left-[12%] block h-[38%] w-[38%] rounded-full opacity-40"
              style={{ backgroundColor: world.bg }}
            />
            <span
              className="absolute right-[8%] bottom-[22%] block h-[28%] w-[28%] rounded-[40%] opacity-50"
              style={{ backgroundColor: world.ink }}
            />
            <span className="absolute top-[8%] right-[18%] text-[11px] font-bold tracking-[0.35em] uppercase opacity-50">
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex h-svh flex-col px-5 py-16 md:px-10 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-60 md:text-xs">
          {eyebrow}
        </p>

        <div className="relative flex flex-1 items-center justify-center">
          {worlds.map((world, i) => (
            <article
              key={world.name}
              data-world
              className="absolute inset-x-0 flex flex-col items-center justify-center px-2 text-center"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-70 md:text-xs">
                {String(i + 1).padStart(2, '0')} /{' '}
                {String(worlds.length).padStart(2, '0')}
              </p>

              <h2 className="mt-4 font-brico text-[clamp(3rem,14vw,11rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase">
                {world.name}
              </h2>

              <p className="mt-5 text-base font-semibold uppercase tracking-[0.14em] md:text-lg">
                {world.tagline}
              </p>

              <p className="mt-6 max-w-[44ch] text-sm leading-relaxed opacity-80 md:text-base">
                {world.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

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

/** '#rrggbb' → { h, s, l } (h in degrees, s/l in percent). */
function hexToHsl(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let sat = 0
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h: (h + 360) % 360, s: sat * 100, l: l * 100 }
}

/**
 * FlavorWorlds — pinned stage; one scrub progress crossfades
 * (1) background wash (2) illustration blobs (3) copy per flavor.
 *
 * It opens on `startBg`, the color the section above ends on (the hero's
 * stage), so the page never cuts: the first flavor washes in once the stage
 * is pinned, and every flavor after that eases into the next.
 */
export default function FlavorWorlds({
  eyebrow = 'Section eyebrow',
  startBg = '#2c4bff',
  startInk = '#fff3e2',
  worlds = defaultWorlds,
}) {
  const root = useRef(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const panels = gsap.utils.toArray('[data-world]', root.current)
      const arts = gsap.utils.toArray('[data-world-art]', root.current)

      if (reduced || panels.length === 0) {
        panels.forEach((panel, i) => {
          gsap.set(panel, { opacity: i === 0 ? 1 : 0 })
        })
        if (root.current && worlds[0]) {
          root.current.style.backgroundColor = worlds[0].bg
          root.current.style.color = worlds[0].ink
        }
        return
      }

      gsap.set(panels, { opacity: 0 })
      gsap.set(arts, { opacity: 0, scale: 0.75, rotate: -12 })
      gsap.set(root.current, { color: startInk })

      // The stage color travels around the color wheel (shortest way) instead
      // of crossfading two layers: blue → amber goes through violet and
      // magenta, never through the grey-brown an opacity blend lands on.
      const stage = hexToHsl(startBg)
      const paint = () => {
        root.current.style.backgroundColor = `hsl(${stage.h} ${stage.s}% ${stage.l}%)`
      }
      paint()
      let hue = stage.h
      const tintTo = (hex, position, duration = 0.85) => {
        const target = hexToHsl(hex)
        let h = target.h
        while (h - hue > 180) h -= 360
        while (h - hue < -180) h += 360
        hue = h
        tl.to(
          stage,
          { h, s: target.s, l: target.l, duration, ease: 'sine.inOut', onUpdate: paint },
          position,
        )
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${(Math.max(worlds.length, 1) + 0.6) * 100}%`,
          pin: true,
          scrub: 0.55,
          anticipatePin: 1,
        },
      })

      // Arrive on the hero's color and start tinting right away.
      tl.addLabel('intro', 0.05)
      tintTo(worlds[0]?.bg || startBg, 'intro', 1)
      tl.to(root.current, { color: worlds[0]?.ink || startInk, duration: 0.7, ease: 'sine.inOut' }, 'intro+=0.1')
      tl.fromTo(
        arts[0],
        { opacity: 0, scale: 0.7, rotate: -16 },
        { opacity: 0.9, scale: 1, rotate: 0, duration: 0.8, ease: 'sine.out' },
        'intro+=0.25',
      )
      tl.fromTo(
        panels[0],
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'sine.out' },
        'intro+=0.45',
      )
      tl.to({}, { duration: 0.4 })

      for (let i = 0; i < worlds.length - 1; i += 1) {
        const next = i + 1
        const nextInk = worlds[next]?.ink || '#241352'

        // Layer 1 — background wash crossfade
        // Slow, eased color changes: the page tints over, it doesn't flip.
        tl.addLabel(`world-${i}`)
        tintTo(worlds[next]?.bg || startBg, `world-${i}`)

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
          { color: nextInk, duration: 0.6, ease: 'sine.inOut' },
          `world-${i}+=0.1`,
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
    { scope: root, dependencies: [worlds, startBg, startInk] },
  )

  // Sin motion no hay scrub que cambie de mundo: se muestran todos, uno
  // debajo del otro, cada uno con su color (antes quedaba solo el primero).
  if (reducedMotion) {
    return (
      <section ref={root} className="relative">
        {worlds.map((world, i) => (
          <div
            key={world.name}
            className="flex min-h-[80svh] flex-col px-5 py-16 md:px-10 md:py-20"
            style={{ backgroundColor: world.bg, color: world.ink }}
          >
            {i === 0 ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-60 md:text-xs">
                {eyebrow}
              </p>
            ) : null}
            <article className="flex flex-1 flex-col items-center justify-center px-2 text-center">
              <WorldCopy world={world} index={i} total={worlds.length} />
            </article>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section
      ref={root}
      className="relative overflow-hidden"
      style={{ backgroundColor: startBg, color: startInk }}
    >
      {/* Layer 2 — per-world illustration blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {worlds.map((world, i) => (
          <div
            key={`art-${world.name}`}
            data-world-art
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ opacity: 0 }}
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
              style={{ opacity: 0 }}
            >
              <WorldCopy world={world} index={i} total={worlds.length} />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorldCopy({ world, index, total }) {
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-70 md:text-xs">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
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
    </>
  )
}

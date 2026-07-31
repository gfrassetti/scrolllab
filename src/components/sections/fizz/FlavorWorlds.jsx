import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const defaultWorlds = [
  {
    name: 'FLAVOR 01',
    tagline: 'Placeholder tagline one',
    body: 'Placeholder world copy. Each flavor owns a full screen and repaints the page as you scroll into it — replace names, taglines and colors in the code.',
    bg: '#ffb02e',
    ink: '#241352',
  },
  {
    name: 'FLAVOR 02',
    tagline: 'Placeholder tagline two',
    body: 'Swap this text for your own flavor story — the color morph is the show, the words are yours.',
    bg: '#ff3ea5',
    ink: '#241352',
  },
  {
    name: 'FLAVOR 03',
    tagline: 'Placeholder tagline three',
    body: 'Backgrounds tween between worlds with GSAP; type pops in with a springy stagger.',
    bg: '#3ddc97',
    ink: '#241352',
  },
  {
    name: 'FLAVOR 04',
    tagline: 'Placeholder tagline four',
    body: 'A darker world to close the ride. Reduced-motion visitors get solid panels, no tricks.',
    bg: '#241352',
    ink: '#fff3e2',
  },
]

/**
 * FlavorWorlds — stacked full-screen "worlds", one per flavor.
 * Scrolling between them tweens the whole section background,
 * so the page feels like it dives into each flavor.
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

      if (reduced) {
        // Static: each panel keeps its own solid background.
        panels.forEach((panel, i) => {
          panel.style.backgroundColor = worlds[i]?.bg || '#241352'
          panel.style.color = worlds[i]?.ink || '#fff3e2'
        })
        return
      }

      // Repaints the whole section as a panel takes over the viewport.
      const paintOnEnter = (panel, world) => {
        gsap.to(root.current, {
          backgroundColor: world.bg,
          color: world.ink,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: panel,
            start: 'top 55%',
            end: 'bottom 55%',
            toggleActions: 'play none none reverse',
          },
        })
      }

      panels.forEach((panel, i) => {
        const world = worlds[i]
        if (!world) return

        paintOnEnter(panel, world)

        const split = new SplitText(panel.querySelector('[data-world-name]'), {
          type: 'chars',
          mask: 'chars',
        })
        gsap.from(split.chars, {
          yPercent: 115,
          rotate: 6,
          duration: 0.8,
          ease: 'back.out(1.5)',
          stagger: 0.04,
          scrollTrigger: { trigger: panel, start: 'top 60%', once: true },
        })
        gsap.from(panel.querySelectorAll('[data-world-fade]'), {
          opacity: 0,
          y: 20,
          duration: 0.7,
          stagger: 0.12,
          scrollTrigger: { trigger: panel, start: 'top 55%', once: true },
        })
        gsap.fromTo(
          panel.querySelector('[data-world-blob]'),
          { scale: 0.5, rotate: -20 },
          {
            scale: 1.15,
            rotate: 14,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative bg-grape text-foam">
      <p className="px-5 pt-16 text-[11px] font-semibold uppercase tracking-[0.3em] opacity-60 md:px-10 md:text-xs">
        {eyebrow}
      </p>

      {worlds.map((world, i) => (
        <article
          key={world.name}
          data-world
          className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-24 text-center md:px-10"
        >
          <span
            data-world-blob
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 aspect-square w-[min(72vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-[42%_58%_55%_45%/50%_44%_56%_50%] opacity-15"
            style={{ backgroundColor: 'currentColor' }}
          />

          <p
            data-world-fade
            className="relative text-[11px] font-bold uppercase tracking-[0.3em] opacity-70 md:text-xs"
          >
            {String(i + 1).padStart(2, '0')} / {String(worlds.length).padStart(2, '0')}
          </p>

          <h2
            data-world-name
            className="relative mt-4 font-brico text-[clamp(3.4rem,17vw,13rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase"
          >
            {world.name}
          </h2>

          <p
            data-world-fade
            className="relative mt-5 text-base font-semibold uppercase tracking-[0.14em] md:text-lg"
          >
            {world.tagline}
          </p>

          <p
            data-world-fade
            className="relative mt-6 max-w-[44ch] text-sm leading-relaxed opacity-80 md:text-base"
          >
            {world.body}
          </p>
        </article>
      ))}
    </section>
  )
}

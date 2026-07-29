import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const defaultPanels = [
  {
    index: '3.1',
    title: 'Placeholder panel',
    caption: 'Generic caption — swap freely',
    img: 'https://picsum.photos/seed/panel-a/1000/1250',
  },
  {
    index: '3.2',
    title: 'Another placeholder',
    caption: 'Each panel is one narrative beat',
    img: 'https://picsum.photos/seed/panel-b/1000/1250',
  },
  {
    index: '3.3',
    title: 'Keeps on going',
    caption: 'The scroll is vertical, the motion horizontal',
    img: 'https://picsum.photos/seed/panel-c/1000/1250',
  },
  {
    index: '3.4',
    title: 'Last frame',
    caption: 'On mobile the panels stack vertically',
    img: 'https://picsum.photos/seed/panel-d/1000/1250',
  },
]

/**
 * HorizontalPanels — the section pins itself while vertical scroll
 * drives a horizontal pan across the panels (desktop only).
 * On mobile / reduced motion it degrades to a vertical stack.
 */
export default function HorizontalPanels({
  chapter = '03',
  total = '06',
  label = 'Horizontal drift',
  heading = 'Sideways is a direction too',
  panels = defaultPanels,
}) {
  const root = useRef(null)
  const track = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const getDistance = () =>
            track.current.scrollWidth - window.innerWidth

          gsap.to(track.current, {
            x: () => -getDistance(),
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: () => `+=${getDistance()}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative overflow-hidden md:h-svh">
      <div className="flex items-baseline justify-between border-t border-ink/15 px-5 pt-4 md:absolute md:inset-x-0 md:top-0 md:z-10 md:mx-10 md:px-0">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          Chapter {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <div
        ref={track}
        className="flex flex-col md:h-full md:w-max md:flex-row md:items-stretch"
      >
        {/* Intro panel */}
        <div className="flex flex-col justify-center px-5 py-16 md:h-full md:w-[60vw] md:shrink-0 md:px-10 lg:w-[45vw]">
          <h2 className="text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.95] font-medium tracking-[-0.03em]">
            {heading.split(' ').slice(0, -2).join(' ')}{' '}
            <em className="font-display font-normal italic text-accent">
              {heading.split(' ').slice(-2).join(' ')}
            </em>
          </h2>
        </div>

        {panels.map((panel) => (
          <figure
            key={panel.index}
            className="flex flex-col justify-center gap-4 px-5 pb-16 md:h-full md:w-[52vw] md:shrink-0 md:px-8 md:py-24 lg:w-[36vw]"
          >
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
              <span className="text-accent">{panel.index}</span>
              <span>{panel.title}</span>
            </div>
            <img
              src={panel.img}
              alt=""
              loading="lazy"
              className="aspect-4/5 w-full object-cover"
            />
            <figcaption className="text-sm text-ink/70">
              {panel.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

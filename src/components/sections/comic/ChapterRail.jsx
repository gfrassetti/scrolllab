import { useEffect, useState } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'

const DEFAULT_CHAPTERS = [
  { id: 'dusty', label: 'Chapter 1' },
  { id: 'bond', label: 'Chapter 2' },
  { id: 'fork', label: 'Chapter 3' },
  { id: 'worlds', label: 'Chapter 4' },
]

/**
 * Vertical chapter ticks — generic labels for the comic rail.
 */
export default function ChapterRail({ chapters = DEFAULT_CHAPTERS }) {
  const [active, setActive] = useState(chapters[0]?.id)

  useEffect(() => {
    const triggers = chapters.map((ch) =>
      ScrollTrigger.create({
        trigger: `#chapter-${ch.id}`,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) setActive(ch.id)
        },
      }),
    )
    return () => triggers.forEach((t) => t.kill())
  }, [chapters])

  return (
    <nav
      aria-label="Story chapters"
      className="pointer-events-none fixed top-1/2 right-3 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 md:right-6 lg:flex"
    >
      {chapters.map((ch) => {
        const on = active === ch.id
        return (
          <a
            key={ch.id}
            href={`#chapter-${ch.id}`}
            className="pointer-events-auto group flex items-center gap-3"
          >
            <span
              className={`max-w-0 overflow-hidden text-right text-[11px] tracking-[0.08em] whitespace-nowrap text-white transition-all duration-300 group-hover:max-w-48 ${
                on ? 'max-w-48 opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.65)' }}
            >
              {ch.label}
            </span>
            <span
              className={`h-2.5 w-2.5 shrink-0 shadow-[0_0_0_3px_rgba(0,0,0,0.25)] transition-all duration-300 ${
                on
                  ? 'scale-125 bg-comic-flare'
                  : 'bg-white/55 group-hover:bg-white'
              }`}
            />
          </a>
        )
      })}
      <span
        aria-hidden="true"
        className="absolute top-2 right-[4px] -z-10 h-[calc(100%-16px)] w-px bg-white/35"
      />
    </nav>
  )
}

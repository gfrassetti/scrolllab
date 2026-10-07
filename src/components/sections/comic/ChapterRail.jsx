import { useEffect, useState } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'

const DEFAULT_CHAPTERS = [
  { id: 'dusty', label: 'Chapter 1' },
  { id: 'fork', label: 'Chapter 2' },
  { id: 'bond', label: 'Chapter 3' },
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
      className="pointer-events-none fixed top-1/2 right-3 z-40 hidden -translate-y-1/2 flex-col items-end gap-5 md:right-6 lg:flex"
    >
      {chapters.map((ch) => {
        const on = active === ch.id
        return (
          <a
            key={ch.id}
            href={`#chapter-${ch.id}`}
            className="pointer-events-auto group flex min-h-6 min-w-6 items-center justify-end gap-3"
          >
            {/* like the reference: the active chapter shows its name, the rest a dash */}
            <span className="relative flex items-center justify-end">
              <span
                aria-hidden="true"
                className={`h-[3px] rounded-full bg-white/40 transition-all duration-300 group-hover:w-0 ${on ? 'w-0' : 'w-10'}`}
              />
              <span
                className={`overflow-hidden text-right text-[12px] font-semibold whitespace-nowrap text-white transition-all duration-300 ${
                  on ? 'max-w-48 opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-48 group-hover:opacity-100'
                }`}
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.65)' }}
              >
                {ch.label}
              </span>
            </span>
            <span
              className={`h-2 w-2 shrink-0 transition-all duration-300 ${
                on ? 'bg-comic-flare' : 'bg-white/45 group-hover:bg-white'
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

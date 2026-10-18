import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'

const defaultChapters = [
  { id: 'manifesto', label: 'Manifesto' },
  { id: 'this-issue', label: 'This issue' },
  { id: 'inside', label: 'Inside' },
  { id: 'archive', label: 'Archive' },
  { id: 'how-we-work', label: 'How we work' },
  { id: 'subscribe', label: 'Subscribe' },
]

/**
 * ChapterRail — the magazine's own scrollbar. A thin rail on the right edge
 * that fills as you read, with a tick where each chapter starts (numbered,
 * like the folios of a printed issue) and, beside the fill, the chapter you
 * are in. With a mouse the ticks are links and the rail widens on hover; on a
 * phone it is an indicator only (a strip on the edge that took touches would
 * steal the scroll from the finger).
 *
 * While it is mounted the native scrollbar is hidden (same class as ScrollRail).
 */
export default function ChapterRail({ chapters = defaultChapters, chapterLabel = 'Ch.' }) {
  const fillRef = useRef(null)
  const [marks, setMarks] = useState([])
  const [current, setCurrent] = useState(-1)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hide-native-scrollbar')

    // dónde empieza cada capítulo, en fracción de la página
    const measure = () => {
      const max = Math.max(1, root.scrollHeight - window.innerHeight)
      setMarks(
        chapters
          .map((c, i) => {
            const el = document.getElementById(c.id)
            if (!el) return null
            const top = el.getBoundingClientRect().top + window.scrollY
            return { ...c, n: i + 1, at: Math.min(1, Math.max(0, top / max)), top }
          })
          .filter(Boolean),
      )
    }
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onRefresh: measure,
      onUpdate: (self) => {
        if (fillRef.current) fillRef.current.style.transform = `scaleY(${self.progress})`
      },
    })
    measure()
    if (fillRef.current) fillRef.current.style.transform = `scaleY(${trigger.progress})`
    return () => {
      trigger.kill()
      root.classList.remove('hide-native-scrollbar')
    }
  }, [chapters])

  // el capítulo actual: el último que ya empezó (con un tercio de pantalla de margen)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.33
      let idx = -1
      marks.forEach((m, i) => {
        if (m.top <= y) idx = i
      })
      setCurrent(idx)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [marks])

  const go = (m) => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(m.top, { duration: 1.4 })
    else window.scrollTo({ top: m.top, behavior: 'smooth' })
  }

  const active = marks[current]

  return (
    <div
      aria-hidden="true"
      className="group/rail pointer-events-none fixed top-[12svh] right-2 bottom-[12svh] z-40 w-6 mix-blend-difference text-bone md:right-4"
    >
      {/* el riel */}
      <div className="absolute top-0 right-[11px] bottom-0 w-px bg-current/25">
        <div ref={fillRef} className="absolute inset-0 origin-top scale-y-0 bg-current" />
      </div>
      {/* un folio por capítulo */}
      {marks.map((m, i) => (
        <button
          key={m.id}
          type="button"
          tabIndex={-1}
          onClick={() => go(m)}
          className="pointer-events-none absolute -right-2.5 flex h-11 w-11 -translate-y-1/2 items-center justify-end pr-2.5 [@media(hover:hover)]:pointer-events-auto"
          style={{ top: `${m.at * 100}%` }}
        >
          <span
            className={`block h-px bg-current transition-[width] duration-300 ${i === current ? 'w-6' : 'w-2.5 group-hover/rail:w-4'}`}
          />
          <span
            className={`absolute right-8 hidden font-mono text-[11px] tracking-[0.2em] whitespace-nowrap uppercase transition-opacity duration-300 md:block ${
              i === current ? 'opacity-100' : 'opacity-0 group-hover/rail:opacity-60'
            }`}
          >
            {String(m.n).padStart(2, '0')}
            {i === current ? ` — ${m.label}` : ''}
          </span>
        </button>
      ))}
      {/* en el teléfono, solo el número del capítulo, abajo */}
      {active && (
        <p className="absolute right-0 -bottom-7 font-mono text-[11px] tracking-[0.2em] md:hidden">
          {chapterLabel} {String(active.n).padStart(2, '0')}
        </p>
      )}
    </div>
  )
}

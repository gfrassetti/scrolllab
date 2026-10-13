import { useEffect, useRef, useState } from 'react'
import { getLenis } from '../../hooks/useLenis'
import { tour } from './tour'
import { sfx } from './sfx'
import { STATIONS } from './stations'
import { C, MONO } from './brand'

/**
 * cāpsula33 — la barra de scroll: un riel de navegación con las páginas del
 * recorrido (la vista general y las cinco estaciones). El indicador
 * sigue al scroll; tocar una marca lleva a esa página. Reemplaza a la barra
 * del navegador mientras está la página.
 */

const MARKS = [
  { id: 'inicio', label: 'Vista general' },
  ...STATIONS.map((s) => ({ id: s.id, label: s.label })),
  { id: 'visita', label: 'Visitanos' },
]
const N = STATIONS.length

/** Dónde cae cada marca en el scroll del documento (0–1). */
function markPositions() {
  const hero = document.getElementById('top')
  const max = document.documentElement.scrollHeight - window.innerHeight
  if (!hero || max <= 0) return MARKS.map((_, i) => i / (MARKS.length - 1))
  const end = hero.offsetHeight - window.innerHeight
  return MARKS.map((m, i) => (m.id === 'visita' ? 1 : Math.min(1, (end * i) / (N + 1) / max)))
}

export default function ScrollRail({ visible }) {
  const thumbRef = useRef(null)
  const [page, setPage] = useState(tour.page)
  const [atEnd, setAtEnd] = useState(false)
  const [tops, setTops] = useState(() => MARKS.map((_, i) => i / (MARKS.length - 1)))

  useEffect(() => tour.onPage(setPage), [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('c33-noscrollbar')
    let raf = 0
    const update = () => {
      raf = 0
      const max = html.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (thumbRef.current) thumbRef.current.style.top = `${p * 100}%`
      setAtEnd(p > 0.985)
    }
    const measure = () => setTops(markPositions())
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    measure()
    const t = window.setTimeout(measure, 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('resize', measure)
    return () => {
      html.classList.remove('c33-noscrollbar')
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('resize', measure)
      window.clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <style>{`html.c33-noscrollbar { scrollbar-width: none; } html.c33-noscrollbar::-webkit-scrollbar { display: none; }`}</style>
      <nav
        aria-label="Páginas del recorrido"
        className="fixed top-1/2 right-3 z-20 h-[56svh] -translate-y-1/2 transition-opacity duration-700 md:right-6"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      >
        <div className="relative h-full w-5">
          {/* El riel. */}
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2" style={{ background: 'rgba(242,233,220,0.18)' }} />
          {/* Las páginas. */}
          {MARKS.map((m, i) => {
            const active = m.id === 'visita' ? atEnd : page === i
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  sfx.railSelect()
                  if (m.id === 'visita') getLenis()?.scrollTo('#visita', { duration: 2 })
                  else tour.goTo(i)
                }}
                onMouseEnter={() => sfx.railHover()}
                aria-label={m.label}
                aria-current={active ? 'step' : undefined}
                className="group absolute left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ top: `${tops[i] * 100}%` }}
              >
                <span
                  aria-hidden="true"
                  className="block h-px transition-[width,background] duration-500"
                  style={{ width: active ? 14 : 8, background: active ? C.neon : 'rgba(242,233,220,0.5)' }}
                />
                <span
                  aria-hidden="true"
                  className="absolute right-7 hidden text-[10px] tracking-[0.18em] whitespace-nowrap uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
                  style={{ ...MONO, color: active ? C.neon : 'rgba(242,233,220,0.75)' }}
                >
                  {m.label}
                </span>
              </button>
            )
          })}
          {/* El indicador. */}
          <span
            ref={thumbRef}
            aria-hidden="true"
            className="absolute left-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-1/2"
            style={{ top: 0, background: C.neon, boxShadow: `0 0 10px ${C.neon}` }}
          />
        </div>
      </nav>
    </>
  )
}

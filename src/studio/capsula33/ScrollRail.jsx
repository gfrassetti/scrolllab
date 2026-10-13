import { useEffect, useRef, useState } from 'react'
import { tour } from './tour'
import { sfx } from './sfx'
import { STATIONS } from './stations'
import { C, MONO } from './brand'

/**
 * cāpsula33 — la barra de scroll: un riel de navegación con las páginas del
 * recorrido (000 la vista general, 001–005 las estaciones). El indicador
 * sigue al scroll; tocar una marca lleva a esa página. Reemplaza a la barra
 * del navegador mientras está la página.
 */

const MARKS = [{ page: '000', label: 'Vista general' }, ...STATIONS.map((s) => ({ page: s.page, label: s.label }))]

export default function ScrollRail({ visible }) {
  const thumbRef = useRef(null)
  const readoutRef = useRef(null)
  const [page, setPage] = useState(tour.page)

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
      if (readoutRef.current) readoutRef.current.textContent = String(Math.round(p * 100)).padStart(3, '0')
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      html.classList.remove('c33-noscrollbar')
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
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
            const active = page === i
            return (
              <button
                key={m.page}
                type="button"
                onClick={() => {
                  sfx.select()
                  tour.goTo(i)
                }}
                onMouseEnter={() => sfx.tick()}
                aria-label={`Page ${m.page}: ${m.label}`}
                aria-current={active ? 'step' : undefined}
                className="group absolute left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ top: `${(i / (MARKS.length - 1)) * 100}%` }}
              >
                <span
                  aria-hidden="true"
                  className="block h-px transition-[width,background] duration-500"
                  style={{ width: active ? 14 : 8, background: active ? C.neon : 'rgba(242,233,220,0.5)' }}
                />
                <span
                  aria-hidden="true"
                  className={`absolute right-7 hidden text-[10px] tracking-[0.18em] whitespace-nowrap uppercase transition-opacity duration-300 group-hover:opacity-100 md:block ${active ? 'opacity-100' : 'opacity-0'}`}
                  style={{ ...MONO, color: active ? C.neon : 'rgba(242,233,220,0.7)' }}
                >
                  {m.page}
                  <span className="ml-2">{m.label}</span>
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
          <span
            ref={readoutRef}
            aria-hidden="true"
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.12em] tabular-nums"
            style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}
          >
            000
          </span>
        </div>
      </nav>
    </>
  )
}

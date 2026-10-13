import { useEffect, useRef, useState } from 'react'
import { getLenis } from '../../hooks/useLenis'
import { sfx } from './sfx'
import { C, MONO } from './brand'

/**
 * cāpsula33 — la barra de scroll: un riel fino con una marca por sección.
 * El indicador sigue al scroll; tocar una marca lleva a esa sección. Reemplaza
 * a la barra del navegador mientras está la página.
 */

const MARKS = [
  { id: 'top', label: 'C33' },
  { id: 'capsula', label: 'La cápsula' },
  { id: 'local', label: 'El local' },
  { id: 'visita', label: 'Visitanos' },
]

export default function ScrollRail({ visible }) {
  const thumbRef = useRef(null)
  const [tops, setTops] = useState(() => MARKS.map((_, i) => i / (MARKS.length - 1)))
  const [active, setActive] = useState(0)

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('c33-noscrollbar')
    let raf = 0
    let marks = MARKS.map((_, i) => i / (MARKS.length - 1))
    const measure = () => {
      const max = html.scrollHeight - window.innerHeight
      marks = MARKS.map((m) => {
        const el = document.getElementById(m.id)
        if (!el || max <= 0) return 0
        return Math.min(1, (el.getBoundingClientRect().top + window.scrollY) / max)
      })
      setTops(marks)
    }
    const update = () => {
      raf = 0
      const max = html.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (thumbRef.current) thumbRef.current.style.top = `${p * 100}%`
      let a = 0
      marks.forEach((t, i) => {
        if (p + 0.002 >= t) a = i
      })
      setActive(a)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    measure()
    update()
    const t1 = window.setTimeout(measure, 800)
    const t2 = window.setTimeout(measure, 3000)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      html.classList.remove('c33-noscrollbar')
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <style>{`html.c33-noscrollbar { scrollbar-width: none; } html.c33-noscrollbar::-webkit-scrollbar { display: none; }`}</style>
      <nav
        aria-label="Secciones"
        className="fixed top-1/2 right-3 z-[80] h-[44svh] -translate-y-1/2 mix-blend-difference transition-opacity duration-700 md:right-5"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      >
        <div className="relative h-full w-5">
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2" style={{ background: 'rgba(255,255,255,0.35)' }} />
          {MARKS.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                sfx.railSelect()
                getLenis()?.scrollTo(`#${m.id}`, { duration: 1.8 })
              }}
              onMouseEnter={() => sfx.railHover()}
              aria-label={m.label}
              aria-current={active === i ? 'location' : undefined}
              className="group absolute left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ top: `${tops[i] * 100}%` }}
            >
              <span aria-hidden="true" className="block h-px bg-white transition-[width] duration-500" style={{ width: active === i ? 14 : 8 }} />
              <span
                aria-hidden="true"
                className="absolute right-7 hidden text-[10px] tracking-[0.18em] whitespace-nowrap text-white uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
                style={MONO}
              >
                {m.label}
              </span>
            </button>
          ))}
          <span ref={thumbRef} aria-hidden="true" className="absolute left-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-1/2" style={{ top: 0, background: C.neon }} />
        </div>
      </nav>
    </>
  )
}

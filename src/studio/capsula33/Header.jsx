import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { getLenis, scrollToSection } from '../../hooks/useLenis'
import { C, DISPLAY, MONO, openStatus } from './brand'

/**
 * cāpsula33 — la barra de arriba y el menú.
 *
 * La barra se va al bajar (deja la pantalla al local) y vuelve apenas se sube.
 * El menú ocupa toda la pantalla: una cortina negra que baja con un filo
 * naranja, las secciones numeradas como los módulos de la nave, y abajo la
 * dirección y si está abierto.
 */

const NAV = [
  ['01', 'La cápsula', 'experiencia'],
  ['02', 'Menú', 'menu'],
  ['03', 'Colección', 'coleccion'],
  ['04', 'Ubicación', 'mapa'],
  ['05', 'Visitanos', 'visita'],
]

export default function Header({ visible }) {
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(() => openStatus())
  const panelRef = useRef(null)
  const edgeRef = useRef(null)
  const itemsRef = useRef([])
  const buttonRef = useRef(null)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > last + 4 && y > 80) setHidden(true)
      else if (y < last - 4) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const id = window.setInterval(() => setStatus(openStatus()), 60_000)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearInterval(id)
    }
  }, [])

  // Abrir y cerrar la cortina.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return undefined
    const lenis = getLenis()
    const items = itemsRef.current.filter(Boolean)
    if (open) {
      lenis?.stop()
      const tl = gsap.timeline()
      tl.set(panel, { visibility: 'visible' })
      tl.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
      tl.fromTo(edgeRef.current, { top: '0%' }, { top: '100%', duration: 0.7, ease: 'expo.inOut' }, 0)
      tl.fromTo(items, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 }, 0.35)
      tl.call(() => panel.querySelector('a')?.focus({ preventScroll: true }), null, 0.5)
      const onKey = (e) => {
        if (e.key === 'Escape') setOpen(false)
      }
      window.addEventListener('keydown', onKey)
      return () => {
        window.removeEventListener('keydown', onKey)
        tl.kill()
      }
    }
    lenis?.start()
    if (panel.style.visibility === 'visible') {
      gsap.to(panel, {
        clipPath: 'inset(100% 0 0% 0)',
        duration: 0.6,
        ease: 'expo.inOut',
        onComplete: () => gsap.set(panel, { visibility: 'hidden' }),
      })
      buttonRef.current?.focus({ preventScroll: true })
    }
    return undefined
  }, [open])

  const go = (e, id) => {
    e.preventDefault()
    setOpen(false)
    window.setTimeout(() => scrollToSection(id), 450)
  }

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 transition-[transform,opacity] duration-500"
        style={{
          transform: visible && (!hidden || open) ? 'translateY(0)' : 'translateY(-110%)',
          opacity: visible ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="flex items-center justify-between gap-6 px-6 py-4 md:px-10 md:py-6" style={{ color: C.cream }}>
          <a href="#top" onClick={(e) => go(e, 'top')} className="tpl-hit relative text-[20px] font-light md:text-[22px]" style={MONO}>
            cāpsula<span style={{ color: C.orange }}>33</span>
          </a>
          <p className="hidden items-center gap-2 text-[11px] tracking-[0.16em] uppercase md:flex" style={DISPLAY}>
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: status.open ? '#7dffa8' : C.orange, boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }}
            />
            {status.label}
          </p>
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls="c33-menu"
            onClick={() => setOpen((v) => !v)}
            className="group relative flex h-11 items-center gap-3 rounded-full border px-5 text-[12px] font-semibold tracking-[0.2em] uppercase transition-colors duration-300 active:scale-[0.97]"
            style={{ ...DISPLAY, borderColor: open ? C.orange : 'rgba(242,233,220,0.25)', background: 'rgba(7,7,8,0.55)', backdropFilter: 'blur(8px)' }}
          >
            <span className="relative block h-2.5 w-4" aria-hidden="true">
              <span
                className="absolute left-0 h-px w-full transition-transform duration-500"
                style={{ background: C.orange, top: open ? '50%' : 0, transform: open ? 'rotate(45deg)' : 'none', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
              />
              <span
                className="absolute left-0 h-px w-full transition-transform duration-500"
                style={{ background: C.orange, top: open ? '50%' : '100%', transform: open ? 'rotate(-45deg)' : 'none', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
              />
            </span>
            {open ? 'Cerrar' : 'Menú'}
          </button>
        </div>
      </header>

      <nav
        id="c33-menu"
        ref={panelRef}
        aria-label="Secciones"
        aria-hidden={!open}
        className="fixed inset-0 z-30 flex flex-col justify-between px-6 pt-28 pb-8 md:px-10 md:pt-32"
        style={{ background: C.void, color: C.cream, visibility: 'hidden', clipPath: 'inset(0 0 100% 0)' }}
      >
        <span ref={edgeRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px" style={{ background: C.neon, boxShadow: `0 0 18px 2px ${C.neon}` }} />
        <ul className="mx-auto w-full max-w-[72rem] [@media(hover:hover)]:[&:hover_.c33-menu-item:not(:hover)]:opacity-35">
          {NAV.map(([n, label, id], i) => (
            <li key={id} className="overflow-hidden border-b" style={{ borderColor: 'rgba(242,233,220,0.1)' }}>
              <a
                ref={(el) => (itemsRef.current[i] = el)}
                href={`#${id}`}
                onClick={(e) => go(e, id)}
                tabIndex={open ? 0 : -1}
                className="c33-menu-item group flex items-baseline gap-5 py-3 transition-opacity duration-300 md:gap-8 md:py-4"
              >
                <span className="w-8 text-[12px] tabular-nums opacity-50 transition-colors duration-300 group-hover:text-[#ff7a1a] group-hover:opacity-100" style={MONO}>
                  {n}
                </span>
                <span
                  className="text-[clamp(2.4rem,7vw,5.6rem)] leading-[0.95] font-semibold tracking-[-0.01em] uppercase transition-transform duration-500 group-hover:translate-x-3"
                  style={{ ...DISPLAY, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
                >
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  className="ml-auto hidden h-px w-24 origin-right scale-x-0 self-center transition-transform duration-500 group-hover:scale-x-100 md:block"
                  style={{ background: C.orange, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
                />
              </a>
            </li>
          ))}
        </ul>
        <div className="mx-auto grid w-full max-w-[72rem] gap-3 text-[12px] tracking-[0.14em] uppercase opacity-70 sm:grid-cols-3" style={DISPLAY}>
          <span>Av. Gral. Roca 1120</span>
          <span className="sm:text-center">{status.label}</span>
          <a href="https://www.instagram.com/capsulas33/" target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1} className="tpl-link relative sm:text-right">
            @capsulas33
          </a>
        </div>
      </nav>
    </>
  )
}

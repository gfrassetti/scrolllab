import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { STATIONS } from './stations'
import { tour } from './tour'
import { sfx, soundEnabled, setSound, onSoundChange, unlock } from './sfx'
import HackyText from './HackyText'
import { C, DISPLAY, MONO, openStatus } from './brand'

/**
 * cāpsula33 — la barra de arriba y el menú.
 *
 * La barra se va al bajar y vuelve al subir. El menú ocupa la pantalla: las
 * estaciones del recorrido en letras naranjas; al pasar el puntero cada una
 * se re-tipea con letras al azar sobre un bloque con la esquina cortada, con
 * su «PAGE 00N» al costado y sonido. La página actual queda en naranja.
 */

const CUT = 'polygon(0 0, 100% 0, 100% calc(100% - 0.9em), calc(100% - 0.9em) 100%, 0 100%)'

export default function Header({ visible }) {
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(tour.page)
  const [sound, setSoundState] = useState(soundEnabled())
  const [status] = useState(() => openStatus())
  const panelRef = useRef(null)
  const edgeRef = useRef(null)
  const itemsRef = useRef([])
  const buttonRef = useRef(null)
  const firstRender = useRef(true)

  useEffect(() => tour.onPage(setPage), [])
  useEffect(() => onSoundChange(setSoundState), [])

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > last + 4 && y > 80) setHidden(true)
      else if (y < last - 4) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return undefined
    const lenis = getLenis()
    const items = itemsRef.current.filter(Boolean)
    if (open) {
      lenis?.stop()
      sfx.open()
      const tl = gsap.timeline()
      tl.set(panel, { visibility: 'visible' })
      tl.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
      tl.fromTo(edgeRef.current, { top: '0%' }, { top: '100%', duration: 0.7, ease: 'expo.inOut' }, 0)
      tl.fromTo(items, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.3)
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
    if (firstRender.current) {
      firstRender.current = false
      return undefined
    }
    sfx.close()
    gsap.to(panel, {
      clipPath: 'inset(100% 0 0% 0)',
      duration: 0.6,
      ease: 'expo.inOut',
      onComplete: () => gsap.set(panel, { visibility: 'hidden' }),
    })
    buttonRef.current?.focus({ preventScroll: true })
    return undefined
  }, [open])

  const go = (e, index) => {
    e.preventDefault()
    sfx.select()
    setOpen(false)
    window.setTimeout(() => tour.goTo(index), 420)
  }

  const toggleSound = () => {
    unlock()
    setSound(!sound)
    if (!sound) window.setTimeout(() => sfx.soundOn(), 30)
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
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-6" style={{ color: C.cream }}>
          <a
            href="#top"
            onClick={(e) => go(e, 0)}
            className="relative text-[20px] font-light md:text-[22px]"
            style={MONO}
          >
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? 'Apagar el sonido' : 'Prender el sonido'}
              className="flex h-11 w-11 items-center justify-center gap-[3px] rounded-full border transition-colors duration-300 active:scale-[0.95]"
              style={{ borderColor: 'rgba(242,233,220,0.25)', background: 'rgba(5,5,6,0.55)' }}
            >
              {[0.5, 1, 0.7, 0.9].map((h, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`block w-[2px] origin-bottom ${sound ? 'c33-eq' : ''}`}
                  style={{ height: 14, background: sound ? C.neon : 'rgba(242,233,220,0.5)', transform: `scaleY(${sound ? h : 0.15})`, animationDelay: `${i * 0.13}s` }}
                />
              ))}
            </button>
            <button
              ref={buttonRef}
              type="button"
              aria-expanded={open}
              aria-controls="c33-menu"
              onClick={() => {
                unlock()
                setOpen((v) => !v)
              }}
              onMouseEnter={() => sfx.hover()}
              className="flex h-11 items-center gap-3 rounded-full border px-5 text-[12px] font-semibold tracking-[0.2em] uppercase transition-colors duration-300 active:scale-[0.97]"
              style={{ ...DISPLAY, borderColor: open ? C.orange : 'rgba(242,233,220,0.25)', background: 'rgba(5,5,6,0.55)' }}
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
        </div>
      </header>

      <nav
        id="c33-menu"
        ref={panelRef}
        aria-label="Estaciones del recorrido"
        aria-hidden={!open}
        className="fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto px-5 pt-28 pb-8 md:px-12 md:pt-32"
        style={{ background: '#050506', color: C.cream, visibility: 'hidden', clipPath: 'inset(0 0 100% 0)' }}
      >
        <span ref={edgeRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px" style={{ background: C.neon, boxShadow: `0 0 18px 2px ${C.neon}` }} />
        <ul className="flex flex-col items-start gap-2 md:gap-3">
          {STATIONS.map((s, i) => (
            <li key={s.id}>
              <MenuItem
                station={s}
                index={i + 1}
                active={page === i + 1}
                open={open}
                itemRef={(el) => (itemsRef.current[i] = el)}
                onSelect={go}
              />
            </li>
          ))}
        </ul>
        <div className="mt-10 grid gap-3 text-[11px] tracking-[0.16em] uppercase opacity-70 sm:grid-cols-3" style={MONO}>
          <span>Av. Gral. Roca 1120 · San Martín de los Andes</span>
          <span className="sm:text-center">{status.label}</span>
          <a href="https://www.instagram.com/capsulas33/" target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1} className="relative sm:text-right">
            @capsulas33
          </a>
        </div>
      </nav>
      <style>{`
        @keyframes c33-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .c33-eq { animation: c33-eq 0.9s ease-in-out infinite; }
      `}</style>
    </>
  )
}

function MenuItem({ station, index, active, open, itemRef, onSelect }) {
  const [run, setRun] = useState(0)
  const [hover, setHover] = useState(false)
  const lit = hover || active
  const enter = () => {
    setHover(true)
    setRun((r) => r + 1)
    sfx.hover()
  }
  return (
    <a
      ref={itemRef}
      href={`#page-${station.page}`}
      onClick={(e) => onSelect(e, index)}
      onMouseEnter={enter}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && enter()}
      onMouseLeave={() => setHover(false)}
      onBlur={() => setHover(false)}
      tabIndex={open ? 0 : -1}
      aria-current={active ? 'page' : undefined}
      className="relative inline-flex items-start py-[0.08em] pr-[0.55em] pl-[0.18em] text-[clamp(2.6rem,8.4vw,6.4rem)] leading-[0.86] font-bold tracking-[-0.045em] uppercase outline-none"
      style={DISPLAY}
    >
      {/* El bloque: cream al pasar, naranja si es la página actual. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 transition-[opacity,transform] duration-200"
        style={{
          background: hover ? C.cream : C.orange,
          opacity: lit ? 1 : 0,
          transform: lit ? 'translateY(0)' : 'translateY(0.08em)',
          clipPath: CUT,
          borderRadius: '0.06em',
        }}
      />
      <span className="relative" style={{ color: lit ? '#050506' : C.orange, transition: 'color 150ms' }}>
        <HackyText text={station.label} run={run} onTick={sfx.tick} className="whitespace-nowrap" />
      </span>
      {/* PAGE 00N: aparece solo al pasar el puntero. */}
      <span
        aria-hidden="true"
        className="absolute top-[0.12em] left-full ml-3 text-[11px] leading-[1.2] tracking-[0.08em] whitespace-nowrap transition-opacity duration-200 md:ml-4 md:text-[12px]"
        style={{ ...MONO, color: active ? C.neon : C.cream, opacity: hover ? 1 : 0, letterSpacing: '0.08em' }}
      >
        PAGE
        <br />
        <HackyText text={station.page} run={run} />
      </span>
    </a>
  )
}

import { useEffect, useRef, useState } from 'react'
import { parseNavLinks } from '../../../lib/navLinks'
import { useMobileMenu } from '../../../hooks/useMobileMenu'

const DEFAULT_DRAWER = [
  'Story | #project',
  'Protocol | #citadel',
  'Journal | #roster',
  'Media | #factions',
  'Gallery | #world',
  'About | #drop',
]

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ACCENT = '#c0fb50'
const CLIP =
  '[clip-path:polygon(0_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%)]'

function Mark({ children }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase md:text-[11px]">
      <span aria-hidden="true" className="size-1.5 shrink-0 bg-current" />
      {children}
    </span>
  )
}

function HudLink({ href, label, page, pageLabel, mark }) {
  const target = label.toUpperCase()
  const [text, setText] = useState(target)
  const [hot, setHot] = useState(false)
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  useEffect(() => {
    setText(target)
  }, [target])

  const scramble = () => {
    setHot(true)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cancelAnimationFrame(frame.current)
    const start = performance.now()
    const dur = 220
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const lock = Math.floor(t * target.length)
      setText(
        Array.from(target, (ch, i) => {
          if (ch === ' ' || i < lock) return ch
          return GLYPHS[(Math.random() * GLYPHS.length) | 0]
        }).join(''),
      )
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else setText(target)
    }
    frame.current = requestAnimationFrame(tick)
  }

  const leave = () => {
    setHot(false)
    cancelAnimationFrame(frame.current)
    setText(target)
  }

  return (
    <a
      href={href}
      onMouseEnter={scramble}
      onMouseLeave={leave}
      onFocus={scramble}
      onBlur={leave}
      className="relative inline-flex items-center gap-1.5"
    >
      {mark ? <span aria-hidden="true" className="size-1.5 bg-current" /> : null}
      {text}
      <span
        className={`pointer-events-none absolute top-full left-0 pt-1 font-mono text-[8px] tracking-[0.12em] uppercase transition-opacity duration-150 ${
          hot ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ color: ACCENT }}
      >
        {pageLabel} {page}
      </span>
    </a>
  )
}

function DrawerLink({ href, label, page, pageLabel, active, onClick }) {
  const target = label.toUpperCase()
  const [text, setText] = useState(target)
  const [hot, setHot] = useState(false)
  const frame = useRef(0)

  const stop = () => {
    cancelAnimationFrame(frame.current)
    setText(target)
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  useEffect(() => {
    setText(target)
  }, [target])

  const scramble = () => {
    setHot(true)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cancelAnimationFrame(frame.current)
    const start = performance.now()
    const dur = 220
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const lock = Math.floor(t * target.length)
      setText(
        Array.from(target, (ch, i) => {
          if (ch === ' ' || i < lock) return ch
          return GLYPHS[(Math.random() * GLYPHS.length) | 0]
        }).join(''),
      )
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else setText(target)
    }
    frame.current = requestAnimationFrame(tick)
  }

  const leave = () => {
    setHot(false)
    stop()
  }

  const filled = active || hot

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={scramble}
      onMouseLeave={leave}
      onFocus={scramble}
      onBlur={leave}
      className="relative flex min-h-0 items-start gap-3 overflow-visible py-[0.02em]"
    >
      <span
        className={`font-anton relative inline-block whitespace-nowrap pt-[0.08em] pr-[0.28em] pb-[0.07em] pl-[0.12em] text-[clamp(2.5rem,8vh,6.2rem)] leading-[0.86] tracking-[-0.07em] uppercase ${
          filled ? CLIP : ''
        } ${
          active
            ? 'bg-[#c0fb50] text-black'
            : hot
              ? 'bg-white text-black'
              : 'text-white'
        }`}
      >
        {text}
      </span>
      {!active ? (
        <span
          className={`pointer-events-none shrink-0 pt-[0.2em] font-mono text-[9px] leading-[1.15] tracking-[0.08em] uppercase transition-opacity duration-150 md:text-[10px] ${
            hot ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ color: ACCENT }}
        >
          {pageLabel}
          <br />
          {page}
        </span>
      ) : null}
    </a>
  )
}

/**
 * NavVanta — HUD + left drawer (740px), scramble hover, PAGE 00n.
 */
export default function NavVanta({
  brand = 'VANTA',
  links = ['Project', 'Citadel', 'Factions', 'World'],
  linksText,
  playLabel = 'PLAY',
  liveLabel = '28 Operators Live',
  menuLabel = 'MENU',
  discoverLabel = 'Discover',
  drawerLinksText,
  connectLabel = 'Connect',
  socialText = 'Twitter | #\nDiscord | #',
  buyLabel = 'Buy on',
  buyMarket = 'OpenSea',
  closeLabel = 'Close',
  langLabel = 'US-EN',
  pageLabel = 'Page',
  year = '2026',
}) {
  const items = parseNavLinks(links, linksText).slice(0, 4)
  const drawer = parseNavLinks(DEFAULT_DRAWER, drawerLinksText).slice(0, 8)
  const socials = parseNavLinks([], socialText).slice(0, 4)
  const { open, close, panelProps, triggerProps } = useMobileMenu({
    breakpoint: null,
  })

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="pointer-events-auto relative z-50 flex h-12 items-center justify-between gap-3 px-3 mix-blend-difference text-white md:h-14 md:px-5">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            {...triggerProps}
            aria-label={menuLabel}
            className="group relative grid size-12 place-items-center md:size-14"
          >
            <span
              aria-hidden="true"
              className="absolute size-10 rounded-full border border-transparent transition-[border-color,transform] duration-200 ease-[var(--ease-out)] group-hover:scale-110 group-hover:border-current/40 md:size-12"
            />
            <span
              aria-hidden="true"
              className={`absolute h-[1.5px] bg-current transition-[transform,width] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${
                open
                  ? 'w-6 translate-y-0 rotate-45'
                  : 'w-[22px] -translate-y-[5px] group-hover:w-7 group-hover:-translate-y-[6px]'
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-[1.5px] bg-current transition-[transform,width] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${
                open
                  ? 'w-6 translate-y-0 -rotate-45'
                  : 'w-4 translate-y-[5px] group-hover:w-7 group-hover:translate-y-[6px]'
              }`}
            />
          </button>
          <a href="#top" className="hidden font-mono text-[10px] tracking-[0.22em] uppercase sm:inline">
            {brand}
          </a>
        </div>

        <ul className="hidden items-center gap-5 font-mono text-[10px] tracking-[0.22em] uppercase md:flex">
          {items.map((item, i) => (
            <li key={item.label}>
              <HudLink
                href={item.href}
                label={item.label}
                page={String(i + 1).padStart(3, '0')}
                pageLabel={pageLabel}
                mark={i === 0}
              />
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[9px] tracking-[0.18em] uppercase opacity-60 lg:inline">
            {liveLabel}
          </span>
          <a
            href="#drop"
            className="vanta-chamfer ui-press bg-white px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-black uppercase"
          >
            {playLabel}
          </a>
        </div>
      </div>

      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={closeLabel}
        onClick={close}
        className={`fixed inset-0 z-30 bg-black/25 transition-opacity duration-200 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        {...panelProps}
        aria-label={menuLabel}
        inert={!open}
        className={`pointer-events-auto fixed inset-y-0 left-0 z-40 grid w-[min(92vw,740px)] grid-cols-[minmax(0,1fr)_3.25rem] bg-black text-white transition-transform duration-[380ms] motion-reduce:transition-none md:grid-cols-[minmax(0,1fr)_4.5rem] ${
          open ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-drawer)' }}
      >
        <div className="flex min-h-0 min-w-0 flex-col border-r border-white/15">
          <div className="flex min-h-0 flex-1 flex-col px-5 pt-16 md:px-7">
            <Mark>{discoverLabel}</Mark>
            <nav className="mt-4 flex min-h-0 flex-1 flex-col justify-evenly overflow-visible pb-3">
              {drawer.map((item, i) => (
                <DrawerLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  page={String(i + 1).padStart(3, '0')}
                  pageLabel={pageLabel}
                  active={i === 0}
                  onClick={close}
                />
              ))}
            </nav>
          </div>

          <div className="grid shrink-0 grid-cols-[7.5rem_minmax(0,1fr)] items-center border-t border-white/15 px-5 py-3.5 md:grid-cols-[9rem_minmax(0,1fr)] md:px-7 md:py-4">
            <Mark>{connectLabel}</Mark>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 font-anton text-[clamp(1rem,2.2vw,1.55rem)] leading-none tracking-wide uppercase">
              {socials.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="underline-offset-4 transition-[opacity,text-decoration-color] duration-200 ease-[var(--ease-out)] hover:opacity-100 hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <a
            href="#drop"
            onClick={close}
            className="grid shrink-0 grid-cols-[7.5rem_minmax(0,1fr)] items-center border-t border-white/15 px-5 py-3.5 hover:opacity-70 md:grid-cols-[9rem_minmax(0,1fr)] md:px-7 md:py-4"
          >
            <Mark>{buyLabel}</Mark>
            <span className="inline-flex items-center gap-2.5 font-anton text-[clamp(1rem,2.2vw,1.55rem)] leading-none tracking-wide uppercase">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current md:size-6">
                <path d="M12 3.2 4.4 16.4h15.2L12 3.2Zm-6.2 14.5C5 19.4 8.2 20.8 12 20.8s7-1.4 6.2-3.1H5.8Z" />
              </svg>
              {buyMarket}
            </span>
          </a>

          <div className="grid shrink-0 grid-cols-[7.5rem_minmax(0,1fr)] items-center border-t border-white/15 px-5 py-3 font-mono text-[10px] tracking-[0.2em] uppercase md:grid-cols-[9rem_minmax(0,1fr)] md:px-7 md:py-3.5">
            <span className="inline-flex items-center gap-1.5 opacity-80">
              {langLabel}
              <span aria-hidden="true" className="text-[8px]">
                ⌄
              </span>
            </span>
            <span className="opacity-55">© {year}</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between py-5 md:py-6">
          <span aria-hidden="true" className="text-[1.35rem] leading-none">
            ✛
          </span>
          <span aria-hidden="true" className="flex h-5 items-end gap-[3px]">
            <span className="h-2 w-px bg-white" />
            <span className="h-3.5 w-px bg-white" />
            <span className="h-full w-px bg-white" />
            <span className="h-2.5 w-px bg-white" />
          </span>
        </div>
      </div>
    </header>
  )
}

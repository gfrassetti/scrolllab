import { useEffect, useRef } from 'react'

/**
 * APEX — the hero's menu sheet.
 *
 * A curtain: it drops from the top edge on open and goes back up on close (one
 * clip-path, same easing both ways). The links are large and dim their
 * neighbours on hover; the little film is the hero's own film, mirrored and in
 * portrait, and only plays while the sheet is open. Always mounted (so the
 * exit animation has something to run on) but `inert` while closed.
 *
 * State, Escape, the scroll lock and focus come from `useMobileMenu`, which the
 * hero calls (the LAB frame aliases it to a lighter one) and passes in as `menu`.
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

export function Burger({ x = false }) {
  return (
    <span aria-hidden="true" data-x={x ? '' : undefined} className="apex-burger">
      <i />
      <i />
    </span>
  )
}

export default function HeroMenu({
  menu,
  brand,
  links,
  ctaLabel,
  ctaHref,
  menuLabel,
  closeLabel,
  meta,
  showFilm,
  filmSrc,
  poster,
}) {
  const videoRef = useRef(null)

  // The thumbnail is the lighter (phone) file and is fetched on the first
  // open; it plays only while the sheet is up.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !showFilm) return undefined
    if (menu.open) {
      if (!video.getAttribute('src')) video.src = filmSrc
      video.play().catch(() => {})
      return undefined
    }
    const t = window.setTimeout(() => video.pause(), 800)
    return () => window.clearTimeout(t)
  }, [menu.open, showFilm, filmSrc])

  const lines = String(meta || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div
      {...menu.panelProps}
      aria-modal={menu.open ? true : undefined}
      aria-label={menuLabel}
      aria-hidden={menu.open ? undefined : true}
      inert={menu.open ? undefined : true}
      data-open={menu.open ? 'true' : 'false'}
      className="apex-sheet fixed inset-0 z-50"
      style={{ background: 'var(--apex-ink)', color: 'var(--apex-fg)' }}
    >
      <div className="flex h-full flex-col px-[5vw] pt-[max(1.1rem,2.4svh)] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-[2.4vw]">
        <div className="flex items-start justify-between gap-6 text-[11px] tracking-[0.16em] uppercase lg:text-[max(10px,0.6vw)]" style={LABEL}>
          <a href="#top" onClick={menu.close} className="apex-brand tpl-hit relative inline-grid text-[12px] font-bold whitespace-nowrap md:text-[max(15px,1.05vw)]" aria-label={brand}>
            <span aria-hidden="true" className="invisible col-start-1 row-start-1 tracking-[0.2em] md:tracking-[0.46em]">
              {brand}
            </span>
            <span className="apex-brand-text col-start-1 row-start-1 tracking-[0.2em] md:tracking-[0.34em]">{brand}</span>
          </a>
          <div className="flex items-center gap-4">
            <a href={ctaHref} onClick={menu.close} className="apex-cta tpl-hit relative border border-current px-[0.8em] py-[0.5em] tracking-[0.1em] whitespace-nowrap md:px-[1.1em] md:py-[0.62em] md:tracking-[0.16em]">
              {ctaLabel}
            </a>
            <button type="button" onClick={menu.close} className="apex-burger-btn tpl-hit relative" aria-label={closeLabel}>
              <Burger x />
            </button>
          </div>
        </div>

        <div className="mt-[6svh] grid min-h-0 flex-1 content-between gap-8 md:mt-0 md:grid-cols-12 md:content-stretch md:items-center md:gap-[1.6vw]">
          <ul className="apex-menu-list flex flex-col md:col-span-7" style={DISPLAY}>
            {links.map((l, i) => (
              <li key={`${l.label}-${i}`} className="overflow-hidden">
                <a
                  href={l.href}
                  onClick={menu.close}
                  style={{ '--i': i }}
                  className="apex-menu-link tpl-hit group relative flex items-baseline gap-[1.2vw] py-[0.04em] text-[clamp(2.3rem,11.5vw,4.25rem)] leading-[1.02] md:text-[clamp(2.6rem,8.6vw,8rem)] font-medium tracking-[-0.04em]"
                >
                  <span className="text-[11px] tracking-[0.16em] tabular-nums opacity-50 lg:text-[max(10px,0.6vw)]" style={LABEL}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{l.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {showFilm ? (
            <figure className="apex-menu-film relative aspect-[3/4] w-[44vw] max-w-[22rem] justify-self-end overflow-hidden md:col-span-3 md:col-start-10 md:w-full" aria-hidden="true">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                poster={poster}
                muted
                loop
                playsInline
                preload="none"
                disableRemotePlayback
                disablePictureInPicture
              />
            </figure>
          ) : null}
        </div>

        {lines.length ? (
          <div className="apex-menu-meta flex flex-wrap items-end justify-between gap-x-10 gap-y-1 text-[11px] tracking-[0.04em] opacity-60 md:uppercase md:tracking-[0.16em] lg:text-[max(10px,0.6vw)]" style={LABEL}>
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

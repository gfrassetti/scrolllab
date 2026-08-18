import { useRef } from 'react'
import { parseNavLinks } from '../../../lib/navLinks'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { attachScroll, magScale } from '../../../lib/beat'
import RuptureLayer from './RuptureLayer'

const LINK_CLASS =
  'px-1.5 py-0.5 text-[10px] tracking-[0.2em] uppercase md:text-[11px]'

/**
 * NavRatio — hairline bar (brand). Index sits as a bottom dock, then
 * each link rides a Beat rail into the header (Plates → Notes → Press).
 */
export default function NavRatio({
  brand = 'RATIO',
  links = ['Plates | #intro', 'Notes | #notes', 'Press | #index'],
  linksText,
  credit = '',
  menuLabel = 'MENU',
}) {
  const root = useRef(null)
  const items = parseNavLinks(links, linksText).slice(0, 3)

  useGSAP(
    () => {
      const wrap = root.current
      const shell = wrap.querySelector('[data-nav-shell]')
      const pieceEls = gsap.utils.toArray('[data-nav-item]', wrap)
      const phs = gsap.utils.toArray('[data-nav-ph]', wrap)
      const slashes = gsap.utils.toArray('[data-nav-slash]', wrap)
      if (!shell || pieceEls.length !== phs.length || !pieceEls.length) return undefined

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const floorGap = () => (window.matchMedia('(min-width: 768px)').matches ? 24 : 20)

      const layout = () => {
        const gapX = 8
        const padX = 18
        const padY = 10
        const widths = pieceEls.map((el) => el.offsetWidth)
        const h = Math.max(...pieceEls.map((el) => el.offsetHeight), 16)
        const row = widths.reduce((n, w) => n + w, 0) + gapX * (pieceEls.length - 1)
        const top = window.innerHeight - h - padY * 2 - floorGap()
        let x = (window.innerWidth - row) / 2
        const from = pieceEls.map((_, i) => {
          const pos = { top, left: x }
          x += widths[i] + gapX
          return pos
        })
        const to = phs.map((ph) => {
          const r = ph.getBoundingClientRect()
          return { top: r.top, left: r.left }
        })
        return {
          from,
          to,
          shell: {
            top: top - padY,
            left: from[0].left - padX,
            width: row + padX * 2,
            height: h + padY * 2,
          },
        }
      }

      let players = []
      let st

      const mountRails = () => {
        players = []
        const s = magScale(window.innerWidth)
        const { from, to, shell: box } = layout()
        gsap.set(shell, box)
        pieceEls.forEach((el, i) => {
          el.style.removeProperty('offset-path')
          el.style.removeProperty('offset-distance')
          el.style.removeProperty('offset-rotate')
          el.style.transform = ''
          gsap.set(el, {
            position: 'fixed',
            top: from[i].top,
            left: from[i].left,
            x: 0,
            y: 0,
            autoAlpha: 1,
          })
          players[i] = attachScroll(
            el,
            [
              {
                delay_px: i * 280,
                dx: (to[i].left - from[i].left) / s,
                dy: (to[i].top - from[i].top) / s,
                acc: 'ease-out',
                speed: 0.48,
              },
            ],
            s,
          )
        })
      }

      const seekAll = (progress) => {
        const max = Math.max(...players.map((p) => p.duration), 1)
        const px = progress * max
        players.forEach((p) => p.seek(px))
        const fade = reduced ? (progress > 0.2 ? 0 : 1) : 1 - Math.min(1, progress / 0.28)
        gsap.set(shell, { autoAlpha: fade })
        slashes.forEach((el) => {
          gsap.set(el, { opacity: progress > 0.62 ? 0.35 : 0 })
        })
      }

      const bind = () => {
        st?.kill()
        mountRails()
        const drawer = document.querySelector('[data-drawer]')
        if (!drawer) {
          seekAll(0)
          return
        }
        const trigger = drawer.closest('[data-plates-pin]') || drawer
        st = ScrollTrigger.create({
          trigger,
          start: 'top 94%',
          end: 'top -18%',
          scrub: reduced ? true : 0.6,
          invalidateOnRefresh: true,
          onRefresh(self) {
            mountRails()
            seekAll(self.progress)
          },
          onUpdate(self) {
            seekAll(self.progress)
          },
        })
        seekAll(st.progress)
      }

      const later = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bind()
          ScrollTrigger.refresh()
        })
      })

      return () => {
        cancelAnimationFrame(later)
        st?.kill()
      }
    },
    { scope: root, dependencies: [links, linksText] },
  )

  return (
    <div ref={root}>
      <header
        data-ratio-nav
        className="fixed inset-x-0 top-0 z-50 border-b border-ratio-ink bg-ratio-paper text-ratio-ink"
      >
        <div className="flex h-11 items-center gap-3 px-3 text-[10px] tracking-[0.18em] uppercase md:h-12 md:px-5 md:text-[11px]">
          <a href="#top" className="shrink-0 font-medium">
            {brand}
          </a>
          <div data-nav-slot className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
            {items.map((item, i) => (
              <span key={item.label} className="flex items-center">
                {i > 0 ? (
                  <span data-nav-slash className="px-1 opacity-0">
                    /
                  </span>
                ) : null}
                <span data-nav-ph className={`invisible ${LINK_CLASS}`}>
                  {item.label}
                </span>
              </span>
            ))}
          </div>
          {credit ? <span className="shrink-0 opacity-45">{credit}</span> : null}
        </div>
      </header>

      <nav aria-label="Index">
        <div
          data-nav-shell
          aria-hidden="true"
          className="pointer-events-none fixed z-50 border border-ratio-ink bg-ratio-paper"
        />
        {items.map((item) => (
          <a
            key={item.label}
            data-nav-item
            href={item.href}
            className={`pointer-events-auto fixed z-50 text-ratio-ink opacity-80 transition-opacity duration-200 ease-[var(--ease-out)] hover:opacity-100 active:opacity-50 ${LINK_CLASS}`}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <RuptureLayer />
    </div>
  )
}

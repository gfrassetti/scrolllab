import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { getLenis } from '../../../hooks/useLenis'
import { useMobileMenu } from '../../../hooks/useMobileMenu'

/** One link per line; `Label | #target` points it somewhere, else it stays put. */
function parseLinks(value, fallback) {
  const lines = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? value.split('\n')
      : []
  const links = lines
    .map((line) => {
      const [label, href] = line.split('|').map((part) => part.trim())
      return { label, href: href || '#' }
    })
    .filter((link) => link.label)
  return links.length ? links : fallback
}

const DEFAULT_LINKS = [
  { label: 'Flavors', href: '#' },
  { label: 'Our story', href: '#' },
  { label: 'Shop', href: '#' },
  { label: 'Contact', href: '#' },
]

// One wave tile (seamless left to right); three of them loop under the panel's top edge.
const WAVE =
  'M1656.91.5c-114.82,0-144,33.89-281.25,33.89S1199.96.5,1101.7.5s-161.28,42.03-280.37,42.03S612.53.5,512.13.5s-148.46,33.89-258.47,33.89S116.92.5.5.5v379.13h1656.41V.5Z'

const OPEN = 1.2
const QUICK = 'ease-[cubic-bezier(0.33,0.01,0.31,0.99)]'

function MenuIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-8 ${className}`} aria-hidden="true">
      {[7, 12, 17].map((y) => (
        <path
          key={y}
          d={`M5.44 ${y}h13.12`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

function CloseIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-8 ${className}`} aria-hidden="true">
      <path
        d="M7 7l10 10M17 7L7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * NavFizz — wordmark and a menu button; the menu is a full-screen panel that
 * rises from the bottom with a wavy edge, then the links climb in one by one.
 * Hovering a link rolls it to its light-weight twin and dims the rest.
 */
export default function NavFizz({
  brand = 'BRAND*',
  links = 'Flavors\nOur story\nShop\nContact',
  cta = 'Your CTA',
  menuBg = '#fff3e2',
  menuInk = '#2c4bff',
}) {
  const items = parseLinks(links, DEFAULT_LINKS)
  const { open, close, panelRef, panelProps, triggerProps } = useMobileMenu({
    breakpoint: null,
  })
  const wavesRef = useRef(null)
  const brandRef = useRef(null)
  const loopRef = useRef(null)
  const wasOpen = useRef(false)
  const [closing, setClosing] = useState(false)

  // Closing keeps the panel visible until it has left; set before paint.
  useLayoutEffect(() => {
    if (wasOpen.current && !open) setClosing(true)
  }, [open])

  useGSAP(
    () => {
      const panel = panelRef.current
      const waves = wavesRef.current
      if (!panel) return undefined
      const reduced = prefersReducedMotion()
      const hiddenY = () => window.innerHeight * 1.25

      if (!wasOpen.current && !open) {
        gsap.set(panel, { y: hiddenY(), opacity: 1 })
        gsap.set(waves, { transformOrigin: 'center bottom', scaleY: 1 })
        return undefined
      }

      const stopWaves = () => {
        loopRef.current?.kill()
        loopRef.current = null
      }
      const finish = () => {
        stopWaves()
        setClosing(false)
      }

      if (open) {
        wasOpen.current = true
        if (reduced) {
          gsap.set(panel, { y: 0, opacity: 0 })
          gsap.to(panel, { opacity: 1, duration: 0.2 })
          panel.dataset.shown = 'true'
          return undefined
        }
        loopRef.current = gsap.fromTo(
          waves,
          { xPercent: 0 },
          { xPercent: -33.333, duration: 8, ease: 'none', repeat: -1 },
        )
        gsap.fromTo(panel, { y: hiddenY() }, { y: 0, duration: OPEN, ease: 'power3.out' })
        gsap.to(waves, {
          scaleY: 0,
          duration: OPEN * 0.8,
          ease: 'power2.inOut',
        })
        // The links start climbing while the panel is still on its way.
        gsap.delayedCall(OPEN * 0.4, () => {
          panel.dataset.shown = 'true'
        })
        return () => gsap.killTweensOf([panel, waves])
      }

      wasOpen.current = false
      panel.dataset.shown = 'false'
      if (reduced) {
        gsap.to(panel, {
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            gsap.set(panel, { y: hiddenY() })
            finish()
          },
        })
        return undefined
      }
      gsap.to(panel, {
        y: hiddenY(),
        duration: OPEN,
        ease: 'power3.inOut',
        onComplete: finish,
      })
      gsap.to(waves, { scaleY: 1, duration: OPEN * 0.65, ease: 'power1.out' })
      return undefined
    },
    { dependencies: [open], scope: panelRef },
  )

  // The wordmark belongs to the first screen: it rides up with the page and fades.
  useGSAP(() => {
    if (prefersReducedMotion()) return
    gsap.to(brandRef.current, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        start: 0,
        end: () => window.innerHeight * 0.4,
        scrub: true,
      },
    })
  })

  const go = (event, href) => {
    close()
    if (!href.startsWith('#') || href === '#') return
    const target = document.querySelector(href)
    if (!target) return
    event.preventDefault()
    // Wait for the panel to leave before scrolling underneath it.
    gsap.delayedCall(OPEN * 0.5, () => {
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(target, { duration: 1 })
      else target.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const visible = open || closing

  return (
    <>
      <a
        ref={brandRef}
        href="#top"
        className="ui-press tpl-hit absolute top-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foam px-5 py-2 font-brico text-lg font-extrabold tracking-tight md:top-7"
        style={{ color: menuInk }}
      >
        {brand}
      </a>

      <button
        {...triggerProps}
        aria-label="Menu"
        className="ui-press fixed bottom-4 left-1/2 z-50 grid size-14 -translate-x-1/2 place-items-center rounded-[1.25rem] bg-foam transition-[border-radius,transform] duration-300 ease-out hover:rounded-full md:top-6 md:right-8 md:bottom-auto md:left-auto md:size-16 md:translate-x-0"
        style={{ color: menuInk }}
      >
        <MenuIcon />
      </button>

      <div
        {...panelProps}
        aria-label="Menu"
        data-shown="false"
        className="group/menu fixed inset-0 z-[100] will-change-transform"
        style={{
          backgroundColor: menuBg,
          color: menuInk,
          visibility: visible ? 'visible' : 'hidden',
        }}
      >
        <svg
          ref={wavesRef}
          viewBox="0 0 4970.24 380.13"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute bottom-full left-0 block h-[120px] w-[300%]"
          style={{ fill: menuBg }}
        >
          <path d={WAVE} />
          <path d={WAVE} transform="translate(1656.41 0)" />
          <path d={WAVE} transform="translate(3312.82 0)" />
        </svg>

        <a
          href="#top"
          onClick={close}
          className={`tpl-hit absolute top-6 left-1/2 z-[3] -translate-x-1/2 font-brico text-lg font-extrabold tracking-tight opacity-0 transition-opacity duration-[400ms] ${QUICK} group-data-[shown=true]/menu:opacity-100 md:top-8`}
        >
          {brand}
        </a>

        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className={`ui-press group/close absolute top-4 right-4 z-[3] grid size-14 translate-y-1/4 place-items-center rounded-[1.25rem] opacity-0 transition-[opacity,transform,border-radius] duration-[400ms] ${QUICK} hover:rounded-full group-data-[shown=true]/menu:translate-y-0 group-data-[shown=true]/menu:opacity-100 md:top-6 md:right-8 md:size-16`}
          style={{ backgroundColor: menuInk, color: menuBg }}
        >
          <CloseIcon className="transition-transform duration-300 ease-out group-hover/close:rotate-90" />
        </button>

        <nav
          aria-label="Menu"
          className="relative z-[2] flex h-full flex-col items-center justify-center gap-[clamp(1.5rem,5svh,3rem)] px-5"
        >
          <ul className="flex flex-col items-center [@media(hover:hover)]:[&:has(a:hover)_a:not(:hover)]:opacity-30">
            {items.map((item, i) => (
              <li key={`${item.label}-${i}`}>
                <a
                  href={item.href}
                  onClick={(event) => go(event, item.href)}
                  className="group/link tpl-hit relative block w-max py-2 text-center transition-opacity duration-300"
                >
                  <span className="grid place-items-center overflow-hidden">
                    <span
                      className={`grid place-items-center translate-y-full opacity-0 transition-[transform,opacity] duration-[600ms] ${QUICK} group-data-[shown=true]/menu:translate-y-0 group-data-[shown=true]/menu:opacity-100`}
                      style={{ transitionDelay: `${i * 70}ms` }}
                    >
                      <span
                        className={`col-start-1 row-start-1 block font-brico text-[min(11vw,13svh)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase transition-transform duration-[400ms] ${QUICK} group-hover/link:-translate-y-full group-focus-visible/link:-translate-y-full`}
                      >
                        {item.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`col-start-1 row-start-1 block translate-y-full font-brico text-[min(11vw,13svh)] leading-[0.95] font-extralight tracking-[0.02em] uppercase transition-transform duration-[400ms] ${QUICK} group-hover/link:translate-y-0 group-focus-visible/link:translate-y-0`}
                      >
                        {item.label}
                      </span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#"
            onClick={close}
            className={`ui-press tpl-hit relative translate-y-full rounded-full border border-current px-7 py-4 text-xs font-semibold tracking-[0.2em] uppercase opacity-0 transition-[transform,opacity,background-color,color] duration-[600ms] ${QUICK} hover:bg-[var(--menu-ink)] hover:text-[var(--menu-bg)] group-data-[shown=true]/menu:translate-y-0 group-data-[shown=true]/menu:opacity-100`}
            style={{
              '--menu-bg': menuBg,
              '--menu-ink': menuInk,
              transitionDelay: `${items.length * 70}ms, ${items.length * 70}ms, 0ms, 0ms`,
            }}
          >
            {cta}
          </a>
        </nav>
      </div>
    </>
  )
}

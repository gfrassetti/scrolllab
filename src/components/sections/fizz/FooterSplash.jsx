import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

const defaultColumns = [
  { heading: 'Navigation', items: ['Flavors', 'Our story', 'Shop', 'Press'] },
  { heading: 'Legal', items: ['Legal notice', 'Privacy', 'Cookies'] },
]

const rand = (min, max) => min + Math.random() * (max - min)

/**
 * FooterSplash — the closing screen: one full viewport of flat color, the link
 * columns on top, the brand set huge and tilted along the bottom, and glass
 * bubbles rising out of it (only while the footer is on screen).
 */
export default function FooterSplash({
  ctaWord = 'BRAND*',
  email = 'hello@placeholder.studio',
  ctaHref,
  columns = defaultColumns,
  links,
  bg = '#2c4bff',
  fg = '#fff3e2',
  legal = '©2026 Placeholder Brand — Template, not a promise',
  note = 'Placeholder closing note. Tell people where to go next — swap this text and the links for your own.',
  backToTop = 'Back to top ↑',
}) {
  const root = useRef(null)
  const bubblesRef = useRef(null)
  const cta = ctaHref || `mailto:${email}`
  const flatLinks = Array.isArray(links) ? links.filter((l) => l && l.label) : []

  useGSAP(
    () => {
      // Calma: la marca entra con un fundido; las burbujas que suben no se prenden.
      if (prefersReducedMotion()) return calmReveal('[data-splash-word]', { y: 18, duration: 0.9 })

      const split = new SplitText('[data-splash-word]', { type: 'chars', mask: 'chars' })
      gsap.from(split.chars, {
        yPercent: 115,
        stagger: 0.05,
        ease: 'power4.out',
        duration: 1.2,
        scrollTrigger: { trigger: root.current, start: 'top 35%', once: true },
      })

      /* ── Burbujas: un pool de círculos de vidrio que sube y se achica ── */
      const host = bubblesRef.current
      const phone = window.innerWidth < 768
      const pool = Array.from({ length: phone ? 10 : 20 }, () => {
        const el = document.createElement('span')
        el.style.cssText =
          'position:absolute;left:0;bottom:0;border-radius:9999px;border:2px solid currentColor;opacity:0;will-change:transform'
        const shine = document.createElement('i')
        shine.style.cssText =
          'position:absolute;top:15%;left:20%;width:34%;height:19%;border-radius:9999px;background:currentColor;transform:rotate(-35deg)'
        el.appendChild(shine)
        host.appendChild(el)
        return { el, busy: false }
      })

      const spawn = () => {
        const bubble = pool.find((b) => !b.busy)
        if (!bubble) return
        bubble.busy = true
        const size = phone ? rand(34, 84) : rand(44, 128)
        const rise = host.clientHeight + size + 60
        gsap.set(bubble.el, {
          width: size,
          height: size,
          left: `${rand(0, 100)}%`,
          xPercent: -50,
          y: size,
          x: 0,
          scale: 1,
          opacity: 0,
        })
        const tl = gsap.timeline({
          onComplete: () => {
            bubble.busy = false
          },
        })
        tl.to(bubble.el, { opacity: 1, duration: 0.3, ease: 'none' }, 0)
        tl.to(bubble.el, { y: -rise, duration: rand(4.5, 8), ease: 'power1.out' }, 0)
        tl.to(bubble.el, { x: rand(-110, 110), duration: rand(4.5, 8), ease: 'sine.inOut' }, 0)
        tl.to(bubble.el, { scale: 0.5, duration: 1.4, ease: 'power1.in' }, '>-1.4')
        tl.to(bubble.el, { opacity: 0, duration: 0.5, ease: 'none' }, '>-0.5')
      }

      let inView = false
      let burst = true
      let acc = 0
      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting
        if (inView && burst) {
          burst = false
          for (let i = 0; i < (phone ? 4 : 8); i += 1) gsap.delayedCall(i * 0.12, spawn)
        }
      })
      io.observe(root.current)

      const step = (_, deltaMs) => {
        if (!inView) return
        acc += deltaMs / 1000
        const every = phone ? 0.65 : 0.42
        if (acc >= every) {
          acc = 0
          spawn()
        }
      }
      gsap.ticker.add(step)

      return () => {
        io.disconnect()
        gsap.ticker.remove(step)
        pool.forEach(({ el }) => {
          gsap.killTweensOf(el)
          el.remove()
        })
      }
    },
    { scope: root },
  )

  return (
    <footer
      ref={root}
      className="relative flex min-h-svh flex-col overflow-hidden px-5 pt-24 pb-0 md:px-10 md:pt-28"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div ref={bubblesRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />

      <div className="relative grid gap-12 md:grid-cols-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-8 md:grid-cols-3">
          {flatLinks.length > 0 ? (
            <nav aria-label="Links" className="col-span-2 md:col-span-3">
              <ul className="grid grid-cols-2 gap-x-8 md:grid-cols-3 lg:gap-y-2">
                {flatLinks.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.href || '#'}
                      className="tpl-link tpl-hit relative inline-block py-3 text-sm uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <>
              {columns.map((column) => (
                <nav key={column.heading} aria-label={column.heading}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-55 md:text-xs lg:mb-5">
                    {column.heading}
                  </p>
                  <ul className="lg:space-y-1">
                    {column.items.map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          className="tpl-link tpl-hit relative inline-block py-3 text-sm uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
              <div className="col-span-2 md:col-span-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-55 md:text-xs lg:mb-5">
                  Contact
                </p>
                <a
                  href={cta}
                  className="tpl-link tpl-hit relative inline-block py-3 text-sm [overflow-wrap:anywhere] uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
                >
                  {email}
                </a>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 md:col-span-4 md:items-end md:text-right">
          <p className="max-w-[34ch] text-sm leading-relaxed opacity-80 md:text-base">{note}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-55 md:text-xs">
            {legal}
          </p>
          <a
            href="#top"
            className="tpl-link tpl-hit relative self-start text-[11px] font-semibold uppercase tracking-[0.22em] transition-opacity duration-300 hover:opacity-70 md:self-end md:text-xs"
          >
            {backToTop}
          </a>
        </div>
      </div>

      <p
        aria-label={ctaWord}
        className="relative mt-auto -mb-[0.1em] origin-bottom-left -rotate-[4deg] pt-16 select-none md:pt-24"
      >
        <span
          data-splash-word
          aria-hidden="true"
          className="-ml-[0.04em] block font-brico text-[clamp(5.5rem,27vw,34rem)] leading-[0.82] font-extrabold tracking-[-0.045em] whitespace-nowrap uppercase"
        >
          {ctaWord}
        </span>
      </p>
    </footer>
  )
}

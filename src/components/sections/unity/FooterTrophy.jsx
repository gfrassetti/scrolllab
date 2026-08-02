import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import RisingOrb from './RisingOrb'

/**
 * FooterTrophy — sky closer. Super-size type behind a rising
 * transparent PNG cutout (Framer “lift” beat).
 */
export default function FooterTrophy({
  eyebrow = 'EYEBROW 6',
  title = 'BUT ONLY ONE LINE\nWILL LIFT THE MARK',
  accentWord = 'ONE LINE',
  metaLeft = 'META 2',
  metaRight = 'LINK 6',
  orbSrc = '',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const type = () => root.current?.querySelector('[data-trophy-type]')

      const fitType = () => {
        const el = type()
        if (!el) return
        el.style.fontSize = ''
        // Force layout with base clamp size before measuring natural width.
        void el.offsetWidth
        const pad = 24
        const avail = Math.max(120, (root.current?.clientWidth || window.innerWidth) - pad)
        let natural = 0
        el.querySelectorAll(':scope > span').forEach((line) => {
          natural = Math.max(natural, line.scrollWidth)
        })
        if (!natural) natural = el.scrollWidth
        if (natural <= avail) return
        const current = parseFloat(getComputedStyle(el).fontSize) || 16
        el.style.fontSize = `${Math.max(32, current * (avail / natural))}px`
      }

      const scheduleFit = () => {
        fitType()
        requestAnimationFrame(fitType)
        window.setTimeout(fitType, 60)
        window.setTimeout(fitType, 200)
        document.fonts?.ready?.then(() => fitType())
      }
      scheduleFit()

      const ro = new ResizeObserver(scheduleFit)
      if (root.current) ro.observe(root.current)
      window.addEventListener('resize', scheduleFit)

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('[data-trophy]', { yPercent: 0 })
        return () => {
          ro.disconnect()
          window.removeEventListener('resize', scheduleFit)
        }
      }

      gsap.fromTo(
        '[data-trophy]',
        { yPercent: 72 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 90%',
            end: 'bottom bottom',
            scrub: 0.65,
          },
        },
      )

      gsap.fromTo(
        '[data-trophy-type]',
        { y: 40, opacity: 0.35 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 80%',
            end: 'top 40%',
            scrub: 0.4,
            onRefresh: fitType,
          },
        },
      )

      return () => {
        ro.disconnect()
        window.removeEventListener('resize', scheduleFit)
      }
    },
    { scope: root },
  )

  const lines = String(title)
    .split(/\n|\\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const paintLine = (line, key) => {
    const accent = String(accentWord)
    if (!accent) {
      return (
        <span key={key} className="inline-block whitespace-nowrap">
          {line}
        </span>
      )
    }
    const parts = line.split(new RegExp(`(${accent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'))
    return (
      <span key={key} className="inline-block whitespace-nowrap">
        {parts.map((part, i) =>
          part.toLowerCase() === accent.toLowerCase() ? (
            <span key={i} className="text-[#f4c518]">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    )
  }

  return (
    <footer
      ref={root}
      id="winner"
      className="relative overflow-hidden px-3 pt-14 pb-5 text-[#f7f2e8] md:px-6 md:pt-16 md:pb-6"
      style={{
        background: 'linear-gradient(180deg, #2f8f9a 0%, #4aa8c8 42%, #7ec8e0 100%)',
      }}
    >
      <p className="relative z-30 text-center text-[10px] tracking-[0.32em] uppercase md:text-[11px]">
        {eyebrow}
      </p>

      {/* Type + PNG stack: giant condensed headline, cutout on top */}
      <div className="relative mx-auto mt-4 flex min-h-[78svh] max-w-[100vw] flex-col items-center justify-center md:mt-6 md:min-h-[82svh]">
        <h2
          data-trophy-type
          className="relative z-0 flex w-max max-w-none flex-col items-center text-center font-oswald text-[clamp(5.5rem,22vw,16rem)] leading-[0.8] font-bold tracking-[-0.045em] uppercase"
        >
          {lines.map((line, i) => paintLine(line, i))}
        </h2>

        {/* Transparent PNG above type — rises on scrub (Framer “lift”) */}
        <div
          data-trophy
          className="pointer-events-none absolute bottom-[-8%] left-1/2 z-20 w-[min(78vw,520px)] -translate-x-1/2 will-change-transform md:bottom-[-10%] md:w-[min(52vw,580px)]"
        >
          <RisingOrb src={orbSrc || undefined} />
        </div>
      </div>

      <div className="relative z-30 mt-2 flex items-end justify-between gap-4 border-t border-white/25 pt-4 text-[10px] tracking-[0.22em] uppercase md:mt-4">
        <span>{metaLeft}</span>
        <a href="#top" className="transition-opacity hover:opacity-70">
          {metaRight}
        </a>
      </div>
    </footer>
  )
}

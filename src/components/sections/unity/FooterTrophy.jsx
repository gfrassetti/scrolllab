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
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('[data-trophy]', { yPercent: 0 })
        return
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
          },
        },
      )
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
        <span key={key} className="block whitespace-nowrap">
          {line}
        </span>
      )
    }
    const parts = line.split(new RegExp(`(${accent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'))
    return (
      <span key={key} className="block whitespace-nowrap">
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
          className="relative z-0 w-full max-w-[98vw] text-center font-oswald text-[clamp(4.6rem,18.5vw,13.5rem)] leading-[0.82] font-bold tracking-[-0.04em] uppercase"
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

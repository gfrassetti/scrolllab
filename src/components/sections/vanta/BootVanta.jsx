import { useEffect, useRef, useState } from 'react'
import { getLenis } from '../../../hooks/useLenis'

const PATHS = [
  'VANTA://CITADEL/BEAM/07',
  'VANTA://ROSTER/OPERATORS/COUNT',
  'VANTA://FACTIONS/AEGIS/RAVEN',
  'VANTA://WORLD/RIDGE/SCAN',
  'VANTA://DROP/REACTOR/ISOTOPE-C',
]

function lockScroll() {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  getLenis()?.stop()
}

function unlockScroll() {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  getLenis()?.start()
}

/**
 * BootVanta — white loader (progress + path + click-to-sound), then the mark.
 * Scroll is locked until the overlay dismisses. Not a scroll timeline.
 */
export default function BootVanta({
  brand = 'VANTA',
  loadingLabel = 'Loading',
  soundLabel = 'Click to enable sound',
  readyLabel = 'Sound on',
}) {
  const [pct, setPct] = useState(0)
  const [path, setPath] = useState(PATHS[0])
  const [sound, setSound] = useState(false)
  const [phase, setPhase] = useState('load')
  const ctx = useRef(null)
  const poll = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPct(100)
      setPhase('done')
      return undefined
    }

    lockScroll()
    poll.current = window.setInterval(() => getLenis()?.stop(), 40)
    const start = performance.now()
    const dur = 2800
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setPct(Math.round(t * 100))
      setPath(PATHS[Math.min(PATHS.length - 1, Math.floor(t * PATHS.length))])
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setPhase('mark')
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf.current)
      window.clearInterval(poll.current)
      unlockScroll()
    }
  }, [])

  useEffect(() => {
    if (phase === 'mark' || phase === 'done') {
      window.clearInterval(poll.current)
    }
    if (phase === 'done') unlockScroll()
  }, [phase])

  useEffect(() => {
    if (phase !== 'mark') return undefined
    const id = window.setTimeout(() => setPhase('done'), 1100)
    return () => window.clearTimeout(id)
  }, [phase])

  const enableSound = () => {
    if (sound) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) {
        setSound(true)
        return
      }
      const audio = ctx.current || new AudioCtx()
      ctx.current = audio
      audio.resume()
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.value = 0.04
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12)
      osc.stop(audio.currentTime + 0.14)
    } catch {
      /* ignore */
    }
    setSound(true)
  }

  if (phase === 'done') return null

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#f4f1ea] text-[#111114]"
      role="dialog"
      aria-label={loadingLabel}
      aria-busy={phase === 'load'}
    >
      {phase === 'load' ? (
        <button
          type="button"
          onClick={enableSound}
          className="absolute inset-0 flex flex-col items-center justify-center gap-8"
        >
          <div className="flex w-[min(92vw,56rem)] items-end justify-between gap-6 border-b border-[#111114] pb-2 font-mono text-[11px] tracking-[0.14em] uppercase md:text-[13px]">
            <span>
              ▶▶ {loadingLabel} - {pct}%
            </span>
            <span className="truncate text-right opacity-70">{path}</span>
          </div>
          <span className="grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full border border-[#111114] transition-transform duration-200 ease-[var(--ease-out)] hover:scale-105">
              {sound || pct >= 50 ? (
                <span aria-hidden="true" className="flex gap-[3px]">
                  <span className="h-3 w-[3px] bg-current" />
                  <span className="h-3 w-[3px] bg-current" />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-current"
                />
              )}
            </span>
            <span className="mt-3 font-mono text-[9px] tracking-[0.22em] uppercase">
              {sound ? readyLabel : soundLabel}
            </span>
          </span>
        </button>
      ) : (
        <div className="relative grid h-full place-items-center overflow-hidden">
          <div aria-hidden="true" className="vanta-boot-grain pointer-events-none absolute inset-0" />
          <p className="font-anton relative text-[clamp(5rem,28vw,18rem)] leading-none tracking-[-0.06em]">
            {brand}
          </p>
        </div>
      )}
    </div>
  )
}

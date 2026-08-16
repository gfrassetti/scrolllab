import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import VantaMark from './VantaMark'
import sliver from './assets/hero-face.jpg'

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
 * BootVanta — KPR-style loader: geometric mark forming in place (grain,
 * melt, letter-as-window), HUD line + click-to-sound. Not a title card.
 */
export default function BootVanta({
  brand = 'VANTA',
  loadingLabel = 'Loading',
  soundLabel = 'Click to enable sound',
  readyLabel = 'Sound on',
  playLabel = 'PLAY',
}) {
  const [pct, setPct] = useState(0)
  const [path, setPath] = useState(PATHS[0])
  const [sound, setSound] = useState(false)
  const [phase, setPhase] = useState('load')
  const overlay = useRef(null)
  const markWrap = useRef(null)
  const ctx = useRef(null)
  const poll = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPct(100)
      window.dispatchEvent(new CustomEvent('vanta:boot-out'))
      setPhase('done')
      return undefined
    }

    lockScroll()
    poll.current = window.setInterval(() => getLenis()?.stop(), 40)
    const start = performance.now()
    const dur = 3400
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setPct(Math.round(t * 100))
      setPath(PATHS[Math.min(PATHS.length - 1, Math.floor(t * PATHS.length))])
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setPhase('hold')
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf.current)
      window.clearInterval(poll.current)
      unlockScroll()
    }
  }, [])

  useEffect(() => {
    if (phase === 'hold' || phase === 'done') window.clearInterval(poll.current)
    if (phase === 'done') unlockScroll()
  }, [phase])

  useEffect(() => {
    if (phase !== 'hold') return undefined
    const id = window.setTimeout(() => setPhase('out'), 900)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'out') return undefined
    window.dispatchEvent(new CustomEvent('vanta:boot-out'))
    const node = overlay.current
    const mark = markWrap.current
    if (node) {
      gsap.to(node, { autoAlpha: 0, duration: 1.25, ease: 'power3.out' })
    }
    if (mark) {
      gsap.to(mark, { scale: 1.08, duration: 1.25, ease: 'power3.out' })
    }
    const id = window.setTimeout(() => {
      gsap.killTweensOf([node, mark])
      unlockScroll()
      setPhase('done')
    }, 1300)
    return () => {
      window.clearTimeout(id)
      gsap.killTweensOf([node, mark])
    }
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

  const formed = pct / 100

  return (
    <div
      ref={overlay}
      data-vanta-boot=""
      className="fixed inset-0 z-[80] bg-[#f4f1ea] text-[#111114]"
      role="dialog"
      aria-label={brand}
      aria-busy={phase === 'load'}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-3 md:h-14 md:px-5">
        <span aria-hidden="true" className="relative grid size-12 place-items-center">
          <span className="absolute h-[1.5px] w-[22px] -translate-y-[5px] bg-current" />
          <span className="absolute h-[1.5px] w-4 translate-y-[5px] bg-current" />
        </span>
        <span className="vanta-chamfer bg-white px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-black uppercase">
          {playLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={enableSound}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-0 ${
          phase === 'out' ? 'pointer-events-none' : ''
        }`}
      >
        <div ref={markWrap} className="relative w-[min(96vw,92rem)] px-4">
          <VantaMark
            progress={formed}
            sliver={formed > 0.42 ? sliver : undefined}
            className="block w-full"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-[8%] bottom-[18%] left-1/2 w-px -translate-x-1/2 bg-[#111114]/35"
          />
        </div>

        <div className="mt-2 flex w-[min(92vw,56rem)] items-end justify-between gap-6 border-b border-[#111114] pb-2 font-mono text-[11px] tracking-[0.14em] uppercase md:text-[13px]">
          <span>
            ▶▶ {loadingLabel} - {pct}%
          </span>
          <span className="truncate text-right opacity-70">{path}</span>
        </div>

        <span className="mt-8 grid place-items-center">
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

      <div aria-hidden="true" className="vanta-boot-grain pointer-events-none absolute inset-0 z-30" />
    </div>
  )
}

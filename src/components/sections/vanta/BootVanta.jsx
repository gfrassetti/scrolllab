import { useEffect, useId, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import VantaMark, { LETTERS } from './VantaMark'

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

function smoothstep(t, a, b) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

function syncHole(zoom, src, hole) {
  if (!zoom || !src || !hole) return
  const m = src.getScreenCTM()
  if (!m) return
  const r = zoom.getBoundingClientRect()
  hole.setAttribute(
    'transform',
    `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e - r.left} ${m.f - r.top})`,
  )
}

/**
 * Cream veil with an A-shaped hole onto the live hero. Black ink dissolves
 * on that same hole; then the veil scales through it. One photo, no reload.
 */
export default function BootVanta({
  brand = 'VANTA',
  loadingLabel = 'Loading',
  soundLabel = 'Click to enable sound',
  readyLabel = 'Sound on',
  playLabel = 'PLAY',
}) {
  const maskUid = `boot-veil-${useId().replace(/:/g, '')}`
  const [pct, setPct] = useState(0)
  const [path, setPath] = useState(PATHS[0])
  const [sound, setSound] = useState(false)
  const [phase, setPhase] = useState('load')
  const [view, setView] = useState({ w: 1920, h: 1080 })
  const overlay = useRef(null)
  const zoom = useRef(null)
  const markWrap = useRef(null)
  const hole = useRef(null)
  const ctx = useRef(null)
  const poll = useRef(0)
  const raf = useRef(0)
  const phaseLock = useRef('load')
  phaseLock.current = phase

  useEffect(() => {
    const measure = () => setView({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPct(100)
      window.dispatchEvent(new CustomEvent('vanta:boot-out'))
      setPhase('done')
      return undefined
    }

    lockScroll()
    gsap.set('[data-vanta-nav]', { autoAlpha: 0 })
    poll.current = window.setInterval(() => getLenis()?.stop(), 40)
    const start = performance.now()
    const dur = 3400
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setPct(Math.round(t * 100))
      setPath(PATHS[Math.min(PATHS.length - 1, Math.floor(t * PATHS.length))])
      if (phaseLock.current === 'out') return
      syncHole(
        zoom.current,
        markWrap.current?.querySelector('[data-vanta-a-path]'),
        hole.current,
      )
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
    if (phase === 'out') return undefined
    let id = 0
    const loop = () => {
      syncHole(
        zoom.current,
        markWrap.current?.querySelector('[data-vanta-a-path]'),
        hole.current,
      )
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'hold' || phase === 'done') window.clearInterval(poll.current)
    if (phase === 'done') unlockScroll()
  }, [phase])

  useEffect(() => {
    if (phase !== 'hold') return undefined
    const id = window.setTimeout(() => setPhase('out'), 480)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'out') return undefined
    const node = overlay.current
    const stage = zoom.current
    const mark = markWrap.current
    const aBox = mark?.querySelector('[data-vanta-a]')
    if (!node || !stage || !aBox) {
      window.dispatchEvent(new CustomEvent('vanta:boot-out'))
      unlockScroll()
      setPhase('done')
      return undefined
    }

    syncHole(stage, mark.querySelector('[data-vanta-a-path]'), hole.current)

    const chrome = node.querySelectorAll('[data-boot-chrome]')
    const letters = mark.querySelectorAll('[data-vanta-letter]')
    const veil = stage.querySelector('[data-boot-veil]')
    const zr = stage.getBoundingClientRect()
    const hr = aBox.getBoundingClientRect()
    const ox = ((hr.left + hr.width / 2 - zr.left) / Math.max(zr.width, 1)) * 100
    const oy = ((hr.top + hr.height / 2 - zr.top) / Math.max(zr.height, 1)) * 100
    const scale = Math.max(window.innerWidth / hr.width, window.innerHeight / hr.height) * 2.4

    gsap.set(stage, { transformOrigin: `${ox}% ${oy}%` })

    const tl = gsap.timeline({
      onComplete: () => {
        window.dispatchEvent(new CustomEvent('vanta:boot-out'))
        gsap.set('[data-vanta-nav]', { autoAlpha: 1 })
        unlockScroll()
        setPhase('done')
      },
    })
    tl.to(chrome, { autoAlpha: 0, duration: 0.32, ease: 'power2.out' }, 0)
    tl.to(letters, { autoAlpha: 0, duration: 0.36, ease: 'power2.out' }, 0)
    tl.to(stage, { scale, duration: 1.65, ease: 'power3.inOut' }, 0.08)
    tl.to(veil, { autoAlpha: 0, duration: 0.85, ease: 'power2.inOut' }, 0.72)
    tl.to('[data-vanta-nav]', { autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, 1.25)

    return () => tl.kill()
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
  const ink = 1 - smoothstep(formed, 0.34, 0.78)

  return (
    <div
      ref={overlay}
      data-vanta-boot=""
      className="fixed inset-0 z-[80] overflow-hidden text-[#111114]"
      role="dialog"
      aria-label={brand}
      aria-busy={phase === 'load'}
    >
      <div ref={zoom} className="absolute inset-0 will-change-transform">
        <svg
          data-boot-veil=""
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={view.w}
          height={view.h}
          viewBox={`0 0 ${view.w} ${view.h}`}
          aria-hidden="true"
        >
          <defs>
            <mask id={maskUid} maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width={view.w} height={view.h} fill="white" />
              <path
                ref={hole}
                d={LETTERS.A}
                fill="black"
                fillRule="evenodd"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={view.w}
            height={view.h}
            fill="#f4f1ea"
            mask={`url(#${maskUid})`}
          />
        </svg>

        <button
          type="button"
          onClick={enableSound}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-0 ${
            phase === 'out' ? 'pointer-events-none' : ''
          }`}
        >
          <div ref={markWrap} className="relative w-[min(96vw,92rem)] px-4">
            <VantaMark progress={formed} ink={ink} className="block w-full" />
            <span
              data-boot-chrome=""
              aria-hidden="true"
              className="pointer-events-none absolute top-[8%] bottom-[18%] left-1/2 w-px -translate-x-1/2 bg-[#111114]/35"
            />
          </div>

          <div
            data-boot-chrome=""
            className="mt-2 flex w-[min(92vw,56rem)] items-end justify-between gap-6 border-b border-[#111114] pb-2 font-mono text-[11px] tracking-[0.14em] uppercase md:text-[13px]"
          >
            <span>
              ▶▶ {loadingLabel} - {pct}%
            </span>
            <span className="truncate text-right opacity-70">{path}</span>
          </div>

          <span data-boot-chrome="" className="mt-8 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full border border-[#111114] bg-[#f4f1ea] transition-transform duration-200 ease-[var(--ease-out)] hover:scale-105">
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
      </div>

      <div
        data-boot-chrome=""
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-3 md:h-14 md:px-5"
      >
        <span aria-hidden="true" className="relative grid size-12 place-items-center">
          <span className="absolute h-[1.5px] w-[22px] -translate-y-[5px] bg-current" />
          <span className="absolute h-[1.5px] w-4 translate-y-[5px] bg-current" />
        </span>
        <span className="vanta-chamfer bg-white px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-black uppercase">
          {playLabel}
        </span>
      </div>
    </div>
  )
}

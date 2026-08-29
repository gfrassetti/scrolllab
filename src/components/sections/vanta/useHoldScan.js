import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pointer-hold progress 0→1. Signature mechanic of VANTA (KPR click-and-hold).
 * Eases in on press, eases out on release. Keyboard: Space / Enter while focused.
 */
export function useHoldScan({ duration = 0.5 } = {}) {
  const [progress, setProgress] = useState(0)
  const held = useRef(false)
  const value = useRef(0)
  const raf = useRef(0)

  const tick = useCallback(() => {
    const target = held.current ? 1 : 0
    const step = 1 / Math.max(8, duration * 60)
    value.current = held.current
      ? Math.min(1, value.current + step)
      : Math.max(0, value.current - step * 1.35)
    setProgress(value.current)
    if (Math.abs(value.current - target) > 0.004) {
      raf.current = requestAnimationFrame(tick)
    }
  }, [duration])

  const start = useCallback(() => {
    held.current = true
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
  }, [tick])

  const stop = useCallback(() => {
    held.current = false
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
  }, [tick])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const onKeyDown = useCallback(
    (event) => {
      if (event.repeat) return
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        start()
      }
    },
    [start],
  )

  const onKeyUp = useCallback(
    (event) => {
      if (event.key === ' ' || event.key === 'Enter') stop()
    },
    [stop],
  )

  return {
    progress,
    bind: {
      onPointerDown: start,
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onKeyDown,
      onKeyUp,
    },
  }
}

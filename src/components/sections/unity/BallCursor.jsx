import { useEffect, useRef } from 'react'
import { gsap } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'

/**
 * BallCursor — a football that follows the mouse a step behind and rolls the
 * way it travels (it turns by the distance it covers, like a real ball). Over
 * a link or a button it grows and goes pale, inviting the click. Mouse only:
 * on a phone there is no cursor to follow. The page's own cursor stays.
 */
export default function BallCursor({ color = '#0a0a0a', accent = '#c9a24a' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!mouse || prefersReducedMotion()) return undefined

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ball = { x: pos.x, y: pos.y, r: 0, s: 1 }
    let shown = false
    const SIZE = 44
    const onMove = (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
      if (!shown) {
        shown = true
        ball.x = pos.x
        ball.y = pos.y
        gsap.to(el, { autoAlpha: 1, duration: 0.4 })
      }
      const over = e.target.closest?.('a, button, [role="button"], img, picture')
      gsap.to(ball, { s: over ? 1.7 : 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
      el.dataset.over = over ? 'true' : 'false'
    }
    const onLeave = () => {
      shown = false
      gsap.to(el, { autoAlpha: 0, duration: 0.3 })
    }
    const tick = () => {
      const dx = (pos.x - ball.x) * 0.16
      const dy = (pos.y - ball.y) * 0.16
      ball.x += dx
      ball.y += dy
      // rueda: el ángulo es la distancia recorrida sobre el radio
      ball.r += (dx / (SIZE / 2)) * (180 / Math.PI) * 0.9
      el.style.transform = `translate3d(${ball.x - SIZE / 2}px, ${ball.y - SIZE / 2}px, 0) scale(${ball.s})`
      el.firstChild.style.transform = `rotate(${ball.r}deg)`
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      gsap.ticker.remove(tick)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-over="false"
      className="pointer-events-none fixed top-0 left-0 z-[60] invisible size-11 opacity-0 transition-[filter] duration-300 data-[over=true]:brightness-[1.8]"
    >
      <svg viewBox="0 0 100 100" className="size-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]">
        <circle cx="50" cy="50" r="47" fill="#f7f2e8" stroke={color} strokeWidth="3" />
        {/* los paneles de la pelota: un pentágono al centro y cinco a su alrededor */}
        <polygon points="50,30 69,44 62,66 38,66 31,44" fill={color} />
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={a} transform={`rotate(${a} 50 50)`}>
            <line x1="50" y1="30" x2="50" y2="10" stroke={color} strokeWidth="3" />
            <polygon points="50,3 60,9 56,4 44,4 40,9" fill={color} />
          </g>
        ))}
        <circle cx="50" cy="50" r="4" fill={accent} />
      </svg>
    </div>
  )
}

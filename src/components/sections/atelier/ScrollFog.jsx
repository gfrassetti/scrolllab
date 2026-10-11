import { useEffect, useRef } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'
import { mixHex } from '../../../lib/themeVars'

/** `#rrggbb` → «r,g,b» para armar un rgba() con la transparencia de cada capa. */
const rgbOf = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

/**
 * Full-bleed canvas fog/smoke that shifts with scroll progress.
 * Stand-in for Trionn-style reactive WebGL atmospheres (no video assets).
 *
 * Sus tonos salen del fondo y del texto de la sección que la usa: hacia los
 * bordes funde al fondo, en el centro y en las manchas se acerca al texto.
 * Con los colores de la demo queda como siempre.
 */
export default function ScrollFog({ className = '', density = 0.55, bg = '#0b0c10', fg = '#ffffff' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const light = rgbOf(mixHex(bg, fg, 0.45))
    const mid = rgbOf(mixHex(bg, fg, 0.15))
    const edge = rgbOf(bg)
    const haze = rgbOf(mixHex(bg, fg, 0.7))

    let raf = 0
    let progress = 0
    let t = 0
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const resize = () => {
      // En un teléfono (DPR 3) 1.5 alcanza: la niebla es un degradé suave.
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)

      const drift = progress * 220 + t * (reduced ? 4 : 18)
      const g = ctx.createRadialGradient(
        width * (0.35 + progress * 0.25),
        height * (0.4 - progress * 0.15),
        40,
        width * 0.5,
        height * 0.55,
        Math.max(width, height) * 0.85,
      )
      g.addColorStop(0, `rgba(${light},${0.18 * density})`)
      g.addColorStop(0.45, `rgba(${mid},${0.35 * density})`)
      g.addColorStop(1, `rgba(${edge},0.92)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < 7; i++) {
        const x =
          ((i * 137 + drift * (0.3 + i * 0.08)) % (width + 200)) - 100
        const y =
          height * (0.2 + ((i * 0.13 + progress * 0.4) % 0.7)) +
          Math.sin(t * 0.4 + i) * 18
        const r = 90 + i * 28
        const blob = ctx.createRadialGradient(x, y, 10, x, y, r)
        blob.addColorStop(0, `rgba(${haze},${0.07 * density})`)
        blob.addColorStop(1, `rgba(${haze},0)`)
        ctx.fillStyle = blob
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      t += 0.016
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    // Fuera de pantalla se corta el loop: cada cuadro repintaba la niebla (y
    // medía el canvas) aunque nadie la viera.
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf)
      if (entry.isIntersecting) raf = requestAnimationFrame(draw)
    })
    io.observe(canvas)

    const st = ScrollTrigger.create({
      trigger: canvas,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        progress = self.progress
      },
    })

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      st.kill()
    }
  }, [density, bg, fg])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}

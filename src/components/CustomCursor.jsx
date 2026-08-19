import { useEffect, useState } from 'react'
import { gsap } from '../lib/gsap'

const INTERACTIVE =
  'a, button, [role="button"], [data-rupture-hit], [draggable="true"], input, textarea, select, summary, label[for]'

/**
 * Cursor custom del sitio: un punto sólido + un anillo que lo sigue
 * con retardo. Sobre elementos interactivos el anillo se expande.
 * Usa mix-blend-difference, así se invierte sobre fondos claros y
 * oscuros. Solo activo con puntero fino (mouse/trackpad) y sin
 * prefers-reduced-motion; en touch no se renderiza nada.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(fine.matches && !reduced.matches)
    update()
    fine.addEventListener('change', update)
    reduced.addEventListener('change', update)
    return () => {
      fine.removeEventListener('change', update)
      reduced.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const dot = document.getElementById('cursor-dot')
    const ring = document.getElementById('cursor-ring')
    if (!dot || !ring) return

    document.documentElement.classList.add('has-custom-cursor')
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 })

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.06, ease: 'power2.out' })
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.06, ease: 'power2.out' })
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' })
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' })

    let visible = false

    const onMove = (e) => {
      if (!visible) {
        visible = true
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY })
        gsap.to([dot, ring], { opacity: 1, duration: 0.2 })
      }
      dotX(e.clientX)
      dotY(e.clientY)
      ringX(e.clientX)
      ringY(e.clientY)
    }

    const onOver = (e) => {
      const egg = e.target.closest?.('[data-rupture-hit]')
      const interactive = egg || e.target.closest?.(INTERACTIVE)
      document.documentElement.classList.toggle('cursor-egg', Boolean(egg))
      gsap.to([dot, ring], { opacity: visible ? 1 : 0, duration: 0.12 })
      gsap.to(ring, {
        scale: egg ? 1.25 : interactive ? 1.9 : 1,
        rotation: egg ? 45 : 0,
        duration: 0.25,
        ease: 'power2.out',
      })
      gsap.to(dot, { scale: egg ? 1.4 : interactive ? 0.5 : 1, duration: 0.25 })
    }

    const onLeave = () => {
      visible = false
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 })
    }

    const onDown = () => {
      const egg = document.documentElement.classList.contains('cursor-egg')
      gsap.to(ring, { scale: egg ? 1.05 : 0.8, duration: 0.15 })
    }
    const onUp = () => {
      const egg = document.documentElement.classList.contains('cursor-egg')
      gsap.to(ring, { scale: egg ? 1.25 : 1, duration: 0.25 })
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)

    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
      document.documentElement.classList.remove('cursor-egg')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      <div
        id="cursor-dot"
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[300] size-2 rounded-full bg-white mix-blend-difference"
      />
      <div
        id="cursor-ring"
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[300] size-9 rounded-full border border-white mix-blend-difference"
      />
    </>
  )
}

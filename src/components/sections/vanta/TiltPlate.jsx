import { useRef } from 'react'
import { gsap } from '../../../lib/gsap'

/**
 * Pointer tilt on an inner plate. Parent may already be GSAP-transformed
 * (fan, shards); this layer only adds rotateX/Y so scrub stays reversible.
 */
export default function TiltPlate({
  children,
  className = '',
  maxY = 16,
  maxX = 10,
  z = 28,
}) {
  const root = useRef(null)
  const mouse = useRef({ x: 0, y: 0 })

  const apply = () => {
    const el = root.current
    if (!el) return
    gsap.set(el, {
      rotateY: mouse.current.x * maxY,
      rotateX: mouse.current.y * -maxX,
      z: z + Math.abs(mouse.current.x) * 18,
    })
  }

  const onMove = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    const box = root.current.getBoundingClientRect()
    mouse.current.x = ((event.clientX - box.left) / box.width - 0.5) * 2
    mouse.current.y = ((event.clientY - box.top) / box.height - 0.5) * 2
    apply()
  }

  const onLeave = () => {
    gsap.to(mouse.current, {
      x: 0,
      y: 0,
      duration: 0.55,
      ease: 'power3.out',
      onUpdate: apply,
    })
  }

  return (
    <div
      ref={root}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d', transformPerspective: 1200 }}
    >
      {children}
    </div>
  )
}

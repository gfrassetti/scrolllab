import { useEffect, useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Reemplazo del scrollbar nativo: oculta el del browser (index.css,
 * `html.has-scroll-progress`) y refleja el progreso 0→1 de toda la página
 * en esta barra. Bajo reduced-motion se desmonta del todo y vuelve el
 * scrollbar nativo — una barra no interactiva es peor affordance que el
 * scrollbar real.
 */
export default function ScrollProgressBar() {
  const fillRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return undefined
    document.documentElement.classList.add('has-scroll-progress')
    return () => document.documentElement.classList.remove('has-scroll-progress')
  }, [reduced])

  useGSAP(
    () => {
      if (reduced || !fillRef.current) return undefined
      gsap.set(fillRef.current, { scaleY: 0, transformOrigin: 'top' })
      const st = ScrollTrigger.create({
        start: 'top top',
        end: () => document.documentElement.scrollHeight - window.innerHeight,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(fillRef.current, { scaleY: self.progress }),
      })
      return () => st.kill()
    },
    { dependencies: [reduced] },
  )

  if (reduced) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-[6px] bg-ink/20 md:block"
    >
      <div ref={fillRef} className="h-full w-full bg-accent" />
    </div>
  )
}

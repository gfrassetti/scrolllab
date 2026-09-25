import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'

/**
 * Barra de scroll propia: mientras vive montada, oculta la nativa (clase en
 * <html>, ver .hide-native-scrollbar en index.css) y la reemplaza por una
 * finita a la derecha que se llena de accent según el progreso de la
 * página. Solo la monta SiteHeader — los demos de templates (Lenis propio,
 * sin SiteHeader) conservan la nativa: es lo que ve el comprador.
 */
export default function ScrollProgress() {
  const fillRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.add('hide-native-scrollbar')
    return () => document.documentElement.classList.remove('hide-native-scrollbar')
  }, [])

  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return undefined
    gsap.set(fill, { scaleY: 0, transformOrigin: 'top' })
    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        fill.style.transform = `scaleY(${self.progress})`
      },
    })
    return () => trigger.kill()
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-0 z-[60] h-svh w-[3px] bg-ink/10"
    >
      <div ref={fillRef} className="h-full w-full bg-accent" />
    </div>
  )
}

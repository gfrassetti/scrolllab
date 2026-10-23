import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { LABEL } from './brand'

/**
 * Lámina 05 — Estudio (por ahora vacía: el contenido es un div de 1vh).
 *
 * El cambio de lámina: la página es un block de dibujo. Esta hoja ya está debajo de la del hero
 * (la sección sube 100svh y su interior queda fijo mientras tanto); al scrollear, la hoja del hero
 * se va hacia arriba, por debajo del lomo del nav, levantándose apenas del block (gira unos grados
 * sobre su borde de arriba, con su sombra sobre esta). Esta hoja estaba en la sombra de la de
 * arriba y se aclara; el marco y el rótulo de la lámina nueva se ven recién cuando queda a la vista.
 *
 * Con «reducir movimiento»: la hoja del hero se va con el scroll, sin giro ni sombra.
 */
export default function Estudio({ calm }) {
  const sectionRef = useRef(null)
  const shadeRef = useRef(null)

  useLayoutEffect(() => {
    if (calm) return undefined
    const hero = document.querySelector('[data-hero-sheet]')
    if (!hero) return undefined
    const ctx = gsap.context(() => {
      const lift = { v: 0 }
      gsap.set(hero, { transformOrigin: '50% 0%', transformPerspective: 2400 })
      const draw = () => {
        const v = lift.v
        // Se levanta rápido al principio y se queda en ~5°: una hoja que se despega, no una tapa que se abre.
        const tilt = 5 * (1 - (1 - v) ** 2)
        gsap.set(hero, {
          rotationX: tilt,
          boxShadow: `0 ${Math.round(18 + 40 * v)}px ${Math.round(30 + 70 * v)}px rgba(22, 21, 19, ${(0.3 * Math.sin(Math.PI * Math.min(1, v * 1.15))).toFixed(3)})`,
        })
        if (shadeRef.current) shadeRef.current.style.opacity = String(0.09 * (1 - v) ** 1.5)
      }
      draw()
      gsap.to(lift, {
        v: 1,
        ease: 'none',
        onUpdate: draw,
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: '+=100%', scrub: true },
      })
    }, sectionRef)
    return () => {
      ctx.revert()
      gsap.set(hero, { clearProps: 'transform,transformOrigin,boxShadow' })
    }
  }, [calm])

  return (
    <section ref={sectionRef} aria-label="Estudio" className="relative z-[1] -mt-[100svh] h-[200svh]">
      {/* El destino del link «Estudio»: donde la hoja nueva ya quedó a la vista. */}
      <span id="estudio" className="absolute top-[100svh] left-0 h-px w-px" aria-hidden="true" />
      <div className="es-next es-sheet sticky top-0 h-svh overflow-hidden">
        <div className="es-next__panel" aria-hidden="true">
          <span className="es-panel__label es-panel__label--tl" style={LABEL}>
            05 — Estudio
          </span>
          <span className="es-panel__label es-panel__label--tr hidden sm:block" style={LABEL}>
            Lámina 05
          </span>
        </div>
        <span className="es-frame__mark es-next__mark es-next__mark--bl" aria-hidden="true" />
        <span className="es-frame__mark es-next__mark es-next__mark--br" aria-hidden="true" />

        {/* El contenido de la sección (por ahora vacío). */}
        <div className="es-next__body" style={{ height: '1vh' }} />

        {/* La sombra de la hoja de arriba: se va a medida que la hoja del hero se levanta. */}
        <div ref={shadeRef} className="es-next__shade" aria-hidden="true" />
      </div>
    </section>
  )
}

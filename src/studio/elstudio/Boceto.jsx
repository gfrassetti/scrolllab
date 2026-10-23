import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'

/**
 * La salida del hero: al terminar sus cuatro etapas, todo (menos el nav) vuelve a ser una hoja en
 * boceto. El hero sigue fijo 100vh más de scroll y en ese tramo:
 *   - la foto del local se despinta con el mismo pincel con el que se pintó (al revés) y vuelven los
 *     trazos de lápiz (en la escena, Hero.jsx → setBack);
 *   - el título queda en contorno con rayado de grafito, el texto pasa a gris lápiz y el texto y el
 *     marco tiemblan apenas, como trazados a mano (--sk y el filtro #es-pencil, elstudio.css).
 * Después la hoja, ya en boceto, sigue con el scroll hacia abajo y queda atrás.
 *
 * Con «reducir movimiento» no hay vuelta a boceto: el hero termina y sigue Proyectos.
 */
export default function Boceto({ calm, exit }) {
  const dispRef = useRef(null)

  useLayoutEffect(() => {
    if (calm) return undefined
    const hero = document.getElementById('inicio')
    let u = 0
    let needs = true
    let lastDisp = -1

    const draw = () => {
      const t = Math.min(1, u / 0.85)
      const back = t * t * (3 - 2 * t)
      exit.current?.setBack(back)
      // El temblor, en cuatro escalones (cada cambio vuelve a pasar el filtro sobre el texto y el marco).
      const disp = (Math.ceil(back * 4) / 4) * 2.6
      if (disp !== lastDisp) dispRef.current?.setAttribute('scale', String((lastDisp = disp)))
    }

    const st = ScrollTrigger.create({
      start: () => hero.offsetTop + window.innerHeight * 3.8,
      end: () => hero.offsetTop + window.innerHeight * 4.8,
      onUpdate: (self) => {
        u = self.progress
        needs = true
      },
      onRefresh: (self) => {
        u = self.progress
        needs = true
      },
    })
    const tick = () => {
      if (!needs) return
      needs = false
      draw()
    }
    gsap.ticker.add(tick)
    const getHero = () => exit.current
    return () => {
      gsap.ticker.remove(tick)
      st.kill()
      getHero()?.setBack(0)
    }
  }, [calm, exit])

  if (calm) return null

  // El lápiz: un temblor apenas visible en los trazos del texto y del marco.
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
      <filter id="es-pencil" x="-2%" y="-10%" width="104%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

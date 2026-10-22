import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { C, DISPLAY } from './brand'

const TEXT =
  'Somos un estudio multidisciplinario de diseño e interiorismo. Pensamos cada espacio desde la experiencia de quien lo usa, desde la Patagonia y Buenos Aires, para cualquier lugar del mundo.'

/**
 * «Estudio»: la declaración del estudio. Con movimiento completo cada palabra
 * pasa de papel a tinta a medida que se scrollea (scrub); con «reducir
 * movimiento» el texto está entero, sin trabas ni huecos.
 */
export default function Statement({ calm }) {
  const rootRef = useRef(null)

  useLayoutEffect(() => {
    if (calm) return undefined
    const root = rootRef.current
    const ctx = gsap.context(() => {
      const words = root.querySelectorAll('[data-w]')
      gsap.set(words, { opacity: 0.14 })
      gsap.to(words, {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: root, start: 'top 72%', end: 'bottom 62%', scrub: 0.6 },
      })
    }, root)
    return () => {
      ctx.revert()
      ScrollTrigger.refresh()
    }
  }, [calm])

  return (
    <section ref={rootRef} id="estudio" className="relative px-5 py-[22vh] sm:px-9" style={DISPLAY}>
      <p className="mb-10 flex items-center gap-4 text-[11px] font-medium tracking-[0.16em] uppercase sm:mb-14" style={{ color: C.mute }}>
        <span style={{ color: C.rust }}>01</span>
        <span className="block h-px w-10" style={{ background: C.hair }} />
        Estudio
      </p>
      <p className="max-w-[24ch] font-light sm:max-w-[26ch]" style={{ fontSize: 'clamp(1.9rem, 5.4vw, 5.2rem)', lineHeight: 1.04, letterSpacing: '-0.035em', color: C.ink }}>
        {TEXT.split(' ').map((w, i) => (
          <span key={i} data-w className="inline-block">
            {w}
            {' '}
          </span>
        ))}
      </p>
    </section>
  )
}

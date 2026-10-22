import { useEffect, useRef } from 'react'
import { gsap, SplitText } from '../../lib/gsap'
import { C, DISPLAY, SITE } from './brand'

/**
 * El primer cuadro: el titular grande sobre la hoja, nada más. Las líneas suben
 * desde una máscara cuando termina el loader (titular → bajada, con pausa).
 */
export default function Hero({ boarded, calm }) {
  const rootRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    if (!boarded) return undefined
    const root = rootRef.current
    const title = titleRef.current
    const rest = root.querySelectorAll('[data-in]')
    const ctx = gsap.context(() => {
      if (calm) {
        gsap.set(title, { autoAlpha: 1 })
        gsap.fromTo([title, ...rest], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.1 })
        return
      }
      gsap.set(title, { autoAlpha: 1 })
      SplitText.create(title, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true, // vuelve a cortar las líneas al cambiar el ancho o cargar la fuente
        onSplit: (self) =>
          gsap.from(self.lines, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12 }),
      })
      // La pausa deliberada titular → resto.
      gsap.fromTo(rest, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, delay: 0.55 })
    }, root)
    return () => ctx.revert()
  }, [boarded, calm])

  return (
    <section
      ref={rootRef}
      id="inicio"
      className="relative flex min-h-svh flex-col justify-between px-5 pt-28 pb-8 sm:px-9 sm:pb-10"
      style={DISPLAY}
    >
      <p data-in className="invisible text-[11px] font-medium tracking-[0.16em] uppercase" style={{ color: C.mute }}>
        {SITE.places.join(' — ')}
      </p>

      <div>
        <h1
          ref={titleRef}
          className="invisible font-light"
          style={{ fontSize: 'clamp(2.9rem, 9.6vw, 10rem)', lineHeight: 0.95, letterSpacing: '-0.045em', color: C.ink, textWrap: 'balance' }}
        >
          Diseño e interiorismo centrado en quien lo usa.
        </h1>
        <div className="mt-10 flex flex-col justify-between gap-8 sm:mt-14 sm:flex-row sm:items-end">
          <p data-in className="invisible max-w-[34ch] text-[15px] leading-relaxed sm:text-base" style={{ color: C.ink }}>
            {SITE.about}
          </p>
          <p data-in className="invisible flex items-center gap-3 text-[11px] font-medium tracking-[0.16em] uppercase" style={{ color: C.mute }}>
            <span className="block h-px w-10" style={{ background: C.ink }} />
            Scroll
          </p>
        </div>
      </div>
    </section>
  )
}

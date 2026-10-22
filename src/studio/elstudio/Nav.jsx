import { useEffect, useRef, useState } from 'react'
import { scrollToSection } from '../../hooks/useLenis'
import { C, DISPLAY, SITE } from './brand'
import Logo from './Logo'

/**
 * El encabezado: el logo (que el loader enciende al aterrizar) y tres salidas.
 * `bridge` es el puente con el loader: dónde tiene que aterrizar el logo y cómo
 * se enciende el de verdad.
 */
export default function Nav({ bridge }) {
  const logoRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const logo = logoRef.current
    logo.style.opacity = '0'
    bridge.current = {
      target: () => logo.querySelector('[data-part=row]'),
      show: () => {
        logo.style.opacity = '1'
      },
    }
    return () => {
      bridge.current = {}
    }
  }, [bridge])

  const link = 'es-link tpl-hit text-[11px] font-medium tracking-[0.16em] uppercase'
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-5 pt-5 pb-6 sm:px-9 sm:pt-7" style={DISPLAY}>
      {/* Una franja de papel detrás, solo al scrollear: el texto que sube por debajo no se pisa con el logo. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500"
        style={{ opacity: scrolled ? 1 : 0, background: 'linear-gradient(to bottom, rgba(243,241,234,0.97) 55%, rgba(243,241,234,0))' }}
      />
      <a
        ref={logoRef}
        href="#inicio"
        aria-label={`${SITE.name}, ir al inicio`}
        onClick={(e) => {
          e.preventDefault()
          scrollToSection('inicio')
        }}
        className="block"
        style={{ fontSize: 26 }}
      >
        <Logo compact />
      </a>
      <nav aria-label="Principal" className="flex items-center gap-5 pt-1.5 sm:gap-9" style={{ color: C.ink }}>
        <a
          href="#estudio"
          className={`${link} hidden sm:inline-block`}
          onClick={(e) => {
            e.preventDefault()
            scrollToSection('estudio')
          }}
        >
          Estudio
        </a>
        <a
          href="#contacto"
          className={`${link} inline-block`}
          onClick={(e) => {
            e.preventDefault()
            scrollToSection('contacto')
          }}
        >
          Contacto
        </a>
        <a href={SITE.instagram.href} target="_blank" rel="noreferrer" className={`${link} hidden sm:inline-block`} data-cursor="Instagram">
          Instagram
        </a>
      </nav>
    </header>
  )
}

import { useEffect, useRef } from 'react'
import { scrollToSection } from '../../hooks/useLenis'
import { SITE } from './brand'
import Logo from './Logo'

/**
 * El encabezado: por ahora, solo el logo (que el loader enciende al aterrizar).
 * `bridge` es el puente con el loader: dónde tiene que aterrizar el logo y cómo
 * se enciende el de verdad.
 */
export default function Nav({ bridge }) {
  const logoRef = useRef(null)

  useEffect(() => {
    const logo = logoRef.current
    logo.style.opacity = '0'
    bridge.current = {
      target: () => logo.querySelector('svg[data-part=row]'),
      show: () => {
        logo.style.opacity = '1'
      },
    }
    return () => {
      bridge.current = {}
    }
  }, [bridge])

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-5 pt-5 sm:px-9 sm:pt-7">
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
    </header>
  )
}

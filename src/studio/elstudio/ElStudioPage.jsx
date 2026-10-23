import { useCallback, useEffect, useRef, useState } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { prefersReducedMotion } from '../../lib/motion'
import { getLenis } from '../../hooks/useLenis'
import { ScrollTrigger } from '../../lib/gsap'
import './elstudio.css'
import Loader from './Loader'
import Cursor from './Cursor'
import Nav from './Nav'
import Hero from './Hero'
import Estudio from './Estudio'
import { FONTS_HREF, SITE } from './brand'

const FONT_WAIT_MS = 4000

// Siempre se arranca arriba: al recargar, el navegador devolvía la página a donde estaba y el
// loader (que viaja hacia el encabezado) quedaba descolocado.
function startAtTop() {
  if (typeof window === 'undefined') return
  if ('scrollRestoration' in window.history) ScrollTrigger.clearScrollMemory('manual')
  window.scrollTo(0, 0)
}
startAtTop()

/*
THESIS: una hoja de papel de dibujante. El estudio hace diseño e interiorismo: la página es el
  plano sobre la mesa — papel con grano, tinta negra, y una sola marca de color, el óxido de la
  tapa de mesa de su logo.
OWN-WORLD: la tapa de mesa en perspectiva del logo (óxido), Jost para el logo y una grotesca liviana
  de estudio de arquitectura para el resto; el cursor es un punto de tinta.
STORY: el logo se arma pieza por pieza → la hoja sube → el logo aterriza en el encabezado → el
  titular sale de una línea.
FIRST VIEWPORT: el encabezado, un titular enorme en peso liviano y una sola línea de bajada.
*/

/**
 * elStudio — demo del Estudio para un cliente (diseño industrial e interiorismo).
 * Base: loader, cursor, papel y tipografía. En local: /estudio/elstudio.
 */
export default function ElStudioPage() {
  const [calm] = useState(() => prefersReducedMotion())
  const bridge = useRef({})
  const navLogoRef = useRef(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [boarded, setBoarded] = useState(false)

  // Las fuentes, una sola vez (el sitio publicado ya las trae en el HTML).
  useEffect(() => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === FONTS_HREF)) return undefined
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  // El loader espera las fuentes de verdad (el logo y el titular se miden con ellas), pero no más de unos segundos.
  useEffect(() => {
    let alive = true
    const load = Promise.allSettled([
      document.fonts.load('500 1em Jost'),
      document.fonts.load('italic 300 1em Jost'),
    ])
    const timeout = new Promise((r) => setTimeout(r, FONT_WAIT_MS))
    Promise.race([load, timeout]).then(() => alive && setFontsReady(true))
    return () => {
      alive = false
    }
  }, [])

  const ready = fontsReady

  // Hasta que termina el loader, la página no se mueve.
  useEffect(() => {
    const lenis = getLenis()
    if (boarded) lenis?.start()
    else lenis?.stop()
  }, [boarded])
  const onDone = useCallback(() => setBoarded(true), [])

  // El título de la pestaña.
  useEffect(() => {
    const prev = document.title
    document.title = `${SITE.name} · ${SITE.tagline}`
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <SmoothScrollProvider>
      <div className="es-root min-h-svh">
        <Loader ready={ready} calm={calm} bridge={bridge} onDone={onDone} />
        <Nav logoRef={navLogoRef} open={boarded} calm={calm} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          <Hero boarded={boarded} calm={calm} bridge={bridge} navLogoRef={navLogoRef} />
          <Estudio calm={calm} />
        </main>
        {/* El cursor del sitio entra recién cuando termina el loader (antes dibuja la mira del loader). */}
        {boarded && <Cursor />}
      </div>
    </SmoothScrollProvider>
  )
}

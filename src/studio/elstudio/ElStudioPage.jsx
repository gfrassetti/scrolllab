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
import Statement from './Statement'
import Contact from './Contact'
import { FONTS_HREF, SITE } from './brand'

const LOADER_MIN_MS = 2900
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
  const [fontsReady, setFontsReady] = useState(false)
  const [elapsed, setElapsed] = useState(0)
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
      document.fonts.load('300 1em "Hanken Grotesk"'),
      document.fonts.load('500 1em "Hanken Grotesk"'),
    ])
    const timeout = new Promise((r) => setTimeout(r, FONT_WAIT_MS))
    Promise.race([load, timeout]).then(() => alive && setFontsReady(true))
    return () => {
      alive = false
    }
  }, [])

  // La secuencia dura lo que tiene que durar aunque todo esté en caché.
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / LOADER_MIN_MS)
      setElapsed(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const progress = fontsReady ? elapsed : Math.min(elapsed, 0.9)
  const ready = fontsReady && elapsed >= 1

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
        <a
          href="#estudio"
          className="fixed top-3 left-3 z-[200] -translate-y-[200%] px-4 py-2.5 text-[13px] font-medium transition-transform focus:translate-y-0"
          style={{ background: '#161513', color: '#f3f1ea' }}
        >
          Saltar al contenido
        </a>
        <Loader progress={progress} ready={ready} calm={calm} bridge={bridge} onDone={onDone} />
        <Nav bridge={bridge} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          <Hero boarded={boarded} calm={calm} />
          <Statement calm={calm} />
          <Contact />
        </main>
        <Cursor />
      </div>
    </SmoothScrollProvider>
  )
}

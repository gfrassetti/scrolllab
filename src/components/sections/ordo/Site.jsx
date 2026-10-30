import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import SmoothScrollProvider from '../../SmoothScrollProvider'
import { prefersReducedMotion } from '../../../lib/motion'
import { getLenis } from '../../../hooks/useLenis'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import './ordo.css'
import Loader from './Loader'
import Cursor from './Cursor'
import ScrollRuler from './ScrollRuler'
import Nav from './Nav'
import Hero from './Hero'
import Projects from './Projects'
import Studio from './Studio'
import Services from './Services'
import Contact from './Contact'
import ProjectPage from './ProjectPage'
import { setTransitionHandler, takePendingSection, useRoute } from './router'
import Sketch from './Sketch'
import { FONTS_HREF, SITE } from './brand'

const FONT_WAIT_MS = 4000

/**
 * Cómo se sale del hero (pruebas):
 *   'boceto'    al terminar, todo el hero (menos el nav) vuelve a boceto en su hoja y después sigue el
 *               scroll hacia Projects (Boceto.jsx).
 *   'proyecto'  la foto del local se despega de la lámina y aterriza en la tarjeta 01 de Proyectos.
 *   'lamina'    cambio de lámina: la hoja del hero se levanta y debajo está la de Estudio.
 */
const SALIDA = 'boceto'

// Siempre se arranca arriba, en la etapa 01 del hero: al recargar, el navegador devolvía la página a
// donde estaba (o a la sección de la dirección, #proyectos) y el hero aparecía en su última etapa.
function startAtTop() {
  if (typeof window === 'undefined') return
  try {
    if ('scrollRestoration' in window.history) ScrollTrigger.clearScrollMemory('manual')
    // Sin la sección en la dirección: si no, el navegador salta ahí al cargar.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    // En un iframe con sandbox, history puede no estar disponible: alcanza con subir.
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}
startAtTop()

/** Arriba de todo, también para Lenis (que lleva su propia posición) y para los ScrollTrigger. */
function toTop() {
  // «instant»: con scroll-behavior suave (ordo.css) un scrollTo común subiría animado.
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  getLenis()?.scrollTo(0, { immediate: true, force: true })
  ScrollTrigger.update()
}

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
export default function Site() {
  const [calm] = useState(() => prefersReducedMotion())
  const bridge = useRef({})
  const navLogoRef = useRef(null)
  const heroExit = useRef(null)
  const curtainRef = useRef(null)
  const busy = useRef(false)
  const route = useRoute()
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
    ])
    const timeout = new Promise((r) => setTimeout(r, FONT_WAIT_MS))
    Promise.race([load, timeout]).then(() => alive && setFontsReady(true))
    return () => {
      alive = false
    }
  }, [])

  const ready = fontsReady

  // Arriba también si el navegador restaura la posición tarde: al terminar de cargar, al volver con
  // «atrás» (la página sale de la caché) y, antes de irse, se sube para que no guarde otra posición.
  useEffect(() => {
    const onLoad = () => toTop()
    const onShow = (e) => e.persisted && toTop()
    const onLeave = () => window.scrollTo(0, 0)
    window.addEventListener('load', onLoad)
    window.addEventListener('pageshow', onShow)
    window.addEventListener('beforeunload', onLeave)
    toTop()
    return () => {
      window.removeEventListener('load', onLoad)
      window.removeEventListener('pageshow', onShow)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [])

  // Hasta que termina el loader, la página no se mueve (y arranca arriba, en la etapa 01).
  useEffect(() => {
    const lenis = getLenis()
    if (boarded) {
      toTop()
      lenis?.start()
    } else lenis?.stop()
  }, [boarded])
  const onDone = useCallback(() => setBoarded(true), [])

  // El título de la pestaña (la página de un proyecto pone el suyo).
  useEffect(() => {
    if (route.name !== 'home') return undefined
    const prev = document.title
    document.title = `${SITE.name} · ${SITE.tagline}`
    return () => {
      document.title = prev
    }
  }, [route.name])

  // Al entrar directo a la página de un proyecto no hay hero: el logo del nav lo enciende el loader igual.
  useEffect(() => {
    if (route.name !== 'project') return undefined
    bridge.current = {
      target: () => navLogoRef.current?.querySelector('svg[data-part=row]'),
      show: () => {
        if (navLogoRef.current) navLogoRef.current.style.opacity = '1'
      },
    }
    return () => {
      bridge.current = {}
    }
  }, [route.name])

  // El cambio de página: una cortina de óxido sube, se cambia la ruta debajo y la cortina se va por arriba.
  useEffect(() => {
    setTransitionHandler((apply) => {
      const c = curtainRef.current
      if (calm || !c || !boarded || busy.current) return apply()
      busy.current = true
      gsap
        .timeline({ onComplete: () => (busy.current = false) })
        .set(c, { display: 'block', clipPath: 'inset(100% 0% 0% 0%)' })
        .to(c, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: 'expo.inOut' })
        .add(apply)
        .to({}, { duration: 0.25 })
        .to(c, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.inOut' })
        .set(c, { display: 'none' })
      return undefined
    })
    return () => setTransitionHandler(null)
  }, [calm, boarded])

  // Al cambiar de ruta: la página de un proyecto arranca arriba; la portada, en la sección a la que se pidió volver.
  const routeKey = `${route.name}:${route.slug ?? ''}`
  const firstRoute = useRef(true)
  useLayoutEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    const section = route.name === 'home' ? takePendingSection() : null
    const el = section && section !== 'home' ? document.getElementById(section) : null
    const y = el ? el.offsetTop : 0
    const jump = () => {
      const target = el ? document.getElementById(section).offsetTop : y
      window.scrollTo({ top: target, left: 0, behavior: 'instant' })
      // Lenis lleva su propio límite (el de la página anterior): se le avisa que la página cambió de alto.
      getLenis()?.resize()
      getLenis()?.scrollTo(target, { immediate: true, force: true })
    }
    jump()
    requestAnimationFrame(() => {
      jump()
      ScrollTrigger.refresh()
    })
  }, [routeKey, route.name])

  return (
    <SmoothScrollProvider>
      <div className="od-root min-h-svh">
        <Loader ready={ready} calm={calm} bridge={bridge} onDone={onDone} />
        <Nav logoRef={navLogoRef} open={boarded} calm={calm} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          {route.name === 'project' ? (
            <ProjectPage key={route.slug} slug={route.slug} calm={calm} boarded={boarded} />
          ) : (
            <>
              <Hero boarded={boarded} calm={calm} bridge={bridge} navLogoRef={navLogoRef} exit={heroExit} boceto={SALIDA === 'boceto'} />
              {SALIDA === 'boceto' && <Sketch calm={calm} exit={heroExit} />}
              <Projects calm={calm} />
              <Studio calm={calm} />
              <Services calm={calm} />
              <Contact calm={calm} />
            </>
          )}
        </main>
        {/* La cortina del cambio de página. */}
        <div ref={curtainRef} className="od-curtain" aria-hidden="true" />
        {/* La barra de scroll propia: una regla vertical (reemplaza a la nativa desde que se monta). Entra con el
            sitio, al terminar el loader. */}
        <ScrollRuler on={boarded} />
        {/* El cursor del sitio entra recién cuando termina el loader (antes dibuja la mira del loader). */}
        {boarded && <Cursor />}
      </div>
    </SmoothScrollProvider>
  )
}

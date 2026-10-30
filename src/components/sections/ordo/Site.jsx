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
import Drawing from './Drawing'
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
 * How the hero is exited (tests):
 *   'boceto'    when it ends, the whole hero (except the nav) goes back to a sketch on its sheet and then the
 *               scroll continues towards Projects (Sketch.jsx).
 *   'proyecto'  the photo of the shop peels off the sheet and lands on card 01 of Projects.
 *   'lamina'    sheet change: the hero's sheet lifts and the Studio one is underneath.
 */
const SALIDA = 'boceto'

// It always starts at the top, in stage 01 of the hero: on reload the browser used to return the page to
// where it was (or to the section in the address, #projects) and the hero showed up in its last stage.
function startAtTop() {
  if (typeof window === 'undefined') return
  try {
    if ('scrollRestoration' in window.history) ScrollTrigger.clearScrollMemory('manual')
    // Without the section in the address: otherwise the browser jumps there on load.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    // In a sandboxed iframe history may not be available: scrolling up is enough.
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}
startAtTop()

/** To the very top, also for Lenis (which keeps its own position) and for the ScrollTriggers. */
function toTop() {
  // "instant": with smooth scroll-behavior (ordo.css) a plain scrollTo would scroll up animated.
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  getLenis()?.scrollTo(0, { immediate: true, force: true })
  ScrollTrigger.update()
}

/*
THESIS: a drafter's sheet of paper. The studio does design and interiors: the page is the
  plan on the table: paper with grain, black ink and a single colour mark, the rust of the
  table slab on its logo.
OWN-WORLD: the logo's table slab in perspective (rust), Jost for the logo and a light grotesque
  of an architecture studio for the rest; the cursor is a dot of ink.
STORY: the logo is assembled piece by piece → the sheet rises → the logo lands in the header → the
  headline comes out of a line.
FIRST VIEWPORT: the header, a huge headline in a light weight and a single line of subtitle.
*/

/**
 * ORDO — template for an architecture and interiors studio.
 * Base: loader, cursor, paper and typography. Locally: /templates/ordo.
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

  // The fonts, only once (the published site already brings them in the HTML).
  useEffect(() => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === FONTS_HREF)) return undefined
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  // The loader really waits for the fonts (the logo and headline are measured with them), but only a few seconds.
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

  // Also to the top if the browser restores the position late: when loading finishes, on coming back with
  // "back" (the page comes out of the cache) and, before leaving, it scrolls up so that no other position is saved.
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

  // Until the loader finishes, the page does not move (and starts at the top, in stage 01).
  useEffect(() => {
    const lenis = getLenis()
    if (boarded) {
      toTop()
      lenis?.start()
    } else lenis?.stop()
  }, [boarded])
  const onDone = useCallback(() => setBoarded(true), [])

  // The tab title (a project page sets its own).
  useEffect(() => {
    if (route.name !== 'home') return undefined
    const prev = document.title
    document.title = `${SITE.name} · ${SITE.tagline}`
    return () => {
      document.title = prev
    }
  }, [route.name])

  // On entering a project page directly there is no hero: the loader still lights up the nav logo.
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

  // The page change: a rust curtain rises, the route changes underneath and the curtain leaves through the top.
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

  // On a route change: a project page starts at the top; the home page, at the section it was asked to return to.
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
      // Lenis keeps its own limit (that of the previous page): it is told that the page height changed.
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
              <Drawing boarded={boarded} calm={calm} bridge={bridge} navLogoRef={navLogoRef} exit={heroExit} boceto={SALIDA === 'boceto'} />
              {SALIDA === 'boceto' && <Sketch calm={calm} exit={heroExit} />}
              <Projects calm={calm} routed />
              <Studio calm={calm} />
              <Services calm={calm} />
              <Contact calm={calm} />
            </>
          )}
        </main>
        {/* The page-change curtain. */}
        <div ref={curtainRef} className="od-curtain" aria-hidden="true" />
        {/* The site's own scroll bar: a vertical ruler (it replaces the native one once mounted). It comes in with the
            site, when the loader ends. */}
        <ScrollRuler on={boarded} />
        {/* The site cursor only comes in once the loader finishes (before that the loader draws its own crosshair). */}
        {boarded && <Cursor />}
      </div>
    </SmoothScrollProvider>
  )
}

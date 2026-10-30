import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../../lib/motion'
import { getLenis } from '../../../hooks/useLenis'
import { FONTS_HREF, SITE } from './brand'
import Cursor from './Cursor'
import Drawing from './Drawing'
import Loader from './Loader'
import Nav from './Nav'
import ScrollRuler from './ScrollRuler'
import Sketch from './Sketch'
import { rows, sectionVars } from './vars'
import './ordo.css'

const FONT_WAIT_MS = 4000

/**
 * The Hero as one section of a composition (the builder): the loader, the nav frame, the four sheets of the drawing,
 * the way out to a sketch, the scroll ruler and the cursor, with their own state (the loader lifts, the nav lights
 * up, the hero opens). The full page (Site.jsx) puts the same pieces together itself because it also has the project
 * routes; this is the same sequence for a composition.
 *
 * Every text, link, photo and colour is a prop, and every layer is a switch: the loader, the cursor, the ruler and
 * the construction lines (`show…`). With the loader off the page opens straight on the first sheet.
 */
export default function Hero({
  brand = SITE.name,
  tagline = SITE.tagline,
  places = SITE.places.join(' · '),
  navLinks,
  logoHref,
  ctaLabel,
  ctaHref,
  ctaTip,
  menuLabel,
  closeLabel,
  socialLabel,
  socialHref,
  stages,
  title1,
  title2,
  title3,
  title4,
  sheetLabel,
  scrollLabel,
  dragTip,
  heroAlt,
  photo,
  sketch,
  sketchEmpty,
  sketchRaw,
  showLoader = 'on',
  showCursor = 'on',
  showRuler = 'on',
  showGuides = 'on',
  bg,
  fg,
  accent,
}) {
  const [calm] = useState(() => prefersReducedMotion())
  const loader = showLoader !== 'off'
  const bridge = useRef({})
  const navLogoRef = useRef(null)
  const heroExit = useRef(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [boarded, setBoarded] = useState(!loader)

  // The fonts, once (the published site already brings them in its HTML).
  useEffect(() => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === FONTS_HREF)) return undefined
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  // The loader waits for the fonts for real (the logo and the headline are measured with them), but not for long.
  useEffect(() => {
    let alive = true
    const load = Promise.allSettled([document.fonts.load('500 1em Jost')])
    const timeout = new Promise((r) => setTimeout(r, FONT_WAIT_MS))
    Promise.race([load, timeout]).then(() => alive && setFontsReady(true))
    return () => {
      alive = false
    }
  }, [])

  // Until the loader is done the page does not move.
  useEffect(() => {
    const lenis = getLenis()
    if (boarded) lenis?.start()
    else lenis?.stop()
  }, [boarded])
  const onDone = useCallback(() => setBoarded(true), [])

  // Without the loader nothing lands on the nav logo: it is simply there.
  useEffect(() => {
    if (!loader && navLogoRef.current) navLogoRef.current.style.opacity = '1'
  }, [loader])
  // Switching the loader on again (in the builder) plays it from the start.
  useEffect(() => {
    setBoarded(!loader)
  }, [loader])

  const parts = [title1, title2, title3, title4]
  return (
    <div className="od-root" style={sectionVars({ bg, fg, accent })}>
      {loader && <Loader ready={fontsReady} calm={calm} bridge={bridge} onDone={onDone} brand={brand} tagline={tagline} places={places} />}
      <Nav
        logoRef={navLogoRef}
        open={boarded}
        calm={calm}
        brand={brand}
        tagline={tagline}
        links={rows(navLinks, undefined)}
        homeHref={logoHref}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        ctaTip={ctaTip}
        menuLabel={menuLabel}
        closeLabel={closeLabel}
        socialLabel={socialLabel}
        socialHref={socialHref}
        places={places}
      />
      <Drawing
        boarded={boarded}
        calm={calm}
        bridge={bridge}
        navLogoRef={navLogoRef}
        exit={heroExit}
        boceto
        brand={brand}
        tagline={tagline}
        stages={stages}
        titleParts={parts.some((p) => p != null && p !== '') ? parts.map((p) => (p === '' ? undefined : p)) : undefined}
        sheetLabel={sheetLabel}
        scrollLabel={scrollLabel}
        dragTip={dragTip}
        heroAlt={heroAlt}
        photo={photo}
        sketch={sketch}
        sketchEmpty={sketchEmpty}
        sketchRaw={sketchRaw}
        showGuides={showGuides}
      />
      <Sketch calm={calm} exit={heroExit} />
      {showRuler !== 'off' && <ScrollRuler on={boarded} />}
      {showCursor !== 'off' && boarded && <Cursor />}
    </div>
  )
}

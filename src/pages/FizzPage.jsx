import { useEffect } from 'react'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import NavFizz from '../components/sections/fizz/NavFizz'
import HeroBubbles from '../components/sections/fizz/HeroBubbles'
import FlavorWorlds from '../components/sections/fizz/FlavorWorlds'
import BubbleBenefits from '../components/sections/fizz/BubbleBenefits'
import CanCarousel from '../components/sections/fizz/CanCarousel'
import PopManifesto from '../components/sections/fizz/PopManifesto'
import FooterSplash from '../components/sections/fizz/FooterSplash'

const FIZZ_BOTTLE_GLB = '/fizz/soda-bottle.glb'
// Studio Small 03 — Greg Zaal, Poly Haven (CC0), reducido a 512 px.
const FIZZ_STUDIO_HDR = '/fizz/studio.hdr'

/**
 * Template model — "FIZZ"
 * Carbonated pop: glass bottle hero + flavor worlds that repaint the page.
 * Family refs: Fizzi / La Revoltosa (confirm exact URL). Generic copy only.
 * See Obsidian: "Fizz — mapa de referencia".
 */
export default function FizzPage() {
  // Warm the GLB so the bottle is ready when the headline finishes.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'fetch'
    link.href = FIZZ_BOTTLE_GLB
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    return () => {
      link.remove()
    }
  }, [])

  return (
    <SmoothScrollProvider>
      <div id="top" className="tpl-world bg-grape text-foam selection:bg-fizz selection:text-foam">
        <ScrollRail trackClassName="bg-foam/15" fillClassName="bg-fizz" />
        <NavFizz />

        <main>
          <HeroBubbles modelUrl={FIZZ_BOTTLE_GLB} envUrl={FIZZ_STUDIO_HDR} />
          <FlavorWorlds />
          <BubbleBenefits />
          <CanCarousel />
          <PopManifesto />
        </main>

        <FooterSplash />
      </div>
    </SmoothScrollProvider>
  )
}

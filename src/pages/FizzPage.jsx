import { useEffect } from 'react'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import TemplateBuyPill from '../components/TemplateBuyPill'
import NavFizz from '../components/sections/fizz/NavFizz'
import HeroBubbles from '../components/sections/fizz/HeroBubbles'
import FlavorWorlds from '../components/sections/fizz/FlavorWorlds'
import BubbleBenefits from '../components/sections/fizz/BubbleBenefits'
import CanCarousel from '../components/sections/fizz/CanCarousel'
import PopManifesto from '../components/sections/fizz/PopManifesto'
import FooterSplash from '../components/sections/fizz/FooterSplash'

const FIZZ_CAN_GLB = '/fizz/soda-can.glb'

/**
 * Template model — "FIZZ"
 * Carbonated pop: 3D can hero + flavor worlds that repaint the page.
 * Family refs: Fizzi / La Revoltosa (confirm exact URL). Generic copy only.
 * See Obsidian: "Fizz — mapa de referencia".
 */
export default function FizzPage() {
  // Warm the GLB so the PNG bridge is as short as possible.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'fetch'
    link.href = FIZZ_CAN_GLB
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    return () => {
      link.remove()
    }
  }, [])

  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-grape text-foam">
        <NavFizz />

        <main>
          <HeroBubbles modelUrl={FIZZ_CAN_GLB} />
          <FlavorWorlds />
          <BubbleBenefits />
          <CanCarousel />
          <PopManifesto />
        </main>

        <FooterSplash />
        <TemplateBuyPill sku="fizz" name="FIZZ" />
      </div>
    </SmoothScrollProvider>
  )
}

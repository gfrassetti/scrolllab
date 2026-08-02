import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavFizz from '../components/sections/fizz/NavFizz'
import HeroBubbles from '../components/sections/fizz/HeroBubbles'
import FlavorWorlds from '../components/sections/fizz/FlavorWorlds'
import BubbleBenefits from '../components/sections/fizz/BubbleBenefits'
import CanCarousel from '../components/sections/fizz/CanCarousel'
import PopManifesto from '../components/sections/fizz/PopManifesto'
import FooterSplash from '../components/sections/fizz/FooterSplash'

/**
 * Template model — "FIZZ"
 * Carbonated pop: 3D can hero + flavor worlds that repaint the page.
 * Family refs: Fizzi / La Revoltosa (confirm exact URL). Generic copy only.
 * See Obsidian: "Fizz — mapa de referencia".
 */
export default function FizzPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-grape text-foam">
        <NavFizz />

        <main>
          <HeroBubbles />
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

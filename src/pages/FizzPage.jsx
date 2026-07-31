import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavFizz from '../components/sections/fizz/NavFizz'
import HeroBubbles from '../components/sections/fizz/HeroBubbles'
import FlavorWorlds from '../components/sections/fizz/FlavorWorlds'
import BubbleBenefits from '../components/sections/fizz/BubbleBenefits'
import CanCarousel from '../components/sections/fizz/CanCarousel'
import PopManifesto from '../components/sections/fizz/PopManifesto'
import FooterSplash from '../components/sections/fizz/FooterSplash'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model 04 — "FIZZ"
 * Carbonated pop world: deep grape canvas, candy flavor colors,
 * a 3D soda can hero and full-screen color-morphing flavor worlds.
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
          <ContactForm theme="fizz" />
        </main>

        <FooterSplash />
      </div>
    </SmoothScrollProvider>
  )
}

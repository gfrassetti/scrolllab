import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavAtelier from '../components/sections/atelier/NavAtelier'
import HeroMeaning from '../components/sections/atelier/HeroMeaning'
import AboutClarity from '../components/sections/atelier/AboutClarity'
import ServicesStone from '../components/sections/atelier/ServicesStone'
import VisionShutter from '../components/sections/atelier/VisionShutter'
import SelectedWork from '../components/sections/atelier/SelectedWork'
import KeyFacts from '../components/sections/atelier/KeyFacts'
import WordStripe from '../components/sections/atelier/WordStripe'
import StudioCards from '../components/sections/atelier/StudioCards'
import FooterAtelier from '../components/sections/atelier/FooterAtelier'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model 06 — "ATELIER"
 * Inspired by studio sites like Trionn (https://trionn.com/): scroll-reactive fog,
 * WebGL emblem/stone scrubbed by scroll, GSAP + Lenis (via provider).
 * See Obsidian: "Atelier — mapa de referencia". Demo/generic copy only.
 */
export default function AtelierPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#0b0c10] text-white">
        <NavAtelier />
        <main>
          <HeroMeaning />
          <AboutClarity />
          <ServicesStone />
          <VisionShutter />
          <SelectedWork />
          <KeyFacts />
          <WordStripe />
          <StudioCards />
          <ContactForm theme="atelier" />
        </main>
        <FooterAtelier />
      </div>
    </SmoothScrollProvider>
  )
}

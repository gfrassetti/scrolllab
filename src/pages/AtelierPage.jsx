import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavAtelier from '../components/sections/atelier/NavAtelier'
import HeroMeaning from '../components/sections/atelier/HeroMeaning'
import AboutClarity from '../components/sections/atelier/AboutClarity'
import ServicesStone from '../components/sections/atelier/ServicesStone'
import VisionShutter from '../components/sections/atelier/VisionShutter'
import SelectedWork from '../components/sections/atelier/SelectedWork'
import KeyFacts from '../components/sections/atelier/KeyFacts'
import FooterAtelier from '../components/sections/atelier/FooterAtelier'

/**
 * Template model 06 — "ATELIER"
 * Inspired by studio sites like Trionn: scroll-reactive fog canvases,
 * WebGL emblem/stone scrubbed by scroll, GSAP + Lenis (via provider).
 * Demo/generic copy only — not a clone of any brand assets.
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
        </main>
        <FooterAtelier />
      </div>
    </SmoothScrollProvider>
  )
}

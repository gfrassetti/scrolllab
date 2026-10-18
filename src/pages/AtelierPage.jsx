import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import NavAtelier from '../components/sections/atelier/NavAtelier'
import HeroMeaning from '../components/sections/atelier/HeroMeaning'
import AboutClarity from '../components/sections/atelier/AboutClarity'
import ServicesStone from '../components/sections/atelier/ServicesStone'
import VisionShutter from '../components/sections/atelier/VisionShutter'
import SelectedWork from '../components/sections/atelier/SelectedWork'
import KeyFacts from '../components/sections/atelier/KeyFacts'
import StudioCards from '../components/sections/atelier/StudioCards'
import FooterAtelier from '../components/sections/atelier/FooterAtelier'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model 06 — "ATELIER"
 * An interiors and furniture studio. The 3D is the studio's own object — a stone bench
 * with a vessel (studioPiece.js) — that turns with the pointer, comes apart on scroll and
 * changes material with each service. GSAP + Lenis (via provider).
 * See Obsidian: "Atelier — mapa de referencia". Demo/generic copy only.
 */
export default function AtelierPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="tpl-world bg-[#0b0c10] text-white selection:bg-white selection:text-[#0b0c10]">
        <ScrollRail trackClassName="bg-white/10" fillClassName="bg-white" />
        <NavAtelier />
        <main>
          <HeroMeaning />
          <AboutClarity />
          <ServicesStone />
          <VisionShutter />
          <SelectedWork />
          <KeyFacts />
          <StudioCards />
          <ContactForm
            theme="atelier"
            eyebrow="New projects"
            title="Tell us about the place"
            body="Where it is, what it is for and when you would like to move in. We reply within a week with a date for a first conversation."
            submitLabel="Send"
            successMessage="Thank you. We will write back within a week."
            note="We reply within a week. Your details are only used to answer you."
          />
        </main>
        <FooterAtelier />
      </div>
    </SmoothScrollProvider>
  )
}

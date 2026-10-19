import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import NavAtelier from '../components/sections/atelier/NavAtelier'
import HeroMeaning from '../components/sections/atelier/HeroMeaning'
import AboutClarity from '../components/sections/atelier/AboutClarity'
import ServicesStone from '../components/sections/atelier/ServicesStone'
import VisionShutter from '../components/sections/atelier/VisionShutter'
import SelectedWork from '../components/sections/atelier/SelectedWork'
import KeyFacts from '../components/sections/atelier/KeyFacts'
import Testimonial from '../components/sections/atelier/Testimonial'
import StudioCards from '../components/sections/atelier/StudioCards'
import FooterAtelier from '../components/sections/atelier/FooterAtelier'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model 06 — "ATELIER"
 * An architecture studio in black and white. A full-bleed photo carousel opens the
 * page; the studio statement turns to ink word by word; a transition of vertical
 * black columns closes on the Projects section, which opens as a vertical
 * accordion of photographs. GSAP + Lenis (via provider). Demo copy only.
 */
export default function AtelierPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="tpl-world bg-white font-grotesk text-[#111111] selection:bg-[#111111] selection:text-white">
        <ScrollRail trackClassName="bg-[#111111]/10" fillClassName="bg-[#111111]" />
        <NavAtelier />
        <main>
          <HeroMeaning />
          <AboutClarity />
          <ServicesStone />
          <VisionShutter />
          <SelectedWork />
          <KeyFacts />
          <Testimonial />
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

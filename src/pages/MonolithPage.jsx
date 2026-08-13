import SmoothScrollProvider from '../components/SmoothScrollProvider'
import TemplateBuyPill from '../components/TemplateBuyPill'
import NavBrutal from '../components/sections/monolith/NavBrutal'
import HeroThree from '../components/sections/monolith/HeroThree'
import SkewScroller from '../components/sections/monolith/SkewScroller'
import SpecSheet from '../components/sections/monolith/SpecSheet'
import ExhibitGrid from '../components/sections/monolith/ExhibitGrid'
import TypeAccordion from '../components/sections/monolith/TypeAccordion'
import FooterBrutal from '../components/sections/monolith/FooterBrutal'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model 03 — "MONOLITH"
 * Brutalist system: concrete grey, hard 2px borders, condensed
 * type, mono labels, klein blue, and a Three.js wireframe hero.
 */
export default function MonolithPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-concrete text-carbon">
        <NavBrutal />

        <main>
          <HeroThree shape="sphere" />
          <SkewScroller unit="01" />
          <SpecSheet unit="02" />
          <ExhibitGrid unit="03" />
          <TypeAccordion unit="04" />
          <ContactForm theme="monolith" />
        </main>

        <FooterBrutal />
        <TemplateBuyPill sku="monolith" name="MONOLITH" />
      </div>
    </SmoothScrollProvider>
  )
}

import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import NavBrutal from '../components/sections/monolith/NavBrutal'
import HeroThree from '../components/sections/monolith/HeroThree'
import SkewScroller from '../components/sections/monolith/SkewScroller'
import SpecSheet from '../components/sections/monolith/SpecSheet'
import ExhibitGrid from '../components/sections/monolith/ExhibitGrid'
import TypeAccordion from '../components/sections/monolith/TypeAccordion'
import AssemblyStack from '../components/sections/monolith/AssemblyStack'
import LoadNumbers from '../components/sections/monolith/LoadNumbers'
import ProcessSteps from '../components/sections/monolith/ProcessSteps'
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
      <div id="top" className="tpl-world bg-concrete text-carbon selection:bg-klein selection:text-concrete">
        <ScrollRail trackClassName="bg-carbon/15" fillClassName="bg-klein" />
        <NavBrutal />

        <main>
          <HeroThree shape="sphere" />
          <SkewScroller unit="01" total="07" />
          <SpecSheet unit="02" total="07" />
          <ExhibitGrid unit="03" total="07" />
          <AssemblyStack unit="04" total="07" />
          <TypeAccordion unit="05" total="07" />
          <LoadNumbers unit="06" total="07" />
          <ProcessSteps unit="07" total="07" />
          <ContactForm
            theme="monolith"
            eyebrow="Commissions"
            title="Tell us what it should weigh"
            body="Describe the piece or the space, where it goes and when you need it. We reply with a first sketch and a price range within a week."
            submitLabel="Send the brief"
            successMessage="Brief received. A first sketch is on its way within a week."
            note="We answer within five working days. Your details are only used to reply."
          />
        </main>

        <FooterBrutal />
      </div>
    </SmoothScrollProvider>
  )
}

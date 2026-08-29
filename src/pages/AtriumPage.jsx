import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavAtrium from '../components/sections/atrium/NavAtrium'
import HeroMassing from '../components/sections/atrium/HeroMassing'
import ManifestoType from '../components/sections/atrium/ManifestoType'
import ScopeSerif from '../components/sections/atrium/ScopeSerif'
import ClarityPair from '../components/sections/atrium/ClarityPair'
import BlueprintDraw from '../components/sections/atrium/BlueprintDraw'
import ProjectRail from '../components/sections/atrium/ProjectRail'
import ProcessPin from '../components/sections/atrium/ProcessPin'
import PeopleScatter from '../components/sections/atrium/PeopleScatter'
import OrbitRing from '../components/sections/atrium/OrbitRing'
import FooterAtrium from '../components/sections/atrium/FooterAtrium'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model — "ATRIUM"
 * Architecture bureau: pinned massing, manifesto type, a rotating
 * studio ring, and a giant wordmark closer. Generic English copy.
 */
export default function AtriumPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="atrium-world bg-atrium-paper text-atrium-ink">
        <a
          href="#work"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-atrium-paper focus:px-4 focus:py-2 focus:text-atrium-ink ease-out-strong"
        >
          Skip to work
        </a>
        <NavAtrium />
        <main>
          <div className="relative">
            <HeroMassing />
            <ManifestoType />
          </div>
          <ScopeSerif />
          <ClarityPair />
          <BlueprintDraw />
          <ProjectRail />
          <ProcessPin />
          <ContactForm
            theme="atrium"
            eyebrow="Studio"
            title="A brief, a site, a first drawing."
            body="Tell us about the plot, the program, and the quiet you want the building to keep."
            submitLabel="Send the brief"
            sendingLabel="Sending"
            successMessage="Received. We will write back from the studio."
            note="Replies leave the studio within a few days."
          />
          <PeopleScatter />
          <OrbitRing />
        </main>
        <FooterAtrium />
      </div>
    </SmoothScrollProvider>
  )
}

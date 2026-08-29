import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavAtrium from '../components/sections/atrium/NavAtrium'
import HeroMassing from '../components/sections/atrium/HeroMassing'
import ManifestoType from '../components/sections/atrium/ManifestoType'
import ScopeSerif from '../components/sections/atrium/ScopeSerif'
import ProjectRail from '../components/sections/atrium/ProjectRail'
import ProcessPin from '../components/sections/atrium/ProcessPin'
import ClarityPair from '../components/sections/atrium/ClarityPair'
import PeopleScatter from '../components/sections/atrium/PeopleScatter'
import OrbitRing from '../components/sections/atrium/OrbitRing'
import StatField from '../components/sections/atrium/StatField'
import FooterAtrium from '../components/sections/atrium/FooterAtrium'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model — "ATRIUM"
 * Architecture bureau. One arc: paper (hero, manifesto, scope, work,
 * process) → the ClarityPair hinge inverts the field → ink (people, the
 * ring, the figures) → paper again for the brief → the wordmark closes.
 * Contact sits after the black act, never inside it. Generic English copy.
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
          <ProjectRail />
          <ProcessPin />
          <ClarityPair />
          <PeopleScatter />
          <OrbitRing />
          <StatField />
          <ContactForm theme="atrium" />
        </main>
        <FooterAtrium />
      </div>
    </SmoothScrollProvider>
  )
}

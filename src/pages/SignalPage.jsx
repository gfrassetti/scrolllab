import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavSignal from '../components/sections/signal/NavSignal'
import HeroSignal from '../components/sections/signal/HeroSignal'
import SelectedWorkIndex from '../components/sections/signal/SelectedWorkIndex'
import ManifestoMarquee from '../components/sections/signal/ManifestoMarquee'
import RecognitionStats from '../components/sections/signal/RecognitionStats'
import PixelRevealGrid from '../components/sections/signal/PixelRevealGrid'
import ServicesAccordion from '../components/sections/signal/ServicesAccordion'
import FooterSignal from '../components/sections/signal/FooterSignal'

/**
 * Template model — "SIGNAL" (WIP, first pass)
 *
 * World: an AI-native motion & sound studio. Order mirrors Dolsten & Co's
 * own flow (work up front, then manifesto, credibility, process, services)
 * — techniques ported, not brand/copy/clients. See
 * docs/reference-analysis/signal.md.
 *
 * Abandoned (won't be finished): local only. LOCAL_ONLY_SKUS /
 * COMING_SOON_SKUS / BUILDER_HIDDEN_SKUS in src/lib/pricing.js and
 * server/catalog.js, same status as plum; in production the route redirects
 * to the home (src/App.jsx).
 */
export default function SignalPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="signal-world bg-signal-ink text-signal-paper">
        <NavSignal />
        <main>
          <HeroSignal />
          <SelectedWorkIndex />
          <ManifestoMarquee />
          <RecognitionStats />
          <PixelRevealGrid />
          <ServicesAccordion />
        </main>
        <FooterSignal />
      </div>
    </SmoothScrollProvider>
  )
}

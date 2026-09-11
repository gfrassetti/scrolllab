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
 * Still in scaffolding — LOCAL_ONLY_SKUS / BUILDER_HIDDEN_SKUS in
 * src/lib/pricing.js, same status as ratio/plum. Reachable in prod by
 * direct URL only (src/App.jsx) — not linked anywhere.
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

import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavSignal from '../components/sections/signal/NavSignal'
import HeroSignal from '../components/sections/signal/HeroSignal'
import ManifestoMarquee from '../components/sections/signal/ManifestoMarquee'
import RecognitionStats from '../components/sections/signal/RecognitionStats'
import PixelRevealGrid from '../components/sections/signal/PixelRevealGrid'
import ServicesAccordion from '../components/sections/signal/ServicesAccordion'
import FooterSignal from '../components/sections/signal/FooterSignal'

/**
 * Template model — "SIGNAL" (WIP, first pass)
 *
 * World: an AI-native motion & sound studio. Signature scene: a kinetic
 * word-cycle hero (HeroSignal) + a DOM pixel-reveal grid (PixelRevealGrid) —
 * both ported from the Awwwards "Pixelated Image Reveal" reference
 * (Dolsten & Co) as techniques only: original copy, original world, no
 * client logos or award claims carried over. See
 * docs/reference-analysis/signal.md.
 *
 * Still in scaffolding — LOCAL_ONLY_SKUS / BUILDER_HIDDEN_SKUS in
 * src/lib/pricing.js, same status as ratio/plum.
 */
export default function SignalPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="signal-world bg-signal-ink text-signal-paper">
        <NavSignal />
        <main>
          <HeroSignal />
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

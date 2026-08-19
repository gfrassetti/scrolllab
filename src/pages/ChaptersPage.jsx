import TemplateBuyPill from '../components/TemplateBuyPill'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavMinimal from '../components/sections/chapters/NavMinimal'
import HeroKinetic from '../components/sections/chapters/HeroKinetic'
import VelocityMarquee from '../components/sections/chapters/VelocityMarquee'
import ManifestoReveal from '../components/sections/chapters/ManifestoReveal'
import StickyImageStory from '../components/sections/chapters/StickyImageStory'
import HorizontalPanels from '../components/sections/chapters/HorizontalPanels'
import ParallaxEditorial from '../components/sections/chapters/ParallaxEditorial'
import StackingCards from '../components/sections/chapters/StackingCards'
import BigNumbers from '../components/sections/chapters/BigNumbers'
import QuoteBreak from '../components/sections/chapters/QuoteBreak'
import FooterCTA from '../components/sections/chapters/FooterCTA'

/**
 * Template model 01 — "CHAPTERS"
 * Kinetic editorial: raw near-white background, huge type,
 * chapter numbering, restraint over spectacle.
 */
export default function ChaptersPage({ sku = 'chapters' }) {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-bone text-ink">
        <NavMinimal />
        {sku !== 'chapters' && (
          <TemplateBuyPill sku={sku} name="CHAPTERS (test)" placement="end" />
        )}

        <main>
          <HeroKinetic />
          <VelocityMarquee text="A story told in scroll" />
          <ManifestoReveal chapter="01" />
          <StickyImageStory chapter="02" />
          <HorizontalPanels chapter="03" />
          <ParallaxEditorial chapter="04" />
          <StackingCards chapter="05" />
          <BigNumbers />
          <QuoteBreak chapter="06" />
        </main>

        <FooterCTA />
      </div>
    </SmoothScrollProvider>
  )
}

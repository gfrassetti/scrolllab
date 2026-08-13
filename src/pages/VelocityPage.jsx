import SmoothScrollProvider from '../components/SmoothScrollProvider'
import TemplateBuyPill from '../components/TemplateBuyPill'
import NavVelocity from '../components/sections/velocity/NavVelocity'
import HeroStrike from '../components/sections/velocity/HeroStrike'
import TrackMerge from '../components/sections/velocity/TrackMerge'
import HelmetGrid from '../components/sections/velocity/HelmetGrid'
import ParallaxRise from '../components/sections/velocity/ParallaxRise'
import FooterVelocity from '../components/sections/velocity/FooterVelocity'

/**
 * Template model — "VELOCITY"
 * Athlete / motorsport scroll: hero strike → horizontal track merge →
 * helmet grid → parallax. Inspired by landonorris.com patterns (generic copy).
 * See Obsidian: "Velocity — mapa de referencia".
 */
export default function VelocityPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#0a1a12] text-[#ece9e2]">
        <NavVelocity />
        <main>
          <HeroStrike />
          <TrackMerge />
          <HelmetGrid />
          <ParallaxRise />
        </main>
        <FooterVelocity />
        <TemplateBuyPill sku="velocity" name="VELOCITY" />
      </div>
    </SmoothScrollProvider>
  )
}

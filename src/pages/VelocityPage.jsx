import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
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
      <div
        id="top"
        className="tpl-world bg-[#0a1a12] text-[#ece9e2] selection:bg-acid selection:text-[#0a1a12]"
      >
        <ScrollRail trackClassName="bg-[#ece9e2]/10" fillClassName="bg-acid" />
        <NavVelocity />
        <main>
          <HeroStrike />
          <TrackMerge />
          <HelmetGrid />
          <ParallaxRise />
        </main>
        <FooterVelocity />
      </div>
    </SmoothScrollProvider>
  )
}

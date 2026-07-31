import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavVelocity from '../components/sections/velocity/NavVelocity'
import HeroStrike from '../components/sections/velocity/HeroStrike'
import TrackMerge from '../components/sections/velocity/TrackMerge'
import HelmetGrid from '../components/sections/velocity/HelmetGrid'
import ParallaxRise from '../components/sections/velocity/ParallaxRise'
import FooterVelocity from '../components/sections/velocity/FooterVelocity'
import ContactForm from '../components/sections/contact/ContactForm'

/**
 * Template model 04 — "VELOCITY"
 * Strike hero → horizontal gallery / track merge → helmet grid → parallax band.
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
          <ContactForm theme="velocity" />
        </main>
        <FooterVelocity />
      </div>
    </SmoothScrollProvider>
  )
}

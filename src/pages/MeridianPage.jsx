import SmoothScrollProvider from '../components/SmoothScrollProvider'
import Hero from '../components/sections/meridian/Hero'
import Concept from '../components/sections/meridian/Concept'
import GallerySlider from '../components/sections/meridian/GallerySlider'
import Location from '../components/sections/meridian/Location'
import Panorama from '../components/sections/meridian/Panorama'
import Interior from '../components/sections/meridian/Interior'
import Amenities from '../components/sections/meridian/Amenities'
import Masterplan from '../components/sections/meridian/Masterplan'

/**
 * Template model — "MERIDIAN" (WIP, first pass — Hero only)
 *
 * World: real estate scrollytelling, referenced against
 * horizonte-village.com (see docs/template-plans/meridian.txt). Signature
 * scene: an aerial flythrough scrubbed frame-by-frame on canvas 2D
 * (Familia B, docs/scroll-media.md), wordmark that docks into the nav,
 * word-by-word scrub reveal on every headline, and a drawer menu with a
 * roll-up hover on every link.
 *
 * Still in scaffolding — only the Hero exists so far. LOCAL_ONLY_SKUS in
 * src/lib/pricing.js (same status as ratio/plum/signal for the home
 * listing/sitemap) — but, unlike those, deliberately NOT in
 * BUILDER_HIDDEN_SKUS, so the Hero stays editable (copy, video) from the
 * builder while the rest of the template gets built out.
 */
export default function MeridianPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="meridian-world bg-[#dfd8cf] text-[#2a2622]">
        <main>
          <Hero />
          <Concept />
          <GallerySlider />
          <Location />
          <Panorama />
          <Interior />
          <Amenities />
          <Masterplan />
        </main>
      </div>
    </SmoothScrollProvider>
  )
}

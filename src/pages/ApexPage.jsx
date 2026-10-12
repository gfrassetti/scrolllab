import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import Hero from '../components/sections/apex/Hero'
import Statement from '../components/sections/apex/Statement'
import Story from '../components/sections/apex/Story'
import Gallery from '../components/sections/apex/Gallery'
import Models from '../components/sections/apex/Models'
import Showroom from '../components/sections/apex/Showroom'
import Footer from '../components/sections/apex/Footer'

/**
 * Template model — "APEX"
 *
 * World: a night studio where one electric grand tourer only exists in its
 * reflections. The hero is a graded five-take film (scripts/apex-reel.mjs);
 * everything else stays small, exact and out of its way. Plan, decisions and
 * the five beats still to build: docs/template-plans/apex.txt.
 *
 * The home: hero (film, curtain menu, loader) → statement → gallery → models
 * → full-height footer. One page, every menu link is a section of it.
 */
export default function ApexPage() {
  return (
    <SmoothScrollProvider>
      <div className="apex-world tpl-world bg-[#04070d] text-[#e8edf6]" style={{ fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }}>
        <ScrollRail trackClassName="bg-[#e8edf6]/10" fillClassName="bg-[#9cc3ff]" />
        <main>
          <Hero />
          <Statement />
          <Story />
          <Gallery />
          <Models />
          <Showroom />
          <Footer />
        </main>
      </div>
    </SmoothScrollProvider>
  )
}

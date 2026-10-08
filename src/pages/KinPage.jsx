import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import Hero from '../components/sections/kin/Hero'
import Intro from '../components/sections/kin/Intro'
import Rooms from '../components/sections/kin/Rooms'
import Collection from '../components/sections/kin/Collection'
import Footer from '../components/sections/kin/Footer'

/**
 * Template model — "KIN"
 *
 * World: a brutalist gallery (art, fashion, design), cool paper and ink
 * with a single red (docs/template-plans/kin.txt). The signature: the brand
 * word is built from identical bars that drop like type in the loader, come
 * apart into a doorway the camera walks through into the dark room, and set
 * themselves again in the footer. In between: a short statement with notes,
 * a dark index, and a pinned collection where a triptych folds into a stack.
 */
export default function KinPage() {
  return (
    <SmoothScrollProvider>
      <div
        className="kin-world tpl-world bg-[#e1e2de] text-[#141414]"
        style={{ fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }}
      >
        <ScrollRail trackClassName="bg-[#141414]/10" fillClassName="bg-[#141414]" />
        <main>
          <Hero />
          <Intro />
          <Rooms />
          <Collection />
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  )
}

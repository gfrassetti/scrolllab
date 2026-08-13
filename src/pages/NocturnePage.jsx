import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavNocturne from '../components/sections/nocturne/NavNocturne'
import HeroCinematic from '../components/sections/nocturne/HeroCinematic'
import ZoomPortal from '../components/sections/nocturne/ZoomPortal'
import DiagonalMarquee from '../components/sections/nocturne/DiagonalMarquee'
import SplitReveals from '../components/sections/nocturne/SplitReveals'
import WorkIndex from '../components/sections/nocturne/WorkIndex'
import StickyWordCycle from '../components/sections/nocturne/StickyWordCycle'
import OutroCTA from '../components/sections/nocturne/OutroCTA'

/**
 * Template model 02 — "NOCTURNE"
 * Cinematic noir: near-black screen, full-bleed photography,
 * acid accent, sequence numbering. The page behaves like a film.
 */
export default function NocturnePage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-noir text-salt">
        <NavNocturne />

        <main>
          <HeroCinematic />
          <ZoomPortal seq="02" />
          <DiagonalMarquee />
          <SplitReveals seq="03" />
          <WorkIndex seq="04" />
          <StickyWordCycle seq="05" />
        </main>

        <OutroCTA />
      </div>
    </SmoothScrollProvider>
  )
}

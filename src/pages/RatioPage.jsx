import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavRatio from '../components/sections/ratio/NavRatio'
import DeskNotice from '../components/sections/ratio/DeskNotice'
import HeroTools from '../components/sections/ratio/HeroTools'
import FourPlates from '../components/sections/ratio/FourPlates'
import SplitStudy from '../components/sections/ratio/SplitStudy'
import FitStack from '../components/sections/ratio/FitStack'
import FooterLedger from '../components/sections/ratio/FooterLedger'
import packaging from '../components/sections/ratio/assets/case-packaging.jpg'
import motion from '../components/sections/ratio/assets/case-motion.jpg'

/**
 * Template model — "RATIO"
 * Construction-drawing scrollytelling: split hero (cube vs type),
 * zoom-through plates, case split, cube stack, rupture switch (crazy mode).
 * Motion family: grids.obys.agency — original copy, type and world.
 */
export default function RatioPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-white text-[#111] max-lg:h-svh max-lg:overflow-hidden">
        <DeskNotice />
        <NavRatio />

        <main>
          <HeroTools />
          <FourPlates />
          <SplitStudy />
          <SplitStudy
            kicker="Motion plates"
            index="02"
            spec2Label="path"
            spec2Value="rail"
            spec3Label="engine"
            spec3Value="seek"
            spec4Label="stage"
            spec4Value="cube / type"
            quote="A cube on a rail. Plates punch the viewport. The baseline holds."
            quoteBy="R. Chen"
            quoteRole="Motion lead"
            panel2Label="Board"
            img={packaging}
            img2={motion}
            anchor="study-two"
          />
          <FitStack />
        </main>

        <FooterLedger />
      </div>
    </SmoothScrollProvider>
  )
}

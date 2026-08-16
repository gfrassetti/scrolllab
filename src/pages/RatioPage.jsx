import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavRatio from '../components/sections/ratio/NavRatio'
import HeroTools from '../components/sections/ratio/HeroTools'
import FourPlates from '../components/sections/ratio/FourPlates'
import PlateStudy from '../components/sections/ratio/PlateStudy'
import BreakRules from '../components/sections/ratio/BreakRules'
import FooterLedger from '../components/sections/ratio/FooterLedger'
import identity from '../components/sections/ratio/assets/case-identity.jpg'
import editorial from '../components/sections/ratio/assets/case-editorial.jpg'
import packaging from '../components/sections/ratio/assets/case-packaging.jpg'
import motion from '../components/sections/ratio/assets/case-motion.jpg'
import poster from '../components/sections/ratio/assets/detail-poster.jpg'
import proof from '../components/sections/ratio/assets/detail-proof.jpg'
import roller from '../components/sections/ratio/assets/detail-roller.jpg'

/**
 * Template model — "RATIO"
 * Construction-drawing scrollytelling: split hero (cube vs type),
 * zoom-through plates, four system studies, rupture switch (crazy mode).
 * Motion family: grids.obys.agency — original copy, type and world.
 */
export default function RatioPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#ebe6dc] text-[#111]">
        <NavRatio />

        <main>
          <HeroTools />
          <FourPlates />

          <PlateStudy
            index="01"
            title="COLUMNS"
            variant="column"
            specLabel="System"
            specValue="Columns"
            spec2Label="Gutters"
            spec2Value="1.6"
            spec3Label="Margins"
            spec3Value="3"
            spec4Label="Baseline"
            spec4Value="Used"
            caseTitle="CASE 01"
            caseMeta="Studio — 2024"
            img={identity}
            img2={editorial}
            step1Label="Set margins"
            step1Body="Find the outer measure first."
            step2Label="Set gutters"
            step2Body="Leave air so the type can breathe."
            notes="(1) Pair the columns with a typographic grid based on line-height. (2) Quiet pages want a smaller module; loud pages want a larger one."
            anchor="plate-01"
          />

          <PlateStudy
            index="02"
            title="CANON"
            variant="canon"
            specLabel="System"
            specValue="Canon"
            spec2Label="Diagonals"
            spec2Value="6"
            spec3Label="Power lines"
            spec3Value="4"
            spec4Label="Spread"
            spec4Value="Used"
            caseTitle="CASE 02"
            caseMeta="Studio — 2024"
            img={editorial}
            img2={poster}
            step1Label="Diagonals"
            step1Body="Draw the two main lines."
            step2Label="Intersections"
            step2Body="Park the type where they meet."
            notes="(1) The canon is a spread, not a screen. (2) Use the intersections as anchors, then ignore them when the composition asks."
            anchor="plate-02"
          />

          <BreakRules
            line1="LEAVE THE GRID"
            line2="IF THE SHEET"
            line3="ASKS YOU TO"
            aside="(THEN COME BACK)"
            invert
            anchor="break"
          />

          <PlateStudy
            index="03"
            title="MODULE"
            variant="module"
            specLabel="System"
            specValue="Module"
            spec2Label="Vertical"
            spec2Value="25"
            spec3Label="Horizontal"
            spec3Value="25"
            spec4Label="Padding"
            spec4Value="Used"
            caseTitle="CASE 03"
            caseMeta="Studio — 2025"
            img={packaging}
            img2={proof}
            step1Label="Module size"
            step1Body="Find the right unit."
            step2Label="Proportions"
            step2Body="Keep them close to the screen."
            notes="(1) The size and proportion of the module form the horizontal and vertical grid. (2) Spend a few modules as gutters."
            invert={false}
            anchor="plate-03"
          />

          <PlateStudy
            index="04"
            title="FIELD"
            variant="radial"
            specLabel="System"
            specValue="Field"
            spec2Label="Centre"
            spec2Value="Free"
            spec3Label="Spokes"
            spec3Value="24"
            spec4Label="Idea"
            spec4Value="First"
            caseTitle="CASE 04"
            caseMeta="Studio — 2025"
            img={motion}
            img2={roller}
            step1Label="Idea first"
            step1Body="The drawing comes second."
            step2Label="Think aside"
            step2Body="Leave the system if it fights."
            notes="(1) A field is a grid that forgot to be polite. (2) Start from the idea, then see which system still holds."
            invert={false}
            anchor="plate-04"
          />

          <BreakRules
            line1="THE DRAWING"
            line2="IS NOT"
            line3="THE BUILDING"
            aside="(KEEP THE PENCIL)"
            invert
            anchor="guide"
          />
        </main>

        <FooterLedger />
      </div>
    </SmoothScrollProvider>
  )
}

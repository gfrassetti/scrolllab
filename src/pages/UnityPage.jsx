import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavUnity from '../components/sections/unity/NavUnity'
import HeroTwin from '../components/sections/unity/HeroTwin'
import MosaicSlider from '../components/sections/unity/MosaicSlider'
import UniversalLang from '../components/sections/unity/UniversalLang'
import LanguageBlock from '../components/sections/unity/LanguageBlock'
import LastPortrait from '../components/sections/unity/LastPortrait'
import StageLines from '../components/sections/unity/StageLines'
import FooterTrophy from '../components/sections/unity/FooterTrophy'
import joyA from '../components/sections/unity/assets/joy-a.png'
import joyB from '../components/sections/unity/assets/joy-b.png'
import joyC from '../components/sections/unity/assets/joy-c.png'
import hopeA from '../components/sections/unity/assets/hope-a.png'
import hopeB from '../components/sections/unity/assets/hope-b.png'
import hopeC from '../components/sections/unity/assets/hope-c.png'
import heatA from '../components/sections/unity/assets/heat-a.png'
import heatB from '../components/sections/unity/assets/heat-b.png'
import heatC from '../components/sections/unity/assets/heat-c.png'

/**
 * Template model — "UNITY"
 * Sports-editorial scrollytelling: twin-type hero, mosaic→slider,
 * sticky number, language bands, rising closer.
 * Generic placeholder copy only.
 */
export default function UnityPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#e7e4dc] text-[#0a0a0a]">
        <NavUnity />

        <main>
          <HeroTwin />
          <MosaicSlider />
          <UniversalLang />
          <LanguageBlock
            eyebrow="EYEBROW 3"
            line1="LINE 1"
            line2="LINE 2"
            line3="LINE 3"
            note="NOTE 1"
            bg="#c9b896"
            fg="#0a0a0a"
            img1={joyA}
            img2={joyB}
            img3={joyC}
            anchor="lang-a"
          />
          <LanguageBlock
            eyebrow="EYEBROW 4"
            line1="LINE 4"
            line2="LINE 5"
            line3="LINE 6"
            note="NOTE 2"
            bg="#3d5c54"
            fg="#e7e4dc"
            img1={hopeA}
            img2={hopeB}
            img3={hopeC}
            anchor="lang-b"
          />
          <LanguageBlock
            eyebrow="EYEBROW 5"
            line1="LINE 7"
            line2="LINE 8"
            line3="LINE 9"
            note="NOTE 3"
            bg="#a34b32"
            fg="#e7e4dc"
            img1={heatA}
            img2={heatB}
            img3={heatC}
            anchor="lang-c"
          />
          <LastPortrait />
          <StageLines />
        </main>

        <FooterTrophy />
      </div>
    </SmoothScrollProvider>
  )
}

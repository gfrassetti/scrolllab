import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import BallCursor from '../components/sections/unity/BallCursor'
import MatchBoard from '../components/sections/unity/MatchBoard'
import NavUnity from '../components/sections/unity/NavUnity'
import HeroTwin from '../components/sections/unity/HeroTwin'
import MosaicSlider from '../components/sections/unity/MosaicSlider'
import UniversalLang from '../components/sections/unity/UniversalLang'
import LanguageBlock from '../components/sections/unity/LanguageBlock'
import LastPortrait from '../components/sections/unity/LastPortrait'
import StageLines from '../components/sections/unity/StageLines'
import FooterTrophy from '../components/sections/unity/FooterTrophy'
import {
  joyA,
  joyB,
  joyC,
  hopeA,
  hopeB,
  hopeC,
  heatA,
  heatB,
  heatC,
} from '../components/sections/unity/assets/images'

/**
 * Template model — "UNITY"
 * Sports-editorial scrollytelling: twin-type hero, mosaic→slider,
 * sticky number, language bands, rising closer.
 * Generic placeholder copy only.
 */
export default function UnityPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="tpl-world bg-[#e7e4dc] text-[#0a0a0a] selection:bg-unity-gold selection:text-unity-cream">
        <ScrollRail trackClassName="bg-[#0a0a0a]/10" fillClassName="bg-unity-gold" />
        <NavUnity />
        <BallCursor />

        <main>
          <HeroTwin />
          <MosaicSlider />
          <UniversalLang />
          <MatchBoard />
          <LanguageBlock
            eyebrow="JOY"
            line1="SCORE"
            line2="SHOUT"
            line3="SHARE"
            note="Nobody celebrates alone."
            bg="#c9b896"
            fg="#0a0a0a"
            img1={joyA}
            img2={joyB}
            img3={joyC}
            anchor="lang-a"
          />
          <LanguageBlock
            eyebrow="HOPE"
            line1="TRAIN"
            line2="LOSE"
            line3="RETURN"
            note="Half our clubs lost their first match. Every one came back."
            bg="#3d5c54"
            fg="#e7e4dc"
            img1={hopeA}
            img2={hopeB}
            img3={hopeC}
            anchor="lang-b"
          />
          <LanguageBlock
            eyebrow="HEAT"
            line1="TACKLE"
            line2="FALL"
            line3="RISE"
            note="Fair-play cards outnumbered yellow ones three to one."
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

import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavUnity from '../components/sections/unity/NavUnity'
import HeroTwin from '../components/sections/unity/HeroTwin'
import MosaicSlider from '../components/sections/unity/MosaicSlider'
import UniversalLang from '../components/sections/unity/UniversalLang'
import LanguageBlock from '../components/sections/unity/LanguageBlock'
import LastPortrait from '../components/sections/unity/LastPortrait'
import StageLines from '../components/sections/unity/StageLines'
import FooterTrophy from '../components/sections/unity/FooterTrophy'

/**
 * Template model — "UNITY"
 * Sports-editorial scrollytelling: twin-type hero, mosaic→slider,
 * sticky universal number, language bands, rising trophy footer.
 * Family ref: https://united-in-football.framer.website/
 * Generic placeholder copy only.
 * See Obsidian: "Unity — mapa de referencia".
 */
export default function UnityPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#f3efe6] text-[#0a0a0a]">
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
            bg="#ffd84d"
            fg="#0a0a0a"
            img1="https://picsum.photos/seed/unity-joy-a/1200/800"
            img2="https://picsum.photos/seed/unity-joy-b/1200/800"
            img3="https://picsum.photos/seed/unity-joy-c/1200/800"
            anchor="lang-a"
          />
          <LanguageBlock
            eyebrow="EYEBROW 4"
            line1="LINE 4"
            line2="LINE 5"
            line3="LINE 6"
            note="NOTE 2"
            bg="#7ec8ff"
            fg="#0a0a0a"
            img1="https://picsum.photos/seed/unity-hope-a/1200/800"
            img2="https://picsum.photos/seed/unity-hope-b/1200/800"
            img3="https://picsum.photos/seed/unity-hope-c/1200/800"
            anchor="lang-b"
          />
          <LanguageBlock
            eyebrow="EYEBROW 5"
            line1="LINE 7"
            line2="LINE 8"
            line3="LINE 9"
            note="NOTE 3"
            bg="#ff4d33"
            fg="#0a0a0a"
            img1="https://picsum.photos/seed/unity-heat-a/1200/800"
            img2="https://picsum.photos/seed/unity-heat-b/1200/800"
            img3="https://picsum.photos/seed/unity-heat-c/1200/800"
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

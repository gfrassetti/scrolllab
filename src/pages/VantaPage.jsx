import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavVanta from '../components/sections/vanta/NavVanta'
import BootVanta from '../components/sections/vanta/BootVanta'
import HeroOperators from '../components/sections/vanta/HeroOperators'
import KeeperVista from '../components/sections/vanta/KeeperVista'
import CollectionDesk from '../components/sections/vanta/CollectionDesk'
import OperatorFan from '../components/sections/vanta/OperatorFan'
import CitadelStage from '../components/sections/vanta/CitadelStage'
import FactionHold from '../components/sections/vanta/FactionHold'
import WorldVista from '../components/sections/vanta/WorldVista'
import FooterDrop from '../components/sections/vanta/FooterDrop'

/**
 * Template model — "VANTA"
 * Game-universe scrollytelling: HUD chrome, folder plates, hold-to-scan
 * tableaux, Three.js energy field. Motion family: kprverse.com — original IP.
 */
export default function VantaPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#f4f1ea] text-[#111114]">
        <BootVanta />
        <NavVanta />
        <main>
          <HeroOperators />
          <KeeperVista />
          <CollectionDesk />
          <OperatorFan />
          <CitadelStage />
          <FactionHold />
          <WorldVista />
        </main>
        <FooterDrop />
      </div>
    </SmoothScrollProvider>
  )
}

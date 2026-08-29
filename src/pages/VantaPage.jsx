import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavVanta from '../components/sections/vanta/NavVanta'
import HeroOperators from '../components/sections/vanta/HeroOperators'

/**
 * Template model — "VANTA"
 * Rebuild one beat at a time. Right now: HUD + hero.
 */
export default function VantaPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="bg-[#f4f1ea] text-[#111114]">
        <NavVanta />
        <main>
          <HeroOperators />
        </main>
      </div>
    </SmoothScrollProvider>
  )
}

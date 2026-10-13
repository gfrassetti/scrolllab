import SmoothScrollProvider from '../components/SmoothScrollProvider'
import HeroWindow from '../components/sections/neon/HeroWindow'

/**
 * Template model — "NEON" (prototype, local only)
 * A lofi cyberpunk window: a room at night over a neon megacity, painted in
 * layers that move like a person looking around. Only the hero exists so far.
 */
export default function NeonPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="tpl-world bg-[#140a24] text-white">
        <main>
          <HeroWindow />
          <section className="flex min-h-svh items-center justify-center px-6 text-center text-white/60">
            <p>Next section — coming soon.</p>
          </section>
        </main>
      </div>
    </SmoothScrollProvider>
  )
}

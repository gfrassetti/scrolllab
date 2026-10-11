import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import Hero from '../components/sections/apex/Hero'

/**
 * Template model — "APEX"
 *
 * World: a night studio where one electric grand tourer only exists in its
 * reflections. The hero is a graded five-take film (scripts/apex-reel.mjs);
 * everything else stays small, exact and out of its way. Plan, decisions and
 * the five beats still to build: docs/template-plans/apex.txt.
 *
 * Phase 1 — hero only. The block under it is a placeholder so the scroll
 * handoff (film → black) can be seen.
 */
export default function ApexPage() {
  return (
    <SmoothScrollProvider>
      <div className="apex-world tpl-world bg-[#04070d] text-[#e8edf6]" style={{ fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }}>
        <ScrollRail trackClassName="bg-[#e8edf6]/10" fillClassName="bg-[#9cc3ff]" />
        <main>
          <Hero />
          <section className="grid min-h-svh place-items-center px-[5vw] text-center">
            <p className="max-w-[40ch] text-[11px] tracking-[0.16em] uppercase opacity-50" style={{ fontFamily: "'Archivo', sans-serif" }}>
              Next sections in progress — introduce · models · craft · invite
            </p>
          </section>
        </main>
      </div>
    </SmoothScrollProvider>
  )
}

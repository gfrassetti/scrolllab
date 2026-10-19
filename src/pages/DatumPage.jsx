import SmoothScrollProvider from '../components/SmoothScrollProvider'
import HeroDatum from '../components/sections/datum/HeroDatum'
import NavDatum, { InvertDatum } from '../components/sections/datum/NavDatum'
import PracticeDatum from '../components/sections/datum/PracticeDatum'

/**
 * Template model — "DATUM" (in progress, local only)
 * An architecture practice in Porto. The page is a drawing sheet: an 8-column grid of hairlines, a datum
 * line from corner to corner, ruler ticks and a scale bar; black and white, and «Invert drawing» turns it
 * over. Reference studied: santalarch.com (structure and feel only — own name, copy, details and fonts).
 * So far: the hero and the practice (the cube field).
 */
const THEME = `
@property --datum-paper { syntax: '<color>'; inherits: true; initial-value: #efefed; }
@property --datum-ink { syntax: '<color>'; inherits: true; initial-value: #101010; }
.datum-world { --datum-paper: #efefed; --datum-ink: #101010; background: var(--datum-paper); color: var(--datum-ink);
  font-family: 'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;
  transition: --datum-paper .6s cubic-bezier(.25,1,.5,1), --datum-ink .6s cubic-bezier(.25,1,.5,1); }
.datum-world[data-theme='dark'] { --datum-paper: #101010; --datum-ink: #efefed; }
`

export default function DatumPage() {
  return (
    <SmoothScrollProvider>
      <div className="datum-world" data-theme="light">
        <style>{THEME}</style>
        <NavDatum />
        <main>
          <HeroDatum />
          <PracticeDatum />
          <section id="buildings" className="flex min-h-svh items-center justify-center px-6 text-center" style={{ background: 'var(--datum-ink)', color: 'var(--datum-paper)' }}>
            <p className="opacity-60">Next section — in progress.</p>
          </section>
        </main>
        <InvertDatum />
      </div>
    </SmoothScrollProvider>
  )
}

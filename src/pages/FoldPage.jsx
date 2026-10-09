import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import Film from '../components/sections/fold/Film'
import Footer from '../components/sections/fold/Footer'

/**
 * Template model — "FOLD"
 *
 * World: a paper diorama told as a film you scroll. One canvas plays a long
 * frame sequence (a few continuous takes, each one camera move) and a score
 * (sections/fold/score.js) cues the camera, the grid, the chapters, the
 * texts and the scene changes. The picture never stops: every tick of the
 * scroll moves it, and the clock keeps it breathing. The footer is a video
 * loop that starts on the film's last frame. How it was made and how to
 * build a new film: docs/fold-template.md.
 */
const MONO = "'JetBrains Mono', monospace"

export default function FoldPage() {
  return (
    <SmoothScrollProvider>
      <div className="fold-world tpl-world bg-[#e9e2d3] text-[#1b1a17]" style={{ fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }}>
        {/* Amber reads on the day scenes and on the night ones. */}
        <ScrollRail trackClassName="bg-[#c8742f]/20" fillClassName="bg-[#c8742f]" />
        <header className="pointer-events-none fixed inset-x-0 top-0 z-20 h-[5.3vw] min-h-14" style={{ transition: 'opacity 380ms cubic-bezier(0.22,1,0.36,1)' }}>
          {/* Mark: a folded sheet, drawn in. */}
          <a href="#" aria-label="Brand — home" className="fold-mark-link tpl-hit pointer-events-auto absolute top-1/2 left-[2.65%] block -translate-x-1/2 -translate-y-1/2 max-[820px]:left-[24px]">
            <svg viewBox="0 0 28 28" className="fold-mark h-[clamp(20px,2.05vw,30px)] w-auto" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path pathLength="1" d="M4 24V4h20v20H4ZM4 4l20 20M14 4v10" />
            </svg>
          </a>
          <a
            href="#"
            className="fold-hide-on-nav tpl-hit group pointer-events-auto absolute top-1/2 right-[2%] inline-flex -translate-y-1/2 items-center gap-3 rounded-[4px] bg-[#1b1a17] py-1 pr-1 pl-3 text-[11px] tracking-[0.16em] text-[#f2efe6] uppercase"
            style={{ fontFamily: MONO }}
          >
            Call to action
            <span aria-hidden="true" className="grid aspect-square w-7 place-items-center rounded-[3px] border border-[#f2efe6]/30 transition-colors duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[#f2efe6]/15">
              →
            </span>
          </a>
        </header>
        <main>
          <Film />
        </main>
        <Footer />
        <style>{`
          .fold-mark-link { color: #1b1a17; transition: color 420ms linear; }
          .fold-world:has(.fold-film[data-tone='light']) .fold-mark-link { color: #f2efe6; }
          .fold-mark path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: foldDraw 1.4s cubic-bezier(0.22,1,0.36,1) 0.15s forwards; }
          @keyframes foldDraw { to { stroke-dashoffset: 0; } }
          @media (prefers-reduced-motion: reduce) {
            :where(:root:not([data-motion='full'])) .fold-mark path { animation: none; stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    </SmoothScrollProvider>
  )
}

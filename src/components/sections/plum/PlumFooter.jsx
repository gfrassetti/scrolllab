import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * PlumFooter — the page closer. A giant wordmark that runs to screen width and
 * is cropped by overflow, link columns, and a legal row. All from story.footer:
 *
 *   "footer": {
 *     "bg", "ink", "accent",
 *     "wordmark": "PLUM",
 *     "tagline": "…",
 *     "cta": { "label", "href" },
 *     "columns": [ { "title", "links": [ { "label", "href" } ] } ],
 *     "legal": [ "© 2026 …", "…" ]
 *   }
 */
export default function PlumFooter({ story }) {
  const root = useRef(null)
  const f = story?.footer
  const theme = story?.theme || {}
  const ink = f?.ink || theme.ink || '#f3f1ec'
  const accent = f?.accent || theme.accent || '#6f5bff'
  const bg = f?.bg || theme.bg || '#0b0b0d'

  useGSAP(
    () => {
      if (!f) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const q = gsap.utils.selector(root)
      const mark = q('[data-mark]')[0]
      if (mark) {
        gsap.from(mark, {
          yPercent: 40,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 85%' },
        })
      }
    },
    { scope: root, dependencies: [!!f] },
  )

  if (!f) return null
  const columns = f.columns || []
  const legal = Array.isArray(f.legal) ? f.legal : f.legal ? [f.legal] : []

  return (
    <footer
      ref={root}
      className="relative overflow-hidden px-6 pt-24 pb-6 md:px-10"
      style={{ background: bg, color: ink }}
    >
      {/* looping mp4 backdrop (pear.no footer-loop), under a dark scrim */}
      {f.clip && (
        <>
          <video
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
            src={f.clip}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: `linear-gradient(to bottom, ${bg}cc, ${bg}99 40%, ${bg}dd)`,
            }}
            aria-hidden="true"
          />
        </>
      )}
      <div className="relative z-10 mx-auto flex w-full max-w-[1300px] flex-col gap-14">
        {(f.tagline || f.cta) && (
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            {f.tagline && (
              <p
                className="max-w-[24ch] text-[clamp(1.4rem,1rem+2vw,2.4rem)] leading-[1.1] font-medium tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                {f.tagline}
              </p>
            )}
            {f.cta && (
              <a
                href={f.cta.href || '#'}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: accent, color: '#0b0b0d' }}
              >
                {f.cta.label} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        )}

        {columns.length > 0 && (
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {columns.map((col, i) => (
              <nav key={i} className="flex flex-col gap-3">
                <span className="text-[11px] uppercase tracking-[0.2em]" style={{ opacity: 0.5 }}>
                  {col.title}
                </span>
                {(col.links || []).map((l, j) => (
                  <a
                    key={j}
                    href={l.href || '#'}
                    className="text-[13px] transition-opacity hover:opacity-100"
                    style={{ opacity: 0.8 }}
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>
        )}
      </div>

      <p
        data-mark
        className="relative z-10 mt-14 -ml-[0.02em] font-medium leading-[0.72] tracking-[-0.06em] whitespace-nowrap uppercase"
        style={{ fontSize: 'clamp(5.5rem,30vw,30rem)', color: ink }}
      >
        {f.wordmark || story?.title || 'PLUM'}
      </p>

      {legal.length > 0 && (
        <div
          className="relative z-10 mt-6 flex flex-col gap-2 border-t pt-4 text-[11px] uppercase tracking-[0.08em] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6"
          style={{ borderColor: 'rgba(255,255,255,0.15)', opacity: 0.6 }}
        >
          {legal.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}
    </footer>
  )
}

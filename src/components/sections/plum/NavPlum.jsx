import { useEffect, useRef, useState } from 'react'

/**
 * NavPlum — fixed hairline header over the film. Brand left, a couple of
 * section links, one CTA button (pear.no's "APPLY"). It fades its own
 * background in once you leave the very top so type stays legible over the
 * bright orchard frames. All labels/links come from story.nav.
 */
export default function NavPlum({ story }) {
  const nav = story?.nav || {}
  const theme = story?.theme || {}
  const ink = theme.ink || '#f3f1ec'
  const accent = theme.accent || '#6f5bff'
  const links = nav.links || []
  const cta = nav.cta
  const [solid, setSolid] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={ref}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 transition-colors duration-500 md:px-10"
      style={{
        color: ink,
        backgroundColor: solid ? 'rgba(11,11,13,0.72)' : 'transparent',
        backdropFilter: solid ? 'blur(10px)' : 'none',
      }}
    >
      <a
        href="#top"
        className="text-[13px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: ink }}
      >
        {nav.brand || story?.title || 'PLUM'}
      </a>

      <nav className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.18em] md:flex">
        {links.map((l, i) => (
          <a
            key={i}
            href={l.href || '#'}
            className="opacity-70 transition-opacity hover:opacity-100"
            style={{ color: ink }}
          >
            {l.label}
          </a>
        ))}
      </nav>

      {cta && (
        <a
          href={cta.href || '#'}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-transform hover:scale-[1.03]"
          style={{ backgroundColor: accent, color: '#0b0b0d' }}
        >
          {cta.label} <span aria-hidden="true">→</span>
        </a>
      )}
    </header>
  )
}

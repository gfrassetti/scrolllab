/**
 * KIN — shared bits for the sections that come after the collection
 * (Programme, Press, Visit). The first five sections keep their own copies;
 * this file only holds what the new ones have in common: the display face,
 * the hairline, the "learn more" link and the colour variables.
 */

export const PAPER = '#e1e2de'
export const INK = '#141414'
export const ACCENT = '#e1371f'

export const DISPLAY = {
  fontFamily: "'Archivo', 'Inter Tight', sans-serif",
  fontStretch: '125%',
  fontVariationSettings: "'wdth' 125",
}

// Hairlines in the text colour at 25%, so a custom fg keeps them.
export const HAIRLINE = 'color-mix(in srgb, currentColor 25%, transparent)'

export const pad = (n) => String(n).padStart(2, '0')
export const clamp01 = (v) => Math.max(0, Math.min(1, v))

/** Colour variables the section's CSS reads; GSAP uses the resolved values. */
export function kinVars({ bg, fg, accent }, defaults = {}) {
  const ink = fg || defaults.fg || INK
  const paper = bg || defaults.bg || PAPER
  return {
    background: paper,
    color: ink,
    '--kin-ink': ink,
    '--kin-paper': paper,
    '--kin-accent': accent || ACCENT,
  }
}

/** A line of text split into words, each word under its own mask. */
export function MaskedWords({ text, wordAttr = 'data-kin-w' }) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  return words.map((w, i) => (
    <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em]">
      <span {...{ [wordAttr]: '' }} className="inline-block">
        {w}
        {i < words.length - 1 ? ' ' : ''}
      </span>
    </span>
  ))
}

/** "Learn more": the rule retracts and the arrow leaves and comes back in. */
export function MoreLink({ href = '#', children, className = '', ...rest }) {
  return (
    <a href={href} className={`kin-more tpl-hit relative flex w-full max-w-[30em] items-center justify-between py-[0.6em] ${className}`} {...rest}>
      <span aria-hidden="true" className="kin-more-line absolute inset-x-0 top-0 h-px bg-(--kin-ink)" />
      <span>{children}</span>
      <span aria-hidden="true" className="relative inline-block h-[1em] w-[1.2em] overflow-hidden">
        <svg viewBox="0 0 14 12" className="kin-more-arrow absolute inset-0 h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M0 6h12.5M7.5 1l5 5-5 5" />
        </svg>
        <svg viewBox="0 0 14 12" className="kin-more-arrow-in absolute inset-0 h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M0 6h12.5M7.5 1l5 5-5 5" />
        </svg>
      </span>
    </a>
  )
}

export const MORE_CSS = `
  .kin-more-line { transform-origin: 100% 50%; }
  .kin-more-arrow, .kin-more-arrow-in { transition: transform 520ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
  .kin-more-arrow-in { transform: translateX(-120%); }
  @media (hover: hover) {
    .kin-more:hover .kin-more-line { animation: kin-sweep 820ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
    .kin-more:hover .kin-more-arrow { transform: translateX(120%); }
    .kin-more:hover .kin-more-arrow-in { transform: translateX(0); }
  }
  @keyframes kin-sweep {
    0% { transform: scaleX(1); transform-origin: 100% 50%; }
    45% { transform: scaleX(0); transform-origin: 100% 50%; }
    46% { transform: scaleX(0); transform-origin: 0% 50%; }
    100% { transform: scaleX(1); transform-origin: 0% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    :where(:root:not([data-motion='full'])) .kin-more-arrow,
    :where(:root:not([data-motion='full'])) .kin-more-arrow-in { transition: none; }
    :where(:root:not([data-motion='full'])) .kin-more-line { animation: none; }
  }
`

/**
 * MERIDIAN — header pieces with their hover micro-interactions.
 * Colors come from the header row's `data-solid` flag (transparent over
 * the video vs. painted sand bar on scroll-up), so both states share one
 * component.
 */

const MONO = { fontFamily: "'Space Mono', monospace" }

// Same vertical roll as the drawer links: the label slides up and an
// italic clone rides in from below. `introAttr` lets Hero target the
// visible copy for its intro SplitText without splitting the clone.
export function HeaderLink({ href, label, introAttr = false }) {
  return (
    <a
      href={href}
      className="meridian-hdr-link pointer-events-auto relative inline-block overflow-hidden text-[11px] uppercase tracking-[0.2em]"
      style={{ ...MONO, height: '1.5em', lineHeight: '1.5em' }}
    >
      <span className="meridian-hdr-link-inner block will-change-transform">
        <span className="block" {...(introAttr ? { 'data-meridian-hero-nav': true } : {})}>
          {label}
        </span>
        <span aria-hidden="true" className="block italic">
          {label}
        </span>
      </span>
      <style>{`
        .meridian-hdr-link-inner { transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .meridian-hdr-link:hover .meridian-hdr-link-inner,
        .meridian-hdr-link:focus-visible .meridian-hdr-link-inner { transform: translateY(-50%); }
      `}</style>
    </a>
  )
}

// Pill CTA — a fill sweeps up from the bottom on hover and the label
// inverts; the arrow nudges diagonally. Light pill over the video, dark
// pill on the painted bar.
export function HeaderCta({ href, label }) {
  return (
    <a
      href={href}
      className="meridian-hdr-cta pointer-events-auto relative hidden items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] md:inline-flex"
      style={MONO}
    >
      <span aria-hidden="true" className="meridian-hdr-cta-fill absolute inset-0" />
      <span className="relative">{label}</span>
      <svg
        className="meridian-hdr-cta-arrow relative"
        width="11"
        height="11"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <style>{`
        .meridian-hdr-cta {
          background: #ffffff;
          color: #2a2622;
          border: 1px solid #ffffff;
          transition: background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .meridian-hdr-cta-fill {
          background: #2a2622;
          transform: translateY(101%);
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .meridian-hdr-cta:hover .meridian-hdr-cta-fill,
        .meridian-hdr-cta:focus-visible .meridian-hdr-cta-fill { transform: translateY(0); }
        .meridian-hdr-cta:hover,
        .meridian-hdr-cta:focus-visible { color: #f0eae0; }
        .meridian-hdr-cta-arrow { transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .meridian-hdr-cta:hover .meridian-hdr-cta-arrow { transform: translate(2px, -2px); }

        [data-solid="true"] .meridian-hdr-cta { background: #2a2622; color: #f0eae0; border-color: #2a2622; }
        [data-solid="true"] .meridian-hdr-cta-fill { background: #efe8dd; }
        [data-solid="true"] .meridian-hdr-cta:hover,
        [data-solid="true"] .meridian-hdr-cta:focus-visible { color: #2a2622; }
      `}</style>
    </a>
  )
}

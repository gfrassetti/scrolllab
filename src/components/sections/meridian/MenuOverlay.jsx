import { useEffect, useRef } from 'react'
import { useLang } from './lang'
import { LangSwitch } from './NavBits'

/**
 * MERIDIAN — Menu overlay
 *
 * A full-viewport drawer that slides in from the top with a smooth
 * ease-out (fast start, gentle settle). Two panes:
 *
 *   • left  — a two-column grid of primary links; every link has the
 *             vertical-roll hover from the reference (the current word
 *             slides up, an identical clone rides up from below in the
 *             same beat).
 *   • right — a hero-scale image with a headline overlay and a pill
 *             button; hovering the pane zooms the image.
 *
 * Motion vocabulary is deliberately tiny (course Detalle #5.2 in
 * docs/award-winning-web-developer.md): everything on-hover uses the
 * same cubic-bezier easing family and the same ~450ms duration, so the
 * whole surface feels like one instrument, not a collage.
 */

// Default links, built from the language dictionary (the builder's
// `menuLinks` list overrides them in every language).
const defaultLinks = (t) => [
  { label: t('home'), href: '#top' },
  { label: t('villas'), href: '#villas' },
  { label: t('residences'), href: '#residences' },
  { label: t('about'), href: '#about' },
  { label: t('contact'), href: '#contact' },
]

// Small pills (secondary) — the reference groups these under the primary
// list with pill outlines instead of the roll-up type treatment.
const defaultPills = (t) => [
  { label: t('investment'), href: '#investment' },
  { label: t('team'), href: '#team' },
  { label: t('partners'), href: '#partners' },
]

function MenuLink({ label, href }) {
  // The whole link is a fixed-height <a> that clips overflow to one
  // line; inside, two copies of the label stacked vertically translate
  // up together on hover so the clone rolls into the visible slot from
  // below.
  return (
    <a
      href={href}
      className="meridian-menu-link relative block overflow-hidden text-left align-middle text-[2.1rem] tracking-[-0.02em] md:text-[clamp(2.4rem,5.4vw,4.6rem)] text-[#2a2622]"
      style={{
        fontFamily: "'Fraunces', serif",
        lineHeight: 1.05,
        // clip to one line: the clone lives below this box and only
        // becomes visible when the inner column translates -100%.
        height: '1.05em',
      }}
    >
      <span className="meridian-menu-link-inner block will-change-transform">
        <span className="block" style={{ height: '1.05em' }}>{label}</span>
        <span
          aria-hidden="true"
          className="block italic"
          style={{ height: '1.05em' }}
        >
          {label}
        </span>
      </span>
    </a>
  )
}

function PillLink({ label, href }) {
  return (
    <a
      href={href}
      className="group relative overflow-hidden rounded-full border border-[#2a2622]/40 px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#2a2622] transition-colors duration-300 hover:border-[#2a2622] hover:bg-[#2a2622] hover:text-[#f0eae0]"
      style={{ fontFamily: "'Space Mono', monospace" }}
    >
      {label}
    </a>
  )
}

export default function MenuOverlay({ open, onClose, links }) {
  // Builder-editable (list field, `meridian/Hero` → menuLinks): buyers
  // rename/re-point these without touching code. Anything visual on the
  // right pane (photo, headline, contact strip) stays code-only on
  // purpose — see docs/template-plans/meridian.txt for the reasoning.
  const { t } = useLang()
  const primaryLinks = links?.length ? links : defaultLinks(t)
  const rootRef = useRef(null)

  // Trap body scroll while open so wheeling inside the drawer doesn't
  // move the hero scrub underneath.
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div
      ref={rootRef}
      aria-hidden={!open}
      // Reference leaves ~1/4 of the viewport showing the page underneath
      // instead of covering it entirely — a glimpse of "you're still on
      // this page, just browsing the menu," not a full takeover.
      // Mobile (verified at 375px on the reference): full-screen, and the
      // whole drawer scrolls as one column instead of two panes.
      data-lenis-prevent
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex h-[100dvh] flex-col overflow-y-auto pt-[78px] md:h-[78vh] md:overflow-hidden md:pt-0"
      style={{
        transform: open ? 'translateY(0)' : 'translateY(-100%)',
        // Verified against the live reference: it drives this with GSAP
        // using a CustomEase literally named "default-ease" registered as
        // cubic-bezier(0.16, 1, 0.3, 1) — same curve we already had — at
        // duration 1.2s (we had 0.75s, which read as a snap instead of a
        // considered, weighted drop). Matched both here.
        transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: open ? 'auto' : 'none',
        background: '#efe8dd',
        // Static, not toggled by `open` — a shadow that flips on/off is an
        // extra paint on top of the transform animation; a constant one
        // just rides along for free once this layer is composited (it's
        // off-screen and invisible anyway while closed).
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
        // Promote to its own compositor layer up front instead of letting
        // the browser decide mid-transition — the difference between a
        // GPU-composited slide and a thread fighting the menu's own DOM
        // (photo backgrounds, text) for paint time on every frame.
        willChange: 'transform',
      }}
    >
      {/* explicit CLOSE control — matches the reference (a large "CLOSE"
          text-button sitting where the hamburger used to be). Sits on
          top of everything so it's always reachable, and duplicates the
          fixed-nav hamburger's job for people who can't see that button
          for whatever reason (small screens, transition mid-flight, or
          just because a big word is easier to spot than a chevron). */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        className="meridian-menu-close pointer-events-auto absolute top-4 left-4 z-10 hidden items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-[#2a2622] md:top-6 md:left-6 md:inline-flex"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        <span
          aria-hidden="true"
          className="relative inline-block h-[14px] w-[14px]"
        >
          <span
            className="absolute top-1/2 left-0 block h-px w-full origin-center"
            style={{
              background: 'currentColor',
              transform: 'translateY(-50%) rotate(45deg)',
            }}
          />
          <span
            className="absolute top-1/2 left-0 block h-px w-full origin-center"
            style={{
              background: 'currentColor',
              transform: 'translateY(-50%) rotate(-45deg)',
            }}
          />
        </span>
        <span>{t('close')}</span>
      </button>

      {/* two-pane body — its own scroll in case content doesn't fit the
          78vh box on a short viewport; the drawer itself never grows
          past that height. */}
      {/* mobile-only utility row — the reference moves language / portal /
          plan links out of the header and into the drawer at this width */}
      <div
        className="flex shrink-0 items-center justify-between border-y border-[#2a2622]/15 px-6 py-5 text-[11px] uppercase tracking-[0.2em] text-[#2a2622] md:hidden"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        <span className="flex items-center gap-4">
          <LangSwitch />
          <span aria-hidden="true" className="h-5 w-px bg-[#2a2622]/20" />
          <a href="#portal">{t('clientPortal')}</a>
        </span>
        <a href="#brochure">{t('brochure')}</a>
      </div>

      <div className="flex shrink-0 flex-col md:h-full md:flex-1 md:shrink md:flex-row md:overflow-y-auto">
        {/* LEFT — link list */}
        <div className="flex flex-1 flex-col justify-between px-6 pt-8 pb-8 md:px-10 md:pt-28 md:pb-16">
          <div className="grid grid-cols-1 gap-y-1 md:grid-cols-2 md:gap-x-12 md:gap-y-3">
            {primaryLinks.map((l) => (
              <MenuLink key={l.href} {...l} />
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {defaultPills(t).map((l) => (
              <PillLink key={l.href} {...l} />
            ))}
          </div>
        </div>

        {/* RIGHT — feature card with photo + headline + CTA */}
        <div className="relative flex-1 overflow-hidden md:m-10 md:max-w-[46%] md:rounded-md">
          <div
            className="meridian-menu-card relative h-full min-h-[38vh] w-full cursor-pointer"
            role="link"
            tabIndex={0}
          >
            {/* uses a mid-flythrough frame so we don't add another asset */}
            <div
              aria-hidden="true"
              className="meridian-menu-card-photo absolute inset-0 h-full w-full"
              style={{
                backgroundImage: "url('/meridian/hero/seq/0120.webp')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.45) 100%)',
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-8 md:p-10">
              <p
                className="text-[11px] uppercase tracking-[0.28em] text-white/85"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {t('visualSelection')}
              </p>
              <div>
                <h3
                  className="mb-8 max-w-[16ch] text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.1] text-white"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t('easierToChoose')}
                </h3>
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-[#2a2622]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {t('selectOnGenplan')}
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* footer strip */}
      <div
        className="shrink-0 border-t border-[#2a2622]/15 px-6 py-6 text-xs uppercase tracking-[0.24em] text-[#2a2622]/70 md:px-10"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-4">
          <span>
            <span className="mb-1 block text-[#2a2622]/40 md:hidden">{t('phone')}</span>
            +00 (000) 000-0000
          </span>
          <span>
            <span className="mb-1 block text-[#2a2622]/40 md:hidden">{t('email')}</span>
            info@example.com
          </span>
          <span>
            <span className="mb-1 block text-[#2a2622]/40 md:hidden">{t('socials')}</span>
            Facebook · Instagram · Whatsapp
          </span>
        </div>
      </div>
      <style>{`
        .meridian-menu-link-inner {
          transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .meridian-menu-link:hover .meridian-menu-link-inner {
          transform: translateY(-100%);
        }
        .meridian-menu-card-photo {
          transform: scale(1);
          transform-origin: center;
          transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .meridian-menu-card:hover .meridian-menu-card-photo,
        .meridian-menu-card:focus-visible .meridian-menu-card-photo {
          transform: scale(1.06);
        }
      `}</style>
    </div>
  )
}

/**
 * Hamburger button — closed shows two horizontal rules that get "swept"
 * (drawn from left to right) on hover; open transforms the pair into a
 * cross. One shared transition curve so hover and open share a family.
 */
export function Hamburger({ open, onClick, label, className = '', style }) {
  const { t } = useLang()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? t('close') : t('menu')}
      aria-expanded={open}
      data-open={open ? 'true' : 'false'}
      className={`meridian-hamburger group pointer-events-auto inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] ${className}`}
      style={{ fontFamily: "'Space Mono', monospace", ...style }}
    >
      <span className="relative inline-block h-[10px] w-[22px] shrink-0" aria-hidden="true">
        {/* two base rules — dimmer, always visible when closed */}
        <span className="line line-1" />
        <span className="line line-2" />
        {/* two "fills" — brighter, drawn from the left on hover */}
        <span className="fill fill-1" />
        <span className="fill fill-2" />
      </span>
      <span className="lbl">{open ? t('close') : (label ?? t('menu'))}</span>
      <style>{`
        @media (max-width: 767px) {
          .meridian-hamburger .lbl { display: none; }
          .meridian-hamburger { padding: 10px 10px 10px 0; }
        }
        .meridian-hamburger .line,
        .meridian-hamburger .fill {
          position: absolute;
          left: 0;
          height: 1px;
          width: 22px;
          background: currentColor;
          transform-origin: left center;
          transition:
            transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
            top 0.45s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.3s ease-out;
        }
        .meridian-hamburger .line { opacity: 0.55; }
        .meridian-hamburger .fill { opacity: 0; transform: scaleX(0); }
        .meridian-hamburger .line-1,
        .meridian-hamburger .fill-1 { top: 3px; }
        .meridian-hamburger .line-2,
        .meridian-hamburger .fill-2 { top: 7px; }
        /* hover — the fills sweep in from the left over the base rules */
        .meridian-hamburger:hover .fill { opacity: 1; transform: scaleX(1); }
        .meridian-hamburger:hover .fill-2 { transition-delay: 0.06s; }
        .meridian-hamburger:hover .line { opacity: 0.9; }
        /* open — the base pair morphs into an X; fills stay hidden.
           Rotate around the centre so the two lines actually cross,
           not just tilt off one corner. */
        .meridian-hamburger[data-open="true"] .fill { opacity: 0; transform: scaleX(0); }
        .meridian-hamburger[data-open="true"] .line { opacity: 1; transform-origin: center center; }
        .meridian-hamburger[data-open="true"] .line-1 { top: 5px; transform: translateY(-0.5px) rotate(45deg); }
        .meridian-hamburger[data-open="true"] .line-2 { top: 5px; transform: translateY(-0.5px) rotate(-45deg); }
      `}</style>
    </button>
  )
}

import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useLang } from './lang'

/**
 * MERIDIAN — Footer (~80% of the viewport)
 *
 * Same anatomy as the reference's closing band on a warm charcoal ground:
 * contact block top-left, phone + email in big light serif top-right, the
 * monogram dead-centre, the address with a "see on map" button and round
 * social buttons bottom-left, a villas link bottom-right, and a hairline
 * legal row underneath. Everything reveals with a soft blur-up as it
 * enters.
 *
 * Labels come from the language dictionary (lang.jsx); the contact data
 * are props so the builder can set them.
 */

const INK = '#2a2622'
const SAND = '#dfd8cf'
const MONO = { fontFamily: "'Space Mono', monospace" }
const SERIF = { fontFamily: "'Fraunces', serif", fontWeight: 300 }

function Social({ label, href, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="mer-ft-social relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full"
    >
      <span aria-hidden="true" className="mer-ft-social-fill absolute inset-0 rounded-full" />
      <span className="relative">{children}</span>
    </a>
  )
}

export default function Footer({
  wordmark = 'Meridian',
  phone = '+00 (000) 000-0000',
  email = 'info@example.com',
  location = '[Region], [Country]',
  mapHref = '#',
  studio = '[Studio]',
  studioHref = '#',
}) {
  const root = useRef(null)
  const { t } = useLang()

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-ft-reveal]', {
        opacity: 0,
        y: 24,
        filter: 'blur(6px)',
        duration: 1.4,
        stagger: 0.09,
        ease: 'power2.out',
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <footer
      ref={root}
      id="footer"
      className="relative flex min-h-[80svh] flex-col justify-between px-6 pt-14 pb-6 md:px-16 md:pt-16"
      style={{ background: INK, color: SAND }}
    >
      <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
        <p data-ft-reveal className="text-[12px] uppercase tracking-[0.08em]" style={MONO}>
          {t('footerContact')}
          <span className="block opacity-50">{t('salesOffice')}</span>
        </p>
        <div data-ft-reveal className="md:text-right">
          <a
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
            className="mer-ft-link block text-[clamp(2rem,4.2vw,4rem)] leading-[1.05] tracking-[-0.01em]"
            style={SERIF}
          >
            {phone}
          </a>
          <a
            href={`mailto:${email}`}
            className="mer-ft-link mt-4 block text-[clamp(1.3rem,2vw,1.9rem)] leading-[1.1]"
            style={SERIF}
          >
            {email}
          </a>
        </div>
      </div>

      <div data-ft-reveal className="flex flex-col items-center gap-5 py-12 md:py-8" aria-hidden="true">
        <svg width="150" height="150" viewBox="0 0 150 150" fill="none">
          <circle cx="75" cy="75" r="66" stroke={SAND} strokeWidth="2" />
          <text
            x="75"
            y="96"
            textAnchor="middle"
            fontFamily="'Fraunces', serif"
            fontWeight="300"
            fontSize="72"
            fill={SAND}
          >
            M
          </text>
        </svg>
        <span className="text-[11px] uppercase tracking-[0.3em] opacity-50" style={MONO}>
          {wordmark}
        </span>
      </div>

      <div>
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div data-ft-reveal>
            <p className="text-[clamp(1.5rem,2.2vw,2.1rem)] leading-[1.1]" style={SERIF}>
              {location}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <a
                href={mapHref}
                className="mer-ft-btn relative inline-flex items-center overflow-hidden rounded-[4px] px-5 py-3 text-[12px] uppercase tracking-[0.14em]"
                style={MONO}
              >
                <span aria-hidden="true" className="mer-ft-btn-fill absolute inset-0" />
                <span className="relative">{t('seeOnMap')}</span>
              </a>
              <Social label="Facebook" href="#">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M9.2 15V8.7h2.1l.3-2.5H9.2V4.7c0-.7.2-1.2 1.2-1.2h1.3V1.3C11.5 1.3 10.7 1.2 9.9 1.2 8 1.2 6.7 2.4 6.7 4.5v1.7H4.6v2.5h2.1V15h2.5z" />
                </svg>
              </Social>
              <Social label="Instagram" href="#">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                  <rect x="2" y="2" width="12" height="12" rx="3.4" />
                  <circle cx="8" cy="8" r="2.8" />
                  <circle cx="11.6" cy="4.4" r="0.6" fill="currentColor" stroke="none" />
                </svg>
              </Social>
              <Social label="WhatsApp" href="#">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 1.3a6.7 6.7 0 0 0-5.7 10.2L1.3 14.7l3.3-1A6.7 6.7 0 1 0 8 1.3zm3.4 9.4c-.1.4-.8.8-1.1.8-.3 0-.6.1-2-.4-1.7-.7-2.8-2.4-2.9-2.5-.1-.1-.7-.9-.7-1.7s.4-1.2.6-1.4c.1-.2.3-.2.4-.2h.3c.1 0 .2 0 .3.3l.5 1.2c.1.1.1.2 0 .3l-.2.3-.2.2c-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.3.1.4 0l.5-.6c.1-.2.2-.1.4-.1l1.2.6c.2.1.3.1.3.2 0 .2 0 .6-.1.9z" />
                </svg>
              </Social>
            </div>
          </div>
          <a
            data-ft-reveal
            href="#villas"
            className="mer-ft-link text-[12px] uppercase tracking-[0.12em]"
            style={MONO}
          >
            {t('selectVillas')}
          </a>
        </div>

        <div
          className="mt-10 flex flex-col gap-3 border-t pt-5 text-[11px] uppercase tracking-[0.1em] md:flex-row md:items-center md:justify-between"
          style={{ ...MONO, borderColor: 'rgba(223,216,207,0.16)', color: 'rgba(223,216,207,0.55)' }}
        >
          <span>
            © {wordmark} — {new Date().getFullYear()} {t('rights')}
          </span>
          <span className="flex gap-5">
            <a href="#privacy" className="mer-ft-link">
              {t('privacy')}
            </a>
            <a href="#terms" className="mer-ft-link">
              {t('terms')}
            </a>
          </span>
          <span>
            {t('madeBy')}{' '}
            <a href={studioHref} className="mer-ft-link" style={{ color: SAND }}>
              {studio}
            </a>
          </span>
        </div>
      </div>

      <style>{`
        .mer-ft-link { position: relative; display: inline-block; transition: opacity 0.4s ease; }
        .mer-ft-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: currentColor; transform: scaleX(0); transform-origin: right; transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-ft-link:hover::after { transform: scaleX(1); transform-origin: left; }

        .mer-ft-btn { background: ${SAND}; color: ${INK}; transition: color 0.4s ease; }
        .mer-ft-btn-fill { background: ${INK}; transform: translateY(101%); transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-ft-btn:hover .mer-ft-btn-fill { transform: translateY(0); }
        .mer-ft-btn:hover { color: ${SAND}; box-shadow: inset 0 0 0 1px ${SAND}; }

        .mer-ft-social { color: ${SAND}; border: 1px solid rgba(223, 216, 207, 0.28); transition: color 0.4s ease, border-color 0.4s ease; }
        .mer-ft-social-fill { background: ${SAND}; clip-path: circle(0% at 50% 50%); transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-ft-social:hover { color: ${INK}; border-color: ${SAND}; }
        .mer-ft-social:hover .mer-ft-social-fill { clip-path: circle(75% at 50% 50%); }
      `}</style>
    </footer>
  )
}

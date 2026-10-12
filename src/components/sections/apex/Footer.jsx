import { useId, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'

/**
 * APEX — Footer (full height)
 *
 * One screen: the brand and a few plain lines at the top, the menu and a
 * newsletter field on the right, contact blocks at the bottom right and the
 * wordmark set huge on the bottom left. The newsletter works: without an
 * `endpoint` it runs in demo mode (simulated success); with one it POSTs
 * `{ formType: 'newsletter', email }` as JSON, like the contact form.
 */

const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const DEFAULT_LINKS = [
  { label: 'Link 1', href: '#models' },
  { label: 'Link 2', href: '#atelier' },
  { label: 'Link 3', href: '#statement' },
  { label: 'Link 4', href: '#contact' },
]
const DEFAULT_BLOCKS = [
  { heading: 'Label 1', lines: '+00 000 000 000\nhello@yourbrand.com\nOpening hours' },
  { heading: 'Label 2', lines: 'Address line\nCity 0000\nemail@yourbrand.com' },
  { heading: 'Label 3', lines: 'Address line\nCity 0000\nemail@yourbrand.com' },
]

export default function Footer({
  brand = 'Brand name',
  descriptor = 'Tagline\nCity, Country\n© 2026 Brand name. All rights reserved.',
  links = DEFAULT_LINKS,
  emailPlaceholder = 'Enter your email',
  signupLabel = 'Sign up',
  sendingLabel = 'Sending…',
  successMessage = 'Thank you. You are on the list.',
  errorMessage = 'Something went wrong. Please try again.',
  emailError = 'Enter a valid email',
  endpoint = '',
  blocks = DEFAULT_BLOCKS,
  social = '@yourbrand',
  socialHref = '#',
  privacyLabel = 'Privacy',
  privacyHref = '#',
  termsLabel = 'Terms',
  termsHref = '#',
  wordmark = 'APEX',
  showWordmark = 'on',
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const uid = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error | invalid
  const reduced = typeof window !== 'undefined' && prefersReducedMotion()

  const navLinks = Array.isArray(links) && links.length ? links : DEFAULT_LINKS
  const infoBlocks = Array.isArray(blocks) && blocks.length ? blocks : DEFAULT_BLOCKS
  const lines = (t) => String(t || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root || reduced) return undefined
      gsap.fromTo(
        '[data-apex-rise]',
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: root, start: 'top 70%', once: true } },
      )
      gsap.fromTo(
        '[data-apex-wordmark]',
        { yPercent: 40, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: root, start: 'top 55%', once: true } },
      )
      return undefined
    },
    { scope: rootRef, dependencies: [reduced] },
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    if (e.currentTarget.elements.website_hp?.value) return
    if (!EMAIL_RE.test(email.trim())) {
      setStatus('invalid')
      return
    }
    setStatus('sending')
    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formType: 'newsletter', email: email.trim() }),
        })
        if (!res.ok) throw new Error(String(res.status))
      } else {
        await new Promise((r) => setTimeout(r, 600))
      }
      setStatus('sent')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  const vars = { '--ft-bg': bg || '#04070d', '--ft-fg': fg || '#e8edf6', '--ft-accent': accent || '#9cc3ff' }
  const note =
    status === 'sent' ? successMessage : status === 'error' ? errorMessage : status === 'invalid' ? emailError : ''

  return (
    <footer
      ref={rootRef}
      id="contact"
      className="apex-footer relative isolate flex min-h-svh flex-col justify-between overflow-hidden px-[5vw] pt-[max(1.1rem,2.4svh)] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-[2.4vw]"
      style={{ ...vars, background: 'var(--ft-bg)', color: 'var(--ft-fg)' }}
    >
      <span aria-hidden="true" className="absolute inset-x-[5vw] top-0 h-px bg-current opacity-20 md:inset-x-[2.4vw]" />

      {/* Top: brand, the plain lines, the menu and the newsletter. */}
      <div className="grid gap-y-8 pt-3 text-[11px] tracking-[0.16em] uppercase md:grid-cols-12 md:gap-x-[1.6vw] lg:text-[max(11px,0.6vw)]" style={LABEL}>
        <p data-apex-rise className="font-bold md:col-span-3">
          {brand}
        </p>
        <p data-apex-rise className="whitespace-pre-line leading-[1.55] opacity-70 md:col-span-4 md:col-start-5">
          {lines(descriptor).join('\n')}
        </p>
        <div className="md:col-span-3 md:col-start-10">
          <ul data-apex-rise className="flex flex-col gap-1.5">
            {navLinks.map((l, i) => (
              <li key={`${l.label}-${i}`}>
                <a href={l.href} className="tpl-link tpl-hit relative inline-block py-0.5">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <form data-apex-rise onSubmit={onSubmit} noValidate className="mt-7">
            <label htmlFor={`${uid}-email`} className="sr-only">
              {emailPlaceholder}
            </label>
            <div className="apex-ft-field flex items-center gap-3 border-b border-current/30 pb-2 focus-within:border-current">
              <input
                id={`${uid}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                placeholder={emailPlaceholder}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status !== 'idle') setStatus('idle')
                }}
                aria-invalid={status === 'invalid' || undefined}
                className="min-w-0 flex-1 bg-transparent py-1 text-[11px] tracking-[0.16em] uppercase outline-none placeholder:text-current/40 lg:text-[max(11px,0.6vw)]"
              />
              <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <button type="submit" disabled={status === 'sending'} className="tpl-link tpl-hit relative shrink-0 uppercase disabled:opacity-40">
                {status === 'sending' ? sendingLabel : signupLabel}
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 min-h-[1.2em] text-[11px] tracking-[0.12em] opacity-70 normal-case lg:text-[max(11px,0.6vw)]">
              {note}
            </p>
          </form>
        </div>
      </div>

      {/* Bottom: the wordmark and the contact blocks. */}
      <div className="mt-12 grid items-end gap-y-10 md:mt-0 md:grid-cols-12 md:gap-x-[1.6vw]">
        {showWordmark !== 'off' ? (
          // The size is a share of the column itself (container query units), so the word
          // can never run into the contact blocks whatever the screen is.
          <div className="order-2 min-w-0 [container-type:inline-size] md:order-1 md:col-span-8">
            <p
              data-apex-wordmark
              aria-hidden="true"
              className="text-[27cqw] leading-[0.8] font-extrabold tracking-[-0.045em] whitespace-nowrap"
              style={{ ...LABEL, fontWeight: 800, fontVariationSettings: "'wdth' 125", fontStretch: '125%' }}
            >
              {wordmark}
            </p>
          </div>
        ) : (
          <span className="order-2 md:order-1 md:col-span-8" />
        )}
        <div className="order-1 flex flex-col gap-7 text-[11px] leading-[1.55] tracking-[0.12em] uppercase md:order-2 md:col-span-3 md:col-start-10 lg:text-[max(11px,0.6vw)]" style={LABEL}>
          {infoBlocks.map((b, i) => (
            <div key={`${b.heading}-${i}`} data-apex-rise>
              <p className="mb-2 opacity-50">{b.heading}</p>
              {lines(b.lines).map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-end justify-between gap-6 text-[11px] tracking-[0.16em] uppercase md:grid md:grid-cols-12 md:gap-x-[1.6vw] lg:text-[max(11px,0.6vw)]" style={LABEL}>
        <a href={socialHref} className="tpl-link tpl-hit relative md:col-span-3">
          {social}
        </a>
        <div className="flex items-end gap-6 md:col-span-6 md:col-start-5 md:gap-[2.4vw]">
          <a href={privacyHref} className="tpl-link tpl-hit relative">
            {privacyLabel}
          </a>
          <a href={termsHref} className="tpl-link tpl-hit relative">
            {termsLabel}
          </a>
        </div>
      </div>
    </footer>
  )
}

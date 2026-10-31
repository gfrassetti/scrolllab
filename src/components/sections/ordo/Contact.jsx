import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import { contactHref, externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'
import { LABEL, SITE } from './brand'
import { LOGO_PARTS, LOGO_VIEWBOX as VB } from './logoPaths'
import { VECTOR_BRAND } from './Logo'
import { useReveal } from './reveal'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Contact — the closing of the page, in two parts on the same sheet:
 *
 *   the call   a huge sentence over the rust slab, one line under it and a button with crop marks on its corners.
 *   the footer a tall frame ruled like a drawing: the tagline and four link columns, a newsletter field, three blocks
 *              of details (address, new projects, general), a registration mark, the studio's name set huge as an
 *              outline with its construction lines (it is drawn when it comes into view), the time in Lisbon and the
 *              legal line.
 *
 * Email and phone lines are real links (mailto: / tel:); a link column takes one «Label | link» per line (an http link
 * opens in another tab); Privacy and Terms open their text in a panel over the page (LegalSheet) while they point at a
 * hash, or go to the buyer's own page once they point at one. The newsletter validates and shows its states; without an
 * `endpoint` it runs in demo mode (a simulated success), with one it POSTs `{ formType: 'newsletter', email }`.
 * Every text, link and colour is a prop; the defaults are the demo copy.
 */

const EMAIL = 'hello@ordo.studio'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const COLUMNS = [
  { heading: 'Studio', lines: 'Projects | #projects\nStudio | #studio\nProcess | #process\nServices | #services\nContact | #contact' },
  { heading: 'Work', lines: 'Linho | #projects\nCasa Muralha | #projects\nMaré | #projects' },
  { heading: 'Services', lines: 'Architecture | #services\nInterior design | #services\nCreative direction | #services\nFurniture & joinery | #services' },
  { heading: 'Social', lines: 'Instagram | https://www.instagram.com/\nLinkedIn | https://www.linkedin.com/\nBehance | https://www.behance.net/' },
]

const BLOCKS = [
  { heading: 'Studio', lines: 'Rua do Poço 14\n1200-345 Lisbon, Portugal\nMon–Fri, 9:30–18:30', href: '' },
  { heading: 'New projects', lines: EMAIL, href: '' },
  { heading: 'General', lines: '+351 21 555 0142\npress@ordo.studio', href: '' },
]

const PRIVACY = `Last updated: 1 March 2026

ORDO Arquitectura Lda., Rua do Poço 14, 1200-345 Lisbon, is responsible for the personal data you share on this site.

We keep what you send us: your name and email, and whatever you write in a message or sign up with for the letter. We use it to answer you, to plan the first conversation about your project and to send the letter you asked for. Nothing else.

We do not sell your data or share it with advertisers. Our email and hosting providers process it on our behalf, inside the European Union.

You can ask to see, correct or delete your data at any time at privacy@ordo.studio. Every letter has a one-click unsubscribe.`

const TERMS = `Last updated: 1 March 2026

This site is run by ORDO Arquitectura Lda. The projects shown are real commissions of the studio; areas and dates are given for information.

Sending a message does not create a commission: a project starts with a written proposal that both sides sign.

The text, drawings and photographs on this site belong to ORDO Arquitectura Lda. and may not be reused without written permission.`

const lines = (t) =>
  String(t ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

/** A link of a column may point at a section, a path of the buyer's own, an https address, a mail or a phone. */
const HREF_OK = /^(?:#[\w-]*|\/[^\s"'<>]*|https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[\d\s()-]{3,})$/i

/** `Label | #section` per line → [{ label, href }]. A line without a valid link stays plain text. */
function parseLinks(text) {
  return lines(text).map((line) => {
    const [label, href = ''] = line.split('|').map((p) => p.trim())
    return { label: label || line, href: HREF_OK.test(href) ? href : '' }
  })
}

/** The studio's name set huge as an outline, with the construction lines of a drawing around it. */
function Wordmark({ word, note, calm }) {
  const ref = useRef(null)
  const vector = word === VECTOR_BRAND

  // It is drawn once, when it comes into view: the outlines trace themselves and the lines stretch out.
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || calm) return undefined
    const ctx = gsap.context(() => {
      const strokes = root.querySelectorAll('[data-wm-stroke]')
      const rules = root.querySelectorAll('[data-wm-rule]')
      const marks = root.querySelectorAll('[data-wm-mark]')
      gsap.set(strokes, { strokeDashoffset: 1 })
      gsap.set(rules, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(marks, { autoAlpha: 0 })
      if (!vector) gsap.set(root.querySelector('[data-wm-text]'), { autoAlpha: 0, y: 30 })
      gsap
        .timeline({ scrollTrigger: { trigger: root, start: 'top 88%', once: true } })
        .to(rules, { scaleX: 1, duration: 1.1, ease: 'expo.inOut', stagger: 0.08 }, 0)
        .to(strokes, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', stagger: 0.14 }, 0.15)
        .to(marks, { autoAlpha: 1, duration: 0.6, stagger: 0.05 }, 1.6)
        .to(vector ? [] : root.querySelector('[data-wm-text]'), { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out' }, 0.2)
    }, root)
    return () => ctx.revert()
  }, [vector, word, calm])

  const letters = LOGO_PARTS.filter((p) => p.id !== 'slab')
  const slab = LOGO_PARTS.find((p) => p.id === 'slab')
  // Centres of the two O's (their bowls), for the centre lines.
  const cx = (id) => {
    const nums = (letters.find((p) => p.id === id)?.fill.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
    const xs = nums.filter((_, i) => i % 2 === 0)
    return (Math.min(...xs) + Math.max(...xs)) / 2
  }
  const pad = 70
  return (
    <figure ref={ref} className="od-ft__word">
      {vector ? (
        <svg
          className="od-ft__svg"
          viewBox={`${VB.x - pad} ${VB.y - 40} ${VB.w + pad * 2} ${VB.h + 140}`}
          role="img"
          aria-label={word}
          fill="none"
        >
          {/* The construction lines: baseline, cap line and the dimension line under the word. */}
          <g style={{ stroke: 'var(--od-faint)' }} strokeWidth="1" vectorEffect="non-scaling-stroke">
            <line data-wm-rule x1={VB.x - pad} x2={VB.x + VB.w + pad} y1="0" y2="0" vectorEffect="non-scaling-stroke" />
            <line data-wm-rule x1={VB.x - pad} x2={VB.x + VB.w + pad} y1="-700" y2="-700" vectorEffect="non-scaling-stroke" />
            {['O1', 'O2'].map((id) => (
              <line key={id} data-wm-mark x1={cx(id)} x2={cx(id)} y1="-760" y2="50" vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          <g data-wm-mark style={{ stroke: 'var(--od-rust)' }} strokeWidth="1" vectorEffect="non-scaling-stroke">
            <line x1={VB.x} x2={VB.x + VB.w} y1="95" y2="95" vectorEffect="non-scaling-stroke" />
            <line x1={VB.x} x2={VB.x} y1="80" y2="110" vectorEffect="non-scaling-stroke" />
            <line x1={VB.x + VB.w} x2={VB.x + VB.w} y1="80" y2="110" vectorEffect="non-scaling-stroke" />
          </g>
          {/* The letters, as outlines. */}
          {letters.map((part) => (
            <g key={part.id}>
              {part.contours.map((d, i) => (
                <path
                  key={i}
                  data-wm-stroke
                  d={d}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset="0"
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke"
                  style={{ stroke: 'var(--od-ink)' }}
                />
              ))}
            </g>
          ))}
          {slab && (
            <path
              data-wm-stroke
              d={slab.contours[0]}
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="0"
              strokeLinejoin="round"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: 'var(--od-rust)' }}
            />
          )}
          {/* Registration crosses at the centres of the O's. */}
          {['O1', 'O2'].map((id) => (
            <g key={id} data-wm-mark style={{ stroke: 'var(--od-rust)' }} strokeWidth="1" vectorEffect="non-scaling-stroke">
              <line x1={cx(id) - 22} x2={cx(id) + 22} y1="-350" y2="-350" vectorEffect="non-scaling-stroke" />
              <line x1={cx(id)} x2={cx(id)} y1="-372" y2="-328" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </svg>
      ) : (
        <>
          <span data-wm-rule className="od-ft__rule" aria-hidden="true" />
          <span data-wm-text className="od-ft__text" aria-label={word} role="img">
            {word}
          </span>
        </>
      )}
      {note && (
        <figcaption className="od-ft__note" style={LABEL}>
          {note}
        </figcaption>
      )}
    </figure>
  )
}

/** The studio's local time, a minute at a time (it needs the browser: before it mounts only the coordinates show). */
function useClock(timeZone, on) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!on) return undefined
    const tick = () => {
      try {
        setText(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timeZone || undefined }).format(new Date()))
      } catch {
        setText('')
      }
    }
    tick()
    const id = window.setInterval(tick, 30000)
    return () => window.clearInterval(id)
  }, [timeZone, on])
  return text
}

export default function Contact({
  title = 'Contact',
  label = 'Lisbon',
  tag = 'New project',
  big = "Let's draw it together.",
  sub = 'Tell us about the place, the budget and the date. We answer within two working days.',
  email = EMAIL,
  ctaLabel = 'Start a project',
  ctaHref,
  mailTip = 'Write to us',
  tagline = 'Architecture & interiors for the people who live in them.',
  columns,
  newsletterTitle = 'Notes from the studio',
  newsletterText = 'One short letter a season: a project, a material, a drawing. Nothing else.',
  emailPlaceholder = 'Your email',
  signupLabel = 'Subscribe',
  sendingLabel = 'Sending…',
  successMessage = 'Thank you. The next letter is yours.',
  errorMessage = 'That did not go through. Please try again.',
  emailError = 'That email does not look complete',
  endpoint = '',
  blocks,
  wordmark = SITE.name,
  wordmarkNote = 'Fig. 01 — The studio, elevation 1:20',
  timeZone = 'Europe/Lisbon',
  clockLabel = 'Lisbon',
  coords = '38.7223° N, 9.1393° W',
  copyright = '© 2026 ORDO Arquitectura Lda.',
  backLabel = 'Back to top',
  backHref = '#home',
  privacyLabel = 'Privacy',
  privacyHref = '#privacy',
  privacyText = PRIVACY,
  termsLabel = 'Terms',
  termsHref = '#terms',
  termsText = TERMS,
  legalCloseLabel = 'Close',
  showSlab = 'on',
  showMarks = 'on',
  showNewsletter = 'on',
  showMark = 'on',
  showWordmark = 'on',
  showClock = 'on',
  bg,
  fg,
  accent,
  calm,
}) {
  const ref = useRef(null)
  useReveal(ref, calm)
  const uid = useId()
  const [mail, setMail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error | invalid
  const time = useClock(timeZone, showClock !== 'off')
  const columnRows = rows(columns, COLUMNS)
  const blockRows = rows(blocks, BLOCKS)
  const legal = [
    { label: privacyLabel, href: privacyHref, title: privacyLabel, body: privacyText },
    { label: termsLabel, href: termsHref, title: termsLabel, body: termsText },
  ]
  const startHref = ctaHref || `${contactHref(email) || email}${EMAIL_RE.test(String(email).trim()) ? '?subject=New%20project' : ''}`

  const toTop = (e) => {
    e.preventDefault()
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { duration: 1.6 })
    else window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (e.currentTarget.elements.website_hp?.value) return
    if (!EMAIL_RE.test(mail.trim())) {
      setStatus('invalid')
      return
    }
    setStatus('sending')
    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formType: 'newsletter', email: mail.trim() }),
        })
        if (!res.ok) throw new Error(String(res.status))
      } else {
        await new Promise((r) => setTimeout(r, 600))
      }
      setStatus('sent')
      setMail('')
    } catch {
      setStatus('error')
    }
  }
  const note = status === 'sent' ? successMessage : status === 'error' ? errorMessage : status === 'invalid' ? emailError : status === 'sending' ? sendingLabel : ''

  return (
    <section ref={ref} id="contact" data-od-section aria-labelledby="contact-title" className="od-root od-sec od-contact" style={sectionVars({ bg, fg, accent })}>
      <header className="od-sec__head">
        <h2 id="contact-title" className="od-sec__title">
          {title}
        </h2>
        <span className="od-sec__label" style={LABEL}>
          {label}
        </span>
      </header>

      {/* The call. */}
      <div className="od-contact__main" data-group>
        {showMarks !== 'off' && (
          <span className="od-crop od-contact__tag" style={LABEL} data-up>
            {tag}
          </span>
        )}
        {showSlab !== 'off' && <span className="od-contact__slab" data-up aria-hidden="true" />}
        <p data-sweep className="od-paint od-contact__big">
          {big}
        </p>
        <p data-up className="od-contact__sub">
          {sub}
        </p>
        <a
          data-up
          href={startHref}
          {...externalProps(startHref)}
          className={`od-btn${showMarks === 'off' ? ' od-btn--plain' : ' od-crop'} tpl-hit relative`}
          style={LABEL}
          data-cursor={mailTip}
        >
          <span>{ctaLabel}</span>
          <span aria-hidden="true">→</span>
        </a>
        {String(email ?? '').trim() && (
          <p data-up className="od-contact__alt">
            {contactHref(email) ? (
              <a href={contactHref(email)} className="od-contact__link od-ft__a" data-cursor={mailTip}>
                {email}
              </a>
            ) : (
              email
            )}
          </p>
        )}
      </div>

      {/* The footer: a tall frame ruled like a drawing. */}
      <footer className="od-ft">
        <div className="od-ft__top" data-group>
          <div className="od-ft__lead" data-up>
            <p className="od-ft__tagline">{tagline}</p>
            {showMark !== 'off' && (
              <svg className="od-ft__reg" viewBox="0 0 120 120" aria-hidden="true" fill="none">
                <g style={{ stroke: 'var(--od-ink)' }} strokeWidth="1" vectorEffect="non-scaling-stroke">
                  <circle cx="60" cy="60" r="44" vectorEffect="non-scaling-stroke" />
                  <circle cx="60" cy="60" r="24" vectorEffect="non-scaling-stroke" />
                  <line x1="4" x2="116" y1="60" y2="60" vectorEffect="non-scaling-stroke" />
                  <line x1="60" x2="60" y1="4" y2="116" vectorEffect="non-scaling-stroke" />
                </g>
                <circle cx="60" cy="60" r="3" style={{ fill: 'var(--od-rust)' }} />
              </svg>
            )}
          </div>
          <nav className="od-ft__cols" aria-label={title}>
            {columnRows.map((c, i) => (
              <div key={i} className="od-ft__col" data-up>
                <h3 className="od-ft__h" style={LABEL}>
                  {c.heading}
                </h3>
                <ul className="od-ft__list">
                  {parseLinks(c.lines).map((l, j) => (
                    <li key={j}>
                      {l.href ? (
                        <a href={l.href} {...externalProps(l.href)} className="od-contact__link od-ft__a">
                          {l.label}
                        </a>
                      ) : (
                        l.label
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="od-ft__mid" data-group>
          {showNewsletter !== 'off' && (
            <form className="od-ft__news" onSubmit={onSubmit} noValidate data-up>
              <h3 className="od-ft__h" style={LABEL}>
                {newsletterTitle}
              </h3>
              <p className="od-ft__newstext">{newsletterText}</p>
              <label htmlFor={`${uid}-mail`} className="sr-only">
                {emailPlaceholder}
              </label>
              <div className="od-ft__field">
                <input
                  id={`${uid}-mail`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={mail}
                  onChange={(e) => {
                    setMail(e.target.value)
                    if (status !== 'idle') setStatus('idle')
                  }}
                  placeholder={emailPlaceholder}
                  aria-invalid={status === 'invalid'}
                  aria-describedby={`${uid}-note`}
                />
                <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="od-ft__hp" />
                <button type="submit" disabled={status === 'sending'} aria-label={signupLabel} className="tpl-hit relative">
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <p id={`${uid}-note`} className="od-ft__status" role="status" aria-live="polite" style={LABEL}>
                {note}
              </p>
            </form>
          )}
          <div className="od-ft__blocks">
            {blockRows.map((b, i) => (
              <div key={i} className="od-contact__block od-ft__block" data-up>
                <h3 className="od-contact__bh" style={LABEL}>
                  {b.heading}
                </h3>
                <p className="od-contact__bp">
                  {lines(b.lines).map((line, j) => {
                    const href = b.href || contactHref(line)
                    return (
                      <span key={j} className="block">
                        {href ? (
                          <a href={href} {...externalProps(href)} className="od-contact__link od-ft__a">
                            {line}
                          </a>
                        ) : (
                          line
                        )}
                      </span>
                    )
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {showWordmark !== 'off' && <Wordmark word={wordmark} note={wordmarkNote} calm={calm} />}

        <div className="od-contact__legal" style={LABEL}>
          <span>{copyright}</span>
          {showClock !== 'off' && (
            <span className="od-ft__clock" aria-label={clockLabel}>
              {clockLabel}
              {time && ` ${time}`} · {coords}
            </span>
          )}
          <span className="od-contact__legalnav">
            {legal.map((l) => (
              <a key={l.href} href={l.href} {...externalProps(l.href)} className="od-contact__link tpl-hit relative">
                {l.label}
              </a>
            ))}
            <a href={backHref} onClick={backHref === '#home' ? toTop : undefined} {...externalProps(backHref)} className="od-contact__link tpl-hit relative">
              {backLabel} <span aria-hidden="true">↑</span>
            </a>
          </span>
        </div>
      </footer>
      <LegalSheet docs={legalDocs(legal)} closeLabel={legalCloseLabel} />
    </section>
  )
}

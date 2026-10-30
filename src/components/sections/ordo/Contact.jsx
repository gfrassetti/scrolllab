import { useRef } from 'react'
import { getLenis } from '../../../hooks/useLenis'
import { contactHref, externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'
import { LABEL, SITE } from './brand'
import { useReveal } from './reveal'
import { rows, sectionVars } from './vars'
import './ordo.css'

/**
 * Contact — the closing sheet: one large sentence, the email as the way in, plain blocks of details and the legal
 * line. Email and phone lines are real links (mailto: / tel:), a block with a link (`href`) sends every line there
 * (an http link opens in another tab), and Privacy and Terms open their text in a panel over the page (LegalSheet)
 * while they point at a hash, or go to the buyer's own page once they point at one.
 * Every text, link and colour is a prop; the defaults are the demo copy.
 */

const EMAIL = 'hello@ordo.studio'
const BLOCKS = [
  { heading: 'Studio', lines: 'Rua do Poço 14\n1200-345 Lisbon, Portugal\nMon–Fri, 9:30–18:30', href: '' },
  { heading: 'Call', lines: '+351 21 555 0142', href: '' },
  { heading: 'Follow', lines: SITE.instagram.handle, href: SITE.instagram.href },
]

const PRIVACY = `Last updated: 1 March 2026

ORDO Arquitectura Lda., Rua do Poço 14, 1200-345 Lisbon, is responsible for the personal data you share on this site.

We keep what you send us: your name and email, and whatever you write in a message. We use it to answer you and to plan the first conversation about your project. Nothing else.

We do not sell your data or share it with advertisers. Our email and hosting providers process it on our behalf, inside the European Union.

You can ask to see, correct or delete your data at any time at privacy@ordo.studio.`

const TERMS = `Last updated: 1 March 2026

This site is run by ORDO Arquitectura Lda. The projects shown are real commissions of the studio; areas and dates are given for information.

Sending a message does not create a commission: a project starts with a written proposal that both sides sign.

The text, drawings and photographs on this site belong to ORDO Arquitectura Lda. and may not be reused without written permission.`

const lines = (t) =>
  String(t ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

export default function Contact({
  title = 'Contact',
  label = 'Lisbon',
  big = "Let's draw it together.",
  sub = 'Tell us about the place, the budget and the date. We answer within two working days.',
  email = EMAIL,
  mailTip = 'Write to us',
  blocks,
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
  bg,
  fg,
  accent,
  calm,
}) {
  const ref = useRef(null)
  useReveal(ref, calm)
  const blockRows = rows(blocks, BLOCKS)
  const legal = [
    { label: privacyLabel, href: privacyHref, title: privacyLabel, body: privacyText },
    { label: termsLabel, href: termsHref, title: termsLabel, body: termsText },
  ]
  const toTop = (e) => {
    e.preventDefault()
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { duration: 1.6 })
    else window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  }
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

      <div className="od-contact__main" data-group>
        {showSlab !== 'off' && <span className="od-contact__slab" data-up aria-hidden="true" />}
        <p data-sweep className="od-paint od-contact__big">
          {big}
        </p>
        <p data-up className="od-contact__sub">
          {sub}
        </p>
        <a data-up href={contactHref(email) || email} className="od-contact__mail tpl-hit relative" data-cursor={mailTip}>
          <span className="od-contact__mailtext">{email}</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="od-contact__blocks" data-group>
        {blockRows.map((b, i) => (
          <div key={i} className="od-contact__block" data-up>
            <h3 className="od-contact__bh" style={LABEL}>
              {b.heading}
            </h3>
            <p className="od-contact__bp">
              {lines(b.lines).map((line, j) => {
                const href = b.href || contactHref(line)
                return (
                  <span key={j} className="block">
                    {href ? (
                      <a href={href} {...externalProps(href)} className="od-contact__link tpl-hit relative">
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

      <div className="od-contact__legal" style={LABEL}>
        <span>{copyright}</span>
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
      <LegalSheet docs={legalDocs(legal)} closeLabel={legalCloseLabel} />
    </section>
  )
}

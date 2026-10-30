import { useRef } from 'react'
import { getLenis } from '../../../hooks/useLenis'
import { contactHref, externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'
import { LABEL, SITE } from './brand'
import { useReveal } from './reveal'

/**
 * Contact — the closing sheet: one large sentence, the email as the way in, three plain blocks of details and the
 * legal line. Email and phone are real links (mailto: / tel:), Instagram opens in another tab, and Privacy and Terms
 * open their text in a panel over the page (LegalSheet) while they point at a hash.
 */

const EMAIL = 'hello@ordo.studio'
const BLOCKS = [
  ['Studio', 'Rua do Poço 14\n1200-345 Lisbon, Portugal\nMon–Fri, 9:30–18:30'],
  ['Call', '+351 21 555 0142'],
  ['Follow', SITE.instagram.handle],
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

const LEGAL = [
  { label: 'Privacy', href: '#privacy', title: 'Privacy', body: PRIVACY },
  { label: 'Terms', href: '#terms', title: 'Terms', body: TERMS },
]

export default function Contact({ calm }) {
  const ref = useRef(null)
  useReveal(ref, calm)
  const toTop = (e) => {
    e.preventDefault()
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { duration: 1.6 })
    else window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  }
  return (
    <section ref={ref} id="contact" aria-labelledby="contact-title" className="od-sec od-contact">
      <header className="od-sec__head">
        <h2 id="contact-title" className="od-sec__title">
          Contact
        </h2>
        <span className="od-sec__label" style={LABEL}>
          Lisbon
        </span>
      </header>

      <div className="od-contact__main" data-group>
        <span className="od-contact__slab" data-up aria-hidden="true" />
        <p data-sweep className="od-paint od-contact__big">
          Let&apos;s draw it together.
        </p>
        <p data-up className="od-contact__sub">
          Tell us about the place, the budget and the date. We answer within two working days.
        </p>
        <a data-up href={contactHref(EMAIL)} className="od-contact__mail" data-cursor="Write to us">
          <span className="od-contact__mailtext">{EMAIL}</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="od-contact__blocks" data-group>
        {BLOCKS.map(([heading, lines]) => (
          <div key={heading} className="od-contact__block" data-up>
            <h3 className="od-contact__bh" style={LABEL}>
              {heading}
            </h3>
            <p className="od-contact__bp">
              {lines.split('\n').map((line, i) => {
                const href = heading === 'Follow' ? SITE.instagram.href : contactHref(line)
                return (
                  <span key={i} className="block">
                    {href ? (
                      <a href={href} {...externalProps(href)} className="od-contact__link">
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
        <span>© 2026 ORDO Arquitectura Lda.</span>
        <span className="od-contact__legalnav">
          {LEGAL.map((l) => (
            <a key={l.href} href={l.href} className="od-contact__link">
              {l.label}
            </a>
          ))}
          <a href="#home" onClick={toTop} className="od-contact__link">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </span>
      </div>
      <LegalSheet docs={legalDocs(LEGAL)} closeLabel="Close" />
    </section>
  )
}

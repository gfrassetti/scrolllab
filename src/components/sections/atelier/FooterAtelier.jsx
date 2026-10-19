import { contactHref, externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'

const PRIVACY = `Last updated: 1 January 2026

Atelier Nove Ltd, 14 Foundry Lane, Bristol BS2 0AA, runs this site.

Privacy. We keep what you send us through the enquiry form (your name, your email and your message) only to answer you, and delete it after two years without contact. We do not use advertising trackers.

To see, correct or delete your data, write to studio@atelier-nove.co.uk.`

const TERMS = `Last updated: 1 January 2026

The drawings, photographs and texts on this site belong to Atelier Nove Ltd or to the photographers credited beside each project. Please ask before you reuse them.

Information on this site describes our work and is not an offer. Every commission is agreed in a written appointment before work starts.`

const defaultIndex = [
  { label: 'Projects', href: '#projects' },
  { label: 'Expertise', href: '#expertise' },
  { label: 'Studio', href: '#studio' },
  { label: 'Journal', href: '#journal' },
]
const defaultSocial = [
  { label: 'Instagram', href: 'https://www.instagram.com/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
]

/**
 * FooterAtelier — site index, legal and contact in quiet columns, and the
 * studio's name set to the width of the screen underneath. Privacy and Terms
 * open their text in a panel over the page (LegalSheet).
 */
export default function FooterAtelier({
  mark = 'ATELIER',
  blurb = 'Architecture and interiors for houses that belong to their place.',
  indexTitle = 'Site index',
  legalTitle = 'Legal',
  contactTitle = 'Contact',
  index = defaultIndex,
  privacyLabel = 'Privacy',
  privacyHref = '#privacy',
  privacyText = PRIVACY,
  termsLabel = 'Terms',
  termsHref = '#terms',
  termsText = TERMS,
  closeLabel = 'Close',
  email = 'studio@atelier-nove.co.uk',
  phone = '+44 117 555 0142',
  address = '14 Foundry Lane, Bristol BS2 0AA',
  social = defaultSocial,
  year = '© 2026 Atelier Nove',
  bg,
  fg,
}) {
  const links = Array.isArray(index) && index.length ? index : defaultIndex
  const networks = Array.isArray(social) ? social : defaultSocial
  const col = 'text-sm'
  const hit = 'tpl-link relative inline-flex min-h-11 min-w-11 items-center'
  const heading = 'mb-4 text-sm font-medium opacity-55'
  return (
    <footer
      data-tone="dark"
      className="overflow-clip px-5 pt-20 pb-5 md:px-8 md:pt-28 md:pb-6"
      style={{ backgroundColor: bg || '#111111', color: fg || '#ffffff' }}
    >
      <div className="mx-auto grid max-w-[1700px] gap-12 md:grid-cols-12">
        <p className="max-w-[20rem] text-xl leading-tight font-medium tracking-[-0.02em] md:col-span-4">{blurb}</p>
        <nav aria-label={indexTitle} className="md:col-span-2 md:col-start-6">
          <h2 className={heading}>{indexTitle}</h2>
          <ul className={col}>
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} className={hit}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-2">
          <h2 className={heading}>{legalTitle}</h2>
          <ul className={col}>
            <li>
              <a href={privacyHref} className={hit}>
                {privacyLabel}
              </a>
            </li>
            <li>
              <a href={termsHref} className={hit}>
                {termsLabel}
              </a>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h2 className={heading}>{contactTitle}</h2>
          <ul className={col}>
            {[email, phone].map((line) => (
              <li key={line}>
                {contactHref(line) ? (
                  <a href={contactHref(line)} className={hit}>
                    {line}
                  </a>
                ) : (
                  line
                )}
              </li>
            ))}
            <li className="py-2 opacity-70">{address}</li>
            {networks.map((s) => (
              <li key={s.label}>
                <a href={s.href} {...externalProps(s.href)} className={hit}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="mt-20 -ml-[0.05em] text-[clamp(4.5rem,23.5vw,26rem)] leading-[0.74] font-medium tracking-[-0.07em] whitespace-nowrap md:mt-28"
      >
        {mark}
      </p>
      <p className="mt-6 flex items-center justify-between border-t border-current/15 pt-4 text-xs opacity-60">
        <span>{year}</span>
        <a href="#top" className={hit}>
          ↑
        </a>
      </p>

      <LegalSheet
        docs={legalDocs([
          { href: privacyHref, title: privacyLabel, body: privacyText },
          { href: termsHref, title: termsLabel, body: termsText },
        ])}
        closeLabel={closeLabel}
        bg={fg || '#ffffff'}
        fg={bg || '#111111'}
      />
    </footer>
  )
}

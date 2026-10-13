import { contactHref, externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'

const LEGAL = `Last updated: 1 January 2026

Atrium Architekten AG, Seefeldstrasse 88, 8008 Zurich, runs this site.

Privacy. We keep what you send us through the enquiry form (your name, your email and your message) only to answer you, and delete it after two years without contact. We do not use advertising trackers.

Content. Drawings, photographs and texts on this site belong to Atrium Architekten AG or to the photographers credited in each project. Please ask before you reuse them.

To see, correct or delete your data, write to bureau@atrium-architects.ch.`

/**
 * FooterAtrium — the wordmark closes the page at screen width and is allowed
 * to run out of the frame; `overflow-hidden` does the cropping. The legal row
 * stays at note size underneath; its last link opens the legal text in a
 * panel over the page (LegalSheet).
 */
export default function FooterAtrium({
  mark = 'ATRIUM',
  reserved = 'All rights reserved',
  license = 'Atrium Architekten AG',
  design = 'Seefeldstrasse 88, 8008 Zurich',
  development = 'bureau@atrium-architects.ch',
  legal = 'Legal documents',
  legalHref = '#legal',
  legalText = LEGAL,
  legalCloseLabel = 'Close',
  year = '© 2026',
  bg,
  fg,
}) {
  return (
    <footer
      className="overflow-hidden bg-atrium-ink px-4 pt-[14svh] pb-5 text-atrium-paper md:px-8 md:pb-6"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <p className="-ml-[0.055em] font-grotesk text-[clamp(5.5rem,30vw,32rem)] leading-[0.74] font-medium tracking-[-0.07em] whitespace-nowrap uppercase lg:text-[clamp(5.5rem,31vw,32rem)]">
        {mark}
      </p>
      <div className="atrium-note mt-8 flex flex-col gap-2 border-t border-white/15 pt-4 tracking-[0.06em] text-atrium-paper/65 uppercase md:mt-10 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-2">
        <p>{reserved}</p>
        <p>{license}</p>
        <p>{design}</p>
        <p>
          {contactHref(development) ? (
            <a href={contactHref(development)} className="tpl-link relative">
              {development}
            </a>
          ) : (
            development
          )}
        </p>
        <p>
          <a href={legalHref} {...externalProps(legalHref)} className="tpl-link tpl-hit relative">
            {legal}
          </a>
        </p>
        <p>{year}</p>
      </div>

      <LegalSheet
        docs={legalDocs([{ href: legalHref, title: legal, body: legalText }])}
        closeLabel={legalCloseLabel}
        bg={fg || '#f2f0eb'}
        fg={bg || '#111111'}
      />
    </footer>
  )
}

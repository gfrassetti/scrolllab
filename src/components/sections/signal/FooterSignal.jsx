/**
 * FooterSignal — closing CTA, a secondary "open call" card (Dolsten's
 * "artist fund" block, ported as a generic collab invite), a social row,
 * and the oversized wordmark.
 */
const defaultSocial = [
  { label: 'Instagram', href: '#' },
  { label: 'LinkedIn', href: '#' },
]

export default function FooterSignal({
  line = 'Got a brand that needs to move?',
  cta = 'Start a project →',
  ctaHref = '#contact',
  brand = 'SIGNAL',
  legal = '©2026 Placeholder Studio',
  email = 'hello@placeholder.studio',
  cardTitle = 'Open call',
  cardBody = 'We set aside studio time each quarter for a self-directed idea — yours, not a client’s. Send a one-pager; if it moves us, we help you make it.',
  social = defaultSocial,
}) {
  return (
    <footer id="contact" className="bg-signal-ink px-5 pt-20 pb-10 text-signal-paper md:px-10 md:pt-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-xl font-grotesk text-[clamp(2rem,5vw,3.6rem)] leading-[1.05] font-medium tracking-[-0.03em]">
            {line}
          </h2>
          <div className="flex flex-col items-start gap-3 md:items-end md:text-right">
            <a
              href={ctaHref}
              className="text-[12px] tracking-[0.2em] uppercase underline decoration-signal-paper/35 underline-offset-4 hover:decoration-signal-paper"
            >
              {cta}
            </a>
            <a href={`mailto:${email}`} className="text-sm text-signal-paper/70 hover:text-signal-paper">
              {email}
            </a>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-10 border-t border-signal-paper/15 pt-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md border border-signal-paper/20 p-6">
            <h3 className="font-grotesk text-sm font-medium tracking-[-0.01em] uppercase">{cardTitle}</h3>
            <p className="mt-3 text-sm leading-relaxed text-signal-paper/60">{cardBody}</p>
          </div>

          <ul className="flex gap-6 text-[11px] tracking-[0.2em] text-signal-paper/50 uppercase">
            {social.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="hover:text-signal-paper">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p
          aria-hidden="true"
          className="mt-16 text-center font-grotesk text-[clamp(3.5rem,16vw,10rem)] leading-[0.85] font-medium tracking-[-0.04em] text-signal-paper/90 uppercase select-none md:mt-20"
        >
          {brand}
        </p>
        <p className="mt-6 text-center text-[11px] tracking-[0.18em] text-signal-paper/40 uppercase">
          {legal}
        </p>
      </div>
    </footer>
  )
}

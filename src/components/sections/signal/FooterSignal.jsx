/**
 * FooterSignal — closing CTA + oversized wordmark. Minimal on purpose while
 * SIGNAL is a single-scene WIP.
 */
export default function FooterSignal({
  line = "Got a brand that needs to move?",
  cta = 'Start a project →',
  ctaHref = '#contact',
  brand = 'SIGNAL',
  legal = '©2026 Placeholder Studio',
  email = 'hello@placeholder.studio',
}) {
  return (
    <footer id="contact" className="bg-signal-ink px-5 pt-20 pb-10 text-signal-paper md:px-10 md:pt-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
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

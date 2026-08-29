/**
 * FooterAtrium — giant wordmark closer on ink, legal row underneath.
 */
export default function FooterAtrium({
  mark = 'ATRIUM',
  reserved = 'All rights reserved',
  license = 'License Number AA-00-00000 BB-00-00000',
  design = 'Visual Design Placeholder',
  development = 'Development Placeholder',
  legal = 'Legal documents',
  year = '© 2026',
}) {
  return (
    <footer className="overflow-hidden bg-atrium-ink px-4 pt-8 pb-5 text-atrium-paper md:px-8 md:pt-10 md:pb-6">
      <p className="-ml-[0.06em] font-grotesk text-[clamp(6.4rem,38vw,34rem)] leading-[0.72] font-medium tracking-[-0.07em] uppercase">
        {mark}
      </p>
      <div className="mt-6 flex flex-col gap-2 border-t border-white/15 pt-4 text-[10px] tracking-[0.08em] text-atrium-paper/55 uppercase md:mt-8 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-2 md:text-[11px]">
        <p>{reserved}</p>
        <p>{license}</p>
        <p>{design}</p>
        <p>{development}</p>
        <p>{legal}</p>
        <p>{year}</p>
      </div>
    </footer>
  )
}

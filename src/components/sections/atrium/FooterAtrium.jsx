/**
 * FooterAtrium — the wordmark closes the page at screen width and is allowed
 * to run out of the frame; `overflow-hidden` does the cropping. The legal row
 * stays at note size underneath.
 */
export default function FooterAtrium({
  mark = 'ATRIUM',
  reserved = 'All rights reserved',
  license = 'License Number AA-00-00000 BB-00-00000',
  design = 'Visual Design Placeholder',
  development = 'Development Placeholder',
  legal = 'Legal documents',
  year = '© 2026',
  bg,
  fg,
}) {
  return (
    <footer
      className="overflow-hidden bg-atrium-ink px-4 pt-[14svh] pb-5 text-atrium-paper md:px-8 md:pb-6"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
      <p className="-ml-[0.055em] font-grotesk text-[clamp(5.5rem,31vw,32rem)] leading-[0.74] font-medium tracking-[-0.07em] whitespace-nowrap uppercase">
        {mark}
      </p>
      <div className="atrium-note mt-8 flex flex-col gap-2 border-t border-white/15 pt-4 tracking-[0.06em] text-atrium-paper/65 uppercase md:mt-10 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-2">
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

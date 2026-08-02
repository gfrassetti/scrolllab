/**
 * FooterComic — generic closing beat for the comic template.
 */
export default function FooterComic({
  line = 'Footer line 1 — replace with outro.',
  credit = 'COMIC · placeholder · source ZIP',
}) {
  return (
    <footer
      id="contact"
      className="border-t border-[#2a2622]/15 bg-[#2a2622] px-5 py-16 text-white md:px-10"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 text-[11px] tracking-[0.28em] text-comic-flare uppercase">
            Outro
          </p>
          <p className="max-w-xl font-brico text-[clamp(1.4rem,3vw,2.2rem)] leading-snug font-semibold tracking-[-0.02em]">
            {line}
          </p>
        </div>
        <p className="text-[11px] tracking-[0.18em] text-white/45 uppercase">
          {credit}
        </p>
      </div>
    </footer>
  )
}

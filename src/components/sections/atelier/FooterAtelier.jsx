export default function FooterAtelier({
  line = 'YOUR CLOSING LINE.',
  legal = '©2026 Placeholder Brand — Template, not a promise',
}) {
  return (
    <footer className="border-t border-white/10 bg-[#07080b] px-5 py-16 text-white md:px-10 md:py-20">
      <p className="max-w-[14ch] font-brico text-[clamp(2rem,6vw,4rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
        {line}
      </p>
      <p className="mt-6 max-w-[48ch] text-sm text-white/50">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] tracking-[0.2em] text-white/40 uppercase md:flex-row md:justify-between">
        <p>{legal}</p>
        <a href="#top" className="hover:text-white">
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}

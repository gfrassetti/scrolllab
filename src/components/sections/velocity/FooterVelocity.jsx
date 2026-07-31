export default function FooterVelocity({
  line = 'YOUR CLOSING LINE.',
  legal = '©2026 Placeholder Brand — Template, not a promise',
}) {
  return (
    <footer className="border-t border-[#ece9e2]/10 bg-[#07140e] px-5 py-16 text-[#ece9e2] md:px-10 md:py-20">
      <p className="max-w-[16ch] font-display text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.95] italic">
        {line}
      </p>
      <div className="mt-12 flex flex-col gap-3 border-t border-[#ece9e2]/10 pt-6 text-[11px] tracking-[0.2em] text-[#ece9e2]/50 uppercase md:flex-row md:items-baseline md:justify-between">
        <p>{legal}</p>
        <a href="#top" className="text-acid hover:opacity-80">
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}

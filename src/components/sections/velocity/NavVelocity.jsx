export default function NavVelocity({ brand = 'BRAND', cta = 'Your CTA' }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 md:px-10">
      <a
        href="#top"
        className="text-[11px] font-medium tracking-[0.28em] uppercase md:text-xs"
      >
        {brand}
      </a>
      <a
        href="#hall"
        className="border border-acid bg-acid px-4 py-2 text-[10px] font-medium tracking-[0.22em] text-[#0a1a12] uppercase transition-opacity hover:opacity-90"
      >
        {cta}
      </a>
    </header>
  )
}

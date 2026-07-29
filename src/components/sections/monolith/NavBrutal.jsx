/**
 * NavBrutal — solid blocky header with hard borders. No blending,
 * no transparency: brutalist honesty.
 */
export default function NavBrutal({
  brand = 'MONOLITH™',
  links = ['System', 'Units', 'Contact'],
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-carbon bg-concrete text-carbon">
      <nav className="flex items-stretch justify-between">
        <a
          href="#top"
          className="flex items-center border-r-2 border-carbon px-5 py-4 font-mono text-sm font-bold uppercase tracking-[0.1em]"
        >
          {brand}
        </a>

        <ul className="hidden items-stretch md:flex">
          {links.map((link) => (
            <li key={link} className="flex border-l-2 border-carbon">
              <a
                href="#"
                className="flex items-center px-6 font-mono text-xs uppercase tracking-[0.15em] transition-colors duration-200 hover:bg-carbon hover:text-concrete"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="border-l-2 border-carbon px-5 font-mono text-xs uppercase tracking-[0.15em] md:hidden"
        >
          Menu
        </button>
      </nav>
    </header>
  )
}

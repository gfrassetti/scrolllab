/**
 * NavNocturne — fixed header for the dark model. Brand left,
 * reel marker center (desktop), menu right.
 */
export default function NavNocturne({
  brand = 'NOCTURNE™',
  marker = 'Reel 02 — placeholder cut',
  links = ['Films', 'Index', 'Contact'],
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 text-salt">
      <nav className="flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <a href="#top" className="text-sm font-medium uppercase tracking-[0.25em]">
          {brand}
        </a>

        <p className="hidden text-[11px] uppercase tracking-[0.3em] text-salt/40 lg:block">
          {marker}
        </p>

        <ul className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <li key={link}>
              <a
                href="#"
                className="text-xs uppercase tracking-[0.25em] transition-colors duration-300 hover:text-acid"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="text-xs uppercase tracking-[0.25em] md:hidden"
        >
          Menu
        </button>
      </nav>
    </header>
  )
}

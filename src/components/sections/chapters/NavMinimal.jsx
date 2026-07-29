/**
 * NavMinimal — fixed header that inverts itself over any background
 * via mix-blend-difference. Drop it once at the top of the page.
 */
export default function NavMinimal({
  brand = 'CHAPTERS®',
  links = ['Story', 'Index', 'Contact'],
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 text-bone mix-blend-difference">
      <nav className="flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <a
          href="#top"
          className="text-sm font-medium uppercase tracking-[0.25em]"
        >
          {brand}
        </a>

        <ul className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <li key={link}>
              <a
                href="#"
                className="text-xs uppercase tracking-[0.25em] transition-opacity duration-300 hover:opacity-50"
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

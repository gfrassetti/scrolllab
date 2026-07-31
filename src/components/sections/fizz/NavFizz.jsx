/**
 * NavFizz — floating pill header for the pop world. Rounded, blurred,
 * with a candy CTA. Playful counterpart to the hard-edged models.
 */
export default function NavFizz({
  brand = 'BRAND*',
  links = ['Link one', 'Link two', 'Link three'],
  cta = 'Your CTA',
}) {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 md:top-6 md:px-8">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-foam/20 bg-grape/80 py-2 pr-2 pl-5 backdrop-blur-md md:pl-7">
        <a
          href="#top"
          className="font-brico text-lg font-extrabold tracking-tight text-foam"
        >
          {brand}
        </a>

        <ul className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <li key={link}>
              <a
                href="#"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foam/70 transition-colors duration-200 hover:text-fizz"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#"
          className="rounded-full bg-fizz px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-grape transition-transform duration-200 hover:scale-105"
        >
          {cta}
        </a>
      </nav>
    </header>
  )
}

import { WOOD } from './comicKit'

/**
 * FooterComic — the last strip of red wood: three links and the credit line.
 */
export default function FooterComic({
  links = ['Link 1', 'Link 2', 'Link 3'],
  credit = 'COMIC · placeholder · source ZIP',
}) {
  return (
    <footer id="contact" className="px-5 pt-4 pb-10 text-white md:px-10" style={WOOD}>
      <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {links.map((label) => (
          <a key={label} href="#top" className="tpl-link tpl-hit relative text-[13px] font-semibold underline-offset-4">
            {label}
          </a>
        ))}
      </nav>
      <p className="mt-6 text-center text-[11px] tracking-[0.18em] text-white/55 uppercase">{credit}</p>
    </footer>
  )
}

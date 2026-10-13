import { themeVars } from '../../../lib/themeVars'

export default function FooterVelocity({
  line = 'Ride harder. Come home.',
  legal = '©2026 Velocity Moto S.L. — Barcelona',
  backToTop = 'Back to top ↑',
  email = 'hello@velocitymoto.es',
  /** Ancla de la sección: el nav apunta acá. */
  id = 'contact',
  bg,
  fg,
  accent,
}) {
  return (
    <footer
      id={id}
      className="border-t border-salt/10 bg-[#07140e] px-5 py-16 text-salt md:px-10 md:py-20"
      style={{ backgroundColor: bg || undefined, ...themeVars({ salt: fg, acid: accent }) }}
    >
      <p className="max-w-[16ch] font-display text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.95] italic">
        {line}
      </p>
      {email ? (
        <a href={`mailto:${email}`} className="tpl-link tpl-hit relative mt-6 inline-block text-sm tracking-[0.12em] text-acid uppercase md:text-base">
          {email}
        </a>
      ) : null}
      <div className="mt-12 flex flex-col gap-3 border-t border-salt/10 pt-6 text-[11px] tracking-[0.2em] text-salt/50 uppercase md:flex-row md:items-baseline md:justify-between">
        <p>{legal}</p>
        <a href="#top" className="tpl-link tpl-hit relative self-start text-acid md:self-auto">
          {backToTop}
        </a>
      </div>
    </footer>
  )
}

import { C, DISPLAY, SITE } from './brand'

/** El pie: por ahora Instagram es el único canal que tenemos confirmado. */
export default function Contact() {
  return (
    <footer id="contacto" className="relative px-5 pt-[18vh] pb-8 sm:px-9 sm:pb-10" style={DISPLAY}>
      <p className="mb-10 flex items-center gap-4 text-[11px] font-medium tracking-[0.16em] uppercase sm:mb-14" style={{ color: C.mute }}>
        <span style={{ color: C.rust }}>02</span>
        <span className="block h-px w-10" style={{ background: C.hair }} />
        Contacto
      </p>
      <a
        href={SITE.instagram.href}
        target="_blank"
        rel="noreferrer"
        data-cursor="Abrir"
        className="block w-fit font-light"
        style={{ fontSize: 'clamp(2.4rem, 9vw, 9rem)', lineHeight: 0.95, letterSpacing: '-0.045em', color: C.ink }}
      >
        {SITE.instagram.handle}
      </a>
      <div className="mt-[14vh] flex flex-col gap-4 border-t pt-6 text-[11px] font-medium tracking-[0.16em] uppercase sm:flex-row sm:justify-between" style={{ borderColor: C.hair, color: C.mute }}>
        <span>{SITE.places.join(' · ')}</span>
        <span>© {new Date().getFullYear()} {SITE.name}</span>
      </div>
    </footer>
  )
}

import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY, HOURS, openStatus } from './brand'

/**
 * cāpsula33 — «Contacto»: el cierre, a pantalla completa.
 *
 * Naranja de la marca otra vez (como el loader: el sitio empieza y termina en
 * la cápsula). Dirección, horarios, cómo llegar y su Instagram; la marca, a todo
 * el ancho, abajo. Solo datos que el local ya publica.
 */

const MAPS = 'https://www.google.com/maps/search/?api=1&query=Gral.+Roca+1120,+San+Mart%C3%ADn+de+los+Andes'
const INSTAGRAM = 'https://www.instagram.com/capsulas33/'
const INK = '#0b0c0f'

const fmt = (h) => `${h}:00`

export default function ContactSection() {
  const rootRef = useRef(null)
  const [status] = useState(() => openStatus())
  const mon = HOURS.find((h) => h.day === 1)
  const tue = HOURS.find((h) => h.day === 2)

  useGSAP(
    () => {
      const root = rootRef.current
      gsap.fromTo(
        root.querySelectorAll('[data-line]'),
        { yPercent: 110 },
        { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: root, start: 'top 55%', once: true } },
      )
      gsap.fromTo(
        root.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.09, delay: 0.3, scrollTrigger: { trigger: root, start: 'top 55%', once: true } },
      )
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} id="contacto" className="relative flex min-h-svh flex-col justify-between overflow-hidden px-6 pt-28 pb-6 md:px-10 md:pb-8 lg:px-[5vw]" style={{ background: C.orange, color: INK }}>
      <div>
        <p data-in className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] uppercase opacity-0" style={MONO}>
          <span className="h-px w-8" style={{ background: INK }} />
          Contacto
        </p>
        <h2 className="mt-5 text-[clamp(2.4rem,7vw,7.4rem)] leading-[0.92] font-semibold uppercase" style={DISPLAY}>
          <span className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">
              Estamos en
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">
              Roca 1120.
            </span>
          </span>
        </h2>

        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <div data-in className="opacity-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60" style={MONO}>
              Dirección
            </p>
            <p className="mt-2 text-[18px] leading-[1.35] font-medium" style={BODY}>
              Av. Gral. Roca 1120
              <br />
              San Martín de los Andes
            </p>
          </div>
          <div data-in className="opacity-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60" style={MONO}>
              Horarios
            </p>
            <p className="mt-2 text-[18px] leading-[1.35] font-medium" style={BODY}>
              Martes a sábado, {fmt(tue.open)} a {fmt(tue.close)}
              <br />
              Lunes, {fmt(mon.open)} a {fmt(mon.close)}
              <br />
              Domingo, cerrado
            </p>
          </div>
          <div data-in className="opacity-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60" style={MONO}>
              Ahora
            </p>
            <p className="mt-2 flex items-center gap-2 text-[18px] leading-[1.35] font-medium" style={BODY}>
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: INK, opacity: status.open ? 1 : 0.35 }} />
              {status.label}
            </p>
          </div>
          <div data-in className="flex flex-wrap items-start gap-3 opacity-0 lg:justify-end">
            <a
              href={MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="c33-end-btn inline-flex h-12 items-center rounded-full px-6 text-[13px] font-semibold tracking-[0.18em] uppercase"
              style={{ ...DISPLAY, background: INK, color: C.cream }}
            >
              Cómo llegar
            </a>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="c33-end-btn inline-flex h-12 items-center rounded-full border-2 px-6 text-[13px] font-semibold tracking-[0.12em]"
              style={{ ...DISPLAY, borderColor: INK, color: INK }}
            >
              @capsulas33
            </a>
          </div>
        </div>
      </div>

      <footer className="mt-10">
        <p className="leading-[0.82] font-light whitespace-nowrap select-none" style={{ ...MONO, fontSize: 'min(17.6vw, 30svh)', letterSpacing: '-0.04em', paddingBottom: '0.2em' }} aria-label="cāpsula33">
          <span aria-hidden="true">
            cāpsula<span style={{ color: C.cream }}>33</span>
          </span>
        </p>
        <p className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase opacity-70" style={MONO}>
          <span>Café de especialidad · San Martín de los Andes</span>
          <span>Sitio de demostración · ScrollLab Estudio</span>
        </p>
      </footer>
      <style>{`
        .c33-end-btn { transition: transform 160ms ease-out, background-color 250ms, color 250ms; }
        .c33-end-btn:active { transform: scale(0.97); }
        @media (hover: hover) {
          .c33-end-btn:hover { background: ${C.cream} !important; color: ${INK} !important; border-color: ${C.cream} !important; }
        }
        .c33-end-btn:focus-visible { outline: 3px solid ${C.cream}; outline-offset: 3px; }
      `}</style>
    </section>
  )
}

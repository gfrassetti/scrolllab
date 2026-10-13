import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { sfx } from './sfx'
import { C, DISPLAY, MONO, BODY, HOURS, openStatus } from './brand'

/**
 * cāpsula33 — el cierre, después de salir del local: dónde queda, cuándo
 * abre y cómo llegar. Sin fotos: tipografía, datos y el HUD de siempre.
 */

const DAYS = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' }
const MAPS = 'https://www.google.com/maps/search/?api=1&query=Gral.+Roca+1120,+San+Mart%C3%ADn+de+los+Andes'

export default function Visit() {
  const rootRef = useRef(null)
  const [status] = useState(() => openStatus())

  useGSAP(
    () => {
      gsap.from('[data-visit-in]', {
        autoAlpha: 0,
        y: 24,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: rootRef.current, start: 'top 75%' },
      })
    },
    { scope: rootRef },
  )

  const btn = 'inline-flex h-11 items-center rounded-full px-6 text-[12px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase active:scale-[0.97]'

  return (
    <footer ref={rootRef} id="visita" className="relative px-6 pt-28 pb-10 md:px-12 md:pt-36" style={{ background: '#050506', color: C.cream }}>
      <div className="mx-auto grid max-w-[72rem] gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p data-visit-in className="text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            Fin del recorrido
          </p>
          <h2 data-visit-in className="mt-4 text-[clamp(2rem,4.2vw,3.4rem)] leading-[0.95] font-bold tracking-[-0.02em] uppercase" style={DISPLAY}>
            Te esperamos a bordo
          </h2>
          <p data-visit-in className="mt-5 max-w-[34ch] text-[15px] leading-[1.6]" style={{ ...BODY, color: 'rgba(242,233,220,0.75)' }}>
            Av. Gral. Roca 1120, San Martín de los Andes, Neuquén. A cuadras del lago Lácar.
          </p>
          <div data-visit-in className="mt-8 flex flex-wrap gap-3">
            <a
              href={MAPS}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => sfx.buttonHover()}
              onClick={() => sfx.select()}
              className={btn}
              style={{ ...DISPLAY, background: C.orange, color: '#070708' }}
            >
              Cómo llegar
            </a>
            <a
              href="https://www.instagram.com/capsulas33/"
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => sfx.buttonHover()}
              onClick={() => sfx.select()}
              className={`${btn} border transition-colors duration-300 hover:border-[#e4601d]`}
              style={{ ...DISPLAY, borderColor: 'rgba(242,233,220,0.3)' }}
            >
              @capsulas33
            </a>
          </div>
        </div>

        <div data-visit-in className="md:col-span-5 md:col-start-8">
          <p className="mb-5 flex items-center gap-2 text-[12px] tracking-[0.14em] uppercase" style={{ ...MONO, color: status.open ? '#7dffa8' : C.neon }}>
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor', boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }} />
            {status.label}
          </p>
          <ul className="border-t text-[14px] tracking-[0.06em] uppercase" style={{ ...MONO, borderColor: 'rgba(242,233,220,0.14)' }}>
            {HOURS.map((h) => (
              <li key={h.day} className="flex justify-between border-b py-3" style={{ borderColor: 'rgba(242,233,220,0.08)' }}>
                <span className="opacity-75">{DAYS[h.day]}</span>
                <span>
                  {h.open}:00 – {h.close}:00
                </span>
              </li>
            ))}
            <li className="flex justify-between py-3 opacity-45">
              <span>Domingo</span>
              <span>Cerrado</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-24 flex max-w-[72rem] flex-wrap items-end justify-between gap-4 border-t pt-6 text-[11px] tracking-[0.16em] uppercase" style={{ ...MONO, borderColor: 'rgba(242,233,220,0.1)', color: 'rgba(242,233,220,0.5)' }}>
        <span className="text-[22px] font-light tracking-normal normal-case" style={{ color: C.cream }}>
          cāpsula<span style={{ color: C.orange }}>33</span>
        </span>
        <span>40°09′S 71°21′O · Módulo SMA-01</span>
      </div>
    </footer>
  )
}

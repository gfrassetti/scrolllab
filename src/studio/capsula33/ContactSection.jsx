import { useRef } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY, HOURS, hourLabel } from './brand'
import { useLang, useStatus } from './i18nCore'

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

export default function ContactSection() {
  const rootRef = useRef(null)
  const wordRef = useRef(null)
  const { lang, t } = useLang()
  const status = useStatus()
  const fmt = (h) => hourLabel(lang, h)
  const mon = HOURS.find((h) => h.day === 1)
  const tue = HOURS.find((h) => h.day === 2)

  useGSAP(
    () => {
      const root = rootRef.current
      // La marca del cierre: las letras suben de a una mientras se llega al final de la página.
      gsap.fromTo(
        wordRef.current.querySelectorAll('[data-ch]'),
        { yPercent: 105, rotate: 6 },
        {
          yPercent: 0,
          rotate: 0,
          ease: 'none',
          stagger: 0.08,
          scrollTrigger: { trigger: wordRef.current, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
        },
      )
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
          {t('Contacto')}
        </p>
        <h2 className="mt-5 text-[clamp(2.4rem,7vw,7.4rem)] leading-[0.92] font-semibold uppercase" style={DISPLAY}>
          <span className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">
              {t('Estamos en')}
            </span>
          </span>
          {/* el espacio entre renglones: para buscadores y lectores de pantalla */}{' '}
          <span className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">
              Roca 1120.
            </span>
          </span>
        </h2>

        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <div data-in className="opacity-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60" style={MONO}>
              {t('Dirección')}
            </p>
            <address className="mt-2 text-[18px] leading-[1.35] font-medium not-italic" style={BODY}>
              Av. Gral. Roca 1120
              <br />
              San Martín de los Andes
            </address>
          </div>
          <div data-in className="opacity-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60" style={MONO}>
              {t('Horarios')}
            </p>
            <p className="mt-2 text-[18px] leading-[1.35] font-medium" style={BODY}>
              {t('Martes a sábado, {a} a {b}', { a: fmt(tue.open), b: fmt(tue.close) })}
              <br />
              {t('Lunes, {a} a {b}', { a: fmt(mon.open), b: fmt(mon.close) })}
              <br />
              {t('Domingo, cerrado')}
            </p>
          </div>
          <div data-in className="opacity-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60" style={MONO}>
              {t('Ahora')}
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
              {t('Cómo llegar')}
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
          {/* Cada letra sube detrás de su máscara con el scroll; al pasar el puntero, salta. */}
          <span aria-hidden="true" ref={wordRef} className="inline-flex">
            {[...'cāpsula33'].map((ch, i) => (
              <span key={i} className="inline-block overflow-hidden pt-[0.12em] pb-[0.08em]" style={{ margin: '-0.12em 0 -0.08em' }}>
                {/* Afuera el salto del puntero (con transición), adentro la subida del scroll (GSAP): no se pisan. */}
                <span className={`c33-end-ch inline-block ${i >= 7 ? 'is-33' : ''}`} style={{ color: i >= 7 ? C.cream : undefined }}>
                  <span data-ch className="inline-block">
                    {ch}
                  </span>
                </span>
              </span>
            ))}
          </span>
        </p>
        <p className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase opacity-70" style={MONO}>
          <span>{t('Café de especialidad · San Martín de los Andes')}</span>
          <span>© {new Date().getFullYear()} cāpsula33</span>
        </p>
      </footer>
      <style>{`
        .c33-end-btn { transition: transform 160ms ease-out, background-color 250ms, color 250ms; }
        .c33-end-btn:active { transform: scale(0.97); }
        @media (hover: hover) {
          .c33-end-btn:hover { background: ${C.cream} !important; color: ${INK} !important; border-color: ${C.cream} !important; }
        }
        .c33-end-ch { transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), color 200ms; }
        @media (hover: hover) {
          .c33-end-ch:hover { transform: translateY(-9%); color: ${C.cream}; }
          .c33-end-ch.is-33:hover { animation: c33-end-flicker 0.9s steps(1, end) 1; color: #fff7ec; text-shadow: 0 0 18px rgba(255,247,236,0.8); }
        }
        @keyframes c33-end-flicker { 0%, 100% { opacity: 1; } 10% { opacity: 0.3; } 18% { opacity: 1; } 30% { opacity: 0.45; } 40% { opacity: 1; } }
        .c33-end-btn:focus-visible { outline: 3px solid ${C.cream}; outline-offset: 3px; }
      `}</style>
    </section>
  )
}

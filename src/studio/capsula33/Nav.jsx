import { useEffect, useRef, useState } from 'react'
import { getLenis } from '../../hooks/useLenis'
import { C, MONO, DISPLAY } from './brand'
import { LangSwitch } from './i18n'
import { useLang, useStatus } from './i18nCore'

/**
 * cāpsula33 — barra de navegación.
 *
 * Fija arriba: la marca, las secciones de la página y si está abierto. Se
 * esconde al bajar y vuelve al subir (como en los sitios de referencia); al
 * entrar al hero no se muestra. En el teléfono, un botón
 * abre un panel con las mismas secciones en grande.
 */

const NAV_ITEMS = [
  { id: 'top', label: 'La cápsula' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'mapa', label: 'El local' },
  { id: 'carta', label: 'Menú' },
  { id: 'galeria', label: 'Galería' },
  { id: 'ruta', label: 'Ruta 7 Lagos' },
  { id: 'llegar', label: 'Cómo llegar' },
  { id: 'contacto', label: 'Contacto' },
]
// Secciones de la página (en orden) y qué ítem del menú encienden.
const SPY = [
  ['top', 'top'],
  ['nosotros', 'nosotros'],
  ['mapa', 'mapa'],
  ['carta', 'carta'],
  ['galeria', 'galeria'],
  ['ruta', 'ruta'],
  ['llegar', 'llegar'],
  ['contacto', 'contacto'],
]

export default function Nav({ visible }) {
  const [hidden, setHidden] = useState(true)
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('top')
  const { t } = useLang()
  const status = useStatus()
  const openRef = useRef(false)
  openRef.current = open

  // Esconde al bajar, vuelve al subir; con el panel abierto no se esconde.
  useEffect(() => {
    let lastY = window.scrollY
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      const dy = y - lastY
      setSolid(y > 24)
      // Al entrar al hero no está: la entrada a la cápsula se ve limpia. Aparece si se scrollea
      // para arriba (en el hero y en el resto) y se va al bajar.
      if (openRef.current) setHidden(false)
      else if (y < 120) setHidden(true)
      else if (Math.abs(dy) > 5) setHidden(dy > 0)
      if (Math.abs(dy) > 5) lastY = y
      // La sección activa: la que cruza el 40 % de la pantalla.
      const line = window.innerHeight * 0.4
      // (Las fijadas se miden por su contenedor: mientras están fijas su propio top queda en 0.)
      let current = 'top'
      for (const [id, item] of SPY) {
        const el = document.getElementById(id)
        const box = el && (el.closest('.pin-spacer') || el)
        if (box && box.getBoundingClientRect().top <= line) current = item
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Panel del teléfono: la página no se mueve mientras está abierto; Escape lo cierra.
  useEffect(() => {
    const lenis = getLenis()
    if (open) lenis?.stop()
    else lenis?.start()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (open) lenis?.start()
    }
  }, [open])

  // Ir a una sección: sin recorrer todo lo que hay en el medio (el hero es un recorrido largo,
  // pasar por él de un tirón no es lindo). Un fundido corto tapa el salto.
  const curtainRef = useRef(null)
  const go = (id) => (e) => {
    e.preventDefault()
    setOpen(false)
    const lenis = getLenis()
    const el = id === 'top' ? null : document.getElementById(id)
    const target = el ? el.getBoundingClientRect().top + window.scrollY : 0
    const far = Math.abs(target - window.scrollY) > window.innerHeight * 1.5
    if (!far) {
      setTimeout(() => lenis?.scrollTo(target, { duration: 1.1 }), open ? 60 : 0)
      return
    }
    const curtain = curtainRef.current
    curtain.style.transition = 'opacity 260ms cubic-bezier(0.22,1,0.36,1)'
    curtain.style.opacity = '1'
    curtain.style.pointerEvents = 'auto'
    setTimeout(() => {
      lenis?.start()
      lenis?.scrollTo(target, { immediate: true, force: true })
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          curtain.style.transition = 'opacity 520ms cubic-bezier(0.22,1,0.36,1)'
          curtain.style.opacity = '0'
          curtain.style.pointerEvents = 'none'
        }),
      )
    }, 280)
  }

  return (
    <>
      <header
        className="c33-nav fixed inset-x-0 top-0 z-40"
        style={{
          transform: hidden && !open ? 'translateY(-110%)' : 'none',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          background: solid || open ? 'rgba(8,9,12,0.72)' : 'transparent',
          backdropFilter: solid || open ? 'blur(14px) saturate(1.2)' : 'none',
          WebkitBackdropFilter: solid || open ? 'blur(14px) saturate(1.2)' : 'none',
          borderBottom: solid ? '1px solid rgba(242,233,220,0.08)' : '1px solid transparent',
        }}
      >
        <nav aria-label={t('Secciones')} className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-6 px-6 md:px-10">
          <a href="#top" onClick={go('top')} className="c33-brand text-[20px] font-light md:text-[22px]" style={{ ...MONO, color: C.cream }} aria-label={t('cāpsula33, volver al principio')}>
            cāpsula<span style={{ color: C.orange }}>33</span>
          </a>

          <ul className="hidden items-center gap-0.5 min-[1100px]:flex">
            {NAV_ITEMS.map((it) => (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  onClick={go(it.id)}
                  aria-current={active === it.id ? 'location' : undefined}
                  className="c33-link relative inline-flex h-10 items-center px-2.5 text-[12px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase xl:px-3.5 xl:tracking-[0.16em]"
                  style={{ ...DISPLAY, color: active === it.id ? C.cream : 'rgba(242,233,220,0.62)' }}
                >
                  {t(it.label)}
                  <span aria-hidden="true" className="c33-link-line absolute right-2.5 bottom-1.5 left-2.5 h-px origin-left xl:right-3.5 xl:left-3.5" style={{ background: C.orange, transform: active === it.id ? 'scaleX(1)' : 'scaleX(0)' }} />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 lg:gap-5">
            <LangSwitch className="shrink-0" />
            <p className="hidden items-center gap-2 text-[11px] tracking-[0.16em] whitespace-nowrap uppercase 2xl:flex" style={{ ...MONO, color: 'rgba(242,233,220,0.85)' }}>
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: status.open ? '#7dffa8' : C.orange, boxShadow: status.open ? '0 0 10px #7dffa8' : 'none' }} />
              {status.label}
            </p>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="c33-menu-panel"
              aria-label={open ? t('Cerrar el menú') : t('Abrir el menú')}
              className="tpl-hit relative grid h-11 w-11 place-items-center min-[1100px]:hidden"
              style={{ color: C.cream }}
            >
              <span aria-hidden="true" className="c33-burger-line absolute h-px w-6" style={{ background: 'currentColor', transform: open ? 'rotate(45deg)' : 'translateY(-4px)' }} />
              <span aria-hidden="true" className="c33-burger-line absolute h-px w-6" style={{ background: 'currentColor', transform: open ? 'rotate(-45deg)' : 'translateY(4px)' }} />
            </button>
          </div>
        </nav>
      </header>

      {/* El fundido que tapa el salto entre secciones lejanas. */}
      <div ref={curtainRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[35] opacity-0" style={{ background: '#05060a' }} />

      {/* Panel del teléfono. */}
      <div
        id="c33-menu-panel"
        className="c33-panel fixed inset-0 z-30 flex flex-col justify-between px-6 pt-24 pb-8 min-[1100px]:hidden"
        style={{ background: '#08090c', opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none' }}
        aria-hidden={!open}
      >
        <ul>
          {NAV_ITEMS.map((it, i) => (
            <li key={it.id} className="border-b" style={{ borderColor: 'rgba(242,233,220,0.1)' }}>
              <a
                href={`#${it.id}`}
                onClick={go(it.id)}
                tabIndex={open ? 0 : -1}
                className="c33-panel-link flex items-baseline gap-4 py-4 text-[2.1rem] leading-none font-semibold uppercase"
                style={{ ...DISPLAY, color: active === it.id ? C.orange : C.cream, transitionDelay: open ? `${60 + i * 45}ms` : '0ms', opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(14px)' }}
              >
                <span className="text-[11px] tracking-[0.2em]" style={{ ...MONO, color: 'rgba(242,233,220,0.45)' }}>
                  0{i + 1}
                </span>
                {t(it.label)}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-5">
          <LangSwitch size="lg" className="-ml-2" />
          <p className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.8)' }}>
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: status.open ? '#7dffa8' : C.orange }} />
            {status.label} · Av. Gral. Roca 1120
          </p>
        </div>
      </div>

      <style>{`
        .c33-nav { transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out 200ms, background-color 300ms, border-color 300ms; }
        .c33-link-line { transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1); }
        .c33-link { transition: color 200ms ease-out; }
        @media (hover: hover) {
          .c33-link:hover { color: ${C.cream} !important; }
          .c33-link:hover .c33-link-line { transform: scaleX(1) !important; }
          .c33-brand:hover span { color: ${C.neon} !important; }
        }
        .c33-link:focus-visible, .c33-brand:focus-visible, .c33-panel-link:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 3px; }
        .c33-burger-line { transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1); }
        .c33-panel { transition: opacity 300ms ease-out; }
        .c33-panel-link { transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1), color 200ms; }
      `}</style>
    </>
  )
}

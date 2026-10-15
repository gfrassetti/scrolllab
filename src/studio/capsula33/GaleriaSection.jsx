import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { useLang } from './i18nCore'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'

/**
 * cāpsula33 — «Bitácora»: la galería.
 *
 * En PC la sección se fija y las fotos corren de costado con el scroll. Cada
 * foto se destapa al entrar (una cortina que se abre de izquierda a derecha, con
 * la imagen asentándose desde un zoom), el número grande se desplaza más lento
 * que la foto y el pie sube al aparecer. Sobre una foto el cursor es un círculo
 * («Ver»); un clic la agranda en pantalla completa, con flechas y Esc.
 * En tablet y teléfono es una pila vertical con los mismos destapes, y un toque
 * abre la foto. Mezcla recortes de las imágenes del sitio con fotos reales.
 */

const BASE = '/studio/capsula33/gallery/'

const PANELS = [
  { index: '01', title: 'El acceso', caption: 'La puerta naranja, al final del pasillo de la nave.', img: `${BASE}pasillo.webp` },
  { index: '02', title: 'La mesa', caption: 'Café, brunch y sobremesa frente a la banqueta naranja.', img: `${BASE}mesa.webp` },
  { index: '03', title: 'La colección', caption: 'Figuras de cine, cada una bajo su frasco de vidrio.', img: `${BASE}coleccion.webp` },
  { index: '04', title: 'La cocina', caption: 'Huevos pochados sobre yogur, con cebolla morada y eneldo.', img: `${BASE}huevos.webp` },
  { index: '05', title: 'El plato', caption: 'Tostada con hongos, crema verde y remolacha.', img: `${BASE}tostada.webp` },
  { index: '06', title: 'La tripulación', caption: 'Bienvenidos, exploradores de universos.', img: `${BASE}tripulante.webp` },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function GaleriaSection() {
  const { t } = useLang()
  const rootRef = useRef(null)
  const R = useRef({ figs: [], imgs: [], nums: [], caps: [], curtains: [], cur: [] })
  const cursorRef = useRef(null)
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  const [open, setOpen] = useState(-1)
  const closeRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // La vista ampliada: sin scroll por detrás, con Esc y flechas.
  useEffect(() => {
    if (open < 0) return undefined
    getLenis()?.stop()
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(-1)
      else if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % PANELS.length)
      else if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + PANELS.length) % PANELS.length)
    }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = prev
      getLenis()?.start()
    }
  }, [open])

  useGSAP(
    () => {
      const r = R.current
      const root = rootRef.current
      // El título: letras que suben desde una máscara, palabra por palabra.
      const h = root.querySelector('[data-title]')
      let split = null
      if (h) {
        split = new SplitText(h, { type: 'words,chars', mask: 'words', aria: 'none' })
        gsap.set(split.chars, { yPercent: 115, rotate: 6 })
        gsap.to(split.chars, {
          yPercent: 0,
          rotate: 0,
          duration: 1.1,
          ease: 'expo.out',
          stagger: { each: 0.018, from: 'start' },
          scrollTrigger: { trigger: root, start: 'top 65%', once: true },
        })
      }
      gsap.fromTo(
        root.querySelectorAll('[data-rise]'),
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: root, start: 'top 60%', once: true } },
      )

      // El destape es una cortina (del color del fondo) que se corre con `scaleX`: solo transform,
      // va por la placa de video. Antes era `clip-path` + `filter` sobre fotos de 1080 × 1350.
      const paintPanel = (i, vis) => {
        // vis: 0 → la foto todavía no entró; 1 → ya está del todo. (Se mide por su posición en pantalla.)
        const k = Math.round(vis * 200) / 200
        if (r.cur[i] === k) return
        r.cur[i] = k
        const e = 1 - (1 - k) ** 3
        r.curtains[i].style.transform = `scaleX(${1 - e})`
        r.imgs[i].style.transform = `scale(${1.28 - 0.28 * e})`
        const c = clamp01((k - 0.35) / 0.5)
        r.caps[i].style.opacity = String(c)
        r.caps[i].style.transform = `translate3d(0, ${(1 - c) * 18}px, 0)`
      }

      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const track = r.track
        // Las posiciones de cada foto, medidas una sola vez por layout (no por cuadro).
        let lefts = []
        let widths = []
        const measure = () => {
          lefts = r.figs.map((fig) => (fig ? fig.parentElement.offsetLeft : 0))
          widths = r.figs.map((fig) => (fig ? fig.parentElement.offsetWidth : 0))
        }
        measure()
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth)
        const update = () => {
          const W = window.innerWidth
          const x = gsap.getProperty(track, 'x')
          for (let i = 0; i < r.figs.length; i++) {
            // (Al cambiar de idioma React suelta y vuelve a tomar los nodos: durante ese instante son null.)
            if (!r.figs[i] || !r.nums[i] || !r.imgs[i] || !r.caps[i] || !r.curtains[i]) continue
            const left = lefts[i] + x
            // Fuera de pantalla (y ya resuelta) no se toca nada.
            if (left > W * 1.15 || left + widths[i] < -W * 0.25) {
              if (left > W * 1.15) paintPanel(i, 0)
              continue
            }
            // 0 cuando el borde de la foto asoma por la derecha; 1 cuando ya entró un tercio de pantalla
            // (así la última también termina de destaparse, pegada al borde).
            paintPanel(i, clamp01((W - left) / (W * 0.32)))
            // El número grande va más lento que la foto (paralaje).
            const tt = (left + widths[i] / 2 - W / 2) / W
            r.nums[i].style.transform = `translate3d(${(tt * -90).toFixed(1)}px, 0, 0)`
          }
        }
        // Se pinta con el tween (sigue al scroll): sin un segundo suavizado encima del de Lenis.
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          onUpdate: update,
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: () => `+=${dist()}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: () => {
              measure()
              update()
            },
          },
        })
        void tween
        return () => {
          gsap.set(track, { clearProps: 'transform' })
        }
      })
      mm.add('(max-width: 1023px)', () => {
        r.figs.forEach((fig, i) => {
          if (!fig || !r.caps[i] || !r.imgs[i] || !r.curtains[i]) return
          gsap.set(r.curtains[i], { scaleX: 1 })
          gsap.set(r.caps[i], { opacity: 0, y: 18 })
          const tl = gsap.timeline({ scrollTrigger: { trigger: fig.parentElement, start: 'top 82%', once: true } })
          tl.to(r.curtains[i], { scaleX: 0, duration: 1.1, ease: 'expo.out' }, 0)
            .fromTo(r.imgs[i], { scale: 1.28 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0)
            .to(r.caps[i], { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.35)
        })
      })
      // Estado inicial en PC (antes del primer scroll).
      if (window.innerWidth >= 1024) {
        r.cur = []
        r.figs.forEach((fig, i) => fig && r.imgs[i] && r.caps[i] && r.curtains[i] && paintPanel(i, 0))
      }
      // El contexto de useGSAP deshace el matchMedia y el SplitText al volver a armar o al salir.
    },
    { scope: rootRef, dependencies: [wide, t], revertOnUpdate: true },
  )

  // El cursor en círculo sobre las fotos (solo con mouse). Se esconde apenas deja de estar sobre una
  // foto: al scrollear con la rueda las fotos se mueven bajo el puntero sin que el navegador avise,
  // y al salir de la galería (el pie de la página) no puede quedarse flotando.
  const pointer = useRef({ x: -999, y: -999, over: false })
  const moveCursor = useCallback((e) => {
    const el = cursorRef.current
    if (!el) return
    pointer.current = { x: e.clientX, y: e.clientY, over: true }
    el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
  }, [])
  useEffect(() => {
    const hide = () => {
      pointer.current.over = false
      if (cursorRef.current) cursorRef.current.dataset.on = '0'
    }
    let raf = 0
    const check = () => {
      raf = 0
      const cur = cursorRef.current
      if (!cur || cur.dataset.on !== '1') return
      const { x, y } = pointer.current
      const el = document.elementFromPoint(x, y)
      if (!el || !el.closest('.c33-fig')) hide()
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    const root = rootRef.current
    const io = new IntersectionObserver(([en]) => !en.isIntersecting && hide(), { threshold: 0 })
    if (root) io.observe(root)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('blur', hide)
    document.documentElement.addEventListener('mouseleave', hide)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('blur', hide)
      document.documentElement.removeEventListener('mouseleave', hide)
    }
  }, [])
  // Con la vista ampliada abierta no hay círculo.
  useEffect(() => {
    if (open >= 0 && cursorRef.current) cursorRef.current.dataset.on = '0'
  }, [open])
  const onEnter = useCallback(
    (e) => {
      if (e.pointerType !== 'mouse') return
      const el = cursorRef.current
      if (!el) return
      moveCursor(e)
      el.dataset.on = '1'
    },
    [moveCursor],
  )
  const onLeave = useCallback(() => {
    if (cursorRef.current) cursorRef.current.dataset.on = '0'
  }, [])

  // Un solo refresh del recorrido cuando están las seis fotos (con la ruta ya medida al cargar).
  const loaded = useRef(0)
  const onImgLoad = useCallback(() => {
    loaded.current += 1
    if (loaded.current === PANELS.length) ScrollTrigger.refresh()
  }, [])

  const set = (k, i) => (el) => (R.current[k][i] = el)
  const panel = open >= 0 ? PANELS[open] : null

  return (
    <section ref={rootRef} id="galeria" className="relative overflow-hidden" style={{ background: MAP_BG, color: C.cream }}>
      <div className="relative flex min-h-svh flex-col px-6 pt-24 pb-16 md:px-10 lg:h-svh lg:flex-row lg:items-stretch lg:px-0 lg:py-0">
        <div
          ref={(el) => (R.current.track = el)}
          className="flex flex-col gap-24 sm:gap-28 lg:h-full lg:flex-row lg:items-center lg:gap-[5.5vw] lg:pr-[10vw] lg:pl-[5vw]"
        >
          {/* La entrada: el título, letra por letra. */}
          <div className="shrink-0 lg:w-[38vw]">
            <p
              data-rise
              className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase opacity-0"
              style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}
            >
              <span className="h-px w-8" style={{ background: C.neon }} />
              {t('Bitácora · 06')}
            </p>
            <h2
              key={t('Seis vistas de')}
              data-title
              aria-label={`${t('Seis vistas de')} ${t('la cápsula,')} ${t('de la puerta a la mesa.')}`}
              className="mt-4 text-[clamp(2.4rem,5.4vw,6rem)] leading-[0.94] font-semibold tracking-[-0.015em] uppercase"
              style={DISPLAY}
            >
              {t('Seis vistas de')} <span style={{ color: C.neon }}>{t('la cápsula,')}</span> {t('de la puerta a la mesa.')}
            </h2>
            <p
              data-rise
              className="mt-6 hidden max-w-[34ch] items-center gap-3 text-[13px] leading-[1.5] opacity-0 lg:flex"
              style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}
            >
              {t('Seguí bajando: las fotos corren de costado. Un clic las agranda.')}
            </p>
          </div>

          {PANELS.map((p, i) => (
            <figure key={p.index} className="relative shrink-0 lg:w-fit">
              {/* El número grande, atrás y un poco corrido. */}
              <span
                ref={set('nums', i)}
                aria-hidden="true"
                className="pointer-events-none absolute -top-[0.62em] -left-[0.04em] z-0 text-[clamp(5rem,14vw,12rem)] leading-none font-semibold select-none"
                style={{ ...DISPLAY, color: 'transparent', WebkitTextStroke: '1.5px rgba(242,233,220,0.22)', willChange: 'transform' }}
              >
                {p.index}
              </span>
              <button
                type="button"
                onClick={() => setOpen(i)}
                onPointerEnter={onEnter}
                onPointerMove={moveCursor}
                onPointerLeave={onLeave}
                aria-label={`${t('Agrandar')}: ${t(p.title)}`}
                className="c33-fig relative z-10 block w-full cursor-none overflow-hidden rounded-[3px] text-left lg:cursor-none"
                style={{ contain: 'paint' }}
              >
                <span ref={set('figs', i)} className="relative block overflow-hidden rounded-[3px]">
                  <img
                    ref={set('imgs', i)}
                    src={p.img}
                    alt={t(p.caption)}
                    loading="eager"
                    decoding="async"
                    onLoad={onImgLoad}
                    width="1080"
                    height="1350"
                    className="block aspect-[4/5] w-full object-cover will-change-transform lg:h-[min(64svh,44vw)] lg:w-auto"
                  />
                  {/* La cortina del destape (del color del fondo). */}
                  <span
                    ref={set('curtains', i)}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 will-change-transform"
                    style={{ background: MAP_BG, transformOrigin: '100% 50%', transform: 'scaleX(1)' }}
                  />
                </span>
              </button>
              <figcaption ref={set('caps', i)} className="relative z-10 mt-4 flex items-baseline gap-3" style={{ opacity: wide ? 0 : undefined }}>
                <span className="text-[11px] tracking-[0.2em] tabular-nums uppercase" style={{ ...MONO, color: C.neon }}>
                  {p.index}
                </span>
                <span>
                  <span className="block text-[clamp(1.1rem,1.7vw,1.5rem)] leading-tight font-semibold uppercase" style={DISPLAY}>
                    {t(p.title)}
                  </span>
                  <span className="mt-1 block max-w-[34ch] text-[14px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.7)' }}>
                    {t(p.caption)}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
            <>
              {/* El cursor: un círculo con «Ver» sobre las fotos. */}
              <div
                ref={cursorRef}
                aria-hidden="true"
                data-on="0"
                className="c33-cursor pointer-events-none fixed top-0 left-0 z-[60] grid h-[84px] w-[84px] place-items-center rounded-full text-[12px] font-semibold tracking-[0.16em] uppercase mix-blend-normal"
                style={{ ...MONO, background: C.neon, color: '#0b0c0f' }}
              >
                {t('Ver')}
              </div>

              {/* La foto, a pantalla completa. */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label={panel ? t(panel.title) : t('Foto')}
                aria-hidden={!panel}
                className="fixed inset-0 z-[90] flex flex-col items-center justify-center p-5 md:p-10"
                style={{
                  background: 'rgba(5,6,10,0.94)',
                  color: C.cream,
                  backdropFilter: 'blur(10px)',
                  opacity: panel ? 1 : 0,
                  visibility: panel ? 'visible' : 'hidden',
                  pointerEvents: panel ? 'auto' : 'none',
                  transition: 'opacity 380ms cubic-bezier(0.22,1,0.36,1), visibility 0s linear ' + (panel ? '0s' : '380ms'),
                }}
                onClick={(e) => e.target === e.currentTarget && setOpen(-1)}
              >
                {panel ? (
                  <>
                    <img key={panel.img} src={panel.img} alt={t(panel.caption)} className="c33-light max-h-[76svh] max-w-full rounded-[3px] object-contain" />
                    <div className="mt-5 flex w-full max-w-[44rem] items-end justify-between gap-6">
                      <div>
                        <p className="text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
                          {panel.index} / 06
                        </p>
                        <p className="mt-1 text-[clamp(1.3rem,2.4vw,2rem)] leading-tight font-semibold uppercase" style={DISPLAY}>
                          {t(panel.title)}
                        </p>
                        <p className="mt-1 text-[15px] leading-[1.45]" style={{ ...BODY, color: 'rgba(242,233,220,0.75)' }}>
                          {t(panel.caption)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setOpen((i) => (i - 1 + PANELS.length) % PANELS.length)}
                          aria-label={t('Foto anterior')}
                          className="c33-lbtn tpl-hit grid h-11 w-11 place-items-center rounded-full border text-[18px]"
                          style={{ borderColor: 'rgba(242,233,220,0.3)' }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpen((i) => (i + 1) % PANELS.length)}
                          aria-label={t('Foto siguiente')}
                          className="c33-lbtn tpl-hit grid h-11 w-11 place-items-center rounded-full border text-[18px]"
                          style={{ borderColor: 'rgba(242,233,220,0.3)' }}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(-1)}
                  aria-label={t('Cerrar')}
                  className="c33-lbtn tpl-hit absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full border text-[18px] md:top-6 md:right-6"
                  style={{ borderColor: 'rgba(242,233,220,0.3)' }}
                >
                  ✕
                </button>
              </div>
            </>,
            document.body,
          )
        : null}

      <style>{`
        .c33-cursor { transform: translate3d(-100px, -100px, 0); opacity: 0; scale: 0.4; transition: opacity 220ms ease-out, scale 380ms cubic-bezier(0.22,1,0.36,1); }
        .c33-cursor[data-on='1'] { opacity: 1; scale: 1; }
        @media (hover: none) { .c33-cursor { display: none; } }
        .c33-fig:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 4px; }
        @media (hover: none) { .c33-fig { cursor: pointer; } }
        @keyframes c33-light-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
        .c33-light { animation: c33-light-in 520ms cubic-bezier(0.22,1,0.36,1); }
        @media (hover: hover) { .c33-lbtn:hover { background: rgba(255,255,255,0.1); } }
      `}</style>
    </section>
  )
}

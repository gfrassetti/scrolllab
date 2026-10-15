import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { useLang } from './i18nCore'
import { C, MONO, DISPLAY, BODY } from './brand'
import { CATEGORIES, ICONS, groupsOf } from './cartaData'
import { CARTA_PHOTOS, CARTA_PHOTO_BASE } from './cartaPhotos'

/**
 * cāpsula33 — «La carta» como un libro: la carta take-away, página por página.
 *
 * Una tapa con la tripulante, la bienvenida con el índice, una página por cada tramo de la
 * carta y la contratapa. En PC es un libro abierto de dos páginas (se da vuelta con un clic,
 * las flechas o los botones); en el teléfono, una página por vez que se desliza con el dedo.
 * Los precios son los de la carta impresa.
 */

const COVER = '/studio/capsula33/portada-revista.webp'

// El orden de las páginas. Página 0 = tapa (derecha), 1 = izquierda de la primera apertura, etc.
const PAGES = [
  { id: 'cover', kind: 'cover' },
  { id: 'welcome', kind: 'welcome' },
  { id: 'cal', kind: 'list', cat: 0, group: 0, first: true },
  { id: 'fri', kind: 'list', cat: 0, group: 1, art: true },
  { id: 'smo', kind: 'list', cat: 1, group: 0, first: true, art: true },
  { id: 'lam', kind: 'list', cat: 2, group: 0, first: true },
  { id: 'coo', kind: 'list', cat: 2, group: 1, art: true },
  { id: 'cer', kind: 'list', cat: 3, group: 0, first: true, art: true },
  { id: 'pla', kind: 'list', cat: 4, group: 'all', first: true },
  { id: 'hel', kind: 'list', cat: 5, group: 0, first: true, art: true },
  { id: 'back', kind: 'back' },
]
const LAST = PAGES.length - 1
const LEAVES = Math.ceil(PAGES.length / 2) // 6 hojas; la última tiene el dorso en blanco
const MAX_SPREAD = Math.floor(LAST / 2) + (LAST % 2 ? 1 : 0) // 5

/** Página donde empieza cada rubro (para los accesos del pie y el índice). */
const CAT_PAGE = CATEGORIES.map((c, i) => PAGES.findIndex((p) => p.kind === 'list' && p.cat === i && p.first))

const pageNo = (p) => String(p + 1).padStart(2, '0')

function PageShell({ p, children, side }) {
  const { t } = useLang()
  return (
    <div className="c33-page" data-side={side}>
      <div className="c33-page-head">
        <span>{t('Carta take-away')}</span>
        <span>{pageNo(p)}</span>
      </div>
      {children}
      <div className="c33-page-foot">
        <span>cāpsula33</span>
        <span>{t('Sabores que conectan')}</span>
      </div>
    </div>
  )
}

function PageView({ p, side, go, tip }) {
  const { t } = useLang()
  const page = PAGES[p]
  if (!page) return <div className="c33-page c33-page-blank" />

  if (page.kind === 'cover') {
    // La tapa es la revista «Experiencia Capsula» del local (recreada), con su frase de bienvenida.
    return (
      <div className="c33-page c33-cover" data-side="right">
        <img src={COVER} alt="" aria-hidden="true" className="c33-cover-bg" draggable="false" />
        <img
          src={COVER}
          alt={t('Tapa de la carta: la revista «Experiencia Capsula», con la frase «Bienvenidos exploradores de universos»')}
          className="c33-cover-img"
          draggable="false"
        />
      </div>
    )
  }

  if (page.kind === 'welcome') {
    return (
      <PageShell p={p} side={side}>
        <div className="c33-welcome">
          <h3 className="c33-h-xl" style={DISPLAY}>
            {t('Bienvenidos,')}
            <br />
            <span style={{ color: C.neon }}>{t('exploradores de universos.')}</span>
          </h3>
          <p className="c33-lead" style={BODY}>
            {t('Café, laminados, cerveza tirada y algo más para el viaje.')}
          </p>
          <p className="c33-kicker" style={MONO}>
            {t('En esta carta')}
          </p>
          <ul className="c33-toc">
            {CATEGORIES.map((c, i) => (
              <li key={c.id}>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(CAT_PAGE[i]) }} className="c33-toc-btn">
                  <span className="c33-toc-dot" style={{ background: `radial-gradient(circle at 34% 30%, ${c.planet[0]}, ${c.planet[1]} 60%, ${c.planet[2]})` }} />
                  <span className="c33-toc-name" style={BODY}>
                    {t(c.title)}
                  </span>
                  <span className="c33-toc-lead" />
                  <span className="c33-toc-pg" style={MONO}>
                    {pageNo(CAT_PAGE[i])}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="c33-note" style={MONO}>
            VG · {t('opción vegana')}
            <br />
            {t('Precios en pesos argentinos.')}
          </p>
        </div>
      </PageShell>
    )
  }

  if (page.kind === 'back') {
    return (
      <div className="c33-page c33-cover" data-side="right">
        <div className="c33-cover-glow" />
        <div className="c33-backcover">
          <h3 className="c33-cover-title c33-static" style={{ ...DISPLAY, fontSize: 'calc(var(--u) * 11)' }}>
            CAPSULA<span style={{ color: C.neon }}>33</span>
          </h3>
          <p className="c33-lead" style={{ ...BODY, textAlign: 'center' }}>
            {t('Gracias por viajar con nosotros.')}
          </p>
          <p className="c33-note" style={{ ...MONO, textAlign: 'center' }}>
            Av. Gral. Roca 1120
            <br />
            San Martín de los Andes
            <br />
            <span style={{ color: C.neon }}>@capsulas33</span>
          </p>
        </div>
      </div>
    )
  }

  // Una página de la carta.
  const cat = CATEGORIES[page.cat]
  const [c1, c2, c3] = cat.planet
  const groups = groupsOf(cat.rows)
  const list = page.group === 'all' ? groups : [groups[page.group]]
  const label = page.group === 'all' ? null : list[0].label
  return (
    <PageShell p={p} side={side}>
      <div className="c33-list" style={{ '--c1': c1, '--c2': c2, '--c3': c3 }}>
        <p className="c33-kicker" style={{ ...MONO, color: C.neon }}>
          {t('Rubro {n} / 0{N}', { n: `0${page.cat + 1}`, N: CATEGORIES.length })}
        </p>
        <h3 className={page.first ? 'c33-h-xl' : 'c33-h-md'} style={DISPLAY}>
          {t(cat.title)}
        </h3>
        {page.first ? (
          <p className="c33-lead" style={{ ...BODY, color: 'rgba(242,233,220,0.66)' }}>
            {t(cat.blurb)}
          </p>
        ) : null}
        {label ? (
          <span className="c33-chip" style={MONO}>
            {t(label)}
          </span>
        ) : null}
        {list.map((g, gi) => (
          <div key={gi} className="c33-group">
            {page.group === 'all' && g.label ? (
              <span className="c33-chip" style={MONO}>
                {t(g.label)}
              </span>
            ) : null}
            <ul>
              {g.items.map((it) => (
                <li
                  key={it.name}
                  className="c33-row"
                  data-photo={CARTA_PHOTOS[it.name] ? '1' : '0'}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && tip.show(e.currentTarget, it, cat)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && tip.hide()}
                  onClick={(e) => e.pointerType !== 'mouse' && tip.toggle(e.currentTarget, it, cat)}
                >
                  <span className="c33-row-line">
                    <span className="c33-row-name" style={BODY}>
                      {t(it.name)}
                      {it.vg ? <span className="c33-vg" style={MONO}>VG</span> : null}
                    </span>
                    <span className="c33-row-lead" />
                    {it.price ? (
                      <span className="c33-row-price" style={MONO}>
                        {it.price}
                      </span>
                    ) : null}
                  </span>
                  {it.desc ? (
                    <span className="c33-row-desc" style={BODY}>
                      {t(it.desc)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {page.art ? (
          <svg viewBox="0 0 48 48" aria-hidden="true" className="c33-art" fill="none" stroke={c1} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONS[cat.id]} />
          </svg>
        ) : null}
      </div>
    </PageShell>
  )
}

export default function CartaLibro() {
  const rootRef = useRef(null)
  const { t } = useLang()
  const [single, setSingle] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  // `page` es la página que se está mirando; en PC se muestra la apertura que la contiene.
  const [page, setPage] = useState(0)
  const spread = Math.min(MAX_SPREAD, Math.ceil(page / 2))
  const swipe = useRef(null)
  // La miniatura del producto que tenés bajo el mouse (o el que tocaste en el teléfono).
  const [tipState, setTipState] = useState(null)
  const tipKey = useRef('')
  const tip = {
    show: (el, it, cat) => {
      if (!CARTA_PHOTOS[it.name]) return setTipState(null)
      const r = el.getBoundingClientRect()
      tipKey.current = it.name
      setTipState({ it, cat, left: r.left, right: r.right, top: r.top, bottom: r.bottom })
    },
    hide: () => {
      tipKey.current = ''
      setTipState(null)
    },
    toggle: (el, it, cat) => (tipKey.current === it.name ? tip.hide() : tip.show(el, it, cat)),
  }
  // Al dar vuelta la página o scrollear, la miniatura se va.
  useEffect(() => {
    setTipState(null)
    tipKey.current = ''
  }, [page])
  useEffect(() => {
    if (!tipState) return undefined
    const off = () => {
      tipKey.current = ''
      setTipState(null)
    }
    window.addEventListener('scroll', off, { passive: true })
    return () => window.removeEventListener('scroll', off)
  }, [tipState])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setSingle(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const go = useCallback((p) => setPage(Math.max(0, Math.min(LAST, p))), [])
  const next = useCallback(() => setPage((p) => (single ? Math.min(LAST, p + 1) : Math.min(LAST, Math.ceil(p / 2) * 2 + 2))), [single])
  const prev = useCallback(() => setPage((p) => (single ? Math.max(0, p - 1) : Math.max(0, Math.ceil(p / 2) * 2 - 2))), [single])

  const onKey = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prev()
    }
  }
  // Deslizar con el dedo (teléfono).
  const onDown = (e) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e) => {
    const s = swipe.current
    swipe.current = null
    if (!s || e.pointerType === 'mouse') return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)()
  }

  useGSAP(
    () => {
      gsap.fromTo(
        rootRef.current.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: rootRef.current, start: 'top 68%', once: true } },
      )
    },
    { scope: rootRef, dependencies: [t], revertOnUpdate: true },
  )

  const atStart = page === 0
  const atEnd = single ? page === LAST : spread >= MAX_SPREAD

  return (
    <section ref={rootRef} id="carta" className="relative overflow-hidden" style={{ background: '#05060a', color: C.cream }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(127,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(127,212,255,0.04) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 55% at 50% 62%, rgba(255,122,26,0.14), transparent 72%)' }}
      />

      <div className="relative mx-auto max-w-[1480px] px-4 py-20 md:px-10 lg:px-14 lg:py-28">
        <header className="max-w-[60rem]">
          <p data-in className="text-[11px] tracking-[0.24em] uppercase opacity-0" style={{ ...MONO, color: C.neon }}>
            {t('Experiencia Capsula · take-away')}
          </p>
          <h2 data-in className="mt-3 text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.02em] uppercase opacity-0" style={DISPLAY}>
            {t('Nuestra carta')}
            <br />
            <span style={{ color: C.neon }}>{t('take-away.')}</span>
          </h2>
        </header>

        {/* El libro. */}
        <div
          data-in
          className="c33-stage mt-8 opacity-0 md:mt-10"
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerUp={onUp}
          aria-label={t('Carta take-away')}
          role="group"
          data-single={single ? '1' : '0'}
        >
          {single ? (
            <div key={page} className="c33-single">
              <PageView p={page} side="right" go={go} tip={tip} />
            </div>
          ) : (
            <>
              <div className="c33-book" data-s={spread}>
                {Array.from({ length: LEAVES }, (_, i) => (
                  <div key={i} className="c33-leaf" data-flipped={i < spread ? '1' : '0'} style={{ zIndex: i < spread ? i + 1 : 60 - i }}>
                    <div className="c33-face c33-lf" onClick={(e) => !e.target.closest('.c33-row') && next()} data-turn={i === spread ? '1' : '0'}>
                      <PageView p={2 * i} side="right" go={go} tip={tip} />
                      <span className="c33-shade" />
                    </div>
                    <div className="c33-face c33-lb" onClick={(e) => !e.target.closest('.c33-row') && prev()}>
                      {2 * i + 1 <= LAST ? <PageView p={2 * i + 1} side="left" go={go} tip={tip} /> : <div className="c33-page c33-page-blank" />}
                      <span className="c33-shade" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="c33-ground" aria-hidden="true" data-s={spread} />
            </>
          )}
        </div>

        {/* Los controles: páginas, accesos a cada rubro. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-10">
          <button type="button" onClick={prev} disabled={atStart} className="c33-nav-btn" aria-label={t('Página anterior')}>
            ←
          </button>
          <ol className="order-3 flex w-full flex-wrap items-center justify-center gap-1.5 md:order-none md:w-auto">
            {CATEGORIES.map((c, i) => {
              const target = CAT_PAGE[i]
              const on = single ? PAGES[page].cat === i : (PAGES[2 * spread - 1]?.cat === i || PAGES[2 * spread]?.cat === i)
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => go(target)} data-on={on ? '1' : '0'} className="c33-chip-btn" style={MONO}>
                    <span className="opacity-60">0{i + 1}</span>
                    <span className="hidden sm:inline">{t(c.title)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <button type="button" onClick={next} disabled={atEnd} className="c33-nav-btn" aria-label={t('Página siguiente')}>
            →
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] tracking-[0.18em] uppercase" style={{ ...MONO, color: 'rgba(169,214,255,0.65)' }}>
          {t('Página {n} de {N}', { n: single ? page + 1 : Math.max(1, Math.min(LAST + 1, 2 * spread)), N: LAST + 1 })}
          <span className="hidden md:inline"> · {t('Hacé clic en las páginas o usá las flechas.')}</span>
          <span className="md:hidden"> · {t('Deslizá para dar vuelta la página.')}</span>
        </p>
      </div>

      {tipState ? (
        <div
          className="c33-tip pointer-events-none fixed z-50"
          style={(() => {
            const w = 196
            const x = Math.max(12, Math.min(tipState.right + 14, window.innerWidth - w - 12))
            const y = Math.max(72, Math.min(window.innerHeight - 250, tipState.top + (tipState.bottom - tipState.top) / 2 - 110))
            return single
              ? { right: 12, bottom: 12, width: 190 }
              : { left: x, top: y, width: w }
          })()}
          role="status"
        >
          <div className="p-2" style={{ background: 'rgba(4,5,10,0.95)', border: '1px solid rgba(127,212,255,0.45)', boxShadow: '0 18px 50px rgba(0,0,0,0.6), 0 0 26px rgba(255,122,26,0.18)' }}>
            <div className="relative aspect-square w-full overflow-hidden" style={{ background: '#0b0c0f' }}>
              <img src={`${CARTA_PHOTO_BASE}${CARTA_PHOTOS[tipState.it.name]}`} alt={t(tipState.it.name)} className="h-full w-full object-cover" draggable="false" />
              <span aria-hidden="true" className="c33-tip-scan pointer-events-none absolute inset-0" />
              {['top-1 left-1 border-t border-l', 'top-1 right-1 border-t border-r', 'bottom-1 left-1 border-b border-l', 'right-1 bottom-1 border-r border-b'].map((c) => (
                <span key={c} aria-hidden="true" className={`absolute h-3 w-3 ${c}`} style={{ borderColor: C.neon }} />
              ))}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <p className="min-w-0 text-[13.5px] leading-tight font-medium" style={BODY}>
                {t(tipState.it.name)}
              </p>
              {tipState.it.price ? (
                <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ ...MONO, color: C.neon }}>
                  {tipState.it.price}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .c33-tip { animation: c33-tip-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        @keyframes c33-tip-in { from { opacity: 0; transform: translateY(6px) scale(0.97); } }
        .c33-tip-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.16) 2px 3px); mix-blend-mode: multiply; }
        .c33-row[data-photo='1'] { cursor: zoom-in; transition: background-color 160ms; }
        @media (hover: hover) { .c33-row[data-photo='1']:hover { background: linear-gradient(90deg, rgba(255,122,26,0.1), transparent); } }
        .c33-stage { --ph: min(80svh, 780px, calc((100vw - 48px) / 1.48)); --pw: calc(var(--ph) * 0.74); --u: calc(var(--pw) / 100); --k: 1; position: relative; display: flex; justify-content: center; outline: none; }
        .c33-stage[data-single='1'] { --pw: min(calc(100vw - 32px), 440px); --ph: calc(var(--pw) * 1.55); --k: 1.12; touch-action: pan-y; }
        .c33-stage:focus-visible .c33-lf[data-turn='1'] { outline: 2px solid ${C.neon}; outline-offset: -2px; }

        .c33-book { position: relative; width: calc(var(--pw) * 2); height: var(--ph); perspective: 2600px; transition: transform 900ms cubic-bezier(0.77, 0, 0.175, 1); }
        .c33-book[data-s='0'] { transform: translateX(calc(var(--pw) / -2)); }
        .c33-ground { position: absolute; left: 50%; bottom: -3.5%; width: calc(var(--pw) * 2); height: 8%; transform: translateX(-50%); background: radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.7), transparent 70%); transition: transform 900ms cubic-bezier(0.77, 0, 0.175, 1); pointer-events: none; }
        .c33-ground[data-s='0'] { transform: translateX(calc(-50% - var(--pw) / 2)); }

        .c33-leaf { position: absolute; top: 0; left: var(--pw); width: var(--pw); height: var(--ph); transform-origin: left center; transform-style: preserve-3d; transition: transform 900ms cubic-bezier(0.77, 0, 0.175, 1), z-index 0s linear 450ms; }
        .c33-leaf[data-flipped='1'] { transform: rotateY(-180deg); }
        .c33-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; cursor: pointer; }
        .c33-lb { transform: rotateY(180deg); }
        .c33-lf { border-radius: 2px 10px 10px 2px; box-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 28px 60px rgba(0,0,0,0.35); }
        .c33-lb { border-radius: 10px 2px 2px 10px; }
        .c33-shade { position: absolute; inset: 0; pointer-events: none; }
        .c33-lf .c33-shade { background: linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 9%), linear-gradient(0deg, rgba(0,0,0,0.18), transparent 12%); }
        .c33-lb .c33-shade { background: linear-gradient(270deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 9%), linear-gradient(0deg, rgba(0,0,0,0.18), transparent 12%); }
        .c33-lf[data-turn='1']::after { content: ''; position: absolute; right: 0; bottom: 0; width: 0; height: 0; background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,122,26,0.4)); clip-path: polygon(100% 0, 0 100%, 100% 100%); transition: width 260ms cubic-bezier(0.23,1,0.32,1), height 260ms cubic-bezier(0.23,1,0.32,1); pointer-events: none; }
        @media (hover: hover) { .c33-lf[data-turn='1']:hover::after { width: 9%; height: 6.5%; } }

        .c33-single { width: var(--pw); animation: c33-slide 380ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        @keyframes c33-slide { from { opacity: 0; transform: translateX(24px); } }
        .c33-single .c33-page { height: var(--ph); border-radius: 6px; }

        /* La hoja de papel. */
        .c33-page { position: relative; width: var(--pw); height: var(--ph); display: flex; flex-direction: column; color: ${C.cream};
          background: linear-gradient(165deg, #121c30, #0a111e 60%, #080d17); padding: calc(var(--u) * 6.4) calc(var(--u) * 7.5) calc(var(--u) * 5); overflow: hidden; }
        .c33-page-blank { background: linear-gradient(165deg, #121c30, #0a111e); }
        .c33-page-head, .c33-page-foot { display: flex; justify-content: space-between; font-family: 'Roboto Mono', ui-monospace, monospace; font-size: max(10px, calc(calc(var(--u) * 2.1) * var(--k))); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(169,214,255,0.6); }
        .c33-page-head { padding-bottom: calc(var(--u) * 2.4); border-bottom: 1px solid rgba(127,212,255,0.22); }
        .c33-page-foot { margin-top: auto; padding-top: calc(var(--u) * 2.4); border-top: 1px solid rgba(127,212,255,0.15); color: rgba(169,214,255,0.4); }

        .c33-list, .c33-welcome { position: relative; flex: 1; padding-top: calc(var(--u) * 4); padding-bottom: calc(var(--u) * 3); display: flex; flex-direction: column; min-height: 0; }
        .c33-kicker { font-size: calc(calc(var(--u) * 2.2) * var(--k)); letter-spacing: 0.22em; text-transform: uppercase; color: rgba(169,214,255,0.8); }
        .c33-h-xl { margin-top: calc(var(--u) * 1.4); font-weight: 600; text-transform: uppercase; line-height: 0.95; letter-spacing: -0.01em; font-size: calc(calc(var(--u) * 8.6) * var(--k)); }
        .c33-h-md { margin-top: calc(var(--u) * 1.4); font-weight: 600; text-transform: uppercase; line-height: 0.95; font-size: calc(calc(var(--u) * 6.4) * var(--k)); color: rgba(242,233,220,0.9); }
        .c33-lead { margin-top: calc(var(--u) * 2.4); font-size: calc(calc(var(--u) * 3.1) * var(--k)); line-height: 1.35; color: rgba(242,233,220,0.78); max-width: 34ch; }
        .c33-chip { display: inline-block; align-self: flex-start; margin-top: calc(var(--u) * 3.2); padding: calc(var(--u) * 0.9) calc(var(--u) * 1.8); border-radius: 2px; font-size: calc(calc(var(--u) * 2.1) * var(--k)); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; background: rgba(127,212,255,0.16); color: #a9d6ff; }
        .c33-group { margin-top: calc(var(--u) * 1); }
        .c33-row { padding: calc(calc(var(--u) * 1.5) * var(--k)) 0; border-bottom: 1px solid rgba(242,233,220,0.08); }
        .c33-row-line { display: flex; align-items: baseline; gap: calc(var(--u) * 1.8); }
        .c33-row-name { font-size: calc(calc(var(--u) * 3.6) * var(--k)); line-height: 1.15; font-weight: 500; color: rgba(242,233,220,0.96); }
        .c33-row-lead { flex: 1; min-width: calc(var(--u) * 2); border-bottom: 1px dotted rgba(242,233,220,0.25); transform: translateY(calc(var(--u) * -0.5)); }
        .c33-row-price { font-size: calc(calc(var(--u) * 3.3) * var(--k)); font-weight: 600; color: ${C.neon}; font-variant-numeric: tabular-nums; }
        .c33-row-desc { display: block; margin-top: calc(var(--u) * 0.7); font-size: calc(calc(var(--u) * 2.6) * var(--k)); line-height: 1.35; color: rgba(242,233,220,0.58); max-width: 46ch; }
        .c33-vg { margin-left: calc(var(--u) * 1.4); padding: 0 calc(var(--u) * 0.8); border: 1px solid rgba(242,233,220,0.4); border-radius: 2px; font-size: calc(calc(var(--u) * 1.9) * var(--k)); font-weight: 700; vertical-align: middle; }
        .c33-art { position: absolute; right: calc(var(--u) * -2); bottom: calc(var(--u) * 1); width: calc(var(--u) * 36); opacity: 0.5; pointer-events: none; }

        .c33-welcome .c33-toc { margin-top: calc(var(--u) * 1.2); }
        .c33-welcome .c33-kicker { margin-top: calc(var(--u) * 6); }
        .c33-toc-btn { display: flex; width: 100%; align-items: center; gap: calc(var(--u) * 2); padding: calc(calc(var(--u) * 1.5) * var(--k)) 0; text-align: left; border-bottom: 1px solid rgba(242,233,220,0.08); transition: color 160ms; }
        .c33-toc-dot { width: calc(var(--u) * 2.6); height: calc(var(--u) * 2.6); border-radius: 99px; flex-shrink: 0; }
        .c33-toc-name { font-size: calc(calc(var(--u) * 3.4) * var(--k)); font-weight: 500; }
        .c33-toc-lead { flex: 1; border-bottom: 1px dotted rgba(242,233,220,0.25); transform: translateY(calc(var(--u) * -0.5)); }
        .c33-toc-pg { font-size: calc(calc(var(--u) * 2.8) * var(--k)); color: ${C.neon}; }
        @media (hover: hover) { .c33-toc-btn:hover .c33-toc-name { color: ${C.neon}; } }
        .c33-note { margin-top: auto; padding-top: calc(var(--u) * 3); font-size: calc(calc(var(--u) * 2.2) * var(--k)); letter-spacing: 0.14em; text-transform: uppercase; color: rgba(169,214,255,0.6); line-height: 1.7; }

        /* La tapa y la contratapa. */
        .c33-cover { padding: 0; background: radial-gradient(120% 70% at 50% 100%, #3a1608, #0d1424 55%, #080c15); }
        .c33-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .c33-cover-bg { position: absolute; inset: -8%; width: 116%; height: 116%; object-fit: cover; filter: blur(18px) saturate(1.1); opacity: 0.9; }
        .c33-single .c33-cover-img { object-fit: contain; }
        .c33-cover-glow { position: absolute; inset: 0; background: radial-gradient(60% 45% at 50% 62%, rgba(255,122,26,0.28), transparent 70%); }
        .c33-hud { position: absolute; font-family: 'Roboto Mono', ui-monospace, monospace; font-size: calc(calc(var(--u) * 2) * var(--k)); letter-spacing: 0.18em; text-transform: uppercase; color: rgba(169,214,255,0.65); z-index: 2; }
        .c33-hud-turn { color: rgba(242,233,220,0.8); }
        .c33-cover-title { position: absolute; left: 0; right: 0; top: calc(var(--u) * 11); text-align: center; font-weight: 500; letter-spacing: 0.04em; font-size: calc(calc(var(--u) * 12.5) * var(--k)); line-height: 1; color: #f2e9dc; z-index: 2; }
        .c33-cover-sub { position: absolute; left: 0; right: 0; top: calc(calc(var(--u) * 11) + calc(var(--u) * 14.5) * var(--k)); text-align: center; font-size: calc(calc(var(--u) * 2.3) * var(--k)); letter-spacing: 0.34em; text-transform: uppercase; color: rgba(169,214,255,0.8); z-index: 2; }
        .c33-cover-girl { position: absolute; left: 50%; bottom: calc(var(--u) * -3); width: calc(var(--u) * 74); transform: translateX(-50%); object-fit: contain; z-index: 1; filter: drop-shadow(0 0 30px rgba(255,122,26,0.25)); }
        .c33-cover-title.c33-static { position: static; }
        .c33-cover .c33-backcover { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 3); padding: calc(var(--u) * 10); z-index: 2; }

        .c33-nav-btn { width: 44px; height: 44px; border-radius: 99px; border: 1px solid rgba(127,212,255,0.35); font-size: 18px; color: ${C.cream}; transition: background-color 180ms cubic-bezier(0.23,1,0.32,1), opacity 180ms, transform 120ms; }
        .c33-nav-btn:active:not(:disabled) { transform: scale(0.94); }
        .c33-nav-btn:disabled { opacity: 0.3; }
        @media (hover: hover) { .c33-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); } }
        .c33-chip-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 99px; border: 1px solid transparent; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(242,233,220,0.62); transition: background-color 200ms cubic-bezier(0.23,1,0.32,1), color 200ms, border-color 200ms; }
        .c33-chip-btn[data-on='1'] { color: #f2e9dc; background: rgba(255,122,26,0.14); border-color: rgba(255,122,26,0.55); }
        @media (hover: hover) { .c33-chip-btn[data-on='0']:hover { background: rgba(255,255,255,0.06); color: #f2e9dc; } }
        .c33-nav-btn:focus-visible, .c33-chip-btn:focus-visible, .c33-toc-btn:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 2px; }
      `}</style>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { useLang } from './i18nCore'
import { C, MONO, DISPLAY, BODY } from './brand'
import { CARTA_PHOTOS, CARTA_PHOTO_BASE } from './cartaPhotos'
import { CATEGORIES, isTag } from './cartaData'

/**
 * cāpsula33 — «La carta» como la pared de cápsulas de la nave.
 *
 * Cada producto es una cápsula de hibernación, en filas por rubro («deck»). Cerradas
 * muestran su código, un ícono del rubro, el nombre y el precio; al pasar el mouse (o tocar)
 * el vidrio se destapa y se proyecta una tarjeta con la foto y la descripción.
 */

// Íconos de línea de cada rubro (viewBox 48).
const ICONS = {
  cafeteria: 'M10 18h22v10a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z M32 20h3a4 4 0 0 1 0 8h-3 M16 8c-2 2 2 3 0 6 M23 8c-2 2 2 3 0 6',
  smoothies: 'M12 14h24l-3 24a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3z M30 14l5-9 M14 23h20',
  laminados: 'M5 31c3-15 35-15 38 0-6-4-10-4-12.5 0-3-4-8-4-11 0-3-4-8-4-14.500 0z M14 21l3 8 M24 18v10 M34 21l-3 8',
  cervezas: 'M12 13h20v25a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z M32 19h5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5 M12 13c0-4 5-5 8-3 3-3 9-1 9 3 M18 21v14 M24 21v14',
  platos: 'M7 11c11-5 23-5 34 0L24 42z M19 19a2 2 0 1 0 .1 0 M29 21a2 2 0 1 0 .1 0 M23 31a2 2 0 1 0 .1 0',
  helados: 'M15 23h18L24 43z M13 23a11 11 0 0 1 22 0 M18 23c0-3 2-6 6-6',
}

/** Parte las filas de un rubro en grupos, cortando en cada subtítulo. */
function groupsOf(rows) {
  const groups = []
  let cur = { label: null, items: [] }
  rows.forEach((r) => {
    if (isTag(r)) {
      if (cur.items.length) groups.push(cur)
      cur = { label: r[1], items: [] }
    } else {
      cur.items.push({ name: r[0], price: r[1], desc: r[2], vg: r[3] })
    }
  })
  if (cur.items.length) groups.push(cur)
  return groups
}

const CARD_W = 256

export default function CartaPared() {
  const rootRef = useRef(null)
  const { t } = useLang()
  const [act, setAct] = useState(null)
  const [sheet, setSheet] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  const ptype = useRef('mouse')
  const closeT = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setSheet(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const open = (el, cat, item, code) => {
    clearTimeout(closeT.current)
    const r = el.getBoundingClientRect()
    setAct({ key: `${cat.id}:${item.name}`, cat, item, code, left: r.left, right: r.right, top: r.top, bottom: r.bottom })
  }
  const close = () => {
    clearTimeout(closeT.current)
    closeT.current = setTimeout(() => setAct(null), 60)
  }

  // Al scrollear la tarjeta se cierra (queda en otro lugar); en el teléfono, un toque afuera la cierra.
  useEffect(() => {
    if (!act) return undefined
    const onScroll = () => setAct(null)
    const onDown = (e) => {
      if (!e.target.closest?.('.c33-pod') && !e.target.closest?.('.c33-card')) setAct(null)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [act])

  // La entrada: las cápsulas se encienden de a una al llegar a cada fila.
  useGSAP(
    () => {
      const root = rootRef.current
      gsap.set(root.querySelectorAll('.c33-pod'), { autoAlpha: 0, y: 34 })
      ScrollTrigger.batch(root.querySelectorAll('.c33-pod'), {
        start: 'top 94%',
        once: true,
        onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, overwrite: true }),
      })
      gsap.fromTo(
        root.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: root, start: 'top 70%', once: true } },
      )
    },
    { scope: rootRef, dependencies: [t], revertOnUpdate: true },
  )

  let n = 0
  const card = act ? CARTA_PHOTOS[act.item.name] : null
  const cardStyle = (() => {
    if (!act) return null
    if (sheet) return { left: 12, right: 12, bottom: 12, width: 'auto', maxWidth: 460, margin: '0 auto' }
    const cx = (act.left + act.right) / 2
    const left = Math.max(12, Math.min(cx - CARD_W / 2, window.innerWidth - CARD_W - 12))
    return act.top > 380
      ? { left, bottom: window.innerHeight - act.top + 12, width: CARD_W }
      : { left, top: act.bottom + 12, width: CARD_W }
  })()

  return (
    <section ref={rootRef} id="carta" className="relative overflow-hidden" style={{ background: '#05060a', color: C.cream }}>
      {/* El fondo: el muro metálico de la bahía, con su cuadrícula y luz de techo. */}
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
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh]"
        style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(255,122,26,0.12), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-[1480px] px-5 py-20 md:px-10 lg:px-14 lg:py-28">
        <header className="max-w-[60rem]">
          <p data-in className="text-[11px] tracking-[0.24em] uppercase opacity-0" style={{ ...MONO, color: C.neon }}>
            {t('Experiencia Capsula · take-away')}
          </p>
          <h2 data-in className="mt-3 text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.02em] uppercase opacity-0" style={DISPLAY}>
            {t('La carta,')}
            <br />
            <span style={{ color: C.neon }}>{t('cápsula por cápsula.')}</span>
          </h2>
          <p data-in className="mt-5 text-[13px] tracking-[0.12em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(169,214,255,0.8)' }}>
            <span className="hidden [@media(hover:hover)]:inline">{t('Pasá el mouse sobre una cápsula para abrirla.')}</span>
            <span className="[@media(hover:hover)]:hidden">{t('Tocá una cápsula para abrirla.')}</span>
          </p>
        </header>

        <div className="mt-12 flex flex-col gap-14 md:mt-16 lg:gap-20">
          {CATEGORIES.map((cat, ci) => {
            const [c1, c2, c3] = cat.planet
            const groups = groupsOf(cat.rows)
            const total = groups.reduce((a, g) => a + g.items.length, 0)
            return (
              <div
                key={cat.id}
                className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10"
                style={{ '--c1': c1, '--c2': c2, '--c3': c3 }}
              >
                {/* El cartel del deck. */}
                <div className="flex items-start gap-5 lg:sticky lg:top-28 lg:flex-col lg:gap-4 lg:self-start">
                  <div className="min-w-0 flex-1 lg:flex-none">
                    <p className="text-[11px] tracking-[0.24em] uppercase" style={{ ...MONO, color: C.neon }}>
                      Deck 0{ci + 1}
                    </p>
                    <h3 className="mt-1 text-[clamp(1.7rem,3vw,2.5rem)] leading-[0.95] font-semibold uppercase" style={DISPLAY}>
                      {t(cat.title)}
                    </h3>
                    <p className="mt-2 text-[14px] leading-snug" style={{ ...BODY, color: 'rgba(242,233,220,0.62)' }}>
                      {t(cat.blurb)}
                    </p>
                    <p className="mt-3 text-[10.5px] tracking-[0.2em] uppercase" style={{ ...MONO, color: 'rgba(169,214,255,0.7)' }}>
                      {t('{n} productos', { n: total })}
                    </p>
                  </div>
                  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-14 shrink-0 lg:h-24 lg:w-24" fill="none" stroke={c1} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}>
                    <path d={ICONS[cat.id]} />
                  </svg>
                </div>

                {/* Las filas de cápsulas. */}
                <div className="min-w-0 space-y-8 lg:space-y-10">
                  {groups.map((g, gi) => (
                    <div key={gi}>
                      {g.label ? (
                        <span
                          className="mb-3 inline-block rounded-[2px] px-2 py-1 text-[10.5px] font-bold tracking-[0.18em] uppercase"
                          style={{ ...MONO, background: 'rgba(127,212,255,0.16)', color: '#a9d6ff' }}
                        >
                          {t(g.label)}
                        </span>
                      ) : null}
                      <div className="c33-strip" />
                      <ul className="grid grid-cols-3 gap-x-3 gap-y-6 pt-4 sm:grid-cols-4 md:grid-cols-5 md:gap-x-4 lg:grid-cols-[repeat(auto-fill,minmax(96px,1fr))]">
                        {g.items.map((it) => {
                          n += 1
                          const code = `C${String(n).padStart(2, '0')}`
                          const isOpen = !!act && act.key === `${cat.id}:${it.name}`
                          return (
                            <li key={it.name}>
                              <button
                                type="button"
                                data-open={isOpen ? '1' : '0'}
                                onPointerDown={(e) => (ptype.current = e.pointerType)}
                                onPointerEnter={(e) => e.pointerType === 'mouse' && open(e.currentTarget, cat, it, code)}
                                onPointerLeave={(e) => e.pointerType === 'mouse' && close()}
                                onFocus={(e) => open(e.currentTarget, cat, it, code)}
                                onBlur={close}
                                onClick={(e) => {
                                  if (ptype.current === 'mouse') return
                                  if (isOpen) setAct(null)
                                  else open(e.currentTarget, cat, it, code)
                                }}
                                className="c33-pod group block w-full text-left"
                                aria-label={`${t(it.name)} ${it.price || ''}`}
                              >
                                <span className="c33-pod-body block">
                                  <span className="c33-pod-top">
                                    <span className="c33-led" />
                                    <span style={MONO}>{code}</span>
                                  </span>
                                  <span className="c33-glass block">
                                    <svg viewBox="0 0 48 48" aria-hidden="true" className="c33-ico" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                      <path d={ICONS[cat.id]} />
                                    </svg>
                                    <span className="c33-frost" />
                                  </span>
                                  <span className="c33-vents" />
                                </span>
                                <span className="c33-plate block">
                                  <span className="c33-name block">
                                    {t(it.name)}
                                    {it.vg ? <span className="c33-vg">VG</span> : null}
                                  </span>
                                  {it.price ? (
                                    <span className="mt-0.5 block text-[13px] font-semibold tabular-nums" style={{ ...MONO, color: C.neon }}>
                                      {it.price}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* La tarjeta proyectada por la cápsula abierta. */}
      {act ? (
        <div
          className="c33-card pointer-events-none fixed z-50"
          style={{ ...cardStyle, '--c1': act.cat.planet[0], '--c2': act.cat.planet[1], '--c3': act.cat.planet[2] }}
          role="status"
        >
          <div className="p-2.5" style={{ background: 'rgba(4,5,10,0.95)', border: '1px solid rgba(127,212,255,0.45)', boxShadow: '0 18px 50px rgba(0,0,0,0.65), 0 0 30px rgba(255,122,26,0.18)' }}>
            <div className={`relative w-full overflow-hidden ${sheet ? 'aspect-[16/8]' : 'aspect-[4/3]'}`} style={{ background: '#0b0c0f' }}>
              {card ? (
                <img src={`${CARTA_PHOTO_BASE}${card}`} alt={t(act.item.name)} className="absolute inset-0 h-full w-full object-cover" draggable="false" />
              ) : (
                <div className="c33-glass absolute inset-0 grid place-items-center" style={{ borderRadius: 0 }}>
                  <span className="text-center">
                    <svg viewBox="0 0 48 48" aria-hidden="true" className="mx-auto h-14 w-14" fill="none" stroke={act.cat.planet[0]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                      <path d={ICONS[act.cat.id]} />
                    </svg>
                    <span className="mt-2 block text-[10px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.65)' }}>
                      {t('Foto en camino')}
                    </span>
                  </span>
                </div>
              )}
              <span aria-hidden="true" className="c33-photo-scan pointer-events-none absolute inset-0" />
              {['top-1.5 left-1.5 border-t border-l', 'top-1.5 right-1.5 border-t border-r', 'bottom-1.5 left-1.5 border-b border-l', 'right-1.5 bottom-1.5 border-r border-b'].map((c) => (
                <span key={c} aria-hidden="true" className={`absolute h-3 w-3 ${c}`} style={{ borderColor: C.neon }} />
              ))}
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-[16px] leading-tight font-medium" style={BODY}>
                {t(act.item.name)}
              </p>
              {act.item.price ? (
                <span className="shrink-0 text-[16px] font-semibold tabular-nums" style={{ ...MONO, color: C.neon }}>
                  {act.item.price}
                </span>
              ) : null}
            </div>
            {act.item.desc ? (
              <p className="mt-1.5 text-[12.5px] leading-[1.4]" style={{ ...BODY, color: 'rgba(242,233,220,0.62)' }}>
                {t(act.item.desc)}
              </p>
            ) : null}
            <p className="mt-2 text-[9.5px] tracking-[0.2em] uppercase" style={{ ...MONO, color: 'rgba(169,214,255,0.7)' }}>
              {act.code} · {t(act.cat.title)}
              {act.item.vg ? ' · VG' : ''}
            </p>
          </div>
        </div>
      ) : null}

      <style>{`
        .c33-strip { height: 3px; border-radius: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--c2) 80%, transparent), color-mix(in srgb, var(--c2) 15%, transparent) 70%, transparent); box-shadow: 0 6px 22px color-mix(in srgb, var(--c2) 40%, transparent); }
        .c33-pod { cursor: default; -webkit-tap-highlight-color: transparent; }
        .c33-pod:focus-visible { outline: 2px solid ${C.neon}; outline-offset: 4px; border-radius: 16px; }
        .c33-pod-body {
          position: relative; aspect-ratio: 3 / 4.1; padding: 22% 9% 13%;
          border-radius: 22px 22px 14px 14px;
          background: linear-gradient(165deg, #2f3641, #161a20 55%, #0d1014);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 14px 26px rgba(0,0,0,0.55);
          transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .c33-pod-top { position: absolute; top: 7%; left: 11%; right: 11%; display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; letter-spacing: 0.14em; color: rgba(242,233,220,0.5); }
        .c33-led { width: 6px; height: 6px; border-radius: 99px; background: var(--c2); box-shadow: 0 0 8px var(--c2); animation: c33-led 2.6s ease-in-out infinite; }
        @keyframes c33-led { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .c33-glass {
          position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 16px 16px 8px 8px;
          background: radial-gradient(ellipse at 50% 28%, color-mix(in srgb, var(--c2) 62%, transparent), color-mix(in srgb, var(--c3) 88%, #05060a) 68%, #05060a);
          box-shadow: inset 0 0 22px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.65);
        }
        .c33-glass::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255,255,255,0.16), transparent 38%); pointer-events: none; }
        .c33-ico { position: absolute; left: 50%; top: 50%; width: 52%; z-index: 0; transform: translate(-50%, -50%); stroke: var(--c1); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c1) 70%, transparent)); transition: transform 420ms cubic-bezier(0.23, 1, 0.32, 1), filter 320ms; }
        .c33-frost { position: absolute; inset: 0; z-index: 1; background: repeating-linear-gradient(to bottom, rgba(8,10,14,0.0) 0 5px, rgba(0,0,0,0.38) 5px 6px), linear-gradient(to bottom, rgba(10,12,16,0.62), rgba(18,22,28,0.52)); transition: transform 460ms cubic-bezier(0.77, 0, 0.18, 1); }
        .c33-vents { position: absolute; left: 20%; right: 20%; bottom: 4.5%; height: 5px; background: repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 6px); opacity: 0.6; }
        .c33-plate { padding: 10px 2px 0; }
        .c33-name { font-size: 13px; line-height: 1.2; font-weight: 500; color: rgba(242,233,220,0.94); overflow-wrap: anywhere; }
        .c33-vg { margin-left: 6px; border: 1px solid rgba(242,233,220,0.4); border-radius: 2px; padding: 0 3px; font-size: 8.5px; font-weight: 700; vertical-align: middle; font-family: 'Roboto Mono', ui-monospace, monospace; }
        @media (hover: hover) and (pointer: fine) { .c33-pod:hover .c33-pod-body { transform: translateY(-7px); } }
        .c33-pod[data-open='1'] .c33-pod-body { transform: translateY(-7px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 34px rgba(0,0,0,0.55), 0 0 34px color-mix(in srgb, var(--c2) 50%, transparent); border-color: color-mix(in srgb, var(--c2) 70%, transparent); }
        .c33-pod[data-open='1'] .c33-frost { transform: translateY(-101%); }
        .c33-pod[data-open='1'] .c33-ico { transform: translate(-50%, -50%) scale(1.14); filter: drop-shadow(0 0 12px var(--c1)); }
        .c33-pod[data-open='1'] .c33-name { color: #fff; }
        .c33-card { animation: c33-card-in 220ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        @keyframes c33-card-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } }
        .c33-photo-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.16) 2px 3px); mix-blend-mode: multiply; }
      `}</style>
    </section>
  )
}

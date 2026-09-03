import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { LD_STAGE_CLASS_HERO, LD_CURSOR_STYLE } from './labDemoKit'
import { formatArs } from '../lib/pricing'

/**
 * BuilderDemo — demo animado del Builder (pago único). Elegís secciones del
 * catálogo → el lienzo se arma → el precio sube → comprás → te llevás el ZIP.
 * Réplica chata de la UI real de /builder (paleta propia que flipea con el
 * tema, ver `--ld-*` en src/index.css). Grande y centrado en la home.
 *
 * Una `gsap.timeline({ repeat: -1 })`, puntero falso, respeta
 * `prefers-reduced-motion` y solo corre en pantalla (IntersectionObserver).
 */

// Montos ARS acumulados (demo — el precio real lo calcula /builder + fx).
const CARDS = [
  {
    name: 'Nav Minimal',
    kind: 'NAV',
    step: 'nav',
    blurb: 'Header fijo que invierte sobre cualquier fondo',
    price: 190000,
  },
  {
    name: 'Hero Kinetic',
    kind: 'HERO',
    step: 'hero',
    blurb: 'Tipografía enorme que sube desde máscaras',
    price: 245000,
  },
  {
    name: 'Manifesto Reveal',
    kind: 'SECCIÓN',
    step: 'sec',
    blurb: 'Párrafo gigante que se entinta palabra por palabra',
    price: 300000,
  },
  {
    name: 'Big Numbers',
    kind: 'SECCIÓN',
    step: 'sec',
    blurb: 'Contadores que suben al entrar en pantalla',
    price: 360000,
  },
  {
    name: 'Footer CTA',
    kind: 'FOOTER',
    step: 'footer',
    blurb: 'Palabra de cierre a pantalla completa',
    price: 425000,
  },
]

const STEPS = [
  ['nav', 'Nav'],
  ['hero', 'Hero'],
  ['sec', 'Secciones'],
  ['footer', 'Cierre'],
]

const FILES = [
  'index.html',
  'package.json',
  'vite.config.js',
  'src/App.jsx',
  'src/index.css',
  'src/components/NavMinimal.jsx',
  'src/components/HeroKinetic.jsx',
  'README.md',
]

const PRICE = (n) => formatArs(n)

export default function BuilderDemo() {
  const root = useRef(null)

  useGSAP(
    () => {
      const stage = root.current
      if (!stage) return

      const q = gsap.utils.selector(stage)
      const cursor = q('[data-cursor]')[0]
      const hl = q('[data-hl]')[0]
      const scene = q('[data-scene]')[0]

      const rectOf = (sel) => {
        const el = q(sel)[0]
        if (!el) return { x: 0, y: 0, w: 0, h: 0 }
        const s = stage.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }
      }

      const setText = (sel, str) => {
        const el = q(sel)[0]
        if (el) el.textContent = str
      }

      const reset = () => {
        gsap.set(hl, { autoAlpha: 0 })
        gsap.set(q('[data-check]'), { autoAlpha: 0, scale: 0.5 })
        gsap.set(q('[data-row-add]'), { autoAlpha: 0 })
        gsap.set(q('[data-crow]'), { autoAlpha: 0, x: -10 })
        gsap.set(q('[data-step-dot]'), { color: 'var(--ld-faint)' })
        gsap.set(q('[data-paid]'), { autoAlpha: 0, y: 8 })
        gsap.set(q('[data-zip]'), { autoAlpha: 0, xPercent: 14 })
        gsap.set(q('[data-file]'), { autoAlpha: 0, x: -6 })
        gsap.set(q('[data-canvas-empty]'), { autoAlpha: 1 })
        setText('[data-price]', PRICE(0))
        setText('[data-count]', '0 secciones')
      }

      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduced) {
        reset()
        gsap.set(q('[data-check]'), { autoAlpha: 1, scale: 1 })
        gsap.set(q('[data-row-add]'), { autoAlpha: 1 })
        gsap.set(q('[data-crow]'), { autoAlpha: 1, x: 0 })
        gsap.set(q('[data-step-dot]'), { color: 'var(--ld-accent)' })
        gsap.set(q('[data-paid]'), { autoAlpha: 1, y: 0 })
        gsap.set(q('[data-zip]'), { autoAlpha: 1, xPercent: 0 })
        gsap.set(q('[data-file]'), { autoAlpha: 1, x: 0 })
        gsap.set(q('[data-canvas-empty]'), { autoAlpha: 0 })
        setText('[data-price]', PRICE(CARDS[CARDS.length - 1].price))
        setText('[data-count]', `${CARDS.length} secciones`)
        return
      }

      reset()

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.3,
        paused: true,
        defaults: { ease: 'power3.inOut' },
      })

      const point = (sel, at) =>
        tl.to(
          cursor,
          {
            duration: 0.5,
            ease: 'power2.inOut',
            x: () => rectOf(sel).x + rectOf(sel).w * 0.5,
            y: () => rectOf(sel).y + rectOf(sel).h * 0.5,
          },
          at,
        )

      const focus = (sel, at) =>
        tl.to(
          hl,
          {
            duration: 0.32,
            autoAlpha: 1,
            x: () => rectOf(sel).x - 5,
            y: () => rectOf(sel).y - 5,
            width: () => rectOf(sel).w + 10,
            height: () => rectOf(sel).h + 10,
          },
          at,
        )

      const clickPulse = (at) =>
        tl.to(cursor, { duration: 0.09, scale: 0.78, yoyo: true, repeat: 1 }, at)

      const priceTo = (n, at) => {
        const cur = Number(
          q('[data-price]')[0]?.textContent.replace(/\D/g, '') || 0,
        )
        const proxy = { v: cur }
        return tl.to(
          proxy,
          {
            v: n,
            duration: 0.4,
            ease: 'power1.out',
            onUpdate: () => setText('[data-price]', PRICE(Math.round(proxy.v))),
          },
          at,
        )
      }

      gsap.set(cursor, {
        x: stage.clientWidth * 0.24,
        y: stage.clientHeight - 26,
      })

      // 1 · agregar secciones, una por una
      CARDS.forEach((card, i) => {
        point(`[data-add="${i}"]`, i === 0 ? 0.5 : '>+0.15')
        focus(`[data-add="${i}"]`, '<0.1')
        clickPulse('>-0.05')
        tl.to(
          q(`[data-check="${i}"]`),
          { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'back.out(3)' },
          '>-0.05',
        )
        tl.to(
          q(`[data-row-add="${i}"]`),
          { autoAlpha: 1, duration: 0.25 },
          '<',
        )
        if (i === 0) tl.to(q('[data-canvas-empty]'), { autoAlpha: 0, duration: 0.2 }, '<')
        tl.to(
          q(`[data-crow="${i}"]`),
          { autoAlpha: 1, x: 0, duration: 0.3 },
          '<',
        )
        tl.add(
          () =>
            gsap.set(q(`[data-step-dot="${card.step}"]`), {
              color: 'var(--ld-accent)',
            }),
          '<',
        )
        tl.add(() => setText('[data-count]', `${i + 1} secciones`), '<')
        priceTo(card.price, '<')
      })

      // 2 · comprar
      point('[data-buy]', '>0.2')
      focus('[data-buy]', '<0.1')
      clickPulse('>-0.05')
      tl.to(q('[data-paid]'), { autoAlpha: 1, y: 0, duration: 0.3 }, '>')

      // 3 · te llevás el ZIP
      tl.to(hl, { autoAlpha: 0, duration: 0.3 }, '<')
      tl.to(
        q('[data-zip]'),
        { autoAlpha: 1, xPercent: 0, duration: 0.5, ease: 'power3.out' },
        '<0.1',
      )
      tl.to(
        q('[data-file]'),
        { autoAlpha: 1, x: 0, duration: 0.22, stagger: 0.06 },
        '>-0.1',
      )

      // 4 · hold + reset
      tl.to({}, { duration: 1.9 })
      tl.to(scene, { autoAlpha: 0, duration: 0.4 })
      tl.add(reset)
      tl.to(scene, { autoAlpha: 1, duration: 0.4 })
      tl.eventCallback('onRepeat', () => tl.invalidate())

      const io = new IntersectionObserver(
        ([e]) => (e.isIntersecting ? tl.play() : tl.pause()),
        { threshold: 0.25 },
      )
      io.observe(stage)

      return () => {
        io.disconnect()
        tl.kill()
      }
    },
    { scope: root },
  )

  return (
    <figure className="m-0">
      <div
        ref={root}
        data-stage
        className={LD_STAGE_CLASS_HERO}
        aria-hidden="true"
      >
        <p className="sr-only">
          Demostración animada del Builder: se agregan cinco secciones del
          catálogo, el lienzo y el precio se arman, se compra y se descarga el
          proyecto como ZIP.
        </p>

        <div
          data-scene
          className="absolute inset-0 p-4 text-[var(--ld-ink)] sm:p-6 md:p-8"
        >
          {/* Ventana B — la descarga (detrás, a la derecha) */}
          <div
            data-zip
            className="absolute right-0 top-10 bottom-10 hidden w-[40%] flex-col overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_18px_45px_rgba(0,0,0,0.28)] lg:flex"
          >
            <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[var(--ld-line)] bg-[var(--ld-chrome)] px-3.5">
              <span className="h-2 w-2 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--ld-line2)]" />
              <span className="ml-2 truncate text-[11px] tracking-[0.05em] text-[var(--ld-soft)]">
                mi-plantilla.zip
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3.5 px-5 font-mono text-[12px] text-[var(--ld-soft)]">
              {FILES.map((f) => (
                <p key={f} data-file className="truncate">
                  {f}
                </p>
              ))}
            </div>
            <div className="border-t border-[var(--ld-line)] px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-[var(--ld-faint)]">
              Es tuyo · código abierto · sin atadura
            </div>
          </div>

          {/* Ventana A — el Builder (adelante) */}
          <div className="absolute inset-y-0 left-0 z-10 flex w-full flex-col overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_26px_60px_rgba(0,0,0,0.24)] lg:w-[64%]">
            <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[var(--ld-line)] bg-[var(--ld-chrome)] px-3.5">
              <span className="h-2 w-2 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--ld-line2)]" />
              <span className="ml-2 text-[11px] tracking-[0.18em] text-[var(--ld-faint)] uppercase">
                scrolllab · Builder
              </span>
            </div>

            <div className="flex min-h-0 flex-1">
              {/* Catálogo de secciones */}
              <div className="flex w-[52%] shrink-0 flex-col border-r border-[var(--ld-line)] p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--ld-accent)]" />
                  <p className="text-[12px] font-medium tracking-[0.14em]">
                    CHAPTERS
                  </p>
                  <span className="ml-auto text-[10px] tracking-[0.2em] text-[var(--ld-faint)]">
                    Editorial cinético
                  </span>
                </div>
                <div className="flex flex-1 flex-col">
                  {CARDS.map((card, i) => (
                    <div
                      key={card.name}
                      className="relative flex flex-1 items-center gap-3 border-b border-[var(--ld-line)] pr-1"
                    >
                      <div
                        data-row-add={i}
                        className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--ld-accent)_7%,transparent)]"
                      />
                      <span
                        aria-hidden="true"
                        className="relative grid size-5 shrink-0 place-items-center text-[12px] text-[var(--ld-faint)]"
                      >
                        ⠿
                        <span
                          data-check={i}
                          className="absolute inset-0 grid place-items-center border border-[var(--ld-ok-line)] bg-[var(--ld-surface)] text-[11px] text-[var(--ld-ok)]"
                        >
                          ✓
                        </span>
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <p className="flex items-baseline gap-2 text-[12.5px] font-medium">
                          <span className="truncate">{card.name}</span>
                          <span className="shrink-0 text-[8.5px] tracking-[0.22em] text-[var(--ld-faint)]">
                            {card.kind}
                          </span>
                        </p>
                        <p className="truncate text-[10px] text-[var(--ld-soft)]">
                          {card.blurb}
                        </p>
                      </div>
                      <span
                        data-add={i}
                        className="relative shrink-0 border border-[var(--ld-line2)] px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[var(--ld-soft)]"
                      >
                        Añadir
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lienzo + precio */}
              <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ld-faint)]">
                  Tu página · <span data-count>0 secciones</span>
                </p>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] uppercase tracking-[0.16em] text-[var(--ld-faint)]">
                  {STEPS.map(([key, label]) => (
                    <span
                      key={key}
                      data-step-dot={key}
                      className="flex items-center gap-1"
                      style={{ color: 'var(--ld-faint)' }}
                    >
                      <span aria-hidden="true">●</span>
                      {label}
                    </span>
                  ))}
                </div>

                <div className="relative mt-3 flex-1 border-t border-[var(--ld-line)] pt-3">
                  <p
                    data-canvas-empty
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10.5px] text-[var(--ld-faint)]"
                  >
                    Arrastrá o tocá “Añadir”
                  </p>
                  <div className="flex h-full flex-col gap-2">
                    {CARDS.map((card, i) => (
                      <div
                        key={card.name}
                        data-crow={i}
                        className="flex flex-1 items-center gap-2.5 border border-[var(--ld-line)] bg-[var(--ld-bg)] px-2.5"
                      >
                        <span className="w-6 shrink-0 text-[10px] tracking-[0.18em] text-[var(--ld-faint)]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--ld-accent)]" />
                        <span className="truncate text-[11.5px] font-medium">
                          {card.name}
                        </span>
                        <span className="ml-auto shrink-0 text-[8.5px] uppercase tracking-[0.18em] text-[var(--ld-faint)]">
                          Chapters · {card.kind}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--ld-line)] pt-3">
                  <span className="font-mono text-[15px] font-medium tabular-nums">
                    <span data-price>$ 0</span>
                  </span>
                  <span
                    data-buy
                    className="bg-[var(--ld-ink)] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ld-surface)]"
                  >
                    Comprar ahora
                  </span>
                </div>
              </div>
            </div>

            {/* overlay: pago aprobado */}
            <div
              data-paid
              className="absolute bottom-4 left-4 flex items-center gap-1.5 border border-[var(--ld-ok-line)] bg-[var(--ld-ok-bg)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ld-ok)]"
            >
              ✓ Pago aprobado · Mercado Pago
            </div>
          </div>

          {/* recuadro de foco + puntero falso */}
          <div
            data-hl
            className="pointer-events-none absolute left-0 top-0 rounded border-2 border-[var(--ld-accent)] bg-[color-mix(in_srgb,var(--ld-accent)_8%,transparent)]"
            style={{ opacity: 0 }}
          />
          <svg
            data-cursor
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-0 top-0 z-20 h-6 w-6 drop-shadow"
            style={LD_CURSOR_STYLE}
          >
            <path d="M4 2l7 18 2.5-7L21 10.5 4 2z" />
          </svg>
        </div>
      </div>
    </figure>
  )
}

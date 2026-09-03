import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { LD_STAGE_CLASS, LD_CURSOR_STYLE } from './labDemoKit'

/**
 * LabDemoSync — segundo demo animado de LAB (compañero de LabDemo).
 *
 * Historia: editás la palabra CTA UNA vez en LAB y se actualiza en todos los
 * sitios donde el <script> esté pegado. Ventana de LAB a la izquierda, tres
 * mini-navegadores a la derecha que reciben el cambio en cascada.
 *
 * Misma mecánica que LabDemo: una `gsap.timeline({ repeat: -1 })`, puntero
 * falso, tipeo carácter por carácter, respeta `prefers-reduced-motion` y solo
 * corre en pantalla (IntersectionObserver). Paleta fija (labDemoKit).
 */

const OLD_TEXT = 'EMPECEMOS'
const NEW_TEXT = 'HABLEMOS'
const SITES = ['micliente.com', 'blog.taller.co', 'agencia.studio']

export default function LabDemoSync() {
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
        gsap.set(q('[data-ok]'), { autoAlpha: 0, scale: 0.6 })
        setText('[data-type-field]', OLD_TEXT)
        SITES.forEach((_, i) => setText(`[data-site-word="${i}"]`, OLD_TEXT))
      }

      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduced) {
        reset()
        setText('[data-type-field]', NEW_TEXT)
        SITES.forEach((_, i) => setText(`[data-site-word="${i}"]`, NEW_TEXT))
        gsap.set(q('[data-ok]'), { autoAlpha: 1, scale: 1 })
        return
      }

      reset()

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.2,
        paused: true,
        defaults: { ease: 'power3.inOut' },
      })

      const point = (sel, at) =>
        tl.to(
          cursor,
          {
            duration: 0.6,
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
            duration: 0.4,
            autoAlpha: 1,
            x: () => rectOf(sel).x - 5,
            y: () => rectOf(sel).y - 5,
            width: () => rectOf(sel).w + 10,
            height: () => rectOf(sel).h + 10,
          },
          at,
        )

      // Tipeo carácter por carácter en `sel`.
      const type = (sel, str, at) => {
        const proxy = { n: 0 }
        return tl.to(
          proxy,
          {
            n: str.length,
            duration: Math.max(0.5, str.length * 0.06),
            ease: 'none',
            onUpdate: () => setText(sel, str.slice(0, Math.round(proxy.n))),
          },
          at,
        )
      }

      // Fan-out a los 3 sitios, con retardo escalonado — se ve la propagación.
      const propagate = (str, at) => {
        SITES.forEach((_, i) => {
          const proxy = { n: 0 }
          tl.to(
            proxy,
            {
              n: str.length,
              duration: Math.max(0.4, str.length * 0.06),
              ease: 'none',
              onUpdate: () =>
                setText(`[data-site-word="${i}"]`, str.slice(0, Math.round(proxy.n))),
            },
            `${at}+=${i * 0.16}`,
          )
          tl.fromTo(
            q(`[data-ok="${i}"]`),
            { autoAlpha: 0, scale: 0.6 },
            { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' },
            `>-0.1`,
          )
        })
      }

      gsap.set(cursor, {
        x: stage.clientWidth * 0.5,
        y: stage.clientHeight - 22,
      })

      // 1 · ir al campo, "seleccionar" y borrar
      point('[data-field]', 0.4)
      focus('[data-field]', '-=0.15')
      tl.to(q('[data-field]'), {
        duration: 0.14,
        backgroundColor: 'rgba(255,75,0,0.12)',
        yoyo: true,
        repeat: 1,
      })
      tl.add(() => setText('[data-type-field]', ''))

      // 2 · retipear el nuevo texto
      const typeStart = tl.duration()
      type('[data-type-field]', NEW_TEXT, typeStart)

      // 3 · propagación a los 3 sitios, en cascada
      propagate(NEW_TEXT, '>-0.1')

      // 4 · hold + reset
      tl.to(hl, { autoAlpha: 0, duration: 0.3 }, '>0.2')
      tl.to({}, { duration: 1.6 })
      tl.to(scene, { autoAlpha: 0, duration: 0.4 })
      tl.add(reset)
      tl.to(scene, { autoAlpha: 1, duration: 0.4 })
      tl.eventCallback('onRepeat', () => tl.invalidate())

      const io = new IntersectionObserver(
        ([e]) => (e.isIntersecting ? tl.play() : tl.pause()),
        { threshold: 0.3 },
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
      <figcaption className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink/45">
        Editás una vez, cambia en todos lados
      </figcaption>
      <div
        ref={root}
        data-stage
        className={LD_STAGE_CLASS}
        aria-hidden="true"
      >
        <p className="sr-only">
          Demostración animada: se cambia la palabra CTA una sola vez en el
          panel de LAB y el nuevo texto se propaga a tres sitios distintos que
          tienen el mismo embed.
        </p>

        <div
          data-scene
          className="absolute inset-0 flex gap-3 p-4 text-[var(--ld-ink)] sm:p-6"
        >
          {/* Ventana de LAB */}
          <div className="flex w-[46%] shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="flex h-7 shrink-0 items-center gap-1.5 bg-[var(--ld-chrome)] px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="ml-2 text-[10px] tracking-[0.15em] text-[var(--ld-faint)] uppercase">
                scrolllab · LAB
              </span>
            </div>
            <div className="flex-1 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] uppercase tracking-[0.24em] text-[var(--ld-faint)]">
                  ‹ Mis secciones
                </span>
                <span className="border border-[var(--ld-ok-line)] bg-[var(--ld-ok-bg)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-[var(--ld-ok)]">
                  Publicado
                </span>
              </div>
              <p className="mt-2 text-[13px] font-medium">Outro CTA</p>
              <p className="mt-0.5 font-mono text-[9px] text-[var(--ld-soft)]">
                nocturne/OutroCTA
              </p>
              <label className="mt-4 block">
                <span className="text-[8px] uppercase tracking-[0.22em] text-[var(--ld-faint)]">
                  Palabra CTA
                </span>
                <span
                  data-field
                  className="mt-1 flex w-full items-center border border-[var(--ld-line2)] px-2.5 py-2"
                >
                  <span
                    data-type-field
                    className="font-mono text-[12px] text-[var(--ld-ink)]"
                  >
                    {OLD_TEXT}
                  </span>
                  <span className="inline-block h-3.5 w-px animate-pulse bg-[var(--ld-soft)]" />
                </span>
              </label>
              <p className="mt-4 text-[9.5px] leading-relaxed text-[var(--ld-faint)]">
                Se guarda una vez. El <code className="font-mono">&lt;script&gt;</code>{' '}
                ya pegado toma el cambio solo.
              </p>
            </div>
          </div>

          {/* Tres mini-navegadores */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {SITES.map((host, i) => (
              <div
                key={host}
                data-site={i}
                className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
              >
                <div className="flex h-5 shrink-0 items-center gap-1 bg-[var(--ld-chrome)] px-2">
                  <span className="h-1 w-1 rounded-full bg-[var(--ld-line2)]" />
                  <span className="h-1 w-1 rounded-full bg-[var(--ld-line2)]" />
                  <span className="ml-1.5 truncate text-[8px] tracking-[0.05em] text-[var(--ld-soft)]">
                    {host}
                  </span>
                  <span
                    data-ok={i}
                    className="ml-auto flex items-center gap-0.5 text-[8px] font-medium uppercase tracking-[0.15em] text-[var(--ld-ok)]"
                  >
                    ✓ actualizado
                  </span>
                </div>
                <div className="flex flex-1 items-center bg-[var(--ld-band)] px-3">
                  <span
                    data-site-word={i}
                    className="block font-brico text-[clamp(0.8rem,2.4vw,1.35rem)] font-extrabold leading-none tracking-[-0.02em] text-[var(--ld-band-ink)] uppercase"
                  >
                    {OLD_TEXT}
                  </span>
                </div>
              </div>
            ))}
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
            className="pointer-events-none absolute left-0 top-0 z-20 h-5 w-5 drop-shadow"
            style={LD_CURSOR_STYLE}
          >
            <path d="M4 2l7 18 2.5-7L21 10.5 4 2z" />
          </svg>
        </div>
      </div>
    </figure>
  )
}

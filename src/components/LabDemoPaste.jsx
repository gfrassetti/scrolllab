import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { LD_STAGE_CLASS, LD_CURSOR_STYLE } from './labDemoKit'
import { useI18n } from '../i18n'

/**
 * LabDemoPaste — tercer demo animado de LAB (paso 03: pegar el script en el
 * HTML). Literal a la copia del paso: un archivo `index.html`, la línea del
 * `<script>` aparece justo antes de `</body>`, y la sección se renderiza en
 * un preview debajo. Mismo patrón que LabDemo/LabDemoCopy.
 *
 * Sigue el tema (`--ld-*`) y el idioma del sitio (COPY). Una
 * `gsap.timeline({ repeat: -1 })`, puntero falso, respeta
 * `prefers-reduced-motion` y solo corre en pantalla.
 */

const SNIPPET_LINE =
  '<script src="https://embed.scrolllab.com.ar/v1/loader.js" data-scrolllab data-key="pub_3f9a…" async></script>'

const COPY = {
  es: {
    caption: 'Lo pegás en tu HTML',
    sr: 'Demostración animada: se pega el snippet en el HTML justo antes de </body> y la sección publicada aparece renderizada en el preview de abajo.',
    fileLabel: 'index.html',
    footerLine: '<footer>…</footer>',
    beforeBody: '</body>',
    previewLabel: 'Preview',
    previewEmpty: 'Sin sección todavía',
    word: 'EMPECEMOS',
  },
  en: {
    caption: 'Paste it into your HTML',
    sr: 'Animated demo: the snippet is pasted into the HTML right before </body> and the published section appears rendered in the preview below.',
    fileLabel: 'index.html',
    footerLine: '<footer>…</footer>',
    beforeBody: '</body>',
    previewLabel: 'Preview',
    previewEmpty: 'No section yet',
    word: 'GET STARTED',
  },
}

export default function LabDemoPaste() {
  const root = useRef(null)
  const { locale } = useI18n()
  const c = COPY[locale === 'en' ? 'en' : 'es']

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
        gsap.set(q('[data-line]'), { autoAlpha: 0 })
        gsap.set(q('[data-preview-embed]'), { autoAlpha: 0, scale: 0.97 })
        gsap.set(q('[data-preview-empty]'), { autoAlpha: 1 })
        setText('[data-type-line]', '')
      }

      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduced) {
        reset()
        gsap.set(q('[data-line]'), { autoAlpha: 1 })
        setText('[data-type-line]', SNIPPET_LINE)
        gsap.set(q('[data-preview-embed]'), { autoAlpha: 1, scale: 1 })
        gsap.set(q('[data-preview-empty]'), { autoAlpha: 0 })
        return
      }

      reset()

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.3,
        paused: true,
        defaults: { ease: 'power3.inOut' },
      })

      gsap.set(cursor, {
        x: stage.clientWidth * 0.3,
        y: stage.clientHeight - 20,
      })

      // 1 · la línea vacía aparece antes de </body>, el cursor la "escribe"
      tl.to(
        cursor,
        {
          duration: 0.5,
          x: () => rectOf('[data-line]').x + 24,
          y: () => rectOf('[data-line]').y + rectOf('[data-line]').h * 0.5,
        },
        0.3,
      )
      tl.to(
        hl,
        {
          duration: 0.3,
          autoAlpha: 1,
          x: () => rectOf('[data-line]').x - 4,
          y: () => rectOf('[data-line]').y - 3,
          width: () => rectOf('[data-line]').w + 8,
          height: () => rectOf('[data-line]').h + 6,
        },
        '<',
      )
      tl.to(q('[data-line]'), { autoAlpha: 1, duration: 0.15 }, '>-0.1')

      const proxy = { n: 0 }
      tl.to(
        proxy,
        {
          n: SNIPPET_LINE.length,
          duration: Math.max(0.7, SNIPPET_LINE.length * 0.02),
          ease: 'none',
          onUpdate: () =>
            setText('[data-type-line]', SNIPPET_LINE.slice(0, Math.round(proxy.n))),
        },
        '>-0.05',
      )

      // 2 · la sección aparece en el preview
      tl.to(hl, { autoAlpha: 0, duration: 0.25 }, '>0.1')
      tl.to(q('[data-preview-empty]'), { autoAlpha: 0, duration: 0.2 }, '<')
      tl.fromTo(
        q('[data-preview-embed]'),
        { autoAlpha: 0, scale: 0.97 },
        { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' },
        '<0.05',
      )

      // 3 · hold + reset
      tl.to({}, { duration: 1.8 })
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
        {c.caption}
      </figcaption>
      <div ref={root} data-stage className={LD_STAGE_CLASS} aria-hidden="true">
        <p className="sr-only">{c.sr}</p>

        <div
          data-scene
          className="absolute inset-0 flex items-center justify-center p-5 text-[var(--ld-ink)] sm:p-6"
        >
          <div className="w-full max-w-[320px] overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="flex h-7 items-center gap-1.5 bg-[var(--ld-chrome)] px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="ml-2 font-mono text-[10px] tracking-[0.05em] text-[var(--ld-faint)]">
                {c.fileLabel}
              </span>
            </div>

            <div className="p-3">
              <pre className="font-mono text-[8.5px] leading-relaxed text-[var(--ld-faint)]">
                {c.footerLine}
              </pre>
              <div
                data-line
                className="relative my-1 overflow-hidden rounded bg-[color-mix(in_srgb,var(--ld-accent)_12%,transparent)] px-1 py-0.5"
                style={{ opacity: 0 }}
              >
                <span
                  data-type-line
                  className="block truncate font-mono text-[7.5px] leading-relaxed text-[var(--ld-ink)]"
                />
              </div>
              <pre className="font-mono text-[8.5px] leading-relaxed text-[var(--ld-faint)]">
                {c.beforeBody}
              </pre>
            </div>

            <div className="border-t border-[var(--ld-line)] p-3">
              <p className="mb-1.5 text-[8px] uppercase tracking-[0.24em] text-[var(--ld-faint)]">
                {c.previewLabel}
              </p>
              <div className="relative flex h-16 items-center justify-center overflow-hidden rounded border border-[var(--ld-line)] bg-[var(--ld-band)]">
                <span
                  data-preview-empty
                  className="text-[9px] text-[var(--ld-band-ink)]/40"
                >
                  {c.previewEmpty}
                </span>
                <span
                  data-preview-embed
                  className="absolute font-brico text-[15px] font-extrabold uppercase leading-none tracking-[-0.02em] text-[var(--ld-band-ink)]"
                  style={{ opacity: 0 }}
                >
                  {c.word}
                </span>
              </div>
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

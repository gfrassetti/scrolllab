import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { LD_STAGE_CLASS, LD_CURSOR_STYLE } from './labDemoKit'
import { useI18n } from '../i18n'

/**
 * LabDemoCopy — tercer demo animado de LAB (paso 02: copiar el script).
 *
 * Historia: la card de la sección publicada tiene un snippet y un botón
 * Copiar; al hacer click, el snippet flashea y el botón se convierte en la
 * confirmación "Copiado". Un solo panel, más simple que LabDemo/LabDemoSync
 * a propósito — vive apretado en una de tres columnas.
 *
 * Sigue el tema (`--ld-*`) y el idioma del sitio (COPY). Una
 * `gsap.timeline({ repeat: -1 })`, puntero falso, respeta
 * `prefers-reduced-motion` y solo corre en pantalla.
 */

const SNIPPET = `<script src="https://embed.scrolllab.com.ar/v1/loader.js"
  data-scrolllab data-key="pub_3f9a…" async></script>`

const COPY = {
  es: {
    caption: 'Copiás el script',
    sr: 'Demostración animada: se hace clic en Copiar sobre el snippet de la sección publicada y aparece la confirmación de copiado.',
    cardTitle: 'nocturne/OutroCTA',
    cardBadge: 'PUBLICADO',
    label: 'Tu snippet',
    copyBtn: 'Copiar',
    copiedBtn: '✓ Copiado',
  },
  en: {
    caption: 'Copy the script',
    sr: 'Animated demo: clicking Copy on the published section snippet triggers a copied confirmation.',
    cardTitle: 'nocturne/OutroCTA',
    cardBadge: 'PUBLISHED',
    label: 'Your snippet',
    copyBtn: 'Copy',
    copiedBtn: '✓ Copied',
  },
}

export default function LabDemoCopy() {
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

      const reset = () => {
        gsap.set(hl, { autoAlpha: 0 })
        gsap.set(q('[data-copy-btn]'), { autoAlpha: 1 })
        gsap.set(q('[data-copied]'), { autoAlpha: 0, scale: 0.7 })
        gsap.set(q('[data-flash]'), { opacity: 0 })
      }

      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduced) {
        reset()
        gsap.set(q('[data-copy-btn]'), { autoAlpha: 0 })
        gsap.set(q('[data-copied]'), { autoAlpha: 1, scale: 1 })
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
        x: stage.clientWidth * 0.5,
        y: stage.clientHeight - 20,
      })

      // 1 · apuntar y hacer foco sobre el botón
      tl.to(
        cursor,
        {
          duration: 0.6,
          ease: 'power2.inOut',
          x: () => rectOf('[data-copy-btn]').x + rectOf('[data-copy-btn]').w * 0.5,
          y: () => rectOf('[data-copy-btn]').y + rectOf('[data-copy-btn]').h * 0.5,
        },
        0.4,
      )
      tl.to(
        hl,
        {
          duration: 0.4,
          autoAlpha: 1,
          x: () => rectOf('[data-copy-btn]').x - 5,
          y: () => rectOf('[data-copy-btn]').y - 5,
          width: () => rectOf('[data-copy-btn]').w + 10,
          height: () => rectOf('[data-copy-btn]').h + 10,
        },
        '-=0.15',
      )
      tl.to(cursor, { duration: 0.09, scale: 0.78, yoyo: true, repeat: 1 }, '>-0.05')

      // 2 · click → el snippet flashea, el botón se vuelve "Copiado"
      tl.to(q('[data-flash]'), { opacity: 0.22, duration: 0.12 }, '>-0.05')
      tl.to(q('[data-flash]'), { opacity: 0, duration: 0.45 }, '>')
      tl.to(q('[data-copy-btn]'), { autoAlpha: 0, duration: 0.15 }, '<')
      tl.fromTo(
        q('[data-copied]'),
        { autoAlpha: 0, scale: 0.7 },
        { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' },
        '<0.05',
      )
      tl.to(hl, { autoAlpha: 0, duration: 0.3 }, '>0.1')

      // 3 · hold + reset
      tl.to({}, { duration: 1.9 })
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
            <div className="flex items-center justify-between border-b border-[var(--ld-line)] px-4 py-2.5">
              <span className="font-mono text-[11px] text-[var(--ld-ink)]">
                {c.cardTitle}
              </span>
              <span className="border border-[var(--ld-ok-line)] bg-[var(--ld-ok-bg)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-[var(--ld-ok)]">
                {c.cardBadge}
              </span>
            </div>
            <div className="p-4">
              <p className="mb-1.5 text-[8px] uppercase tracking-[0.24em] text-[var(--ld-faint)]">
                {c.label}
              </p>
              <div className="relative overflow-hidden rounded border border-[var(--ld-line)] bg-[var(--ld-bg)]">
                <pre className="p-2.5 text-[9px] leading-relaxed text-[var(--ld-soft)]">
                  <span className="font-mono">{SNIPPET}</span>
                </pre>
                <span
                  data-flash
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[var(--ld-accent)]"
                  style={{ opacity: 0 }}
                />
              </div>
              <div className="relative mt-3 flex justify-end">
                <span
                  data-copy-btn
                  className="border border-[var(--ld-ink)] px-3 py-1.5 text-[9px] uppercase tracking-[0.22em] text-[var(--ld-ink)]"
                >
                  {c.copyBtn}
                </span>
                <span
                  data-copied
                  className="absolute right-0 top-0 border border-[var(--ld-ok-line)] bg-[var(--ld-ok-bg)] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--ld-ok)]"
                >
                  {c.copiedBtn}
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

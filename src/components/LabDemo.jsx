import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { LD_STAGE_CLASS, LD_CURSOR_STYLE } from './labDemoKit'
import { useI18n } from '../i18n'

/**
 * LabDemo — prototipo de "demo animado de producto" al estilo cursor.com,
 * mostrando el flujo de LAB: elegir sección → configurar props → publicar →
 * copiar el <script> → verlo renderizado en un sitio ajeno.
 *
 * Dos ventanas superpuestas: a la izquierda el editor de LAB, a la derecha el
 * sitio del cliente donde aparece el embed. Sigue el tema (`--ld-*`) y el
 * idioma del sitio (COPY). Lo maneja UNA `gsap.timeline({ repeat: -1 })` que
 * mueve un puntero falso, un recuadro de foco y tipea texto carácter por
 * carácter. Respeta `prefers-reduced-motion` y solo corre en pantalla.
 */

// Nombres de sección (no se traducen).
const OPTIONS = ['Footer CTA', 'Outro CTA', 'Footer Brutal', 'Footer Splash']

const SNIPPET = `<script src="https://embed.scrolllab.com.ar/v1/loader.js"
  data-scrolllab data-key="pub_3f9a…" async></script>`

const COPY = {
  es: {
    caption: 'Configurás y publicás',
    sr: 'Demostración animada: en el panel de LAB se elige una sección, se completan los campos y se publica; el snippet resultante aparece renderizado en el sitio de un cliente.',
    mySections: 'Mis secciones',
    back: '‹ Mis secciones',
    newBtn: '＋ Nueva',
    edit: 'Editar',
    del: 'Borrar',
    statusPub: 'PUBLICADA',
    statusDraft: 'BORRADOR',
    badgeDraft: 'BORRADOR',
    badgeLive: 'PUBLICADO',
    fCta: 'Palabra CTA',
    fEmail: 'Email',
    fLegal: 'Pie legal',
    saveDraft: 'Guardar borrador',
    publish: 'Publicar',
    theSnippet: 'El snippet',
    sitebWord: 'TU TEXTO ACÁ',
    sitebNote: 'sección renderizada por el <script>',
    cta: 'EMPECEMOS',
    email: 'hola@estudio.film',
    legal: '© 2026 Estudio',
  },
  en: {
    caption: 'Configure and publish',
    sr: 'Animated demo: in the LAB panel a section is picked, the fields are filled in and published; the resulting snippet appears rendered on a client site.',
    mySections: 'My sections',
    back: '‹ My sections',
    newBtn: '＋ New',
    edit: 'Edit',
    del: 'Delete',
    statusPub: 'PUBLISHED',
    statusDraft: 'DRAFT',
    badgeDraft: 'DRAFT',
    badgeLive: 'PUBLISHED',
    fCta: 'CTA word',
    fEmail: 'Email',
    fLegal: 'Legal line',
    saveDraft: 'Save draft',
    publish: 'Publish',
    theSnippet: 'The snippet',
    sitebWord: 'YOUR TEXT HERE',
    sitebNote: 'section rendered by the <script>',
    cta: 'GET STARTED',
    email: 'hi@studio.film',
    legal: '© 2026 Studio',
  },
}

const BADGE_DRAFT =
  'border-[var(--ld-line2)] bg-[var(--ld-line)] text-[var(--ld-soft)]'
const BADGE_LIVE =
  'border-[var(--ld-ok-line)] bg-[var(--ld-ok-bg)] text-[var(--ld-ok)]'

export default function LabDemo() {
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
        gsap.set(q('[data-view="list"]'), { autoAlpha: 1, x: 0 })
        gsap.set(q('[data-view="editor"]'), { autoAlpha: 0, x: 14 })
        gsap.set(q('[data-dropdown]'), { autoAlpha: 0, y: -6 })
        gsap.set(q('[data-snippet]'), { autoAlpha: 0, y: 8 })
        gsap.set(q('[data-siteb-embed]'), { autoAlpha: 0.28 })
        gsap.set(q('[data-siteb]'), { scale: 1 })
        gsap.set(hl, { autoAlpha: 0 })
        setText('[data-sel-label]', 'FOOTER CTA')
        setText('[data-type-cta]', '')
        setText('[data-type-email]', '')
        setText('[data-type-legal]', '')
        setText('[data-type-snippet]', '')
        setText('[data-siteb-word]', c.sitebWord)
        const badge = q('[data-badge]')[0]
        badge.className = badge.dataset.base + ' ' + BADGE_DRAFT
        setText('[data-badge]', c.badgeDraft)
      }

      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduced) {
        reset()
        gsap.set(q('[data-view="list"]'), { autoAlpha: 0 })
        gsap.set(q('[data-view="editor"]'), { autoAlpha: 1, x: 0 })
        gsap.set(q('[data-snippet]'), { autoAlpha: 1, y: 0 })
        gsap.set(q('[data-siteb-embed]'), { autoAlpha: 1 })
        setText('[data-type-cta]', c.cta)
        setText('[data-type-email]', c.email)
        setText('[data-type-legal]', c.legal)
        setText('[data-type-snippet]', SNIPPET)
        setText('[data-siteb-word]', c.cta)
        const badge = q('[data-badge]')[0]
        badge.className = badge.dataset.base + ' ' + BADGE_LIVE
        setText('[data-badge]', c.badgeLive)
        return
      }

      reset()

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.1,
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

      const clickPulse = (at) =>
        tl.to(cursor, { duration: 0.09, scale: 0.78, yoyo: true, repeat: 1 }, at)

      const type = (sel, str, at, mirror) => {
        const proxy = { n: 0 }
        return tl.to(
          proxy,
          {
            n: str.length,
            duration: Math.max(0.5, str.length * 0.05),
            ease: 'none',
            onUpdate: () => {
              const s = str.slice(0, Math.round(proxy.n))
              setText(sel, s)
              if (mirror) setText(mirror, s || c.sitebWord)
            },
          },
          at,
        )
      }

      gsap.set(cursor, {
        x: stage.clientWidth * 0.7,
        y: stage.clientHeight - 24,
      })

      // 1 · elegir sección
      point('[data-sel]', 0.3)
      focus('[data-sel]', '-=0.15')
      clickPulse('>-0.1')
      tl.to(q('[data-dropdown]'), { autoAlpha: 1, y: 0, duration: 0.25 }, '>-0.05')
      OPTIONS.forEach((_, i) => focus(`[data-opt="${i}"]`, i === 0 ? '>' : '>+0.22'))
      tl.add(() => setText('[data-sel-label]', 'OUTRO CTA'))
      tl.to(q('[data-dropdown]'), { autoAlpha: 0, y: -6, duration: 0.2 })

      // 2 · abrir editor
      point('[data-new]', '>-0.1')
      focus('[data-new]', '-=0.2')
      clickPulse('>-0.1')
      tl.to(q('[data-view="list"]'), { autoAlpha: 0, x: -14, duration: 0.3 }, '>')
      tl.to(
        q('[data-view="editor"]'),
        { autoAlpha: 1, x: 0, duration: 0.35 },
        '<0.05',
      )

      // 3 · tipear props — CTA se refleja en el sitio del cliente
      point('[data-field-cta]', '<')
      focus('[data-field-cta]', '<0.1')
      type('[data-type-cta]', c.cta, '>-0.1', '[data-siteb-word]')
      point('[data-field-email]', '<0.15')
      focus('[data-field-email]', '<0.1')
      type('[data-type-email]', c.email, '>-0.1')
      point('[data-field-legal]', '<0.15')
      focus('[data-field-legal]', '<0.1')
      type('[data-type-legal]', c.legal, '>-0.1')

      // 4 · publicar → badge + snippet + el embed "prende"
      point('[data-publish]', '>')
      focus('[data-publish]', '<0.1')
      clickPulse('>-0.05')
      tl.add(() => {
        const badge = q('[data-badge]')[0]
        badge.className = badge.dataset.base + ' ' + BADGE_LIVE
        setText('[data-badge]', c.badgeLive)
      }, '>')
      tl.fromTo(
        q('[data-badge]'),
        { scale: 1.15 },
        { scale: 1, duration: 0.3, ease: 'back.out(3)' },
        '<',
      )
      tl.to(q('[data-snippet]'), { autoAlpha: 1, y: 0, duration: 0.25 }, '>-0.05')
      type('[data-type-snippet]', SNIPPET, '>-0.1')
      tl.to(q('[data-siteb-embed]'), { autoAlpha: 1, duration: 0.4 }, '<')
      tl.fromTo(
        q('[data-siteb]'),
        { scale: 0.985 },
        { scale: 1, duration: 0.5, ease: 'back.out(2)' },
        '<',
      )

      // 5 · hold + reset para el loop
      tl.to(hl, { autoAlpha: 0, duration: 0.3 }, '>')
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
      <div
        ref={root}
        data-stage
        className={LD_STAGE_CLASS}
        aria-hidden="true"
      >
        <p className="sr-only">{c.sr}</p>

        <div
          data-scene
          className="absolute inset-0 p-4 text-[var(--ld-ink)] sm:p-6"
        >
          {/* Ventana B — el sitio del cliente, en un navegador */}
          <div
            data-siteb
            className="absolute right-0 top-5 bottom-5 hidden w-[47%] flex-col overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:flex"
          >
            <div className="flex h-6 shrink-0 items-center gap-1.5 bg-[var(--ld-chrome)] px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
            </div>
            <div className="flex h-6 shrink-0 items-center border-b border-[var(--ld-line)] bg-[var(--ld-chrome)] px-3">
              <span className="rounded bg-[var(--ld-surface)] px-2 py-0.5 text-[9px] tracking-[0.05em] text-[var(--ld-soft)]">
                micliente.com
              </span>
            </div>
            <div className="shrink-0 space-y-2 p-4">
              <div className="h-2.5 w-2/5 rounded bg-[var(--ld-line2)]" />
              <div className="h-1.5 w-4/5 rounded bg-[var(--ld-line)]" />
              <div className="h-1.5 w-3/5 rounded bg-[var(--ld-line)]" />
            </div>
            <div className="flex flex-1 items-end">
              <div
                data-siteb-embed
                className="w-full bg-[var(--ld-band)] px-4 pb-4 pt-5"
              >
                <span
                  data-siteb-word
                  className="block font-brico text-[clamp(1.1rem,3.2vw,1.9rem)] font-extrabold leading-none tracking-[-0.02em] text-[var(--ld-band-ink)] uppercase"
                >
                  {c.sitebWord}
                </span>
                <p className="mt-2 text-[8.5px] uppercase tracking-[0.2em] text-[var(--ld-band-ink)]/40">
                  {c.sitebNote}
                </p>
              </div>
            </div>
          </div>

          {/* Ventana A — el panel de LAB */}
          <div className="absolute inset-y-0 left-0 z-10 flex w-full flex-col overflow-hidden rounded-lg border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-[0_22px_55px_rgba(0,0,0,0.2)] sm:w-[60%]">
            <div className="flex h-7 shrink-0 items-center gap-1.5 bg-[var(--ld-chrome)] px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ld-line2)]" />
              <span className="ml-2 text-[10px] tracking-[0.15em] text-[var(--ld-faint)] uppercase">
                scrolllab · LAB
              </span>
            </div>

            <div className="relative min-h-0 flex-1 p-4 md:p-5">
              {/* Vista lista */}
              <div data-view="list" className="absolute inset-4 md:inset-5">
                <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--ld-faint)]">
                  {c.mySections}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div
                    data-sel
                    className="flex items-center gap-2 border border-[var(--ld-line2)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ld-soft)]"
                  >
                    <span data-sel-label>FOOTER CTA</span>
                    <span className="text-[var(--ld-faint)]">▾</span>
                  </div>
                  <div
                    data-new
                    className="border border-[var(--ld-ink)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.24em]"
                  >
                    {c.newBtn}
                  </div>
                </div>

                <div
                  data-dropdown
                  className="absolute left-0 top-[54px] z-10 w-[170px] border border-[var(--ld-line2)] bg-[var(--ld-surface)] shadow-lg"
                >
                  {OPTIONS.map((label, i) => (
                    <div
                      key={label}
                      data-opt={i}
                      className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ld-soft)]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-14 space-y-2.5">
                  {[
                    ['chapters/FooterCTA', c.statusPub, BADGE_LIVE],
                    ['nocturne/OutroCTA', c.statusDraft, BADGE_DRAFT],
                  ].map(([id, st, tone]) => (
                    <div
                      key={id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-[var(--ld-line)] px-3 py-2.5"
                    >
                      <span className="font-mono text-[11px] text-[var(--ld-ink)]">
                        {id}
                      </span>
                      <span
                        className={`border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] ${tone}`}
                      >
                        {st}
                      </span>
                      <span className="ml-auto text-[8.5px] uppercase tracking-[0.2em] text-[var(--ld-faint)]">
                        {c.edit}
                      </span>
                      <span className="text-[8.5px] uppercase tracking-[0.2em] text-[var(--ld-faint)]">
                        {c.del}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vista editor */}
              <div data-view="editor" className="absolute inset-4 md:inset-5">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] uppercase tracking-[0.24em] text-[var(--ld-faint)]">
                    {c.back}
                  </span>
                  <span
                    data-badge
                    data-base="border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] transition-colors"
                    className={`border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] transition-colors ${BADGE_DRAFT}`}
                  >
                    {c.badgeDraft}
                  </span>
                </div>
                <p className="mt-2 text-[14px] font-medium">Outro CTA</p>
                <p className="mt-0.5 font-mono text-[9px] text-[var(--ld-soft)]">
                  nocturne/OutroCTA
                </p>

                <div className="mt-3 space-y-2.5">
                  {[
                    ['data-field-cta', 'data-type-cta', c.fCta],
                    ['data-field-email', 'data-type-email', c.fEmail],
                    ['data-field-legal', 'data-type-legal', c.fLegal],
                  ].map(([fk, tk, label]) => (
                    <label key={fk} className="block">
                      <span className="text-[8px] uppercase tracking-[0.22em] text-[var(--ld-faint)]">
                        {label}
                      </span>
                      <span
                        {...{ [fk]: '' }}
                        className="mt-1 flex w-full items-center border border-[var(--ld-line2)] px-2.5 py-1.5"
                      >
                        <span
                          {...{ [tk]: '' }}
                          className="font-mono text-[11px] text-[var(--ld-ink)]"
                        />
                        <span className="inline-block h-3 w-px animate-pulse bg-[var(--ld-soft)]" />
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="border border-[var(--ld-line2)] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.22em] text-[var(--ld-soft)]">
                    {c.saveDraft}
                  </span>
                  <span
                    data-publish
                    className="bg-[var(--ld-ink)] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.22em] text-[var(--ld-surface)]"
                  >
                    {c.publish}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-[8px] uppercase tracking-[0.24em] text-[var(--ld-faint)]">
                    {c.theSnippet}
                  </p>
                  <pre
                    data-snippet
                    className="overflow-hidden border border-[var(--ld-line)] bg-[var(--ld-bg)] p-2 text-[9px] leading-relaxed text-[var(--ld-soft)]"
                  >
                    <span data-type-snippet className="font-mono" />
                  </pre>
                </div>
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

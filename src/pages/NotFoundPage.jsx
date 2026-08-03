import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap, useGSAP } from '../lib/gsap'
import SiteHeader from '../components/SiteHeader'
import { useT } from '../i18n'

const FRAMES = 7

/**
 * 404 del market — un scrubber de scrollytelling que se quedó sin frames.
 * Una sola composición: marca + 404 como celda vacía + CTAs.
 */
export default function NotFoundPage() {
  const t = useT()
  const { pathname } = useLocation()
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-nf-eyebrow]', { opacity: 0, y: 12, duration: 0.45 })
        .from('[data-nf-track]', { opacity: 0, y: 28, duration: 0.55 }, 0.08)
        .from(
          '[data-nf-frame]',
          { opacity: 0, scale: 0.92, stagger: 0.05, duration: 0.4 },
          0.15,
        )
        .from('[data-nf-playhead]', { xPercent: -120, duration: 0.7, ease: 'power2.inOut' }, 0.35)
        .from('[data-nf-copy]', { opacity: 0, y: 16, duration: 0.45 }, 0.45)
        .from('[data-nf-cta]', { opacity: 0, y: 10, stagger: 0.06, duration: 0.35 }, 0.55)

      gsap.to('[data-nf-playhead]', {
        x: 6,
        duration: 1.1,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1.1,
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="min-h-svh bg-bone text-ink">
      <SiteHeader />

      <main className="relative flex min-h-[calc(100svh-4.5rem)] flex-col justify-center overflow-hidden px-5 pb-16 pt-10 md:px-10 md:pb-20 md:pt-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 47px, color-mix(in oklab, var(--color-ink) 6%, transparent) 48px)',
          }}
        />

        <p
          data-nf-eyebrow
          className="relative mb-8 font-mono text-[10px] uppercase tracking-[0.32em] text-ink/45 md:mb-10"
        >
          {t('notFound.eyebrow')}
        </p>

        <div data-nf-track className="relative mx-auto w-full max-w-5xl">
          <div className="mb-3 flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.28em] text-ink/40">
            <span>{t('notFound.reel')}</span>
            <span className="truncate text-accent-ink">{pathname || '/'}</span>
          </div>

          <div className="relative border border-ink/15 bg-bone">
            <div className="grid grid-cols-7 border-b border-ink/10">
              {Array.from({ length: FRAMES }, (_, i) => {
                const empty = i === FRAMES - 1
                return (
                  <div
                    key={i}
                    data-nf-frame
                    className={`relative aspect-[3/4] border-r border-ink/10 last:border-r-0 ${
                      empty ? 'bg-ink text-bone' : 'bg-mist/40'
                    }`}
                  >
                    {!empty && (
                      <span className="absolute inset-x-2 top-2 font-mono text-[9px] tracking-[0.2em] text-ink/35">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    )}
                    {empty && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center">
                        <span className="font-brico text-[clamp(1.6rem,5vw,3.2rem)] leading-none font-semibold tracking-[-0.06em]">
                          404
                        </span>
                        <span className="font-mono text-[8px] tracking-[0.25em] text-bone/55 uppercase">
                          {t('notFound.missingFrame')}
                        </span>
                      </div>
                    )}
                    {!empty && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-[18%] bottom-[22%] top-[28%] border border-dashed border-ink/20"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="relative h-10 bg-ink/[0.03]">
              <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-ink/20" />
              <div
                data-nf-playhead
                className="absolute top-1/2 right-[calc(100%/14)] z-10 flex -translate-y-1/2 translate-x-1/2 flex-col items-center"
              >
                <span className="h-3 w-3 rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]" />
                <span className="mt-1 font-mono text-[8px] tracking-[0.2em] text-accent-ink uppercase">
                  EOF
                </span>
              </div>
            </div>
          </div>
        </div>

        <div data-nf-copy className="relative mx-auto mt-10 max-w-xl text-center md:mt-12">
          <h1 className="font-brico text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.04em]">
            {t('notFound.title')}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/65 md:text-base">
            {t('notFound.body')}
          </p>
        </div>

        <div className="relative mx-auto mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-10">
          <Link
            data-nf-cta
            to="/"
            className="inline-flex items-center border border-ink bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-bone transition-colors hover:bg-transparent hover:text-ink"
          >
            {t('notFound.home')}
          </Link>
          <Link
            data-nf-cta
            to="/#templates"
            className="inline-flex items-center border border-ink/25 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:border-ink"
          >
            {t('notFound.templates')}
          </Link>
          <Link
            data-nf-cta
            to="/builder"
            className="inline-flex items-center border border-accent bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-white transition-colors hover:bg-transparent hover:text-accent-ink"
          >
            {t('notFound.builder')}
          </Link>
        </div>
      </main>
    </div>
  )
}

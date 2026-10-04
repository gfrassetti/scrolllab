import Logo from '../../components/Logo'
import { SITE_NAME } from '../../lib/site'
import PlayableHeadline from '../../components/PlayableHeadline'
import TextMorph from '../../components/TextMorph'
import { Link } from 'react-router-dom'

/**
 * Hero de la home: titular jugable, bajada y accesos a las tres formas de comprar.
 */
export default function HomeHero({ t, locale }) {
  return (
    <>
      <section className="flex min-h-[85svh] flex-col overflow-x-clip pt-20 pb-8 sm:min-h-[90svh] md:pt-24 md:pb-14">
        <p
          data-hero-meta
          className="max-w-[36ch] text-eyebrow uppercase text-ink/55"
        >
          {t('meta.tagline')}
        </p>

        <div className="flex flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-8">
            <span data-hero-logo className="shrink-0 self-center">
              <Logo className="size-[clamp(2rem,1.25rem+6vw,3.25rem)] md:size-[clamp(3.5rem,5vw+1.5rem,6.5rem)] xl:size-[clamp(5.5rem,6vw,8.5rem)]" />
            </span>
            {/* SplitText le pone aria-label al <p> y axe lo prohíbe (un <p>
                no se nombra): el texto real va en un sr-only y el animado
                queda aria-hidden. */}
            <span className="sr-only">{SITE_NAME}</span>
            <p
              data-hero-brand
              aria-hidden="true"
              className="min-w-0 select-none font-brico text-[clamp(2.35rem,1.1rem+9vw,3.4rem)] leading-[0.9] font-semibold tracking-[-0.04em] uppercase sm:text-[clamp(2.75rem,1rem+8vw,4.25rem)] md:text-[clamp(4rem,2rem+7vw,8rem)] xl:text-[clamp(7rem,6rem+4vw,14rem)]"
            >
              {SITE_NAME}
            </p>
          </div>

          {/* H1 jugable estilo Orionix: tocá → toolbar (no persiste) */}
          <div data-hero-playable className="mt-5 sm:mt-6 md:mt-10">
            <PlayableHeadline
              key={locale}
              className="max-w-[16ch] text-[clamp(1.75rem,1rem+3.5vw,3.25rem)] leading-[1.05] font-medium tracking-[-0.03em] sm:max-w-[18ch] md:text-[clamp(2.25rem,1.2rem+3vw,3.75rem)]"
              lines={[
                t('home.heroLine1'),
                {
                  text: t('home.heroLine2'),
                  node: (
                    <TextMorph
                      align="start"
                      words={[
                        t('home.heroLine2'),
                        ...t('home.heroWords').split('|'),
                      ]}
                    />
                  ),
                  className: 'font-display font-normal italic text-accent',
                },
              ]}
              aria-label={t('playableHeadline.aria')}
            />
          </div>

          <p
            data-hero-meta
            className="mt-5 max-w-[52ch] text-body-lg leading-relaxed text-ink/80 sm:mt-6 md:mt-8"
          >
            {t('home.heroBody')}
          </p>
          <div
            data-hero-meta
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-10 md:mt-12"
          >
            <a href="#templates" className="btn btn-primary">
              {t('home.heroCtaModels')}
            </a>
            <Link
              to="/templates/chapters"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-body-sm text-ink/65 transition-colors hover:text-accent"
            >
              {t('home.heroCtaDemo')} →
            </Link>
            <Link
              to="/builder"
              className="inline-flex min-h-11 items-center text-body-sm text-ink/65 transition-colors hover:text-accent"
            >
              {t('home.heroCtaBuilder')} →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

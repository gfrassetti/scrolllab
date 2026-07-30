import { Link } from 'react-router-dom'
import { SITE_NAME, SUPPORT_EMAIL } from '../lib/site'
import { useT } from '../i18n'

/**
 * Licencia Regular — estilo marketplace de templates.
 */
export default function LicensePage() {
  const t = useT()

  return (
    <div className="min-h-svh bg-bone px-5 py-10 text-ink md:px-10">
      <header className="mb-12 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink/15 pb-4">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors hover:text-accent md:text-xs"
        >
          {t('common.backHome')}
        </Link>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">
          {t('license.eyebrow')}
        </p>
      </header>

      <article className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
          {t('license.title')}
        </h1>
        <p className="text-sm leading-relaxed text-ink/70 md:text-base">
          {t('license.intro', { site: SITE_NAME })}
        </p>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em]">
            {t('license.canTitle')}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80 md:text-base">
            <li>{t('license.can1')}</li>
            <li>{t('license.can2')}</li>
            <li>{t('license.can3')}</li>
            <li>{t('license.can4')}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em]">
            {t('license.cantTitle')}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80 md:text-base">
            <li>{t('license.cant1')}</li>
            <li>{t('license.cant2')}</li>
            <li>{t('license.cant3')}</li>
            <li>{t('license.cant4')}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em]">
            {t('license.ownerTitle')}
          </h2>
          <p className="text-sm leading-relaxed text-ink/70 md:text-base">
            {t('license.ownerBody', { site: SITE_NAME })}
          </p>
        </section>

        <p className="border-t border-ink/15 pt-6 text-xs text-ink/50">
          {t('license.contact')} {SUPPORT_EMAIL}
        </p>
      </article>
    </div>
  )
}

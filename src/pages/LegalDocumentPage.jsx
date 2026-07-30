import { Link } from 'react-router-dom'
import { SITE_NAME, SUPPORT_EMAIL } from '../lib/site'
import { useT } from '../i18n'

function LegalDocumentPage({ documentKey }) {
  const t = useT()
  const sections = t(`${documentKey}.sections`)

  return (
    <div className="min-h-svh bg-bone px-5 py-10 text-ink md:px-10">
      <header className="mb-12 flex items-baseline justify-between border-b border-ink/15 pb-4">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors hover:text-accent md:text-xs"
        >
          {t('common.backHome')}
        </Link>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">
          {t(`${documentKey}.eyebrow`)}
        </p>
      </header>

      <article className="mx-auto max-w-2xl">
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
          {t(`${documentKey}.title`)}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink/45">
          {t(`${documentKey}.effectiveDate`)}
        </p>
        <p className="mt-8 text-sm leading-relaxed text-ink/70 md:text-base">
          {t(`${documentKey}.intro`, { site: SITE_NAME })}
        </p>

        <div className="mt-10 space-y-8">
          {Array.isArray(sections) &&
            sections.map((section, index) => (
              <section key={`${documentKey}-${index}`} className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-[0.2em]">
                  {section.title}
                </h2>
                {section.body && (
                  <p className="text-sm leading-relaxed text-ink/70 md:text-base">
                    {section.body}
                  </p>
                )}
                {Array.isArray(section.items) && (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80 md:text-base">
                    {section.items.map((item, itemIndex) => (
                      <li key={`${documentKey}-${index}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
        </div>

        <p className="mt-10 border-t border-ink/15 pt-6 text-xs text-ink/50">
          {t(`${documentKey}.contact`)}{' '}
          <a className="hover:text-accent" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </article>
    </div>
  )
}

export function PrivacyPage() {
  return <LegalDocumentPage documentKey="privacy" />
}

export function TermsPage() {
  return <LegalDocumentPage documentKey="terms" />
}

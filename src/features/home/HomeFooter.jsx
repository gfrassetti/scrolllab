import { isCatalogComingSoon } from '../../lib/pricing'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL, INSTAGRAM_URL, SITE_NAME } from '../../lib/site'
import Logo from '../../components/Logo'

/**
 * Footer de la home: catálogo, contacto y redes.
 */
export default function HomeFooter({ t, templates }) {
  return (
    <>
      <footer
        data-footer
        className="border-t border-ink/15 px-5 pt-24 pb-6 md:px-10 md:pt-36"
      >
        <div className="mb-20 grid grid-cols-2 gap-x-4 gap-y-10 md:mb-28 md:grid-cols-12 md:gap-12">
          <p
            data-footer-bit
            className="col-span-2 max-w-[40ch] text-body leading-relaxed text-ink/75 md:col-span-4"
          >
            {t('meta.tagline')}
          </p>

          <nav
            data-footer-bit
            className="min-w-0 md:col-span-2"
            aria-label={t('home.footerTemplates')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('home.footerTemplates')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
              {templates.map((template) => {
                const soon = Boolean(
                  template.comingSoon || isCatalogComingSoon(template.sku),
                )
                return (
                  <li key={template.id}>
                    {soon ? (
                      <span className="cursor-not-allowed text-ink/30">
                        {template.name}
                      </span>
                    ) : (
                      <Link
                        to={template.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors duration-300 hover:text-accent"
                      >
                        {template.name}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          <nav
            data-footer-bit
            className="min-w-0 md:col-span-2"
            aria-label={t('home.footerBuilder')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('home.footerBuilder')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
              <li>
                <Link
                  to="/builder"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerBuildPage')}
                </Link>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerHow')}
                </a>
              </li>
            </ul>
          </nav>

          <nav
            data-footer-bit
            className="min-w-0 md:col-span-2"
            aria-label={t('nav.lab')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('nav.lab')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
              <li>
                <Link
                  to="/lab"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('lab.eyebrow')}
                </Link>
              </li>
              <li>
                <Link
                  to="/lab#planes"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('lab.plansTitle')}
                </Link>
              </li>
              <li>
                <Link
                  to="/lab"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('lab.yours')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav
            data-footer-bit
            className="min-w-0 md:col-span-2"
            aria-label={t('home.footerContact')}
          >
            <p className="mb-4 text-eyebrow uppercase text-ink/50">
              {t('home.footerContact')}
            </p>
            <ul className="space-y-2 text-body-sm break-words">
              <li>
                <a
                  href="#contacto"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerContactForm')}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerInstagram')}
                </a>
              </li>
              <li>
                <Link
                  to="/account"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {t('home.footerAccount')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <a
          data-footer-brand
          href="#top"
          className="group flex items-end gap-[2.5vw] text-ink transition-colors duration-500 hover:text-accent"
          aria-label={`${SITE_NAME} — ${t('home.backTop')}`}
        >
          <span data-footer-logo className="mb-[0.08em] shrink-0">
            <Logo className="size-[clamp(2.75rem,9.5vw,8.5rem)]" />
          </span>
          <span
            data-footer-word
            className="min-w-0 select-none font-brico text-[clamp(2.75rem,13.5vw,11rem)] leading-[0.85] font-semibold tracking-[-0.04em] uppercase"
          >
            {SITE_NAME}
          </span>
        </a>

        <div
          data-footer-legal
          className="mt-10 flex flex-col gap-3 border-t border-ink/15 pt-4 text-eyebrow uppercase text-ink/50 md:flex-row md:items-baseline md:justify-between md:gap-6"
        >
          <p>©{new Date().getFullYear()} {SITE_NAME}</p>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2"
            aria-label={t('home.footerLicense')}
          >
            <Link
              to="/legal/license"
              className="transition-colors duration-300 hover:text-accent"
            >
              {t('home.footerLicense')}
            </Link>
            <Link
              to="/legal/privacy"
              className="transition-colors duration-300 hover:text-accent"
            >
              {t('home.footerPrivacy')}
            </Link>
            <Link
              to="/legal/terms"
              className="transition-colors duration-300 hover:text-accent"
            >
              {t('home.footerTerms')}
            </Link>
            <Link
              to="/legal/refunds"
              className="transition-colors duration-300 hover:text-accent"
            >
              {t('home.footerRefunds')}
            </Link>
          </nav>
          <a
            href="#top"
            className="transition-colors duration-300 hover:text-accent"
          >
            {t('home.backTop')} <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </>
  )
}

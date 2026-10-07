import HorizontalPanels from '../../components/sections/chapters/HorizontalPanels'
import { Link } from 'react-router-dom'

/**
 * Cómo funciona: los pasos de compra en paneles horizontales.
 */
export default function HowItWorks({ t, howPanels }) {
  return (
    <>
      {/* Confianza / proceso: después de las ofertas. */}
      <section
        id="como-funciona"
        className="mt-16 scroll-mt-20 -mx-5 md:mt-24 md:-mx-10"
      >
        <HorizontalPanels
          chapter="01"
          total="04"
          label={t('nav.howItWorks')}
          headingBefore={t('home.howTitleBefore')}
          headingEm={t('home.howTitleZip')}
          headingAfter={t('home.howTitleAfter')}
          panels={howPanels}
          variant="type"
          idleOpacity={0.48}
        />

        {/* Bifurcación, no un 5º paso: el hosted es otro producto (una
            sección suelta, suscripción). Solo un puntero a LAB. */}
        <p
          data-soft-fade
          className="mt-8 px-5 text-body leading-relaxed text-ink/60 md:px-10"
        >
          {t('home.howHostedNote')}{' '}
          <Link
            to="/lab"
            className="text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
          >
            {t('home.howHostedLink')}
          </Link>
        </p>

        <div
          data-soft-fade
          className="mt-12 flex flex-col items-center justify-center gap-8 border-y border-ink/15 px-5 py-14 text-center md:flex-row md:gap-16 md:px-10 md:py-20"
        >
          <div className="max-w-[42ch]">
            <p className="text-eyebrow uppercase text-ink/50">
              {t('home.paymentsTitle')}
            </p>
            <p className="mt-2 text-body leading-relaxed text-ink/65">
              {t('home.paymentsBody')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.mercadopago.com.ar/"
              target="_blank"
              rel="noreferrer"
              className="flex h-16 items-center rounded-sm border border-ink/15 bg-bone px-4 transition-colors hover:border-ink/40"
              aria-label="Mercado Pago"
            >
              <img
                src="/payment/mercado-pago.svg"
                alt="Mercado Pago"
                className="h-12 w-32 object-contain dark:hidden"
              />
              <img
                src="/payment/mercado-pago-white.svg"
                alt="Mercado Pago"
                className="hidden h-12 w-32 object-contain dark:block"
              />
            </a>
            <a
              href="https://www.paddle.com/"
              target="_blank"
              rel="noreferrer"
              className="flex h-16 items-center gap-2.5 rounded-sm border border-ink/15 bg-bone px-4 transition-colors hover:border-ink/40"
              aria-label="Paddle"
            >
              <img
                src="/payment/paddle.svg"
                alt=""
                aria-hidden="true"
                className="h-7 w-7 object-contain dark:hidden"
              />
              <img
                src="/payment/paddle-white.svg"
                alt=""
                aria-hidden="true"
                className="hidden h-7 w-7 object-contain dark:block"
              />
              <span className="text-xl font-semibold tracking-tight text-ink">
                Paddle
              </span>
            </a>
          </div>
        </div>

        <div
          data-soft-fade
          className="mt-12 mx-5 grid gap-6 border border-ink/15 p-6 md:mx-10 md:grid-cols-2 md:p-8"
        >
          <div>
            <p className="text-eyebrow uppercase text-ink/50">
              {t('home.zipTitle')}
            </p>
            <ul className="mt-4 space-y-2 text-body leading-relaxed text-ink/75">
              <li>{t('home.zip1')}</li>
              <li>{t('home.zip2')}</li>
              <li>{t('home.zip3')}</li>
              <li>{t('home.zip4')}</li>
            </ul>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-ink/50">
              {t('home.reqTitle')}
            </p>
            <ul className="mt-4 space-y-2 text-body leading-relaxed text-ink/75">
              <li>{t('home.req1')}</li>
              <li>
                {t('home.req2Before')}{' '}
                <Link
                  to="/legal/license"
                  className="underline decoration-ink/30 underline-offset-2 transition-colors hover:text-accent"
                >
                  {t('home.req2License')}
                </Link>
              </li>
              <li>{t('home.req3')}</li>
              <li>
                {t('home.req4Before')}{' '}
                <a
                  href="#estudio"
                  className="underline decoration-ink/30 underline-offset-2 transition-colors hover:text-accent"
                >
                  {t('home.req4Link')}
                </a>
              </li>
            </ul>
          </div>
        </div>

      </section>
    </>
  )
}

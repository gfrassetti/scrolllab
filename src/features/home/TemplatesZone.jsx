import ZoneHeadline from './ZoneHeadline.jsx'
import TemplatePoster from './TemplatePoster.jsx'
import { isCatalogComingSoon, isComingSoonSku, templatePriceUsd } from '../../lib/pricing'
import FirstPurchasePrice, { FirstPurchaseTag } from '../../components/FirstPurchasePrice'
import { Link } from 'react-router-dom'

/**
 * Zona 01 · Templates: la lista de modelos con su arte, precio y compra.
 */
export default function TemplatesZone({ t, templates, addItem, buyingSku, authLoading, buyNow }) {
  return (
    <>
      <ZoneHeadline index="01" label={t('nav.templates')} zone="templates" />
      <section id="templates" className="scroll-mt-20 border-t border-ink/15">
        <div className="flex items-baseline justify-between pt-8 md:pt-10">
          <p className="text-eyebrow uppercase text-ink/50">
            {t('home.modelsLabel')}
          </p>
          <p className="hidden text-eyebrow uppercase text-ink/40 md:block">
            {t('home.modelsScrollHint')}
          </p>
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-20">
          <div className="hidden md:col-span-5 md:block">
            <div className="sticky top-0 flex h-svh items-center py-16">
              <div
                data-template-stage
                className="relative aspect-4/5 w-full overflow-hidden"
              >
                {templates.map((template, index) => (
                  <TemplatePoster
                    key={template.sku}
                    template={template}
                    index={index}
                    soonLabel={t('home.comingSoon')}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            {templates.map((template) => {
              const soon = Boolean(
                template.comingSoon || isCatalogComingSoon(template.sku),
              )
              const sellable = !isComingSoonSku(template.sku)
              return (
              <article
                key={template.id}
                data-template-step
                data-track-sku={template.sku}
                aria-disabled={soon || undefined}
                className={`flex min-h-[82svh] flex-col justify-center border-b border-ink/15 py-14 first:border-t md:min-h-svh md:py-20 ${
                    soon ? 'select-none' : ''
                  }`}
              >
                <div
                  className={`relative mb-8 aspect-4/3 overflow-hidden md:hidden ${
                      soon ? 'opacity-45 grayscale' : ''
                    }`}
                >
                  <TemplatePoster
                    template={template}
                    index={0}
                    soonLabel={t('home.comingSoon')}
                  />
                  {soon ? (
                    <span className="absolute inset-0 z-10 flex items-center justify-center bg-bone/50">
                      <span className="border border-ink/20 bg-bone px-4 py-2 text-eyebrow uppercase text-ink/50">
                        {t('home.comingSoon')}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div
                  className={`flex items-center justify-between gap-4 ${
                      soon ? 'opacity-40' : ''
                    }`}
                >
                  <p className="text-eyebrow uppercase text-accent">
                    {template.id} /{' '}
                    {String(templates.length).padStart(2, '0')}
                  </p>
                  <span className="flex items-center gap-2">
                    {template.palette.map((color, i) => (
                      <span
                        key={`${color}-${i}`}
                        aria-hidden="true"
                        className="inline-block size-3 rounded-full border border-ink/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </div>

                {soon ? (
                  <div className="mt-5 flex items-end justify-between gap-2 opacity-40 md:gap-5">
                    <h2 className="min-w-0 text-[clamp(2.2rem,10vw,6.5rem)] leading-[0.86] font-medium tracking-[-0.055em] md:text-[clamp(2.6rem,7vw,6.5rem)]">
                      {template.name}
                    </h2>
                  </div>
                ) : (
                  <Link
                    to={template.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-5 flex items-end justify-between gap-2 md:gap-5"
                  >
                    <h2 className="min-w-0 text-[clamp(2.2rem,10vw,6.5rem)] leading-[0.86] font-medium tracking-[-0.055em] transition-colors group-hover:text-accent md:text-[clamp(2.6rem,7vw,6.5rem)]">
                      {template.name}
                    </h2>
                    <span
                      aria-hidden="true"
                      className="shrink-0 pb-1 text-3xl transition-transform group-hover:translate-x-2"
                    >
                      →
                    </span>
                  </Link>
                )}

                <p
                  className={`mt-5 text-eyebrow uppercase ${
                      soon ? 'text-ink/30' : 'text-ink/50'
                    }`}
                >
                  {soon ? t('home.comingSoon') : template.vibe}
                </p>
                {template.desktopOnly && !soon ? (
                  <p className="mt-2 text-eyebrow uppercase text-ink/45">
                    {t('home.desktopOnly')}
                  </p>
                ) : null}
                <p
                  className={`mt-3 max-w-[46ch] text-body leading-relaxed ${
                      soon ? 'text-ink/35' : 'text-ink/75'
                    }`}
                >
                  {template.description}
                </p>
                <p
                  className={`mt-5 max-w-[56ch] text-eyebrow leading-relaxed uppercase ${
                      soon ? 'text-ink/25' : 'text-ink/40'
                    }`}
                >
                  {Array.isArray(template.tags)
                    ? template.tags.join(' · ')
                    : template.tags}
                </p>

                {sellable && !soon ? (
                  <Link
                    to={`/plantillas/${template.sku}`}
                    className="mt-4 inline-block text-eyebrow uppercase text-ink/60 underline decoration-ink/25 underline-offset-4 transition-colors hover:text-accent"
                  >
                    {t('home.viewDetails')}
                  </Link>
                ) : null}

                {soon ? (
                  <p className="mt-8 text-eyebrow uppercase text-ink/40">
                    {t('home.comingSoon')}
                  </p>
                ) : (
                  <>
                    {sellable && templatePriceUsd(template.sku) != null && (
                      <p className="mt-6 text-title-sm font-medium tracking-[-0.02em]">
                        <FirstPurchasePrice usd={templatePriceUsd(template.sku)} />
                        <FirstPurchaseTag
                          usd={templatePriceUsd(template.sku)}
                          className="mt-1 block text-body-sm font-normal tracking-normal text-accent-ink"
                        />
                      </p>
                    )}

                    <div className="mt-8 flex flex-wrap items-center gap-5">
                      <Link
                        to={template.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        {t('home.openDemo')} →
                      </Link>
                      {sellable ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              addItem({
                                sku: template.sku,
                                title: t('common.cartItemTitle', {
                                  name: template.name,
                                }),
                              })
                            }
                            className="btn btn-ghost"
                          >
                            {t('common.addToCart')}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(buyingSku) || authLoading}
                            onClick={() =>
                              buyNow({
                                sku: template.sku,
                                title: t('common.cartItemTitle', {
                                  name: template.name,
                                }),
                              })
                            }
                            className="ui-press min-h-11 px-1 text-body-sm font-medium text-ink hover:text-accent disabled:opacity-40"
                          >
                            {buyingSku === template.sku
                              ? t('cart.redirecting')
                              : t('common.buy')}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

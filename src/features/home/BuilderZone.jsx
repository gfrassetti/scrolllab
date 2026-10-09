import ZoneHeadline from './ZoneHeadline.jsx'
import BuilderDemo from '../../components/BuilderDemo'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { formatPriceFromUsd, CUSTOM_BASE_PRICE_USD, CUSTOM_BASE_SECTIONS, formatNextSectionPrice, bundleListPriceUsd, bundleDiscountPct, BUNDLE_PRICE_USD } from '../../lib/pricing'
import FirstPurchasePrice, { FirstPurchaseTag } from '../../components/FirstPurchasePrice'

/**
 * Zona 02 · Builder: la demo, el CTA para armar la propia y el bundle.
 */
export default function BuilderZone({ t, locale, currency, rate, addItem, buyingSku, authLoading, buyNow }) {
  return (
    <>
      {/* Ya viste el catálogo: ahora el otro camino — armar la tuya en vez
          de un modelo fijo. El demo de LAB vive en /lab, no se repite acá. */}
      <ZoneHeadline index="02" label={t('nav.builder')} zone="builder" />
      <div className="mx-auto mb-16 max-w-[1300px] md:mb-24">
        <p className="text-center text-eyebrow uppercase text-accent">
          {t('home.builderDemoEyebrow')}
        </p>
        <h2 className="mx-auto mt-3 max-w-[18ch] text-center text-[clamp(1.9rem,1rem+4.5vw,3.75rem)] leading-[1.03] font-medium tracking-[-0.03em]">
          {t('home.builderDemoTitle')}
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-center text-body-lg leading-relaxed text-ink/70">
          {t('home.builderDemoBody')}
        </p>
        <div className="mt-8">
          <BuilderDemo key={`${locale}-${currency}`} />
        </div>
      </div>

      {/* Abrir el builder: primero el CTA de armar la propia (lo que
          acabás de ver en el demo), después el atajo de llevarte los 8
          modelos ya armados — la otra forma de resolverlo rápido. */}
      <Link
        to="/builder"
        data-cta-card
        data-cta-demo="builder"
        className="group relative mt-16 -mx-5 block overflow-hidden border-y border-ink bg-ink px-5 py-14 text-bone transition-colors duration-300 hover:bg-accent hover:text-bone md:mt-20 md:-mx-10 md:px-10 md:py-20"
      >
        {/* Identidad de fondo: el logo de la marca es literalmente
            "secciones apiladas" — la misma metáfora que arma el builder.
            Opacity real en el wrapper (no un modificador de color), igual
            que el watermark de HomeContact — si no, el bloque accent del
            logo (fill fijo, no currentColor) queda naranja pleno.
            Solo desktop: en mobile el precio ya envuelve a 2 líneas y
            choca contra la marca — el título ya identifica la card ahí. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 bottom-6 hidden text-bone opacity-25 md:block"
          style={{ ['--color-accent']: 'currentColor' }}
        >
          <Logo className="h-40 w-40" />
        </div>
        <div className="relative z-10">
          <p
            data-cta-bit
            className="mb-4 text-eyebrow uppercase text-bone/55"
          >
            {t('home.builderEyebrow')}
          </p>
          <p className="flex items-end justify-between gap-6">
            <span
              data-cta-bit
              className="text-[clamp(2.2rem,6vw,5.5rem)] leading-[0.92] font-medium tracking-[-0.035em]"
            >
              {t('home.builderTitleBefore')}{' '}
              <em
                data-cta-accent
                className="inline-block font-display font-normal italic text-accent group-hover:text-bone"
              >
                {t('home.builderTitleEm')}
              </em>
            </span>
            <span
              data-cta-arrow
              aria-hidden="true"
              className="mb-1 shrink-0 text-3xl transition-transform duration-300 group-hover:translate-x-2 md:text-4xl"
            >
              →
            </span>
          </p>
          <p
            data-cta-bit
            className="mt-5 max-w-[48ch] text-body leading-relaxed text-bone/70"
          >
            {t('home.builderBody')}
          </p>
          <p
            data-cta-bit
            className="mt-4 text-eyebrow uppercase text-bone/50"
          >
            {t('home.builderPrices', {
              base: formatPriceFromUsd(CUSTOM_BASE_PRICE_USD, currency, rate),
              included: CUSTOM_BASE_SECTIONS,
              extra: formatNextSectionPrice(
                CUSTOM_BASE_SECTIONS,
                false,
                currency,
                rate,
              ),
            })}
          </p>
        </div>
      </Link>

      {/* Bundle: para quien ya decidió llevarse todo el catálogo en vez de armar uno a medida. */}
      <section
        id="ofertas"
        data-cta-card
        className="mt-10 scroll-mt-20 border-2 border-ink p-6 md:mt-12 md:grid md:grid-cols-12 md:gap-10 md:p-10"
      >
        <div className="md:col-span-8">
          <p
            data-cta-bit
            className="mb-3 text-eyebrow uppercase text-ink/55"
          >
            {t('home.bundleEyebrow')}
          </p>
          <p
            data-cta-bit
            className="text-[clamp(1.8rem,4.5vw,4rem)] leading-none font-medium tracking-[-0.02em]"
          >
            {t('home.bundleTitleBefore')}{' '}
            <em
              data-cta-accent
              className="inline-block font-display font-normal italic text-accent"
            >
              {t('home.bundleTitleEm')}
            </em>
          </p>
          <p
            data-cta-bit
            className="mt-3 max-w-[52ch] text-body leading-relaxed text-ink/75"
          >
            {t('home.bundleBody')}
          </p>
          <p
            data-cta-bit
            className="mt-4 text-eyebrow uppercase text-ink/50"
          >
            {t('home.bundleSaving', {
              list: formatPriceFromUsd(bundleListPriceUsd(), currency, rate),
              off: String(bundleDiscountPct()),
            })}
          </p>
          <div
            data-cta-bit
            className="mt-8 flex flex-wrap items-center gap-5"
          >
            <button
              type="button"
              onClick={() =>
                addItem({ sku: 'bundle', title: t('home.bundleCartTitle') })
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
                  sku: 'bundle',
                  title: t('home.bundleCartTitle'),
                })
              }
              className="ui-press min-h-11 px-1 text-body-sm font-medium text-ink hover:text-accent disabled:opacity-40"
            >
              {buyingSku === 'bundle'
                ? t('cart.redirecting')
                : t('common.buy')}
            </button>
          </div>
        </div>
        <p
          data-cta-bit
          className="mt-8 self-end text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.03em] md:col-span-4 md:mt-0 md:text-right"
        >
          <FirstPurchasePrice usd={BUNDLE_PRICE_USD} />
          <FirstPurchaseTag
            usd={BUNDLE_PRICE_USD}
            className="mt-2 block text-body-sm font-normal tracking-normal text-accent-ink"
          />
        </p>
      </section>
    </>
  )
}

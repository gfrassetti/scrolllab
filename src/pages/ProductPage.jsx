import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import es from '../i18n/locales/es.json'
import SiteHeader from '../components/SiteHeader'
import NotFoundPage from './NotFoundPage'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { useFxRate } from '../lib/fx'
import { formatPriceFromUsd } from '../lib/pricing'
import FirstPurchasePrice, { FirstPurchaseTag } from '../components/FirstPurchasePrice'
import SpecIcon from '../components/SpecIcon'
import { useCurrency } from '../lib/currency'
import { isProductSku, productPageData } from '../lib/productPages'
import { startCheckout } from '../lib/startCheckout'
import { useT } from '../i18n'

/**
 * Página de un template: lo que Google muestra al buscarlo y donde termina quien
 * lo encuentra. El texto viene de productPageData (mismo objeto que el HTML que
 * emite el build), así que la página y lo que ve el buscador dicen lo mismo.
 * El cuerpo va siempre en español: es lo que se indexa, sin importar el idioma
 * del navegador de quien la abre.
 */
export default function ProductPage() {
  const { sku } = useParams()
  if (!isProductSku(sku)) return <NotFoundPage />
  return <ProductView key={sku} data={productPageData(sku, es)} />
}

function BuyActions({ data }) {
  const t = useT()
  const c = data.copy
  const { user, loading: authLoading } = useAuth()
  const addItem = useCart((s) => s.addItem)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const item = { sku: data.sku, title: t('common.cartItemTitle', { name: data.name }) }

  /** Comprar → Mercado Pago (login si hace falta), igual que en la home. */
  const buy = async () => {
    if (busy || authLoading) return
    addItem(item)
    setBusy(true)
    try {
      const result = await startCheckout({ items: useCart.getState().items, user, navigate })
      if (result !== 'redirect') setBusy(false)
    } catch {
      navigate('/cart')
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-5">
      <Link
        to={data.demoPath}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary"
      >
        {c.demo} →
      </Link>
      <button type="button" onClick={() => addItem(item)} className="btn btn-ghost">
        {c.addToCart}
      </button>
      <button
        type="button"
        disabled={busy || authLoading}
        onClick={buy}
        className="ui-press min-h-11 px-1 text-body-sm font-medium text-ink hover:text-accent disabled:opacity-40"
      >
        {busy ? c.redirecting : c.buy}
      </button>
    </div>
  )
}

/**
 * Compartir la ficha: la hoja nativa del teléfono si existe; si no (o si la
 * cierran sin elegir), copia el link y lo dice al lado del ícono un momento.
 */
function ShareButton({ data }) {
  const c = data.copy
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const share = async () => {
    const url = data.url
    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: data.title, url })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt(c.share, url)
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="ui-press inline-flex min-h-11 items-center gap-2 text-eyebrow uppercase text-ink/60 transition-colors hover:text-accent"
    >
      <SpecIcon name="share" className="h-4 w-4" />
      <span aria-live="polite">{copied ? c.shareCopied : c.share}</span>
    </button>
  )
}

/** La ficha técnica: dos columnas de dato con su ícono, sobre una regla fina. */
function SpecList({ specs, title }) {
  return (
    <div className="mt-10 border-t border-ink/15 pt-6">
      <h2 className="sr-only">{title}</h2>
      <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {specs.map((s) => (
          <li key={s.key} className="flex min-w-0 items-center gap-3 text-body-sm text-ink/80">
            <SpecIcon name={s.key} className="h-5 w-5 shrink-0 text-ink/55" />
            <span className="min-w-0">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductView({ data }) {
  const c = data.copy
  const { rate } = useFxRate()
  const { currency } = useCurrency()
  const priceLabel = formatPriceFromUsd(data.priceUsd, currency, rate)

  // El cuerpo está en español aunque el navegador esté en otro idioma.
  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = 'es-AR'
    return () => {
      document.documentElement.lang = previous
    }
  }, [])

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20 md:px-10 md:pt-36">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <nav
          aria-label="Ruta"
          className="flex flex-wrap items-center gap-x-2 text-eyebrow uppercase text-ink/50"
        >
          <Link to="/" className="transition-colors hover:text-accent">
            {c.breadcrumbHome}
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/#templates" className="transition-colors hover:text-accent">
            {c.breadcrumbTemplates}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink">{data.name}</span>
        </nav>
        <ShareButton data={data} />
        </div>

        <header className="mt-10 grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-start md:gap-14">
          <div>
            <p className="text-eyebrow uppercase text-accent">{data.vibe}</p>
            <h1 className="mt-4">
              <span className="block text-[clamp(2.8rem,11vw,7rem)] leading-[0.86] font-medium tracking-[-0.055em]">
                {data.name}
              </span>
              <span className="sr-only"> — </span>
              <span className="mt-4 block text-body-lg text-ink/70">{c.subtitle}</span>
            </h1>
            <p className="mt-6 max-w-[52ch] text-body text-ink/75">{data.pitch}</p>
            {data.idealFor ? (
              <p className="mt-3 max-w-[52ch] text-body text-ink/75">
                <span className="font-medium text-ink">{c.idealForLabel}</span> {data.idealFor}
              </p>
            ) : null}
            {data.notice ? (
              <p role="note" className="mt-6 max-w-[52ch] border-l-2 border-accent pl-4 text-body-sm text-ink/80">
                {data.notice}
              </p>
            ) : null}

            <p className="mt-8 text-title-sm font-medium tracking-[-0.02em]">
              {priceLabel ? <FirstPurchasePrice usd={data.priceUsd} /> : c.priceLabel(data.priceUsd)}
            </p>
            <FirstPurchaseTag usd={data.priceUsd} className="mt-1 block text-body-sm text-accent-ink" />
            <p className="mt-2 max-w-[52ch] text-body-sm text-ink/55">{data.priceLine}</p>

            <BuyActions data={data} />
            <p className="mt-4 text-body-sm text-ink/60">
              {c.licenseLine} ·{' '}
              <Link
                to="/legal/license"
                className="text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {c.licenseMore}
              </Link>
            </p>
            <p className="mt-1.5 text-body-sm text-ink/60">
              {c.refundLine} ·{' '}
              <Link
                to="/arrepentimiento"
                className="text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {c.refundMore}
              </Link>
            </p>
            <SpecList specs={data.specs} title={c.specsTitle} />
          </div>

          <div className="relative aspect-4/3 overflow-hidden border border-ink/15 bg-ink md:sticky md:top-28">
            <img
              src={data.poster}
              alt={c.posterAlt(data.name)}
              className="absolute inset-0 h-full w-full object-cover object-top"
              draggable={false}
            />
          </div>
        </header>

        {data.sections.length > 0 ? (
          <section className="mt-24">
            <h2 className="text-title-sm font-medium tracking-[-0.02em]">{c.sectionsTitle}</h2>
            <p className="mt-2 text-body text-ink/60">{c.sectionsIntro(data.sections.length)}</p>
            <ul className="mt-8 grid gap-x-12 gap-y-6 md:grid-cols-2">
              {data.sections.map((s) => (
                <li key={s.key} className="border-t border-ink/15 pt-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="mt-1 text-body-sm text-ink/60">{s.blurb}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-24">
          <h2 className="text-title-sm font-medium tracking-[-0.02em]">{c.effectsTitle}</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <li key={tag} className="border border-ink/20 px-3 py-2 text-eyebrow uppercase">
                {tag}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-24">
          <h2 className="text-title-sm font-medium tracking-[-0.02em]">{c.includesTitle}</h2>
          <ul className="mt-6 grid gap-x-12 gap-y-4 md:grid-cols-2">
            {c.includes.map((text) => (
              <li key={text} className="flex gap-3 text-body text-ink/80">
                <SpecIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/legal/license"
            className="mt-6 inline-block text-eyebrow uppercase text-ink/60 underline decoration-ink/25 underline-offset-4 transition-colors hover:text-accent"
          >
            {c.licenseLink}
          </Link>
        </section>

        <section className="mt-24">
          <h2 className="text-title-sm font-medium tracking-[-0.02em]">{c.howTitle}</h2>
          <ol className="mt-6 grid gap-8 md:grid-cols-3">
            {c.how.map((text, i) => (
              <li key={text} className="border-t border-ink/15 pt-4">
                <span className="text-eyebrow text-accent">{String(i + 1).padStart(2, '0')}</span>
                <p className="mt-3 text-body text-ink/80">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-24">
          <h2 className="text-title-sm font-medium tracking-[-0.02em]">{c.moreTitle}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.related.map((r) => (
              <li key={r.sku}>
                <Link
                  to={r.path}
                  className="group block border border-ink/15 p-5 transition-colors hover:border-ink"
                >
                  <span className="text-title-sm font-medium tracking-[-0.02em] transition-colors group-hover:text-accent">
                    {r.name}
                  </span>
                  <span className="mt-1 block text-eyebrow uppercase text-ink/50">{r.vibe}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import FaqAccordion from '../components/FaqAccordion'
import PlatformLogo from '../components/PlatformLogo'
import SpecIcon from '../components/SpecIcon'
import { LAB_SHOPIFY as d } from '../lib/labShopifyPage'

/**
 * /lab/shopify: cómo poner un widget de LAB en una tienda Shopify, con capturas
 * reales. El texto vive en src/lib/labShopifyPage.js (lo comparte con el HTML que
 * lee el buscador). Va siempre en español, como las fichas de producto.
 */
function Shot({ img, className = '' }) {
  return (
    <figure className={className}>
      <div className="overflow-hidden border border-ink/15 bg-ink/5">
        <img
          src={img.src}
          width={img.width}
          height={img.height}
          alt={img.alt}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      {img.caption ? <figcaption className="mt-3 text-body-sm text-ink/55">{img.caption}</figcaption> : null}
    </figure>
  )
}

export default function LabShopifyPage() {
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
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-24 md:px-10 md:pt-36">
        <nav aria-label="Ruta" className="flex flex-wrap items-center gap-x-2 text-eyebrow uppercase text-ink/50">
          <Link to="/lab" className="transition-colors hover:text-accent">
            {d.breadcrumbLab}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="inline-flex items-center gap-1.5 text-ink">
            <PlatformLogo id="shopify" className="h-3.5 w-3.5" />
            {d.breadcrumbHere}
          </span>
        </nav>

        <header className="mt-10 max-w-3xl">
          <h1 className="text-[clamp(2.4rem,7vw,5rem)] leading-[0.95] font-medium tracking-[-0.04em] text-balance">
            {d.h1}
          </h1>
          <p className="mt-6 max-w-[60ch] text-body-lg text-ink/75">{d.lede}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link to="/lab#planes" className="btn btn-primary">
              {d.ctaPrimary}
            </Link>
            <Link
              to="/lab"
              className="ui-press min-h-11 px-1 text-body-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:text-accent hover:decoration-accent"
            >
              {d.ctaSecondary}
            </Link>
          </div>
        </header>

        <Shot img={d.hero} className="mt-14 md:mt-20" />

        <section className="mt-24 grid gap-12 md:mt-32 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-16">
          <div>
            <h2 className="text-title font-medium tracking-[-0.02em]">{d.stepsTitle}</h2>
            <ol className="mt-8 space-y-8">
              {d.steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-t border-ink/15 pt-5">
                  <span className="text-body-sm font-medium tabular-nums text-accent">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{s.title}</p>
                    <p className="mt-2 text-body text-ink/70">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Shot img={d.editor} className="lg:sticky lg:top-28" />
        </section>

        <section className="mt-24 md:mt-32">
          <h2 className="text-title font-medium tracking-[-0.02em]">{d.whyTitle}</h2>
          <ul className="mt-8 grid gap-x-12 gap-y-4 md:grid-cols-2">
            {d.why.map((text) => (
              <li key={text} className="flex gap-3 text-body text-ink/80">
                <SpecIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Shot img={d.gridImage} className="mt-14" />
        </section>

        <section className="mt-24 border-t border-ink/15 pt-12 md:mt-32">
          <h2 className="text-title-sm font-medium">{d.faqTitle}</h2>
          <div className="mt-6 max-w-[68ch]">
            <FaqAccordion items={d.faq} />
          </div>
        </section>

        <section className="mt-24 bg-ink px-6 py-14 text-bone md:mt-32 md:px-12 md:py-20">
          <h2 className="text-title font-medium tracking-[-0.02em]">{d.closingTitle}</h2>
          <p className="mt-4 max-w-[52ch] text-body text-bone/70">{d.closingBody}</p>
          <Link to="/lab#planes" className="btn mt-8 bg-bone text-ink hover:bg-accent hover:text-bone">
            {d.ctaPrimary}
          </Link>
          <p className="mt-10 text-body-sm text-bone/55">
            {d.otherPlatforms}{' '}
            <Link to="/lab#ayuda" className="text-bone underline decoration-bone/30 underline-offset-4 hover:text-accent">
              LAB
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}

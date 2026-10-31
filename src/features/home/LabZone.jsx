import ZoneHeadline from './ZoneHeadline.jsx'
import { Link } from 'react-router-dom'
import LabMark from '../../components/LabMark'
import LabDemo from '../../components/LabDemo'
import LabDemoCopy from '../../components/LabDemoCopy'
import LabDemoPaste from '../../components/LabDemoPaste'
import PlatformLogo, { PLATFORM_LOGOS } from '../../components/PlatformLogo'

/**
 * Zona 03 · LAB: la sección en vivo por suscripción, cómo funciona en tres
 * demos animadas (las mismas de /lab) y la comparación de las tres formas.
 */
export default function LabZone({ t, ways, locale }) {
  const steps = [t('lab.guide1'), t('lab.guide2'), t('lab.guide3')]
  return (
    <>
      <ZoneHeadline index="03" label={t('nav.lab')} tag={t('nav.labTag')} zone="lab" />

      {/* LAB: el otro camino — no lo bajás, lo enchufás. */}
      <Link
        to="/lab"
        data-cta-card
        data-cta-demo="lab"
        className="group relative mt-4 -mx-5 block overflow-hidden border-b border-ink/20 px-5 py-14 transition-colors duration-300 hover:bg-ink hover:text-bone md:-mx-10 md:px-10 md:py-20"
      >
        {/* Identidad de fondo: el mark de LAB, mismo que el splash al
            entrar — sin esto la card no se distingue del builder. Solo
            desktop: en mobile choca con el snippet de código de abajo. */}
        <div
          data-cta-labmark
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-12 hidden text-ink opacity-[0.14] group-hover:text-bone md:block"
        >
          <LabMark className="h-[17rem] w-auto" />
        </div>
        <div className="relative z-10">
          <p
            data-cta-bit
            className="mb-4 text-eyebrow uppercase text-ink/50 group-hover:text-bone/55"
          >
            {t('home.labEyebrow')}
          </p>
          <p className="flex items-end justify-between gap-6">
            <span
              data-cta-bit
              className="text-[clamp(2.2rem,6vw,5.5rem)] leading-[0.92] font-medium tracking-[-0.035em]"
            >
              {t('home.labTitleBefore')}{' '}
              <em
                data-cta-accent
                className="inline-block font-display font-normal italic text-accent"
              >
                {t('home.labTitleEm')}
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
            className="mt-5 max-w-[52ch] text-body leading-relaxed text-ink/70 group-hover:text-bone/70"
          >
            {t('home.labBodyBefore')}
            <span className="text-accent">{t('home.labBodyLink')}</span>
            {t('home.labBodyAfter')}
          </p>
          {/* Dónde funciona: el mismo snippet en una tienda Shopify o en cualquier sitio. */}
          <p
            data-cta-bit
            className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-ink/60 group-hover:text-bone/60"
          >
            <span>{t('lab.worksOn')}</span>
            {Object.entries(PLATFORM_LOGOS).map(([id, logo]) => (
              <span key={id} className="inline-flex items-center gap-1.5 text-ink/80 group-hover:text-bone/80">
                <PlatformLogo id={id} className="h-4 w-4" />
                {logo.name}
              </span>
            ))}
          </p>
        </div>
      </Link>

      {/* Cómo funciona: verlo explica LAB mejor que leerlo. Fuera del Link
          a propósito (la card invierte colores al hover y las demos siguen el
          tema). En teléfono y tablet se desliza; desde lg, tres columnas. */}
      <section data-cta-card aria-labelledby="home-lab-how" className="mt-10 md:mt-14">
        <h3 id="home-lab-how" className="sr-only">
          {t('lab.howEyebrow')}
        </h3>
        <ol className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:-mx-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
          {[LabDemo, LabDemoCopy, LabDemoPaste].map((Demo, i) => (
            <li key={i} className="w-[82%] shrink-0 snap-start border-t border-ink/20 pt-4 md:w-[46%] lg:w-auto">
              <span className="font-mono text-body-sm text-accent">{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-2 text-body text-ink/80">{steps[i]}</p>
              <div className="mt-6">
                <Demo key={locale} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Comparación de las 3 formas — resumen de decisión al final del bloque
          de ofertas. Convive con las bandas de arriba a propósito: el eyebrow
          deja claro que es un recap, no contenido nuevo. */}
      <section data-cta-card className="mt-12 md:mt-16">
        <p data-cta-bit className="text-eyebrow uppercase text-ink/50">
          Las tres, comparadas
        </p>
        <div className="mt-6 grid gap-px overflow-hidden border border-ink/15 bg-ink/15 sm:grid-cols-3">
          {ways.map((w) => {
            const isHash = w.to.startsWith('#')
            const cls =
              'group flex flex-col bg-bone p-6 transition-colors hover:bg-ink/[0.03]'
            const inner = (
              <>
                <p className="flex items-center gap-2 text-title-sm font-medium">
                  {w.name}
                  <span
                    aria-hidden="true"
                    className="text-body-sm text-ink/35 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent"
                  >
                    →
                  </span>
                </p>
                <p className="mt-1 text-eyebrow uppercase text-ink/45">
                  {w.kind}
                </p>
                <dl className="mt-5 flex-1 space-y-3">
                  {w.rows.map(([label, val]) => (
                    <div key={label}>
                      <dt className="text-eyebrow uppercase text-ink/40">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-body-sm text-ink/75">{val}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )
            return isHash ? (
              <a key={w.key} data-cta-bit href={w.to} className={cls}>
                {inner}
              </a>
            ) : (
              <Link key={w.key} data-cta-bit to={w.to} className={cls}>
                {inner}
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}

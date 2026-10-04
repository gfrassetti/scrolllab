import ZoneHeadline from './ZoneHeadline.jsx'
import { Link } from 'react-router-dom'
import LabMark from '../../components/LabMark'

/**
 * Zona 03 · LAB: la sección en vivo por suscripción y la comparación de las tres formas.
 */
export default function LabZone({ t, ways }) {
  return (
    <>
      <ZoneHeadline index="03" label={t('nav.lab')} zone="lab" />

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
          <code
            data-cta-code
            className="mt-5 block overflow-x-auto whitespace-nowrap font-mono text-body-sm text-ink/40 group-hover:text-bone/45"
          >
            &lt;script src=&quot;.../embed/v1/loader.js&quot; data-key=&quot;pub_…&quot;
            async&gt;&lt;/script&gt;
          </code>
        </div>
      </Link>

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
                <p className="mt-5 inline-flex w-fit items-center border border-accent/40 bg-accent/10 px-3 py-1.5 text-body-sm font-medium tracking-[-0.02em] text-accent">
                  {w.price}
                </p>
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

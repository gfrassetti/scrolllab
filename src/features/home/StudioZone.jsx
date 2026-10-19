import ZoneHeadline from './ZoneHeadline.jsx'

/**
 * Zona 04 · Estudio: trabajo a medida por cotización (no pasa por el checkout).
 */
export default function StudioZone({ t, studioServices }) {
  return (
    <>
      {/* Estudio: capa de posicionamiento arriba del marketplace — trabajo a
          medida por cotización manual (no toca checkout/precios de
          catálogo). Detalle: docs/estudio-positioning.md. */}
      <ZoneHeadline index="04" label={t('nav.studio')} zone="estudio" />
      <section id="estudio" className="scroll-mt-20 border-t border-ink/15 pt-8 pb-16 md:pt-10 md:pb-24">
        <div className="mx-auto max-w-[1300px]">
          <p className="text-center text-eyebrow uppercase text-accent">
            {t('home.studioEyebrow')}
          </p>
          <h2 className="mx-auto mt-3 max-w-[22ch] text-center text-[clamp(1.9rem,1rem+4.5vw,3.75rem)] leading-[1.03] font-medium tracking-[-0.03em]">
            {t('home.studioTitleBefore')}{' '}
            <em className="inline-block font-display font-normal italic text-accent">
              {t('home.studioTitleEm')}
            </em>
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-center text-body-lg leading-relaxed text-ink/70">
            {t('home.studioBody')}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-[900px] gap-px overflow-hidden border border-ink/15 bg-ink/15 sm:grid-cols-2 md:mt-14">
          {studioServices.map((s) => (
            <div key={s.key} className="flex flex-col bg-bone p-6 md:p-8">
              <p className="text-title-sm font-medium">{s.name}</p>
              <p className="mt-1 text-eyebrow uppercase text-ink/45">
                {s.kind}
              </p>
              <dl className="mt-5 flex-1 space-y-3">
                <div>
                  <dt className="text-eyebrow uppercase text-ink/40">
                    {t('home.studioForLabel')}
                  </dt>
                  <dd className="mt-0.5 text-body-sm text-ink/75">
                    {s.forWhom}
                  </dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-ink/40">
                    {t('home.studioGetsLabel')}
                  </dt>
                  <dd className="mt-0.5 text-body-sm text-ink/75">
                    {s.gets}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center md:mt-14">
          <a href="#contacto" className="btn btn-primary">
            {t('home.studioCta')}
          </a>
        </div>
      </section>
    </>
  )
}

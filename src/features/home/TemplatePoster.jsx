import { isCatalogComingSoon } from '../../lib/pricing'

function catalogCoverSrc(sku) {
  return `/catalog/${sku}.webp`
}

export default function TemplatePoster({ template, index = 0, soonLabel = 'Coming soon' }) {
  return (
    <div
      data-template-art
      className="absolute inset-0 overflow-hidden border border-ink/15 bg-ink"
      style={{ opacity: index === 0 ? 1 : 0 }}
    >
      <img
        src={catalogCoverSrc(template.sku)}
        alt=""
        draggable={false}
        decoding="async"
        loading={index === 0 ? 'eager' : 'lazy'}
        className={`absolute inset-0 h-full w-full object-cover object-top ${
          template.comingSoon || isCatalogComingSoon(template.sku) ? 'grayscale' : ''
        }`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30"
      />
      <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] text-white/90 uppercase drop-shadow-sm">
        {template.category} / {template.id}
      </span>
      <span className="absolute right-5 bottom-14 max-w-[85%] text-right font-brico text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.85] font-semibold tracking-[-0.05em] text-white drop-shadow-md">
        {template.name}
      </span>
      <span className="absolute right-5 bottom-5 font-display text-xl italic text-white/80 md:text-2xl">
        {template.comingSoon ? '' : template.tagline}
      </span>
      {template.comingSoon ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
          <span className="border border-white/35 bg-black/50 px-4 py-2 text-[11px] tracking-[0.22em] text-white/85 uppercase">
          {soonLabel}
          </span>
        </span>
      ) : null}
    </div>
  )
}

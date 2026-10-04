/**
 * Marca de zona: separa las 3 formas de comprar (Templates / Builder / Lab)
 * con un título grande y animado. `zone` alimenta el scrollspy del header
 * (SiteHeader observa `[data-zone]`) — el id es solo para eso, no para links
 * de hash (esos siguen usando el id de la sección real, ej. `#templates`).
 */
export default function ZoneHeadline({ index, label, zone }) {
  return (
    <div
      id={`zone-${zone}`}
      data-zone={zone}
      data-soft-fade
      className="pt-14 pb-2 md:pt-20"
    >
      <p className="text-eyebrow uppercase text-ink/40">{index}</p>
      <p className="mt-2 font-brico text-[clamp(3rem,9vw,7rem)] leading-[0.85] font-semibold tracking-[-0.03em] uppercase">
        {label}
      </p>
    </div>
  )
}

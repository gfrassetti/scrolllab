/** Hairline dossier grid — the paper the world sits on. */
export function VantaGrid({
  className = '',
  color = 'rgb(17 17 20 / 0.11)',
  cols = 4,
  rows = 3,
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${100 / cols}% ${100 / rows}%`,
      }}
    />
  )
}

/** Custom viewport frame: rounded bite on a corner, HUD inset. */
export function VantaStage({ className = '', children }) {
  return (
    <div className={`vanta-stage relative overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function VantaCrosshair({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 left-3 z-30 -translate-y-1/2 text-[1.15rem] leading-none opacity-70 md:left-5 ${className}`}
    >
      ✛
    </span>
  )
}

/**
 * Keep-console HUD — ported from KPR `the-console-loading`:
 * top label, scaleX progress, barcode + protocol, percent.
 */
export function VantaConsole({
  kicker = 'Accessing',
  title = 'Citadel Mainnet',
  protocol = 'VANTA://CITADEL/BEAM/07',
  protocolLabel = 'Encryption Protocol',
  percent = 0,
}) {
  const pct = Math.max(0, Math.min(1, percent))
  return (
    <div className="pointer-events-none absolute right-5 bottom-5 left-5 z-20 md:right-8 md:bottom-7 md:left-8">
      <div className="flex items-end justify-between gap-6 font-mono text-[10px] tracking-[0.16em] uppercase">
        <p className="leading-snug">
          <span className="block opacity-65">{kicker}</span>
          <span className="mt-0.5 block text-[12px] tracking-[0.14em]">{title}</span>
        </p>
        <p className="text-[13px] tracking-[0.12em] tabular-nums">
          {String(Math.floor(pct * 100)).padStart(2, '0')}%
        </p>
      </div>
      <div className="relative mt-3 h-[3px] w-full overflow-hidden bg-white/25">
        <div
          className="absolute inset-y-0 left-0 w-full origin-left bg-white"
          style={{ transform: `scaleX(${pct})` }}
        />
      </div>
      <div className="mt-3 flex items-end justify-between gap-4 font-mono text-[9px] tracking-[0.14em] uppercase opacity-70">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-7 w-16 shrink-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 2px, #fff 2px 3px, transparent 3px 5px, #fff 5px 6px, transparent 6px 7px)',
            }}
          />
          <span>
            <span className="block">{protocolLabel}</span>
            <span className="mt-0.5 block truncate">{protocol}</span>
          </span>
        </span>
      </div>
    </div>
  )
}

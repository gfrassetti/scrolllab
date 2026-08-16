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

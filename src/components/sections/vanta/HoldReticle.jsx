/**
 * Center click-and-hold affordance. Progress is driven by useHoldScan (press,
 * not scroll) so releasing eases the ring back.
 */
export default function HoldReticle({
  progress = 0,
  label = 'CLICK & HOLD',
  size = 112,
}) {
  const r = 40
  const c = 2 * Math.PI * r
  const inset = (size - 112) / 2

  return (
    <div
      className="pointer-events-none relative grid place-items-center text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="absolute rounded-full border border-white/35"
        style={{
          inset: inset + 8,
          transform: `scale(${1 + progress * 0.08})`,
          opacity: 0.55 + progress * 0.45,
        }}
      />
      <svg
        viewBox="0 0 112 112"
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.25"
        />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="#3dffc5"
          strokeWidth="1.6"
          strokeLinecap="square"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
      <span className="absolute left-1/2 top-2 h-2 w-px bg-white/80" />
      <span className="absolute bottom-2 left-1/2 h-2 w-px bg-white/80" />
      <span className="absolute top-1/2 left-2 h-px w-2 bg-white/80" />
      <span className="absolute top-1/2 right-2 h-px w-2 bg-white/80" />
      <span className="relative z-10 max-w-[7.5rem] text-center font-mono text-[8px] leading-tight tracking-[0.22em] uppercase md:text-[9px]">
        {label}
      </span>
    </div>
  )
}

const LETTERS = {
  V: 'M12 18h46l52 188 52-188h46L116 222H64z',
  A: 'M85 18 168 222h-42l-14-40H58l-14 40H2L85 18zm0 62L62 156h46z',
  N: 'M12 18h40v204H12V18zm132 0h40v204h-40V18zM52 18h48L164 222h-48z',
  T: 'M8 18h164v42H98v162H82V60H8z',
}

const SLOTS = [
  { key: 'V', x: 0, window: false },
  { key: 'A', x: 178, window: true },
  { key: 'N', x: 356, window: false },
  { key: 'T', x: 548, window: false },
  { key: 'A', x: 724, window: false },
]

const BLOBS = [
  [40, 8, 18, 10],
  [120, -6, 12, 12],
  [210, 12, 22, 8],
  [310, -4, 10, 16],
  [430, 6, 16, 9],
  [540, -8, 14, 14],
  [650, 10, 20, 8],
  [760, -2, 12, 11],
  [820, 20, 8, 18],
  [90, 210, 16, 8],
  [250, 224, 22, 10],
  [480, 216, 12, 12],
  [700, 222, 18, 8],
  [30, 110, 8, 20],
  [870, 90, 10, 24],
]

/**
 * Geometric VANTA wordmark — Hexaframe-like stencil, not a display font.
 * `progress` 0→1 eases the melt/displacement. One A is a window onto `sliver`.
 */
export default function VantaMark({ progress = 1, sliver, className = '' }) {
  const melt = Math.max(0, 1 - progress)
  const uid = 'vanta-mark'

  return (
    <svg
      viewBox="-24 -28 968 280"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={`${uid}-melt`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.018 + melt * 0.05}
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={melt * 38}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <clipPath id={`${uid}-a`} clipPathUnits="userSpaceOnUse">
          <path d={LETTERS.A} transform="translate(178 0)" clipRule="evenodd" />
        </clipPath>
      </defs>

      <g filter={melt > 0.02 ? `url(#${uid}-melt)` : undefined}>
        {sliver ? (
          <g clipPath={`url(#${uid}-a)`}>
            <image
              href={sliver}
              x="150"
              y="-40"
              width="220"
              height="300"
              preserveAspectRatio="xMidYMid slice"
              transform="rotate(8 260 110)"
            />
          </g>
        ) : (
          <path
            d={LETTERS.A}
            transform="translate(178 0)"
            fill="#111114"
            fillRule="evenodd"
          />
        )}
        {SLOTS.filter((slot) => !slot.window).map((slot, i) => (
          <path
            key={`${slot.key}-${i}`}
            d={LETTERS[slot.key]}
            transform={`translate(${slot.x} 0)`}
            fill="#111114"
            fillRule="evenodd"
          />
        ))}
        <rect x="880" y="96" width={48 + melt * 80} height="28" fill="#111114" />
      </g>

      <g fill="#111114" opacity={melt * 0.85}>
        {BLOBS.map(([x, y, w, h], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={h / 2}
            opacity={0.35 + (i % 3) * 0.2}
          />
        ))}
      </g>
    </svg>
  )
}

/**
 * Crazy-mode overlay. Matches the Loom: yellow wash, arrow over type,
 * floating circles, extra rotated black bars. CSS on html[data-ratio-rupture].
 */
export default function RuptureLayer() {
  return (
    <div
      data-rupture-layer
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40"
    >
      <div data-rupture-wash className="absolute inset-0" />

      <svg
        data-rupture-prop
        data-hold
        className="absolute top-[58%] left-[38%] h-24 w-[42vw]"
        viewBox="0 0 420 80"
        fill="none"
      >
        <path d="M8 40 H340" stroke="#111" strokeWidth="6" />
        <path d="M300 12 L412 40 L300 68 Z" fill="#111" />
      </svg>

      <span
        data-rupture-prop
        className="absolute top-[22%] right-[18%] size-6 rounded-full border-2 border-[#111] bg-white"
        style={{ '--ratio-prop-spin': '14s' }}
      />
      <span
        data-rupture-prop
        className="absolute top-[36%] left-[22%] size-3 rounded-full bg-[#111]"
        style={{ '--ratio-prop-spin': '9s' }}
      />
      <span
        data-rupture-prop
        className="absolute bottom-[28%] right-[12%] size-4 rounded-full border-2 border-[#111]"
        style={{ '--ratio-prop-spin': '18s' }}
      />

      <span
        data-rupture-prop
        className="absolute top-[18%] left-[46%] h-16 w-40 bg-[#111]"
        style={{ '--ratio-prop-spin': '22s' }}
      />
      <span
        data-rupture-prop
        className="absolute top-[42%] right-[28%] h-10 w-28 bg-[#111]"
        style={{ '--ratio-prop-spin': '16s' }}
      />
    </div>
  )
}

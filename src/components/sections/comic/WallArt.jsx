/**
 * WallArt — the full-width carousel of chapter 4: the wall (with the pig sitting
 * against it), the lab and the yard out back. Original vector art in the same
 * inked, cel-shaded look as the rest of the comic. Each scene is drawn in two
 * layers so the pointer and the scroll can move them apart.
 */

const INK = '#1d1311'

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function Dots({ id }) {
  return (
    <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <circle cx="4.5" cy="4.5" r="1.7" fill="#120b09" />
    </pattern>
  )
}

/** The pig sitting against the wall, whole body. */
export function PigSitting({ className = '' }) {
  return (
    <svg viewBox="0 0 420 520" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="ps-skin" cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffc2b4" />
          <stop offset="0.55" stopColor="#ef8f86" />
          <stop offset="1" stopColor="#b85462" />
        </radialGradient>
        <pattern id="ps-dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx="3.5" cy="3.5" r="1.3" fill="#120b09" />
        </pattern>
      </defs>
      <ellipse cx="220" cy="500" rx="170" ry="18" fill="#1a0614" opacity="0.5" />
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M110 470 C70 400 80 290 130 230 C170 184 270 180 312 232 C362 292 372 400 330 470Z" fill="url(#ps-skin)" />
        <path d="M312 232 C362 292 372 400 330 470 L290 470 C320 400 316 300 280 240Z" fill="#a8465a" opacity="0.55" stroke="none" />
        <path d="M168 380 C160 420 158 452 162 486 L196 486 C198 452 200 420 198 380Z" fill="#e8847e" />
        <path d="M244 380 C240 420 240 452 244 486 L278 486 C282 452 280 420 274 380Z" fill="#d87474" />
        <path d="M160 470 L162 500 L196 500 L196 470Z" fill="#2a1a3a" />
        <path d="M244 470 L244 500 L278 500 L278 470Z" fill="#2a1a3a" />
        <path d="M178 470 L178 500M260 470 L260 500" stroke="#120b18" strokeWidth="3" />
        <path d="M120 170 C114 108 160 64 220 64 C280 64 322 104 318 164 C314 214 270 246 216 246 C162 246 124 216 120 170Z" fill="url(#ps-skin)" />
        <path d="M150 92 C120 52 84 58 80 96 C80 120 102 130 122 124Z" fill="#e8847e" />
        <path d="M138 96 C120 74 100 78 98 98 C100 110 110 114 120 112Z" fill="#b84a5e" stroke="none" />
        <path d="M290 92 C320 52 356 58 360 96 C360 120 338 130 318 124Z" fill="#e8847e" />
        <path d="M302 96 C320 74 340 78 342 98 C340 110 330 114 320 112Z" fill="#b84a5e" stroke="none" />
        <ellipse cx="200" cy="176" rx="50" ry="36" fill="#f29a90" />
        <ellipse cx="184" cy="176" rx="9" ry="13" fill="#6a1e34" />
        <ellipse cx="216" cy="176" rx="9" ry="13" fill="#6a1e34" />
        <ellipse cx="156" cy="132" rx="11" ry="13" fill="#fff" />
        <ellipse cx="262" cy="132" rx="11" ry="13" fill="#fff" />
      </g>
      <circle cx="158" cy="136" r="6.5" fill="#1a1412" />
      <circle cx="260" cy="136" r="6.5" fill="#1a1412" />
      <circle cx="160" cy="133" r="2.2" fill="#fff" />
      <circle cx="262" cy="133" r="2.2" fill="#fff" />
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d="M138 112 C148 106 162 106 172 112" />
        <path d="M246 112 C256 106 270 106 280 112" />
        <path d="M200 222 C208 216 220 216 228 222" />
        <path d="M150 150 C148 164 154 172 156 172" stroke="#8ac4ff" strokeWidth="5" />
      </g>
      <path d="M180 154 C188 146 202 144 212 148" fill="none" stroke="#ffd6cc" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="136" cy="186" rx="18" ry="11" fill="#d85e70" opacity="0.5" />
      <ellipse cx="290" cy="186" rx="18" ry="11" fill="#d85e70" opacity="0.5" />
      <path d="M312 232 C362 292 372 400 330 470 L300 470 C330 390 320 300 290 250Z" fill="url(#ps-dots)" opacity="0.18" />
    </svg>
  )
}

/** The wall, full width: bricks, a tiled floor, a broken plank, a hot light. */
export function WallScene({ className = '' }) {
  const bricks = []
  for (let r = 0; r < 14; r += 1) {
    for (let c = 0; c < 18; c += 1) {
      bricks.push({ x: c * 96 - (r % 2) * 48, y: r * 46, tone: (r * 7 + c * 3) % 5, crack: (r * 13 + c * 5) % 7 === 0 })
    }
  }
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="ws-light" cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ff5a8a" stopOpacity="0.4" />
          <stop offset="0.6" stopColor="#3a0a2a" stopOpacity="0.2" />
          <stop offset="1" stopColor="#12020e" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id="ws-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a2450" />
          <stop offset="1" stopColor="#2a0a2a" />
        </linearGradient>
        <Dots id="ws-dots" />
      </defs>
      <rect width="1600" height="900" fill="#4a1030" />
      {bricks.map((b, i) => (
        <g key={i}>
          <rect x={b.x + 3} y={b.y + 3} width="90" height="40" rx="3" fill={['#a8304e', '#c23c5a', '#8e2848', '#b8365a', '#9a2c50'][b.tone]} />
          <rect x={b.x + 3} y={b.y + 3} width="90" height="8" rx="3" fill="#e05a7a" opacity="0.35" />
          {b.crack && <path d={`M${b.x + 20} ${b.y + 8} l14 12 -8 10 16 8`} fill="none" stroke="#3a0a1e" strokeWidth="2.5" />}
        </g>
      ))}
      <path d="M0 640 L1600 640 L1600 900 L0 900Z" fill="url(#ws-floor)" />
      <g stroke="#ff4f8a" strokeWidth="2.5" opacity="0.45">
        {[0, 1, 2, 3].map((i) => (
          <path key={`h${i}`} d={`M0 ${660 + i * i * 22 + i * 30} H1600`} />
        ))}
        {[-6, -4, -2, 0, 2, 4, 6].map((i) => (
          <path key={`v${i}`} d={`M${800 + i * 110} 640 L${800 + i * 320} 900`} />
        ))}
      </g>
      <path d="M1080 760 L1300 700 L1330 730 L1110 800Z" fill="#c23c5a" stroke={INK} strokeWidth="3" />
      <circle cx="1170" cy="748" r="6" fill="#3a0a1e" />
      <circle cx="1230" cy="732" r="6" fill="#3a0a1e" />
      <rect width="1600" height="900" fill="url(#ws-dots)" opacity="0.08" />
      <rect width="1600" height="900" fill="url(#ws-light)" />
    </svg>
  )
}

/** The lab: shelves of bottles under neon, a figure in a white coat at work. */
export function LabScene({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a0a3a" />
          <stop offset="0.5" stopColor="#6a1a5a" />
          <stop offset="1" stopColor="#1a0a2a" />
        </linearGradient>
        <linearGradient id="lb-coat" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd6f0" />
          <stop offset="1" stopColor="#c86ab8" />
        </linearGradient>
        <Dots id="lb-dots" />
      </defs>
      <rect width="1600" height="900" fill="url(#lb-bg)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path d={`M0 ${260 + i * 190} L760 ${360 + i * 110} L760 ${376 + i * 110} L0 ${290 + i * 190}Z`} fill="#ff7aa8" stroke={INK} strokeWidth="2.5" />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => {
            const x = 60 + k * 100
            const y = 260 + i * 190 + (x / 760) * (100 - i * 80) - 70
            return (
              <path
                key={k}
                d={`M${x} ${y + 70} L${x} ${y + 26} L${x + 12} ${y + 12} L${x + 12} ${y} L${x + 26} ${y} L${x + 26} ${y + 12} L${x + 38} ${y + 26} L${x + 38} ${y + 70}Z`}
                fill="#3a1a3a"
                stroke="#ff9ac0"
                strokeWidth="2"
              />
            )
          })}
        </g>
      ))}
      <path d="M1000 0 V180" stroke="#2a0a2a" strokeWidth="4" />
      <path d="M950 230 C950 190 1050 190 1050 230Z" fill="#ff5a8a" stroke={INK} strokeWidth="3" />
      <ellipse cx="1000" cy="240" rx="120" ry="30" fill="#ffb0c8" opacity="0.35" />
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M900 900 L920 640 L1000 640 L1010 900Z" fill="#3a2a5a" />
        <path d="M820 660 C800 520 830 360 900 320 C960 290 1040 300 1080 360 C1120 430 1110 560 1090 660Z" fill="url(#lb-coat)" />
        <path d="M900 320 C880 270 900 220 950 212 C1000 206 1030 240 1024 290 C1018 320 990 334 960 332Z" fill="#f2b8a8" />
        <path d="M920 228 C930 196 990 190 1020 220 C1000 210 960 212 940 236Z" fill="#5a2a5a" />
        <path d="M840 470 C800 500 780 520 760 540 L790 562 C820 530 860 510 880 490Z" fill="url(#lb-coat)" />
        <path d="M760 540 L700 560 L712 576 L790 562Z" fill="#cfe0ff" />
        <path d="M640 590 L708 566" stroke="#9ad8ff" strokeWidth="4" />
      </g>
      <g transform="translate(170 760)" stroke={INK} strokeWidth="3">
        <ellipse cx="0" cy="0" rx="150" ry="80" fill="#3a1a3a" />
        <path d="M120 -30 l40 -40 10 46Z" fill="#3a1a3a" />
      </g>
      <rect width="1600" height="900" fill="url(#lb-dots)" opacity="0.08" />
    </svg>
  )
}

/** Out back: pens under floodlights, crowded, behind bars. */
export function YardScene({ className = '' }) {
  const rand = rng(77)
  const backs = Array.from({ length: 40 }, () => ({ x: rand() * 1600, y: 620 + rand() * 260, s: 0.5 + rand() * 0.9 })).sort(
    (a, b) => a.y - b.y,
  )
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="yd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1a2a" />
          <stop offset="0.6" stopColor="#1a3a5a" />
          <stop offset="1" stopColor="#2a1a3a" />
        </linearGradient>
        <radialGradient id="yd-flood" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#c8f4ff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#c8f4ff" stopOpacity="0" />
        </radialGradient>
        <Dots id="yd-dots" />
      </defs>
      <rect width="1600" height="900" fill="url(#yd-sky)" />
      {[300, 1300].map((x) => (
        <g key={x}>
          <path d={`M${x} 0 V180`} stroke="#0a0a1a" strokeWidth="8" />
          <rect x={x - 40} y="170" width="80" height="26" fill="#e8f8ff" stroke={INK} strokeWidth="3" />
          <path d={`M${x - 40} 196 L${x - 380} 900 L${x + 380} 900 L${x + 40} 196Z`} fill="url(#yd-flood)" />
        </g>
      ))}
      <path d="M0 560 L1600 560 L1600 900 L0 900Z" fill="#1a2a3a" />
      {backs.map((b, i) => (
        <g key={i} transform={`translate(${b.x.toFixed(0)} ${b.y.toFixed(0)}) scale(${b.s.toFixed(2)})`}>
          <ellipse rx="70" ry="36" fill="#d88aa8" stroke={INK} strokeWidth="3" />
          <ellipse cx="-14" cy="-12" rx="34" ry="12" fill="#f8c2d8" opacity="0.6" />
        </g>
      ))}
      <g stroke="#9ab8c8" strokeWidth="10">
        {Array.from({ length: 22 }, (_, i) => (
          <path key={i} d={`M${i * 76 + 20} 520 V900`} />
        ))}
        <path d="M0 560 H1600M0 760 H1600" strokeWidth="12" />
      </g>
      <rect width="1600" height="900" fill="url(#yd-dots)" opacity="0.08" />
    </svg>
  )
}

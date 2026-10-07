/**
 * StoryArt — the art for the second half of the comic: the three wide shots
 * that zoom out (pens, sheds, aerial), the three home cards (porch, bedroom,
 * bath), the dark chapter (brick wall, farmhouse, dinner table), the closing
 * postcard and the pencil animals of the tally. Original vector art, same
 * inked, cel-shaded look as the rest of the template.
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

function Dots({ id, opacity = 0.08 }) {
  return (
    <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <circle cx="4.5" cy="4.5" r="1.7" fill="#120b09" opacity={opacity / 0.08} />
    </pattern>
  )
}

/* ── Faces ─────────────────────────────────────────────────────────────── */

/** The border collie, from the front. `mood`: 'happy' | 'bliss' | 'alert'. */
export function DogHead({ mood = 'happy', className = '' }) {
  const eyes =
    mood === 'bliss' ? (
      <g fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round">
        <path d="M-46 -112 C-38 -100 -22 -100 -14 -112" />
        <path d="M14 -112 C22 -100 38 -100 46 -112" />
      </g>
    ) : (
      <g>
        <ellipse cx="-30" cy="-110" rx="13" ry="15" fill="#fff" stroke={INK} strokeWidth="3" />
        <ellipse cx="30" cy="-110" rx="13" ry="15" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx={mood === 'alert' ? -30 : -26} cy={mood === 'alert' ? -116 : -110} r="8" fill="#1a1412" />
        <circle cx={mood === 'alert' ? 30 : 34} cy={mood === 'alert' ? -116 : -110} r="8" fill="#1a1412" />
        <circle cx="-24" cy="-114" r="2.6" fill="#fff" />
        <circle cx="36" cy="-114" r="2.6" fill="#fff" />
      </g>
    )
  return (
    <svg viewBox="-130 -210 260 260" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M-70 50 C-80 -6 -58 -34 -38 -44 L38 -44 C58 -34 80 -6 70 50Z" fill="#fbf5ea" />
        <path d="M-64 -92 C-68 -142 -34 -170 0 -170 C34 -170 68 -142 64 -92 C62 -60 34 -40 0 -40 C-34 -40 -62 -60 -64 -92Z" fill="#2a2220" />
        <path d="M-54 -152 C-90 -186 -120 -154 -116 -112 C-114 -94 -98 -86 -82 -90 C-66 -104 -56 -130 -54 -152Z" fill="#2a2220" />
        <path d="M48 -158 C78 -192 116 -168 114 -124 C114 -106 98 -96 82 -102 C64 -116 52 -138 48 -158Z" fill="#2a2220" />
        <path d="M-8 -168 L8 -168 C16 -130 22 -106 38 -84 C42 -62 24 -44 0 -44 C-24 -44 -42 -62 -38 -84 C-22 -106 -16 -130 -8 -168Z" fill="#fbf5ea" />
        <ellipse cx="0" cy="-70" rx="16" ry="12" fill="#1a1412" />
        {mood === 'alert' ? (
          <path d="M-12 -52 C-4 -46 4 -46 12 -52" fill="none" />
        ) : (
          <>
            <path d="M-22 -54 C-12 -44 -4 -44 0 -52 C4 -44 12 -44 22 -54" fill="none" strokeLinecap="round" />
            <path d="M-9 -48 C-10 -24 10 -24 9 -48Z" fill="#ef7487" />
          </>
        )}
      </g>
      {eyes}
      <path d="M-90 -138 C-96 -122 -92 -108 -84 -104" fill="none" stroke="#5a4a44" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** The pig, from the front. `mood`: 'sad' | 'calm'. */
export function PigHead({ mood = 'sad', className = '' }) {
  return (
    <svg viewBox="-130 -210 260 260" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M-74 50 C-84 -4 -62 -30 -42 -40 L42 -40 C62 -30 84 -4 74 50Z" fill="#f2a1b0" />
        <path d="M-48 -134 C-70 -176 -108 -170 -112 -128 C-112 -108 -92 -100 -74 -106 C-58 -112 -50 -122 -48 -134Z" fill="#ec8da0" />
        <path d="M48 -134 C70 -176 108 -170 112 -128 C112 -108 92 -100 74 -106 C58 -112 50 -122 48 -134Z" fill="#ec8da0" />
        <path d="M-84 -92 C-86 -146 -44 -170 0 -170 C44 -170 86 -146 84 -92 C82 -56 44 -36 0 -36 C-44 -36 -82 -56 -84 -92Z" fill="#f4a9b8" />
        <ellipse cx="0" cy="-70" rx="38" ry="28" fill="#ec8da0" />
        <ellipse cx="-13" cy="-70" rx="6" ry="9" fill="#8a2f4a" />
        <ellipse cx="13" cy="-70" rx="6" ry="9" fill="#8a2f4a" />
        <ellipse cx="-34" cy="-116" rx="9" ry="11" fill="#fff" />
        <ellipse cx="34" cy="-116" rx="9" ry="11" fill="#fff" />
      </g>
      <circle cx="-34" cy="-112" r="5.5" fill="#1a1412" />
      <circle cx="34" cy="-112" r="5.5" fill="#1a1412" />
      {mood === 'sad' ? (
        <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <path d="M-52 -138 C-44 -132 -32 -132 -22 -138" />
          <path d="M22 -138 C32 -132 44 -132 52 -138" />
          <path d="M-14 -40 C-6 -46 6 -46 14 -40" />
          <path d="M-40 -100 C-42 -88 -36 -80 -34 -80" stroke="#8ac4ff" strokeWidth="4" />
        </g>
      ) : null}
      <ellipse cx="-58" cy="-78" rx="15" ry="9" fill="#e9758c" opacity="0.6" />
      <ellipse cx="58" cy="-78" rx="15" ry="9" fill="#e9758c" opacity="0.6" />
    </svg>
  )
}

/* ── Chapter: the three wide shots ─────────────────────────────────────── */

/** Inside the long shed: an aisle between pens, neon tubes overhead. */
export function PensScene({ className = '' }) {
  const rand = rng(41)
  const backs = Array.from({ length: 46 }, () => {
    const side = rand() < 0.5 ? -1 : 1
    const depth = rand()
    const y = 520 + depth * 340
    const spread = 120 + depth * 560
    const x = 800 + side * (90 + rand() * spread)
    const s = 0.35 + depth * 1.1
    return { x, y, s, tone: rand() }
  }).sort((a, b) => a.y - b.y)
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="pn-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2a33" />
          <stop offset="0.5" stopColor="#3a2648" />
          <stop offset="1" stopColor="#5a1f44" />
        </linearGradient>
        <radialGradient id="pn-glow" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0" stopColor="#5af0ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#5af0ff" stopOpacity="0" />
        </radialGradient>
        <Dots id="pn-dots" />
      </defs>
      <rect width="1600" height="900" fill="url(#pn-bg)" />
      <ellipse cx="800" cy="330" rx="520" ry="260" fill="url(#pn-glow)" />
      {/* roof beams and tubes, converging */}
      <g stroke="#2ad0e0" strokeWidth="6" opacity="0.8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${200 - i * 40} ${40 + i * 18} L${800} 300 L${1400 + i * 40} ${40 + i * 18}`} fill="none" strokeWidth={6 - i * 0.7} />
        ))}
      </g>
      <g fill="#bffcff">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={760 - i * 60} y={250 - i * 50} width={80 + i * 120} height={6 + i * 3} rx="3" opacity={0.9 - i * 0.12} />
        ))}
      </g>
      {/* the aisle */}
      <path d="M780 330 L820 330 L1000 900 L600 900Z" fill="#2a1430" />
      {/* pen rails, both sides, in perspective */}
      <g fill="none" stroke="#ff4fa8" strokeWidth="5" opacity="0.85">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const t = i / 6
          const y = 360 + t * 520
          return (
            <g key={i}>
              <path d={`M${780 - 30 - t * 160} ${y} L${0} ${y + 40 + t * 80}`} />
              <path d={`M${820 + 30 + t * 160} ${y} L${1600} ${y + 40 + t * 80}`} />
            </g>
          )
        })}
        <path d="M780 330 L600 900M820 330 L1000 900" stroke="#2ad0e0" strokeWidth="6" />
      </g>
      {/* backs of the animals in the pens */}
      {backs.map((b, i) => (
        <g key={i} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${b.s.toFixed(2)})`}>
          <ellipse cx="0" cy="0" rx="64" ry="34" fill={b.tone > 0.5 ? '#f490b6' : '#e46a9c'} stroke={INK} strokeWidth="3" />
          <ellipse cx="-16" cy="-10" rx="34" ry="12" fill="#ffc2da" opacity="0.7" />
          <path d="M52 -14 l18 -16 4 22Z" fill="#e46a9c" stroke={INK} strokeWidth="2.5" />
        </g>
      ))}
      <rect width="1600" height="900" fill="url(#pn-dots)" opacity="0.08" />
    </svg>
  )
}

/** The complex at dusk: long sheds running toward the hills. */
export function ShedsScene({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f3a5a" />
          <stop offset="0.45" stopColor="#c8408a" />
          <stop offset="0.7" stopColor="#ff7a6a" />
          <stop offset="1" stopColor="#3a1a4a" />
        </linearGradient>
        <Dots id="sh-dots" />
      </defs>
      <rect width="1600" height="900" fill="url(#sh-sky)" />
      <path d="M0 360 C260 330 520 350 800 340 C1080 330 1340 350 1600 340 L1600 420 L0 420Z" fill="#4a3a7a" />
      <path d="M0 420 L1600 420 L1600 900 L0 900Z" fill="#2a1838" />
      {/* sheds: long roofs converging to the horizon */}
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
        const x0 = 800 + i * 70
        const x1 = 800 + i * 520
        return (
          <g key={i} stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <path d={`M${x0 - 26} 430 L${x0 + 26} 430 L${x1 + 190} 900 L${x1 - 190} 900Z`} fill={i % 2 ? '#6a3a8a' : '#7e44a0'} />
            <path d={`M${x0} 424 L${x0 + 26} 430 L${x1 + 190} 900 L${x1} 900Z`} fill="#c45aa8" opacity="0.75" />
            <path d={`M${x0} 424 L${x1} 900`} stroke="#ffb0d8" strokeWidth="3" opacity="0.8" />
          </g>
        )
      })}
      <g fill="#ffe08a">
        <rect x="1180" y="470" width="14" height="8" />
        <rect x="380" y="500" width="14" height="8" />
        <rect x="1300" y="540" width="16" height="9" />
      </g>
      <rect width="1600" height="900" fill="url(#sh-dots)" opacity="0.08" />
    </svg>
  )
}

/** From above: rows of sheds to the horizon. */
export function AerialScene({ className = '' }) {
  const rows = []
  for (let r = 0; r < 9; r += 1) {
    const t = r / 8
    const y = 330 + Math.pow(t, 1.6) * 620
    const h = 14 + t * 70
    const w = 60 + t * 230
    const gap = w * 1.25
    const count = Math.ceil(1800 / gap) + 2
    for (let c = 0; c < count; c += 1) {
      rows.push({ x: -100 + c * gap + (r % 2) * gap * 0.5, y, w, h, tone: (r + c) % 3 })
    }
  }
  return (
    <svg viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ae-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4a8a" />
          <stop offset="0.3" stopColor="#ff7a6a" />
          <stop offset="0.36" stopColor="#5a2a6a" />
          <stop offset="1" stopColor="#2a1838" />
        </linearGradient>
        <Dots id="ae-dots" />
      </defs>
      <rect width="1600" height="900" fill="url(#ae-sky)" />
      {rows.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={['#8a3aa0', '#6a2a8a', '#a8449a'][b.tone]} stroke={INK} strokeWidth="1.5" />
          <rect x={b.x} y={b.y} width={b.w} height={b.h * 0.35} fill="#ff9ad0" opacity="0.55" />
        </g>
      ))}
      <rect width="1600" height="900" fill="url(#ae-dots)" opacity="0.08" />
    </svg>
  )
}

/* ── Chapter: three home cards ─────────────────────────────────────────── */

export function PorchBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="po-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2b24a" />
          <stop offset="1" stopColor="#c8742a" />
        </linearGradient>
        <Dots id="po-dots" />
      </defs>
      <rect width="1600" height="560" fill="url(#po-wall)" />
      {/* barrels on the left */}
      <g stroke={INK} strokeWidth="3">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${70 + (i % 2) * 30} ${80 + i * 160})`}>
            <ellipse cx="80" cy="70" rx="90" ry="76" fill="#d9a24a" />
            <path d="M0 70 h160" stroke="#8a5a20" />
            <ellipse cx="80" cy="70" rx="40" ry="34" fill="none" stroke="#a8742e" />
          </g>
        ))}
      </g>
      {/* the blue door */}
      <g stroke={INK} strokeWidth="3">
        <rect x="900" y="0" width="560" height="560" fill="#2a4ab8" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={910 + i * 92} y="0" width="76" height="560" fill={i % 2 ? '#3456c8' : '#2a4ab8'} />
        ))}
        <circle cx="940" cy="320" r="10" fill="#e8b84a" />
      </g>
      <path d="M0 480 L1600 480 L1600 560 L0 560Z" fill="#8a4a20" />
      <rect width="1600" height="560" fill="url(#po-dots)" opacity="0.08" />
    </svg>
  )
}

export function BedroomBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <Dots id="be-dots" />
      </defs>
      <rect width="1600" height="560" fill="#f3efe6" />
      {/* the window and the fields outside */}
      <g stroke={INK} strokeWidth="4">
        <rect x="120" y="40" width="900" height="380" fill="#9ad0a0" />
        <path d="M120 260 C320 220 520 280 760 240 C880 220 960 230 1020 236 L1020 420 L120 420Z" fill="#5aa860" />
        <path d="M120 330 C360 300 620 350 1020 320 L1020 420 L120 420Z" fill="#3a8a4a" />
        <path d="M570 40 V420M120 230 H1020" stroke="#6a3a9a" strokeWidth="14" />
        <rect x="120" y="40" width="900" height="380" fill="none" stroke="#6a3a9a" strokeWidth="18" />
      </g>
      {/* striped blanket */}
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={i * 200} y="440" width="100" height="120" fill={i % 2 ? '#e8e2d4' : '#4a8a9a'} />
        ))}
      </g>
      <rect width="1600" height="560" fill="url(#be-dots)" opacity="0.06" />
    </svg>
  )
}

/** A hand coming in to pet the dog. */
export function PettingHand({ className = '' }) {
  return (
    <svg viewBox="0 0 600 260" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M600 60 L420 70 L410 170 L600 180Z" fill="#7a5ab8" />
        <path d="M420 70 C340 60 260 70 200 100 C150 124 110 150 90 176 C110 190 150 190 190 176 C240 200 300 210 360 196 C390 190 410 180 420 170Z" fill="#f2a888" />
        <path d="M200 100 C170 88 130 90 100 102" fill="none" />
        <path d="M190 176 C220 168 250 170 280 180" fill="none" stroke="#c87a5a" strokeWidth="3" />
      </g>
    </svg>
  )
}

export function BathBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <Dots id="ba-dots" />
      </defs>
      <rect width="1600" height="560" fill="#f4f2ee" />
      <g stroke="#d8d4cc" strokeWidth="4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path key={`v${i}`} d={`M${i * 220} 0 V420`} />
        ))}
        {[0, 1, 2].map((i) => (
          <path key={`h${i}`} d={`M0 ${i * 140} H1600`} />
        ))}
      </g>
      {/* the shelf: towels and a bottle */}
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <rect x="560" y="330" width="760" height="22" fill="#c86a4a" />
        <rect x="640" y="268" width="260" height="62" rx="14" fill="#5aa860" />
        <rect x="660" y="244" width="220" height="40" rx="12" fill="#6ac070" />
        <path d="M1000 330 L1000 190 C1000 172 1012 162 1026 162 L1058 162 C1072 162 1084 172 1084 190 L1084 330Z" fill="#f2a83a" />
        <rect x="1024" y="130" width="36" height="34" fill="#e8e2d4" />
      </g>
      <path d="M0 420 L1600 420 L1600 560 L0 560Z" fill="#c86a6a" />
      <rect width="1600" height="560" fill="url(#ba-dots)" opacity="0.06" />
    </svg>
  )
}

/* ── Chapter: the dark side ────────────────────────────────────────────── */

export function BrickBg({ className = '' }) {
  const bricks = []
  for (let r = 0; r < 12; r += 1) {
    for (let c = 0; c < 18; c += 1) {
      bricks.push({ x: c * 100 - (r % 2) * 50, y: r * 50, tone: (r * 7 + c * 3) % 5 })
    }
  }
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="br-light" cx="0.55" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#ff5a8a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1a0a1a" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <rect width="1600" height="560" fill="#5a1a3a" />
      {bricks.map((b, i) => (
        <rect key={i} x={b.x + 3} y={b.y + 3} width="94" height="44" rx="3" fill={['#a8304e', '#c23c5a', '#8e2848', '#b8365a', '#9a2c50'][b.tone]} />
      ))}
      <path d="M0 470 L1600 470 L1600 560 L0 560Z" fill="#3a1028" />
      <path d="M1200 500 l180 -40 10 20 -180 40Z" fill="#7a4a2a" stroke={INK} strokeWidth="2" />
      <rect width="1600" height="560" fill="url(#br-light)" />
    </svg>
  )
}

export function FarmhouseBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="fh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a6a" />
          <stop offset="0.6" stopColor="#c8406a" />
          <stop offset="1" stopColor="#ff8a6a" />
        </linearGradient>
        <Dots id="fh-dots" />
      </defs>
      <rect width="1600" height="560" fill="url(#fh-sky)" />
      <path d="M0 360 C300 300 600 340 900 320 C1200 300 1400 330 1600 320 L1600 560 L0 560Z" fill="#6a2a6a" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M520 470 L520 250 L760 120 L1000 250 L1000 470Z" fill="#c4284a" />
        <path d="M760 120 L1000 250 L1240 260 L1240 470 L1000 470 L1000 250Z" fill="#2e2a6e" />
        <path d="M490 262 L760 108 L1030 262" fill="none" stroke="#f4b0b8" strokeWidth="7" />
        <rect x="700" y="330" width="120" height="140" fill="#2a0a18" />
        <path d="M740 170 l40 0 0 40 -40 0Z" fill="#ffe08a" />
        <g fill="#ffe08a">
          <rect x="1040" y="320" width="26" height="20" />
          <rect x="1100" y="320" width="26" height="20" />
          <rect x="1160" y="320" width="26" height="20" />
        </g>
      </g>
      <g fill="#2a2a4a" stroke={INK} strokeWidth="2.5">
        <path d="M420 500 c0-24 20-36 50-36 h70 c20 0 34 12 40 30 v14 h-160Z" />
        <circle cx="450" cy="508" r="14" />
        <circle cx="560" cy="508" r="14" />
      </g>
      <path d="M0 500 L1600 500 L1600 560 L0 560Z" fill="#3a1a3a" />
      <rect width="1600" height="560" fill="url(#fh-dots)" opacity="0.08" />
    </svg>
  )
}

export function DinnerBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="dn-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a8a6a" />
          <stop offset="1" stopColor="#e8d86a" />
        </linearGradient>
        <Dots id="dn-dots" />
      </defs>
      <rect width="1600" height="560" fill="url(#dn-wall)" />
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path key={i} d={`M${i * 220} 0 V400`} />
        ))}
        {[0, 1, 2].map((i) => (
          <path key={`h${i}`} d={`M0 ${i * 130} H1600`} />
        ))}
      </g>
      {/* the table and the plates */}
      <path d="M0 440 L1600 440 L1600 560 L0 560Z" fill="#7a3a2a" stroke={INK} strokeWidth="3" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <ellipse cx="760" cy="452" rx="300" ry="34" fill="#e8f0e8" />
        <path d="M600 444 C620 400 700 392 760 404 C800 412 840 426 860 444Z" fill="#a8542a" />
        <path d="M640 430 C660 418 690 414 720 418" fill="none" stroke="#e08a4a" strokeWidth="5" />
        <circle cx="900" cy="438" r="20" fill="#5aa860" />
        <circle cx="934" cy="444" r="16" fill="#6ac070" />
        <circle cx="560" cy="440" r="18" fill="#e8b84a" />
        <path d="M1050 400 L1050 452 L1100 452 L1100 400Z" fill="#e8a05a" />
        <path d="M1100 412 c22 0 22 30 0 30" fill="none" />
      </g>
      <g stroke="#e8c84a" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M80 440 c-6-50 6-90 30-120M120 440 c0-40 14-70 40-90M160 440 c6-30 20-50 44-62" />
      </g>
      <rect width="1600" height="560" fill="url(#dn-dots)" opacity="0.06" />
    </svg>
  )
}

/** A hand with a knife, reaching in from the right. */
export function KnifeHand({ className = '' }) {
  return (
    <svg viewBox="0 0 600 200" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M600 80 L480 90 L470 150 L600 160Z" fill="#e8e2d4" />
        <path d="M480 90 C440 84 400 92 380 108 C370 120 372 140 390 150 C420 158 450 156 470 150Z" fill="#f2a888" />
        <path d="M390 116 L60 40 L50 54 L384 136Z" fill="#c8d8e0" />
        <path d="M60 40 L384 116" stroke="#ffffff" strokeWidth="3" />
      </g>
    </svg>
  )
}

/* ── Closing ───────────────────────────────────────────────────────────── */

/** The postcard: half dog, half pig. */
export function Postcard({ title = 'Title 1', className = '' }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true">
      <rect x="6" y="6" width="388" height="288" fill="#f4d8d8" stroke="#fff" strokeWidth="10" />
      <rect x="20" y="20" width="360" height="260" fill="#f08a9a" />
      <path d="M200 20 L380 20 L380 280 L200 280Z" fill="#e86a7e" />
      <defs>
        <clipPath id="pc-left"><rect x="20" y="20" width="180" height="260" /></clipPath>
        <clipPath id="pc-right"><rect x="200" y="20" width="180" height="260" /></clipPath>
      </defs>
      {/* one face: the left half is the dog, the right half the pig */}
      <g clipPath="url(#pc-left)">
        <g transform="translate(200 270) scale(1.25)">
          <DogHeadInline />
        </g>
      </g>
      <g clipPath="url(#pc-right)">
        <g transform="translate(200 270) scale(1.25)">
          <PigHeadInline />
        </g>
      </g>
      <path d="M200 20 V280" stroke="#fff" strokeWidth="3" opacity="0.6" />
      <text x="36" y="262" fontFamily="'Londrina Solid', sans-serif" fontWeight="900" fontSize="34" fill="#fff" stroke="#1d1311" strokeWidth="1.5" paintOrder="stroke">
        {title}
      </text>
    </svg>
  )
}

function DogHeadInline() {
  return (
    <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
      <path d="M-64 -92 C-68 -142 -34 -170 0 -170 C34 -170 68 -142 64 -92 C62 -60 34 -40 0 -40 C-34 -40 -62 -60 -64 -92Z" fill="#2a2220" />
      <path d="M-54 -152 C-90 -186 -120 -154 -116 -112 C-114 -94 -98 -86 -82 -90 C-66 -104 -56 -130 -54 -152Z" fill="#2a2220" />
      <path d="M-8 -168 L8 -168 C16 -130 22 -106 38 -84 C42 -62 24 -44 0 -44 C-24 -44 -42 -62 -38 -84 C-22 -106 -16 -130 -8 -168Z" fill="#fbf5ea" />
      <ellipse cx="-30" cy="-110" rx="13" ry="15" fill="#fff" />
      <circle cx="-26" cy="-110" r="8" fill="#1a1412" stroke="none" />
      <ellipse cx="0" cy="-70" rx="16" ry="12" fill="#1a1412" />
    </g>
  )
}

function PigHeadInline() {
  return (
    <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
      <path d="M-84 -92 C-86 -146 -44 -170 0 -170 C44 -170 86 -146 84 -92 C82 -56 44 -36 0 -36 C-44 -36 -82 -56 -84 -92Z" fill="#f4a9b8" />
      <path d="M48 -134 C70 -176 108 -170 112 -128 C112 -108 92 -100 74 -106 C58 -112 50 -122 48 -134Z" fill="#ec8da0" />
      <ellipse cx="0" cy="-70" rx="38" ry="28" fill="#ec8da0" />
      <ellipse cx="13" cy="-70" rx="6" ry="9" fill="#8a2f4a" />
      <ellipse cx="34" cy="-116" rx="9" ry="11" fill="#fff" />
      <circle cx="34" cy="-112" r="5.5" fill="#1a1412" stroke="none" />
    </g>
  )
}

/**
 * Pencil drawings of animals for the tally cards: line art with a little
 * hatching. `kind`: fish | chicken | duck | pig | rabbit | turkey | sheep | cow.
 */
export function AnimalSketch({ kind, className = '' }) {
  const line = { fill: 'none', stroke: '#2a2622', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const hatch = { fill: 'none', stroke: '#2a2622', strokeWidth: 1.4, opacity: 0.55, strokeLinecap: 'round' }
  const body = {
    fish: (
      <>
        <path {...line} d="M30 100 C70 50 160 46 210 92 C160 140 70 146 30 100Z" />
        <path {...line} d="M210 92 L262 58 L252 100 L262 140Z" />
        <circle cx="62" cy="92" r="5" fill="#2a2622" />
        <path {...line} d="M96 70 C110 92 110 112 96 132" />
        <path {...hatch} d="M120 80 l20 16M130 96 l24 16M120 110 l22 14M150 72 l18 14M156 92 l20 14" />
      </>
    ),
    chicken: (
      <>
        <path {...line} d="M70 150 C40 110 60 60 110 56 C120 30 150 24 160 44 C170 60 160 76 150 82 C180 96 210 80 230 56 C236 110 200 160 140 166 C110 168 86 164 70 150Z" />
        <path {...line} d="M150 44 l12 -18 8 14 10 -10 2 20" />
        <path {...line} d="M110 56 l-20 6 18 8" />
        <circle cx="128" cy="52" r="4" fill="#2a2622" />
        <path {...line} d="M120 166 l-6 34 M150 166 l4 34" />
        <path {...hatch} d="M150 110 l40 -20M150 126 l50 -24M140 142 l56 -26" />
      </>
    ),
    duck: (
      <>
        <path {...line} d="M50 140 C40 100 80 86 130 96 C150 70 140 40 170 34 C196 30 210 52 200 70 C196 80 184 84 176 86 C190 110 220 116 240 104 C230 150 180 170 120 168 C90 166 60 160 50 140Z" />
        <path {...line} d="M200 58 l30 6 -28 12" />
        <circle cx="180" cy="52" r="4" fill="#2a2622" />
        <path {...hatch} d="M90 124 l50 -14M96 140 l60 -18M110 154 l50 -14" />
      </>
    ),
    pig: (
      <>
        <path {...line} d="M50 110 C50 70 100 50 170 56 C220 60 250 86 248 112 C246 140 220 158 170 160 C110 162 50 150 50 110Z" />
        <path {...line} d="M248 100 l20 -2 0 26 -20 -4" />
        <path {...line} d="M220 62 l10 -24 10 28" />
        <circle cx="228" cy="88" r="4" fill="#2a2622" />
        <path {...line} d="M80 156 l-2 34M110 160 l0 30M190 160 l2 30M218 152 l4 34" />
        <path {...line} d="M50 100 c-16 -6 -20 -22 -8 -28" />
        <path {...hatch} d="M90 90 l40 -16M100 110 l60 -24M120 128 l60 -24M150 142 l50 -20" />
      </>
    ),
    rabbit: (
      <>
        <path {...line} d="M80 170 C50 130 70 84 120 80 C140 78 160 86 170 100 C200 96 220 116 216 140 C212 164 180 176 140 176 C110 176 94 176 80 170Z" />
        <path {...line} d="M176 96 C170 50 180 16 196 14 C204 40 198 74 190 98" />
        <path {...line} d="M162 94 C150 54 150 22 164 18 C176 44 176 74 174 96" />
        <circle cx="196" cy="118" r="4" fill="#2a2622" />
        <path {...hatch} d="M100 120 l30 -10M96 140 l44 -14M110 156 l40 -12" />
      </>
    ),
    turkey: (
      <>
        <path {...line} d="M90 160 C60 140 60 100 90 84 C70 60 80 26 110 24 C120 4 160 6 170 24 C200 26 214 56 196 84 C220 100 220 140 190 160Z" />
        <path {...line} d="M150 150 C150 120 160 100 176 90 C190 84 200 70 196 56 L210 52 L200 70" />
        <circle cx="194" cy="62" r="4" fill="#2a2622" />
        <path {...line} d="M140 160 l-4 34M170 160 l4 34" />
        <path {...hatch} d="M100 60 l16 40M120 40 l10 50M146 34 l0 50M168 40 l-6 48" />
      </>
    ),
    sheep: (
      <>
        <path {...line} d="M60 120 C40 100 56 70 84 76 C90 54 120 48 136 62 C152 46 184 52 188 74 C214 72 228 100 210 120 C226 140 206 166 182 158 C170 176 136 176 124 162 C106 176 76 170 74 150 C52 150 44 132 60 120Z" />
        <path {...line} d="M206 96 C230 90 246 104 240 122 C234 136 216 136 208 128" />
        <circle cx="228" cy="110" r="4" fill="#2a2622" />
        <path {...line} d="M100 166 l-2 30M130 170 l0 28M170 168 l2 30M194 160 l4 32" />
      </>
    ),
    cow: (
      <>
        <path {...line} d="M40 90 C40 70 70 60 120 62 L210 64 C236 64 250 80 248 104 L246 140 C244 160 220 166 180 166 L90 166 C60 166 40 150 40 130Z" />
        <path {...line} d="M248 80 C270 70 286 82 282 104 C278 122 262 128 248 124" />
        <path {...line} d="M252 72 l-4 -22M270 74 l10 -18" />
        <circle cx="264" cy="96" r="4" fill="#2a2622" />
        <path {...line} d="M70 166 l-2 34M100 166 l0 34M200 166 l2 34M230 162 l4 36" />
        <path {...line} d="M40 96 c-16 10 -18 34 -6 46" />
        <path {...line} d="M120 80 c20 6 30 30 10 44 c-20 12 -40 0 -36 -18" />
        <path {...hatch} d="M160 90 l40 -16M170 110 l44 -18M150 140 l56 -22" />
      </>
    ),
  }[kind]
  return (
    <svg viewBox="0 0 300 210" className={className} aria-hidden="true">
      {body}
    </svg>
  )
}

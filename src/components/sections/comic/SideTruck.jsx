/**
 * SideTruck — the old pickup in profile, facing right, with the dog and the pig
 * looking over the rail. A cutout (no background) so it can drive across the
 * page and settle into a scene. Same inked, cel-shaded vector look as RoadHero.
 */

const INK = '#1d1311'

function Wheel({ cx, cy }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="62" fill="#171413" stroke={INK} strokeWidth="3.5" />
      <circle cx={cx} cy={cy} r="44" fill="#26211f" stroke="#0e0b0a" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="27" fill="#8f3b22" stroke={INK} strokeWidth="3" />
      <circle cx={cx} cy={cy} r="12" fill="#c9a96a" stroke={INK} strokeWidth="2.5" />
      <path d={`M${cx - 52} ${cy - 20} A56 56 0 0 1 ${cx - 20} ${cy - 52}`} fill="none" stroke="#5a504c" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <path
          key={deg}
          d={`M${cx} ${cy - 14} L${cx} ${cy - 25}`}
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
    </g>
  )
}

export default function SideTruck({ className = '' }) {
  return (
    <svg viewBox="0 0 900 470" className={className} aria-hidden="true">
      <defs>
        <pattern id="st-dots" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx="4.5" cy="4.5" r="1.7" fill="#120b09" />
        </pattern>
      </defs>

      <ellipse cx="450" cy="424" rx="410" ry="20" fill="#120b09" opacity="0.4" />

      {/* chassis */}
      <path d="M110 330 L810 330 L810 372 L110 372Z" fill="#161211" stroke={INK} strokeWidth="3" />

      {/* the animals, looking over the rail */}
      <g transform="translate(150 214) scale(0.62)">
        <path d="M-70 90 C-80 20 -56 -20 -36 -28 L36 -28 C56 -20 80 20 70 90Z" fill="#fbf5ea" stroke={INK} strokeWidth="4" />
        <path d="M-62 -60 C-66 -108 -34 -136 0 -136 C34 -136 66 -108 62 -60 C60 -30 34 -10 0 -10 C-34 -10 -60 -30 -62 -60Z" fill="#2a2220" stroke={INK} strokeWidth="4" />
        <path d="M-52 -118 C-86 -144 -112 -118 -108 -80 C-106 -64 -92 -56 -78 -60 C-64 -72 -54 -96 -52 -118Z" fill="#2a2220" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M46 -124 C74 -154 108 -134 108 -94 C108 -76 92 -66 78 -72 C62 -84 50 -104 46 -124Z" fill="#2a2220" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M-8 -134 L8 -134 C16 -98 20 -76 36 -54 C40 -32 22 -16 0 -16 C-22 -16 -40 -32 -36 -54 C-20 -76 -14 -98 -8 -134Z" fill="#fbf5ea" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="0" cy="-38" rx="15" ry="11" fill="#1a1412" />
        <path d="M-8 -18 C-8 4 8 4 8 -18Z" fill="#ef7487" stroke={INK} strokeWidth="3" />
        <ellipse cx="-30" cy="-78" rx="12" ry="14" fill="#fff" stroke={INK} strokeWidth="3" />
        <ellipse cx="30" cy="-78" rx="12" ry="14" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="-26" cy="-80" r="7" fill="#1a1412" />
        <circle cx="34" cy="-80" r="7" fill="#1a1412" />
        <circle cx="-24" cy="-83" r="2.4" fill="#fff" />
        <circle cx="36" cy="-83" r="2.4" fill="#fff" />
      </g>
      <g transform="translate(262 218) scale(0.6)">
        <path d="M-72 90 C-82 30 -62 -14 -40 -24 L40 -24 C62 -14 82 30 72 90Z" fill="#f2a1b0" stroke={INK} strokeWidth="4" />
        <path d="M-48 -100 C-70 -142 -108 -136 -112 -94 C-112 -74 -92 -66 -74 -72 C-58 -78 -50 -88 -48 -100Z" fill="#ec8da0" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M48 -100 C70 -142 108 -136 112 -94 C112 -74 92 -66 74 -72 C58 -78 50 -88 48 -100Z" fill="#ec8da0" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M-84 -58 C-86 -112 -44 -136 0 -136 C44 -136 86 -112 84 -58 C82 -22 44 -2 0 -2 C-44 -2 -82 -22 -84 -58Z" fill="#f4a9b8" stroke={INK} strokeWidth="4" />
        <ellipse cx="-58" cy="-44" rx="16" ry="10" fill="#e9758c" opacity="0.65" />
        <ellipse cx="58" cy="-44" rx="16" ry="10" fill="#e9758c" opacity="0.65" />
        <ellipse cx="0" cy="-36" rx="38" ry="28" fill="#ec8da0" stroke={INK} strokeWidth="4" />
        <ellipse cx="-13" cy="-36" rx="6" ry="9" fill="#8a2f4a" />
        <ellipse cx="13" cy="-36" rx="6" ry="9" fill="#8a2f4a" />
        <ellipse cx="-34" cy="-84" rx="9" ry="11" fill="#fff" stroke={INK} strokeWidth="3" />
        <ellipse cx="34" cy="-84" rx="9" ry="11" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="-36" cy="-82" r="5.5" fill="#1a1412" />
        <circle cx="32" cy="-82" r="5.5" fill="#1a1412" />
      </g>

      {/* the bed: sides, posts, rail */}
      <path d="M62 220 L352 220 L352 346 L62 346Z" fill="#2d4a47" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M62 220 L352 220 L352 236 L62 236Z" fill="#46766d" stroke={INK} strokeWidth="3" />
      <path d="M62 236 L96 236 L96 346 L62 346Z" fill="#3a5f58" opacity="0.7" />
      <g stroke="#14282a" strokeWidth="3" opacity="0.8">
        <path d="M120 238 V344M178 238 V344M290 238 V344M330 238 V344" />
      </g>
      <path d="M62 220 L352 220 L352 346 L62 346Z" fill="url(#st-dots)" opacity="0.14" />
      {/* rear wheel well */}
      <path d="M154 346 A76 76 0 0 1 306 346Z" fill="#0f1b1a" stroke={INK} strokeWidth="3" />

      {/* cab */}
      <path d="M352 346 L352 190 Q352 126 404 112 L520 112 Q560 112 580 150 L616 212 L616 346Z" fill="#2d4a47" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M352 346 L352 190 Q352 126 404 112 L430 112 L392 346Z" fill="#3c6760" opacity="0.7" />
      <path d="M374 168 L374 236 L520 236 L520 168 Q520 142 498 142 L398 142 Q374 142 374 168Z" fill="#f19a3e" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M374 214 L424 142 L452 142 L402 236 L374 236Z" fill="#ffc872" opacity="0.8" />
      <path d="M548 150 L580 214 L536 214 L536 150Z" fill="#f19a3e" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M536 244 L536 346" stroke="#14282a" strokeWidth="3" />
      <rect x="500" y="262" width="26" height="9" rx="4" fill="#bdb6a6" stroke={INK} strokeWidth="2" />
      <path d="M352 346 L352 190 Q352 126 404 112 L520 112 Q560 112 580 150 L616 212 L616 346Z" fill="url(#st-dots)" opacity="0.13" />

      {/* hood, grille, front fender */}
      <path d="M616 236 L730 232 Q786 232 806 262 L814 346 L616 346Z" fill="#33524e" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M616 236 L730 232 Q786 232 806 262 L800 262 Q770 244 730 244 L616 248Z" fill="#5f8f85" opacity="0.8" />
      <g stroke="#14282a" strokeWidth="3" opacity="0.7">
        <path d="M650 262 L740 262M650 282 L748 282M650 302 L756 302" />
      </g>
      <path d="M626 346 Q626 262 692 262 Q766 262 790 332 L798 346Z" fill="#37605a" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M640 330 Q646 280 690 274" fill="none" stroke="#7aaaa0" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <path d="M804 250 L832 250 L832 346 L804 346Z" fill="#bdb6a6" stroke={INK} strokeWidth="3" />
      <path d="M814 256 V342M824 256 V342" stroke="#6f6a60" strokeWidth="2.5" />
      <circle cx="796" cy="268" r="19" fill="#f6e3b0" stroke={INK} strokeWidth="3.5" />
      <circle cx="793" cy="265" r="8" fill="#fffbe8" />
      <path d="M800 338 L846 338 L846 366 L800 366Z" fill="#cfcabd" stroke={INK} strokeWidth="3" />
      <path d="M800 338 L846 338 L846 346 L800 346Z" fill="#fff" opacity="0.6" />

      {/* running board */}
      <path d="M352 346 L626 346 L626 362 L352 362Z" fill="#1c3331" stroke={INK} strokeWidth="3" />

      <Wheel cx="230" cy="360" />
      <Wheel cx="690" cy="360" />
    </svg>
  )
}

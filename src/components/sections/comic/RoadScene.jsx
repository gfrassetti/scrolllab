/**
 * Rich layered road scene — painterly SVG blocks for parallax / camera zoom.
 */
export default function RoadScene({ variant = 'wide' }) {
  const isClose = variant === 'close'
  const isDrive = variant === 'drive'

  return (
    <svg
      viewBox={isClose ? '480 480 700 420' : '0 0 1600 900'}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDrive ? '#2a1a4a' : '#6aa8a4'} />
          <stop offset="40%" stopColor={isDrive ? '#c45a7a' : '#ef9a4a'} />
          <stop offset="100%" stopColor={isDrive ? '#f07838' : '#e85a24'} />
        </linearGradient>
        <linearGradient id={`road-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a7772" />
          <stop offset="100%" stopColor="#3a3835" />
        </linearGradient>
        <radialGradient id={`sun-${variant}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8e8" />
          <stop offset="70%" stopColor="#ffe0a8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffe0a8" stopOpacity="0" />
        </radialGradient>
        <filter id={`grain-${variant}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>

      <g data-layer="sky">
        <rect width="1600" height="900" fill={`url(#sky-${variant})`} />
        <circle
          cx={isDrive ? 980 : 1220}
          cy={isDrive ? 260 : 200}
          r={isDrive ? 120 : 95}
          fill={`url(#sun-${variant})`}
        />
        <ellipse cx="280" cy="150" rx="140" ry="28" fill="#f6d9a8" opacity="0.35" />
        <ellipse cx="520" cy="190" rx="100" ry="22" fill="#f6d9a8" opacity="0.28" />
        <ellipse cx="900" cy="130" rx="160" ry="26" fill="#f3c98a" opacity="0.3" />
      </g>

      <g data-layer="mountains">
        <path
          d="M0 440 L160 290 L300 370 L460 230 L640 350 L820 200 L1000 330 L1200 180 L1400 320 L1600 240 L1600 540 L0 540 Z"
          fill="#4f63b5"
        />
        <path
          d="M0 480 L200 350 L380 420 L560 300 L760 410 L980 270 L1220 390 L1460 300 L1600 360 L1600 560 L0 560 Z"
          fill="#6a529e"
          opacity="0.9"
        />
        {!isClose && (
          <>
            <rect x="1080" y="340" width="28" height="70" fill="#3d2f6e" />
            <rect x="1120" y="320" width="34" height="90" fill="#3d2f6e" />
            <path d="M1280 400 L1310 340 L1340 400 Z" fill="#8b2e2e" />
            <rect x="1295" y="400" width="30" height="28" fill="#6e2222" />
          </>
        )}
      </g>

      <g data-layer="hills">
        <path
          d="M0 520 C240 450 420 540 680 480 C920 420 1120 540 1380 470 C1500 440 1560 490 1600 470 L1600 680 L0 680 Z"
          fill="#d3542a"
        />
        <path
          d="M0 580 C200 520 400 600 620 550 C860 490 1060 610 1300 540 C1460 500 1540 560 1600 530 L1600 720 L0 720 Z"
          fill="#e56f33"
        />
        <path
          d="M0 640 C180 600 360 660 580 620 C820 570 1040 680 1280 620 C1440 580 1540 640 1600 610 L1600 760 L0 760 Z"
          fill="#b83d1c"
        />
      </g>

      {!isClose && (
        <g data-layer="road">
          {isDrive ? (
            <>
              <path d="M0 620 L1600 620 L1600 820 L0 820 Z" fill={`url(#road-${variant})`} />
              <path
                d="M0 710 H1600"
                stroke="#e8c84a"
                strokeWidth="8"
                strokeDasharray="40 36"
                opacity="0.85"
              />
            </>
          ) : (
            <>
              <path d="M600 500 L1000 500 L1320 900 L280 900 Z" fill={`url(#road-${variant})`} />
              <path d="M785 515 L815 515 L830 900 L770 900 Z" fill="#e8c84a" opacity="0.9" />
            </>
          )}
        </g>
      )}

      <g data-layer="dust" opacity="0.65">
        <ellipse cx="520" cy="710" rx="70" ry="22" fill="#e8dfd2" />
        <ellipse cx="470" cy="730" rx="48" ry="14" fill="#d6ccbe" />
        <ellipse cx="560" cy="698" rx="36" ry="12" fill="#f0e8dc" />
      </g>

      <g data-layer="truck" transform={isDrive ? 'translate(200 40)' : undefined}>
        {isDrive ? (
          <>
            <rect x="420" y="560" width="380" height="130" rx="14" fill="#1a524c" />
            <rect x="700" y="520" width="160" height="170" rx="12" fill="#174842" />
            <rect x="720" y="540" width="80" height="55" rx="6" fill="#f0a040" />
            <circle cx="500" cy="710" r="42" fill="#1a1a1a" />
            <circle cx="500" cy="710" r="18" fill="#6b655c" />
            <circle cx="780" cy="710" r="42" fill="#1a1a1a" />
            <circle cx="780" cy="710" r="18" fill="#6b655c" />
            <g data-layer="pig" transform="translate(470 500)">
              <ellipse cx="50" cy="48" rx="42" ry="34" fill="#f2a4b0" />
              <circle cx="36" cy="40" r="6" fill="#2a2220" />
              <ellipse cx="78" cy="52" rx="14" ry="10" fill="#e88998" />
            </g>
            <g data-layer="dog" transform="translate(560 485)">
              <ellipse cx="55" cy="55" rx="44" ry="38" fill="#f5f2ea" />
              <ellipse cx="28" cy="48" rx="18" ry="24" fill="#2a2a2a" />
              <circle cx="48" cy="50" r="6" fill="#1a1a1a" />
              <circle cx="70" cy="50" r="6" fill="#1a1a1a" />
              <path
                data-layer="tail"
                d="M98 58 C130 30 145 80 120 92"
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="11"
                strokeLinecap="round"
              />
            </g>
          </>
        ) : (
          <>
            <g data-layer="cab">
              <rect x="700" y="545" width="230" height="135" rx="12" fill="#1f5c55" />
              <rect x="720" y="565" width="100" height="60" rx="7" fill="#f0a040" />
              <rect x="835" y="565" width="75" height="60" rx="7" fill="#143f3a" />
              <path d="M700 545 L700 500 L790 500 L835 545 Z" fill="#174842" />
              <circle cx="755" cy="695" r="38" fill="#1a1a1a" />
              <circle cx="755" cy="695" r="17" fill="#6b655c" />
              <circle cx="890" cy="695" r="38" fill="#1a1a1a" />
              <circle cx="890" cy="695" r="17" fill="#6b655c" />
            </g>
            <g data-layer="bed">
              <rect x="520" y="565" width="190" height="105" rx="8" fill="#174842" />
              <rect x="532" y="575" width="166" height="58" rx="5" fill="#0f3531" />
              <rect x="540" y="582" width="70" height="42" rx="3" fill="#e86a2f" opacity="0.85" />
              <circle cx="575" cy="695" r="34" fill="#1a1a1a" />
              <circle cx="575" cy="695" r="15" fill="#6b655c" />
            </g>
            <g data-layer="pig" transform="translate(545 520)">
              <ellipse cx="52" cy="48" rx="44" ry="36" fill="#f2a4b0" />
              <ellipse cx="88" cy="54" rx="18" ry="13" fill="#e88998" />
              <circle cx="38" cy="40" r="6" fill="#2a2220" />
              <ellipse cx="28" cy="18" rx="12" ry="16" fill="#f2a4b0" />
              <ellipse cx="64" cy="16" rx="12" ry="16" fill="#f2a4b0" />
              <ellipse cx="36" cy="58" rx="8" ry="5" fill="#c96b7a" />
            </g>
            <g data-layer="dog" transform="translate(600 490)">
              <ellipse cx="58" cy="58" rx="48" ry="40" fill="#f5f2ea" />
              <ellipse cx="28" cy="50" rx="20" ry="26" fill="#2a2a2a" />
              <ellipse cx="84" cy="48" rx="16" ry="22" fill="#2a2a2a" />
              <circle cx="50" cy="52" r="7" fill="#1a1a1a" />
              <circle cx="72" cy="52" r="7" fill="#1a1a1a" />
              <circle cx="52" cy="50" r="2.5" fill="#fff" />
              <circle cx="74" cy="50" r="2.5" fill="#fff" />
              <ellipse cx="62" cy="70" rx="12" ry="8" fill="#2a2a2a" />
              <path d="M58 76 L68 105 L48 105 Z" fill="#e88998" />
              <path
                data-layer="tail"
                d="M102 62 C135 28 152 78 125 95"
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="12"
                strokeLinecap="round"
              />
            </g>
          </>
        )}
      </g>

      <g data-layer="scrub">
        <path
          d="M0 780 C140 720 260 810 420 760 C580 710 720 820 900 770 C1080 720 1280 820 1600 760 L1600 900 L0 900 Z"
          fill="#9e3214"
        />
        <path
          d="M0 840 C180 790 340 870 520 830 C720 780 900 880 1120 830 C1320 790 1480 870 1600 840 L1600 900 L0 900 Z"
          fill="#7a2410"
        />
      </g>
    </svg>
  )
}

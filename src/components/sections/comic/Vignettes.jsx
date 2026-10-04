/**
 * Vignettes — the three little scenes that take the dog and the pig's place on
 * the torn page, and the truck that drives into the last one. Original vector
 * art in the same inked, cel-shaded look as RoadHero, so the whole opening
 * reads as one comic.
 *
 * Every scene is drawn so it can be cropped by `preserveAspectRatio="slice"`:
 * a square window shows its middle, a full screen shows all of it.
 */

const INK = '#1d1311'

/** Deterministic pseudo-random, so the grass is the same on every render. */
function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BLADES = (() => {
  const rand = rng(21)
  return Array.from({ length: 170 }, () => {
    const x = rand() * 1600
    const y = 735 + rand() * 175
    const h = 26 + (y - 735) * 0.36 + rand() * 26
    const lean = (rand() - 0.5) * 22
    return { x, y, h, lean, tone: rand() }
  })
})()

const DOTS_ID = 'vg-dots'

function Dots({ id }) {
  return (
    <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <circle cx="4.5" cy="4.5" r="1.7" fill="#120b09" />
    </pattern>
  )
}

/** Pink sunset over a farm: the scene the page finally opens into. */
export function FarmScene({ className = '', ...rest }) {
  return (
    <svg
      {...rest}
      viewBox="0 0 1600 900"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fm-sky" x1="1" y1="0" x2="0.15" y2="0.85">
          <stop offset="0" stopColor="#1f6073" />
          <stop offset="0.28" stopColor="#6c4a8e" />
          <stop offset="0.6" stopColor="#e5508b" />
          <stop offset="1" stopColor="#f7966c" />
        </linearGradient>
        <radialGradient id="fm-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c8" />
          <stop offset="0.45" stopColor="#fbd990" />
          <stop offset="1" stopColor="#fbd990" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fm-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d0245a" />
          <stop offset="1" stopColor="#5c0f35" />
        </linearGradient>
        <linearGradient id="fm-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6c3a73" />
          <stop offset="1" stopColor="#3d1e4c" />
        </linearGradient>
        <Dots id={`${DOTS_ID}-farm`} />
      </defs>

      <rect width="1600" height="900" fill="url(#fm-sky)" />
      <circle cx="330" cy="360" r="190" fill="url(#fm-sun)" />
      <circle cx="330" cy="360" r="74" fill="#fbe4a6" stroke="#fff6dc" strokeWidth="2" opacity="0.95" />
      {/* streak clouds */}
      <g fill="#ff9aa8" opacity="0.5">
        <path d="M120 200c140-18 300-14 430 6-120 14-300 18-430-6Z" />
        <path d="M980 150c120-14 260-8 360 12-110 10-250 12-360-12Z" />
        <path d="M600 280c90-10 190-8 270 6-90 8-190 8-270-6Z" />
      </g>

      {/* mountains, faceted */}
      <path d="M0 560 L180 470 L330 520 L520 430 L760 520 L980 410 L1200 500 L1420 380 L1600 470 L1600 640 L0 640Z" fill="#a8447f" />
      <path d="M980 410 L1200 500 L1420 380 L1600 470 L1600 640 L1180 640Z" fill="#7b2f77" opacity="0.8" />
      <path d="M640 640 L900 470 L1040 410 L1180 500 L1500 340 L1600 380 L1600 640Z" fill="#8a3a85" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M1500 340 L1600 380 L1600 640 L1380 640 L1440 470Z" fill="#4e2a72" />
      <path d="M1180 500 L1500 340 L1380 470 L1290 640 L1100 640Z" fill="#ad3f8a" opacity="0.85" />
      <path d="M0 640 L0 560 L260 500 L470 560 L700 520 L900 640Z" fill="#c93c82" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M260 500 L470 560 L360 640 L120 640Z" fill="#e05898" opacity="0.8" />
      <path d="M470 560 L700 520 L900 640 L600 640Z" fill="#9a2e78" opacity="0.8" />
      <path d="M0 640 L1600 640 L1600 680 L0 680Z" fill="#c53a84" />

      {/* silos */}
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M1090 640 L1090 520 Q1090 486 1118 480 L1118 462 L1146 462 L1146 480 Q1174 486 1174 520 L1174 640Z" fill="#a82d9e" />
        <path d="M1146 462 L1146 480 Q1174 486 1174 520 L1174 640 L1150 640 L1150 520 Q1150 492 1146 480Z" fill="#6d1f78" />
        <path d="M1184 640 L1184 520 Q1184 486 1212 480 L1212 462 L1240 462 L1240 480 Q1268 486 1268 520 L1268 640Z" fill="#a82d9e" />
        <path d="M1240 462 L1240 480 Q1268 486 1268 520 L1268 640 L1244 640 L1244 520 Q1244 492 1240 480Z" fill="#6d1f78" />
      </g>
      {/* barns */}
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M1340 650 L1340 586 L1420 540 L1500 586 L1500 650Z" fill="#c4284a" />
        <path d="M1420 540 L1500 586 L1500 650 L1420 650Z" fill="#8a1c3e" />
        <path d="M1332 590 L1420 534 L1508 590" fill="none" stroke="#f6e3d4" strokeWidth="6" strokeLinejoin="round" />
        <rect x="1396" y="606" width="48" height="44" fill="#f6e3d4" stroke={INK} strokeWidth="2.5" />
        <path d="M1396 606 L1444 650 M1444 606 L1396 650" stroke="#c4284a" strokeWidth="4" />
        <path d="M1520 650 L1520 612 L1572 586 L1600 604 L1600 650Z" fill="#a82244" />
      </g>

      {/* the road across the plain */}
      <path d="M0 684 L1600 684 L1600 740 L0 740Z" fill="url(#fm-road)" />
      <path d="M0 688 L1600 688" stroke="#e0689a" strokeWidth="3" opacity="0.6" />
      <path d="M0 712 H1600" stroke="#f1b6cf" strokeWidth="4" strokeDasharray="56 44" opacity="0.4" />

      {/* the red field in front */}
      <path d="M0 738 L1600 738 L1600 900 L0 900Z" fill="url(#fm-field)" />
      <g strokeLinecap="round" fill="none">
        {BLADES.map((b, i) => (
          <path
            key={i}
            d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)} q${(b.lean * 0.4).toFixed(1)} ${(-b.h * 0.5).toFixed(1)} ${b.lean.toFixed(1)} ${(-b.h).toFixed(1)}`}
            stroke={b.tone > 0.66 ? '#ff5f7a' : b.tone > 0.33 ? '#e8325f' : '#8e1743'}
            strokeWidth={3 + b.tone * 3}
          />
        ))}
      </g>
      <rect width="1600" height="900" fill={`url(#${DOTS_ID}-farm)`} opacity="0.08" />
    </svg>
  )
}

/** Canyon mesas under a gold sky. */
export function CanyonScene({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cn-sky" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#7d8a45" />
          <stop offset="0.45" stopColor="#f0b72a" />
          <stop offset="1" stopColor="#f48c1f" />
        </linearGradient>
        <linearGradient id="cn-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a31e" />
          <stop offset="1" stopColor="#c8671a" />
        </linearGradient>
        <Dots id={`${DOTS_ID}-canyon`} />
      </defs>
      <rect width="1000" height="1000" fill="url(#cn-sky)" />
      <g fill="#fff0b0" stroke="#fff0b0" strokeWidth="2" strokeLinejoin="round">
        <path d="M640 330l14-10 14 10-14-4Z" />
        <path d="M720 420l10-8 10 8-10-3Z" />
        <path d="M180 470l10-8 10 8-10-3Z" />
      </g>
      {/* far mesas */}
      <path d="M0 700 L0 600 L120 560 L230 580 L330 540 L460 600 L560 640 L560 760 L0 760Z" fill="#a8681f" opacity="0.55" />
      {/* main mesa group */}
      <path d="M0 800 L40 560 L110 520 L150 600 L170 680 L250 700 L330 660 L380 600 L450 580 L520 640 L560 720 L700 740 L860 700 L1000 740 L1000 820 L0 820Z" fill="#9c5a1c" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M110 520 L150 600 L170 680 L250 700 L180 760 L100 780 L60 640Z" fill="#6f3b14" />
      <path d="M380 600 L450 580 L520 640 L560 720 L470 740 L420 680Z" fill="#6f3b14" />
      <path d="M250 700 L330 660 L380 600 L300 640 L220 690Z" fill="#c07a30" opacity="0.8" />
      <path d="M60 640 L110 520" stroke="#e0a050" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      <path d="M170 700c70 20 160 20 240-10M560 726c110 12 240 4 340-30" fill="none" stroke="#f4c060" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <path d="M0 800 L1000 800 L1000 1000 L0 1000Z" fill="url(#cn-ground)" />
      <path d="M0 860c200-30 420-10 640 0s260 0 360-20" fill="none" stroke="#f7c557" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <path d="M0 930c240-24 520-8 760 6" fill="none" stroke="#b2501a" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
      <rect width="1000" height="1000" fill={`url(#${DOTS_ID}-canyon)`} opacity="0.07" />
    </svg>
  )
}

/** A fence and a line of trees at the edge of a green dusk. */
export function FenceScene({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f8a6e" />
          <stop offset="0.5" stopColor="#6aa47a" />
          <stop offset="0.78" stopColor="#d6c35a" />
          <stop offset="1" stopColor="#e9b53a" />
        </linearGradient>
        <Dots id={`${DOTS_ID}-fence`} />
      </defs>
      <rect width="1000" height="1000" fill="url(#fn-sky)" />
      <path d="M0 380c180-22 380-26 640-10-210 24-420 30-640 10Z" fill="#e7d27a" opacity="0.75" />
      <path d="M300 300c140-14 300-12 460 8-150 14-320 16-460-8Z" fill="#f1dc8e" opacity="0.6" />
      {/* treeline */}
      <g fill="#2a6a44" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {[
          [40, 640, 58], [120, 618, 70], [210, 640, 54], [290, 606, 76], [380, 636, 60], [460, 614, 72],
          [550, 640, 56], [640, 604, 78], [730, 634, 62], [820, 612, 72], [910, 640, 58], [980, 622, 62],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} />
            <circle cx={x - r * 0.5} cy={y + r * 0.35} r={r * 0.7} />
            <circle cx={x + r * 0.5} cy={y + r * 0.35} r={r * 0.7} />
          </g>
        ))}
      </g>
      <g fill="#3f8a58" opacity="0.8">
        <circle cx="290" cy="580" r="26" />
        <circle cx="640" cy="578" r="28" />
        <circle cx="460" cy="590" r="22" />
      </g>
      <path d="M0 690 L1000 690 L1000 1000 L0 1000Z" fill="#a8b43c" />
      <path d="M0 690c200 20 420 24 640 12s260-12 360-4" fill="none" stroke="#f0d65a" strokeWidth="8" strokeLinecap="round" opacity="0.85" />
      <path d="M0 790c220-24 480-20 720 0" fill="none" stroke="#6f8a28" strokeWidth="10" strokeLinecap="round" opacity="0.6" />
      {/* the fence */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {[110, 330, 560, 780].map((x) => (
          <path key={x} d={`M${x} 880 L${x} 700 L${x + 36} 700 L${x + 36} 880Z`} fill="#8a4a2a" />
        ))}
        <path d="M60 760 L1000 752 L1000 790 L60 798Z" fill="#9c5632" />
        <path d="M60 830 L1000 822 L1000 860 L60 868Z" fill="#8a4a2a" />
        <path d="M60 760 L1000 752 L1000 764 L60 772Z" fill="#c0764a" stroke="none" opacity="0.8" />
      </g>
      {/* a leaning utility pole */}
      <g>
        <path d="M850 420 L862 420 L890 880 L866 880Z" fill="#6a3a22" stroke={INK} strokeWidth="2.5" />
        <path d="M820 470 L900 454" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M0 300 C300 380 640 420 856 462" fill="none" stroke="#2a1a14" strokeWidth="2.5" opacity="0.7" />
        <circle cx="860" cy="464" r="4.5" fill="#fff" stroke={INK} strokeWidth="2" />
      </g>
      <path d="M0 880 L1000 880 L1000 1000 L0 1000Z" fill="#8f9c2e" />
      <g stroke="#e8c640" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M40 1000c-4-30 4-52 18-66M80 1000c0-26 8-44 24-54M900 1000c4-30-4-52-18-66M940 1000c0-26-8-44-24-54" />
      </g>
      <rect width="1000" height="1000" fill={`url(#${DOTS_ID}-fence)`} opacity="0.07" />
    </svg>
  )
}

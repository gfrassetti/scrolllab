/**
 * ArrivalArt — the pieces of the arrival: the gate at sundown, the panel where
 * the pig is lifted out of the frame (background, pig, the hands, the dog's
 * tail as separate layers) and the panel of the dog watching the farm. Original
 * vector art in the same inked, cel-shaded look as RoadHero and Vignettes.
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

const SNOW = (() => {
  const rand = rng(5)
  return Array.from({ length: 70 }, () => ({ x: rand() * 1600, y: rand() * 560, r: 1.6 + rand() * 3.4 }))
})()

const FIELD = (() => {
  const rand = rng(12)
  return Array.from({ length: 120 }, () => {
    const x = rand() * 1800
    const y = 470 + rand() * 140
    return { x, y, h: 24 + (y - 470) * 0.5 + rand() * 30, lean: (rand() - 0.5) * 26, tone: rand() }
  })
})()

function Dots({ id }) {
  return (
    <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <circle cx="4.5" cy="4.5" r="1.7" fill="#120b09" />
    </pattern>
  )
}

/** The farmer walks through the gate of the big metal shed, the two behind him. */
export function GateScene({ className = '', ...rest }) {
  const bars = (x0, x1) => {
    const out = []
    for (let x = x0; x <= x1; x += 38) out.push(x)
    return out
  }
  return (
    <svg {...rest} viewBox="0 0 1600 900" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="gt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#df8f2a" />
          <stop offset="0.45" stopColor="#f6bd4e" />
          <stop offset="0.7" stopColor="#fde4a2" />
          <stop offset="1" stopColor="#f3a24a" />
        </linearGradient>
        <radialGradient id="gt-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="1" stopColor="#ffe6a6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gt-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0a24a" />
          <stop offset="1" stopColor="#b84a22" />
        </linearGradient>
        <linearGradient id="gt-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6a4a1e" />
          <stop offset="0.45" stopColor="#c8a050" />
          <stop offset="1" stopColor="#5a3c16" />
        </linearGradient>
        <radialGradient id="gt-vig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#3a1230" stopOpacity="0" />
          <stop offset="1" stopColor="#3a1230" stopOpacity="0.55" />
        </radialGradient>
        <Dots id="gt-dots" />
      </defs>

      <rect width="1600" height="900" fill="url(#gt-sky)" />
      <circle cx="930" cy="560" r="300" fill="url(#gt-glow)" />
      <path d="M1040 600c60-60 140-90 230-90 70 0 130 30 170 80Z" fill="#f2c27e" opacity="0.8" />

      {/* the yard and the road into the glow */}
      <path d="M0 640 L1600 640 L1600 900 L0 900Z" fill="url(#gt-ground)" />
      <path d="M880 640 L980 640 L1240 900 L560 900Z" fill="#fbd790" opacity="0.85" />
      <path d="M0 700 L560 900 L0 900Z" fill="#9c3a1c" opacity="0.6" />

      {/* sheds on both sides, lit by the low sun */}
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M120 690 L120 470 L520 420 L560 470 L560 690Z" fill="#c86a2e" />
        <path d="M100 480 L520 410 L580 470 L140 520Z" fill="#6f2a76" />
        <path d="M520 410 L580 470 L560 690 L540 690 L540 470Z" fill="#f2a24e" />
        <path d="M560 470 L620 520 L620 690 L560 690Z" fill="#e9893a" />
        <path d="M1110 690 L1110 420 L1470 380 L1600 420 L1600 690Z" fill="#c45c2a" />
        <path d="M1080 430 L1470 370 L1600 410 L1600 450 L1150 470Z" fill="#6f2a76" />
        <path d="M1080 430 L1150 470 L1150 690 L1110 690 L1110 450Z" fill="#f4b45c" />
      </g>
      <g stroke="#8a3a1e" strokeWidth="3" opacity="0.6">
        <path d="M160 560 L520 520M160 610 L520 580M1160 520 L1560 490M1160 570 L1560 545" />
      </g>

      {/* power lines */}
      <g fill="none" stroke="#5a2e16" strokeWidth="2.5" opacity="0.8">
        <path d="M250 0 C420 260 640 420 900 470" />
        <path d="M300 0 C470 270 690 440 940 490" />
        <path d="M900 470 C1000 480 1080 470 1160 450" />
      </g>

      {/* the farmer, seen from behind */}
      <g transform="translate(800 470)" stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M-56 300 L-48 400 L-12 400 L-6 300Z" fill="#5a2a2a" />
        <path d="M6 300 L12 400 L48 400 L56 300Z" fill="#4a2222" />
        <path d="M-90 40 C-96 140 -96 240 -82 312 L82 312 C96 240 96 140 90 40 C70 10 40 0 0 0 C-40 0 -70 10 -90 40Z" fill="#d9993c" />
        <path d="M30 4 C66 14 86 30 90 40 C96 140 96 240 82 312 L40 312 C60 220 60 110 30 4Z" fill="#a8682a" />
        <g stroke="#8a5a20" strokeWidth="2" opacity="0.7">
          <path d="M-60 120 h100M-64 150 h104M-62 180 h100M-50 210 l60 30M-10 200 l40 40" />
        </g>
        <path d="M-90 60 C-112 120 -116 200 -104 260 L-84 262 C-88 200 -84 130 -72 90Z" fill="#c8862e" />
        <path d="M90 60 C112 120 116 200 104 260 L84 262 C88 200 84 130 72 90Z" fill="#9a5e24" />
        <path d="M-26 -6 C-26 -44 26 -44 26 -6 C26 10 -26 10 -26 -6Z" fill="#7a3a2a" />
        {/* hat */}
        <ellipse cx="0" cy="-30" rx="72" ry="16" fill="#9c1f36" />
        <path d="M-40 -32 C-40 -84 40 -84 40 -32Z" fill="#b8263e" />
        <path d="M-40 -42 L40 -42" stroke="#5a1020" strokeWidth="5" />
      </g>

      {/* the gate: tall bars on both sides, plates at the bottom */}
      <g>
        {bars(0, 330).map((x) => (
          <g key={`l${x}`}>
            <rect x={x} y="-20" width="12" height="560" fill="url(#gt-bar)" stroke={INK} strokeWidth="1.5" />
            <circle cx={x + 6} cy="540" r="10" fill="#b48a3e" stroke={INK} strokeWidth="2" />
          </g>
        ))}
        {bars(1290, 1600).map((x) => (
          <g key={`r${x}`}>
            <rect x={x} y="-20" width="12" height="560" fill="url(#gt-bar)" stroke={INK} strokeWidth="1.5" />
            <circle cx={x + 6} cy="540" r="10" fill="#b48a3e" stroke={INK} strokeWidth="2" />
          </g>
        ))}
        <path d="M0 560 L360 560 L360 900 L0 900Z" fill="#8a6626" stroke={INK} strokeWidth="3" />
        <path d="M1270 560 L1600 560 L1600 900 L1270 900Z" fill="#7a5820" stroke={INK} strokeWidth="3" />
        <path d="M0 560 L360 560 L360 580 L0 580Z" fill="#c8a050" />
        <path d="M1270 560 L1600 560 L1600 580 L1270 580Z" fill="#c8a050" />
        <rect x="340" y="-20" width="40" height="920" fill="#5a3c16" stroke={INK} strokeWidth="3" />
        <rect x="1250" y="-20" width="40" height="920" fill="#5a3c16" stroke={INK} strokeWidth="3" />
        <rect x="348" y="-20" width="10" height="920" fill="#a07a34" opacity="0.8" />
        <rect x="1258" y="-20" width="10" height="920" fill="#a07a34" opacity="0.8" />
      </g>

      {/* the pig and the dog, dark against the light */}
      <g data-gate-pair fill="#2e1236">
        <path d="M430 900 C420 840 440 800 490 786 C520 760 560 756 590 774 C620 760 650 770 660 800 C676 812 676 840 660 856 L650 900Z" />
        <path d="M600 770 l18 -40 14 46Z" />
        <path d="M860 900 C850 840 870 790 920 770 C930 740 960 716 990 712 L1010 680 L1030 716 L1060 690 L1062 740 C1110 760 1140 810 1150 860 L1160 900Z" />
        <path d="M940 760 C900 740 860 742 830 760 C860 770 900 776 940 774Z" />
      </g>

      <rect width="1600" height="900" fill="url(#gt-dots)" opacity="0.07" />
      <rect width="1600" height="900" fill="url(#gt-vig)" />
    </svg>
  )
}

/** Night, snow and bare branches: what the pig is lifted out of. */
export function PigPanelBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="pp-sky" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#3a1a5e" />
          <stop offset="0.45" stopColor="#8a2e62" />
          <stop offset="1" stopColor="#c8405a" />
        </linearGradient>
        <Dots id="pp-dots" />
      </defs>
      <rect width="1600" height="560" fill="url(#pp-sky)" />
      <g fill="none" stroke="#6a1838" strokeWidth="6" strokeLinecap="round">
        <path d="M820 0 C900 80 1060 140 1600 170" />
        <path d="M980 110 L1060 40M1120 140 L1180 60M1300 160 L1350 90M1440 168 L1500 120" strokeWidth="4" />
      </g>
      <path d="M0 400 C200 380 420 420 600 470 L600 560 L0 560Z" fill="#5a2244" />
      <g stroke="#7a2a46" strokeWidth="3" strokeLinecap="round">
        <path d="M60 470 l20 -50M110 480 l10 -60M150 476 l24 -46" />
      </g>
      <g fill="#fff4f6">
        {SNOW.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.y} r={f.r} opacity={0.5 + (i % 4) * 0.12} />
        ))}
      </g>
      <rect width="1600" height="560" fill="url(#pp-dots)" opacity="0.07" />
    </svg>
  )
}

/** The pig, big and grinning, drawn to stand out over the top of its frame. */
export function BigPig({ className = '' }) {
  return (
    <svg viewBox="0 0 600 700" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="bp-body" cx="0.45" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ff9a98" />
          <stop offset="1" stopColor="#e2566a" />
        </radialGradient>
        <Dots id="bp-dots" />
      </defs>
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        {/* body */}
        <path d="M90 700 C60 560 70 380 150 300 C210 240 330 236 400 290 C480 350 520 520 500 700Z" fill="url(#bp-body)" />
        <path d="M400 290 C480 350 520 520 500 700 L430 700 C450 540 430 380 360 300Z" fill="#c8455c" opacity="0.6" stroke="none" />
        {/* head */}
        <path d="M150 290 C120 200 160 110 250 84 C330 62 410 96 440 160 C470 220 450 300 380 330 C300 362 190 360 150 290Z" fill="url(#bp-body)" />
        {/* ears */}
        <path d="M200 120 C150 80 90 80 60 110 C110 130 150 170 176 200Z" fill="#c43a52" />
        <path d="M180 140 C140 112 110 112 90 120" fill="none" stroke="#8e2238" strokeWidth="4" />
        <path d="M330 80 C350 40 380 20 410 18 C400 60 380 90 360 104Z" fill="#c43a52" />
        {/* snout, pushed toward the viewer */}
        <path d="M340 150 C380 110 450 108 486 140 C512 164 508 214 478 236 C440 264 372 256 344 220 C326 196 324 170 340 150Z" fill="#ff8a8a" />
        <ellipse cx="420" cy="180" rx="22" ry="30" fill="#2a0d14" stroke="none" transform="rotate(-12 420 180)" />
        <ellipse cx="470" cy="176" rx="18" ry="26" fill="#2a0d14" stroke="none" transform="rotate(-12 470 176)" />
        <path d="M352 160 C370 140 396 132 420 134" fill="none" stroke="#ffd0cc" strokeWidth="6" strokeLinecap="round" />
        {/* the grin */}
        <path d="M296 250 C320 300 380 306 412 270 C390 262 330 258 296 250Z" fill="#c4162e" />
        <path d="M320 262 C340 286 372 290 392 274Z" fill="#2a0d14" stroke="none" />
        {/* eye, cheek, brow */}
        <ellipse cx="290" cy="170" rx="12" ry="15" fill="#1a0a0e" stroke="none" />
        <circle cx="294" cy="165" r="4" fill="#fff" stroke="none" />
        <ellipse cx="230" cy="230" rx="44" ry="30" fill="#e8546a" opacity="0.55" stroke="none" />
        <path d="M262 126 C276 116 296 118 306 128" fill="none" strokeWidth="4" strokeLinecap="round" stroke="#a8263e" />
      </g>
      <path d="M90 700 C60 560 70 380 150 300 C210 240 330 236 400 290 C480 350 520 520 500 700Z" fill="url(#bp-dots)" opacity="0.08" />
    </svg>
  )
}

/** The farmer's sleeves and hands, coming down from the top of the frame. */
export function FarmerHands({ className = '' }) {
  return (
    <svg viewBox="0 0 1600 560" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="fh-sleeve" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#163a4e" />
          <stop offset="0.55" stopColor="#1e8a9a" />
          <stop offset="1" stopColor="#36d0d6" />
        </linearGradient>
      </defs>
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        {/* left arm: from the top edge, down along the pig's side */}
        <g data-hand="left">
          <path d="M120 -40 L330 -40 C360 60 380 160 400 250 L300 300 C250 200 180 90 120 -40Z" fill="url(#fh-sleeve)" />
          <path d="M140 -40 L200 -40 C240 80 290 180 330 270 L300 290 C250 190 190 80 140 -40Z" fill="#0f2a3a" opacity="0.5" stroke="none" />
          <path d="M300 300 L400 250 C430 290 450 330 470 380 C440 400 400 400 370 380 C350 360 320 330 300 300Z" fill="#4a2a5e" />
          <path d="M420 330 l40 50M400 344 l36 46" stroke="#2a1638" strokeWidth="4" />
        </g>
        {/* right arm */}
        <g data-hand="right">
          <path d="M880 -40 L1040 -40 C1050 60 1040 160 1010 240 L900 230 C910 150 900 60 880 -40Z" fill="url(#fh-sleeve)" />
          <path d="M1000 -40 L1040 -40 C1050 60 1040 160 1010 240 L980 236 C1000 160 1010 60 1000 -40Z" fill="#0f2a3a" opacity="0.5" stroke="none" />
          <path d="M900 230 L1010 240 C1030 300 1050 350 1070 400 C1030 420 980 410 950 380 C930 340 910 290 900 230Z" fill="#4a2a5e" />
        </g>
      </g>
    </svg>
  )
}

/** The dog's tail, wagging at the edge of the panel. */
export function DogTail({ className = '' }) {
  return (
    <svg viewBox="0 0 220 380" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M110 380 C70 300 60 210 90 120 C104 80 126 40 150 10 C150 80 160 160 160 240 C160 300 150 350 140 380Z" fill="#1e3a44" />
        <path d="M90 120 C104 80 126 40 150 10 C152 60 150 110 144 150 C130 120 112 110 90 120Z" fill="#f6f1e6" />
        <path d="M96 150 C108 110 128 70 146 40" fill="none" stroke="#d8d0c0" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** The farm at dusk, wide enough to pan behind the dog. */
export function LookoutBg({ className = '' }) {
  return (
    <svg viewBox="0 0 1800 600" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a8a" />
          <stop offset="0.55" stopColor="#6a3aa8" />
          <stop offset="1" stopColor="#c84a8a" />
        </linearGradient>
        <linearGradient id="lk-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8263e" />
          <stop offset="1" stopColor="#8a0f2e" />
        </linearGradient>
        <Dots id="lk-dots" />
      </defs>
      <rect width="1800" height="600" fill="url(#lk-sky)" />
      <path d="M0 260 C200 220 400 250 620 230 C860 210 1080 250 1300 230 C1500 212 1680 240 1800 230 L1800 340 L0 340Z" fill="#5a3ab8" />
      <path d="M0 300 C240 270 480 300 760 286 C1040 272 1300 300 1560 284 C1680 278 1760 290 1800 286 L1800 360 L0 360Z" fill="#7a46c8" stroke={INK} strokeWidth="2.5" />
      {/* fields in rows */}
      <path d="M0 340 L1800 340 L1800 600 L0 600Z" fill="url(#lk-field)" />
      <g fill="none" stroke="#b81834" strokeWidth="5" opacity="0.7">
        <path d="M0 380 C400 360 900 370 1800 360M0 430 C500 410 1000 420 1800 410M0 490 C500 470 1100 480 1800 470" />
      </g>
      {/* the path to the barn */}
      <path d="M700 600 C760 520 900 450 1120 400 C1180 388 1240 380 1290 378 L1300 386 C1200 400 1000 460 860 600Z" fill="#c8506a" stroke={INK} strokeWidth="2" />
      {/* trees */}
      <g stroke={INK} strokeWidth="2.5">
        <rect x="1046" y="250" width="10" height="120" fill="#2a1430" />
        <ellipse cx="1051" cy="240" rx="34" ry="46" fill="#3a1a3e" />
        <rect x="1100" y="270" width="9" height="100" fill="#2a1430" />
        <ellipse cx="1104" cy="262" rx="28" ry="38" fill="#3a1a3e" />
      </g>
      {/* the red barn */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M1290 400 L1290 200 L1420 110 L1560 200 L1560 400Z" fill="#e0263e" />
        <path d="M1420 110 L1560 200 L1640 210 L1640 400 L1560 400 L1560 200Z" fill="#2a2a6a" />
        <path d="M1270 210 L1420 100 L1580 210" fill="none" stroke="#f4b0b8" strokeWidth="6" />
        <rect x="1380" y="250" width="90" height="150" fill="#1a0a14" />
        <path d="M1408 160 l24 0 0 26 -24 0Z" fill="#1a0a14" />
        <g stroke="#a81428" strokeWidth="3" opacity="0.7">
          <path d="M1310 240 V390M1340 230 V390M1500 230 V390M1530 240 V390" />
        </g>
      </g>
      {/* the farmer and the pig walking away */}
      <g fill="#5a0f24" stroke={INK} strokeWidth="2">
        <path d="M1150 400 L1146 330 C1146 316 1156 308 1166 308 C1176 308 1186 316 1186 330 L1182 400Z" />
        <circle cx="1166" cy="300" r="10" />
        <path d="M1148 292 h36" strokeWidth="5" />
        <path d="M1196 404 C1194 384 1206 372 1222 372 C1240 372 1252 382 1252 398 L1250 410 L1198 410Z" fill="#3a0a1a" />
      </g>
      {/* red grass in front */}
      <g strokeLinecap="round" fill="none">
        {FIELD.map((b, i) => (
          <path
            key={i}
            d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)} q${(b.lean * 0.4).toFixed(1)} ${(-b.h * 0.5).toFixed(1)} ${b.lean.toFixed(1)} ${(-b.h).toFixed(1)}`}
            stroke={b.tone > 0.6 ? '#ff4a66' : b.tone > 0.3 ? '#d81a40' : '#7a0a28'}
            strokeWidth={3 + b.tone * 3}
          />
        ))}
      </g>
      <rect width="1800" height="600" fill="url(#lk-dots)" opacity="0.07" />
    </svg>
  )
}

/** The dog from behind, watching them go. It never moves. */
export function DogBack({ className = '' }) {
  return (
    <svg viewBox="0 0 520 620" className={className} aria-hidden="true">
      <defs>
        <Dots id="db-dots" />
      </defs>
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        {/* body and back */}
        <path d="M60 620 C40 500 60 400 120 340 C150 310 200 300 250 304 C320 310 370 360 380 440 C390 520 380 580 370 620Z" fill="#241830" />
        {/* the white ruff */}
        <path d="M120 360 C100 300 130 230 200 214 C270 200 340 230 360 300 C370 340 350 380 320 400 C300 380 280 360 250 360 C220 362 180 380 160 420 C140 410 126 390 120 360Z" fill="#f6f2ea" />
        <g stroke="#bdb6c8" strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <path d="M150 300 l-30 30M180 330 l-24 40M330 290 l30 26M300 340 l24 34M240 380 l-6 40M270 370 l14 40" />
        </g>
        {/* head, turned toward the barn */}
        <path d="M160 230 C140 150 180 70 260 56 C330 44 390 90 400 150 C408 200 380 240 330 250 C280 262 200 270 160 230Z" fill="#241830" />
        <path d="M330 120 C370 120 410 130 440 150 C430 170 400 180 370 176 C350 168 336 150 330 120Z" fill="#f6f2ea" />
        <path d="M430 146 C440 150 446 156 446 162 C440 166 432 164 428 158Z" fill="#1a0a14" />
        {/* ears */}
        <path d="M200 90 C170 40 150 0 160 -10 C200 10 240 40 250 70Z" fill="#241830" />
        <path d="M280 70 C290 20 310 -6 330 -8 C334 30 326 64 310 84Z" fill="#241830" />
        <g stroke="#5a4a6a" strokeWidth="3" opacity="0.8">
          <path d="M190 60 l20 30M300 40 l-6 30" />
        </g>
      </g>
      <path d="M60 620 C40 500 60 400 120 340 C150 310 200 300 250 304 C320 310 370 360 380 440 C390 520 380 580 370 620Z" fill="url(#db-dots)" opacity="0.1" />
    </svg>
  )
}

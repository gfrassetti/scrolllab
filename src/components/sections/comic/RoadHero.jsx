/**
 * RoadHero — the opening shot of the comic, drawn in layers so every piece can
 * move on its own: sky, ranges, hills, road, the truck (cab, bed, the animals,
 * their tails, the smoke at the wheels) and the foreground brush.
 *
 * Original artwork, all vector: cel-shaded flats with an ink outline and a
 * halftone screen over the shadows, so it reads as a printed comic page. The
 * layers carry `data-*` hooks; ChapterDusty animates them with GSAP.
 *
 * The truck is drawn at full size around its own origin (0,0 = the ground,
 * centered between the rear wheels, y up is negative) and is scaled and moved
 * along the road by the timeline.
 */

const INK = '#1d1311'

// Wheel smoke: soft blobs, six per side (left puffs first), rubbed into wisps by
// an SVG turbulence filter. Their shapes only matter as a starting size.
const SMOKE = [
  { x: -170, y: -18, rx: 46, ry: 30 },
  { x: -212, y: -30, rx: 60, ry: 34 },
  { x: -150, y: -46, rx: 40, ry: 26 },
  { x: -234, y: -14, rx: 72, ry: 26 },
  { x: -190, y: -62, rx: 50, ry: 30 },
  { x: -254, y: -42, rx: 56, ry: 32 },
  { x: 170, y: -18, rx: 46, ry: 30 },
  { x: 212, y: -30, rx: 60, ry: 34 },
  { x: 150, y: -46, rx: 40, ry: 26 },
  { x: 234, y: -14, rx: 72, ry: 26 },
  { x: 190, y: -62, rx: 50, ry: 30 },
  { x: 254, y: -42, rx: 56, ry: 32 },
]

export default function RoadHero({ calm = false }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#245f60" />
          <stop offset="0.32" stopColor="#5f9c86" />
          <stop offset="0.5" stopColor="#e9c46a" />
          <stop offset="0.62" stopColor="#f19a3e" />
          <stop offset="1" stopColor="#e86a2c" />
        </linearGradient>
        <linearGradient id="rh-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a6360" />
          <stop offset="1" stopColor="#2b2827" />
        </linearGradient>
        <linearGradient id="rh-hill-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7b13c" />
          <stop offset="1" stopColor="#e0702a" />
        </linearGradient>
        <linearGradient id="rh-hill-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ec7a2a" />
          <stop offset="1" stopColor="#bf3e1c" />
        </linearGradient>
        <linearGradient id="rh-ridge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e23a2e" />
          <stop offset="1" stopColor="#8e1e26" />
        </linearGradient>
        <radialGradient id="rh-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff5d6" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd37a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rh-vig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#120b09" stopOpacity="0" />
          <stop offset="1" stopColor="#120b09" stopOpacity="0.6" />
        </radialGradient>
        {/* Halftone screen: dots that print the shadows */}
        <pattern id="rh-dots" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx="4.5" cy="4.5" r="1.7" fill="#120b09" />
        </pattern>
        <radialGradient id="rh-smoke-fill" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f6e6d3" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#e8d0b8" stopOpacity="0.6" />
          <stop offset="1" stopColor="#dcc3aa" stopOpacity="0" />
        </radialGradient>
        {/* rubs the blobs into drifting wisps */}
        <filter id="rh-smoke-filter" filterUnits="userSpaceOnUse" x="-620" y="-220" width="1240" height="300">
          <feTurbulence type="fractalNoise" baseFrequency="0.016 0.03" numOctaves="3" seed="9" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="64" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feGaussianBlur in="rough" stdDeviation="2.4" />
        </filter>
        <clipPath id="rh-bed-clip">
          <rect x="-230" y="-560" width="460" height="560" />
        </clipPath>
      </defs>

      {/* ── Cielo ───────────────────────────────────────────── */}
      <g data-layer="sky">
        <rect width="1600" height="900" fill="url(#rh-sky)" />
        <ellipse cx="800" cy="470" rx="520" ry="150" fill="url(#rh-sun)" />
        {/* clouds: flat cel-shaded bands */}
        <g fill="#f6dc8e" opacity="0.92">
          <path d="M120 430c40-22 100-30 150-16 34-18 96-14 120 8 40-2 74 8 88 24H70c-8-8-8-14 50-16Z" />
          <path d="M1060 408c44-24 112-26 160-6 36-20 110-18 138 10 46-2 92 6 110 20h-440c-12-10-6-18 32-24Z" />
        </g>
        <g fill="#f2a24a" opacity="0.9">
          <path d="M150 446c34-10 84-12 120 0-30 8-92 10-120 0Z" />
          <path d="M1130 428c40-10 100-10 150 2-40 8-110 8-150-2Z" />
        </g>
        <g fill="#b9d6a8" opacity="0.5">
          <path d="M500 250c60-20 140-24 210-8-60 14-150 18-210 8Z" />
          <path d="M880 190c70-16 150-12 220 10-70 10-160 8-220-10Z" />
        </g>
      </g>

      {/* ── Cordilleras ─────────────────────────────────────── */}
      <g data-layer="far">
        <path
          d="M0 548 L90 500 L170 520 L260 474 L350 512 L460 480 L560 524 L680 502 L800 524 L920 500 L1040 524 L1150 474 L1260 510 L1360 462 L1450 504 L1540 480 L1600 496 L1600 640 L0 640Z"
          fill="#7f93bb"
        />
        <path
          d="M0 574 L120 530 L240 556 L380 514 L520 556 L660 534 L800 560 L940 534 L1080 558 L1220 520 L1360 556 L1480 524 L1600 550 L1600 640 L0 640Z"
          fill="#6b7eac"
        />
      </g>
      <g data-layer="peak">
        {/* the big blue peak behind the road */}
        <path
          d="M360 590 C470 530 610 478 700 432 C744 410 772 382 800 366 C830 382 858 410 902 432 C990 478 1130 530 1240 590Z"
          fill="#587496"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M800 366 C830 382 858 410 902 432 C990 478 1130 530 1240 590 L1000 590 C960 520 900 470 840 440Z" fill="#3f5878" />
        <path d="M700 432 C744 410 772 382 800 366 L780 410 C760 470 720 540 700 590 L360 590 C470 530 610 478 700 432Z" fill="#7a97b8" opacity="0.75" />
        <path d="M800 366 L826 392 L798 410 L776 396Z" fill="#b2c4d8" opacity="0.8" />
        <path d="M360 590 C470 530 610 478 700 432 C744 410 772 382 800 366 C830 382 858 410 902 432 C990 478 1130 530 1240 590Z" fill="url(#rh-dots)" opacity="0.12" />
      </g>

      {/* ── Colinas ─────────────────────────────────────────── */}
      <g data-layer="hills">
        {/* ridges: plum on the left, red on the right */}
        <path d="M0 470 C120 440 240 484 340 524 C440 560 560 566 800 572 L800 660 L0 660Z" fill="#7c3a52" stroke={INK} strokeWidth="2.5" />
        <path d="M800 572 C1040 566 1160 560 1260 524 C1360 484 1480 432 1600 408 L1600 660 L800 660Z" fill="url(#rh-ridge)" stroke={INK} strokeWidth="2.5" />
        {/* golden bands */}
        <path d="M0 524 C160 504 300 564 460 594 C600 616 720 620 800 622 L800 720 L0 720Z" fill="url(#rh-hill-a)" stroke={INK} strokeWidth="2.5" />
        <path d="M800 622 C940 620 1100 610 1240 580 C1380 552 1500 514 1600 484 L1600 720 L800 720Z" fill="url(#rh-hill-a)" stroke={INK} strokeWidth="2.5" />
        {/* rust bands */}
        <path d="M0 596 C180 580 320 634 480 654 C620 668 740 670 800 672 L800 780 L0 780Z" fill="url(#rh-hill-b)" stroke={INK} strokeWidth="2.5" />
        <path d="M800 672 C940 670 1100 660 1240 632 C1380 606 1500 574 1600 548 L1600 780 L800 780Z" fill="url(#rh-hill-b)" stroke={INK} strokeWidth="2.5" />
        {/* highlight strokes that give the slopes their ink-and-flat look */}
        <path d="M40 500 C140 480 230 510 320 544" fill="none" stroke="#c4607a" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
        <path d="M30 560 C150 540 280 584 400 606" fill="none" stroke="#fbd170" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
        <path d="M20 624 C160 604 300 650 440 662" fill="none" stroke="#f9a84c" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        <path d="M1560 440 C1450 470 1340 520 1240 556" fill="none" stroke="#ff6a4a" strokeWidth="6" strokeLinecap="round" opacity="0.65" />
        <path d="M1580 508 C1470 540 1360 580 1250 608" fill="none" stroke="#ffd36a" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
        <path d="M1590 578 C1480 604 1380 634 1260 654" fill="none" stroke="#f9a84c" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        {/* the flat of the plain, running down to the viewer */}
        <path d="M0 668 C200 650 380 700 560 724 C680 740 740 742 800 742 C860 742 920 740 1040 724 C1220 700 1400 650 1600 668 L1600 900 L0 900Z" fill="#d8692a" />
        <path d="M0 700 C160 690 300 740 420 790 L300 900 L0 900Z" fill="#c24c1c" opacity="0.8" />
        <path d="M1600 700 C1440 690 1300 740 1180 790 L1300 900 L1600 900Z" fill="#c24c1c" opacity="0.8" />
        <path d="M0 668 L1600 668 L1600 900 L0 900Z" fill="url(#rh-dots)" opacity="0.07" />
      </g>

      {/* ── Camino ──────────────────────────────────────────── */}
      <g data-layer="road">
        <path d="M776 500 L824 500 L1280 900 L320 900Z" fill="url(#rh-road)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        {/* shoulder lines */}
        <path d="M778 500 L330 900" stroke="#f4ead8" strokeWidth="5" opacity="0.85" fill="none" />
        <path d="M822 500 L1270 900" stroke="#f4ead8" strokeWidth="5" opacity="0.85" fill="none" />
        {/* double yellow center line, tapering to the horizon */}
        <path d="M797 500 L803 500 L792 900 L772 900Z" fill="#f2b630" />
        <path d="M803 500 L809 500 L832 900 L812 900Z" fill="#f2b630" />
        {/* tar patches and cracks, drawn in perspective */}
        <path d="M700 700c40-8 90-6 140 4" stroke="#1d1a19" strokeWidth="3" fill="none" opacity="0.45" />
        <path d="M900 800c50 0 100 10 150 24" stroke="#1d1a19" strokeWidth="4" fill="none" opacity="0.4" />
        <path d="M560 840c60-10 120-6 180 6" stroke="#1d1a19" strokeWidth="4" fill="none" opacity="0.4" />
        <path d="M776 500 L824 500 L1280 900 L320 900Z" fill="url(#rh-dots)" opacity="0.1" />
      </g>

      {/* shrubs on the shoulders */}
      <g data-layer="shrubs">
        <g transform="translate(250 650)">
          <path d="M-70 40c-20-30 0-70 30-76 8-34 56-44 80-18 34-4 58 30 40 62-30 14-110 20-150 32Z" fill="#c8421a" stroke={INK} strokeWidth="2.5" />
          <path d="M-40 10c10-30 40-40 62-26" fill="none" stroke="#f08a3a" strokeWidth="6" strokeLinecap="round" />
          <path d="M-10 36c20-14 50-16 70-6" fill="none" stroke="#fbbf4a" strokeWidth="5" strokeLinecap="round" />
        </g>
        <g transform="translate(1390 668) scale(1.15)">
          <path d="M-80 40c-16-34 12-72 44-70 12-34 64-38 84-6 36 0 56 34 38 64-26 14-110 20-166 12Z" fill="#b8321a" stroke={INK} strokeWidth="2.5" />
          <path d="M-46 8c14-28 44-34 64-18" fill="none" stroke="#f08a3a" strokeWidth="6" strokeLinecap="round" />
        </g>
        <g transform="translate(560 612) scale(0.5)">
          <path d="M-70 40c-20-30 0-70 30-76 8-34 56-44 80-18 34-4 58 30 40 62-30 14-110 20-150 32Z" fill="#c8421a" stroke={INK} strokeWidth="3" />
        </g>
        <g transform="translate(1060 622) scale(0.45)">
          <path d="M-80 40c-16-34 12-72 44-70 12-34 64-38 84-6 36 0 56 34 38 64-26 14-110 20-166 12Z" fill="#b8321a" stroke={INK} strokeWidth="3" />
        </g>
      </g>

      {/* ── La camioneta (origen = suelo, entre las ruedas) ─── */}
      <g data-layer="truck">
        <g data-truck-pos transform="translate(800 806) scale(0.9)">
          <g>
            {/* ground shadow */}
            <ellipse data-truck-shadow cx="0" cy="6" rx="290" ry="26" fill="#120b09" opacity="0.42" />

            {/* cab, seen from behind */}
            <g data-truck-cab>
              <path
                d="M-178 -332 L-178 -452 Q-178 -526 -108 -526 L108 -526 Q178 -526 178 -452 L178 -332Z"
                fill="#27423f"
                stroke={INK}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M-178 -332 L-178 -452 Q-178 -526 -108 -526 L-96 -526 L-120 -332Z" fill="#36645d" opacity="0.8" />
              <path d="M178 -332 L178 -452 Q178 -526 108 -526 L96 -526 L130 -332Z" fill="#17302e" opacity="0.85" />
              {/* rear window: the sky shows through */}
              <rect x="-112" y="-486" width="224" height="82" rx="14" fill="#f19a3e" stroke={INK} strokeWidth="3" />
              <path d="M-112 -440 L-60 -486 L-30 -486 L-84 -404 L-112 -404Z" fill="#ffc872" opacity="0.8" />
              <path d="M30 -486 L70 -486 L22 -404 L-2 -404Z" fill="#ffc872" opacity="0.5" />
              <rect x="-112" y="-486" width="224" height="82" rx="14" fill="none" stroke="#12201f" strokeWidth="6" opacity="0.5" />
              {/* mirrors */}
              <path d="M-178 -430 L-212 -438 L-214 -392 L-178 -386Z" fill="#1c3331" stroke={INK} strokeWidth="2.5" />
              <path d="M178 -430 L212 -438 L214 -392 L178 -386Z" fill="#1c3331" stroke={INK} strokeWidth="2.5" />
              {/* cab shadow screen */}
              <path d="M-178 -332 L-178 -452 Q-178 -526 -108 -526 L108 -526 Q178 -526 178 -452 L178 -332Z" fill="url(#rh-dots)" opacity="0.2" />
            </g>

            {/* bed interior: darkness behind the animals */}
            <path d="M-222 -330 L222 -330 L222 -120 L-222 -120Z" fill="#0f1c1b" />

            {/* the animals live in the bed; the tailgate hides what is below it */}
            <g clipPath="url(#rh-bed-clip)">
              {/* tails first: the dog's plume and the pig's curl */}
              {!calm && (
                <>
              <g transform="translate(-100 -318)">
                <g data-tail="dog">
                <g data-tail-sway>
                  <path
                    d="M0 0 C-10 -46 -6 -92 26 -128 C40 -92 36 -40 14 0Z"
                    fill="#2a2220"
                    stroke={INK}
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path d="M26 -128 C38 -112 38 -88 32 -66 C16 -80 12 -110 26 -128Z" fill="#fbf5ea" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
                  <path d="M6 -20 C2 -50 6 -80 20 -104" fill="none" stroke="#4d403a" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
                </g>
                </g>
              </g>
              <g transform="translate(112 -318)">
                <g data-tail="pig">
                <g data-tail-sway>
                  <path
                    d="M0 0 C16 -26 46 -22 44 -48 C42 -72 12 -70 14 -52 C16 -40 34 -42 32 -54"
                    fill="none"
                    stroke={INK}
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 0 C16 -26 46 -22 44 -48 C42 -72 12 -70 14 -52 C16 -40 34 -42 32 -54"
                    fill="none"
                    stroke="#f2a1b0"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </g>
                </g>
              </g>
                </>
              )}

              {/* the dog (border collie), left */}
              <g transform="translate(-92 -318)">
                <g data-head="dog">
                <g data-head-bob>
                  {/* chest and neck */}
                  <path d="M-62 40 C-70 -10 -52 -34 -34 -44 L34 -44 C54 -34 70 -10 62 40Z" fill="#fbf5ea" stroke={INK} strokeWidth="3" />
                  <path d="M-62 40 C-70 -10 -52 -34 -34 -44 L-24 -44 C-44 -10 -44 14 -46 40Z" fill="#2a2220" />
                  {/* head */}
                  <path d="M-62 -92 C-66 -140 -34 -168 0 -168 C34 -168 66 -140 62 -92 C60 -62 34 -42 0 -42 C-34 -42 -60 -62 -62 -92Z" fill="#2a2220" stroke={INK} strokeWidth="3" />
                  {/* ears */}
                  <path d="M-52 -150 C-86 -176 -112 -150 -108 -112 C-106 -96 -92 -88 -78 -92 C-64 -104 -54 -128 -52 -150Z" fill="#2a2220" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                  <path d="M46 -156 C74 -186 108 -166 108 -126 C108 -108 92 -98 78 -104 C62 -116 50 -136 46 -156Z" fill="#2a2220" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                  <path d="M-90 -138 C-96 -122 -92 -108 -84 -104" fill="none" stroke="#5a4a44" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                  {/* white blaze and muzzle */}
                  <path d="M-8 -166 L8 -166 C16 -130 20 -108 36 -86 C40 -64 22 -48 0 -48 C-22 -48 -40 -64 -36 -86 C-20 -108 -14 -130 -8 -166Z" fill="#fbf5ea" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
                  {/* nose */}
                  <ellipse cx="0" cy="-70" rx="15" ry="11" fill="#1a1412" stroke={INK} strokeWidth="2" />
                  <ellipse cx="-4" cy="-74" rx="5" ry="2.6" fill="#7a6a62" />
                  {/* mouth + tongue */}
                  <path d="M0 -60 L0 -52 M-20 -54 C-12 -46 -4 -46 0 -52 C4 -46 12 -46 20 -54" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M-8 -50 C-8 -30 8 -30 8 -50Z" fill="#ef7487" stroke={INK} strokeWidth="2.5" />
                  <path d="M0 -50 L0 -38" stroke="#b4465a" strokeWidth="2" />
                  {/* eyes: looking up and to the side */}
                  <ellipse cx="-30" cy="-110" rx="12" ry="14" fill="#fff" stroke={INK} strokeWidth="2.5" />
                  <ellipse cx="30" cy="-110" rx="12" ry="14" fill="#fff" stroke={INK} strokeWidth="2.5" />
                  <circle cx="-27" cy="-112" r="7" fill="#1a1412" />
                  <circle cx="33" cy="-112" r="7" fill="#1a1412" />
                  <circle cx="-25" cy="-115" r="2.4" fill="#fff" />
                  <circle cx="35" cy="-115" r="2.4" fill="#fff" />
                  <path d="M-46 -128 C-36 -138 -22 -138 -14 -130" fill="none" stroke="#fbf5ea" strokeWidth="4" strokeLinecap="round" />
                  <path d="M14 -130 C22 -138 36 -138 46 -128" fill="none" stroke="#fbf5ea" strokeWidth="4" strokeLinecap="round" />
                  <path d="M-62 -92 C-66 -140 -34 -168 0 -168 C34 -168 66 -140 62 -92 C60 -62 34 -42 0 -42 C-34 -42 -60 -62 -62 -92Z" fill="url(#rh-dots)" opacity="0.14" />
                </g>
                </g>
              </g>

              {/* the pig, right */}
              <g transform="translate(108 -318)">
                <g data-head="pig">
                <g data-head-bob>
                  <path d="M-70 40 C-80 -6 -60 -30 -40 -40 L40 -40 C60 -30 80 -6 70 40Z" fill="#f2a1b0" stroke={INK} strokeWidth="3" />
                  {/* ears */}
                  <path d="M-48 -134 C-70 -176 -108 -170 -112 -128 C-112 -108 -92 -100 -74 -106 C-58 -112 -50 -122 -48 -134Z" fill="#ec8da0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                  <path d="M-72 -150 C-90 -150 -98 -136 -94 -122" fill="none" stroke="#c9647c" strokeWidth="4" strokeLinecap="round" />
                  <path d="M48 -134 C70 -176 108 -170 112 -128 C112 -108 92 -100 74 -106 C58 -112 50 -122 48 -134Z" fill="#ec8da0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                  <path d="M72 -150 C90 -150 98 -136 94 -122" fill="none" stroke="#c9647c" strokeWidth="4" strokeLinecap="round" />
                  {/* head */}
                  <path d="M-84 -92 C-86 -146 -44 -170 0 -170 C44 -170 86 -146 84 -92 C82 -56 44 -36 0 -36 C-44 -36 -82 -56 -84 -92Z" fill="#f4a9b8" stroke={INK} strokeWidth="3" />
                  <path d="M-84 -92 C-86 -146 -44 -170 0 -170 L-6 -170 C-52 -160 -76 -128 -70 -84 C-66 -60 -50 -48 -34 -42 C-62 -50 -82 -66 -84 -92Z" fill="#f9c6d0" opacity="0.7" />
                  {/* cheeks */}
                  <ellipse cx="-58" cy="-78" rx="16" ry="10" fill="#e9758c" opacity="0.65" />
                  <ellipse cx="58" cy="-78" rx="16" ry="10" fill="#e9758c" opacity="0.65" />
                  {/* snout */}
                  <ellipse cx="0" cy="-70" rx="38" ry="28" fill="#ec8da0" stroke={INK} strokeWidth="3" />
                  <ellipse cx="-13" cy="-70" rx="6" ry="9" fill="#8a2f4a" />
                  <ellipse cx="13" cy="-70" rx="6" ry="9" fill="#8a2f4a" />
                  <path d="M-30 -84 C-20 -92 -8 -92 -4 -88" fill="none" stroke="#fbd2da" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
                  {/* eyes: a worried glance */}
                  <ellipse cx="-34" cy="-118" rx="9" ry="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
                  <ellipse cx="34" cy="-118" rx="9" ry="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
                  <circle cx="-36" cy="-116" r="5.5" fill="#1a1412" />
                  <circle cx="32" cy="-116" r="5.5" fill="#1a1412" />
                  <circle cx="-34" cy="-119" r="2" fill="#fff" />
                  <circle cx="34" cy="-119" r="2" fill="#fff" />
                  <path d="M-48 -136 C-40 -142 -28 -140 -22 -134" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
                  <path d="M22 -134 C28 -140 40 -142 48 -136" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
                  <path d="M-84 -92 C-86 -146 -44 -170 0 -170 C44 -170 86 -146 84 -92 C82 -56 44 -36 0 -36 C-44 -36 -82 -56 -84 -92Z" fill="url(#rh-dots)" opacity="0.1" />
                </g>
                </g>
              </g>
            </g>

            {/* bed rail, tailgate, lights, plate, bumper */}
            <g data-truck-gate>
              <path d="M-236 -346 L236 -346 L236 -318 L-236 -318Z" fill="#35625b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M-236 -346 L-236 -318 L-200 -318 L-212 -346Z" fill="#4a7f76" opacity="0.8" />
              <path d="M-228 -318 L228 -318 L228 -112 L-228 -112Z" fill="#22403d" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M-228 -318 L-196 -318 L-196 -112 L-228 -112Z" fill="#2f5a54" opacity="0.7" />
              <path d="M196 -318 L228 -318 L228 -112 L196 -112Z" fill="#142a28" opacity="0.8" />
              {/* embossed panel */}
              <rect x="-168" y="-290" width="336" height="150" rx="12" fill="none" stroke="#10211f" strokeWidth="5" opacity="0.8" />
              <rect x="-168" y="-290" width="336" height="150" rx="12" fill="none" stroke="#3c6d65" strokeWidth="2" opacity="0.8" transform="translate(2 2)" />
              <path d="M-228 -318 L228 -318 L228 -112 L-228 -112Z" fill="url(#rh-dots)" opacity="0.16" />
              {/* tail lights */}
              <g>
                <rect x="-214" y="-262" width="38" height="60" rx="10" fill="#d52a22" stroke={INK} strokeWidth="3" />
                <rect x="-208" y="-256" width="14" height="46" rx="6" fill="#ff7a5c" opacity="0.8" />
                <rect x="176" y="-262" width="38" height="60" rx="10" fill="#d52a22" stroke={INK} strokeWidth="3" />
                <rect x="182" y="-256" width="14" height="46" rx="6" fill="#ff7a5c" opacity="0.8" />
              </g>
              {/* plate */}
              <g>
                <rect x="-54" y="-196" width="108" height="42" rx="6" fill="#f2b630" stroke={INK} strokeWidth="3" />
                <path d="M-40 -178h80M-30 -166h60" stroke="#8a5a14" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                <circle cx="-44" cy="-190" r="2.6" fill="#8a5a14" />
                <circle cx="44" cy="-190" r="2.6" fill="#8a5a14" />
              </g>
              {/* bumper */}
              <path d="M-246 -112 L246 -112 L246 -80 L-246 -80Z" fill="#8f8c84" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M-246 -112 L246 -112 L246 -104 L-246 -104Z" fill="#c9c6bc" />
              <path d="M-246 -88 L246 -88 L246 -80 L-246 -80Z" fill="#5a574f" opacity="0.7" />
            </g>

            {/* underbody and tires */}
            <path d="M-210 -80 L210 -80 L210 -36 L-210 -36Z" fill="#120d0c" />
            <g>
              <path d="M-212 -96 Q-212 -108 -198 -108 L-134 -108 Q-120 -108 -120 -96 L-120 -8 Q-120 4 -134 4 L-198 4 Q-212 4 -212 -8Z" fill="#171413" stroke={INK} strokeWidth="3" />
              <path d="M120 -96 Q120 -108 134 -108 L198 -108 Q212 -108 212 -96 L212 -8 Q212 4 198 4 L134 4 Q120 4 120 -8Z" fill="#171413" stroke={INK} strokeWidth="3" />
              <g stroke="#3a3330" strokeWidth="3" strokeLinecap="round">
                <path d="M-200 -80h68M-200 -56h68M-200 -32h68M-200 -10h68" />
                <path d="M132 -80h68M132 -56h68M132 -32h68M132 -10h68" />
              </g>
              <path d="M-206 -100 L-206 -10" stroke="#4a4340" strokeWidth="4" strokeLinecap="round" />
              <path d="M126 -100 L126 -10" stroke="#4a4340" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* smoke churning at the wheels */}
            <g data-smoke filter="url(#rh-smoke-filter)">
              {SMOKE.map((puff, i) => (
                <ellipse
                  key={i}
                  data-smoke-puff
                  cx={puff.x}
                  cy={puff.y}
                  rx={puff.rx}
                  ry={puff.ry}
                  fill="url(#rh-smoke-fill)"
                  opacity="0"
                />
              ))}
            </g>
          </g>
        </g>
      </g>

      {/* ── Primer plano ────────────────────────────────────── */}
      <g data-layer="fore">
        <path d="M0 900 L0 790 C60 770 120 800 170 830 C210 856 250 880 270 900Z" fill="#a8341a" stroke={INK} strokeWidth="3" />
        <path d="M1600 900 L1600 800 C1540 780 1470 806 1420 836 C1380 860 1346 884 1330 900Z" fill="#a8341a" stroke={INK} strokeWidth="3" />
        <path d="M0 830 C70 818 130 846 160 880" fill="none" stroke="#f08a3a" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        <path d="M1600 836 C1530 824 1470 852 1440 884" fill="none" stroke="#f08a3a" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        {/* dry grass */}
        <g stroke="#f3b23c" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M40 900 C34 860 44 836 60 820" />
          <path d="M70 900 C70 864 80 840 100 826" />
          <path d="M100 900 C104 870 118 852 140 846" />
          <path d="M1530 900 C1536 860 1526 836 1510 822" />
          <path d="M1500 900 C1500 864 1490 840 1470 828" />
          <path d="M1470 900 C1466 870 1452 852 1430 848" />
        </g>
        <path d="M0 0 H1600 V900 H0Z" fill="url(#rh-vig)" />
      </g>
    </svg>
  )
}

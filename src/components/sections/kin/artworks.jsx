/**
 * KIN — placeholder artworks.
 *
 * Six constructivist compositions drawn in SVG (circles, bars, steps, a
 * doorway) with a paper-cutout shadow, so the gallery works out of the box
 * without photos. Replace them with your own images: each entry only needs
 * a `name` and either an `Art` component or an image (`src` + `alt`) — the
 * Collection section renders whichever it gets. The grain on top comes from
 * the section, so real photos get it too.
 */

const PAPER = '#ece4d3'
const INK = '#151515'
const RED = '#e1371f'
const BLUE = '#35548c'
const OCHRE = '#d6a83a'
const CREAM = '#f4efe6'

function Frame({ id, bg, children }) {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <defs>
        <filter id={`${id}-cut`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="7" dy="10" stdDeviation="7" floodColor="#000" floodOpacity="0.28" />
        </filter>
        <radialGradient id={`${id}-light`} cx="35%" cy="25%" r="85%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={bg} />
      <g filter={`url(#${id}-cut)`}>{children}</g>
      <rect width="400" height="500" fill={`url(#${id}-light)`} />
    </svg>
  )
}

const ArtOne = () => (
  <Frame id="kin-art-1" bg={PAPER}>
    <circle cx="268" cy="150" r="104" fill={RED} />
    <rect x="70" y="58" width="46" height="384" fill={INK} />
    <rect x="96" y="318" width="270" height="22" fill={BLUE} transform="rotate(-32 231 329)" />
    <rect x="292" y="372" width="42" height="42" fill={OCHRE} />
  </Frame>
)

const ArtTwo = () => (
  <Frame id="kin-art-2" bg={INK}>
    <path d="M30 500 A170 170 0 0 1 370 500 Z" fill={PAPER} />
    <rect x="212" y="58" width="40" height="236" fill={RED} transform="rotate(28 232 176)" />
    <rect x="62" y="72" width="32" height="32" fill={OCHRE} />
    <rect x="60" y="250" width="150" height="4" fill={CREAM} />
  </Frame>
)

const ArtThree = () => (
  <Frame id="kin-art-3" bg={BLUE}>
    <rect x="52" y="330" width="120" height="120" fill={PAPER} />
    <rect x="148" y="250" width="120" height="200" fill={CREAM} />
    <rect x="244" y="170" width="110" height="280" fill={PAPER} />
    <circle cx="112" cy="150" r="36" fill={RED} />
    <rect x="0" y="450" width="400" height="10" fill={INK} />
  </Frame>
)

const ArtFour = () => (
  <Frame id="kin-art-4" bg={OCHRE}>
    <circle cx="196" cy="256" r="142" fill={INK} />
    <rect x="28" y="232" width="344" height="38" fill={PAPER} transform="rotate(-8 200 251)" />
    <rect x="304" y="54" width="14" height="150" fill={RED} />
  </Frame>
)

// Seven bars on a baseline, one of them red — the KIN mark, laid flat.
const ArtFive = () => (
  <Frame id="kin-art-5" bg={CREAM}>
    {[150, 230, 120, 280, 190, 250, 140].map((h, i) => (
      <rect key={i} x={48 + i * 46} y={430 - h} width="30" height={h} fill={i === 3 ? RED : INK} />
    ))}
    <rect x="30" y="430" width="340" height="3" fill={INK} />
  </Frame>
)

// The doorway from the hero.
const ArtSix = () => (
  <Frame id="kin-art-6" bg={RED}>
    <rect x="96" y="128" width="208" height="48" fill={INK} />
    <rect x="96" y="176" width="52" height="270" fill={INK} />
    <rect x="252" y="176" width="52" height="270" fill={INK} />
    <rect x="156" y="184" width="88" height="262" fill={PAPER} />
    <circle cx="330" cy="70" r="22" fill={CREAM} />
  </Frame>
)

export const ARTWORKS = [
  { name: 'Lorem', Art: ArtOne },
  { name: 'Ipsum', Art: ArtTwo },
  { name: 'Dolor', Art: ArtThree },
  { name: 'Sit amet', Art: ArtFour },
  { name: 'Consectetur', Art: ArtFive },
  { name: 'Adipiscing', Art: ArtSix },
]

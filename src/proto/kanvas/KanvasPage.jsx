import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { getLenis } from '../../hooks/useLenis'
import { createKanvas, lerp, clamp01 } from './engine'
import { createFrameBudget } from '../../lib/motion'
import { createAudio } from './audio'
import { createRidge, createTopo } from './ridge'
import { createRelic } from './relic'
import { sealedGltfLoader, sealedImage } from './sealed'
import { KEEPERS, drawKeeper, drawSigil, drawSwatch } from './keepers'
import { createArtifacts } from './film'
import { createOaths } from './oaths'
import { createWorld } from './world'
import { createGrass } from './grass'
import { createInk } from './ink'
import LegalSheet from '../../components/LegalSheet'
import { AMBER, AudioWave, BODY, DISPLAY, FONTS_HREF, KANVAS_CSS, Menu, LABEL, RollLink, useScrambleIn, useSubscribed } from './ui'

/**
 * Kanvas — prototipo (solo local) con la arquitectura de la referencia y una identidad propia: VESPER,
 * un atlas ilustrado. Cómo funciona: docs/kanvas.md.
 *
 *   · Un RELOJ único: el scroll produce un progreso 0 → 1. Un espaciador da el largo y nada más.
 *   · Una capa CANVAS fija (todo lo que es imagen o 3D) y una capa UI fija encima, con las secciones
 *     APILADAS: el progreso decide cuál se ve.
 *   · Un cuaderno de expedición dibujado: la carga entinta el nombre y después la escena se dibuja en
 *     línea de tinta desde el visor del protagonista y entra el color; las láminas son viñetas de cómic
 *     (borde de tinta, sombra corrida, cajas de narración) sobre una hoja rayada.
 *   · Carga → hero (escena 3D) → el hero se aleja y queda como la viñeta del medio entre otras dos →
 *     la lámina se da vuelta y del otro lado está la cordillera, a pantalla completa → una transición
 *     de vetas → los dos viajeros de espaldas, al viento.
 */

const NAME = 'VESPER'
const CREAM = '#efe6d3' // el papel del cuaderno: fondo de la carga y de las páginas claras
// La carga, en segundos desde que todo bajó: la línea crece desde el visor, después entra el color.
const INK_SECS = 4.4
const INK = '#1f1810' // tinta cálida, como el contorno de las ilustraciones
// 2026-10-19, dueño: «hay que scrollear demasiado» en la página 02, las cartas, el Faro, los juramentos y el
// mundo. El guion se apretó de 39 a 27,5 pantallas: cada tramo dura menos y se pisan más entre sí.
const SCROLL_SCREENS = 28.5
// El guion se escribe en pantallas de scroll (0 = arriba de todo, 27,5 = el final) y se pasa a progreso.
const TRAVEL = SCROLL_SCREENS - 1
const S = (a, b) => [a / TRAVEL, b / TRAVEL]
// Cuánto mide de verdad cada «pantalla» del guion, en svh. La referencia recorre todo en ~16 pantallas
// reales: con 100 había que scrollear 2,5 veces más para lo mismo (el dueño: «scrolleás un poquito y
// avanza un montón»). El guion no cambia; cambia el largo del espaciador. Con 44 (≈17 pantallas) el
// dueño lo sintió apurado («sucede todo un poco muy rápido, bajale»): 58 ≈ 23 pantallas.
const SCREEN_SVH = 58


const T = {
  heroOut: S(0.12, 0.45), // el titular y la bitácora del hero se desvanecen
  morph: S(0.3, 1.45), // el hero se aleja y queda como lámina (el giro: más corto y ágil)
  tableIn: S(0.8, 1.45), // las láminas suben a su lugar
  ink: S(1.2, 1.75), // su titular se entinta
  tableOut: S(2.25, 2.6), // el texto de las láminas se va (la página 02 ya no se queda esperando)
  flip: S(2.25, 3.25), // la lámina del hero se da vuelta y crece a pantalla completa
  ridge: S(3.15, 7.8), // la cordillera: q de 0 a 1
  wipe: S(7.2, 8.6), // la transición de rombos (tapa todo en el medio)
  relic: S(7.9, 10.3), // la reliquia: la carta gira con el scroll
  relicOut: S(10.1, 10.9), // la carta se aleja y la sección se va
  rosterBg: S(10.3, 11.1), // un cuadrado oscuro crece desde el centro hasta llenar la pantalla
  rosterIn: S(10.7, 11.5), // los dos abanicos de guardianes se abren desde el centro
  roster: S(10.5, 13.8),
  rosterAuto: S(11.1, 12.5), // mientras tanto pasan solos; pasado este punto se frenan
  rosterFold: S(12.5, 13.0), // y se cierran hacia el centro (queda una carta por lado)
  rosterOut: S(13.0, 13.6), // las dos cartas se achican y se van
  beacon: S(13.5, 16.9), // el Faro: b de 0 a 1
  beaconOut: S(16.9, 17.8), // el mundo del Faro se achica a una carta y sale volando hacia arriba
  oathsIn: S(17.4, 18.5), // la carta de los juramentos sube desde abajo y crece a pantalla completa
  oaths: S(18.6, 21.4), // los juramentos: dos personajes en capas, con su propio HOLD
  oathsOut: S(21.3, 22.2), // se van como el Faro: carta que sale volando
  worldIn: S(21.9, 23.0), // sube la carta del mundo
  world: S(23.0, 25.6), // el mundo: el archipiélago desde el acantilado, con su HOLD
  worldOut: S(25.5, 26.3),
  endIn: S(26.0, 27.5), // el cierre: la marca gigante y el collage de tres cartas
}
// Dentro del Faro (b).
const B = {
  bgIn: [0, 0.12], // el mundo de fondo, oscuro, detrás de las cartas
  cardsIn: [0.03, 0.14],
  flip: [0.14, 0.4], // las tres cartas se dan vuelta (de a una): del emblema a su vista del mundo
  expand: [0.46, 0.64], // la carta del centro se abre a pantalla completa: es una ventana al mundo
  hud: [0.62, 0.72], // el HUD del Faro: título vertical, datos, escaneo y el botón HOLD
}
const BEACON_CARDS = ['Gate', 'Tower', 'Harbor']
// Las vistas del dorso de cada carta (la isla desde otras cámaras) y la cámara del mundo que baja.
const BEACON_VIEWS = [
  { pos: [-3.2, 0.4, 4.2], at: [-0.4, 0.4, 0.4], fov: 40 },
  { pos: [1.6, 5.6, 3.4], at: [0.3, 3.6, 0.2], fov: 42 },
  { pos: [4.6, -2.6, 6.2], at: [0.2, -0.6, 0], fov: 38 },
]
const BEACON_PATH = [
  { pos: [3.2, 7.4, 5.8], at: [0.3, 4.2, 0.2] }, // arriba: el cristal y la punta de la torre
  { pos: [4.4, 1.2, 7.2], at: [0.3, 1.0, 0.2] }, // la plataforma, con los viajeros
  { pos: [4.8, -4.4, 7.6], at: [0.2, -1.2, 0.0] }, // abajo: la panza de la isla sobre las nubes
]
// Dentro de la cordillera (q).
const Q = {
  textA: [0.04, 0.14, 0.36, 0.46], // entra, se queda, se va
  textB: [0.5, 0.58, 0.86, 0.95],
}
const RELIC_COUNT = 312 // el número vertical: hojas del atlas

// Todas las cartas son rectángulos con las puntas apenas redondeadas (nada de arcos: pedido del dueño).
const CARD_SHAPE = (w) => ({ top: Math.min(12, w * 0.04), bottom: Math.min(12, w * 0.04) })
const KEEPER_SHAPE = CARD_SHAPE

// Los personajes parados en el campo del hero (coordenadas de three, y arriba; el GLB mide 1 de alto con
// el origen en el centro, así que y = suelo + escala / 2; el suelo lo imprime build-field.py). Los GLB de
// Tripo miran a +x: con rotY ≈ -π/2 miran a la cámara. Adelante el protagonista (casco, el arma en la mano;
// dueño 2026-10-18), atrás y a un costado el viejo de los anteojos.
const HERO_CHARS = [
  { src: '/proto/kanvas/hero/raider.glb', pos: [0.35, -0.04 + 0.55, 0], scale: 1.1, rotY: -1.5 },
  { src: '/proto/kanvas/hero/man.glb', pos: [-0.95, -0.008 + 0.55, -1.4], scale: 1.1, rotY: -1.3 },
]
// el sendero del campo (igual que en build-field.py, con y de Blender = -z de three)
const pathX = (y) => Math.sin(y * 0.08) * 1.2 + Math.max(0, y - 6) * 0.22

// Las otras dos láminas, como en la referencia: imágenes quietas (un personaje, y la del «trailer», con
// su botón de play). La del medio es el hero, que termina en la cara de ella.
// La tercera es el boceto pegado con cinta debajo de la primera (la línea de tinta de la misma escena).
const HERO_CARDS = ['/proto/kanvas/hero/card-still.webp', '/proto/kanvas/hero/card-reel.webp', '/proto/kanvas/hero/rough.webp']

const NAV = [
  { id: 'atlas', label: 'Atlas', p: 0, leaf: '01' },
  { id: 'isles', label: 'The Isles', p: 1.9 / TRAVEL, leaf: '02' },
  { id: 'wayfarers', label: 'Wayfarers', p: 5.9 / TRAVEL, leaf: '03' },
  { id: 'relics', label: 'Relics', p: 9.3 / TRAVEL, leaf: '04' },
  { id: 'keepers', label: 'Keepers', p: 11.8 / TRAVEL, leaf: '05' },
  { id: 'beacon', label: 'The Beacon', p: 16.0 / TRAVEL, leaf: '06' },
  { id: 'oaths', label: 'The Oaths', p: 20.0 / TRAVEL, leaf: '07' },
  { id: 'world', label: 'The World', p: 24.5 / TRAVEL, leaf: '08' },
]
const END = { id: 'end', p: 1 }
// las tres cartas del cierre: a qué hoja lleva cada una (el rótulo aparece al pasar el mouse)
const END_CARDS = [
  { label: 'The world', go: 'world' },
  { label: 'The beacon', go: 'beacon' },
  { label: 'The oaths', go: 'oaths' },
]
const LEGAL = {
  privacy: {
    title: 'Privacy policy',
    body: 'Vesper Atlas keeps no account of who reads the atlas. The page remembers only whether the music was on, in your own browser.\n\nIf you write to us, your message stays with the cartographers and is never sold or shared.',
  },
  terms: {
    title: 'Terms of service',
    body: 'The leaves of the atlas are free to read and to share with a link back.\n\nThe names, places and paintings of Vesper belong to its makers. Fan art is welcome; selling it under the Vesper name is not.',
  },
  license: {
    title: 'Atlas license',
    body: 'Every leaf is released for personal reading. Quotes of up to one leaf may be used with credit to Vesper Atlas.\n\nThe ninth leaf is unfinished and may change before it ships.',
  },
}
const MENU = NAV

// La película de HOLD: mientras se mantiene apretado, las tandas se suceden (REEL segundos cada una).
// Cada tanda trae tres paneles; `at` es su lugar en la ventana del HUD (fracciones: x, y, ancho, alto).
// Tipos: 'view' (la isla en vivo desde una cámara que orbita), 'art' (una pieza 3D de film.js; con
// `scan`, en grises), 'scan' (la torre escaneada), 'topo' (el relieve), 'relic' (el farol), 'paint' (la
// pintura de un guardián).
const REEL = 2.8
const FILMS = {
  beacon: [
    [
      { kind: 'view', view: 0, label: 'Harbor feed', code: 'Live', foot: 'Lantern boats 12 · wind 14 kn NE', at: [0.17, 0.05, 0.33, 0.37] },
      { kind: 'art', art: 'shard', label: 'Lumen shard', code: 'RLC-07', foot: 'Charge 92% · found under the gate', at: [0.6, 0.1, 0.33, 0.8] },
      { kind: 'scan', label: 'Tower scan', code: 'SCN-01', foot: 'Height 41 m · visibility 157°', at: [0.3, 0.5, 0.24, 0.46] },
    ],
    [
      { kind: 'art', art: 'astrolabe', label: "Wayfarer's astrolabe", code: 'RLC-12', foot: 'Three rings · one true north', at: [0.18, 0.28, 0.3, 0.68] },
      { kind: 'topo', label: 'Isle relief', code: 'MAP-03', foot: 'Drift 0.4 m / yr · sector C-14', at: [0.55, 0.04, 0.38, 0.38] },
      { kind: 'art', art: 'key', scan: true, label: 'Key of the low gate', code: 'RLC-02', foot: 'Bronze · forged 4th age', at: [0.69, 0.5, 0.24, 0.46] },
    ],
    [
      { kind: 'relic', label: 'The last lantern', code: 'RLC-01', foot: 'Oil 6 / 8 · flame steady', at: [0.17, 0.06, 0.27, 0.62] },
      { kind: 'view', view: 2, label: 'Underside — live', code: 'Live', foot: 'Cloud floor −2 400 m', at: [0.5, 0.55, 0.3, 0.41] },
      { kind: 'paint', keeper: 0, label: 'Keeper on watch', code: 'KPR-140', foot: 'Aurel Vane · lamplighter', at: [0.74, 0.06, 0.2, 0.44] },
    ],
  ],
  oaths: [
    [
      { kind: 'paint', keeper: 0, label: 'Oath of the lamp', code: 'OTH-I', foot: 'Carry the light forward', at: [0.17, 0.06, 0.22, 0.5] },
      { kind: 'art', art: 'seal', label: 'Lamp seal', code: 'SEL-01', foot: 'Eight points · eight beacons', at: [0.62, 0.05, 0.3, 0.42] },
      { kind: 'art', art: 'hook', scan: true, label: 'Tide hook', code: 'WPN-07', foot: 'Bone and iron · reach 1.4 m', at: [0.56, 0.52, 0.36, 0.44] },
    ],
    [
      { kind: 'art', art: 'astrolabe', scan: true, label: 'Tide astrolabe', code: 'RLC-12B', foot: 'Reads the dark between isles', at: [0.17, 0.3, 0.3, 0.66] },
      { kind: 'paint', keeper: 5, label: 'Oath of the tide', code: 'OTH-II', foot: 'Keep the dark at bay', at: [0.72, 0.05, 0.2, 0.46] },
      { kind: 'view', view: 1, label: 'The crossing — live', code: 'Live', foot: 'Lamplighters 1 812 · Tidebound 1 188', at: [0.42, 0.56, 0.3, 0.4] },
    ],
    [
      { kind: 'art', art: 'bell', label: 'Storm bell', code: 'RLC-19', foot: 'Rung once per crossing', at: [0.18, 0.05, 0.26, 0.56] },
      { kind: 'relic', label: 'The last lantern', code: 'RLC-01', foot: 'Both oaths swear on it', at: [0.62, 0.08, 0.28, 0.5] },
      { kind: 'art', art: 'key', label: 'Key of the low gate', code: 'RLC-02', foot: 'Held by neither · owed to both', at: [0.36, 0.6, 0.26, 0.36] },
    ],
  ],
  world: [
    [
      { kind: 'world', label: 'Archipelago — live', code: 'Live', foot: '9 isles charted · 31 rumored', at: [0.17, 0.05, 0.36, 0.4] },
      { kind: 'topo', label: 'Relief of the outer isles', code: 'MAP-07', foot: 'Drift 1.2 m / yr · sector A-02', at: [0.62, 0.06, 0.3, 0.38] },
      { kind: 'art', art: 'astrolabe', label: "Wayfarer's astrolabe", code: 'RLC-12', foot: 'Points at the next isle, never the last', at: [0.6, 0.5, 0.3, 0.46] },
    ],
    [
      { kind: 'art', art: 'shard', scan: true, label: 'Lumen vein', code: 'GEO-04', foot: 'Runs under every isle', at: [0.18, 0.3, 0.28, 0.66] },
      { kind: 'view', view: 1, label: 'The beacon — live', code: 'Live', foot: 'Seen from 40 km on a clear night', at: [0.52, 0.06, 0.34, 0.4] },
      { kind: 'paint', keeper: 7, label: 'Charted by', code: 'KPR-399', foot: 'Lune Adair · stargazer', at: [0.72, 0.52, 0.2, 0.44] },
    ],
    [
      { kind: 'art', art: 'bell', scan: true, label: 'Storm bell', code: 'RLC-19', foot: 'Heard across three isles', at: [0.17, 0.04, 0.24, 0.44] },
      { kind: 'scan', label: 'Tower scan', code: 'SCN-01', foot: 'Height 41 m · visibility 157°', at: [0.66, 0.04, 0.26, 0.42] },
      { kind: 'world', label: 'Lantern routes — live', code: 'Live', foot: '18 boats crossing now', at: [0.3, 0.52, 0.4, 0.44] },
    ],
  ],
}
// en el teléfono, el mismo lugar para los tres paneles de cada tanda (arriba; abajo queda el botón)
const FILM_PHONE = [
  [0.17, 0.02, 0.81, 0.28],
  [0.17, 0.32, 0.39, 0.3],
  [0.59, 0.32, 0.39, 0.3],
]
// las cámaras de los paneles 'view' (la isla en vivo; orbitan solas)
const FILM_VIEWS = [
  { at: [0.3, 0.8, 0.2], rad: 7.2, y: 1.6, fov: 34 },
  { at: [0.3, 2.6, 0.2], rad: 6.4, y: 3.4, fov: 40 },
  { at: [0.2, -0.8, 0.0], rad: 7.6, y: -3.8, fov: 38 },
]
const HOLD_TITLES = { beacon: 'The beacon', oaths: 'Two oaths', world: 'The world' }

// La transición a pantalla completa: una grilla de rombos (la estrella del atlas). Los rombos crecen de
// abajo hacia arriba hasta tapar todo y después se abren desde adentro en el mismo orden, con el filo
// en ámbar. (La referencia usa letras recortadas; acá es geometría.)
const WIPE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize;
uniform float uT;
uniform vec3 uTint, uEdgeC;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  const float CELL = 110.0;
  vec2 px = vUv * uSize;
  vec2 id = floor(px / CELL);
  vec2 f = fract(px / CELL) * 2.0 - 1.0;
  float d = abs(f.x) + abs(f.y); // 0 en el centro del rombo, 2 en las esquinas de la celda
  float order = id.y / max(1.0, uSize.y / CELL) * 0.55 + hash(id) * 0.15;
  float rin = clamp(uT * 2.0 * 1.7 - order, 0.0, 1.0) * 2.05;
  float rout = clamp((uT * 2.0 - 1.0) * 1.7 - order, 0.0, 1.0) * 2.05;
  if (d > rin || d < rout) discard;
  float eIn = (1.0 - smoothstep(0.0, 0.07, abs(d - rin))) * step(rin, 2.0);
  float eOut = (1.0 - smoothstep(0.0, 0.07, abs(d - rout))) * step(0.001, rout);
  gl_FragColor = vec4(mix(uTint, uEdgeC, clamp(max(eIn, eOut), 0.0, 1.0)), 1.0);
}
`

// La hoja del cuaderno detrás de las láminas: renglones finos y la raya roja del margen.
const PAPER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize;
uniform float uAlpha, uTop, uMargin;
uniform vec3 uTint;
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize; // y desde arriba
  float rule = (1.0 - smoothstep(0.0, 1.0, abs(mod(px.y - uTop, 36.0) - 0.5))) * step(uTop, px.y);
  float margin = 1.0 - smoothstep(0.4, 1.4, abs(px.x - uMargin));
  vec4 c = vec4(uTint, rule * 0.1);
  c = mix(c, vec4(0.77, 0.38, 0.25, 0.4), margin);
  gl_FragColor = vec4(c.rgb, c.a * uAlpha);
}
`

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3
const seg = (p, [a, b]) => clamp01((p - a) / (b - a))
/** Entra en [a, b], se queda, se va en [c, d]. */
const span = (q, [a, b, c, d]) => Math.min(seg(q, [a, b]), 1 - seg(q, [c, d]))
const DEG = Math.PI / 180

/**
 * La carta que une dos secciones (como la referencia). `out`: la pantalla completa se achica a una carta
 * inclinada y sale volando hacia arriba. `in`: una carta sube desde abajo y se abre a pantalla completa.
 * `t` va lineal de 0 a 1 (cada etapa tiene su curva: suavizar dos veces deja la pantalla vacía entre
 * una carta y la otra). Devuelve el rect, el giro, cuánto se redondean las puntas y el tinte violeta.
 */
const cardMove = (dir, t, W, H) => {
  const cw = Math.min(W * 0.46, H * 0.62)
  const ch = cw * 0.72
  if (dir === 'out') {
    const s1 = easeInOut(clamp01(t / 0.5))
    const s2 = easeInOut(clamp01((t - 0.45) / 0.55))
    const w = lerp(W, cw, s1)
    const h = lerp(H, ch, s1)
    return { x: (W - w) / 2, y: lerp(0, H * 0.42 - ch / 2, s1) - s2 * H * 1.05, w, h, rot: (-4 * s1 - 7 * s2) * DEG, round: clamp01(t * 3), tint: Math.sin(t * Math.PI) * 0.35 }
  }
  const s1 = easeOut(clamp01(t / 0.45))
  const s2 = easeInOut(clamp01((t - 0.45) / 0.55))
  const w = lerp(cw, W, s2)
  const h = lerp(ch, H, s2)
  return { x: (W - w) / 2, y: lerp(lerp(H * 1.08, H * 0.5 - ch / 2, s1), 0, s2), w, h, rot: lerp(lerp(8, 3, s1), 0, s2) * DEG, round: 1 - s2, tint: (1 - s2) * 0.32 }
}

export default function KanvasPage() {
  return (
    <SmoothScrollProvider>
      <Kanvas />
    </SmoothScrollProvider>
  )
}

function Kanvas() {
  const canvasRef = useRef(null)
  const spacerRef = useRef(null)
  const R = useRef({ slots: [] })
  const loadRef = useRef(null)
  const [stage, setStage] = useState('load') // load (el nombre se entinta) → ink (la escena se dibuja) → done
  const [active, setActive] = useState('atlas')
  const [menu, setMenu] = useState(false)
  // la pista de la demo (Pixabay, «Phonk Reel» de Kulakovka): no viaja en el repo ni en el ZIP
  const audio = useMemo(() => createAudio({ track: '/proto/kanvas/audio/phonk-reel.mp3' }), [])
  const audioOn = useSubscribed(audio, false)

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    const lenis = getLenis()
    lenis?.stop()
    window.scrollTo(0, 0)
    const k = createKanvas(canvasRef.current, { clear: CREAM })
    // Si el equipo no llega a ~30 cuadros, la resolución baja de a escalones (createFrameBudget). Se mide
    // al entrar y otra vez en las secciones pesadas (el Faro, los juramentos, el mundo), que dibujan la
    // escena varias veces por cuadro. En un equipo rápido no cambia nada.
    const newBudget = () =>
      createFrameBudget({
        dpr: k.renderer.getPixelRatio(),
        min: 0.6,
        apply: (d) => {
          k.renderer.setPixelRatio(d)
          window.dispatchEvent(new Event('resize')) // el motor y los render targets se acomodan
        },
      })
    let budget = newBudget()
    const budgetFor = new Set()
    let frameNo = 0
    const { THREE } = k
    const r = R.current
    let stageNow = 'load'
    let activeNow = 'atlas'
    let themeNow = ''
    let sceneNow = 'intro'
    let hudNow = ""
    const toStage = (s) => {
      if (s === stageNow) return
      stageNow = s
      setStage(s)
    }

    // --- carga real: el GLB y las tipografías ---------------------------------------------------
    const manager = new THREE.LoadingManager()
    const boot = { prog: 0, shown: 0, loaded: false, reveal: 0 }
    manager.onProgress = (_u, done, total) => (boot.prog = done / total)
    manager.onLoad = () => (boot.loaded = true)

    manager.itemStart('fonts')
    const fontsLink = document.createElement('link')
    fontsLink.rel = 'stylesheet'
    fontsLink.href = FONTS_HREF
    let fontsDone = false
    const fontsReady = () => {
      if (fontsDone) return
      fontsDone = true
      // el nombre de la carga espera a su tipografía (si no, se ve un instante con otra)
      r.loadBox?.style.setProperty('opacity', '1')
      paintCards()
      manager.itemEnd('fonts')
    }
    fontsLink.onload = () =>
      Promise.all([
        document.fonts.load(`${DISPLAY.weight} 120px ${DISPLAY.family}`),
        document.fonts.load("500 12px 'Geist Mono'"),
        document.fonts.load("400 16px 'Barlow'"),
      ]).finally(fontsReady)
    fontsLink.onerror = fontsReady
    const fontsTimeout = setTimeout(fontsReady, 4000)
    document.head.appendChild(fontsLink)

    // --- la escena 3D del hero (la isla) ----------------------------------------------------------
    const target = () => {
      const t = new THREE.WebGLRenderTarget(16, 16, { samples: 4 })
      t.texture.colorSpace = THREE.SRGBColorSpace
      return t
    }
    const rt = target()
    const hero = new THREE.Scene()
    const skyTexture = (stops) => {
      const cv = document.createElement('canvas')
      cv.width = 4
      cv.height = 256
      const sg = cv.getContext('2d')
      const grd = sg.createLinearGradient(0, 0, 0, 256)
      stops.forEach(([at, col]) => grd.addColorStop(at, col))
      sg.fillStyle = grd
      sg.fillRect(0, 0, 4, 256)
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.SRGBColorSpace
      return t
    }
    // `hero` es la isla flotante (dibujada, build-isle-drawn.py): la filman las secciones (el Faro, los
    // juramentos, el cierre, el escaneo) con sus propias cámaras. El hero de arriba de todo es otra escena,
    // `field` (más abajo). Las dos con la tarde clara de las ilustraciones.
    hero.background = skyTexture([[0, '#8fa9bf'], [0.55, '#ead8b4'], [1, '#e9c58e']])
    hero.fog = new THREE.Fog('#ecdcbc', 12, 46)
    hero.add(new THREE.HemisphereLight('#ffffff', '#d8ccb0', 1.3))
    const sun = new THREE.DirectionalLight('#fff6e8', 0.9)
    sun.position.set(4, 6, 3)
    hero.add(sun)
    // el campo del hero: la tarde de ARC, bruma dorada, cielo frío arriba y luz cálida y pareja
    const field = new THREE.Scene()
    // Se pinta como las imágenes de referencia (ink.js): luz pareja y clara, bruma crema solo a lo lejos.
    field.background = skyTexture([[0, '#9fb6c6'], [0.55, '#f0dcb4'], [1, '#ead2a0']])
    field.fog = new THREE.Fog('#efe3c6', 26, 120)
    field.add(new THREE.HemisphereLight('#ffffff', '#d8ccb0', 1.3))
    const fieldSun = new THREE.DirectionalLight('#fff6e8', 0.9)
    fieldSun.position.set(6, 9, 8)
    field.add(fieldSun)
    const ink = createInk(THREE)
    const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1)
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter
    ramp.needsUpdate = true
    let heroCam = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    let mixer = null
    let clipDur = 1
    let crystal = null
    let grass = null
    let lookAt = null
    let content = null
    const tilt = { x: 0, y: 0 }
    const pivot = new THREE.Vector3()
    const qx = new THREE.Quaternion()
    const qy = new THREE.Quaternion()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const keepQ = new THREE.Quaternion()
    const keepP = new THREE.Vector3()
    const fitHero = () => {
      const { W, H } = k.size()
      const dpr = k.renderer.getPixelRatio()
      rt.setSize(Math.round(W * dpr), Math.round(H * dpr))
      ink.setSize(W * dpr, H * dpr)
      heroCam.aspect = W / H
      heroCam.userData.vo = null // el corrimiento del cuadro se recalcula con el tamaño nuevo
      heroCam.updateProjectionMatrix()
    }
    // La isla flotante dibujada: el centro del archipiélago del mundo y la escena que filman las secciones.
    const draco = new DRACOLoader().setDecoderPath('/proto/kanvas/draco/')
    // Los modelos y las imágenes viajan sellados (sealed.js) y se descifran en memoria. La carga espera solo
    // lo del hero (`manager`); lo de las secciones de más abajo baja de fondo (`later`) mientras se mira.
    const later = new THREE.LoadingManager()
    const gltf = sealedGltfLoader(new GLTFLoader().setDRACOLoader(draco), manager)
    const gltfLater = sealedGltfLoader(new GLTFLoader().setDRACOLoader(draco), later)
    gltfLater.load('/proto/kanvas/isle-drawn.glb', (g) => {
      ink.apply(g.scene)
      world.setCenter(g.scene)
      hero.add(g.scene)
    })
    // El hero: el campo estilo ARC Raiders (design/masters/kanvas/build-field.py), con su cámara horneada.
    gltf.load('/proto/kanvas/hero/field.glb', (g) => {
      let ground = null
      g.scene.traverse((o) => {
        if (!o.isMesh) return
        const old = o.material
        if (o.name === 'backdrop') {
          // el cielo pintado: sin luz ni niebla, tal cual
          o.material = new THREE.MeshBasicMaterial({ map: old.map, fog: false })
        } else if (o.name === 'ground') {
          // el suelo: la textura dibujada (se repite) con las manchas y el sendero por vértice encima
          if (old.map) old.map.anisotropy = 8
          o.material = new THREE.MeshBasicMaterial({ map: old.map, vertexColors: true })
        } else if (!old.map) {
          // el suelo: color plano, como el campo de las ilustraciones
          o.material = new THREE.MeshBasicMaterial({ vertexColors: true })
        }
        if (o.name === 'ground') ground = o
      })
      // la ruina, el auto, la torre y la máquina: textura dibujada + contorno de tinta
      ink.apply(g.scene, { skip: (o) => o.name === 'backdrop' || o.name === 'ground' })
      field.add(g.scene)
      lookAt = g.scene.getObjectByName('Camera_Target') || null
      // El contenido (todo menos la cámara y su punto de mira) va a un grupo propio: es lo que se
      // inclina con el mouse; la cámara del GLB queda afuera.
      content = new THREE.Group()
      for (const child of [...g.scene.children]) {
        if (child.isCamera || child === lookAt || child.getObjectByProperty('isCamera', true)) continue
        content.add(child)
      }
      g.scene.add(content)
      if (ground) {
        // el pasto: la grilla del suelo mide 80 de lado en 150 tramos; el sendero queda limpio
        grass = createGrass(THREE, {
          ground,
          cell: 80 / 150,
          avoid: (x, z) => Math.abs(x - pathX(-z)) < 0.55 || (Math.abs(x - 3.6) < 1.9 && Math.abs(z + 4.4) < 1.3),
        })
        content.add(grass.object)
      }
      // Los dos personajes (GLB de Tripo aligerados en Blender, design/masters/kanvas/3d)
      for (const c of HERO_CHARS) {
        gltf.load(c.src, (cg) => {
          ink.apply(cg.scene)
          cg.scene.scale.setScalar(c.scale)
          cg.scene.position.set(...c.pos)
          cg.scene.rotation.y = c.rotY
          content.add(cg.scene)
        })
      }
      if (g.cameras[0]) heroCam = g.cameras[0]
      if (g.animations.length) {
        mixer = new THREE.AnimationMixer(g.scene)
        for (const clip of g.animations) mixer.clipAction(clip).play()
        clipDur = Math.max(...g.animations.map((c) => c.duration))
      }
      fitHero()
    })
    /** Renderiza la isla sin la inclinación del mouse (las láminas quieta y «video» no la siguen). */
    const neutral = (fn) => {
      if (!content) return fn()
      keepQ.copy(content.quaternion)
      keepP.copy(content.position)
      content.quaternion.identity()
      content.position.set(0, 0, 0)
      fn()
      content.quaternion.copy(keepQ)
      content.position.copy(keepP)
    }

    // --- la cordillera y el relieve del HUD ---------------------------------------------------------
    const ridge = createRidge(THREE)
    const ridgeRt = target()
    const topo = createTopo(THREE)
    const topoRt = target()
    const fitRidge = () => {
      const { W, H } = k.size()
      const dpr = k.renderer.getPixelRatio()
      ridgeRt.setSize(Math.round(W * dpr), Math.round(H * dpr))
      ridge.setSize(W, H)
    }
    fitRidge()
    const relic = createRelic(THREE, { loader: sealedGltfLoader(new GLTFLoader(), later), ink })
    const relicRt = target()

    // --- los guardianes y el Faro ---------------------------------------------------------------------
    // Las cartas se pintan con Canvas 2D cuando llegan las tipografías (llevan nombre y oficio).
    const keeperTex = []
    const sigilTex = []
    r.holdImgs = []
    // los retratos dibujados de los guardianes (12 recortes de una grilla generada): la carta los usa
    // cuando llegan; mientras tanto, el busto en silueta
    const portraits = []
    KEEPERS.forEach((_, i) => {
      sealedImage(`/proto/kanvas/keepers/k${String(i).padStart(2, '0')}.webp`, later)
        .then((im) => {
          portraits[i] = im
          if (fontsDone) paintKeeper(i)
        })
        .catch(() => {}) // sin el retrato queda el busto en silueta
    })
    const paintKeeper = (i) => {
      const fonts = { font: "'Geist Mono', monospace", display: `${DISPLAY.family}, sans-serif` }
      const t = new THREE.CanvasTexture(drawKeeper(i, fonts, portraits[i]))
      // el retrato va tal cual (el plano no pasa a sRGB); la silueta vieja, como estaba
      t.colorSpace = portraits[i] ? THREE.NoColorSpace : THREE.SRGBColorSpace
      t.anisotropy = 4
      keeperTex[i]?.dispose()
      keeperTex[i] = t
    }
    const paintCards = () => {
      const fonts = { font: "'Geist Mono', monospace", display: `${DISPLAY.family}, sans-serif` }
      KEEPERS.forEach((_, i) => {
        paintKeeper(i)
        // las letras de los títulos que se pintan con HOLD: una muestra de pintura por guardián
        r.holdImgs?.push(drawSwatch(i).toDataURL('image/jpeg', 0.75))
      })
      BEACON_CARDS.forEach((label, i) => {
        const t = new THREE.CanvasTexture(drawSigil(i, label, fonts))
        t.colorSpace = THREE.SRGBColorSpace
        sigilTex[i] = t
      })
      r.paintHold?.()
    }
    // la cámara del mundo del Faro (baja con el scroll) y las tres vistas del dorso de sus cartas
    const keepCam = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    const keepRt = target()
    const beaconViews = BEACON_VIEWS.map((v) => {
      const cam = new THREE.PerspectiveCamera(v.fov, 1, 0.1, 100)
      cam.position.set(...v.pos)
      cam.lookAt(...v.at)
      return { cam, rt: target() }
    })
    // el escaneo de la torre (el recuadro del HUD): la isla en grises según la altura, sin cielo
    const scanRt = target()
    const scanCam = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    scanCam.position.set(0.3, 1.6, 11)
    scanCam.lookAt(0.3, 1.2, 0.2)
    const scanMat = new THREE.ShaderMaterial({
      vertexShader: 'varying float vY; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vY = w.y; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'varying float vY; varying vec3 vN; uniform float uT; void main(){ float g = smoothstep(-2.6, 5.0, vY); float rim = pow(1.0 - abs(vN.z), 2.0) * 0.35; float band = smoothstep(0.0, 0.04, abs(fract(vY * 0.5 - uT * 0.25) - 0.5) - 0.46); gl_FragColor = vec4(vec3(g + rim + band * 0.6), 1.0); }',
      uniforms: { uT: { value: 0 } },
    })
    // el haz que baja por la torre cada tanto (el «destello») y las luces que flotan alrededor
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uAmp: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float uT, uAmp; void main(){ float head = fract(uT * 0.22); float y = 1.0 - vUv.y; float d = y - head; float trail = d < 0.0 ? exp(d * 9.0) : 0.0; float core = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5) * 2.0); float glow = exp(-pow(d * 40.0, 2.0)); gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * (trail * 0.6 + glow * 1.4) * core * uAmp, 1.0); }',
    })
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5.6), beamMat)
    beam.position.set(0.3, 2.4, 0.62)
    beam.visible = false
    hero.add(beam)
    const motesGeo = new THREE.BufferGeometry()
    const motePos = new Float32Array(60 * 3)
    const moteSeed = Array.from({ length: 60 }, () => ({ a: Math.random() * 6.28, r: 2 + Math.random() * 4, y: -2 + Math.random() * 7, s: 0.05 + Math.random() * 0.15 }))
    motesGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
    const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: '#ffd28a', size: 0.08, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))
    motes.visible = false
    hero.add(motes)
    // HOLD: `v` es cuánto se ve la película (sube rápido al apretar, baja al soltar); `t` es su reloj,
    // corre mientras se mantiene apretado y vuelve a cero cuando la película se apagó.
    const hold = { down: false, v: 0, t: 0, zone: null }
    r.hold = hold
    const artifacts = createArtifacts(THREE)
    const filmRts = [target(), target(), target()]
    const filmCams = FILM_VIEWS.map((v) => new THREE.PerspectiveCamera(v.fov, 1, 0.1, 100))
    const filmNow = { key: '' }
    // los juramentos: la isla de fondo (otra cámara) y la escena en capas
    const oaths = createOaths(THREE, { loader: sealedGltfLoader(new GLTFLoader(), later), ink })
    const oathWorldRt = target()
    const oathRt = target()
    const oathCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    oathCam.position.set(-12, 2.2, 15)
    oathCam.lookAt(0.3, 1.6, 0)
    oaths.setWorld(oathWorldRt.texture)
    // el mundo (el archipiélago) y el cierre: su lámina del archipiélago, la torre y una pintura
    const world = createWorld(THREE)
    const worldRt = target()
    const filmWorldCam = new THREE.PerspectiveCamera(36, 1, 0.1, 200)
    const endRts = [target(), target(), target()]
    const endCam = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    endCam.position.set(1.4, 1.2, 5.4)
    endCam.lookAt(0.3, 3.0, 0.2)
    const endNow = { stale: true, word: '', face: true, isles: true }
    const endHover = [0, 0, 0] // cuánto se ve el estado «mouse encima» de cada carta (amortiguado)
    const endWordCv = document.createElement('canvas')
    let endWordTex = null
    // con mouse, el anillo de HOLD es el cursor: se aprieta en cualquier parte (salvo links y botones)
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const cur = { x: 0, y: 0, active: false, shown: false }
    const onHoldDown = (e) => {
      if (!cur.active || e.button !== 0 || e.pointerType !== 'mouse') return
      if (e.target.closest?.('a, button, [role="button"]')) return
      hold.down = true
      e.preventDefault()
    }
    const onHoldUp = () => (hold.down = false)
    window.addEventListener('pointerdown', onHoldDown)
    window.addEventListener('pointerup', onHoldUp)
    window.addEventListener('blur', onHoldUp)
    // las letras de los títulos verticales se rellenan con las pinturas de los guardianes al mantener
    r.paintHold = () => {
      const spans = Object.values(r.holdTitles || {}).flatMap((el) => (el ? [...el.querySelectorAll('[data-l]')] : []))
      spans.forEach((sp, i) => (sp.style.backgroundImage = 'url(' + r.holdImgs[(i * 5) % Math.max(1, r.holdImgs.length)] + ')'))
    }

    // --- los planos del canvas ----------------------------------------------------------------------
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    white.needsUpdate = true
    const cardTex = []
    const paperPlane = k.plane(white, [1, 1], 1, { frag: PAPER_FRAG, uniforms: { uTop: { value: 0 }, uMargin: { value: 0 } } })
    paperPlane.u.uTint.value.setStyle(INK, THREE.LinearSRGBColorSpace)
    const cardPlanes = HERO_CARDS.map((src, i) => {
      const pl = k.plane(null, [16, 16], 5 + i)
      // viñetas de cómic; el boceto es un papel pegado con cinta: sin borde ni sombra
      if (i < 2) pl.comic(3, 6)
      sealedImage(src, manager)
        .then((im) => {
          const t = new THREE.Texture(im)
          t.anisotropy = 4
          t.needsUpdate = true
          cardTex.push(t)
          pl.u.uMap.value = t
          pl.u.uMapSize.value.set(im.width, im.height)
        })
        .catch(() => {})
      return pl
    })
    const heroPlane = k.plane(rt.texture, [16, 16], 10)
    heroPlane.u.uPaper.value.setStyle(CREAM, THREE.LinearSRGBColorSpace) // tal cual: igual al papel de la carga
    heroPlane.u.uInkCol.value.setStyle(INK, THREE.LinearSRGBColorSpace)
    const topoPlane = k.plane(topoRt.texture, [16, 16], 12)
    const relicPlane = k.plane(relicRt.texture, [16, 16], 14)
    relicPlane.comic(3, 7)
    relicPlane.u.uEncode.value = 1 // el farol dibujado, en lineal
    // las dos tiras de guardianes (cada una con lugar para 8 cartas que se van reciclando)
    // los dos abanicos de guardianes: 9 lugares por lado (el del centro y 4 arriba y 4 abajo)
    const FAN = 4
    const rosterPlanes = Array.from({ length: (FAN * 2 + 1) * 2 }, () => {
      const pl = k.plane(white, [384, 512], 15)
      pl.comic(2.5, 5)
      return pl
    })
    const rosterBgPlane = k.plane(white, [1, 1], 2)
    rosterBgPlane.u.uTint.value.setStyle("#2b2318", THREE.LinearSRGBColorSpace) // tal cual (el canvas no pasa a sRGB); tinta cálida, no violeta
    rosterBgPlane.u.uTintMix.value = 1
    const fan = { phase: 0, name: "" }
    // el Faro: el mundo de fondo, las tres cartas y el recuadro del escaneo
    const beaconBg = k.plane(keepRt.texture, [16, 16], 3)
    const beaconCards = BEACON_CARDS.map((_, i) => k.plane(white, [384, 512], 16 + i))
    // los planos que muestran renders 3D de la isla dibujada los pasan a sRGB (si no, salen oscuros)
    beaconBg.u.uEncode.value = 1
    const scanPlane = k.plane(scanRt.texture, [16, 16], 35) // por encima de la carta del centro abierta
    const oathPlane = k.plane(oathRt.texture, [16, 16], 32)
    oathPlane.u.uEncode.value = 1 // la isla y los personajes dibujados, en lineal
    // la película de HOLD va sobre el mundo apagado: viñetas con el borde y la sombra en papel
    const filmPlanes = filmRts.map((t, i) => {
      const pl = k.plane(t.texture, [16, 16], 37 + i)
      pl.comic(2, 4)
      pl.u.uInkCol.value.setStyle('#f7efdd', THREE.LinearSRGBColorSpace)
      return pl
    })
    const worldPlane = k.plane(worldRt.texture, [16, 16], 33)
    worldPlane.u.uEncode.value = 1 // el archipiélago dibujado, en lineal
    const endPlanes = [k.plane(endRts[0].texture, [16, 16], 24), k.plane(endRts[1].texture, [16, 16], 25), k.plane(endRts[2].texture, [16, 16], 26)]
    endPlanes.forEach((pl) => pl.comic(3, 7))
    endPlanes[0].u.uEncode.value = endPlanes[1].u.uEncode.value = endPlanes[2].u.uEncode.value = 1 // renders 3D en lineal
    const endWordPlane = k.plane(white, [16, 16], 23)
    const tiltCard = { x: 0, y: 0 }
    const wipePlane = k.plane(white, [1, 1], 40, {
      frag: WIPE_FRAG,
      uniforms: { uT: { value: 0 }, uEdgeC: { value: new THREE.Color(AMBER) } },
    })
    wipePlane.u.uTint.value.set(INK)

    // --- el reloj ---------------------------------------------------------------------------------
    const progress = (scrollY) => {
      const max = (spacerRef.current?.offsetHeight || 1) - window.innerHeight
      return clamp01(scrollY / Math.max(1, max))
    }
    const show = (el, v, y = 0) => {
      if (!el) return
      el.style.opacity = String(v)
      el.style.visibility = v > 0.001 ? 'visible' : 'hidden'
      el.style.transform = `translate3d(0, ${y}px, 0)`
    }
    /** `scale` < 1: el render target a menos resolución (fondos oscurecidos o detrás de otras capas). */
    const fitRt = (tgt, w, h, scale = 1) => {
      const dpr = k.renderer.getPixelRatio() * scale
      const tw = Math.max(16, Math.round((w * dpr) / 8) * 8)
      const th = Math.max(16, Math.round((h * dpr) / 8) * 8)
      if (tgt.width === tw && tgt.height === th) return false
      tgt.setSize(tw, th)
      return true
    }
    const renderTo = (scene, cam, tgt, w, h, scale = 1) => {
      const resized = fitRt(tgt, w, h, scale)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      k.renderer.setRenderTarget(tgt)
      k.renderer.render(scene, cam)
      return resized
    }
    /** La torre escaneada: la isla en grises según la altura, sin cielo, con la cámara girando. */
    const renderScan = (tgt, w, h, now) => {
      scanMat.uniforms.uT.value = now / 1000
      const keepBg = hero.background
      const keepFog = hero.fog
      const keepVis = beam.visible
      hero.background = null
      hero.fog = null
      hero.overrideMaterial = scanMat
      beam.visible = motes.visible = false
      k.renderer.setClearColor(0x000000, 0)
      scanCam.position.x = 0.3 + Math.sin(now * 0.0003) * 10.8 // gira alrededor de la torre
      scanCam.position.z = 0.2 + Math.cos(now * 0.0003) * 10.8
      scanCam.lookAt(0.3, 1.2, 0.2)
      neutral(() => renderTo(hero, scanCam, tgt, w, h))
      hero.overrideMaterial = null
      beam.visible = motes.visible = keepVis
      hero.background = keepBg
      hero.fog = keepFog
      k.renderer.setClearColor(k.clearColor, 1)
    }

    /** Una sección dentro de su carta de entrada / salida (`cardMove`); con HOLD el mundo se apaga. */
    const placeCard = (pl, cm, tgt, holding) => {
      pl.rect(cm.x, cm.y, cm.w, cm.h, cm.rot)
      const sh = CARD_SHAPE(cm.w)
      pl.shape({ top: sh.top * cm.round, bottom: sh.bottom * cm.round })
      pl.comic(3 * cm.round, 7 * cm.round)
      pl.u.uMapSize.value.set(tgt.width, tgt.height)
      pl.u.uAlpha.value = 1
      pl.u.uTint.value.setStyle(holding > 0 ? '#1a140d' : '#5c4a32', THREE.LinearSRGBColorSpace)
      pl.u.uTintMix.value = Math.max(holding * 0.72, cm.tint)
    }
    /** La marca gigante del cierre, dibujada en una textura del tamaño de su lugar. */
    const drawEndWord = (w, h) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      endWordCv.width = Math.max(16, Math.round(w * dpr))
      endWordCv.height = Math.max(16, Math.round(h * dpr))
      const g = endWordCv.getContext('2d')
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const css = (px) => `${DISPLAY.weight} ${px}px ${DISPLAY.family}, system-ui, sans-serif`
      g.font = css(200)
      const fs = Math.min((200 * w) / g.measureText(NAME).width, h * 1.12)
      g.font = css(fs)
      g.fillStyle = INK
      g.textAlign = 'center'
      g.textBaseline = 'alphabetic'
      const m = g.measureText(NAME)
      g.fillText(NAME, w / 2, h / 2 + (m.actualBoundingBoxAscent || fs * 0.7) / 2)
      endWordTex?.dispose()
      endWordTex = new THREE.CanvasTexture(endWordCv)
      endWordPlane.u.uMap.value = endWordTex
      endWordPlane.u.uMapSize.value.set(endWordCv.width, endWordCv.height)
    }

    /**
     * La película de HOLD de una sección (`zone`): elige la tanda por el reloj, acomoda los paneles
     * (DOM) cuando cambia, y dibuja el contenido de cada uno sobre su lugar.
     */
    const runFilm = ({ zone, v, W, H, win, now, phone }) => {
      const reels = FILMS[zone]
      const vis = zone && v > 0.001
      if (r.film) {
        r.film.style.visibility = vis ? 'visible' : 'hidden'
        if (r.frame) r.frame.dataset.hold = v > 0.5 ? '1' : '0'
      }
      if (!vis) {
        filmPlanes.forEach((pl) => pl.rect(0, 0, 0, 0))
        filmNow.key = ''
        return
      }
      const reelI = Math.floor(hold.t / REEL) % reels.length
      const local = hold.t % REEL
      const reel = reels[reelI]
      // el lugar de cada panel (solo cuando cambia la tanda o la pantalla)
      const key = `${zone}${reelI}${W}x${H}`
      if (key !== filmNow.key && r.fp) {
        filmNow.key = key
        reel.forEach((pn, i) => {
          const el = r.fp[i]
          if (!el) return
          const [fx, fy, fw, fh] = phone ? FILM_PHONE[i] : pn.at
          const pw = fw * win.w
          const ph = fh * win.h
          el.style.left = `${win.x + fx * win.w}px`
          el.style.top = `${win.y + fy * win.h}px`
          el.style.width = `${pw}px`
          el.style.height = `${ph}px`
          // el marco: un rectángulo redondeado que se traza (las viñetas del cuaderno, sin puntas cortadas)
          const c = 8
          el.querySelector('svg')?.setAttribute('viewBox', `0 0 ${pw} ${ph}`)
          el.querySelector('path')?.setAttribute('d', `M${c + 1} 1H${pw - c - 1}Q${pw - 1} 1 ${pw - 1} ${c + 1}V${ph - c - 1}Q${pw - 1} ${ph - 1} ${pw - c - 1} ${ph - 1}H${c + 1}Q1 ${ph - 1} 1 ${ph - c - 1}V${c + 1}Q1 1 ${c + 1} 1Z`)
          el.querySelector('[data-k="label"]').textContent = pn.label
          el.querySelector('[data-k="code"]').textContent = pn.code
          el.querySelector('[data-k="foot"]').textContent = pn.foot
        })
      }
      reel.forEach((pn, i) => {
        const el = r.fp?.[i]
        const pl = filmPlanes[i]
        if (!el) return
        // entra escalonado (el marco se dibuja, después el texto y la imagen) y sale al final de la tanda
        const ain = easeOut(clamp01((local - 0.1 - i * 0.14) / 0.5))
        const aout = clamp01((local - (REEL - 0.32)) / 0.28)
        const a = ain * (1 - aout) * v
        el.style.opacity = a > 0.001 ? '1' : '0'
        el.style.setProperty('--a', a.toFixed(3))
        el.style.setProperty('--t', clamp01((a - 0.45) / 0.4).toFixed(3))
        const load = clamp01((local - 0.3 - i * 0.14) / (REEL - 0.9))
        el.style.setProperty('--load', load.toFixed(3))
        const pct = el.querySelector('[data-k="pct"]')
        if (pct) pct.textContent = String(Math.round(load * 100)).padStart(3, '0') + '%'
        const slot = el.querySelector('[data-slot]')
        const sb = slot?.getBoundingClientRect()
        const cv = clamp01((a - 0.3) / 0.55)
        if (!sb || cv < 0.001 || sb.width < 4 || sb.height < 4) return pl.rect(0, 0, 0, 0)
        const rt2 = filmRts[i]
        pl.u.uMap.value = rt2.texture
        if (pn.kind === 'view') {
          const fv = FILM_VIEWS[pn.view]
          const cam = filmCams[pn.view]
          const ang = now * 0.00012 + pn.view * 2.1
          cam.position.set(fv.at[0] + Math.sin(ang) * fv.rad, fv.y, fv.at[2] + Math.cos(ang) * fv.rad)
          cam.lookAt(...fv.at)
          neutral(() => renderTo(hero, cam, rt2, sb.width, sb.height))
        } else if (pn.kind === 'world') {
          const ang = now * 0.00008 + i
          filmWorldCam.position.set(Math.sin(ang) * 30, 14, Math.cos(ang) * 30)
          filmWorldCam.lookAt(0, -1, 0)
          world.showForeground(false)
          renderTo(world.scene, filmWorldCam, rt2, sb.width, sb.height)
          world.showForeground(true)
        } else if (pn.kind === 'art') {
          fitRt(rt2, sb.width, sb.height)
          artifacts.render(k.renderer, pn.art, rt2, now, pn.scan ? 'scan' : 'paint')
        } else if (pn.kind === 'scan') {
          renderScan(rt2, sb.width, sb.height, now)
        } else if (pn.kind === 'topo') {
          topo.update(now)
          renderTo(topo.scene, topo.camera, rt2, sb.width, sb.height)
        } else if (pn.kind === 'relic') {
          relic.update({ now, turn: 0 })
          renderTo(relic.scene, relic.camera, rt2, sb.width, sb.height)
        } else if (pn.kind === 'paint') {
          pl.u.uMap.value = keeperTex[pn.keeper] || white
        }
        if (pn.kind === 'paint') pl.u.uMapSize.value.set(384, 512)
        else pl.u.uMapSize.value.set(rt2.width, rt2.height)
        pl.rect(sb.left, sb.top, sb.width, sb.height)
        // se revela de arriba hacia abajo, como si cargara
        pl.clip(sb.left, sb.top, sb.width, sb.height * easeOut(cv))
        pl.u.uAlpha.value = cv
        pl.u.uZoom.value = lerp(1.08, 1, easeOut(cv))
      })
    }

    k.add({
      onResize: () => {
        fitHero()
        fitRidge()
        endNow.stale = true
        endNow.face = true
        endNow.isles = true
        endNow.word = ''
      },
      update: ({ dt, now, W, H, scrollY, pointer }) => {
        frameNo += 1
        budget.tick(dt * 1000)
        const p = progress(scrollY)
        // pasado el recorrido, la página (canvas, secciones y HUD) sube como una cortina y descubre la
        // marca del footer, que está fija abajo, detrás de todo. No sube 1:1 con el scroll: arranca más
        // lento y termina más rápido (el dueño, sobre la referencia). La franja de columnas va en el
        // flujo, así que se la corre la diferencia para que siga pegada; al final las dos coinciden.
        const raw = Math.max(0, scrollY - ((spacerRef.current?.offsetHeight || 0) - window.innerHeight))
        const travel = Math.max(1, r.footer?.offsetHeight || 1)
        const over = travel * clamp01(raw / travel) ** 1.7
        if (over !== r.over) {
          r.over = over
          const tr = over > 0 ? `translate3d(0, ${-over.toFixed(1)}px, 0)` : ''
          if (canvasRef.current) canvasRef.current.style.transform = tr
          if (r.uiLayer) r.uiLayer.style.transform = tr
          if (r.footer) r.footer.style.transform = raw > 0 ? `translate3d(0, ${(raw - over).toFixed(1)}px, 0)` : ''
        }

        // 1) la carga: el nombre se llena de tinta con lo que va bajando; con todo listo, la escena se
        // dibuja en línea de tinta desde el visor del protagonista y atrás entra el color, como acuarela
        boot.shown += (boot.prog - boot.shown) * (1 - Math.exp(-6 * dt))
        if (loadRef.current) loadRef.current.textContent = String(Math.round(boot.shown * 100)).padStart(3, '0')
        if (r.loadFill) r.loadFill.style.clipPath = `inset(0 ${(100 - boot.shown * 100).toFixed(2)}% 0 0)`
        if (boot.loaded && fontsDone && boot.shown > 0.995 && boot.reveal === 0) {
          boot.reveal = 0.0001
          toStage('ink')
        }
        if (boot.reveal > 0 && boot.reveal < 1) {
          boot.reveal = Math.min(1, boot.reveal + dt / INK_SECS)
          if (boot.reveal >= 1) toStage('done')
        }
        const rv = boot.reveal
        const inkS = rv * INK_SECS
        heroPlane.u.uSketch.value = rv > 0 && rv < 1 ? 1 : 0
        heroPlane.u.uInkT.value = easeOut(clamp01(inkS / 2.4)) * 1.05
        heroPlane.u.uColT.value = easeOut(clamp01((inkS - 1.7) / 2.2)) * 1.08
        // el trazo nace en el visor: a la derecha en pantallas anchas, más al centro en el teléfono
        heroPlane.u.uOrigin.value.set(W / H > 1.15 ? 0.82 : W / H < 0.8 ? 0.58 : 0.66, 0.68)

        // 2) el hero: a pantalla completa → a su viñeta → se da vuelta → la cordillera
        const m = rv >= 1 ? easeInOut(seg(p, T.morph)) : 0
        const f = rv >= 1 ? easeInOut(seg(p, T.flip)) : 0
        const back = f >= 0.5 // ya se ve el otro lado de la lámina
        const dest = r.dest?.getBoundingClientRect()
        let rect = { x: 0, y: 0, w: W, h: H }
        let rot = 0
        const destRot = Number(r.dest?.dataset.rot || 0) * DEG
        if (dest && m > 0) {
          rect = { x: lerp(0, dest.left, m), y: lerp(0, dest.top, m), w: lerp(W, dest.width, m), h: lerp(H, dest.height, m) }
          rot = destRot * m
        }
        if (dest && f > 0) {
          // el giro: el ancho se cierra con el coseno y del otro lado ya es la cordillera, que crece
          const g = easeInOut(clamp01((f - 0.15) / 0.85))
          const full = { x: lerp(dest.left, 0, g), y: lerp(dest.top, 0, g), w: lerp(dest.width, W, g), h: lerp(dest.height, H, g) }
          const cx = full.x + full.w / 2
          const fw = full.w * Math.max(0.002, Math.abs(Math.cos(f * Math.PI)))
          rect = { x: cx - fw / 2, y: full.y, w: fw, h: full.h }
          rot = destRot * (1 - g)
        }
        heroPlane.rect(rect.x, rect.y, rect.w, rect.h, rot)
        heroPlane.u.uMap.value = back ? ridgeRt.texture : rt.texture
        heroPlane.u.uMapSize.value.set(back ? ridgeRt.width : rt.width, back ? ridgeRt.height : rt.height)
        heroPlane.u.uTint.value.set(INK)
        heroPlane.u.uTintMix.value = Math.sin(f * Math.PI) * 0.45 // de canto se oscurece
        heroPlane.u.uEncode.value = back ? 0 : 1
        // la ventana del HUD: lo que sube más allá de la barra se corta en su línea
        const fr = W < 768 ? { pad: 12, bar: 52 } : { pad: 20, bar: 56 }
        const win = { x: fr.pad, y: fr.pad + fr.bar, w: W - fr.pad * 2, h: H - fr.pad * 2 - fr.bar }
        const wm = m * (1 - easeInOut(clamp01((f - 0.4) / 0.6)))
        heroPlane.clip(lerp(0, win.x, wm), lerp(0, win.y, wm), lerp(W, win.w, wm), lerp(H, win.h, wm))
        if (m > 0) {
          const sh = CARD_SHAPE(rect.w / Math.max(0.002, Math.abs(Math.cos(f * Math.PI))))
          const sq = 1 - easeInOut(clamp01((f - 0.3) / 0.7))
          heroPlane.shape({ top: Math.min(sh.top * m * sq, rect.w / 2), bottom: sh.bottom * m * sq })
        } else heroPlane.shape()
        // como viñeta: el borde de tinta se traza al llegar; se borra mientras se da vuelta
        const pk = clamp01((m - 0.55) / 0.45) * (1 - clamp01(f * 3))
        heroPlane.comic(3 * pk, 7 * pk)
        heroPlane.u.uDraw.value = pk
        heroPlane.u.uAlpha.value = boot.reveal > 0 ? 1 : 0

        // la isla: la cámara del GLB avanza con el progreso y todo se inclina hacia el mouse
        if (mixer) mixer.setTime(Math.min(clipDur - 0.001, clamp01(p / T.morph[1]) * clipDur))
        // en pantallas anchas el titular ocupa la izquierda: el cuadro se corre para que los personajes
        // queden a la derecha; en el teléfono (vertical) al revés, para que el protagonista entre entero.
        // Al volverse lámina vuelve al centro (su visor, centrado)
        const vo = (W / H > 1.15 ? 0.17 : W / H < 0.8 ? -0.2 : 0) * (1 - easeInOut(clamp01(p / T.morph[1])))
        if (vo !== heroCam.userData.vo) {
          heroCam.userData.vo = vo
          if (vo !== 0) heroCam.setViewOffset(W, H, -W * vo, 0, W, H)
          else heroCam.clearViewOffset()
        }
        const kt = 1 - Math.exp(-2.6 * dt)
        tilt.x += (pointer.x - tilt.x) * kt
        tilt.y += (pointer.y - tilt.y) * kt
        heroCam.updateMatrixWorld()
        right.setFromMatrixColumn(heroCam.matrixWorld, 0).normalize()
        up.setFromMatrixColumn(heroCam.matrixWorld, 1).normalize()
        if (content) {
          if (lookAt) lookAt.getWorldPosition(pivot)
          else heroCam.getWorldDirection(pivot).multiplyScalar(4).add(heroCam.position)
          // apenas: la referencia gira la cara unos grados, no la escena entera
          qy.setFromAxisAngle(up, tilt.x * 0.07)
          qx.setFromAxisAngle(right, tilt.y * 0.04)
          content.quaternion.copy(qy).multiply(qx)
          content.position.copy(pivot).sub(pivot.clone().applyQuaternion(content.quaternion))
        }
        if (crystal) crystal.position.y = crystal.userData.baseY + Math.sin(now * 0.0015) * 0.06
        grass?.update(now)
        if (boot.reveal > 0 && !back) {
          k.renderer.setRenderTarget(rt)
          k.renderer.render(field, heroCam)
        }

        // la cordillera: q recorre la cámara; se dibuja solo cuando se ve. Pasada la mitad de la
        // transición (todo tapado), queda atrás: debajo ya está la sección de la reliquia.
        const q = seg(p, T.ridge)
        const past = p >= (T.wipe[0] + T.wipe[1]) / 2
        if (past) heroPlane.u.uAlpha.value = 0
        if (f > 0.45 && !past) {
          ridge.update({ q, now, dt, pointer })
          k.renderer.setRenderTarget(ridgeRt)
          k.renderer.render(ridge.scene, ridge.camera)
        }

        // 3) la capa UI: el HUD y las secciones apiladas
        const out = easeOut(seg(p, T.heroOut))
        const inn = clamp01((rv - 0.82) / 0.18)
        show(r.frame, inn, -over)
        // entre el Faro y los juramentos (las dos cartas cruzan un fondo claro) el marco vuelve a claro
        const between = (out, inn) => p > lerp(out[0], out[1], 0.45) && p < lerp(inn[0], inn[1], 0.75)
        const gap = between(T.beaconOut, T.oathsIn) || between(T.oathsOut, T.worldIn) || p > lerp(T.worldOut[0], T.worldOut[1], 0.45)
        const theme = (((m > 0.5 && !back) || past) && p <= (T.rosterBg[0] + T.rosterBg[1]) / 2) || gap ? 'light' : 'dark'
        if (r.frame && theme !== themeNow) {
          themeNow = theme
          r.frame.dataset.theme = theme
        }
        show(r.heroUi, inn * (1 - out), (1 - inn) * 24 - out * 40)
        if (r.heroTitle) r.heroTitle.style.filter = out > 0.01 && out < 0.99 ? `blur(${out * 10}px)` : 'none'
        if (r.scrollHint) r.scrollHint.style.opacity = String(inn * (1 - clamp01(p * 60)))
        const tin = easeOut(seg(p, T.tableIn))
        const tout = easeInOut(seg(p, T.tableOut))
        // en el teléfono va una sola lámina (la del hero): entra en la pantalla, la sección no sube
        show(r.tableUi, tin > 0 ? 1 - tout : 0, (1 - tin) * H * 0.6 - tout * 30)
        if (r.ink) {
          const t = seg(p, T.ink)
          r.ink.style.color = `rgb(${Math.round(lerp(205, 21, t))},${Math.round(lerp(205, 17, t))},${Math.round(lerp(205, 29, t))})`
          r.ink.style.opacity = String(clamp01((m - 0.3) / 0.3))
        }

        // la cordillera: dos textos grandes que flotan, la grilla del HUD y la pantalla del relieve
        const vis = f >= 1 && !past ? 1 : 0
        const wipeT = seg(p, T.wipe)
        const hidden = wipeT > 0.04 && wipeT < 0.96 ? 0 : 1
        const a = span(q, Q.textA) * vis * hidden
        show(r.ridgeA, a, lerp(H * 0.22, -H * 0.18, seg(q, [Q.textA[0], Q.textA[3]])))
        const b = span(q, Q.textB) * vis * hidden
        show(r.ridgeB, b, lerp(H * 0.12, -H * 0.06, seg(q, [Q.textB[0], Q.textB[3]])))

        // la pantalla del relieve (el «video» chico del HUD) sobre su slot
        const ts = r.topo?.getBoundingClientRect()
        if (ts && b > 0.01) {
          topo.update(now)
          renderTo(topo.scene, topo.camera, topoRt, ts.width, ts.height)
          topoPlane.rect(ts.left, ts.top, ts.width, ts.height)
          topoPlane.u.uMapSize.value.set(topoRt.width, topoRt.height)
          topoPlane.u.uAlpha.value = b
        } else topoPlane.rect(0, 0, 0, 0)

        // la transición de rombos: tapa toda la pantalla y debajo cambia la sección
        wipePlane.rect(0, 0, wipeT > 0 && wipeT < 1 ? W : 0, H)
        wipePlane.u.uT.value = wipeT

        // la reliquia: la carta del centro gira con el scroll (y un poco con el mouse); el farol gira
        // adentro, con su llama y sus chispas
        const rp = seg(p, T.relic)
        const rOut = easeInOut(seg(p, T.relicOut)) // la carta se aleja (se achica y se apaga)
        const relicOn = past && rOut < 1 ? 1 : 0
        const relicV = past ? clamp01((wipeT - 0.65) / 0.35) * (1 - clamp01(rOut * 2.5)) : 0 // el texto llega cuando los rombos se abren
        show(r.relicUi, relicV, (1 - relicV) * 24)
        if (r.relicStats) r.relicStats.dataset.on = rp > 0.12 ? '1' : '0'
        if (r.relicNum) r.relicNum.textContent = String(Math.round(RELIC_COUNT * easeOut(clamp01(rp * 4)))).padStart(3, '0')
        const ks = r.relicSlot?.getBoundingClientRect()
        if (ks && relicOn) {
          const kc = 1 - Math.exp(-3 * dt)
          tiltCard.x += (pointer.x - tiltCard.x) * kc
          tiltCard.y += (pointer.y - tiltCard.y) * kc
          const turn = lerp(-0.85, 0.85, easeInOut(rp)) + tiltCard.x * 0.22
          relic.update({ now, turn: -turn * 0.6 })
          renderTo(relic.scene, relic.camera, relicRt, ks.width, ks.height)
          const sc2 = lerp(1, 0.42, rOut)
          const kw = ks.width * sc2
          const kh = ks.height * sc2
          relicPlane.rect(ks.left + (ks.width - kw) / 2, ks.top + (ks.height - kh) / 2 - rOut * H * 0.08, kw, kh, -2.5 * DEG * (1 - rOut))
          relicPlane.shape(CARD_SHAPE(kw))
          relicPlane.u.uTurn.value.set(turn * (1 - rOut), -tiltCard.y * 0.18)
          relicPlane.u.uMapSize.value.set(relicRt.width, relicRt.height)
          relicPlane.u.uAlpha.value = 1 - clamp01((rOut - 0.5) / 0.5)
          if (r.relicDeg) r.relicDeg.textContent = String(Math.round(((turn / DEG) % 360) + 360) % 360).padStart(3, '0')
        } else relicPlane.rect(0, 0, 0, 0)

        // los guardianes: un cuadrado oscuro crece desde el centro y se abren DOS ABANICOS VERTICALES,
        // uno en cada mitad, pegados a la línea del medio: la carta del centro grande y 4 arriba y 4
        // abajo, cada vez más chicas, inclinadas hacia atrás y encimadas. Pasan solos (el izquierdo
        // sube, el derecho baja) hasta cierto punto del scroll; después se frenan, se cierran hacia el
        // centro y las dos cartas que quedan se achican y se van.
        const rbg = easeInOut(seg(p, T.rosterBg))
        const rin = easeOut(seg(p, T.rosterIn))
        const fold = easeInOut(seg(p, T.rosterFold))
        const rout = easeInOut(seg(p, T.rosterOut))
        const inRoster = p > T.rosterBg[0] && p < T.roster[1]
        if (inRoster) {
          // el fondo: de un cuadrado redondeado chico a toda la pantalla (y se va con la salida)
          const bw = lerp(W * 0.3, W, rbg)
          const bh = lerp(H * 0.4, H, rbg)
          rosterBgPlane.rect((W - bw) / 2, (H - bh) / 2, bw, bh)
          rosterBgPlane.shape({ top: lerp(40, 0, rbg), bottom: lerp(40, 0, rbg) })
          rosterBgPlane.u.uAlpha.value = clamp01(rbg * 3) * (1 - clamp01((p - T.beacon[0]) / (T.roster[1] - T.beacon[0])))
        } else rosterBgPlane.rect(0, 0, 0, 0)
        show(r.rosterUi, clamp01((rin - 0.3) / 0.7) * (1 - clamp01(rout * 2)), (1 - rin) * 24)
        const rosterV = rin * (1 - rout)
        if (rosterV > 0.001 && inRoster) {
          const phone = W < 768
          // pasan solos mientras dure el tramo; después quedan donde estén
          if (p < T.rosterAuto[1]) fan.phase += dt * 0.55
          const spread = rin * (1 - fold)
          const ch = Math.min(H * 0.44, (W * (phone ? 0.42 : 0.2) * 4) / 3)
          const cw = (ch * 3) / 4
          const gap = phone ? 6 : 14
          const k0 = Math.floor(fan.phase)
          const fr0 = fan.phase - k0
          for (let s = 0; s < 2; s++) {
            const dir = s === 0 ? -1 : 1 // izquierda: sube; derecha: baja
            const cx = W / 2 + (s === 0 ? -1 : 1) * (cw / 2 + gap) // pegados a la línea del medio
            for (let j = -FAN; j <= FAN; j++) {
              const pl = rosterPlanes[s * (FAN * 2 + 1) + j + FAN]
              const d = j + (s === 0 ? -fr0 : fr0) // posición continua (0 = el centro)
              const ad = Math.abs(d)
              const sc = Math.max(0.3, 1 - 0.17 * ad) * lerp(1, 0.55, rout)
              const w = cw * sc
              const h = ch * sc
              // el corrimiento crece cada vez menos: las de las puntas quedan encimadas
              const off = Math.sign(d) * ch * (0.5 * Math.min(ad, 1) + 0.36 * Math.max(0, ad - 1) - 0.035 * Math.max(0, ad - 1) ** 2)
              const y = H / 2 + off * spread - h / 2
              // la izquierda muestra k0 + j; la derecha, k0 − j + 6: así el centro de cada lado nunca coincide
              const idx = ((((s === 0 ? k0 + j : k0 - j + 6)) % KEEPERS.length) + KEEPERS.length) % KEEPERS.length
              pl.u.uMap.value = keeperTex[idx] || white
              pl.u.uMapSize.value.set(384, 512)
              pl.rect(cx - w / 2, y, w, h)
              pl.shape(KEEPER_SHAPE(w)) // rectángulo: las cartas de personaje no llevan arco
              pl.u.uTurn.value.set((s === 0 ? 1 : -1) * 0.12 * spread, -d * 0.3 * spread)
              pl.clip(win.x, win.y, win.w, win.h)
              pl.mesh.renderOrder = 30 - Math.round(ad * 3)
              const tail = 1 - clamp01((ad - FAN + 0.6) / 0.6) // las de las puntas aparecen y se van
              pl.u.uAlpha.value = clamp01(rosterV * 2) * tail * (ad < 0.5 ? 1 : spread > 0.02 ? 1 : 0)
              pl.u.uTint.value.setStyle('#1a140d', THREE.LinearSRGBColorSpace) // tinta cálida, no violeta
              pl.u.uTintMix.value = Math.min(0.55, ad * 0.14) // las de atrás, más oscuras
            }
            // la ficha del guardián que está al centro del abanico izquierdo
            if (s === 0) {
              const ci = (((Math.round(fan.phase) * -dir + s * 6) % KEEPERS.length) + KEEPERS.length) % KEEPERS.length
              const kp = KEEPERS[ci]
              if (kp.name !== fan.name && r.rosterName) {
                fan.name = kp.name
                r.rosterName.textContent = kp.name
                if (r.rosterRole) r.rosterRole.textContent = `Nº ${String(140 + ci * 37).padStart(4, '0')} · ${kp.role}`
              }
            }
          }
        } else rosterPlanes.forEach((pl) => pl.rect(0, 0, 0, 0))

        // el Faro: el mundo de fondo (la isla, oscura) con tres cartas que se dan vuelta; la del centro
        // es una ventana al mundo y se abre a pantalla completa. Después, el HUD con el escaneo y HOLD.
        const bk = seg(p, T.beacon)
        const bo = seg(p, T.beaconOut) // el mundo del Faro se achica a una carta y se va (lineal: cada etapa tiene su curva)
        let beaconZone = 0
        const bOn = p > T.beacon[0] && bo < 1
        beam.visible = motes.visible = false
        if (bOn) {
          const tb = easeInOut(bk)
          const A = tb < 0.5 ? BEACON_PATH[0] : BEACON_PATH[1]
          const Bp = tb < 0.5 ? BEACON_PATH[1] : BEACON_PATH[2]
          const u = tb < 0.5 ? tb * 2 : (tb - 0.5) * 2
          const kc = 1 - Math.exp(-2.4 * dt)
          tiltCard.x += (pointer.x - tiltCard.x) * kc
          tiltCard.y += (pointer.y - tiltCard.y) * kc
          keepCam.position.set(lerp(A.pos[0], Bp.pos[0], u) + tiltCard.x * 1.1, lerp(A.pos[1], Bp.pos[1], u) - tiltCard.y * 0.6, lerp(A.pos[2], Bp.pos[2], u))
          keepCam.lookAt(lerp(A.at[0], Bp.at[0], u) + tiltCard.x * 0.3, lerp(A.at[1], Bp.at[1], u) - tiltCard.y * 0.2, lerp(A.at[2], Bp.at[2], u))
          // el mundo está vivo: el haz que baja por la torre, el cristal que late, luces que flotan
          beam.visible = motes.visible = true
          beamMat.uniforms.uT.value = now / 1000
          beamMat.uniforms.uAmp.value = 1 + hold.v * 1.4
          if (crystal) crystal.material.emissiveIntensity = 1 + Math.sin(now * 0.004) * 0.5 + hold.v * 1.5
          moteSeed.forEach((m2, i) => {
            const a = m2.a + now * 0.0001 * (1 + m2.s * 4)
            motePos[i * 3] = 0.3 + Math.cos(a) * m2.r
            motePos[i * 3 + 1] = m2.y + Math.sin(now * 0.0006 + i) * 0.3
            motePos[i * 3 + 2] = 0.2 + Math.sin(a) * m2.r
          })
          motesGeo.attributes.position.needsUpdate = true
          const bgV = easeOut(seg(bk, B.bgIn))
          const ex = easeInOut(seg(bk, B.expand))
          // detrás de las cartas el mundo va oscurecido y agrandado: a 60 % de resolución no se nota; cuando la
          // carta del centro se abre a pantalla completa, vuelve a la resolución entera
          neutral(() => renderTo(hero, keepCam, keepRt, W, H, ex > 0.02 ? 1 : 0.6))
          beaconBg.rect(0, 0, W, H)
          beaconBg.u.uMapSize.value.set(keepRt.width, keepRt.height)
          beaconBg.u.uTint.value.setStyle('#2b2318', THREE.LinearSRGBColorSpace)
          beaconBg.u.uTintMix.value = 0.45
          beaconBg.u.uAlpha.value = bgV * (1 - clamp01(bo * 2.5))
          beaconBg.u.uShift.value.set(-tiltCard.x * 0.4, tiltCard.y * 0.3)
          beaconBg.u.uZoom.value = 1.12

          const cIn = easeOut(seg(bk, B.cardsIn))
          beaconCards.forEach((pl, i) => {
            const el = r.bslots?.[i]
            if (!el) return
            const bx = el.getBoundingClientRect()
            const fspan = B.flip[1] - B.flip[0]
            const fl = easeInOut(seg(bk, [B.flip[0] + i * fspan * 0.18, B.flip[1] - (2 - i) * fspan * 0.18]))
            const ang = fl * Math.PI
            const backSide = Math.cos(ang) < 0
            // el dorso: el mundo visto desde otra cámara; el del centro es el mundo mismo (la ventana)
            pl.u.uEncode.value = backSide ? 1 : 0
            if (backSide && i !== 1) {
              neutral(() => renderTo(hero, beaconViews[i].cam, beaconViews[i].rt, bx.width, bx.height))
              pl.u.uMap.value = beaconViews[i].rt.texture
              pl.u.uMapSize.value.set(beaconViews[i].rt.width, beaconViews[i].rt.height)
            } else if (backSide) {
              pl.u.uMap.value = keepRt.texture
              pl.u.uMapSize.value.set(keepRt.width, keepRt.height)
            } else {
              pl.u.uMap.value = sigilTex[i] || white
              pl.u.uMapSize.value.set(384, 512)
            }
            pl.u.uFlip.value = backSide ? 1 : 0
            let rx = bx.left
            let ry = bx.top + (1 - cIn) * H * 0.3
            let rw = bx.width
            let rh = bx.height
            let alpha = cIn
            let rotC = 0
            if (i === 1 && bo > 0) {
              // la salida: de pantalla completa a una carta inclinada, que después sale volando hacia arriba
              const cm = cardMove('out', bo, W, H)
              rx = cm.x
              ry = cm.y
              rw = cm.w
              rh = cm.h
              rotC = cm.rot
              pl.mesh.renderOrder = 30
            } else if (i === 1 && ex > 0) {
              rx = lerp(bx.left, 0, ex)
              ry = lerp(bx.top, 0, ex)
              rw = lerp(bx.width, W, ex)
              rh = lerp(bx.height, H, ex)
              pl.mesh.renderOrder = 30
            } else if (i !== 1) {
              alpha *= 1 - clamp01(ex * 1.6)
              pl.mesh.renderOrder = 16 + i
            }
            pl.rect(rx, ry, rw, rh, rotC)
            const sh = CARD_SHAPE(rw)
            const round = i === 1 ? Math.max(1 - ex, clamp01(bo * 3)) : 1 - ex
            pl.shape({ top: sh.top * round, bottom: sh.bottom * round })
            pl.comic(3 * round, 7 * round)
            // mientras dura HOLD el mundo se apaga (la película va encima); al salir se tiñe de violeta
            pl.u.uTint.value.setStyle(bo > 0 ? '#5c4a32' : '#1a140d', THREE.LinearSRGBColorSpace)
            pl.u.uTintMix.value = i === 1 ? Math.max(hold.v * 0.72, Math.sin(bo * Math.PI) * 0.35) : 0
            pl.u.uTurn.value.set(ang + tiltCard.x * 0.25 * (1 - ex), -tiltCard.y * 0.15 * (1 - ex))
            if (bo > 0) pl.clip()
            else pl.clip(lerp(win.x, 0, ex), lerp(win.y, 0, ex), lerp(win.w, W, ex), lerp(win.h, H, ex))
            pl.u.uAlpha.value = alpha
          })

          // el HUD del Faro, con el escaneo de la torre
          const hv = easeOut(seg(bk, B.hud))
          show(r.beaconUi, hv * (1 - clamp01(bo * 4)), (1 - hv) * 20)
          if (r.beaconData) r.beaconData.style.opacity = String(1 - hold.v)
          const ss = r.scanSlot?.getBoundingClientRect()
          const scanV = hv * (1 - hold.v) * (1 - clamp01(bo * 4))
          if (ss && scanV > 0.01) {
            if (frameNo % 2 === 0 || scanRt.width < 32) renderScan(scanRt, ss.width, ss.height, now) // un cuadro sí, uno no
            scanPlane.rect(ss.left, ss.top, ss.width, ss.height)
            scanPlane.u.uMapSize.value.set(scanRt.width, scanRt.height)
            scanPlane.u.uAlpha.value = scanV
          } else scanPlane.rect(0, 0, 0, 0)

          beaconZone = hv * (1 - clamp01(bo * 4))
        } else {
          beaconBg.rect(0, 0, 0, 0)
          beaconCards.forEach((pl) => pl.rect(0, 0, 0, 0))
          scanPlane.rect(0, 0, 0, 0)
          show(r.beaconUi, 0)
        }

        // los juramentos: una carta sube desde abajo, inclinada, y crece a pantalla completa. Adentro,
        // dos personajes en capas delante de la isla; la cámara se corre con el mouse (2.5D).
        const oi = seg(p, T.oathsIn) // lineal: sube (con su curva) y después crece
        const oo = seg(p, T.oathsOut)
        const oathOn = p > T.oathsIn[0] && oo < 1
        let oathZone = 0
        if (oathOn) {
          beam.visible = motes.visible = true
          beamMat.uniforms.uT.value = now / 1000
          oathCam.position.x = -12 + Math.sin(now * 0.00009) * 0.6
          oathCam.lookAt(0.3, 1.6, 0)
          // la isla de fondo casi no se mueve (y va detrás de la bruma y los personajes): a 70 % de resolución
          // y un cuadro de cada tres
          if (frameNo % 3 === 0 || oathWorldRt.width < 32) neutral(() => renderTo(hero, oathCam, oathWorldRt, W, H, 0.7))
          beam.visible = motes.visible = false
          oaths.update({ now, dt, aspect: W / H, pointer, push: seg(p, T.oaths) })
          renderTo(oaths.scene, oaths.camera, oathRt, W, H)
          const holding = hold.zone === 'oaths' ? hold.v : 0
          placeCard(oathPlane, oo > 0 ? cardMove('out', oo, W, H) : cardMove('in', oi, W, H), oathRt, holding)
          oathZone = clamp01((oi - 0.85) / 0.15) * (1 - clamp01(oo * 4))
          show(r.oathsUi, oathZone, (1 - oathZone) * 20)
          if (r.oathsText) r.oathsText.style.opacity = String(1 - holding)
        } else {
          oathPlane.rect(0, 0, 0, 0)
          show(r.oathsUi, 0)
        }

        // el mundo: el archipiélago desde lo alto del acantilado; entra y sale en su carta
        const wi = seg(p, T.worldIn)
        const wo = seg(p, T.worldOut)
        const worldOn = p > T.worldIn[0] && wo < 1
        let worldZone = 0
        if (worldOn || p > T.endIn[0]) world.update({ now, dt, aspect: W / H, pointer, q: seg(p, T.world) })
        if (worldOn) {
          renderTo(world.scene, world.camera, worldRt, W, H)
          const holding = hold.zone === 'world' ? hold.v : 0
          placeCard(worldPlane, wo > 0 ? cardMove('out', wo, W, H) : cardMove('in', wi, W, H), worldRt, holding)
          worldZone = clamp01((wi - 0.85) / 0.15) * (1 - clamp01(wo * 4))
          show(r.worldUi, worldZone, (1 - worldZone) * 20)
          if (r.worldText) r.worldText.style.opacity = String(1 - holding)
        } else {
          worldPlane.rect(0, 0, 0, 0)
          show(r.worldUi, 0)
        }

        // el cierre: la marca gigante (en el canvas, así la carta del mundo le pasa por encima) y el
        // collage de tres cartas: el archipiélago de costado (se inclina con el mouse), la torre (quieta)
        // y una pintura que se acerca despacio
        const ei = seg(p, T.endIn)
        if (p > T.endIn[0]) {
          show(r.endUi, clamp01((ei - 0.35) / 0.4), (1 - easeOut(clamp01(ei / 0.8))) * 24)
          const wb = r.endWord?.getBoundingClientRect()
          if (wb) {
            const key = `${Math.round(wb.width)}x${Math.round(wb.height)}`
            if (fontsDone && key !== endNow.word) {
              endNow.word = key
              drawEndWord(wb.width, wb.height)
            }
            const wa = easeOut(clamp01(ei / 0.5))
            endWordPlane.rect(wb.left, wb.top + (1 - wa) * 40, wb.width, wb.height)
            endWordPlane.u.uAlpha.value = wa
          }
          // como la referencia: lo de adentro de cada carta está quieto; la que tiene el mouse encima
          // crece un poco, se endereza y se tiñe de lila (y muestra su rótulo, en el DOM)
          const kh = 1 - Math.exp(-10 * dt)
          endPlanes.forEach((pl, i) => {
            const el = r.eslots?.[i]
            if (!el) return
            const bx = el.getBoundingClientRect()
            const a = easeOut(clamp01((ei - 0.2 - i * 0.12) / 0.5))
            endHover[i] += ((el.dataset.hover === '1' ? 1 : 0) - endHover[i]) * kh
            const hz = easeOut(endHover[i])
            const sc = 1 + hz * 0.06
            const cw3 = bx.width * sc
            const ch3 = bx.height * sc
            pl.rect(bx.left - (cw3 - bx.width) / 2, bx.top - (ch3 - bx.height) / 2 + (1 - a) * H * 0.3, cw3, ch3, Number(el.dataset.rot || 0) * DEG * (1 - hz * 0.7))
            pl.shape(CARD_SHAPE(cw3))
            pl.u.uAlpha.value = a
            pl.u.uTint.value.setStyle('#f3b04f', THREE.LinearSRGBColorSpace) // el hover tiñe de ámbar (antes lila)
            pl.u.uTintMix.value = hz * 0.32
            pl.mesh.renderOrder = 24 + i + (hz > 0.05 ? 3 : 0)
            if (a < 0.001) return
            if (i === 0) {
              if (endNow.isles) {
                world.showForeground(false)
                if (renderTo(world.scene, world.extra, endRts[0], bx.width, bx.height)) renderTo(world.scene, world.extra, endRts[0], bx.width, bx.height)
                world.showForeground(true)
                endNow.isles = !content
              }
              pl.u.uMapSize.value.set(endRts[0].width, endRts[0].height)
            } else if (i === 1) {
              if (endNow.stale) {
                neutral(() => {
                  if (renderTo(hero, endCam, endRts[1], bx.width, bx.height)) renderTo(hero, endCam, endRts[1], bx.width, bx.height)
                })
                endNow.stale = !content
              }
              pl.u.uMapSize.value.set(endRts[1].width, endRts[1].height)
            } else {
              // un primer plano del navegante de los juramentos (se dibuja una vez y se acerca despacio)
              if (endNow.face) {
                neutral(() => renderTo(hero, oathCam, oathWorldRt, W, H, 0.7))
                // con el formato de la carta (apaisado también en el teléfono): el encuadre es el mismo
                const fa = bx.width / bx.height
                oaths.update({ now, dt: 1, aspect: fa, pointer: { x: 0, y: 0 }, push: 1 })
                renderTo(oaths.scene, oaths.camera, endRts[2], 900, 900 / fa)
                endNow.face = !content
              }
              pl.u.uMapSize.value.set(endRts[2].width, endRts[2].height)
              pl.u.uZoom.value = 2.1
              pl.u.uShift.value.set(0.52, 0.34)
            }
          })
        } else {
          show(r.endUi, 0)
          endWordPlane.rect(0, 0, 0, 0)
          endPlanes.forEach((pl) => pl.rect(0, 0, 0, 0))
        }

        // HOLD (el Faro, los juramentos y el mundo): mantener apretado pasa la película; soltar la apaga
        const zone = beaconZone > 0.5 ? 'beacon' : oathZone > 0.5 ? 'oaths' : worldZone > 0.5 ? 'world' : null
        const zoneV = Math.max(beaconZone, oathZone, worldZone)
        if (zone && zone !== hold.zone && hold.v <= 0) hold.zone = zone
        if (zone === hold.zone && zone) hold.v = clamp01(hold.v + (hold.down ? dt / 0.3 : -dt / 0.4))
        else hold.v = clamp01(hold.v - dt / 0.25)
        if (hold.down && zone && zone === hold.zone) hold.t += dt
        else if (hold.v <= 0) hold.t = 0
        runFilm({ zone: hold.v > 0 ? hold.zone : null, v: easeOut(hold.v), W, H, win, now, phone: W < 768 })
        if (r.holdRing) r.holdRing.style.strokeDashoffset = String(hold.down && zone ? 1 - (hold.t % REEL) / REEL : 1)
        for (const [z, el] of Object.entries(r.holdTitles || {})) {
          if (!el) continue
          el.querySelectorAll('[data-l]').forEach((sp, i) => (sp.dataset.on = z === hold.zone && hold.v > 0.5 && hold.t > 0.05 + i * 0.06 ? '1' : '0'))
        }

        // el anillo de HOLD: pegado al cursor (con mouse) o al centro (táctil)
        const follow = finePointer && zoneV > 0.5
        if (r.holdCursor) {
          r.holdCursor.style.opacity = String(zoneV)
          r.holdCursor.style.visibility = zoneV > 0.01 ? 'visible' : 'hidden'
          if (follow) {
            const tx = ((pointer.x + 1) / 2) * W
            const ty = ((pointer.y + 1) / 2) * H
            if (!cur.shown) {
              cur.x = tx
              cur.y = ty
            }
            const kk = 1 - Math.exp(-18 * dt)
            cur.x += (tx - cur.x) * kk
            cur.y += (ty - cur.y) * kk
            r.holdCursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0) translate(-50%, -48px)`
          } else r.holdCursor.style.transform = ''
          if (follow !== cur.active) {
            cur.active = follow
            r.holdCursor.dataset.follow = follow ? '1' : '0'
            document.documentElement.style.cursor = follow ? 'none' : ''
            if (!follow) hold.down = false
          }
          cur.shown = follow
          r.holdCursor.dataset.down = hold.down ? '1' : '0'
        }

        // el altímetro y la barra de progreso del HUD
        if (r.progBar) r.progBar.style.strokeDashoffset = (1 - p).toFixed(4)
        const oathsMid = (T.oathsIn[0] + T.oathsIn[1]) / 2
        const worldMid = (T.worldIn[0] + T.worldIn[1]) / 2
        const endMid = (T.worldOut[0] + T.worldOut[1]) / 2
        const act = p < T.morph[1] * 0.6 ? 'atlas' : p < T.flip[1] ? 'isles' : !past ? 'wayfarers' : p < T.rosterBg[0] ? 'relics' : p <= T.beacon[0] ? 'keepers' : p < oathsMid ? 'beacon' : p < worldMid ? 'oaths' : 'world'
        if (act !== activeNow) {
          activeNow = act
          setActive(act)
        }
        // el HUD cambia en cada sección: cada una prende sus propias líneas (CSS, `data-hud`)
        const hud = act === 'wayfarers' ? (b > 0.5 ? 'ridge-grid' : 'ridge') : p > endMid ? 'end' : act
        if (hud !== hudNow && r.frame) {
          hudNow = hud
          r.frame.dataset.hud = hud
        }
        const sc = rv < 1 ? 'intro' : p < T.morph[1] * 0.6 ? 'hero' : p < T.flip[1] ? 'tableau' : !past ? 'ridge' : p < T.rosterIn[0] ? 'relic' : p <= T.beacon[0] ? 'roster' : p < oathsMid ? 'beacon' : p < worldMid ? 'oaths' : p < endMid ? 'world' : 'end'
        if (sc !== sceneNow) {
          sceneNow = sc
          audio.scene(sc)
          // la primera vez en cada sección pesada se vuelve a medir (desde la resolución que haya)
          if ((sc === 'beacon' || sc === 'oaths' || sc === 'world') && !budgetFor.has(sc)) {
            budgetFor.add(sc)
            budget = newBudget()
          }
        }

        // 4) la hoja rayada detrás de las láminas (solo en pantallas anchas: el teléfono va con una)
        const sheet = rv >= 1 && W >= 768 ? tin * (1 - easeInOut(clamp01(f * 2.5))) : 0
        if (sheet > 0.001) {
          paperPlane.rect(win.x, win.y, win.w, win.h)
          paperPlane.u.uTop.value = 14
          paperPlane.u.uMargin.value = 10
          paperPlane.u.uAlpha.value = sheet
        } else paperPlane.rect(0, 0, 0, 0)

        // 5) las otras láminas: imágenes quietas sobre su slot. Cada una se traza (el borde de tinta da
        // la vuelta) y después le entra el color, escalonadas
        r.slots.forEach((el, i) => {
          const pl = cardPlanes[i]
          if (!el || !pl) return
          const bx = el.getBoundingClientRect()
          pl.rect(bx.left, bx.top, bx.width, bx.height, Number(el.dataset.rot || 0) * DEG)
          pl.shape(i === 2 ? {} : CARD_SHAPE(bx.width))
          pl.clip(win.x, win.y, win.w, win.h)
          const lag = [0, 0.18, 0.3][i]
          const ti = clamp01((tin - lag) / (1 - lag))
          pl.u.uDraw.value = clamp01(ti * 1.6)
          pl.u.uFill.value = clamp01((ti - 0.3) / 0.7)
          // no antes de que se abra la página (si se recarga ya scrolleada, quedaban sobre la carga)
          pl.u.uAlpha.value = pl.u.uMap.value && rv >= 1 ? (ti > 0 ? 1 : 0) * (1 - easeInOut(clamp01(f * 2.5))) : 0
        })
      },
    })

    return () => {
      clearTimeout(fontsTimeout)
      window.removeEventListener('pointerdown', onHoldDown)
      window.removeEventListener('pointerup', onHoldUp)
      window.removeEventListener('blur', onHoldUp)
      document.documentElement.style.cursor = ''
      fontsLink.remove()
      k.dispose()
      ;[rt, ridgeRt, topoRt, relicRt].forEach((t) => t.dispose())
      cardTex.forEach((t) => t.dispose())
      ridge.dispose()
      relic.dispose()
      artifacts.dispose()
      oaths.dispose()
      world.dispose()
      grass?.dispose()
      draco.dispose()
      ink.dispose()
      endWordTex?.dispose()
      ;[...filmRts, ...endRts, oathRt, oathWorldRt, worldRt, keepRt, scanRt].forEach((t) => t.dispose())
      topo.dispose()
      lenis?.start()
    }
  }, [audio])

  // El scroll se libera cuando el hero terminó de abrirse.
  useEffect(() => {
    if (stage !== 'done' || menu) return undefined
    getLenis()?.start()
    return () => getLenis()?.stop()
  }, [stage, menu])

  const go = useCallback((it) => {
    setMenu(false)
    const lenis = getLenis()
    const max = (spacerRef.current?.offsetHeight || 1) - window.innerHeight
    setTimeout(() => lenis?.scrollTo(it.p * max, { duration: 2.2 }), 380)
  }, [])
  const openMenu = () => {
    audio.drawer(true)
    setMenu(true)
  }
  const closeMenu = useCallback(() => {
    audio.drawer(false)
    setMenu(false)
  }, [audio])

  const set = (key) => (el) => (R.current[key] = el)
  const display = { fontFamily: DISPLAY.family, fontWeight: DISPLAY.weight, letterSpacing: DISPLAY.tracking }
  const layer = 'fixed inset-0 h-svh w-full'
  const inset = 'calc(var(--pad) + 28px)'
  const tag = 'flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase'
  const dot = <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />

  return (
    <div className="kv" style={{ color: INK, fontFamily: BODY }}>
      <style>{KANVAS_CSS}</style>
      <div ref={spacerRef} aria-hidden="true" style={{ height: `calc(${SCROLL_SCREENS * SCREEN_SVH}svh + ${100 - SCREEN_SVH}svh)` }} />

      {/* Capa 1: el canvas. */}
      <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none z-[1] ${layer}`} />

      {/* Capa 2: la UI, con las secciones apiladas. */}
      <div ref={set('uiLayer')} className={`pointer-events-none z-10 ${layer}`}>
        {/* carga: el nombre en contorno se llena de tinta con lo que va bajando; con todo listo baja al
            pie mientras la escena se dibuja (el canvas) y se va cuando entra el color */}
        <div ref={set('loadBox')} data-stage={stage} className="kv-load absolute inset-0" style={{ opacity: 0 }}>
          <div className="kv-load-in">
            <p className="kv-load-word relative uppercase" style={display} aria-label={NAME}>
              <span className="kv-load-outline" aria-hidden="true">
                {NAME}
              </span>
              <span ref={set('loadFill')} className="kv-load-fill absolute inset-0" aria-hidden="true" style={{ clipPath: 'inset(0 100% 0 0)' }}>
                {NAME}
              </span>
            </p>
            <p className="kv-load-note text-[11px] tracking-[0.18em] uppercase" style={{ fontFamily: LABEL }}>
              <span className="kv-load-count">
                Inking the atlas <span ref={loadRef} className="tabular-nums">000</span>%
              </span>
              <span className="kv-load-leaf">Field notebook · leaf 01 / 08</span>
            </p>
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-[10svh] flex flex-col items-center gap-3"
          style={{ opacity: stage === 'load' ? 1 : 0, transition: 'opacity .5s', visibility: stage === 'load' ? 'visible' : 'hidden' }}
        >
          <button
            type="button"
            onClick={() => audio.set(!audioOn)}
            aria-label={audioOn ? 'Music off' : 'Music on'}
            className="kv-btn pointer-events-auto relative flex h-12 cursor-pointer items-center gap-3 px-4 text-[11px] tracking-[0.16em] uppercase"
            style={{ fontFamily: LABEL }}
          >
            <AudioWave on={audioOn} icon />
            {audioOn ? 'Music on' : 'Tap for music'}
          </button>
        </div>

        {/* Sección: hero. El titular enorme arriba; la bitácora abajo a la derecha. */}
        <section ref={set('heroUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute" style={{ left: inset, right: inset, top: 'calc(var(--pad) + var(--bar) + 2svh)' }}>
            <p className={`mb-2 ${tag}`} style={{ fontFamily: LABEL }}>
              {dot}
              Leaf 01 // The outer isles
            </p>
            <h1 ref={set('heroTitle')} className="uppercase" style={{ ...display, fontSize: 'min(27svh, 25vw)', lineHeight: 0.84, textShadow: '0 4px 60px rgba(31,24,16,.3)' }}>
              <span className="block">Beyond</span>
              <span className="block">the last</span>
              <span className="block">
                map<span style={{ color: AMBER }}>.</span>
              </span>
            </h1>
          </div>
          <div
            className="absolute right-[calc(var(--pad)+16px)] w-[min(34ch,calc(100vw-var(--pad)*2-32px))] md:right-[calc(var(--pad)+44px)] md:w-[36ch]"
            style={{ bottom: 'calc(var(--pad) + 52px)', textShadow: '0 1px 16px rgba(31,24,16,.4)' }}
          >
            <p className="flex items-center gap-3 border-t border-white/40 pt-3 text-[11px] tracking-[0.16em] uppercase" style={{ fontFamily: LABEL }}>
              <span style={{ color: AMBER }}>Log 01</span>
              <span className="opacity-70">44°12′N · 12°06′E</span>
            </p>
            <p className="mt-3 text-[16px] leading-[1.4] md:text-[17px]">
              Vesper is an illustrated world told one leaf at a time — two wayfarers, one last lantern, and a map that keeps redrawing itself.
            </p>
            <RollLink text="Begin the crossing" onClick={() => go(NAV[1])} className="mt-4 text-[12px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL, '--rl-to': AMBER }}>
              <span className="mr-2" style={{ color: AMBER }}>
                ▸
              </span>
            </RollLink>
          </div>
          <div ref={set('scrollHint')} className="absolute left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] tracking-[0.16em] uppercase md:flex" style={{ bottom: 'calc(var(--pad) + 18px)', fontFamily: LABEL }}>
            Scroll
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1.5l5 5 5-5" />
            </svg>
          </div>
        </section>

        {/* Sección: las tres láminas, con el titular grande. La ventana del HUD la recorta. */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(calc(var(--pad) + var(--bar)) var(--pad) var(--pad) var(--pad))' }}>
          <section
            ref={set('tableUi')}
            className="absolute inset-0"
            style={{ opacity: 0, visibility: 'hidden', paddingLeft: inset, paddingRight: 'calc(var(--pad) + 48px)', paddingTop: 'calc(var(--pad) + var(--bar) + 4svh)' }}
          >
            {/* Una página de storyboard: el titular arriba a la izquierda; debajo, la viñeta del personaje
                (quieta) con el boceto pegado abajo, y el hero, que llega a la viñeta del medio mostrando el
                visor; a la derecha, la viñeta alta del «reel». Los textos van en cajas de narración, montadas
                sobre el borde de cada viñeta. Todo medido en svh: ninguna se corta abajo. */}
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-8">
                <div className="relative">
                  {/* en el teléfono y la tablet el número de página va arriba del titular */}
                  <p className={`mb-3 lg:absolute lg:top-[0.6em] lg:left-0 lg:mb-0 ${tag}`} style={{ fontFamily: LABEL }}>
                    Pg. 02
                  </p>
                  <h2
                    ref={set('ink')}
                    className="uppercase [--tfs:9.6vw] lg:[--tfs:min(7.2svh,4.6vw)]"
                    style={{ ...display, fontSize: 'var(--tfs)', lineHeight: 0.88, color: 'rgb(205,205,205)', textIndent: 'min(12vw, 160px)' }}
                  >
                    Every map was drawn by someone who left.
                  </h2>
                </div>
                <div className="mt-[6svh] grid gap-10 lg:mt-[11svh] lg:grid-cols-8 lg:gap-8">
                  {/* en el teléfono y la tablet va solo la del hero: apiladas, la del medio caía fuera de pantalla */}
                  <figure className="relative hidden lg:col-span-3 lg:block">
                    <div ref={(el) => (R.current.slots[0] = el)} data-rot="0" className="relative aspect-[16/10] w-full lg:w-[min(100%,34svh)]">
                      <p className="kv-cap absolute -bottom-[3.2em] -left-2 w-[min(30ch,110%)]">
                        <span className="kv-cap-k" style={{ fontFamily: LABEL }}>
                          01 · The wayfarers
                        </span>
                        Two of them left the coast with one map and no road.
                      </p>
                    </div>
                    {/* el boceto, pegado con cinta: la misma escena en línea de tinta (el canvas lo dibuja) */}
                    <div className="relative mt-[9svh] ml-4 w-[min(56%,19svh)] [@media(max-height:760px)]:hidden">
                      <div ref={(el) => (R.current.slots[2] = el)} data-rot="-3" className="aspect-[452/500] w-full" />
                      <div className="pointer-events-none absolute inset-0 -rotate-3" aria-hidden="true">
                        <span className="kv-tape" />
                        <span className="absolute bottom-[1.6%] left-[6%] text-[10px] tracking-[0.14em] uppercase opacity-70" style={{ fontFamily: LABEL }}>
                          Rough · Kade, leaf 02
                        </span>
                      </div>
                    </div>
                  </figure>
                  <figure className="mx-auto w-[min(78vw,48svh)] md:w-[min(64vw,38svh)] lg:col-span-4 lg:col-start-5 lg:mx-0 lg:mt-[6svh] lg:w-auto">
                    <div ref={set('dest')} data-rot="0" className="relative aspect-[4/5] w-full lg:w-[min(100%,34svh)]">
                      <p className="kv-cap absolute -right-2 bottom-[18%] w-[min(26ch,88%)] lg:-right-5">
                        <span className="kv-cap-k" style={{ fontFamily: LABEL }}>
                          02 · Kade
                        </span>
                        Third day off the coast. The visor still holds.
                      </p>
                      <span className="kv-chip absolute bottom-3 left-3 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
                        <i />
                        Live<span className="hidden lg:inline"> · move to look</span>
                      </span>
                    </div>
                    <p className="mt-6 hidden items-center gap-2 text-[11px] tracking-[0.14em] uppercase opacity-70 lg:flex" style={{ fontFamily: LABEL }}>
                      <svg width="40" height="20" viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M38 17C26 19 12 13 4 4M4 4l7 1M4 4l2 7" />
                      </svg>
                      The same scene, still running
                    </p>
                  </figure>
                </div>
              </div>
              <figure className="hidden lg:col-span-4 lg:block">
                <div ref={(el) => (R.current.slots[1] = el)} data-rot="0" className="relative aspect-[3/4] w-full lg:ml-auto lg:w-[min(100%,52svh)]">
                  <p className="kv-cap absolute top-4 left-4 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
                    Field reel 04
                  </p>
                  <button
                    type="button"
                    onClick={() => go(NAV.find((n) => n.id === 'world'))}
                    aria-label="Watch the field reel"
                    className="kv-btn pointer-events-auto absolute right-4 bottom-4 flex h-11 cursor-pointer items-center gap-3 px-4 text-[11px] tracking-[0.14em] uppercase"
                    style={{ fontFamily: LABEL }}
                  >
                    <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor" aria-hidden="true">
                      <path d="M1 .8l9.2 5.2L1 11.2z" />
                    </svg>
                    Play reel
                  </button>
                </div>
              </figure>
            </div>
          </section>
        </div>

        {/* Sección: la cordillera (del otro lado de la lámina). Textos grandes que flotan. */}
        <section ref={set('ridgeA')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute" style={{ left: inset, right: 'calc(var(--pad) + 60px)', top: '30svh' }}>
            <p className={`mb-3 ${tag}`} style={{ fontFamily: LABEL }}>
              {dot}
              003
            </p>
            <p className="max-w-[16ch] uppercase" style={{ ...display, fontSize: 'min(11svh, 8.4vw)', lineHeight: 0.88, textIndent: 'min(10vw, 140px)', textShadow: '0 4px 50px rgba(31,24,16,.35)' }}>
              You are a wayfarer: a keeper of the last light in a world that forgot it.
            </p>
          </div>
        </section>
        <section ref={set('ridgeB')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute left-[calc(var(--pad)+28px)] right-[calc(var(--pad)+28px)] md:left-[34%] md:right-[30%]" style={{ top: '24svh' }}>
            <p className={`mb-3 ${tag}`} style={{ fontFamily: LABEL }}>
              {dot}
              004
            </p>
            <p className="uppercase" style={{ ...display, fontSize: 'clamp(30px, 5.6vw, 8.4svh)', lineHeight: 0.9, textIndent: 'min(6vw, 90px)', textShadow: '0 4px 40px rgba(31,24,16,.35)' }}>
              What will you carry? The lantern or the map? To light the way — or to hide it?
            </p>
          </div>
          <div className="absolute hidden md:block" style={{ left: '73%', top: '24svh' }}>
            <div ref={set('topo')} className="h-[150px] w-[150px] lg:h-[180px] lg:w-[180px]" />
            <p className="mt-3 text-[11px] leading-[1.5] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              N 44°12′37″
              <br />E 12°06′51″
            </p>
            <p className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              <span className="relative inline-block h-[5px] w-10 bg-white/25">
                <span className="absolute inset-y-0 left-0 w-[60%] bg-white" />
              </span>
              Wind 12 kn
            </p>
          </div>
          <p className={`absolute hidden md:flex ${tag}`} style={{ left: '34%', top: 'calc(80svh + 14px)', fontFamily: LABEL }}>
            {dot}
            Wayfarer sigil
          </p>
        </section>
        {/* Sección: la reliquia. A la izquierda, su ficha (como el inventario de un juego); al
            centro, la carta que gira con el scroll; a la derecha, el número vertical gigante. */}
        <section ref={set('relicUi')} className="absolute inset-0" style={{ opacity: 0, visibility: 'hidden' }}>
          <div ref={set('relicStats')} data-on="0" className="kv-stats absolute hidden md:block" style={{ left: inset, top: 'calc(var(--pad) + var(--bar) + 5svh)', width: 'min(25vw, 330px)' }}>
            <p className={tag} style={{ fontFamily: LABEL }}>
              {dot}
              005 // Relic
            </p>
            <h2 className="mt-3 uppercase" style={{ ...display, fontSize: 'min(8svh, 4.6vw)', lineHeight: 0.88 }}>
              The last
              <br />
              lantern
            </h2>
            <p className="mt-3 text-[15px] leading-snug opacity-80">Lit once, carried by two. It burns as long as someone still remembers the road.</p>
            <dl className="mt-6 text-[12px] tracking-[0.12em] uppercase" style={{ fontFamily: LABEL }}>
              <div className="kv-row">
                <dt>Lumen</dt>
                <dd className="kv-bar" style={{ '--v': 0.87 }}>
                  <i />
                </dd>
                <dd>87</dd>
              </div>
              <div className="kv-row">
                <dt>Oil</dt>
                <dd className="kv-pips">
                  {Array.from({ length: 7 }, (_, i) => (
                    <i key={i} data-full={i < 3 ? '1' : '0'} style={{ '--d': `${i * 60}ms` }} />
                  ))}
                </dd>
                <dd>3/7</dd>
              </div>
              <div className="kv-row">
                <dt>Range</dt>
                <dd className="col-span-2 text-right">1.2 leagues</dd>
              </div>
              <div className="kv-row">
                <dt>Keeper</dt>
                <dd className="col-span-2 text-right">Aurel Vane</dd>
              </div>
              <div className="kv-row">
                <dt>Forged</dt>
                <dd className="col-span-2 text-right">Drowned coast, yr 0</dd>
              </div>
            </dl>
          </div>
          {/* el dial: cuánto giró la carta */}
          <div className="absolute hidden items-center gap-3 md:flex" style={{ left: inset, bottom: 'calc(var(--pad) + 52px)' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="22" cy="22" r="20" strokeOpacity="0.3" />
              <circle cx="22" cy="22" r="20" strokeDasharray="2 5.2" />
              <path d="M22 6v8M22 30v8M6 22h8M30 22h8" stroke={AMBER} strokeWidth="1.5" />
            </svg>
            <p className="text-[11px] leading-[1.5] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              Turn <span ref={set('relicDeg')} className="tabular-nums">000</span>°
              <br />
              <span className="opacity-60">Scroll to turn the relic</span>
            </p>
          </div>
          <div ref={set('relicSlot')} className="absolute top-1/2 left-1/2 aspect-[4/5] w-[min(64vw,44svh)] -translate-x-1/2 -translate-y-[44%] md:w-[min(30vw,54svh)]" />
          <div className="absolute inset-x-0 bottom-[calc(var(--pad)+52px)] text-center md:hidden">
            <p className="uppercase" style={{ ...display, fontSize: '34px', lineHeight: 0.9 }}>
              The last lantern
            </p>
          </div>
          <div className="absolute inset-y-0 hidden items-center gap-3 md:flex" style={{ right: 'calc(var(--pad) + 44px)' }}>
            <p className="text-[11px] tracking-[0.16em] uppercase opacity-70" style={{ fontFamily: LABEL, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Leaves in the atlas ▸
            </p>
            <p ref={set('relicNum')} className="leading-[0.78] tabular-nums" style={{ ...display, fontSize: 'min(34svh, 19vw)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              {RELIC_COUNT}
            </p>
          </div>
        </section>

        {/* Sección: los guardianes. Las dos tiras de cartas van en el canvas, a los costados; acá el
            titular y el texto, al centro. */}
        <section ref={set('rosterUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          {/* cuadrante A1: el titular */}
          <div className="absolute w-[min(28vw,400px)] max-md:w-[calc(100vw-56px)]" style={{ left: inset, top: 'calc(var(--pad) + var(--bar) + 4svh)' }}>
            <p className={tag} style={{ fontFamily: LABEL }}>
              {dot}
              006 // The keepers
            </p>
            <h2 className="mt-3 uppercase max-md:hidden" style={{ ...display, fontSize: 'min(7.6svh, 4.4vw)', lineHeight: 0.88 }}>
              Every keeper carries a different light.
            </h2>
          </div>
          {/* cuadrante A2: el guardián que está al centro del abanico (cambia mientras pasan) */}
          <div className="absolute max-md:hidden" style={{ left: inset, bottom: 'calc(var(--pad) + 52px)' }}>
            <p className={tag} style={{ fontFamily: LABEL }}>
              {dot}
              On watch
            </p>
            <p ref={set('rosterName')} className="mt-2 uppercase" style={{ ...display, fontSize: '40px', lineHeight: 0.9 }}>
              Aurel Vane
            </p>
            <p ref={set('rosterRole')} className="mt-1 text-[12px] tracking-[0.14em] uppercase opacity-70" style={{ fontFamily: LABEL }}>
              Nº 0140 · Lamplighter
            </p>
          </div>
          {/* cuadrante B1: los números */}
          <div className="absolute text-right text-[12px] leading-[1.7] tracking-[0.16em] uppercase max-md:hidden" style={{ right: 'calc(var(--pad) + 48px)', top: 'calc(var(--pad) + var(--bar) + 4svh)', fontFamily: LABEL }}>
            <p className="opacity-60">// Initial roster</p>
            <p>3,000 keepers</p>
            <p>312 painted traits</p>
            <p>12 houses</p>
          </div>
          {/* cuadrante B2: el texto */}
          <p className="absolute w-[min(26vw,360px)] text-[16px] leading-snug opacity-85 max-md:hidden" style={{ right: 'calc(var(--pad) + 48px)', bottom: 'calc(var(--pad) + 52px)' }}>
            Each one is drawn by hand from over three hundred painted traits — cloaks, lanterns, scars and oaths. No two cross the same way.
          </p>
        </section>

        {/* Sección: el Faro. Los lugares de las tres cartas (el canvas dibuja encima). */}
        <div className="absolute inset-0 flex items-center justify-center gap-[3vw]" aria-hidden="true">
          {BEACON_CARDS.map((c, i) => (
            <div key={c} ref={(el) => ((R.current.bslots ||= [])[i] = el)} className="aspect-[3/4] w-[26vw] md:w-[min(19vw,36svh)]" style={{ marginTop: i === 1 ? '-4svh' : '4svh' }} />
          ))}
        </div>
        <section ref={set('beaconUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          {/* el título vertical gigante */}
          <div className="absolute inset-y-0 flex items-center gap-4" style={{ left: 'calc(var(--pad) + 36px)', top: 'calc(var(--pad) + var(--bar))' }}>
            <PaintTitle text={HOLD_TITLES.beacon} ref={(el) => ((R.current.holdTitles ||= {}).beacon = el)} style={{ ...display, fontSize: 'min(14svh, 12vw)' }} />
            <p className="hidden text-[11px] tracking-[0.18em] uppercase md:block" style={{ fontFamily: LABEL, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ■ 007 // Last light ■
            </p>
          </div>
          {/* los datos del lugar y el escaneo de la torre */}
          <div ref={set('beaconData')} className="absolute hidden w-[min(34vw,460px)] md:block" style={{ right: 'calc(var(--pad) + 48px)', top: 'calc(var(--pad) + var(--bar) + 4svh)', transition: 'opacity .3s' }}>
            <p className="text-[12px] leading-[1.6] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              // Beacon data
              <br />
              <span className="opacity-70">N 44°12′37″ · E 12°06′51″</span>
              <br />
              <br />
              12 lantern boats
              <br />3 gates
              <br />
              96 keepers on watch
            </p>
            <div className="relative mt-6 rounded-[6px] border-2 border-white/40 bg-black/20 p-4 backdrop-blur-[2px]">
              <p className={tag} style={{ fontFamily: LABEL }}>
                {dot}
                Tower scan
              </p>
              <div ref={set('scanSlot')} className="kv-dots mt-3 aspect-[4/3] w-full" />
              <p className="mt-3 text-[11px] leading-[1.5] tracking-[0.14em] uppercase opacity-80" style={{ fontFamily: LABEL }}>
                ▸▸ Area scan
                <br />
                S/E 333.990 · L/M 2.609
              </p>
            </div>
          </div>
        </section>

        {/* Sección: los juramentos. El canvas dibuja la escena en capas; acá, el título y el texto. */}
        <section ref={set('oathsUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute inset-y-0 flex items-center gap-4" style={{ left: 'calc(var(--pad) + 36px)', top: 'calc(var(--pad) + var(--bar))' }}>
            <PaintTitle text={HOLD_TITLES.oaths} ref={(el) => ((R.current.holdTitles ||= {}).oaths = el)} style={{ ...display, fontSize: 'min(14svh, 12vw)' }} />
            <p className="hidden text-[11px] tracking-[0.18em] uppercase md:block" style={{ fontFamily: LABEL, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ■ 008 // Sworn ■
            </p>
          </div>
          <div ref={set('oathsText')} style={{ transition: 'opacity .3s' }}>
            <div className="absolute inset-x-0 flex flex-col items-center px-6 text-center" style={{ bottom: 'calc(var(--pad) + 9svh)', textShadow: '0 2px 24px rgba(31,24,16,.55)' }}>
              <p className={tag} style={{ fontFamily: LABEL }}>
                008 {dot} The oaths
              </p>
              <p className="mt-4 max-w-[30ch] text-[20px] leading-[1.3] md:text-[26px]">Two oaths, one road. One carries the light forward; the other keeps the dark from closing behind it.</p>
            </div>
            <div className="absolute hidden text-[11px] leading-[1.6] tracking-[0.14em] uppercase md:block" style={{ left: 'calc(min(17vw, 210px) + 24px)', bottom: 'calc(var(--pad) + 6svh)', fontFamily: LABEL }}>
              <p className="opacity-60">// The oaths</p>
              <p className="mt-3 flex items-center gap-3">
                <span className="inline-block h-[7px] w-[7px] rotate-45" style={{ background: AMBER }} />
                Lamplighters — carry the light
              </p>
              <p className="mt-1 flex items-center gap-3">
                <span className="inline-block h-[7px] w-[7px] rotate-45" style={{ background: '#6fe3d2' }} />
                Tidebound — keep the dark at bay
              </p>
            </div>
          </div>
        </section>

        {/* Sección: el mundo. El canvas dibuja el archipiélago y el acantilado; acá, título y texto. */}
        <section ref={set('worldUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute inset-y-0 flex items-center gap-4" style={{ left: 'calc(var(--pad) + 36px)', top: 'calc(var(--pad) + var(--bar))' }}>
            <PaintTitle text={HOLD_TITLES.world} ref={(el) => ((R.current.holdTitles ||= {}).world = el)} style={{ ...display, fontSize: 'min(14svh, 12vw)' }} />
            <p className="hidden text-[11px] tracking-[0.18em] uppercase md:block" style={{ fontFamily: LABEL, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ■ 009 // Charted ■
            </p>
          </div>
          <div ref={set('worldText')} style={{ transition: 'opacity .3s' }}>
            <div className="absolute inset-x-0 flex flex-col items-center px-6 text-center" style={{ bottom: 'calc(var(--pad) + 9svh)', textShadow: '0 2px 24px rgba(31,24,16,.6)' }}>
              <p className={tag} style={{ fontFamily: LABEL }}>
                009 {dot} The world
              </p>
              <p className="mt-4 max-w-[32ch] text-[20px] leading-[1.3] md:text-[26px]">Nine isles drift above the cloud sea, tied by lantern routes. The atlas says nine. The lanterns say more.</p>
            </div>
            <div className="absolute hidden text-right text-[12px] leading-[1.7] tracking-[0.16em] uppercase md:block" style={{ right: 'calc(var(--pad) + 48px)', top: 'calc(var(--pad) + var(--bar) + 4svh)', fontFamily: LABEL, textShadow: '0 1px 12px rgba(31,24,16,.6)' }}>
              <p className="opacity-60">// Atlas status</p>
              <p>9 isles charted</p>
              <p>31 rumored</p>
              <p>18 lantern boats out</p>
            </div>
          </div>
        </section>

        {/* Sección: el cierre. La marca gigante y las tres cartas las dibuja el canvas sobre estos lugares
            (así la carta del mundo, al irse, les pasa por encima). */}
        <section ref={set('endUi')} className="absolute inset-0" style={{ opacity: 0, visibility: 'hidden', color: INK }}>
          <h2 className="sr-only">{NAME}</h2>
          <div ref={set('endWord')} className="absolute" style={{ left: 'calc(var(--pad) + 40px)', right: 'calc(var(--pad) + 40px)', top: 'calc(var(--pad) + var(--bar) + 4svh)', height: 'min(22vw, 30svh)' }} aria-hidden="true" />
          <div className="absolute inset-0">
            {END_CARDS.map((c, i) => (
              <button
                key={c.go}
                type="button"
                ref={(el) => ((R.current.eslots ||= [])[i] = el)}
                data-rot={['-2', '2', '1'][i]}
                data-hover="0"
                onPointerEnter={(e) => e.pointerType === 'mouse' && (e.currentTarget.dataset.hover = '1')}
                onPointerLeave={(e) => (e.currentTarget.dataset.hover = '0')}
                onClick={() => go(NAV.find((it) => it.id === c.go))}
                aria-label={`Go to ${c.label}`}
                className={`kv-ecard pointer-events-auto absolute cursor-pointer ${
                  [
                    'top-[30svh] left-[7%] aspect-[10/9] w-[58vw] md:top-[30svh] md:left-[31%] md:w-[min(25vw,46svh)]',
                    'top-[34svh] left-[70%] aspect-[9/19] w-[23vw] md:top-[37svh] md:left-[58.5%] md:w-[min(10vw,19svh)]',
                    'top-[54svh] left-[22%] aspect-[19/10] w-[56vw] md:top-[64svh] md:left-[36%] md:w-[min(21vw,40svh)]',
                  ][i]
                }`}
              >
                <span className="kv-etag absolute top-3 left-3 flex items-center gap-2 text-[11px] tracking-[0.14em] text-white uppercase" style={{ fontFamily: LABEL }}>
                  <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
                  {c.label}
                </span>
              </button>
            ))}
          </div>
          <div className="pointer-events-auto absolute" style={{ left: inset, right: inset, bottom: 'calc(var(--pad) + 52px)' }}>
            <p className={tag} style={{ fontFamily: LABEL }}>
              {dot}
              010 // The atlas
            </p>
            <p className="mt-3 max-w-[32ch] text-[16px] leading-snug">Eight leaves are charted. The ninth is still being drawn — by whoever crosses next.</p>
            <button
              type="button"
              onClick={() => go(NAV[0])}
              className="kv-btn mt-5 flex h-11 cursor-pointer items-center gap-2 px-5 text-[12px] tracking-[0.14em] uppercase"
              style={{ fontFamily: LABEL }}
            >
              <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
              Begin the crossing
            </button>
          </div>
          <nav className="pointer-events-auto absolute hidden flex-col items-end gap-2 text-[12px] tracking-[0.12em] uppercase md:flex" style={{ right: 'calc(var(--pad) + 48px)', bottom: 'calc(var(--pad) + 52px)', fontFamily: LABEL }} aria-label="Leaves">
            {NAV.slice(1).map((it) => (
              <RollLink key={it.id} text={it.label} onClick={() => go(it)} className="uppercase" />
            ))}
            <span className="mt-3 opacity-50">© 2026 Vesper Atlas</span>
          </nav>
        </section>

        {/* La película de HOLD: tres paneles que la página acomoda por tanda (el canvas dibuja adentro). */}
        <div ref={set('film')} className="absolute inset-0" style={{ visibility: 'hidden' }} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} ref={(el) => ((R.current.fp ||= [])[i] = el)} className="kv-fp absolute flex flex-col text-white" style={{ opacity: 0, fontFamily: LABEL }}>
              <svg className="kv-fp-frame absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
                <path pathLength="1" />
              </svg>
              <p className="kv-fp-txt relative flex items-center gap-2 px-3 pt-3 text-[11px] tracking-[0.14em] uppercase">
                <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
                <span data-k="label" />
                <span data-k="code" className="ml-auto opacity-60" />
              </p>
              <div data-slot="" className="kv-dots relative mx-3 my-2 min-h-0 flex-1" />
              <div className="kv-fp-txt relative flex items-center gap-3 px-3 pb-3 text-[10px] tracking-[0.12em] uppercase">
                <span data-k="foot" className="min-w-0 flex-1 truncate opacity-80" />
                <i className="kv-fp-bar">
                  <b />
                </i>
                <span data-k="pct" className="tabular-nums opacity-80" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capa 3: el marco del cuaderno. La barra de arriba con su raya de tinta (el avance se dibuja
          encima, en ámbar), el número de hoja abajo y la grilla que aparece en algunas secciones. */}
      <div ref={set('frame')} data-theme="dark" className="kv-frame pointer-events-none fixed inset-0 z-20" style={{ opacity: 0, visibility: 'hidden' }}>
        <div className="absolute" style={{ inset: 'var(--pad)' }}>

          {/* las líneas de cada sección: todas están; el modo (`data-hud` del marco) prende las suyas */}
          <div className="kv-hud absolute inset-0 hidden md:block" aria-hidden="true">
            <i className="kv-l h l-r1" style={{ top: 'calc(24svh - var(--pad) - 24px)' }} />
            <i className="kv-l h l-r2" style={{ top: 'calc(80svh - var(--pad))' }} />
            <i className="kv-l v l-r3" style={{ left: 'calc(34% - 30px)' }} />
            <i className="kv-l v l-r4" style={{ left: 'calc(73% - 30px)' }} />
            <i className="kv-l v l-c1" style={{ left: '27%' }} />
            <i className="kv-l v l-c2" style={{ left: '73%' }} />
            <i className="kv-l v l-qv" style={{ left: '50%' }} />
            <i className="kv-l h l-qh" style={{ top: '50%' }} />
            <i className="kv-l v l-b1" style={{ left: 'min(17vw, 210px)' }} />
            <i className="kv-l h l-b2" style={{ top: 'calc(var(--bar) + 31svh)', left: '58%' }} />
            <i className="kv-l h l-o1" style={{ top: 'calc(100% - 15svh)', left: 'min(17vw, 210px)' }} />
            <i className="kv-l h l-w1" style={{ top: 'calc(100% - 24svh)', left: 'min(17vw, 210px)' }} />
            <i className="kv-l h l-e1" style={{ top: 'calc(var(--bar) + 6svh + min(22vw, 30svh))' }} />
            <span className="kv-cross" style={{ left: '50%', top: '50%' }}>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none" stroke="currentColor">
                <circle cx="19" cy="19" r="12" />
                <path d="M19 0v12M19 26v12M0 19h12M26 19h12" />
              </svg>
            </span>
            {['A1', 'B1', 'A2', 'B2'].map((q, i) => (
              <span
                key={q}
                className="kv-quad"
                style={{ fontFamily: LABEL, left: i % 2 ? 'calc(50% + 12px)' : 'calc(50% - 30px)', top: i < 2 ? 'calc(50% - 22px)' : 'calc(50% + 8px)' }}
              >
                {q}
              </span>
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 md:px-4" style={{ height: 'var(--bar)' }}>
            {/* la raya de la barra, a pulso; el avance del scroll se traza encima en ámbar */}
            <svg className="kv-rule absolute right-2 bottom-[-2px] left-2 h-[5px] w-[calc(100%-16px)] md:right-4 md:left-4 md:w-[calc(100%-32px)]" viewBox="0 0 100 5" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path d="M0 2.6C14 1.6 26 3.4 41 2.4S70 1.5 83 2.9 96 2.2 100 2.5" stroke="var(--line)" strokeWidth="1.4" />
              <path ref={set('progBar')} pathLength="1" d="M0 2.6C14 1.6 26 3.4 41 2.4S70 1.5 83 2.9 96 2.2 100 2.5" stroke="var(--accent)" strokeWidth="2.6" strokeDasharray="1" strokeDashoffset="1" />
            </svg>
            <div className="flex items-center gap-3">
              <button type="button" onClick={openMenu} aria-label="Open menu" className="pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center">
                <Burger />
              </button>
              <span className="hidden uppercase md:inline" style={{ ...display, fontSize: '26px', letterSpacing: '0.08em' }}>
                {NAME}
              </span>
            </div>
            <span className="absolute left-1/2 -translate-x-1/2 uppercase md:hidden" style={{ ...display, fontSize: '23px', letterSpacing: '0.08em' }}>
              {NAME}
            </span>
            {/* los links de las secciones solo desde lg: en tablet (768–1023) se encimaban con la marca */}
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-[11px] font-medium tracking-[0.08em] uppercase lg:flex" style={{ fontFamily: LABEL }} aria-label="Sections">
              {NAV.map((it) => (
                <RollLink key={it.id} text={it.label} active={it.id === active} onClick={() => go(it)} className="uppercase" />
              ))}
            </nav>
            <AudioWave on={audioOn} onClick={() => audio.toggle()} className="md:hidden" />
            <button
              type="button"
              onClick={() => go(END)}
              className="kv-btn pointer-events-auto hidden h-10 cursor-pointer items-center gap-2 px-4 text-[12px] tracking-[0.12em] uppercase md:flex"
              style={{ fontFamily: LABEL }}
            >
              <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
              Get the atlas
            </button>
          </div>

          {/* el número de hoja, como en un cuaderno */}
          <p className="absolute right-3 bottom-2 hidden text-[11px] tracking-[0.18em] uppercase opacity-75 md:block" style={{ fontFamily: LABEL }}>
            Leaf {(NAV.find((n) => n.id === active) || NAV[0]).leaf} / 08
          </p>

          <div className="absolute bottom-1 left-2 hidden md:block">
            <AudioWave on={audioOn} onClick={() => audio.toggle()} label />
          </div>
        </div>
      </div>

      {/* HOLD en el Faro: con mouse, el anillo ES el cursor (lo sigue y se mantiene apretado en
          cualquier parte); en pantallas táctiles es un botón al centro. */}
      <div ref={set('holdCursor')} data-follow="0" data-down="0" className="kv-holdcur pointer-events-none fixed z-40" style={{ opacity: 0, visibility: 'hidden' }}>
        <button
          type="button"
          className="kv-holdbtn pointer-events-auto relative flex h-24 w-24 cursor-pointer touch-none items-center justify-center rounded-full text-[12px] tracking-[0.18em] text-white uppercase select-none"
          style={{ fontFamily: LABEL }}
          aria-label="Hold to light the beacon"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId)
            if (R.current.hold) R.current.hold.down = true
          }}
          onPointerUp={() => R.current.hold && (R.current.hold.down = false)}
          onPointerCancel={() => R.current.hold && (R.current.hold.down = false)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && R.current.hold && (R.current.hold.down = true)}
          onKeyUp={() => R.current.hold && (R.current.hold.down = false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" fill="none" aria-hidden="true">
            <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
            <circle ref={set('holdRing')} cx="50" cy="50" r="46" stroke={AMBER} strokeWidth="2.5" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          </svg>
          ▸ Hold ◂
        </button>
        <p className="mt-3 text-[11px] tracking-[0.16em] whitespace-nowrap text-white uppercase opacity-70" style={{ fontFamily: LABEL }}>
          Press and hold
        </p>
      </div>

      <Footer onGo={go} footerRef={set('footer')} />

      <Menu open={menu} onClose={closeMenu} items={MENU} active={active} onGo={go} footer={<MenuFooter onGo={go} audioOn={audioOn} onAudio={() => audio.toggle()} />} />
    </div>
  )
}

/** Título vertical: letras blancas que, al mantener HOLD, se vuelven de a una pinturas de guardianes. */
function PaintTitle({ text, ref, style }) {
  return (
    <p ref={ref} className="uppercase leading-[0.8]" style={{ ...style, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className="kv-paint-l" data-l="" data-on="0" aria-hidden="true">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </p>
  )
}

function Burger() {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M1 1h22M1 6h14M1 11h22" />
    </svg>
  )
}

/**
 * El footer, como la referencia: no tapa la página, la página lo descubre. La marca gigante y los
 * avisos legales están fijos abajo, detrás de todas las capas (`z-0`, el canvas va en `z-[1]`). Cuando
 * el recorrido termina, la página sube con el scroll (el bucle corre canvas, secciones y HUD) y trae
 * pegada abajo la franja de cuatro columnas, que va en el flujo; después de la franja, un hueco
 * transparente del alto de la marca, por el que se ve. El borde de la franja corta las letras al pasar.
 */
function Footer({ onGo, footerRef }) {
  // teléfono: una columna; tablet (640–1023): dos por fila; desde 1024, las cuatro en fila
  const col =
    'flex min-w-0 flex-col justify-between gap-6 border-white/20 px-6 py-7 max-sm:border-t max-sm:first:border-t-0 sm:max-lg:even:border-l sm:max-lg:[&:nth-child(n+3)]:border-t lg:min-h-[46svh] lg:gap-10 lg:border-l lg:px-9 lg:first:border-l-0'
  const head = 'flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase'
  const big = 'text-[17px] leading-[1.25] tracking-[0.04em] uppercase md:text-[19px]'
  const dot = <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
  const end = { id: 'end', p: 1 }
  const reveal = useRef(null)
  const strip = useRef(null)
  useScrambleIn(strip)
  useScrambleIn(reveal, strip) // la marca está fija: entra cuando entra la franja
  const [revealH, setRevealH] = useState(0)
  useEffect(() => {
    const el = reveal.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setRevealH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <>
      <div ref={reveal} className="fixed inset-x-0 bottom-0 z-0 text-white" style={{ background: '#1a140d', fontFamily: LABEL }}>
        <p aria-hidden="true" className="kv-footword select-none text-center uppercase" style={{ fontFamily: DISPLAY.family, fontWeight: DISPLAY.weight }}>
          {NAME}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 pb-6 text-[11px] tracking-[0.14em] uppercase md:justify-between md:px-9">
          <span className="hidden opacity-50 md:inline" data-scramble="">
            Vesper atlas — leaves 01/08
          </span>
          <nav className="flex flex-wrap justify-center gap-x-10 gap-y-3" aria-label="Legal" data-scramble="" data-delay="200">
            <a href="#privacy" className="py-2 hover:text-[#f3b04f]">
              Privacy policy
            </a>
            <a href="#terms" className="py-2 hover:text-[#f3b04f]">
              Terms of service
            </a>
            <a href="#license" className="py-2 hover:text-[#f3b04f]">
              Atlas license
            </a>
          </nav>
          <span className="opacity-50" data-scramble="" data-delay="400">
            © 2026 Vesper Atlas
          </span>
        </div>
      </div>
      <footer ref={footerRef} className="pointer-events-none relative z-30 text-white" style={{ fontFamily: LABEL }}>
        <div ref={strip} className="pointer-events-auto grid border-y border-white/20 sm:grid-cols-2 lg:grid-cols-4" style={{ background: '#1a140d' }}>
          <div className={col}>
            <span />
            <p className="text-[11px] leading-[1.7] tracking-[0.1em] uppercase opacity-60" data-scramble="" data-delay="0" data-speed="34">
              // Atlas log
              <br />
              New leaves in the archive
              <br />
              <span className="ml-5 inline-block">leaf_09_draft.png</span>
              <br />
              <span className="ml-5 inline-block">beacon_signal_0412.wav</span>
              <br />
              <br />
              The ninth leaf is still being drawn<span className="kv-caret">_</span>
            </p>
          </div>
          <div className={col}>
            <p className={head} data-scramble="" data-delay="120">
              {dot}Discover more
            </p>
            <div className="flex flex-col items-start gap-1" data-scramble="" data-delay="320" data-speed="14">
              {NAV.slice(1).map((it) => (
                <RollLink key={it.id} text={it.label} onClick={() => onGo(it)} className={big} style={{ '--rl-to': AMBER }} />
              ))}
            </div>
          </div>
          <div className={col}>
            <p className={head} data-scramble="" data-delay="240">
              {dot}Join the crossing
            </p>
            <div className="flex flex-col items-start gap-1" data-scramble="" data-delay="440" data-speed="18">
              {['Discord', 'Instagram', 'The Chronicle'].map((t) => (
                <RollLink key={t} text={t} onClick={() => onGo(end)} className={big} style={{ '--rl-to': AMBER }} />
              ))}
            </div>
          </div>
          <div className={col}>
            <p className={head} data-scramble="" data-delay="360">
              {dot}More details
            </p>
            <div data-scramble="" data-delay="560" data-speed="16">
              <p className={`${big} opacity-60`}>Write to the cartographers</p>
              <p className={`${big} break-all`}>hello@vesperatlas.game</p>
              <button
                type="button"
                onClick={() => onGo(NAV[0])}
                className="mt-6 flex h-11 cursor-pointer items-center gap-2 border border-white/60 px-5 text-[12px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors hover:bg-white hover:text-[#1a140d]"
              >
                ▸ Back to the first leaf
              </button>
            </div>
          </div>
        </div>
        {/* el hueco por el que se ve la marca (fija, detrás) */}
        <div aria-hidden="true" style={{ height: revealH }} />
      </footer>
      {/* afuera de la capa de la marca: esa va detrás del canvas y el panel quedaría tapado */}
      <LegalSheet docs={LEGAL} bg="#1a140d" fg="#ffffff" />
    </>
  )
}

function MenuFooter({ onGo, audioOn, onAudio }) {
  const row = 'flex items-center gap-6 border-t border-[#1f1810]/15 px-6 py-4 md:px-10'
  const lab = 'hidden w-24 shrink-0 text-[11px] tracking-[0.14em] uppercase opacity-60 md:block'
  const link = 'text-[13px] tracking-[0.1em] uppercase'
  const style = { fontFamily: LABEL, '--rl-to': AMBER }
  const end = { id: 'chronicle', p: 1 }
  return (
    <div style={{ fontFamily: LABEL }}>
      <div className={row}>
        <p className={lab}>Follow</p>
        <div className="flex flex-wrap items-center gap-6">
          <RollLink text="Instagram" onClick={() => onGo(end)} className={link} style={style} />
          <RollLink text="Discord" onClick={() => onGo(end)} className={link} style={style} />
          <RollLink text="The Chronicle" onClick={() => onGo(end)} className={link} style={style} />
        </div>
      </div>
      <div className={`${row} justify-between text-[11px] tracking-[0.12em] uppercase`}>
        <AudioWave on={audioOn} onClick={onAudio} label />
        <span className="opacity-50">© 2026 Vesper Atlas</span>
      </div>
    </div>
  )
}

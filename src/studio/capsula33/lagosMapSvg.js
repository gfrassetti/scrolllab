/**
 * cāpsula33 — el mapa «Base 7-Lagos» redibujado en vector, a partir de la foto del mapa de
 * papel del local (calcado sobre la foto enderezada, en sus mismas coordenadas: 1272 × 1966).
 * Mismos paneles, lagos, ruta, domo en corte y textos. Se exporta como texto SVG (lo usa la
 * sección y también sirve para compararlo con la foto).
 *
 * `ROUTE_D` es el eje de la ruta doble (de arriba hacia abajo): la sección lo enciende encima.
 */

export const MAP_W = 1272
export const MAP_H = 1966

// Dos paletas: el papel del local y el holograma (la pantalla de la nave). El dibujo es el mismo.
const PAPER_C = {
  steel: '#909ca1',
  dome: '#a4adb1',
  win: '#2e5277',
  arch: '#5f7fa6',
  inset: '#d7dbc8',
  light: '#ffffff',
  shade: '#000000',
  paper: '#3f7e96',
  paperDk: '#356f87',
  sage: '#cfd6bd',
  sageDk: '#bcc6aa',
  sageGray: '#a6b09b',
  cream: '#f3e2b0',
  creamLt: '#f7eed6',
  beige: '#f2d7a2',
  red: '#e2553e',
  redDk: '#b53b2c',
  navy: '#26344d',
  road: '#3c5679',
  purple: '#4b3a55',
  mount: '#7b8794',
  mountDk: '#5f6b78',
  ink: '#28324a',
}
// Holograma: todo en cian, rellenos casi transparentes, líneas que brillan. Los rótulos rojos del
// papel pasan a cajas cian más llenas; el naranja queda para la ruta.
const HOLO_C = {
  steel: 'rgba(95,230,255,0.10)',
  dome: 'rgba(95,230,255,0.08)',
  win: 'rgba(95,230,255,0.35)',
  arch: '#7ff0ff',
  inset: 'rgba(95,230,255,0.06)',
  light: '#7ff0ff',
  shade: '#7ff0ff',
  paper: 'rgba(0,0,0,0)',
  paperDk: 'rgba(0,0,0,0)',
  sage: 'rgba(95,230,255,0.06)',
  sageDk: 'rgba(95,230,255,0.05)',
  sageGray: 'rgba(95,230,255,0.12)',
  cream: '#8cf3ff',
  creamLt: '#d8fbff',
  beige: 'rgba(95,230,255,0.2)',
  red: 'rgba(40,190,230,0.42)',
  redDk: '#5fe6ff',
  navy: '#3fd2f2',
  road: '#2aa9cc',
  purple: 'rgba(0,0,0,0)',
  mount: 'rgba(95,230,255,0.05)',
  mountDk: 'rgba(95,230,255,0.28)',
  ink: '#bff7ff',
}
let C = PAPER_C
let HOLO = false
import { BLOCKS, WORDS } from './lagosMapText'

const MONO = "'Roboto Mono', ui-monospace, monospace"
const DISP = "'Chakra Petch', 'Roboto Mono', sans-serif"

// La red de lagos está dada vuelta respecto del papel original (que tenía el Nahuel Huapi arriba):
// así coincide con el mapa real, norte arriba. Las formas se dibujan en las coordenadas de antes,
// dentro de un grupo espejado en y alrededor de FC; los textos se escriben aparte, derechos.
const FC = 1680

// La ruta (eje) de arriba hacia abajo: sale del lago mayor (Nahuel Huapi, arriba) y baja por los
// siete lagos hasta el Lácar, junto al domo de San Martín de los Andes (abajo). Está medida sobre el
// dibujo ya espejado (con el Lácar arriba): se pasa a las coordenadas del papel y se la da vuelta.
const ROUTE_MIRRORED =
  'M676 134 L700 102 L830 102 L866 140 L866 312 L826 350 L646 350 L630 380 L634 690 L676 750 L765 858 L855 968 L930 1076 L985 1132 L1000 1160 L1000 1330 L950 1384 L918 1418 L918 1448'
const routeFromNahuel = (d) => {
  const pts = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), FC - Number(m[2])])
  return 'M' + pts.reverse().map((p) => p.join(' ')).join(' L')
}
export const ROUTE_D = routeFromNahuel(ROUTE_MIRRORED)

/** Polígono redondeado (esquinas en chaflán), como las regiones del mapa. */
const poly = (pts) => 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z'

// Las funciones leen C al dibujar (la paleta se elige antes de armar el mapa).
const region = (pts, fill = C.sageDk) =>
  HOLO
    ? `<path d="${poly(pts)}" fill="${fill}" stroke="${C.navy}" stroke-opacity="0.35" stroke-width="9" stroke-linejoin="round"/>
  <path d="${poly(pts)}" fill="none" stroke="${C.creamLt}" stroke-width="2.5" stroke-linejoin="round"/>`
    : `
  <path d="${poly(pts)}" fill="${fill}" stroke="${C.navy}" stroke-width="22" stroke-linejoin="round"/>
  <path d="${poly(pts)}" fill="${fill}" stroke="${C.cream}" stroke-width="13" stroke-linejoin="round"/>`

/** Panel claro con sombra violeta corrida (los de la leyenda). */
const panel = (pts, fill = C.sage) => `
  <path d="${poly(pts)}" transform="translate(7 7)" fill="${C.purple}"/>
  <path d="${poly(pts)}" fill="${fill}" stroke="${C.navy}" stroke-width="3" stroke-linejoin="round"/>`

const rawText = (x, y, s, { size = 13, weight = 500, fill = C.ink, anchor = 'start', font = MONO, ls = 0.4, italic = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}"${italic ? ' font-style="italic"' : ''}>${s}</text>`

// Mientras se dibuja la parte espejada, los textos se juntan aparte con la y ya espejada (cada
// bloque de renglones se da vuelta como bloque, así se sigue leyendo de arriba hacia abajo).
let FLIP = false
let FLIP_DX = 0
const FLIP_TEXT = []
// El idioma con el que se arma el mapa (lo fija compose).
let LANG = 'es'
const translateLines = (arr) => {
  if (LANG === 'es') return arr
  const block = BLOCKS[LANG]?.[arr.join('|')]
  if (block) return block
  const rules = WORDS[LANG] || []
  return arr.map((l) => rules.reduce((acc, [re, to]) => acc.replace(re, to), l))
}
const lines = (x, y, arr0, opts = {}) => {
  const arr = translateLines(arr0)
  const lh = opts.lh || 14
  if (!FLIP) return arr.map((s, i) => rawText(x, y + i * lh, s, opts)).join('')
  FLIP_TEXT.push(arr.map((s, i) => rawText(x + FLIP_DX, y + i * lh, s, opts)).join(''))
  return ''
}
const text = (x, y, s, opts = {}) => lines(x, y, [s], opts)
const flipped = (fn) => {
  FLIP = true
  FLIP_TEXT.length = 0
  const shapes = fn()
  FLIP = false
  return { shapes: `<g>${shapes}</g>`, texts: FLIP_TEXT.join('') }
}

const lake = (d, { fill = C.beige, stroke = C.red, sw = 4 } = {}) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
const smallLake = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="${C.sage}" stroke="${C.road}" stroke-width="3"/>`
const redLabel = (x, y, w, h, l1, l2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${C.red}"/>` +
  lines(x + w / 2, y + h / 2 - (l2 ? 2 : -4), l2 ? [l1, l2] : [l1], { size: 10, weight: 700, fill: C.creamLt, anchor: 'middle', ls: 0.6, lh: 12 })
const label = (x, y, arr, size = 9.5) => lines(x, y, arr, { size, weight: 600, fill: C.ink, anchor: 'middle', lh: 11, ls: 0.8 })

// Cada lista de la ruta de evacuación (texto del mapa).
const RUTA = [
  ['01 LAGO LÁCAR', ['Puerto de partida. Superficie', 'estable para navegación y carga', 'inicial.']],
  ['02 LAGO MACHÓNICO', ['Pequeño y tranquilo, es un lago', 'angosto de tránsito rápido.']],
  ['03 LAGO FALKNER', ['Área abierta de exploración con', 'vistas impresionantes.']],
  ['04 LAGO VILLARINO', ['Largo y calmo, acompañado por', 'el camino y el bosque. Es un', 'canal natural de conexión.']],
  ['05 LAGO ESCONDIDO', ['Con aguas tranquilas', 'y rodeado de bosque.']],
  ['06 LAGO CORRENTOSO', ['Famoso por su río, uno de los', 'más cortos del mundo. Flujo', 'permanente entre sistemas.']],
  ['07 LAGO ESPEJO', ['Sus aguas calmas marcan una', 'pausa dentro del recorrido.']],
]

function rutaPanel() {
  let y = 440
  let out = ''
  for (const [title, desc] of RUTA) {
    out += text(62, y, title, { size: 12.5, weight: 700, ls: 0.6 })
    out += lines(90, y + 14, desc, { size: 11.5, weight: 400, lh: 13.5 })
    y += 14 + desc.length * 13.5 + 12
  }
  out += `<line x1="60" y1="${y - 6}" x2="330" y2="${y - 6}" stroke="${C.ink}" stroke-width="1.5"/>`
  out += text(62, y + 14, '★ BONUS: LAGO NAHUEL HUAPI', { size: 12, weight: 700, ls: 0.5 })
  out += lines(90, y + 28, ['Núcleo mayor del sistema. Es el', 'primer lago que se avista desde', 'Villa La Angostura.'], { size: 11.5, weight: 400, lh: 13.5 })
  return out
}

const hatchRule = (x1, x2, y) => {
  let s = ''
  for (let x = x1; x < x2; x += 7) s += `<line x1="${x}" y1="${y + 5}" x2="${x + 4}" y2="${y - 5}" stroke="${C.ink}" stroke-width="1.4"/>`
  return s
}

function domeSection() {
  let s = ''
  // El panel de abajo.
  s += panel(
    [
      [60, 1600],
      [1200, 1600],
      [1240, 1640],
      [1240, 1905],
      [1200, 1945],
      [60, 1945],
      [30, 1915],
      [30, 1630],
    ],
    C.sage,
  )
  // Leyenda.
  s += text(110, 1618, '#1  Lago Lácar', { size: 11.5 })
  s += text(110, 1646, '#2  Casa de cambio', { size: 11.5 })
  s += `<circle cx="104" cy="1670" r="4" fill="${C.creamLt}" stroke="${C.ink}"/>` + lines(118, 1674, ['Multiuniversos', 'de Papel'], { size: 11.5, lh: 14 })
  s += `<path d="M104 1704 l4 7 h-8 z" fill="${C.creamLt}" stroke="${C.ink}"/>` + lines(118, 1712, ['Otros', 'Multiuniversos'], { size: 11.5, lh: 14 })
  s += `<path d="M104 1738 l6 6 l-6 6 l-6 -6 z" fill="${C.red}"/>` + text(118, 1749, 'Capsula33', { size: 11.5 })
  // Base del corte.
  s += `<rect x="95" y="1838" width="1145" height="22" fill="${C.steel}" stroke="${C.navy}" stroke-width="2"/>`
  // La cúpula chica de la izquierda, con su antena.
  s += `<path d="M165 1840 C165 1735 230 1688 292 1688 C340 1688 370 1712 392 1748 L392 1840 Z" fill="${C.dome}" stroke="${C.navy}" stroke-width="2.5"/>`
  for (let i = 0; i < 4; i++) s += `<rect x="${252 + i * 22}" y="1716" width="14" height="22" rx="3" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2"/>`
  s += `<line x1="336" y1="1606" x2="336" y2="1690" stroke="${C.navy}" stroke-width="3"/><line x1="324" y1="1640" x2="348" y2="1640" stroke="${C.navy}" stroke-width="3"/><circle cx="336" cy="1602" r="11" fill="${C.purple}"/>`
  s += `<rect x="314" y="1660" width="10" height="34" rx="5" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2"/><rect x="330" y="1660" width="10" height="34" rx="5" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2"/>`
  // El edificio con su grilla de ventanas.
  s += `<path d="M400 1840 L400 1650 L640 1650 L640 1700 L1005 1700 L1005 1840 Z" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2.5"/>`
  const dark = new Set(['540,1740', '690,1810', '860,1810'])
  for (const y of [1670, 1740, 1810])
    for (let x = 415; x < 1000; x += 57) {
      if (y === 1670 && x > 620) continue
      const k = `${x},${y}`
      s += `<rect x="${x}" y="${y}" width="44" height="46" fill="${dark.has(k) ? C.win : 'none'}" stroke="${C.navy}" stroke-width="2"/>`
    }
  // La gran bóveda.
  s += `<path d="M300 1840 C330 1660 470 1572 705 1572 C935 1572 1070 1690 1118 1905" fill="none" stroke="${C.road}" stroke-width="26" stroke-linecap="round"/>`
  s += `<path d="M300 1840 C330 1660 470 1572 705 1572 C935 1572 1070 1690 1118 1905" fill="none" stroke="${C.arch}" stroke-width="10" stroke-linecap="round"/>`
  // Tanques y la cúpula azul de la derecha.
  s += `<path d="M935 1745 A32 32 0 0 1 999 1745 Z" fill="${C.win}" stroke="${C.navy}" stroke-width="2"/>`
  s += `<rect x="1092" y="1770" width="40" height="120" rx="20" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2.5"/>`
  s += `<rect x="1142" y="1820" width="24" height="70" rx="12" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2.5"/>`
  // Escala.
  s += `<line x1="400" y1="1898" x2="1180" y2="1898" stroke="${C.navy}" stroke-width="1.5"/>`
  for (let i = 1; i <= 11; i++) {
    const x = 400 + (i - 1) * 70
    s +=
      `<line x1="${x}" y1="1892" x2="${x}" y2="1904" stroke="${C.navy}" stroke-width="1.5"/>` +
      text(x, 1922, String(i * 100), { size: 10, anchor: 'middle', fill: C.navy })
  }
  s += text(380, 1880, '01', { size: 10, anchor: 'middle', fill: C.navy }) + text(780, 1658, '02', { size: 10, anchor: 'middle', fill: C.navy })
  return s
}

// El área restringida, abajo a la derecha, como en el papel.
const RS = { k: 1, x: 0, y: 0 }
const RESTRICTED_PTS = [
  [970, 1290],
  [1180, 1290],
  [1228, 1338],
  [1228, 1592],
  [1180, 1640],
  [970, 1640],
  [925, 1595],
  [925, 1335],
]
export const RESTRICTED_D = 'M' + RESTRICTED_PTS.map(([x, y]) => `${(x * RS.k + RS.x).toFixed(1)} ${(y * RS.k + RS.y).toFixed(1)}`).join(' L') + ' Z'
function restricted() {
  return `<g transform="translate(${RS.x} ${RS.y}) scale(${RS.k})">${restrictedInner()}</g>`
}
function restrictedInner() {
  const cx = 1075
  const cy = 1462
  let s = panel(
    [
      [970, 1290],
      [1180, 1290],
      [1228, 1338],
      [1228, 1592],
      [1180, 1640],
      [970, 1640],
      [925, 1595],
      [925, 1335],
    ],
    C.inset,
  )
  for (let r = 40; r <= 160; r += 40) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.navy}" stroke-opacity="0.28" stroke-width="1.2"/>`
  for (let a = 0; a < 180; a += 30) {
    const t = (a * Math.PI) / 180
    s += `<line x1="${cx - Math.cos(t) * 165}" y1="${cy - Math.sin(t) * 165}" x2="${cx + Math.cos(t) * 165}" y2="${cy + Math.sin(t) * 165}" stroke="${C.navy}" stroke-opacity="0.22" stroke-width="1"/>`
  }
  // El contorno de la provincia (esquema).
  s += `<path d="M1048 1372 L1072 1378 L1080 1400 L1102 1412 L1098 1440 L1112 1466 L1100 1490 L1084 1500 L1072 1530 L1046 1546 L1030 1528 L1040 1502 L1028 1476 L1040 1448 L1030 1420 L1044 1400 Z" fill="none" stroke="${C.ink}" stroke-width="2"/>`
  s += `<path d="M1030 1506 L1060 1500 L1066 1530 L1046 1548 L1028 1534 Z" fill="${C.red}" fill-opacity="0.85"/>`
  s += lines(955, 1355, ['ÁREA', 'RESTRINGIDA'], { size: 9.5, weight: 600, lh: 11, ls: 1.2 })
  s += lines(1135, 1530, ['EXPLORACIÓN', 'CLASIFICADA'], { size: 9.5, weight: 600, lh: 11, ls: 1.2 })
  return s
}

function mountains() {
  const hatch = `fill="url(#c33m-hatch)"`
  const shapes = [
    'M330 960 C350 880 410 780 500 720 C560 680 610 650 650 610 L690 560 L720 590 L700 660 L640 720 L560 780 L470 850 L420 930 L380 990 Z',
    'M690 520 C720 470 770 430 800 420 L830 520 L780 560 L720 640 L690 640 Z',
    'M640 1125 C720 1140 800 1120 880 1135 C960 1150 1040 1130 1100 1140 L1105 1300 L880 1300 C820 1285 740 1300 650 1300 Z',
    'M1110 330 C1150 380 1200 430 1250 480 L1250 1110 L1192 1110 L1192 560 L1160 520 L1110 470 Z',
    'M520 0 L640 0 L640 30 C600 40 560 30 520 20 Z',
  ]
  return shapes.map((d) => `<path d="${d}" fill="${C.mount}"/><path d="${d}" ${hatch}/>`).join('')
}

function network() {
  let s = ''
  // Región del lago mayor (abajo, una vez espejado), corrida a la izquierda para dejarle lugar
  // al área restringida.
  FLIP_DX = -50
  s += '<g transform="translate(-50 0)">'
  s += region([
    [700, 122],
    [1062, 122],
    [1108, 168],
    [1108, 335],
    [1058, 388],
    [702, 388],
    [656, 342],
    [656, 168],
  ])
  s += `<path d="M676 300 L1090 300 M676 318 L1090 318 M760 140 L760 300 M845 300 L845 385" stroke="${C.road}" stroke-width="3" fill="none"/>`
  s += lake('M856 160 L1022 160 L1036 176 L1036 250 L1020 266 L862 266 L846 250 L846 176 Z')
  s += redLabel(905, 192, 80, 34, 'LAGO NAHUEL', 'HUAPI')
  s += `<rect x="1040" y="172" width="52" height="62" rx="10" fill="${C.red}" stroke="${C.redDk}" stroke-width="3"/><circle cx="1104" cy="188" r="11" fill="${C.red}" stroke="${C.redDk}" stroke-width="2"/>`
  s += smallLake(698, 228, 40, 72) + label(718, 316, ['LAGO', 'QUEÑI'])
  s += smallLake(784, 158, 40, 86) + label(816, 268, ['LAGO', 'NONTHUÉ'])
  s += smallLake(866, 342, 34, 16) + label(930, 336, ['LAGO', 'PIRÉ'])
  s += '</g>'
  FLIP_DX = 0
  // El cuello hacia el centro.
  s += `<rect x="826" y="388" width="16" height="136" fill="${C.cream}" stroke="${C.navy}" stroke-width="3"/>`
  s += region(
    [
      [950, 388],
      [1062, 388],
      [1062, 525],
      [950, 525],
    ],
    C.sage,
  )
  s += `<rect x="955" y="490" width="12" height="30" fill="${C.navy}"/><rect x="1040" y="490" width="12" height="30" fill="${C.navy}"/>`
  // Región del centro (Meliquina, Hermoso, Traful).
  s += region([
    [800, 524],
    [1124, 524],
    [1160, 560],
    [1160, 1080],
    [1124, 1116],
    [702, 1116],
    [662, 1076],
    [662, 790],
    [760, 640],
  ])
  s += `<path d="M982 548 L982 900 M800 700 L1150 700 M720 880 L1150 880 M842 880 L842 1030 M1100 700 L1100 1100 M920 640 L920 700 M760 760 L980 760" stroke="${C.road}" stroke-width="3.5" fill="none"/>`
  s +=
    `<rect x="694" y="922" width="312" height="148" rx="10" fill="${C.sageGray}" stroke="${C.road}" stroke-width="4"/>` + label(850, 1004, ['LAGO', 'TRAFUL'])
  s += text(850, 1100, 'VILLA TRAFUL', { size: 9.5, weight: 600, anchor: 'middle', ls: 1 })
  for (const x of [780, 820, 860, 900]) s += `<circle cx="${x}" cy="1084" r="4" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2"/>`
  s += `<ellipse cx="1050" cy="590" rx="44" ry="30" fill="${C.sage}" stroke="${C.road}" stroke-width="3"/>` + label(1050, 586, ['LAGO', 'MELIQUINA'])
  s += `<circle cx="1104" cy="636" r="4" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2"/>` + label(1104, 656, ['VILLA', 'MELIQUINA'])
  s += lake('M832 580 C846 568 900 566 912 584 C922 600 910 616 880 616 C850 616 822 600 832 580 Z')
  s += redLabel(826, 580, 78, 28, 'LAGO', 'ESPEJO')
  s += smallLake(800, 652, 56, 26) + label(828, 668, ['LAGO HERMOSO'], 8.5)
  s += lake('M858 790 C880 774 920 780 924 810 C928 846 912 872 884 870 C858 868 844 830 858 790 Z')
  s += redLabel(849, 808, 78, 26, 'LAGO', 'CORRENTOSO')
  s += smallLake(966, 848, 44, 18) + label(988, 882, ['LAGO', 'NUEVO'])
  s += smallLake(1060, 848, 50, 18) + label(1085, 882, ['LAGO FILO', 'HUA HUM'], 8.5)
  // Región de la izquierda (Calcú, Espejo Chico, el lago en L).
  s += region([
    [440, 836],
    [640, 836],
    [640, 1462],
    [440, 1462],
    [400, 1422],
    [400, 1012],
    [440, 972],
  ])
  s += `<rect x="452" y="858" width="48" height="66" rx="10" fill="${C.sageGray}" stroke="${C.road}" stroke-width="3"/>` + label(476, 886, ['LAGUNA', 'CALCÚ'])
  s += smallLake(538, 870, 22, 34) + label(552, 852, ['LAGO ESPEJO', 'CHICO'], 8.5)
  s += lake('M478 918 L560 918 L560 990 L478 990 Z')
  s += redLabel(480, 930, 78, 26, 'LAGO', 'FALKNER')
  s += lake('M432 1092 L512 1092 L512 1226 L640 1226 L640 1330 L436 1330 L416 1310 L416 1112 Z')
  s += redLabel(524, 1262, 86, 30, 'LAGO', 'MACHÓNICO')
  s += label(452, 1004, ['LAGUNA', 'CAMPANA']) + label(452, 1038, ['LAGO', 'ARUNCO']) + label(452, 1072, ['LAGO', 'TOTORAL'])
  // El lazo de abajo (junto al domo).
  s += region([
    [640, 1306],
    [860, 1306],
    [896, 1342],
    [896, 1560],
    [862, 1594],
    [640, 1594],
  ])
  s += lake('M646 1382 L790 1382 L806 1398 L806 1466 L790 1482 L646 1482 Z')
  s += `<rect x="652" y="1494" width="50" height="50" rx="10" fill="${C.red}" stroke="${C.redDk}" stroke-width="3"/>`
  s += redLabel(648, 1400, 70, 28, 'LAGO', 'LÁCAR')
  // Los villarino / escondido, en el tramo diagonal.
  s += lake('M680 770 C702 756 738 762 742 782 C746 804 724 814 698 812 C676 810 668 786 680 770 Z')
  s += redLabel(674, 772, 64, 26, 'LAGO', 'ESCONDIDO')
  s += redLabel(668, 830, 64, 26, 'LAGO', 'VILLARINO')
  // Rutas que entran desde afuera.
  s += `<path d="M372 1144 L540 1144 L560 1120 L600 1120 M372 1154 L540 1154 L564 1130 L600 1130" stroke="${C.creamLt}" stroke-width="3" fill="none"/>`
  s +=
    `<rect x="420" y="1140" width="34" height="18" rx="9" fill="${C.creamLt}" stroke="${C.navy}" stroke-width="2"/>` +
    text(437, 1153, '231', { size: 9.5, weight: 700, anchor: 'middle' })
  s +=
    `<rect x="420" y="1166" width="70" height="16" rx="3" fill="${C.navy}"/>` +
    text(455, 1178, '◂ A CHILE', { size: 9, weight: 700, fill: C.creamLt, anchor: 'middle', ls: 1 })
  s +=
    `<rect x="1106" y="1092" width="78" height="16" rx="3" fill="${C.navy}"/>` +
    text(1145, 1104, 'A BARILOCHE ▾', { size: 9, weight: 700, fill: C.creamLt, anchor: 'middle', ls: 0.8 })
  // Columnas crema que bajan hacia el domo.
  s += `<rect x="752" y="1140" width="18" height="170" fill="${C.cream}" stroke="${C.navy}" stroke-width="3"/>`
  s += `<rect x="1088" y="1090" width="34" height="214" fill="${C.cream}" stroke="${C.navy}" stroke-width="3"/>`
  return s
}

/** La ruta doble (roja y azul), quieta: la sección la enciende encima. */
function routeBase() {
  return `<path d="${ROUTE_D}" fill="none" stroke="${C.navy}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${ROUTE_D}" fill="none" stroke="${C.road}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${ROUTE_D}" fill="none" stroke="${C.creamLt}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${ROUTE_D}" fill="none" stroke="${C.red}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`
}

function header() {
  let s = ''
  // El marco del título.
  s += `<path d="M28 236 L28 196 L506 196 L552 150 L640 150" fill="none" stroke="${C.navy}" stroke-width="3"/>`
  s +=
    `<rect x="46" y="64" width="80" height="22" rx="3" fill="${C.red}" stroke="${C.redDk}" stroke-width="2"/>` +
    text(86, 81, 'BASE', { size: 15, weight: 700, fill: C.creamLt, anchor: 'middle', font: DISP, ls: 2 })
  // «7-LAGØS»: letras crema con la sombra oscura corrida.
  s += `<text x="50" y="168" font-family="${DISP}" font-size="96" font-weight="700" letter-spacing="10" fill="${C.purple}" transform="translate(6 6)">7-LAGØS</text>`
  s += `<text x="50" y="168" font-family="${DISP}" font-size="96" font-weight="700" letter-spacing="10" fill="${C.cream}" stroke="${C.navy}" stroke-width="2">7-LAGØS</text>`
  s += text(505, 218, 'APROXIMACIÓN INTERESTELAR', { size: 9.5, weight: 600, fill: C.creamLt, anchor: 'end', ls: 2.4 })
  return s
}

function legendPanels() {
  let s = ''
  // Ruta de evacuación.
  s += panel([
    [60, 330],
    [345, 330],
    [360, 345],
    [360, 902],
    [330, 932],
    [60, 932],
    [36, 908],
    [36, 354],
  ])
  s += `<circle cx="100" cy="318" r="7" fill="${C.sageDk}" stroke="${C.navy}" stroke-width="2"/><circle cx="272" cy="318" r="7" fill="${C.sageDk}" stroke="${C.navy}" stroke-width="2"/>`
  // El rombo de advertencia.
  s += `<path d="M160 238 L222 238 L242 260 L242 312 L222 334 L160 334 L140 312 L140 260 Z" fill="${C.purple}" stroke="${C.cream}" stroke-width="4"/>`
  s += `<path d="M191 252 L222 286 L191 320 L160 286 Z" fill="none" stroke="${C.cream}" stroke-width="4"/>`
  s += `<line x1="191" y1="272" x2="191" y2="292" stroke="${C.cream}" stroke-width="5" stroke-linecap="round"/><circle cx="191" cy="302" r="3" fill="${C.cream}"/>`
  s += text(62, 388, 'RUTA DE EVACUACIÓN', { size: 18, weight: 700, ls: 1.2 })
  s += hatchRule(60, 330, 410)
  s += rutaPanel()
  // Conexiones internas y 03 domos: más abajo (arriba ahora está la red de lagos).
  s += '<g transform="translate(0 560)">'
  s += `<rect x="390" y="333" width="104" height="278" rx="14" fill="${C.redDk}" transform="translate(6 6)"/><rect x="390" y="333" width="104" height="278" rx="14" fill="${C.red}" stroke="${C.redDk}" stroke-width="3"/>`
  s += lines(442, 362, ['CONEXIONES', 'INTERNAS'], { size: 8.5, weight: 700, fill: C.creamLt, anchor: 'middle', lh: 10, ls: 0.8 })
  const items = [
    [398, ['RUTA', 'PRINCIPAL'], '40'],
    [456, ['RUTAS', 'NACIONALES'], '231'],
    [516, ['RUTAS PROVINC.', 'CON CURVA', 'DE ASFALTO'], '48'],
  ]
  for (const [y, ls, n] of items) {
    s += lines(442, y, ls, { size: 7.5, weight: 600, fill: C.creamLt, anchor: 'middle', lh: 9, ls: 0.6 })
    const by = y + ls.length * 9 + 4
    s +=
      `<line x1="402" y1="${by}" x2="482" y2="${by}" stroke="${C.creamLt}" stroke-width="2"/><rect x="429" y="${by - 7}" width="26" height="14" rx="7" fill="${C.creamLt}"/>` +
      text(442, by + 4, n, { size: 8, weight: 700, fill: C.redDk, anchor: 'middle' })
  }
  s += lines(442, 584, ['CAMINOS', 'DE RIPIO'], { size: 7.5, weight: 600, fill: C.creamLt, anchor: 'middle', lh: 9, ls: 0.6 })
  // 03 domos.
  s += `<path d="M468 600 L500 600 L516 616 L516 646 L500 662 L468 662 L452 646 L452 616 Z" fill="${C.navy}" stroke="${C.cream}" stroke-width="3"/>`
  s +=
    text(484, 636, '03', { size: 22, weight: 700, fill: C.cream, anchor: 'middle', font: DISP }) +
    text(484, 652, 'DOMOS', { size: 7, weight: 700, fill: C.cream, anchor: 'middle', ls: 1 })
  s += '</g>'
  // Sector SMA.
  s += panel([
    [60, 990],
    [372, 990],
    [372, 1500],
    [60, 1500],
    [36, 1476],
    [36, 1014],
  ])
  s += text(100, 1018, 'SECTOR SMA', { size: 26, weight: 600, font: DISP, italic: true, ls: 2 })
  s += text(102, 1036, 'C-33', { size: 12, italic: true }) + text(350, 1036, 'DOMO 1', { size: 12, italic: true, anchor: 'end' })
  s += lines(204, 1058, ['Puerto principal de la estación', 'andina. Punto de recalibración', 'antes de internarse en territorio', 'no cartografiado.'], {
    size: 10.5,
    weight: 600,
    italic: true,
    anchor: 'middle',
    lh: 12.5,
  })
  s += text(74, 1144, 'INMEDIACIONES', { size: 13, weight: 700, ls: 1 })
  const inm = [
    ['LAGO LÁCAR – ESPEJO DE NAVEGACIÓN', ['Superficie líquida de alta', 'reflectividad. Utilizado para', 'orientación y pruebas de aterrizaje', 'antiguo.']],
    ['CERRO CHAPELCO – ANTENA NATURAL', ['Formación elevada que amplifica', 'señales. Mirador de tránsito', 'interdimensional.']],
    ['VOLCÁN LANÍN – REACTOR DORMIDO', ['Núcleo geotérmico de potencia', 'latente. Emite pulsos detectables', 'desde la órbita.']],
    ['ARROYO PARTIDO / QUILA QUINA', ['Ruta de exploración secundaria.', 'Señales estables y arquitectura', 'adaptada al entorno.']],
  ]
  let y = 1170
  for (const [t, d] of inm) {
    s += text(64, y, t, { size: 9.5, weight: 700, ls: 0.3 })
    s += lines(64, y + 13, d, { size: 9.5, weight: 400, lh: 12 })
    y += 13 + d.length * 12 + 26
  }
  s += hatchRule(40, 360, 1530)
  return s
}

function rightEdge() {
  let s = ''
  s += `<rect x="1150" y="146" width="86" height="128" rx="14" fill="${C.redDk}" transform="translate(5 5)"/><rect x="1150" y="146" width="86" height="128" rx="14" fill="${C.red}" stroke="${C.redDk}" stroke-width="3"/>`
  s += `<rect x="1140" y="320" width="96" height="118" rx="14" fill="${C.redDk}" transform="translate(5 5)"/><rect x="1140" y="320" width="96" height="118" rx="14" fill="${C.red}" stroke="${C.redDk}" stroke-width="3"/>`
  s += `<rect x="1162" y="370" width="52" height="22" rx="4" fill="none" stroke="${C.creamLt}" stroke-opacity="0.7" stroke-width="2"/>`
  s +=
    `<g transform="translate(1214 1290) rotate(-90)">` +
    text(0, 0, 'S 40°09′00″ · O 71°21′00″ · SMA', { size: 9, weight: 600, fill: C.creamLt, ls: 1.6 }) +
    `</g>`
  s += `<g transform="translate(1214 760) rotate(-90)">` + text(0, 0, '· · · · · · · · · · · · · · ·', { size: 10, fill: C.creamLt }) + `</g>`
  for (const [x, y] of [
    [44, 1600],
    [1232, 50],
    [1234, 1945],
    [40, 40],
  ])
    s += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${C.creamLt}" stroke-opacity="0.6" stroke-width="2"/>`
  return s
}

/** El mapa entero (sin el `<svg>`): para usar dentro de un `<svg viewBox="0 0 1272 1966">`. */
function compose(palette, holo, lang = 'es') {
  C = palette
  HOLO = holo
  LANG = lang
  const MOUNTAINS = flipped(mountains)
  const NETWORK = flipped(network)
  const out = `
  <defs>
    <pattern id="c33m-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="${C.light}" stroke-opacity="${holo ? 0.1 : 0.06}" stroke-width="1"/>
    </pattern>
    <pattern id="c33m-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="10" stroke="${C.mountDk}" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="${MAP_W}" height="${MAP_H}" fill="${C.paper}"/>
  <rect width="${MAP_W}" height="${MAP_H}" fill="url(#c33m-grid)"/>
  ${MOUNTAINS.shapes}
  ${NETWORK.shapes}
  ${routeBase()}
  ${NETWORK.texts}
  ${header()}
  ${legendPanels()}
  ${restricted()}
  ${domeSection()}
  ${rightEdge()}
  <line x1="636" y1="0" x2="636" y2="${MAP_H}" stroke="${C.light}" stroke-opacity="${holo ? 0.18 : 0.16}" stroke-width="2"/>
  <line x1="638" y1="0" x2="638" y2="${MAP_H}" stroke="${C.shade}" stroke-opacity="${holo ? 0 : 0.12}" stroke-width="2"/>
  <line x1="0" y1="958" x2="${MAP_W}" y2="958" stroke="${C.light}" stroke-opacity="${holo ? 0.18 : 0.12}" stroke-width="2"/>
  <line x1="0" y1="960" x2="${MAP_W}" y2="960" stroke="${C.shade}" stroke-opacity="${holo ? 0 : 0.1}" stroke-width="2"/>
`
  C = PAPER_C
  HOLO = false
  LANG = 'es'
  // En el holograma los rellenos claros del papel (edificio, columnas, cajas) serían bloques
  // macizos: pasan a un cian transparente (el texto conserva su color).
  return holo ? out.replace(/<(rect|path|circle|ellipse)([^>]*?)fill="(#d8fbff|#8cf3ff|#5fe6ff)"/g, '<$1$2fill="rgba(95,230,255,0.13)"') : out
}

const CACHE = {}
/** El mapa entero (sin el `<svg>`): para usar dentro de un `<svg viewBox="0 0 1272 1966">`. */
export const paperSvgFor = (lang = 'es') => (CACHE[`p-${lang}`] ||= compose(PAPER_C, false, lang))
/** El mismo mapa como holograma de la nave (cian, sin papel). */
export const holoSvgFor = (lang = 'es') => (CACHE[`h-${lang}`] ||= compose(HOLO_C, true, lang))
export const MAP_SVG = paperSvgFor('es')
export const HOLO_SVG = holoSvgFor('es')

/**
 * Las escalas, en el orden de la ruta (del lago mayor, arriba, al Lácar, abajo, junto al domo):
 * [nombre, número en el mapa, caja del lago (x, y, ancho, alto), texto].
 */
const STOPS_MIRRORED = [
  ['Lago Lácar', '01', [646, 198, 160, 100], 'Puerto de llegada: la ruta termina en San Martín de los Andes, a orillas del Lácar.'],
  ['Lago Machónico', '02', [416, 350, 224, 238], 'Pequeño y tranquilo: un lago angosto de tránsito rápido.'],
  ['Lago Falkner', '03', [478, 690, 82, 72], 'Área abierta de exploración, con vistas impresionantes.'],
  ['Lago Villarino', '04', [664, 820, 72, 34], 'Largo y calmo, con el camino y el bosque al lado: un canal natural de conexión.'],
  ['Lago Escondido', '05', [668, 866, 82, 58], 'Aguas tranquilas, rodeadas de bosque. Casi no se ve desde la ruta.'],
  ['Lago Correntoso', '06', [846, 806, 82, 100], 'Famoso por su río, uno de los más cortos del mundo: flujo permanente entre sistemas.'],
  ['Lago Espejo', '07', [822, 1062, 98, 52], 'Sus aguas calmas marcan una pausa dentro del recorrido.'],
  ['Lago Nahuel Huapi', 'Bonus', [796, 1414, 190, 106], 'El lago mayor del sistema: acá empieza la ruta, en Villa La Angostura.'],
]
export const STOPS = STOPS_MIRRORED.map(([name, num, [x, y, w, h], note]) => [name, num, [x, FC - (y + h), w, h], note]).reverse()

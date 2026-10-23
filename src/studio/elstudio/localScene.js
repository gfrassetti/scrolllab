import * as THREE from 'three'
import { DESIGN_PIECES, IMG } from './designPieces'

/**
 * La escena del hero: un local (café / showroom) en maqueta, visto como una casa de muñecas (dos
 * muros de fondo y el piso, sin los muros que taparían la vista).
 *
 * Se ve en tres estados, todos de la misma escena (por eso coinciden al milímetro):
 *   boceto    un filtro de dibujo sobre el render: contornos en grafito que tiemblan y se cortan
 *             como un trazo a mano, sombras en rayado / rayado cruzado según la luz y manchas de
 *             carbonilla en lo más oscuro. Se «pinta» con `setReveal` (desde el centro hacia afuera).
 *   maqueta   el 3D de papel blanco con las aristas en tinta (`setSketch(0)`).
 *   decorado  pieza por pieza toma su material, entran los objetos y se encienden las lámparas
 *             (`setDecor`).
 *
 * Todo en metros: x a la derecha (a lo largo del muro del fondo), z hacia el frente, y hacia arriba;
 * el rincón del fondo a la izquierda es el origen.
 *
 *   const scene = createLocalScene({ canvas })
 *   scene.setFrame(x, y, w, h)  el rectángulo de la pantalla donde va el cuadro
 *   scene.setReveal(0..1)       cuánto del boceto está dibujado
 *   scene.setSketch(0..1)       cuánto se ve el boceto (va encima del 3D)
 *   scene.setRise(0..1)         el local sube desde el dibujo
 *   scene.setPhoto(0..1)        la foto del local (createLocalScene({ photo })) se pinta encima
 *   scene.setDecor(0..1)        cuánto está decorado
 *   scene.setCamera(0..1)       la cámara se acerca al final
 *   scene.render()              dibuja si algo cambió
 */

export const ROOM = { w: 9, d: 6, h: 3.3, t: 0.2 }
/** El cuadro: la cámara encuadra este aspecto, entero, dentro del rectángulo que le den. */
export const FRAME_ASPECT = 21 / 9 // el alzado (boceto, vacío y foto) es 21:9

const INK = new THREE.Color('#161513')
const PAPER = new THREE.Color('#f6f4ee')
const FOV = 30
const TARGET = new THREE.Vector3(4.6, 0.55, 3.25)
const START = { polar: 0.98, azimuth: 0.64, dist: 18.6 }

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const backOut = (t) => {
  const s = 1.5
  const u = t - 1
  return 1 + (s + 1) * u * u * u + s * u * u
}

/* ── Piezas ─────────────────────────────────────────────────────────── */

const box = (w, h, d, x, y, z) => {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y + h / 2, z)
  return g
}
const cyl = (r, h, x, y, z, seg = 40, rTop = r) => {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg)
  g.translate(x, y + h / 2, z)
  return g
}
const ball = (r, x, y, z) => new THREE.SphereGeometry(r, 28, 18).translate(x, y, z)

/**
 * Las piezas del local. `object: true` son los objetos que entran al decorar (jarrones, libros,
 * almohadones…): no están en el boceto. El resto está desde el principio y al decorar toma color.
 */
function buildPieces() {
  const { w, d, h, t } = ROOM
  const list = []
  const add = (id, parts, object = false) => list.push({ id, parts, object })

  // La caja: base, piso, muro del fondo y muro izquierdo con la vidriera.
  // La base termina justo debajo del piso: si las dos caras quedan en el mismo plano, se pelean (rayas).
  add('base', [{ geo: box(w + t, 0.2, d + t, w / 2 - t / 2, -0.22, d / 2 - t / 2), mat: 'base' }])
  add('floor', [{ geo: box(w, 0.02, d, w / 2, -0.02, d / 2), mat: 'floor' }])
  const win = { z0: 1.1, z1: 4.9, y0: 0.45, y1: 2.85 }
  add('walls', [
    { geo: box(w + t, h, t, w / 2 - t / 2, 0, -t / 2), mat: 'wall' },
    { geo: box(t, h, win.z0, -t / 2, 0, win.z0 / 2), mat: 'wall' },
    { geo: box(t, h, d - win.z1, -t / 2, 0, (win.z1 + d) / 2), mat: 'wall' },
    { geo: box(t, win.y0, win.z1 - win.z0, -t / 2, 0, (win.z0 + win.z1) / 2), mat: 'wall' },
    { geo: box(t, h - win.y1, win.z1 - win.z0, -t / 2, win.y1, (win.z0 + win.z1) / 2), mat: 'wall' },
  ])
  const frame = []
  for (const z of [win.z0, win.z0 + 1.27, win.z0 + 2.53, win.z1]) frame.push({ geo: box(0.07, win.y1 - win.y0, 0.06, -t / 2, win.y0, z), mat: 'metal' })
  frame.push({ geo: box(0.07, 0.06, win.z1 - win.z0, -t / 2, win.y0, (win.z0 + win.z1) / 2), mat: 'metal' })
  frame.push({ geo: box(0.07, 0.06, win.z1 - win.z0, -t / 2, win.y1 - 0.06, (win.z0 + win.z1) / 2), mat: 'metal' })
  frame.push({ geo: box(0.07, 0.04, win.z1 - win.z0, -t / 2, 2.2, (win.z0 + win.z1) / 2), mat: 'metal' })
  frame.push({ geo: box(0.01, win.y1 - win.y0, win.z1 - win.z0, -t / 2, win.y0, (win.z0 + win.z1) / 2), mat: 'glass', edges: false })
  add('window', frame)

  // El nicho en arco del fondo y su consola.
  const arch = new THREE.Shape()
  const aw = 1.7
  const ah = 2.7
  arch.moveTo(-aw / 2, 0)
  arch.lineTo(-aw / 2, ah - aw / 2)
  arch.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true)
  arch.lineTo(aw / 2, 0)
  arch.closePath()
  const archGeo = new THREE.ExtrudeGeometry(arch, { depth: 0.04, bevelEnabled: false, curveSegments: 32 })
  archGeo.translate(2.9, 0.15, 0.001)
  add('arch', [{ geo: archGeo, mat: 'accent' }])
  add('console', [{ geo: box(1.3, 0.72, 0.36, 2.9, 0, 0.24), mat: 'wood' }])
  add(
    'console-objects',
    [
      { geo: cyl(0.12, 0.42, 2.55, 0.72, 0.24, 24, 0.07), mat: 'cream' },
      { geo: ball(0.11, 3.2, 0.83, 0.24), mat: 'clay' },
    ],
    true,
  )

  // Alfombra redonda.
  add('rug', [{ geo: cyl(1.35, 0.015, 4.7, 0, 3.7, 64), mat: 'rug' }])

  // La barra con el extremo redondeado y la mesada oscura apenas volada.
  const bar = { x0: 5.9, x1: 8.7, z0: 0.15, z1: 0.9, h: 1.05 }
  const bz = (bar.z0 + bar.z1) / 2
  const bd = bar.z1 - bar.z0
  add('bar', [
    { geo: box(bar.x1 - bar.x0, bar.h - 0.05, bd, (bar.x0 + bar.x1) / 2, 0, bz), mat: 'stone' },
    { geo: cyl(bd / 2, bar.h - 0.05, bar.x0, 0, bz), mat: 'stone' },
    { geo: box(bar.x1 - bar.x0 + 0.04, 0.05, bd + 0.08, (bar.x0 + bar.x1) / 2, bar.h - 0.05, bz + 0.02), mat: 'top' },
    { geo: cyl(bd / 2 + 0.04, 0.05, bar.x0, bar.h - 0.05, bz + 0.02), mat: 'top' },
  ])
  const stools = []
  for (const x of [6.4, 7.25, 8.1]) {
    stools.push({ geo: cyl(0.025, 0.72, x, 0, 1.38, 16), mat: 'metal' })
    stools.push({ geo: cyl(0.2, 0.02, x, 0, 1.38, 32), mat: 'metal' })
    stools.push({ geo: cyl(0.19, 0.06, x, 0.72, 1.38, 32), mat: 'wood' })
  }
  add('stools', stools)

  // Estantes sobre la barra y lo que va encima.
  add(
    'shelves',
    [1.65, 2.1, 2.55].map((y) => ({ geo: box(2.5, 0.04, 0.26, 7.3, y, 0.13), mat: 'wood' })),
  )
  const objects = [
    [6.3, 1.69, 0.08, 0.32, 'clay'],
    [6.55, 1.69, 0.06, 0.22, 'cream'],
    [7.6, 1.69, 0.1, 0.18, 'clay'],
    [8.3, 1.69, 0.05, 0.3, 'ink'],
    [6.6, 2.14, 0.09, 0.2, 'cream'],
    [7.9, 2.14, 0.07, 0.34, 'clay'],
    [8.15, 2.14, 0.05, 0.18, 'cream'],
    [6.9, 2.59, 0.08, 0.26, 'ink'],
    [7.35, 2.59, 0.11, 0.15, 'clay'],
  ].map(([x, y, r, hh, m]) => ({ geo: cyl(r, hh, x, y, 0.13, 24, r * 0.75), mat: m }))
  objects.push({ geo: box(0.32, 0.06, 0.2, 7.2, 2.14, 0.13), mat: 'ink' })
  objects.push({ geo: box(0.28, 0.05, 0.19, 7.22, 2.2, 0.13), mat: 'clay' })
  add('shelf-objects', objects, true)

  // Lámparas colgantes (la pantalla es la que se enciende).
  const lamps = []
  for (const x of [6.45, 7.3, 8.15]) {
    lamps.push({ geo: cyl(0.006, h - 2.3, x, 2.3, 0.6, 6), mat: 'ink', edges: false })
    lamps.push({
      geo: new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 2.12, 0.6),
      mat: 'shade',
    })
  }
  add('lamps', lamps)

  // Mesa redonda y dos sillas.
  add('table', [
    { geo: cyl(0.3, 0.03, 4.7, 0, 3.7, 40), mat: 'stone' },
    { geo: cyl(0.06, 0.7, 4.7, 0.03, 3.7, 20), mat: 'stone' },
    { geo: cyl(0.6, 0.04, 4.7, 0.73, 3.7, 64), mat: 'stone' },
  ])
  add('table-objects', [{ geo: cyl(0.08, 0.24, 4.55, 0.77, 3.62, 20, 0.05), mat: 'clay' }], true)
  const chair = (cx, cz, rot) =>
    [
      box(0.46, 0.05, 0.46, 0, 0.44, 0),
      box(0.46, 0.42, 0.05, 0, 0.49, -0.21),
      ...[-0.19, 0.19].flatMap((x) => [-0.19, 0.19].map((z) => box(0.04, 0.44, 0.04, x, 0, z))),
    ].map((g) => ({ geo: g.rotateY(rot).translate(cx, 0, cz), mat: 'wood' }))
  add('chairs', [...chair(4.7, 2.75, 0), ...chair(5.65, 4.1, -2.2)])

  // Banco bajo la vidriera y sus almohadones.
  add('bench', [
    { geo: box(0.55, 0.32, 3.4, 0.33, 0, 3.0), mat: 'wood' },
    { geo: box(0.55, 0.12, 3.4, 0.33, 0.32, 3.0), mat: 'linen' },
  ])
  add(
    'pillows',
    [
      { geo: box(0.14, 0.4, 0.5, 0.12, 0.44, 2.0), mat: 'accent' },
      { geo: box(0.14, 0.36, 0.45, 0.12, 0.44, 2.6), mat: 'olive' },
    ],
    true,
  )

  // Pedestales de exhibición (es un showroom) y sus piezas.
  add('plinths', [
    { geo: box(0.55, 0.95, 0.55, 7.55, 0, 4.35), mat: 'stone' },
    { geo: box(0.45, 0.6, 0.45, 8.25, 0, 4.95), mat: 'stone' },
  ])
  add(
    'plinth-objects',
    [
      { geo: cyl(0.13, 0.46, 7.55, 0.95, 4.35, 28, 0.08), mat: 'clay' },
      { geo: ball(0.17, 8.25, 0.77, 4.95), mat: 'ink' },
    ],
    true,
  )

  // Planta grande en el rincón de adelante.
  add('plant', [
    { geo: cyl(0.26, 0.55, 0.62, 0, 5.4, 32, 0.3), mat: 'clay' },
    { geo: cyl(0.02, 0.6, 0.62, 0.5, 5.4, 8), mat: 'wood', edges: false },
    ...[
      [0.62, 1.05, 5.35, 0.36],
      [0.45, 1.45, 5.2, 0.3],
      [0.85, 1.4, 5.5, 0.28],
      [0.6, 1.8, 5.4, 0.26],
      [0.4, 1.15, 5.6, 0.25],
    ].map(([x, y, z, r]) => ({ geo: new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), mat: 'leaf' })),
  ])

  return list
}

/** El orden en que se decora: cada paso colorea una pieza o hace entrar sus objetos. */
const DECOR_ORDER = [
  'floor',
  'walls',
  'base',
  'window',
  'arch',
  'console',
  'console-objects',
  'rug',
  'bar',
  'stools',
  'shelves',
  'shelf-objects',
  'lamps',
  'table',
  'chairs',
  'table-objects',
  'bench',
  'pillows',
  'plant',
  'plinths',
  'plinth-objects',
]

/**
 * El color final de cada material: una maqueta de papel casi monocroma (como las de Illoca), con
 * el óxido de la marca en el arco y algunas piezas, y el verde apagado de las plantas.
 */
const FINAL = {
  base: '#d6d0c3',
  floor: '#e4dfd3',
  wall: '#efebe3',
  metal: '#3b3934',
  glass: '#d3dcdd',
  rug: '#d9d3c5',
  stone: '#e2ddd1',
  top: '#6b665d',
  wood: '#d2c6b1',
  clay: '#c4441f',
  cream: '#f3efe7',
  ink: '#2c2a26',
  shade: '#eee3cc',
  accent: '#c4441f',
  linen: '#e8e2d5',
  olive: '#8f9a7b',
  leaf: '#8fa682',
}

/* ── El filtro de boceto ─────────────────────────────────────────────── */

const sketchVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const sketchFragment = /* glsl */ `
  uniform sampler2D tColor;   // el 3D tal como está (sube y se decora)
  uniform sampler2D tNormal;
  uniform sampler2D tColorB;  // la fuente del boceto: el local entero, en maqueta blanca
  uniform sampler2D tNormalB;
  uniform sampler2D tColorO;  // lo que muestra el arrastre (el otro estado)
  uniform sampler2D tNormalO;
  uniform sampler2D tPhoto;   // la foto del local terminado (misma cámara que el arranque)
  uniform float uPhoto;       // 1: el arrastre muestra la foto
  uniform vec4 uFrame;        // el cuadro de la cámara en el canvas (x, y, w, h en 0–1, y hacia arriba)
  uniform float uPhotoReveal; // cuánto de la foto está pintado sobre la maqueta (el final del hero)
  uniform float uPhotoZoom;   // el acercamiento final sobre la foto (1 = sin zoom)
  uniform float uPhotoSat;    // el color de la foto (0 = en grises: luz y sombra)
  uniform sampler2D tSketchImg; // el boceto dibujado a lápiz (misma toma que la foto)
  uniform sampler2D tSketchEmpty; // el mismo boceto con el local vacío
  uniform float uHasEmpty;
  uniform vec4 uRegions[7];     // dónde está cada mueble (uv de la imagen, y hacia arriba): x0, y0, x1, y1
  uniform float uDesign[7];     // cuánto de cada mueble está dibujado
  uniform float uSketchImg;     // 1: el boceto es la imagen; 0: el filtro sobre el 3D
  uniform vec2 uRes;      // px del canvas (con el dpr)
  uniform float uDpr;
  uniform float uA;       // cuánto se ve el 3D
  uniform float uSketch;  // cuánto se ve el boceto (va encima del 3D)
  uniform float uSketchO; // el otro estado: 1 boceto, 0 render
  uniform float uReveal;  // cuánto del boceto está dibujado
  uniform vec2 uCenter;   // desde dónde se pinta (0–1)
  uniform float uExposure;
  uniform float uSplit;   // dónde corta el arrastre (0–1 en x); el otro estado va a la izquierda
  uniform float uSplitOn; // 0 sin arrastre, 1 con
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
  // Tone mapping fílmico (ACES, aproximación de Narkowicz): las luces altas no se queman.
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // Una familia de rayas en pantalla (px de CSS), con el trazo un poco tembloroso.
  float hatch(vec2 p, float angle, float spacing, float width) {
    vec2 d = vec2(cos(angle), sin(angle));
    float v = dot(p, vec2(-d.y, d.x)) + (fbm(p * 0.035) - 0.5) * 6.0;
    float f = abs(fract(v / spacing) - 0.5) * spacing;
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.9, f);
  }

  // Una capa: el render (con tone mapping) o, según sketch, su boceto a lápiz y carbonilla.
  vec4 layer(sampler2D col, sampler2D nrm, float sketch, float reveal) {
    vec4 render = texture2D(col, vUv);
    vec3 rgb = toSrgb(aces(render.rgb * uExposure));
    // Grano de papel sobre el 3D: la maqueta se lee impresa, no renderizada.
    vec2 gp = vUv * uRes;
    rgb *= 1.0 - (hash(floor(gp)) - 0.5) * 0.09 - (fbm(gp * 0.012) - 0.5) * 0.05;
    vec4 outColor = vec4(rgb * render.a, render.a);
    if (sketch < 0.001) return outColor;

    vec2 px = vUv * uRes / uDpr;
    // El temblor de la mano: el dibujo se lee con un leve corrimiento que cambia a lo largo del trazo.
    vec2 wob = (vec2(fbm(px * 0.02), fbm(px * 0.02 + 17.0)) - 0.5) * 2.2 * uDpr / uRes;
    vec2 uv = vUv + wob;
    vec4 c = texture2D(col, uv);
    float l = lum(mix(vec3(1.0), toSrgb(c.rgb), c.a));

    // Contornos: las aristas en tinta del render (lo más oscuro) y los saltos de normal (siluetas).
    vec2 e = uDpr / uRes;
    float nEdge = length(texture2D(nrm, uv + vec2(e.x, 0.0)) - texture2D(nrm, uv - vec2(e.x, 0.0)))
      + length(texture2D(nrm, uv + vec2(0.0, e.y)) - texture2D(nrm, uv - vec2(0.0, e.y)));
    float silhouette = smoothstep(0.4, 1.0, nEdge);
    float inkLine = smoothstep(0.62, 0.3, l);
    // El grafito no es parejo: la línea se aclara y se corta a tramos.
    float pressure = mix(0.45, 1.0, smoothstep(0.25, 0.7, noise(px * vec2(0.09, 0.07))));
    float line = clamp(max(inkLine, silhouette * 0.85), 0.0, 1.0) * pressure;

    // Sombreado: cuanto más oscuro, más capas de rayado; en lo más hondo, carbonilla.
    float tone = clamp((0.95 - l) / 0.36, 0.0, 1.0) * (1.0 - inkLine);
    float h = hatch(px, 0.785, 6.5, 0.9) * smoothstep(0.08, 0.2, tone);
    h = max(h, hatch(px, -0.785, 6.5, 0.9) * smoothstep(0.38, 0.5, tone));
    h = max(h, hatch(px, 0.2, 4.5, 0.8) * smoothstep(0.65, 0.8, tone));
    float charcoal = smoothstep(0.4, 1.0, tone) * (0.3 + 0.4 * fbm(px * 0.012));
    float shade = clamp(h * (0.28 + 0.42 * tone) + charcoal, 0.0, 1.0);

    // Se pinta desde el centro del cuadro hacia afuera, con un borde irregular de trazo;
    // las líneas van un poco adelante del sombreado.
    float dist = length((vUv - uCenter) * vec2(uRes.x / uRes.y, 1.0));
    float field = dist * 0.85 + (fbm(px * 0.006) - 0.5) * 0.45;
    float lineMask = 1.0 - smoothstep(reveal * 1.12 - 0.1, reveal * 1.12, field);
    float shadeMask = 1.0 - smoothstep(reveal * 1.12 - 0.3, reveal * 1.12 - 0.12, field);

    float ink = clamp(line * lineMask + shade * shadeMask, 0.0, 1.0);
    vec3 graphite = vec3(0.17, 0.165, 0.155);
    return mix(outColor, vec4(graphite * ink, ink), sketch);
  }

  // La foto dentro del cuadro de la cámara, igualada al papel de la página y con los bordes fundidos.
  vec4 photoAt(float zoom, float sat) {
    vec2 fuv = (vUv - uFrame.xy) / uFrame.zw;
    vec2 puv = (fuv - vec2(0.5, 0.48)) / zoom + vec2(0.5, 0.48);
    float inside = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
    vec3 ph = texture2D(tPhoto, clamp(puv, 0.0, 1.0)).rgb;
    float key = smoothstep(0.012, 0.05, distance(ph, vec3(0.937, 0.922, 0.890)));
    ph = mix(vec3(lum(ph)) * vec3(1.0, 0.985, 0.955), ph, sat);
    float edge = smoothstep(0.0, 0.07, fuv.x) * smoothstep(1.0, 0.93, fuv.x) * smoothstep(0.0, 0.08, fuv.y) * smoothstep(1.0, 0.92, fuv.y);
    // El fondo liso de la foto se recorta (key, medido antes de quitarle el color): queda el local con
    // su sombra, sobre el papel de la página.
    float a = inside * edge * key;
    return vec4(ph * a, a);
  }

  // El boceto a lápiz (imagen), como tinta sobre el papel de la página. Se dibuja desde el centro:
  // primero los trazos fuertes, después los tonos suaves y el sombreado.
  vec4 sketchAt(float reveal, float zoom) {
    vec2 fuv = (vUv - uFrame.xy) / uFrame.zw;
    vec2 puv = (fuv - vec2(0.5, 0.48)) / zoom + vec2(0.5, 0.48);
    float inside = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
    float edge = smoothstep(0.0, 0.05, fuv.x) * smoothstep(1.0, 0.95, fuv.x) * smoothstep(0.0, 0.06, fuv.y) * smoothstep(1.0, 0.94, fuv.y);
    vec2 cuv = clamp(puv, 0.0, 1.0);
    vec3 c = texture2D(tSketchImg, cuv).rgb;
    vec2 px = vUv * uRes / uDpr;
    // El diseño: sobre el local vacío, cada mueble se dibuja en su rectángulo, primero los trazos
    // más fuertes y después el resto, con el borde de cada trazo irregular.
    if (uHasEmpty > 0.5) {
      vec3 e = texture2D(tSketchEmpty, cuv).rgb;
      float strongFull = smoothstep(0.35, 0.75, 1.0 - lum(c));
      float d = 0.0;
      for (int i = 0; i < 7; i++) {
        vec4 r = uRegions[i];
        float inR = smoothstep(r.x - 0.008, r.x + 0.004, cuv.x) * smoothstep(r.z + 0.008, r.z - 0.004, cuv.x)
          * smoothstep(r.y - 0.012, r.y + 0.006, cuv.y) * smoothstep(r.w + 0.012, r.w - 0.006, cuv.y);
        float f = 0.5 * fbm(px * 0.045 + float(i) * 7.3) + 0.5 * (1.0 - strongFull);
        float drawn = smoothstep(f - 0.07, f + 0.02, uDesign[i] * 1.18);
        d = max(d, inR * drawn);
      }
      c = mix(e, c, d);
    }
    // Cuánto grafito hay: lo que se aparta del papel del dibujo.
    float ink = clamp((0.93 - lum(c)) / 0.8, 0.0, 1.0);
    ink = smoothstep(0.03, 1.0, ink);
    float dist = length((vUv - uCenter) * vec2(uRes.x / uRes.y, 1.0));
    float field = dist * 0.85 + (fbm(px * 0.006) - 0.5) * 0.45;
    float strong = smoothstep(0.35, 0.7, ink);
    float lineMask = 1.0 - smoothstep(reveal * 1.12 - 0.1, reveal * 1.12, field);
    float toneMask = 1.0 - smoothstep(reveal * 1.12 - 0.32, reveal * 1.12 - 0.14, field);
    float a = ink * mix(toneMask, lineMask, strong) * inside * edge;
    vec3 graphite = vec3(0.16, 0.155, 0.145);
    return vec4(graphite * a, a);
  }

  void main() {
    // El boceto va encima del 3D: mientras el local sube desde el dibujo, el trazo se apaga.
    vec4 a = layer(tColor, tNormal, 0.0, 1.0) * uA;
    vec4 sk = (uSketchImg > 0.5 ? sketchAt(uReveal, uPhotoZoom) : layer(tColorB, tNormalB, 1.0, uReveal)) * uSketch;
    // La foto se pinta sobre la maqueta: un trazo ancho que barre de izquierda a derecha, con borde
    // de pincel (ruido estirado a lo largo, como cerdas). El mismo trazo borra la maqueta.
    float m = 0.0;
    if (uPhotoReveal > 0.001 && uPhoto > 0.5) {
      vec2 fuv = (vUv - uFrame.xy) / uFrame.zw;
      vec2 px = vUv * uRes / uDpr;
      float field = fuv.x * 0.82 + (1.0 - fuv.y) * 0.18 + (fbm(fuv * vec2(3.0, 9.0)) - 0.5) * 0.32
        + (noise(px * vec2(0.012, 0.16)) - 0.5) * 0.08;
      float r = uPhotoReveal * 1.45 - 0.2;
      m = 1.0 - smoothstep(r - 0.06, r, field);
    }
    // Debajo, el 3D (si lo hay) y la foto pintándose; encima, los trazos del boceto.
    vec4 base = a * (1.0 - m);
    if (m > 0.0) {
      vec4 ph = photoAt(uPhotoZoom, uPhotoSat);
      base = ph * m + base * (1.0 - ph.a * m);
    }
    base = sk + base * (1.0 - sk.a);
    if (uSplitOn > 0.001) {
      vec4 o = layer(tColorO, tNormalO, uSketchO, 1.0);
      if (uSketchO < 0.5 && uPhoto > 0.5) o = photoAt(uPhotoZoom, 1.0);
      if (uSketchO > 0.5 && uSketchImg > 0.5) o = sketchAt(1.0, uPhotoZoom);
      float pxX = vUv.x * uRes.x;
      float cut = uSplit * uRes.x;
      float side = smoothstep(cut + uDpr, cut - uDpr, pxX); // 1 a la izquierda del corte
      vec4 mixed = mix(base, o, side);
      // La línea del corte, en el óxido de la marca.
      float onLine = 1.0 - smoothstep(uDpr * 0.5, uDpr * 1.5, abs(pxX - cut));
      mixed = mix(mixed, vec4(vec3(0.769, 0.267, 0.122), 1.0), onLine);
      base = mix(base, mixed, uSplitOn);
    }
    gl_FragColor = base;
  }
`

export function createLocalScene({ canvas, phone = false, photo = null, sketch = null, sketchEmpty = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, FRAME_ASPECT, 0.1, 200)

  // Un material por material y por pieza: cada pieza toma su color a su turno.
  const baseMat = (key) =>
    key === 'glass'
      ? new THREE.MeshBasicMaterial({ color: PAPER.clone(), transparent: true, opacity: 0.25, depthWrite: false })
      : new THREE.MeshStandardMaterial({
          color: PAPER.clone(),
          roughness: key === 'metal' || key === 'top' ? 0.55 : 0.9,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        })
  const edgeMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.6 })
  const edgeLines = []
  const ownMats = []

  const pieces = buildPieces().map(({ id, parts, object }) => {
    const group = new THREE.Group()
    group.name = id
    const mats = {}
    for (const p of parts) {
      if (!mats[p.mat]) {
        mats[p.mat] = { key: p.mat, m: baseMat(p.mat), final: new THREE.Color(FINAL[p.mat]) }
        ownMats.push(mats[p.mat].m)
      }
      const mesh = new THREE.Mesh(p.geo, mats[p.mat].m)
      mesh.userData.glass = p.mat === 'glass'
      if (p.mat !== 'glass') {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
      if (p.edges !== false && p.mat !== 'glass') {
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(p.geo, 25), edgeMat)
        edgeLines.push(lines)
        mesh.add(lines)
      }
      group.add(mesh)
    }
    // Los objetos crecen desde su base (el centro de la huella).
    if (object) {
      const b = new THREE.Box3().setFromObject(group)
      const pivot = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2)
      group.children.forEach((c) => c.position.sub(pivot))
      group.position.copy(pivot)
      group.visible = false
    }
    scene.add(group)
    return { id, group, mats: Object.values(mats), object }
  })
  const byId = Object.fromEntries(pieces.map((p) => [p.id, p]))
  const steps = DECOR_ORDER.map((id) => byId[id]).filter(Boolean)
  const shade = byId.lamps.mats.find((x) => x.key === 'shade').m
  /** Lo que sube desde el dibujo, en orden: la caja primero, después los muebles. El piso y la base ya están. */
  const RISE_ORDER = ['walls', 'window', 'arch', 'console', 'bar', 'shelves', 'stools', 'lamps', 'rug', 'table', 'chairs', 'bench', 'plinths', 'plant']
  const risers = RISE_ORDER.map((id) => byId[id]?.group).filter(Boolean)

  // Luz: cielo parejo de maqueta y un sol de la tarde que entra por la vidriera.
  const hemi = new THREE.HemisphereLight('#ffffff', '#ece6d8', 2.1)
  const ambient = new THREE.AmbientLight('#ffffff', 0.4)
  const sun = new THREE.DirectionalLight('#fff4e2', 2.2)
  sun.position.set(-7, 7.5, 4.5)
  sun.target.position.set(4, 0, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048)
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.025
  sun.shadow.radius = 1.5 // sombras con borde, de ilustración
  scene.add(hemi, ambient, sun, sun.target)
  const bulbs = [6.45, 7.3, 8.15].map((x) => {
    const l = new THREE.PointLight('#ffb866', 0, 3.2, 1.6)
    l.position.set(x, 1.95, 0.75)
    scene.add(l)
    return l
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: '#2f3640', opacity: 0.16 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(4.5, -0.221, 3)
  ground.receiveShadow = true
  scene.add(ground)

  // Los pases: el render (con MSAA), las normales (para las siluetas del boceto) y el filtro final.
  const rtColor = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType })
  const rtNormal = new THREE.WebGLRenderTarget(1, 1)
  // La fuente del boceto (el local entero en blanco) y el otro estado del arrastre.
  const rtColorB = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType })
  const rtNormalB = new THREE.WebGLRenderTarget(1, 1)
  const rtColorO = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType })
  const rtNormalO = new THREE.WebGLRenderTarget(1, 1)
  const normalMat = new THREE.MeshNormalMaterial()
  const post = new THREE.ShaderMaterial({
    vertexShader: sketchVertex,
    fragmentShader: sketchFragment,
    uniforms: {
      tColor: { value: rtColor.texture },
      tNormal: { value: rtNormal.texture },
      tColorB: { value: rtColorB.texture },
      tNormalB: { value: rtNormalB.texture },
      tColorO: { value: rtColorO.texture },
      tNormalO: { value: rtNormalO.texture },
      uA: { value: 0 },
      tPhoto: { value: null },
      uPhoto: { value: 0 },
      uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
      uPhotoReveal: { value: 0 },
      uPhotoSat: { value: 1 },
      tSketchImg: { value: null },
      tSketchEmpty: { value: null },
      uHasEmpty: { value: 0 },
      uRegions: { value: DESIGN_PIECES.map(({ rect: [x0, y0, x1, y1] }) => new THREE.Vector4(x0 / IMG.w, 1 - y1 / IMG.h, x1 / IMG.w, 1 - y0 / IMG.h)) },
      uDesign: { value: DESIGN_PIECES.map(() => 0) },
      uSketchImg: { value: 0 },
      uPhotoZoom: { value: 1 },
      uSketchO: { value: 0 },
      uSplit: { value: 0.5 },
      uSplitOn: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
      uSketch: { value: 1 },
      uReveal: { value: 0 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uExposure: { value: 1.25 },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  })
  // La foto del arrastre: se carga aparte y, hasta que llega, el arrastre muestra el 3D terminado.
  let photoTex = null
  if (photo) {
    new THREE.TextureLoader().load(photo, (tex) => {
      tex.colorSpace = THREE.NoColorSpace // se muestra tal cual (el filtro escribe sRGB directo)
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.anisotropy = 4
      photoTex = tex
      post.uniforms.tPhoto.value = tex
      dirty = true
    })
  }
  // El boceto a lápiz como imagen (misma toma que la foto). Hasta que llega, el filtro sobre el 3D.
  let sketchTex = null
  let emptyTex = null
  const loadTex = (url) =>
    new Promise((resolve) =>
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.NoColorSpace
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.anisotropy = 4
        resolve(tex)
      }),
    )
  // Con local vacío, el dibujo no arranca hasta tener las dos imágenes (si no, se vería amueblado).
  const emptyReady = sketchEmpty
    ? loadTex(sketchEmpty).then((tex) => {
        emptyTex = tex
        post.uniforms.tSketchEmpty.value = tex
        post.uniforms.uHasEmpty.value = 1
        dirty = true
      })
    : Promise.resolve()
  let sketchLoaded = () => {}
  const sketchReady = sketch ? Promise.all([new Promise((resolve) => (sketchLoaded = resolve)), emptyReady]) : Promise.resolve()
  if (sketch) {
    new THREE.TextureLoader().load(sketch, (tex) => {
      sketchLoaded()
      tex.colorSpace = THREE.NoColorSpace
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.anisotropy = 4
      sketchTex = tex
      post.uniforms.tSketchImg.value = tex
      post.uniforms.uSketchImg.value = 1
      dirty = true
    })
  }
  const postScene = new THREE.Scene()
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post)
  quad.frustumCulled = false
  postScene.add(quad)
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  let canvasW = 1
  let canvasH = 1
  let dpr = 1
  let frame = { x: 0, y: 0, w: 1, h: 1 }
  const state = { reveal: 0, sketch: 1, rise: 0, decor: 0, camera: 0, lift: 0, photo: 0, sat: 1, zoom: 0, split: 0.5, splitOn: 0 }
  let dirty = true
  const design = DESIGN_PIECES.map(() => 0)

  const applyFrame = () => {
    // La cámara encuadra el rectángulo del cuadro; el resto del canvas es lo que queda alrededor.
    camera.aspect = frame.w / frame.h
    camera.setViewOffset(frame.w, frame.h, -frame.x, -frame.y, canvasW, canvasH)
    camera.updateProjectionMatrix()
    post.uniforms.uCenter.value.set((frame.x + frame.w / 2) / canvasW, 1 - (frame.y + frame.h * 0.55) / canvasH)
    post.uniforms.uFrame.value.set(frame.x / canvasW, 1 - (frame.y + frame.h) / canvasH, frame.w / canvasW, frame.h / canvasH)
  }
  const sizeTargets = () => {
    const w = Math.max(1, Math.round(canvasW * dpr))
    const h = Math.max(1, Math.round(canvasH * dpr))
    rtColor.setSize(w, h)
    rtNormal.setSize(w, h)
    rtColorB.setSize(w, h)
    rtNormalB.setSize(w, h)
    rtColorO.setSize(w, h)
    rtNormalO.setSize(w, h)
    post.uniforms.uRes.value.set(w, h)
    post.uniforms.uDpr.value = dpr
  }

  const update = (view = state) => {
    // Subir: cada pieza crece desde el piso, en orden (primero los muros, después los muebles).
    const r = risers.length
    risers.forEach((g, i) => {
      const k = clamp01((view.rise * (r + 2.5) - i) / 3.5)
      const e = 1 - (1 - k) ** 3
      g.visible = k > 0.002
      g.scale.y = Math.max(0.0001, e)
    })
    // Decorar: cada paso tiene su tramo; una pieza toma su color, un objeto entra creciendo.
    const n = steps.length
    let lit = 0
    steps.forEach((p, i) => {
      const k = clamp01((view.decor * (n + 1.5) - i) / 2.5)
      if (p.object) {
        p.group.visible = k > 0
        p.group.scale.setScalar(Math.max(0.0001, backOut(k)))
      }
      for (const { m, final } of p.mats) m.color.copy(PAPER).lerp(final, p.object ? 1 : k)
      if (p.id === 'lamps') lit = k
    })
    shade.emissive.set('#ffb866').multiplyScalar(lit * 0.75)
    bulbs.forEach((b) => {
      b.intensity = lit * 1.4
    })
    const warm = smooth(0.3, 1, view.decor)
    edgeMat.opacity = THREE.MathUtils.lerp(0.85, 0.5, warm)
    hemi.intensity = THREE.MathUtils.lerp(2.1, 1.35, warm)
    hemi.color.set('#ffffff').lerp(new THREE.Color('#f4f1ea'), warm)
    sun.intensity = THREE.MathUtils.lerp(2.2, 2.9, warm)
    sun.color.set('#fff4e2').lerp(new THREE.Color('#ffe6c2'), warm)

    // La cámara: con `lift` se eleva (mira más arriba); con `camera`, se acerca. El hero las deja en
    // 0, así la maqueta y la foto calzan con el boceto. El boceto usa la misma cámara: siempre coincide.
    const lift = smooth(0, 1, state.lift)
    const c = smooth(0, 1, state.camera)
    const polar = START.polar + lift * 0.14 + c * 0.04
    const azimuth = START.azimuth - lift * 0.1 - c * 0.12
    const dist = START.dist * (1 - lift * 0.07 - c * 0.14)
    const target = TARGET.clone()
    target.y += lift * 0.75
    camera.position.set(
      target.x + dist * Math.sin(polar) * Math.sin(azimuth),
      target.y + dist * Math.cos(polar),
      target.z + dist * Math.sin(polar) * Math.cos(azimuth),
    )
    camera.lookAt(target)
  }

  // Una pasada de la escena a su par de targets: el color y, si hay boceto, las normales.
  const pass = (colorTarget, normalTarget, withNormals) => {
    renderer.setRenderTarget(colorTarget)
    renderer.clear()
    renderer.render(scene, camera)
    if (!withNormals) return
    // Normales: sin aristas, sin vidrio y sin el piso de sombras.
    const hidden = [ground, ...edgeLines]
    scene.traverse((o) => o.userData.glass && hidden.push(o))
    const was = hidden.map((o) => o.visible)
    hidden.forEach((o) => (o.visible = false))
    scene.overrideMaterial = normalMat
    renderer.setRenderTarget(normalTarget)
    renderer.clear()
    renderer.render(scene, camera)
    scene.overrideMaterial = null
    hidden.forEach((o, i) => (o.visible = was[i]))
  }

  /** El estado que muestra el arrastre: el local terminado mientras se ve el boceto, y al revés. */
  const otherView = () =>
    state.sat < 0.5 && state.decor < 0.5 ? { rise: 1, decor: 1, sketch: 0, photo: !!photoTex } : { rise: 1, decor: 0, sketch: 1, photo: false }

  const draw = () => {
    const u = post.uniforms
    u.uSplit.value = state.split
    u.uSplitOn.value = state.splitOn
    // El otro estado (solo mientras se arrastra).
    const other = otherView()
    u.uPhoto.value = photoTex ? 1 : 0
    u.uPhotoReveal.value = state.photo
    u.uPhotoSat.value = state.sat
    u.uPhotoZoom.value = 1 + smooth(0, 1, state.zoom) * 0.06
    u.uSketchO.value = other.sketch
    if (state.splitOn > 0.001 && !other.photo && !(other.sketch && sketch)) {
      update({ ...state, ...other })
      pass(rtColorO, rtNormalO, other.sketch > 0.001)
    }
    // La fuente del boceto: el local entero, sin decorar.
    if (state.sketch > 0.001 && !sketch) {
      update({ ...state, rise: 1, decor: 0 })
      pass(rtColorB, rtNormalB, true)
    }
    // El 3D tal como está.
    const a3d = smooth(0, 0.08, state.rise)
    if (a3d > 0.001) {
      update()
      pass(rtColor, rtNormal, false)
    }
    u.uA.value = a3d
    // Con boceto en imagen, no se muestra el filtro sobre el 3D mientras carga (no calzaría).
    u.uSketch.value = sketch && (!sketchTex || (sketchEmpty && !emptyTex)) ? 0 : state.sketch
    for (let i = 0; i < design.length; i += 1) u.uDesign.value[i] = design[i]
    u.uReveal.value = state.reveal
    renderer.setRenderTarget(null)
    renderer.render(postScene, postCamera)
  }

  const set = (key) => (v) => {
    if (Math.abs(v - state[key]) > 1e-5) {
      state[key] = v
      dirty = true
    }
  }

  return {
    setReveal: set('reveal'),
    setSketch: set('sketch'),
    setRise: set('rise'),
    setLift: set('lift'),
    /** Cuánto de la foto está pintado sobre la maqueta (0–1) y el acercamiento final sobre ella (0–1). */
    setPhoto: set('photo'),
    setSat: set('sat'),
    /** Cuánto de cada mueble está dibujado (en el orden de DESIGN_PIECES). */
    setDesign(values) {
      values.forEach((v, i) => {
        if (Math.abs(v - design[i]) > 1e-4) {
          design[i] = v
          dirty = true
        }
      })
    },
    /** Se resuelve cuando el boceto en imagen está listo para pintarse. */
    sketchReady,
    setZoom: set('zoom'),
    setDecor: set('decor'),
    setCamera: set('camera'),
    setSplit: set('split'),
    setSplitOn: set('splitOn'),
    /** Qué muestra el arrastre ahora: 'final' (el local terminado) o 'sketch' (el boceto). */
    splitShows: () => (otherView().sketch ? 'sketch' : otherView().photo ? 'photo' : 'final'),
    setPixelRatio(v) {
      dpr = v
      renderer.setPixelRatio(v)
      sizeTargets()
      dirty = true
    },
    resize(w, h) {
      canvasW = w
      canvasH = h
      renderer.setSize(w, h, false)
      sizeTargets()
      applyFrame()
      dirty = true
    },
    setFrame(x, y, w, h) {
      frame = { x, y, w, h }
      applyFrame()
      dirty = true
    },
    /** El punto del piso bajo el puntero (px del canvas), en metros del local; null si cae afuera. */
    probe(x, y) {
      const ndc = new THREE.Vector2((x / canvasW) * 2 - 1, -(y / canvasH) * 2 + 1)
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null
      if (hit.x < 0 || hit.x > ROOM.w || hit.z < 0 || hit.z > ROOM.d) return null
      return { x: hit.x, y: hit.z }
    },
    render(force = false) {
      if (!dirty && !force) return false
      dirty = false
      draw()
      return true
    },
    dispose() {
      scene.traverse((o) => o.geometry?.dispose?.())
      ownMats.forEach((m) => m.dispose())
      ;[edgeMat, normalMat, post, ground.material].forEach((m) => m.dispose())
      ;[rtColor, rtNormal, rtColorB, rtNormalB, rtColorO, rtNormalO].forEach((t) => t.dispose())
      photoTex?.dispose()
      sketchTex?.dispose()
      emptyTex?.dispose()
      renderer.dispose()
    },
  }
}

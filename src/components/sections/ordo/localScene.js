import * as THREE from 'three'
import { DESIGN_PIECES, IMG } from './designPieces'

/**
 * The hero scene: a shop (café / showroom) as a scale model, seen like a dollhouse (two
 * back walls and the floor, without the walls that would block the view).
 *
 * It is seen in three states, all of the same scene (that is why they match to the millimetre):
 *   sketch    a drawing filter over the render: graphite outlines that tremble and break up
 *             like a hand-drawn stroke, shadows in hatching / cross-hatching according to the light and charcoal
 *             smudges in the darkest areas. It is "painted in" with `setReveal` (from the centre outwards).
 *   model     the white paper 3D with the edges in ink (`setSketch(0)`).
 *   dressed   each piece in turn takes its material, the objects come in and the lamps light up
 *             (`setDecor`).
 *
 * All in metres: x to the right (along the back wall), z towards the front, y up;
 * the back corner on the left is the origin.
 *
 *   const scene = createLocalScene({ canvas })
 *   scene.setFrame(x, y, w, h)  the screen rectangle where the frame goes
 *   scene.setReveal(0..1)       how much of the sketch is drawn
 *   scene.setSketch(0..1)       how much of the sketch is seen (it goes on top of the 3D)
 *   scene.setRise(0..1)         the shop rises from the drawing
 *   scene.setPhoto(0..1)        the photo of the shop (createLocalScene({ photo })) is painted on top
 *   scene.setDecor(0..1)        how much is dressed
 *   scene.setCamera(0..1)       the camera moves in at the end
 *   scene.render()              draws if something changed
 */

export const ROOM = { w: 9, d: 6, h: 3.3, t: 0.2 }
/** The frame: the camera fits this aspect, whole, inside the rectangle it is given. */
export const FRAME_ASPECT = 21 / 9 // the elevation (sketch, empty and photo) is 21:9

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

/* ── Pieces ─────────────────────────────────────────────────────────── */

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
 * The pieces of the shop. `object: true` are the objects that come in when dressing (vases, books,
 * cushions…): they are not in the sketch. The rest is there from the start and takes colour when dressing.
 */
function buildPieces() {
  const { w, d, h, t } = ROOM
  const list = []
  const add = (id, parts, object = false) => list.push({ id, parts, object })

  // The box: base, floor, back wall and left wall with the shop window.
  // The base ends just under the floor: if both faces end up on the same plane, they fight (stripes).
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

  // The arched niche at the back and its console.
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

  // Round rug.
  add('rug', [{ geo: cyl(1.35, 0.015, 4.7, 0, 3.7, 64), mat: 'rug' }])

  // The bar with the rounded end and the dark countertop slightly overhanging.
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

  // Shelves above the bar and what goes on them.
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

  // Pendant lamps (the shade is what lights up).
  const lamps = []
  for (const x of [6.45, 7.3, 8.15]) {
    lamps.push({ geo: cyl(0.006, h - 2.3, x, 2.3, 0.6, 6), mat: 'ink', edges: false })
    lamps.push({
      geo: new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 2.12, 0.6),
      mat: 'shade',
    })
  }
  add('lamps', lamps)

  // Round table and two chairs.
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

  // Bench under the shop window and its cushions.
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

  // Display plinths (it is a showroom) and their pieces.
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

  // Large plant in the front corner.
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

/** The order of dressing: each step colours a piece or brings its objects in. */
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
 * The final colour of each material: an almost monochrome paper model (like Illoca's), with
 * the brand rust on the arch and a few pieces, and the muted green of the plants.
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

/* ── The sketch filter ─────────────────────────────────────────────── */

const sketchVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const sketchFragment = /* glsl */ `
  uniform sampler2D tColor;   // the 3D as it is (it rises and is dressed)
  uniform sampler2D tNormal;
  uniform sampler2D tColorB;  // the sketch source: the whole shop, as a white model
  uniform sampler2D tNormalB;
  uniform sampler2D tColorO;  // what the drag shows (the other state)
  uniform sampler2D tNormalO;
  uniform sampler2D tPhoto;   // the photo of the finished shop (same camera as the start)
  uniform float uPhoto;       // 1: the drag shows the photo
  uniform vec4 uFrame;        // the camera frame in the canvas (x, y, w, h in 0–1, y up)
  uniform float uPhotoReveal; // how much of the photo is painted over the model (the end of the hero)
  uniform float uPhotoZoom;   // the final zoom on the photo (1 = no zoom)
  uniform float uPhotoSat;    // the colour of the photo (0 = in greys: light and shadow)
  uniform sampler2D tSketchImg; // the pencil-drawn sketch (same shot as the photo)
  uniform sampler2D tSketchEmpty; // the same sketch with the shop empty (with the studio's architecture)
  uniform float uHasEmpty;
  uniform sampler2D tSketchRaw; // the shop as received, in raw grey shell (before the openings, the niche…)
  uniform float uHasRaw;
  uniform vec4 uRegions[${DESIGN_PIECES.length}];   // where each piece is (image uv, y up): x0, y0, x1, y1
  uniform float uDesign[${DESIGN_PIECES.length}];   // how much of each piece is drawn
  uniform float uObra[${DESIGN_PIECES.length}];     // 1: building-work piece (from the raw shell to the empty shop); 0: furnishings
  uniform float uSketchImg;     // 1: the sketch is the image; 0: the filter over the 3D
  uniform vec2 uRes;      // canvas px (with the dpr)
  uniform float uDpr;
  uniform float uA;       // how much of the 3D is seen
  uniform float uSketch;  // how much of the sketch is seen (it goes on top of the 3D)
  uniform float uSketchO; // the other state: 1 sketch, 0 render
  uniform float uReveal;  // how much of the sketch is drawn
  uniform vec2 uCenter;   // where it is painted from (0–1)
  uniform float uExposure;
  uniform float uSplit;   // where the drag cuts (0–1 in x); the other state goes on the left
  uniform float uSplitOn; // 0 no drag, 1 with it
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
  // Filmic tone mapping (ACES, Narkowicz approximation): the highlights do not burn out.
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // A family of stripes on screen (CSS px), with a slightly shaky stroke.
  float hatch(vec2 p, float angle, float spacing, float width) {
    vec2 d = vec2(cos(angle), sin(angle));
    float v = dot(p, vec2(-d.y, d.x)) + (fbm(p * 0.035) - 0.5) * 6.0;
    float f = abs(fract(v / spacing) - 0.5) * spacing;
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.9, f);
  }

  // One layer: the render (with tone mapping) or, depending on sketch, its pencil and charcoal sketch.
  vec4 layer(sampler2D col, sampler2D nrm, float sketch, float reveal) {
    vec4 render = texture2D(col, vUv);
    vec3 rgb = toSrgb(aces(render.rgb * uExposure));
    // Paper grain over the 3D: the model reads as printed, not rendered.
    vec2 gp = vUv * uRes;
    rgb *= 1.0 - (hash(floor(gp)) - 0.5) * 0.09 - (fbm(gp * 0.012) - 0.5) * 0.05;
    vec4 outColor = vec4(rgb * render.a, render.a);
    if (sketch < 0.001) return outColor;

    vec2 px = vUv * uRes / uDpr;
    // The hand tremor: the drawing reads with a slight offset that changes along the stroke.
    vec2 wob = (vec2(fbm(px * 0.02), fbm(px * 0.02 + 17.0)) - 0.5) * 2.2 * uDpr / uRes;
    vec2 uv = vUv + wob;
    vec4 c = texture2D(col, uv);
    float l = lum(mix(vec3(1.0), toSrgb(c.rgb), c.a));

    // Outlines: the ink edges of the render (the darkest) and the normal jumps (silhouettes).
    vec2 e = uDpr / uRes;
    float nEdge = length(texture2D(nrm, uv + vec2(e.x, 0.0)) - texture2D(nrm, uv - vec2(e.x, 0.0)))
      + length(texture2D(nrm, uv + vec2(0.0, e.y)) - texture2D(nrm, uv - vec2(0.0, e.y)));
    float silhouette = smoothstep(0.4, 1.0, nEdge);
    float inkLine = smoothstep(0.62, 0.3, l);
    // The graphite is not even: the line lightens and breaks up in stretches.
    float pressure = mix(0.45, 1.0, smoothstep(0.25, 0.7, noise(px * vec2(0.09, 0.07))));
    float line = clamp(max(inkLine, silhouette * 0.85), 0.0, 1.0) * pressure;

    // Shading: the darker it is, the more hatching layers; in the deepest areas, charcoal.
    float tone = clamp((0.95 - l) / 0.36, 0.0, 1.0) * (1.0 - inkLine);
    float h = hatch(px, 0.785, 6.5, 0.9) * smoothstep(0.08, 0.2, tone);
    h = max(h, hatch(px, -0.785, 6.5, 0.9) * smoothstep(0.38, 0.5, tone));
    h = max(h, hatch(px, 0.2, 4.5, 0.8) * smoothstep(0.65, 0.8, tone));
    float charcoal = smoothstep(0.4, 1.0, tone) * (0.3 + 0.4 * fbm(px * 0.012));
    float shade = clamp(h * (0.28 + 0.42 * tone) + charcoal, 0.0, 1.0);

    // It is painted from the centre of the frame outwards, with an irregular stroke edge;
    // the lines go slightly ahead of the shading.
    float dist = length((vUv - uCenter) * vec2(uRes.x / uRes.y, 1.0));
    float field = dist * 0.85 + (fbm(px * 0.006) - 0.5) * 0.45;
    float lineMask = 1.0 - smoothstep(reveal * 1.12 - 0.1, reveal * 1.12, field);
    float shadeMask = 1.0 - smoothstep(reveal * 1.12 - 0.3, reveal * 1.12 - 0.12, field);

    float ink = clamp(line * lineMask + shade * shadeMask, 0.0, 1.0);
    vec3 graphite = vec3(0.17, 0.165, 0.155);
    return mix(outColor, vec4(graphite * ink, ink), sketch);
  }

  // The photo inside the camera frame, matched to the page paper and with faded edges.
  vec4 photoAt(float zoom, float sat) {
    vec2 fuv = (vUv - uFrame.xy) / uFrame.zw;
    vec2 puv = (fuv - vec2(0.5, 0.48)) / zoom + vec2(0.5, 0.48);
    float inside = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
    vec3 ph = texture2D(tPhoto, clamp(puv, 0.0, 1.0)).rgb;
    float key = smoothstep(0.012, 0.05, distance(ph, vec3(0.937, 0.922, 0.890)));
    ph = mix(vec3(lum(ph)) * vec3(1.0, 0.985, 0.955), ph, sat);
    float edge = smoothstep(0.0, 0.07, fuv.x) * smoothstep(1.0, 0.93, fuv.x) * smoothstep(0.0, 0.08, fuv.y) * smoothstep(1.0, 0.92, fuv.y);
    // The plain background of the photo is cut out (key, measured before removing its colour): the shop remains with
    // its shadow, on the page paper.
    float a = inside * edge * key;
    return vec4(ph * a, a);
  }

  // The pencil sketch (image), like ink on the page paper. It is drawn from the centre:
  // first the strong strokes, then the soft tones and the shading.
  vec4 sketchAt(float reveal, float zoom, float designed) {
    vec2 fuv = (vUv - uFrame.xy) / uFrame.zw;
    vec2 puv = (fuv - vec2(0.5, 0.48)) / zoom + vec2(0.5, 0.48);
    float inside = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
    float edge = smoothstep(0.0, 0.05, fuv.x) * smoothstep(1.0, 0.95, fuv.x) * smoothstep(0.0, 0.06, fuv.y) * smoothstep(1.0, 0.94, fuv.y);
    vec2 cuv = clamp(puv, 0.0, 1.0);
    vec3 c = texture2D(tSketchImg, cuv).rgb;
    vec2 px = vUv * uRes / uDpr;
    // The design, in two layers: first the building work (over the shop in raw grey shell the big window,
    // the niche and the ceiling are drawn: the empty shop remains) and then the furnishings (over the empty shop,
    // each piece of furniture in its rectangle). In each piece, first the strongest strokes and then the rest,
    // with an irregular edge on each stroke.
    // Without design (the drag): the shop as it was received.
    if (uHasEmpty > 0.5 && designed < 0.5) c = uHasRaw > 0.5 ? texture2D(tSketchRaw, cuv).rgb : texture2D(tSketchEmpty, cuv).rgb;
    else if (uHasEmpty > 0.5) {
      vec3 e = texture2D(tSketchEmpty, cuv).rgb;
      float strongFull = smoothstep(0.35, 0.75, 1.0 - lum(c));
      float strongEmpty = smoothstep(0.35, 0.75, 1.0 - lum(e));
      float dObra = 0.0;
      float d = 0.0;
      for (int i = 0; i < ${DESIGN_PIECES.length}; i++) {
        vec4 r = uRegions[i];
        float inR = smoothstep(r.x - 0.008, r.x + 0.004, cuv.x) * smoothstep(r.z + 0.008, r.z - 0.004, cuv.x)
          * smoothstep(r.y - 0.012, r.y + 0.006, cuv.y) * smoothstep(r.w + 0.012, r.w - 0.006, cuv.y);
        float strong = mix(strongFull, strongEmpty, uObra[i]);
        float f = 0.5 * fbm(px * 0.045 + float(i) * 7.3) + 0.5 * (1.0 - strong);
        float drawn = inR * smoothstep(f - 0.07, f + 0.02, uDesign[i] * 1.18);
        dObra = max(dObra, drawn * uObra[i]);
        d = max(d, drawn * (1.0 - uObra[i]));
      }
      if (uHasRaw > 0.5) e = mix(texture2D(tSketchRaw, cuv).rgb, e, dObra);
      c = mix(e, c, d);
    }
    // How much graphite there is: what departs from the drawing's paper.
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
    // The sketch goes on top of the 3D: while the shop rises from the drawing, the stroke fades out.
    vec4 a = layer(tColor, tNormal, 0.0, 1.0) * uA;
    vec4 sk = (uSketchImg > 0.5 ? sketchAt(uReveal, uPhotoZoom, 1.0) : layer(tColorB, tNormalB, 1.0, uReveal)) * uSketch;
    // The photo is painted over the model: a wide stroke that sweeps from left to right, with a
    // brush edge (noise stretched lengthwise, like bristles). The same stroke erases the model.
    float m = 0.0;
    if (uPhotoReveal > 0.001 && uPhoto > 0.5) {
      vec2 fuv = (vUv - uFrame.xy) / uFrame.zw;
      vec2 px = vUv * uRes / uDpr;
      float field = fuv.x * 0.82 + (1.0 - fuv.y) * 0.18 + (fbm(fuv * vec2(3.0, 9.0)) - 0.5) * 0.32
        + (noise(px * vec2(0.012, 0.16)) - 0.5) * 0.08;
      float r = uPhotoReveal * 1.45 - 0.2;
      m = 1.0 - smoothstep(r - 0.06, r, field);
    }
    // Underneath, the 3D (if any) and the photo being painted; on top, the sketch strokes.
    vec4 base = a * (1.0 - m);
    if (m > 0.0) {
      vec4 ph = photoAt(uPhotoZoom, uPhotoSat);
      base = ph * m + base * (1.0 - ph.a * m);
    }
    base = sk + base * (1.0 - sk.a);
    if (uSplitOn > 0.001) {
      vec4 o = layer(tColorO, tNormalO, uSketchO, 1.0);
      if (uSketchO < 0.5 && uPhoto > 0.5) o = photoAt(uPhotoZoom, 1.0);
      if (uSketchO > 0.5 && uSketchImg > 0.5) o = sketchAt(1.0, uPhotoZoom, 0.0);
      float pxX = vUv.x * uRes.x;
      float cut = uSplit * uRes.x;
      float side = smoothstep(cut + uDpr, cut - uDpr, pxX); // 1 to the left of the cut
      vec4 mixed = mix(base, o, side);
      // The cut line, in the brand rust.
      float onLine = 1.0 - smoothstep(uDpr * 0.5, uDpr * 1.5, abs(pxX - cut));
      mixed = mix(mixed, vec4(vec3(0.769, 0.267, 0.122), 1.0), onLine);
      base = mix(base, mixed, uSplitOn);
    }
    gl_FragColor = base;
  }
`

export function createLocalScene({ canvas, phone = false, photo = null, sketch = null, sketchEmpty = null, sketchRaw = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, FRAME_ASPECT, 0.1, 200)

  // One material per material and per piece: each piece takes its colour in its turn.
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
    // The objects grow from their base (the centre of the footprint).
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
  /** What rises from the drawing, in order: the box first, then the furniture. The floor and the base are already there. */
  const RISE_ORDER = ['walls', 'window', 'arch', 'console', 'bar', 'shelves', 'stools', 'lamps', 'rug', 'table', 'chairs', 'bench', 'plinths', 'plant']
  const risers = RISE_ORDER.map((id) => byId[id]?.group).filter(Boolean)

  // Light: an even model sky and an afternoon sun coming in through the shop window.
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
  sun.shadow.radius = 1.5 // illustration-style soft-edged shadows
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

  // The passes: the render (with MSAA), the normals (for the sketch silhouettes) and the final filter.
  const rtColor = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType })
  const rtNormal = new THREE.WebGLRenderTarget(1, 1)
  // The sketch source (the whole shop in white) and the other state of the drag.
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
      tSketchRaw: { value: null },
      uHasRaw: { value: 0 },
      uObra: { value: DESIGN_PIECES.map((p) => (p.obra ? 1 : 0)) },
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
  // The drag photo: it loads separately and, until it arrives, the drag shows the finished 3D.
  let photoTex = null
  if (photo) {
    new THREE.TextureLoader().load(photo, (tex) => {
      tex.colorSpace = THREE.NoColorSpace // shown as is (the filter writes sRGB directly)
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.anisotropy = 4
      photoTex = tex
      post.uniforms.tPhoto.value = tex
      dirty = true
    })
  }
  // The pencil sketch as an image (same shot as the photo). Until it arrives, the filter over the 3D.
  let sketchTex = null
  let emptyTex = null
  let rawTex = null
  const loadTex = (url) =>
    new Promise((resolve) =>
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.NoColorSpace
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.anisotropy = 4
        resolve(tex)
      }),
    )
  // With an empty shop, the drawing does not start until both images are there (otherwise it would look furnished).
  const emptyReady = sketchEmpty
    ? loadTex(sketchEmpty).then((tex) => {
        emptyTex = tex
        post.uniforms.tSketchEmpty.value = tex
        post.uniforms.uHasEmpty.value = 1
        dirty = true
      })
    : Promise.resolve()
  const rawReady = sketchRaw
    ? loadTex(sketchRaw).then((tex) => {
        rawTex = tex
        post.uniforms.tSketchRaw.value = tex
        post.uniforms.uHasRaw.value = 1
        dirty = true
      })
    : Promise.resolve()
  let sketchLoaded = () => {}
  const sketchReady = sketch ? Promise.all([new Promise((resolve) => (sketchLoaded = resolve)), emptyReady, rawReady]) : Promise.resolve()
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
    // The camera frames the frame rectangle; the rest of the canvas is what is left around it.
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
    // Rise: each piece grows from the floor, in order (first the walls, then the furniture).
    const r = risers.length
    risers.forEach((g, i) => {
      const k = clamp01((view.rise * (r + 2.5) - i) / 3.5)
      const e = 1 - (1 - k) ** 3
      g.visible = k > 0.002
      g.scale.y = Math.max(0.0001, e)
    })
    // Dress: each step has its stretch; a piece takes its colour, an object comes in growing.
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

    // The camera: with `lift` it rises (it looks higher); with `camera`, it moves in. The hero leaves them at
    // 0, so the model and the photo line up with the sketch. The sketch uses the same camera: it always matches.
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

  // One pass of the scene to its pair of targets: the colour and, if there is a sketch, the normals.
  const pass = (colorTarget, normalTarget, withNormals) => {
    renderer.setRenderTarget(colorTarget)
    renderer.clear()
    renderer.render(scene, camera)
    if (!withNormals) return
    // Normals: without edges, without glass and without the shadow floor.
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

  /** The state the drag shows: the finished shop while the sketch is seen, and vice versa. */
  const otherView = () =>
    state.sat < 0.5 && state.decor < 0.5 ? { rise: 1, decor: 1, sketch: 0, photo: !!photoTex } : { rise: 1, decor: 0, sketch: 1, photo: false }

  const draw = () => {
    const u = post.uniforms
    u.uSplit.value = state.split
    u.uSplitOn.value = state.splitOn
    // The other state (only while dragging).
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
    // The sketch source: the whole shop, undressed.
    if (state.sketch > 0.001 && !sketch) {
      update({ ...state, rise: 1, decor: 0 })
      pass(rtColorB, rtNormalB, true)
    }
    // The 3D as it is.
    const a3d = smooth(0, 0.08, state.rise)
    if (a3d > 0.001) {
      update()
      pass(rtColor, rtNormal, false)
    }
    u.uA.value = a3d
    // With an image sketch, the filter over the 3D is not shown while it loads (it would not line up).
    u.uSketch.value = sketch && (!sketchTex || (sketchEmpty && !emptyTex) || (sketchRaw && !rawTex)) ? 0 : state.sketch
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
    /** How much of the photo is painted over the model (0–1) and the final zoom on it (0–1). */
    setPhoto: set('photo'),
    setSat: set('sat'),
    /** How much of each piece of furniture is drawn (in the order of DESIGN_PIECES). */
    setDesign(values) {
      values.forEach((v, i) => {
        if (Math.abs(v - design[i]) > 1e-4) {
          design[i] = v
          dirty = true
        }
      })
    },
    /** Resolves when the image sketch is ready to be painted. */
    sketchReady,
    setZoom: set('zoom'),
    setDecor: set('decor'),
    setCamera: set('camera'),
    setSplit: set('split'),
    setSplitOn: set('splitOn'),
    /** What the drag shows now: 'final' (the finished shop) or 'sketch' (the sketch). */
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
    /** The floor point under the pointer (px of the canvas), in metres of the shop; null if it falls outside. */
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
      rawTex?.dispose()
      renderer.dispose()
    },
  }
}

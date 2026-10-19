import * as THREE from 'three'

/**
 * Kanvas — prototipo del «todo en un canvas» (estudio de kprverse.com, solo local).
 *
 * Un único <canvas> fijo a pantalla completa y un único bucle. El HTML es el esqueleto: cada
 * imagen de la página es un `div` vacío (un «slot») y, cuadro a cuadro, el canvas dibuja un plano
 * exactamente encima de su rectángulo (getBoundingClientRect). La forma la recorta el shader (un radio
 * por esquina: arco arriba, píldora…), así se puede animar: un plano a pantalla completa se convierte
 * en card sin cortes.
 *
 * Nada se monta ni se desmonta: el loader, el hero y las cards son el mismo dibujo cambiando de
 * estado. Por eso no hay saltos entre tramos.
 *
 * VESPER es un cuaderno de expedición dibujado: cada plano puede ser una viñeta de cómic (`comic`: borde
 * de tinta, sombra corrida, el borde que se traza y el color que entra) y la carga muestra la escena
 * primero como boceto en tinta (`uSketch`).
 */

// Giro en 3D (alrededor del eje vertical / horizontal del plano) con perspectiva: la cámara es
// ortográfica, así que la profundidad se simula escalando cada vértice según qué tan cerca queda.
const VERT = /* glsl */ `
uniform vec2 uSize;
uniform float uPad;   // margen alrededor del rect (px): ahí cae la sombra corrida de la viñeta
uniform vec2 uTurn;   // giro en radianes: x = alrededor del eje vertical, y = del horizontal
uniform float uPersp; // distancia de la «cámara» en px
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  vec2 full = uSize + 2.0 * uPad;
  if (uTurn.x != 0.0 || uTurn.y != 0.0) {
    vec3 q = vec3(p.x * full.x, p.y * full.y, 0.0);
    float cy = cos(uTurn.x), sy = sin(uTurn.x);
    q = vec3(q.x * cy, q.y, -q.x * sy);
    float cx = cos(uTurn.y), sx = sin(uTurn.y);
    q = vec3(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx);
    float k = uPersp / (uPersp - q.z);
    p = vec3(q.x * k / full.x, q.y * k / full.y, 0.0);
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec2 uSize;      // px del plano
uniform vec2 uMapSize;   // px de la imagen
uniform vec4 uRadii;     // radio de cada esquina: arriba-der, abajo-der, arriba-izq, abajo-izq (px)
uniform vec2 uShift;     // corrimiento de la imagen dentro del plano (parallax, en fracción)
uniform float uZoom;     // >1 = la imagen más grande que el plano (lugar para el parallax)
uniform float uAlpha;
uniform vec3 uTint;
uniform float uTintMix;
uniform vec4 uClip;      // ventana visible: x0, y0, x1, y1 en px del buffer (y desde abajo)
uniform float uFlip;     // 1 = la imagen se lee espejada en x (el dorso de una carta dada vuelta)
uniform float uEncode;   // 1 = la imagen es un render 3D en lineal: pasarla a sRGB (si no, sale oscura)
// La viñeta de cómic: borde de tinta (algo tembloroso, a mano), sombra corrida y dos tiempos para entrar:
// el borde se traza alrededor (uDraw) y después el color entra como una mancha (uFill).
uniform float uPad;      // margen del mesh alrededor del rect (px), para la sombra
uniform float uInk;      // ancho del borde (px); 0 = sin borde
uniform float uDrop;     // corrimiento de la sombra (px, abajo a la derecha); 0 = sin sombra
uniform float uWob;      // cuánto tiembla el contorno (px)
uniform vec3 uInkCol;
uniform float uDraw;     // 0 → 1: el borde se traza desde la esquina de arriba a la izquierda
uniform float uFill;     // 0 → 1: el color entra de izquierda a derecha, con el filo irregular
// El boceto (la carga): la escena se ve primero como línea de tinta sobre papel y después entra el color.
uniform float uSketch;   // 1 = modo boceto
uniform float uInkT;     // 0 → 1: hasta dónde llegó la línea (crece desde uOrigin)
uniform float uColT;     // 0 → 1: hasta dónde llegó el color
uniform vec2 uOrigin;    // de dónde nace el trazo (uv del plano)
uniform vec3 uPaper;

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// Rectángulo con un radio por esquina (Inigo Quilez). Con los de arriba = medio ancho, es un arco;
// con todos = medio alto, una píldora / un ojo que se abre.
float sdRoundBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 readMap(vec2 uv) {
  vec3 c = texture2D(uMap, uv).rgb;
  return mix(c, toSRGB(max(c, 0.0)), uEncode);
}

void main() {
  if (gl_FragCoord.x < uClip.x || gl_FragCoord.x > uClip.z || gl_FragCoord.y < uClip.y || gl_FragCoord.y > uClip.w) discard;
  vec2 hb = uSize * 0.5;
  vec2 p = (vUv - 0.5) * (uSize + 2.0 * uPad); // centro, y hacia arriba (con el margen de la sombra)
  vec2 inUv = p / uSize + 0.5;                  // uv dentro del rect
  vec4 r = min(uRadii, vec4(min(hb.x, hb.y)));
  float wob = uWob > 0.0 ? (vnoise(p * 0.045) - 0.5) * 2.0 * uWob : 0.0;
  float d = sdRoundBox(p, hb, r) + wob;
  float mask = 1.0 - smoothstep(-1.0, 1.0, d);
  float shadow = 0.0;
  if (uDrop > 0.0) {
    float ds = sdRoundBox(p - vec2(uDrop, -uDrop), hb, r) + wob;
    shadow = (1.0 - smoothstep(-1.0, 1.0, ds)) * (1.0 - mask) * smoothstep(0.7, 1.0, uDraw);
  }
  if (mask <= 0.001 && shadow <= 0.001) discard;

  // la imagen «cubre» el plano (como object-fit: cover), con zoom y corrimiento
  vec2 ratio = vec2(
    min((uSize.x / uSize.y) / (uMapSize.x / uMapSize.y), 1.0),
    min((uSize.y / uSize.x) / (uMapSize.y / uMapSize.x), 1.0)
  );
  vec2 uv = inUv;
  uv.x = mix(uv.x, 1.0 - uv.x, uFlip);
  uv = (uv - 0.5) * ratio / uZoom + 0.5 + uShift * (1.0 - ratio / uZoom) * 0.5;
  vec4 col = texture2D(uMap, uv);
  col.rgb = mix(col.rgb, toSRGB(max(col.rgb, 0.0)), uEncode);

  if (uSketch > 0.0) {
    // la línea: Sobel sobre la luminancia de la escena (por píxel de la textura)
    vec2 tx = 1.0 / max(uMapSize, vec2(1.0));
    float tl = luma(readMap(uv + tx * vec2(-1.0, 1.0))), tc = luma(readMap(uv + tx * vec2(0.0, 1.0))), tr = luma(readMap(uv + tx * vec2(1.0, 1.0)));
    float ml = luma(readMap(uv + tx * vec2(-1.0, 0.0))), mr = luma(readMap(uv + tx * vec2(1.0, 0.0)));
    float bl = luma(readMap(uv + tx * vec2(-1.0, -1.0))), bc = luma(readMap(uv + tx * vec2(0.0, -1.0))), br = luma(readMap(uv + tx * vec2(1.0, -1.0)));
    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    float edge = smoothstep(0.22, 0.62, length(vec2(gx, gy)));
    // nace en uOrigin y se extiende con un borde irregular; el color llega después, como acuarela
    vec2 asp = vec2(uSize.x / uSize.y, 1.0);
    float dist = length((inUv - uOrigin) * asp) / length(asp) / 0.86;
    float n1 = vnoise(p / 60.0), n2 = vnoise(p / 14.0), n3 = vnoise(p / 90.0 + 7.0);
    float tI = min(1.0, dist * 0.72 + n1 * 0.2 + n2 * 0.08);
    float tC = min(1.0, dist * 0.62 + n3 * 0.32 + n2 * 0.04);
    float li = edge * (1.0 - smoothstep(uInkT - 0.035, uInkT, tI));
    float lc = 1.0 - smoothstep(uColT - 0.1, uColT, tC);
    col.rgb = mix(uPaper, col.rgb, lc);
    col.rgb = mix(col.rgb, uInkCol, li * (1.0 - lc * 0.65));
    col.a = 1.0;
  }

  col.rgb = mix(col.rgb, uTint, uTintMix);
  // el color entra de izquierda a derecha con el filo irregular (1 = lleno)
  float e = inUv.x * 0.85 + vnoise(p / 22.0) * 0.15;
  float fill = uFill >= 1.0 ? 1.0 : 1.0 - smoothstep(uFill * 1.1 - 0.08, uFill * 1.1, e);
  // el borde de tinta: una banda adentro del contorno, trazada alrededor desde arriba a la izquierda
  float band = 0.0;
  if (uInk > 0.0) {
    float a0 = atan(hb.y, -hb.x);
    float t = fract((a0 - atan(p.y, p.x)) / 6.2831853 + 1.0);
    band = mask * smoothstep(-uInk - 0.8, -uInk + 0.4, d) * step(t, uDraw);
  }
  float a = col.a * mask * fill;
  vec3 rgb = mix(col.rgb, uInkCol, band);
  a = max(a, band);
  float outA = a + shadow * (1.0 - a);
  rgb = outA > 0.0 ? mix(uInkCol, rgb, a / outA) : rgb;
  gl_FragColor = vec4(rgb, outA * uAlpha);
}
`

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export function createKanvas(canvas, { clear = '#ffffff' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  // Como la referencia: en el teléfono se dibuja a menos píxeles que la pantalla (90 %, sin la
  // densidad ×3). En PC, hasta ×2. Es buena parte de la ligereza.
  const phone = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
  renderer.setPixelRatio(phone ? 0.9 : Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const clearColor = new THREE.Color(clear)
  renderer.setClearColor(clearColor, 1)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000)
  // subdividido: con el giro en perspectiva, dos triángulos solos deformarían la imagen
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24)

  let W = 1
  let H = 1
  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    renderer.setSize(W, H, false)
    camera.right = W
    camera.bottom = -H
    camera.updateProjectionMatrix()
    for (const l of layers) l.onResize?.(W, H)
  }

  /**
   * Un plano recortado por el shader. Devuelve su manejador: rect, forma y textura se fijan por cuadro.
   * `frag` / `uniforms` permiten otro fragment shader con los mismos uniforms de base (la palabra de la carga).
   */
  const plane = (map, mapSize, z = 0, { frag = FRAG, uniforms = {} } = {}) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide, // una carta dada vuelta muestra su cara de atrás: también se dibuja
      uniforms: {
        uMap: { value: map },
        uSize: { value: new THREE.Vector2(1, 1) },
        uMapSize: { value: new THREE.Vector2(...mapSize) },
        uRadii: { value: new THREE.Vector4(0, 0, 0, 0) },
        uShift: { value: new THREE.Vector2(0, 0) },
        uZoom: { value: 1 },
        uAlpha: { value: 1 },
        uTint: { value: new THREE.Color(0, 0, 0) },
        uTintMix: { value: 0 },
        uClip: { value: new THREE.Vector4(-1e5, -1e5, 1e5, 1e5) },
        uTurn: { value: new THREE.Vector2(0, 0) },
        uFlip: { value: 0 },
        uEncode: { value: 0 },
        uPad: { value: 0 },
        uInk: { value: 0 },
        uDrop: { value: 0 },
        uWob: { value: 0 },
        // colores tal cual (el shader no pasa a sRGB): sin la conversión de THREE.Color salen más oscuros
        uInkCol: { value: new THREE.Color().setHex(0x1f1810, THREE.LinearSRGBColorSpace) },
        uDraw: { value: 1 },
        uFill: { value: 1 },
        uSketch: { value: 0 },
        uInkT: { value: 0 },
        uColT: { value: 0 },
        uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
        uPaper: { value: new THREE.Color().setHex(0xefe6d3, THREE.LinearSRGBColorSpace) },
        uPersp: { value: 1400 },
        ...uniforms,
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = z
    mesh.frustumCulled = false
    scene.add(mesh)
    const u = mat.uniforms
    return {
      mesh,
      u,
      /** Rect en px de pantalla (x, y arriba a la izquierda) y giro en radianes alrededor de su centro. */
      rect(x, y, w, h, rot = 0) {
        mesh.visible = w > 0.5 && h > 0.5 && y < H + 50 && y + h > -50
        const pad = u.uPad.value
        mesh.scale.set(Math.max(1, w) + pad * 2, Math.max(1, h) + pad * 2, 1)
        mesh.position.set(x + w / 2, -(y + h / 2), 0)
        mesh.rotation.z = -rot // la pantalla tiene la y hacia abajo: positivo = horario, como en CSS
        u.uSize.value.set(Math.max(1, w), Math.max(1, h))
      },
      /** Radio de cada esquina en px: arriba / abajo (los de arriba en medio ancho = un arco). */
      shape({ top = 0, bottom = 0 } = {}) {
        u.uRadii.value.set(top, bottom, top, bottom)
      },
      /**
       * Viñeta de cómic: borde de tinta de `ink` px, sombra corrida `drop` px y el contorno un poco
       * tembloroso. Con 0 y 0, el plano liso de siempre. Se puede llamar cada cuadro (escala con la carta).
       */
      comic(ink = 3, drop = 6, wob = ink > 0 ? 1.3 : 0) {
        u.uInk.value = ink
        u.uDrop.value = drop
        u.uWob.value = wob
        u.uPad.value = drop > 0 || ink > 0 ? drop + wob + 2 : 0
      },
      /** Ventana fuera de la cual el plano no se dibuja (px de pantalla); sin argumentos, sin recorte. */
      clip(x, y, w, h) {
        if (x === undefined) return u.uClip.value.set(-1e5, -1e5, 1e5, 1e5)
        const d = renderer.getPixelRatio()
        u.uClip.value.set(x * d, (H - y - h) * d, (x + w) * d, (H - y) * d)
      },
      dispose() {
        scene.remove(mesh)
        mat.dispose()
      },
    }
  }

  const layers = []
  const add = (layer) => {
    layers.push(layer)
    layer.onResize?.(W, H)
    return layer
  }

  // --- el bucle -----------------------------------------------------------------------------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  const onPointer = (e) => {
    pointer.x = (e.clientX / W) * 2 - 1
    pointer.y = (e.clientY / H) * 2 - 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  let raf = 0
  let last = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    // amortiguado exponencial (λ ≈ 4): igual a cualquier frecuencia de refresco
    const k = 1 - Math.exp(-4 * dt)
    pointer.sx += (pointer.x - pointer.sx) * k
    pointer.sy += (pointer.y - pointer.sy) * k
    const state = { now, dt, W, H, scrollY: window.scrollY, pointer }
    for (const l of layers) l.update?.(state)
    renderer.setClearColor(clearColor, 1)
    renderer.setRenderTarget(null)
    renderer.render(scene, camera)
  }

  window.addEventListener('resize', resize)
  resize()
  raf = requestAnimationFrame(frame)

  return {
    THREE,
    renderer,
    scene,
    plane,
    add,
    clearColor,
    size: () => ({ W, H }),
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      for (const l of layers) l.dispose?.()
      geo.dispose()
      renderer.dispose()
    },
  }
}

export { lerp, clamp01, VERT }

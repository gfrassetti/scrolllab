import * as THREE from 'three'

/**
 * cāpsula33 — «Secuencia de encendido»: el interior arranca apagado y el scroll lo
 * enciende sistema por sistema (el mismo lenguaje del loader: cafetera a 93 °C,
 * neón del pasillo, tripulación a bordo).
 *
 * Una sola imagen del salón encendido; el «apagado» lo arma el shader (oscuro y
 * frío, con la tira de la barra como luz de emergencia). Cada sistema tiene su
 * máscara (zonas dibujadas sobre la imagen, difuminadas: la luz de cada cosa
 * derrama un poco alrededor) y su nivel, que el scroll sube con un arranque de
 * tubo: titila, se pasa un poco de brillo y se asienta.
 *
 * Las zonas están medidas sobre la imagen actual del salón (0–1, y hacia abajo).
 * Con la imagen nueva se vuelven a marcar.
 */

/** Los sistemas, en orden de encendido: [id, desde, hasta (0–1 del encendido), texto de la consola]. */
export const BOOT_STEPS = [
  ['neon', 0.04, 0.17, 'Neón del pasillo', 'encendido'],
  ['vitrinas', 0.2, 0.34, 'Vitrinas', 'encendidas'],
  ['barra', 0.37, 0.5, 'Cafetera', '93 °C'],
  ['ventanales', 0.53, 0.65, 'Ventanales', 'patio'],
  ['techo', 0.68, 0.76, 'Luces del techo', 'encendidas'],
  ['salon', 0.79, 0.88, 'Tripulación', 'a bordo'],
]

// Zonas: [canal (0–5), puntos, intensidad, desenfoque en px sobre 512]. Medidas sobre
// gen/interior-real-v1.png (el salón visto desde la entrada, como en la foto del local).
const ZONES = [
  // Neón: la bandeja del techo (fuerte), su resplandor y el reflejo en el piso.
  [0, [[0.48, 0.39], [0.52, 0.36], [0.6, 0.2], [0.67, 0.05], [0.69, 0.0], [0.8, 0.0], [0.73, 0.08], [0.62, 0.24], [0.53, 0.39]], 1, 8],
  [0, [[0.44, 0.42], [0.62, 0.0], [0.86, 0.0], [0.62, 0.45], [0.46, 0.48]], 0.45, 40],
  [0, [[0.45, 0.82], [0.66, 0.82], [0.7, 1.0], [0.44, 1.0]], 0.35, 30],
  // Vitrinas: el ojo de buey con las figuras, la vitrina baja de vidrio y la luz en la pared.
  [1, [[0.16, 0.52], [0.156, 0.606], [0.144, 0.679], [0.125, 0.728], [0.104, 0.745], [0.083, 0.728], [0.064, 0.679], [0.052, 0.606], [0.048, 0.52], [0.052, 0.434], [0.064, 0.361], [0.083, 0.312], [0.104, 0.295], [0.125, 0.312], [0.144, 0.361], [0.156, 0.434]], 1, 6],
  [1, [[0.0, 0.84], [0.21, 0.73], [0.23, 0.76], [0.23, 0.9], [0.1, 1.0], [0.0, 1.0]], 1, 8],
  [1, [[0.0, 0.2], [0.2, 0.25], [0.2, 0.8], [0.0, 0.95]], 0.4, 40],
  // Barra: el mostrador plisado, la máquina y los estantes, la vitrina de medialunas, el cartel
  // «cāpsula33» con la salida, y el brillo de la tira de abajo en el piso.
  [2, [[0.23, 0.57], [0.61, 0.57], [0.61, 0.82], [0.26, 0.83], [0.23, 0.82]], 1, 6],
  [2, [[0.27, 0.33], [0.36, 0.33], [0.36, 0.57], [0.27, 0.57]], 1, 8],
  [2, [[0.3, 0.47], [0.57, 0.43], [0.57, 0.57], [0.3, 0.57]], 1, 8],
  [2, [[0.35, 0.29], [0.47, 0.29], [0.47, 0.35], [0.35, 0.35]], 1, 4],
  [2, [[0.24, 0.81], [0.62, 0.8], [0.66, 0.93], [0.24, 0.93]], 0.6, 30],
  // Ventanales: los arcos de la pared naranja del fondo, que dan al patio.
  [3, [[0.37, 0.37], [0.68, 0.37], [0.68, 0.57], [0.37, 0.57]], 1, 10],
  [3, [[0.68, 0.33], [0.86, 0.31], [0.86, 0.55], [0.68, 0.57]], 1, 10],
  [3, [[0.86, 0.28], [1.0, 0.25], [1.0, 0.56], [0.86, 0.55]], 1, 10],
  [3, [[0.36, 0.3], [1.0, 0.22], [1.0, 0.62], [0.36, 0.62]], 0.45, 40],
  // Luces del techo: los spots colgantes y las espirales blancas del salón.
  [4, [[0.2, 0.0], [1.0, 0.0], [1.0, 0.3], [0.2, 0.32]], 1, 24],
  [4, [[0.68, 0.33], [0.98, 0.28], [0.98, 0.4], [0.68, 0.45]], 1, 10],
  // Salón: las mesas con la gente, el piso de adelante y una base general.
  [5, [[0.6, 0.5], [1.0, 0.55], [1.0, 0.86], [0.62, 0.8]], 1, 20],
  [5, [[0.23, 0.75], [1.0, 0.75], [1.0, 1.0], [0.23, 1.0]], 0.6, 30],
  [5, [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]], 0.35, 0],
]

function maskTexture(channels) {
  const W = 512
  const H = 290
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'lighter'
  const color = ['#ff0000', '#00ff00', '#0000ff']
  for (const [ch, pts, k, blur] of ZONES) {
    const i = channels.indexOf(ch)
    if (i < 0) continue
    g.filter = blur ? `blur(${blur}px)` : 'none'
    g.globalAlpha = k
    g.fillStyle = color[i]
    g.beginPath()
    pts.forEach(([x, y], j) => (j ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)))
    g.closePath()
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uMaskA;
  uniform sampler2D uMaskB;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform float uAll;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec3 lit = texture2D(uMap, vUv).rgb;
    float lum = dot(lit, vec3(0.299, 0.587, 0.114));
    // Apagado: casi negro, frío; solo se adivinan los volúmenes.
    vec3 dark = lit * vec3(0.05, 0.055, 0.075) + lum * vec3(0.015, 0.025, 0.05);
    // Luz de emergencia: la tira de abajo de la barra, tenue y naranja.
    float strip = smoothstep(0.04, 0.0, abs(vUv.y - 0.18)) * smoothstep(0.25, 0.29, vUv.x) * smoothstep(0.62, 0.58, vUv.x);
    dark += vec3(0.5, 0.18, 0.04) * strip * (0.35 + 0.05 * sin(uTime * 2.0));
    vec3 a = texture2D(uMaskA, vUv).rgb;
    vec3 b = texture2D(uMaskB, vUv).rgb;
    vec3 lA = min(uA, vec3(1.0));
    vec3 lB = min(uB, vec3(1.0));
    float L = clamp(dot(a, lA) + dot(b, lB), 0.0, 1.0);
    L = max(L, uAll);
    // Lo que se está encendiendo se pasa un poco de brillo (el golpe de tubo) y se asienta.
    float O = dot(a, max(uA - 1.0, vec3(0.0))) + dot(b, max(uB - 1.0, vec3(0.0)));
    vec3 c = mix(dark, lit, L);
    c += lit * O * 0.9;
    gl_FragColor = vec4(c, 1.0);
  }
`

/** El material del salón con la secuencia de encendido. */
export function createBootMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uMaskA: { value: maskTexture([0, 1, 2]) },
      uMaskB: { value: maskTexture([3, 4, 5]) },
      uA: { value: new THREE.Vector3() },
      uB: { value: new THREE.Vector3() },
      uAll: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  })
}

// El arranque de un tubo: titila (determinista con el scroll), se pasa y se asienta.
const FLICK = [0, 0.7, 0.05, 0.9, 0.2, 1, 0.35, 1.2, 1.25, 1.12]
const level = (t) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const f = t * (FLICK.length - 1)
  const i = Math.floor(f)
  const k = f - i
  return FLICK[i] + (FLICK[i + 1] - FLICK[i]) * k
}

/** Niveles de cada sistema para un encendido `boot` (0–1); `on` = encendido en el hero. */
export function bootLevels(boot, on) {
  const v = BOOT_STEPS.map(([, a, b]) => level((boot - a) / (b - a)))
  // Antes de entrar (o si el encendido no corre) el salón se ve como en la foto.
  const all = on ? Math.max(0, Math.min(1, (boot - 0.9) / 0.1)) : 1
  return { a: v.slice(0, 3), b: v.slice(3, 6), all }
}

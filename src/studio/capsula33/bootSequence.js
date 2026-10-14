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
  ['vitrinas', 0.2, 0.34, 'Vitrinas', '12 / 12'],
  ['barra', 0.37, 0.5, 'Cafetera', '93 °C'],
  ['jardin', 0.53, 0.65, 'Jardín', 'luz cenital'],
  ['techo', 0.68, 0.76, 'Luces del techo', 'encendidas'],
  ['salon', 0.79, 0.88, 'Tripulación', 'a bordo'],
]

// Zonas: [canal (0–5), puntos, intensidad, desenfoque en px sobre 512].
const ZONES = [
  // Neón: la bandeja del techo (fuerte) y su reflejo naranja en el piso y la barra (suave).
  [0, [[0.42, 0.37], [0.5, 0.3], [0.59, 0.13], [0.61, 0.0], [0.8, 0.0], [0.76, 0.09], [0.6, 0.25], [0.47, 0.38]], 1, 10],
  [0, [[0.36, 0.3], [0.62, 0.0], [0.84, 0.0], [0.6, 0.42], [0.36, 0.42]], 0.5, 40],
  [0, [[0.44, 0.6], [0.56, 0.6], [0.74, 1.0], [0.46, 1.0]], 0.55, 30],
  // Vitrinas: los estantes de vidrio de la izquierda y la luz que tiran a la pared y al piso.
  [1, [[0.21, 0.33], [0.33, 0.36], [0.33, 0.6], [0.24, 0.8], [0.21, 0.82]], 1, 8],
  [1, [[0.1, 0.12], [0.34, 0.3], [0.34, 0.62], [0.3, 1.0], [0.1, 1.0]], 0.45, 46],
  // Barra: el mostrador plisado, la máquina, los estantes de atrás y el brillo bajo la barra.
  [2, [[0.32, 0.35], [0.48, 0.35], [0.48, 0.58], [0.32, 0.58]], 1, 8],
  [2, [[0.3, 0.55], [0.5, 0.55], [0.56, 0.75], [0.3, 0.75]], 0.6, 30],
  // Jardín: las ventanas de la derecha (y las chicas del fondo).
  [3, [[0.6, 0.2], [0.79, 0.04], [1.0, 0.0], [1.0, 0.78], [0.86, 0.62], [0.6, 0.52]], 1, 18],
  [3, [[0.47, 0.34], [0.6, 0.3], [0.6, 0.5], [0.47, 0.5]], 0.8, 10],
  // Luces del techo: los spots colgantes del centro y el techo.
  [4, [[0.3, 0.0], [0.6, 0.0], [0.52, 0.36], [0.33, 0.36]], 1, 22],
  // Salón: la barra alta, los banquitos y el piso de adelante.
  [5, [[0.48, 0.44], [0.86, 0.5], [0.86, 1.0], [0.42, 1.0]], 1, 34],
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
    float strip = smoothstep(0.045, 0.0, abs(vUv.y - 0.415)) * smoothstep(0.3, 0.34, vUv.x) * smoothstep(0.5, 0.46, vUv.x);
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

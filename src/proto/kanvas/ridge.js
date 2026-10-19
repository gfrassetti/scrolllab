/**
 * Kanvas — la escena de la cordillera (la sección que aparece cuando la lámina del hero se da vuelta).
 *
 * Todo es código, sin imágenes: un cielo, capas de nubes y de montañas dibujadas por shaders (las
 * crestas salen de ruido, con nieve en la cara iluminada, pinos y pinceladas) puestas a distintas
 * profundidades para que la cámara haga parallax al bajar y al seguir el mouse. Es provisoria: la
 * escena se rehace cuando haya imágenes generadas.
 *
 * `update({ q, now, dt, pointer })`: q (0 → 1) es el recorrido de la cámara, del cielo a la cordillera.
 */

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`

const WORLD_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const SKY_FRAG = /* glsl */ `
varying vec3 vW;
uniform vec3 uTop, uMid, uLow;
void main() {
  float t = clamp((vW.y + 4.0) / 40.0, 0.0, 1.0);
  vec3 c = mix(uLow, uMid, smoothstep(0.0, 0.35, t));
  c = mix(c, uTop, smoothstep(0.35, 1.0, t));
  gl_FragColor = vec4(c, 1.0);
}
`

// Nube pintada: ruido estirado en horizontal, tres tonos (sombra / medio / luz) como pinceladas.
const CLOUD_FRAG = /* glsl */ `
${NOISE}
varying vec2 vUv;
uniform float uSeed, uTime, uAlpha;
uniform vec3 uShadow, uMidC, uLight;
void main() {
  vec2 p = vec2(vUv.x * 3.2 + uTime * 0.012 + uSeed, vUv.y * 1.4 + uSeed * 0.3);
  float n = fbm(p);
  float edge = abs(vUv.y - 0.5) * 1.9 + pow(abs(vUv.x - 0.5) * 2.0, 4.0) * 1.6;
  float shape = n - edge * 0.55;
  float a = smoothstep(0.12, 0.2, shape);
  if (a < 0.01) discard;
  float lit = fbm(p * 1.7 + 4.0) * 0.6 + vUv.y * 0.7;
  float tone = lit < 0.55 ? 0.0 : lit < 0.78 ? 0.5 : 1.0;
  vec3 c = tone < 0.25 ? uShadow : tone < 0.75 ? uMidC : uLight;
  c *= 0.95 + 0.08 * noise(vec2(vUv.x * 7.0, vUv.y * 36.0));
  gl_FragColor = vec4(c, a * uAlpha);
}
`

// Cresta de montaña: la altura sale de ruido «crestado» (picos filosos). Más oscura hacia adentro,
// nieve en la cara que mira a la luz, pinos opcionales sobre el filo y pinceladas.
const RIDGE_FRAG = /* glsl */ `
${NOISE}
varying vec3 vW;
uniform float uSeed, uBase, uAmp, uFreq, uTrees, uSnow, uFogMix;
uniform vec3 uDark, uLight, uSnowC, uFog;
float ridged(float x) {
  float n = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 5; i++) { n += a * (1.0 - abs(noise(vec2(x * f + uSeed, uSeed * 1.7)) * 2.0 - 1.0)); f *= 2.07; a *= 0.5; }
  return n;
}
float height(float x) { return uBase + uAmp * pow(ridged(x * uFreq), 1.8); }
void main() {
  float x = vW.x;
  float h = height(x);
  if (uTrees > 0.0) {
    float cell = x * uTrees;
    float id = floor(cell);
    float fx = fract(cell) - 0.5;
    float has = step(0.35, hash(vec2(id, uSeed)));
    float th = (0.25 + 0.35 * hash(vec2(id, 3.0))) * has;
    h += max(0.0, th * (1.0 - abs(fx) * 2.8));
  }
  float d = h - vW.y;
  float aa = fwidth(vW.y) * 1.2;
  float a = smoothstep(-aa, aa, d);
  if (a < 0.01) discard;
  // facetas pintadas: ruido estirado en diagonal (como las caras de la roca), en tres tonos
  float s = uFreq * 10.0;
  vec2 fp = vec2(x * s * 0.35 + vW.y * s * 0.55, vW.y * s * 0.8 - x * s * 0.12);
  float tone = fbm(fp + uSeed);
  float t3 = tone < 0.44 ? 0.0 : tone < 0.58 ? 0.5 : 1.0;
  float depth = clamp(d / (uAmp * 1.4 + 0.001), 0.0, 1.0);
  vec3 c = mix(uDark, uLight, clamp(t3 * 0.7 * (1.0 - depth * 0.55) + (1.0 - depth) * 0.22, 0.0, 1.0));
  // nieve: solo cerca de los picos, siguiendo las mismas facetas
  float top = 1.0 - smoothstep(uAmp * 0.12, uAmp * 0.38, d);
  float snow = top * step(0.5, fbm(fp * 1.25 + uSeed + 7.0)) * uSnow;
  c = mix(c, uSnowC, snow * 0.8);
  // pinceladas: manchas anchas, horizontales
  c *= 0.95 + 0.08 * noise(vec2(vW.x * s * 0.4, vW.y * s * 2.4) + uSeed);
  c = mix(c, uFog, uFogMix);
  gl_FragColor = vec4(c, a);
}
`

export function createRidge(THREE) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400)
  const time = { value: 0 }
  const disposables = []
  const mat = (frag, uniforms, extra = {}) => {
    const m = new THREE.ShaderMaterial({ vertexShader: WORLD_VERT, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, ...extra })
    disposables.push(m)
    return m
  }
  // el canvas muestra los números del color tal cual (sin pasar a sRGB): se cargan como están escritos
  const col = (h) => new THREE.Color().setStyle(h, THREE.LinearSRGBColorSpace)
  const plane = (w, h, m, x, y, z, order) => {
    const g = new THREE.PlaneGeometry(w, h)
    disposables.push(g)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    mesh.renderOrder = order
    scene.add(mesh)
    return mesh
  }

  // cielo
  plane(900, 500, mat(SKY_FRAG, { uTop: { value: col('#5b7c99') }, uMid: { value: col('#b9b49a') }, uLow: { value: col('#efcf96') } }, { transparent: false }), 0, 40, -150, 0)

  // nubes: la tarde de las ilustraciones (dueño, 2026-10-18): sombra azul polvo, cuerpo crema, luz dorada
  const clouds = [
    [-30, 30, -125, 170, 30, '#7d8ea4', '#cdbf9f', '#f3e3bf', 0.9],
    [40, 22, -112, 160, 26, '#8594a6', '#d6c4a0', '#f6e6c2', 0.95],
    [-10, 13, -100, 150, 22, '#8c97a2', '#dcc8a0', '#f8e8c0', 1],
    [25, 6, -96, 120, 14, '#949b9e', '#e2cc9e', '#fbe9bd', 1],
    [-28, 19, -94, 80, 14, '#8a95a3', '#d9c6a1', '#f6e5c0', 0.9],
  ]
  clouds.forEach(([x, y, z, w, h, s, m, l, a], i) => {
    const cm = mat(CLOUD_FRAG, { uSeed: { value: i * 7.3 + 1 }, uTime: time, uAlpha: { value: a }, uShadow: { value: col(s) }, uMidC: { value: col(m) }, uLight: { value: col(l) } })
    plane(w, h, cm, x, y, z, 1 + i)
  })

  // la cordillera: de la más lejana (azul gris, con bruma) a la más cercana (oliva oscuro, con pinos)
  const ridges = [
    { z: -90, base: -6, amp: 26, freq: 0.018, trees: 0, snow: 1, dark: '#6f8196', light: '#aeb9c2', fog: 0.35, seed: 3 },
    { z: -60, base: -10, amp: 22, freq: 0.03, trees: 0, snow: 1, dark: '#64727c', light: '#a3aa9e', fog: 0.2, seed: 11 },
    { z: -38, base: -14, amp: 16, freq: 0.045, trees: 0, snow: 0.8, dark: '#5c6648', light: '#9e9b6c', fog: 0.1, seed: 23 },
    { z: -22, base: -16, amp: 10, freq: 0.07, trees: 0.9, snow: 0.3, dark: '#454628', light: '#857a46', fog: 0.04, seed: 41 },
    { z: -10, base: -12.5, amp: 3.2, freq: 0.12, trees: 1.4, snow: 0, dark: '#2c2a18', light: '#5a5230', fog: 0, seed: 57 },
  ]
  ridges.forEach((r, i) => {
    const m = mat(RIDGE_FRAG, {
      uSeed: { value: r.seed },
      uBase: { value: r.base },
      uAmp: { value: r.amp },
      uFreq: { value: r.freq },
      uTrees: { value: r.trees },
      uSnow: { value: r.snow },
      uFogMix: { value: r.fog },
      uDark: { value: col(r.dark) },
      uLight: { value: col(r.light) },
      uSnowC: { value: col('#f4ecd8') },
      uFog: { value: col('#d9cba9') },
    })
    plane(600, 120, m, 0, r.base - 20, r.z, 10 + i)
  })

  // la cámara: del cielo (q = 0) baja a la cordillera (q = 1)
  const path = [
    [0, { p: [0, 26, 30], t: [0, 24, -60] }],
    [1, { p: [0, 3, 24], t: [0, 1.5, -60] }],
  ]
  const P = new THREE.Vector3()
  const L = new THREE.Vector3()
  const lerpV = (out, a, b, t) => out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
  const ease = (t) => t * t * (3 - 2 * t)
  const sway = { x: 0, y: 0 }

  return {
    scene,
    camera,
    update({ q, now, dt, pointer }) {
      time.value = now / 1000
      let i = 0
      while (i < path.length - 2 && q > path[i + 1][0]) i++
      const [qa, A] = path[i]
      const [qb, B] = path[i + 1]
      const t = ease(Math.min(1, Math.max(0, (q - qa) / (qb - qa))))
      lerpV(P, A.p, B.p, t)
      lerpV(L, A.t, B.t, t)
      // el mouse mueve la cámara: las capas cercanas se corren más que las lejanas (parallax)
      const k = 1 - Math.exp(-2.4 * dt)
      sway.x += (pointer.x - sway.x) * k
      sway.y += (pointer.y - sway.y) * k
      camera.position.set(P.x + sway.x * 1.6, P.y - sway.y * 0.8, P.z)
      camera.lookAt(L.x + sway.x * 0.6, L.y - sway.y * 0.3, L.z)
    },
    setSize(w, h) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}

/** La «pantalla» del HUD: un relieve de puntos que gira (el video chico con coordenadas). */
export function createTopo(THREE) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#120e18')
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
  camera.position.set(0, 3.2, 5.2)
  camera.lookAt(0, 0, 0)
  const N = 70
  const pos = new Float32Array(N * N * 3)
  const colr = new Float32Array(N * N * 3)
  let k = 0
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = (i / (N - 1) - 0.5) * 6
      const z = (j / (N - 1) - 0.5) * 6
      const r = Math.hypot(x, z)
      const y = Math.max(0, 1.6 - r * 0.55) ** 1.4 * 1.2 + Math.sin(x * 2.1) * Math.cos(z * 1.7) * 0.18
      pos.set([x, y, z], k * 3)
      const c = 0.35 + y * 0.45
      colr.set([c, c * 0.95, c * 0.9], k * 3)
      k++
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3))
  const mat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.95 })
  const pts = new THREE.Points(geo, mat)
  scene.add(pts)
  return {
    scene,
    camera,
    update(now) {
      pts.rotation.y = now * 0.00018
    },
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}

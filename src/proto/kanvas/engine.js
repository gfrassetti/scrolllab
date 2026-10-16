import * as THREE from 'three'

/**
 * Kanvas — prototipo del «todo en un canvas» (estudio de kprverse.com, solo local).
 *
 * Un único <canvas> fijo a pantalla completa y un único bucle. El HTML es el esqueleto: cada
 * imagen de la página es un `div` vacío (un «slot») y, cuadro a cuadro, el canvas dibuja un plano
 * exactamente encima de su rectángulo (getBoundingClientRect). La forma de carpeta (pestaña arriba a
 * la izquierda, esquina cortada abajo a la derecha, bordes redondeados) la recorta el shader, así se
 * puede animar: un plano a pantalla completa se convierte en card sin cortes.
 *
 * Nada se monta ni se desmonta: el loader, el hero y las cards son el mismo dibujo cambiando de
 * estado. Por eso no hay saltos entre tramos.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec2 uSize;      // px del plano
uniform vec2 uMapSize;   // px de la imagen
uniform float uRadius;   // redondeo
uniform vec3 uTab;       // ancho de la pestaña, alto (caída), largo de la diagonal
uniform float uCut;      // esquina cortada abajo a la derecha
uniform vec2 uShift;     // corrimiento de la imagen dentro del plano (parallax, en fracción)
uniform float uZoom;     // >1 = la imagen más grande que el plano (lugar para el parallax)
uniform float uAlpha;
uniform vec3 uTint;
uniform float uTintMix;

#define N 7
float sdPoly(vec2 p, vec2 v[N]) {
  float d = dot(p - v[0], p - v[0]);
  float s = 1.0;
  for (int i = 0, j = N - 1; i < N; j = i, i++) {
    vec2 e = v[j] - v[i];
    vec2 w = p - v[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
  }
  return s * sqrt(d);
}

void main() {
  // px con origen arriba a la izquierda, y hacia abajo
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float r = uRadius;
  float w = uSize.x, h = uSize.y;
  float tw = uTab.x, th = uTab.y, ts = uTab.z;
  float c = uCut;
  vec2 v[N];
  v[0] = vec2(r, r);
  v[1] = vec2(max(r, tw - r * 0.4), r);
  v[2] = vec2(max(r, tw + ts - r * 0.4), r + th);
  v[3] = vec2(w - r, r + th);
  v[4] = vec2(w - r, h - r - c);
  v[5] = vec2(w - r - c, h - r);
  v[6] = vec2(r, h - r);
  float d = sdPoly(p, v) - r;
  float aa = 1.0;
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (mask <= 0.001) discard;

  // la imagen «cubre» el plano (como object-fit: cover), con zoom y corrimiento
  vec2 ratio = vec2(
    min((uSize.x / uSize.y) / (uMapSize.x / uMapSize.y), 1.0),
    min((uSize.y / uSize.x) / (uMapSize.y / uMapSize.x), 1.0)
  );
  vec2 uv = vUv;
  uv = (uv - 0.5) * ratio / uZoom + 0.5 + uShift * (1.0 - ratio / uZoom) * 0.5;
  vec4 col = texture2D(uMap, uv);
  col.rgb = mix(col.rgb, uTint, uTintMix);
  gl_FragColor = vec4(col.rgb, col.a * mask * uAlpha);
}
`

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export function createKanvas(canvas, { clear = '#ffffff' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const clearColor = new THREE.Color(clear)
  renderer.setClearColor(clearColor, 1)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000)
  const geo = new THREE.PlaneGeometry(1, 1)

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

  /** Un plano con forma de carpeta. Devuelve su manejador: rect, forma y textura se fijan por cuadro. */
  const plane = (map, mapSize, z = 0) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      uniforms: {
        uMap: { value: map },
        uSize: { value: new THREE.Vector2(1, 1) },
        uMapSize: { value: new THREE.Vector2(...mapSize) },
        uRadius: { value: 0 },
        uTab: { value: new THREE.Vector3(0, 0, 0) },
        uCut: { value: 0 },
        uShift: { value: new THREE.Vector2(0, 0) },
        uZoom: { value: 1 },
        uAlpha: { value: 1 },
        uTint: { value: new THREE.Color(0, 0, 0) },
        uTintMix: { value: 0 },
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
      /** Rect en px de pantalla (x, y arriba a la izquierda). */
      rect(x, y, w, h) {
        mesh.visible = w > 0.5 && h > 0.5 && y < H + 50 && y + h > -50
        mesh.scale.set(Math.max(1, w), Math.max(1, h), 1)
        mesh.position.set(x + w / 2, -(y + h / 2), 0)
        u.uSize.value.set(Math.max(1, w), Math.max(1, h))
      },
      shape({ radius = 0, tab = [0, 0, 0], cut = 0 } = {}) {
        u.uRadius.value = radius
        u.uTab.value.set(tab[0], tab[1], tab[2])
        u.uCut.value = cut
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

export { lerp, clamp01 }
